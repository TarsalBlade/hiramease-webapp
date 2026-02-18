import { useState, useEffect } from 'react';
import { X, Building2, Users, FileText, CreditCard, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CompanyDetailProps {
  tenantId: string;
  onClose: () => void;
}

interface CompanyStats {
  borrower_count: number;
  application_count: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  total_loan_amount: number;
  subscription_status: string | null;
  plan_name: string | null;
}

export function CompanyDetail({ tenantId, onClose }: CompanyDetailProps) {
  const [tenant, setTenant] = useState<any>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'borrowers' | 'applications'>('overview');

  useEffect(() => {
    fetchDetails();
  }, [tenantId]);

  async function fetchDetails() {
    setLoading(true);

    const [tenantRes, borrowerRes, appRes, subRes] = await Promise.all([
      supabase.from('tenants').select('*').eq('id', tenantId).maybeSingle(),
      supabase.from('borrower_profiles').select('*, user:user_profiles(*)').eq('tenant_id', tenantId),
      supabase.from('credit_applications').select('*, borrower:borrower_profiles(*, user:user_profiles(*))').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50),
      supabase.from('subscriptions').select('*, plan:subscription_plans(name)').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1),
    ]);

    setTenant(tenantRes.data);

    const apps = appRes.data || [];
    const bors = borrowerRes.data || [];

    setBorrowers(bors);
    setApplications(apps);

    const sub = subRes.data?.[0];

    setStats({
      borrower_count: bors.length,
      application_count: apps.length,
      approved_count: apps.filter((a: any) => a.status === 'approved').length,
      rejected_count: apps.filter((a: any) => a.status === 'rejected').length,
      pending_count: apps.filter((a: any) => ['submitted', 'under_review', 'verified', 'scored'].includes(a.status)).length,
      total_loan_amount: apps.reduce((sum: number, a: any) => sum + (a.loan_amount_php || 0), 0),
      subscription_status: sub?.status || null,
      plan_name: Array.isArray(sub?.plan) ? sub.plan[0]?.name : sub?.plan?.name || null,
    });

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              {tenant?.logo_url ? (
                <img src={tenant.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Building2 className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{tenant?.company_name}</h2>
              <p className="text-sm text-gray-500">{tenant?.email} | {tenant?.registration_type} - {tenant?.registration_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          {(['overview', 'borrowers', 'applications'] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeSection === section
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {section}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <StatMini icon={<Users className="w-4 h-4" />} label="Borrowers" value={stats.borrower_count} color="text-blue-600 bg-blue-50" />
                <StatMini icon={<FileText className="w-4 h-4" />} label="Applications" value={stats.application_count} color="text-teal-600 bg-teal-50" />
                <StatMini icon={<TrendingUp className="w-4 h-4" />} label="Total Requested" value={`PHP ${stats.total_loan_amount.toLocaleString()}`} color="text-emerald-600 bg-emerald-50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Application Status</h3>
                  <div className="space-y-2">
                    <StatusBar label="Approved" value={stats.approved_count} total={stats.application_count} color="bg-green-500" />
                    <StatusBar label="Pending" value={stats.pending_count} total={stats.application_count} color="bg-yellow-500" />
                    <StatusBar label="Rejected" value={stats.rejected_count} total={stats.application_count} color="bg-red-500" />
                  </div>
                </div>
                <div className="card p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Subscription</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                        stats.subscription_status === 'active' ? 'bg-green-100 text-green-700' :
                        stats.subscription_status === 'trial' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {stats.subscription_status || 'None'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Plan</span>
                      <span className="text-sm font-medium text-gray-900">{stats.plan_name || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Company Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{tenant?.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Address</p>
                    <p className="font-medium text-gray-900">{[tenant?.address, tenant?.city, tenant?.province].filter(Boolean).join(', ') || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                      tenant?.status === 'active' ? 'bg-green-100 text-green-700' :
                      tenant?.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {tenant?.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="font-medium text-gray-900">{new Date(tenant?.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'borrowers' && (
            <div className="space-y-4">
              {borrowers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No borrowers registered</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Name</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Contact</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Employment</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Income</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {borrowers.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{b.user?.first_name} {b.user?.last_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-600">{b.user?.email || '-'}</p>
                            <p className="text-xs text-gray-400">{b.user?.phone || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-600 capitalize">{b.employment_status?.replace('_', ' ') || '-'}</p>
                            <p className="text-xs text-gray-400">{b.employer_name || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">
                              {b.monthly_income_php ? `PHP ${b.monthly_income_php.toLocaleString()}` : '-'}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeSection === 'applications' && (
            <div className="space-y-4">
              {applications.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No applications yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Application</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Borrower</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Amount</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Status</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {applications.map((a: any) => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{a.application_number}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-600">
                              {a.borrower?.user?.first_name} {a.borrower?.user?.last_name}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">PHP {a.loan_amount_php?.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">{a.loan_term_months} months</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                              a.status === 'approved' ? 'bg-green-100 text-green-700' :
                              a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-500">{new Date(a.created_at).toLocaleDateString()}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatMini({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
