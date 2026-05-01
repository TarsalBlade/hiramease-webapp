import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Package,
  Users,
  LayoutDashboard,
  Activity,
  Eye,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { PaymentManagement } from '../../components/payment';
import { SubscriptionPlanManager } from '../../components/dashboard/SubscriptionPlanManager';
import { UserManagement, CompanyDetail, ActivityLogs, SystemOverview } from '../../components/admin';
import { supabase } from '../../lib/supabase';
import type { Tenant } from '../../types/database';

type TabType = 'overview' | 'companies' | 'users' | 'plans' | 'payments' | 'logs';

export function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Overview', href: 'overview' },
    { icon: <Building2 className="w-5 h-5" />, label: 'Companies', href: 'companies' },
    { icon: <Users className="w-5 h-5" />, label: 'Users', href: 'users' },
    { icon: <Package className="w-5 h-5" />, label: 'Plans & Pricing', href: 'plans' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Payments', href: 'payments' },
    { icon: <Activity className="w-5 h-5" />, label: 'Logs', href: 'logs' },
  ];

  useEffect(() => {
    if (activeTab === 'companies') fetchCompanies();
  }, [activeTab]);

  async function fetchCompanies() {
    setLoading(true);
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    setTenants(data || []);
    setLoading(false);
  }

  async function updateTenantStatus(tenantId: string, status: 'active' | 'suspended') {
    await supabase.from('tenants').update({ status }).eq('id', tenantId);
    fetchCompanies();
  }

  const filteredTenants = tenants.filter(
    (t) =>
      t.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter((t) => t.status === 'active').length,
    pendingTenants: tenants.filter((t) => t.status === 'pending').length,
    suspendedTenants: tenants.filter((t) => t.status === 'suspended').length,
  };

  const titles: Record<TabType, string> = {
    overview: 'System Overview',
    companies: 'Lending Companies',
    users: 'User Management',
    plans: 'Plans & Pricing',
    payments: 'Payment Management',
    logs: 'System Logs',
  };

  return (
    <DashboardLayout
      navItems={navItems}
      activeNav={activeTab}
      onNavChange={(nav) => setActiveTab(nav as TabType)}
      title={titles[activeTab]}
      onRefresh={fetchCompanies}
      refreshing={loading}
    >
      {activeTab === 'overview' && <SystemOverview />}

      {activeTab === 'companies' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={<Building2 className="w-5 h-5" />} label="Total" value={stats.totalTenants} color="bg-blue-50 text-blue-600" />
            <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Active" value={stats.activeTenants} color="bg-green-50 text-green-600" />
            <StatCard icon={<Clock className="w-5 h-5" />} label="Pending" value={stats.pendingTenants} color="bg-yellow-50 text-yellow-600" />
            <StatCard icon={<XCircle className="w-5 h-5" />} label="Suspended" value={stats.suspendedTenants} color="bg-red-50 text-red-600" />
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies..."
                className="input-field pl-10"
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-6"><LoadingState /></div>
            ) : filteredTenants.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No companies found</p>
              </div>
            ) : (
              <TenantTable
                tenants={filteredTenants}
                onStatusChange={updateTenantStatus}
                onView={(id) => setSelectedCompany(id)}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && <UserManagement />}

      {activeTab === 'plans' && <SubscriptionPlanManager />}

      {activeTab === 'payments' && <PaymentManagement />}

      {activeTab === 'logs' && <ActivityLogs />}

      {selectedCompany && (
        <CompanyDetail
          tenantId={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function TenantTable({ tenants, onStatusChange, onView }: {
  tenants: Tenant[];
  onStatusChange: (id: string, status: 'active' | 'suspended') => void;
  onView: (id: string) => void;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Company</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Registration</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Created</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tenants.map((tenant) => (
            <tr key={tenant.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {tenant.logo_url ? (
                      <img src={tenant.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{tenant.company_name}</p>
                    <p className="text-sm text-gray-500">{tenant.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-600">{tenant.registration_type} - {tenant.registration_number}</span>
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={tenant.status} />
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-gray-600">{new Date(tenant.created_at).toLocaleDateString()}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onView(tenant.id)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <div className="relative">
                    <button onClick={() => setOpenMenu(openMenu === tenant.id ? null : tenant.id)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
                    {openMenu === tenant.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                          {tenant.status !== 'active' && (
                            <button
                              onClick={() => { onStatusChange(tenant.id, 'active'); setOpenMenu(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                            >
                              Activate
                            </button>
                          )}
                          {tenant.status !== 'suspended' && (
                            <button
                              onClick={() => { onStatusChange(tenant.id, 'suspended'); setOpenMenu(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    suspended: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
