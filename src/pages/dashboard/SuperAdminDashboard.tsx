import { useState, useEffect } from 'react';
import { Building2, Shield, Search, MoreVertical, CheckCircle, Clock, XCircle, CreditCard, Package } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { PaymentManagement } from '../../components/payment';
import { SubscriptionPlanManager } from '../../components/dashboard/SubscriptionPlanManager';
import { supabase } from '../../lib/supabase';
import type { Tenant } from '../../types/database';

type TabType = 'companies' | 'plans' | 'payments' | 'audit';

interface AuditLogEntry {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  tenant?: { company_name: string } | null;
}

export function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('companies');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { icon: <Building2 className="w-5 h-5" />, label: 'Companies', href: 'companies' },
    { icon: <Package className="w-5 h-5" />, label: 'Plans & Pricing', href: 'plans' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Payments', href: 'payments' },
    { icon: <Shield className="w-5 h-5" />, label: 'Audit Logs', href: 'audit' },
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);

    if (activeTab === 'companies') {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      setTenants(data || []);
    } else if (activeTab === 'audit') {
      const { data } = await supabase
        .from('audit_logs')
        .select('*, tenant:tenants(company_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      setAuditLogs(
        (data || []).map((log) => ({
          ...log,
          tenant: Array.isArray(log.tenant) ? log.tenant[0] : log.tenant,
        }))
      );
    }

    setLoading(false);
  }

  async function updateTenantStatus(tenantId: string, status: 'active' | 'suspended') {
    await supabase.from('tenants').update({ status }).eq('id', tenantId);
    fetchData();
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
  };

  const titles: Record<TabType, string> = {
    companies: 'Lending Companies',
    plans: 'Plans & Pricing',
    payments: 'Payment Management',
    audit: 'Audit Logs',
  };

  return (
    <DashboardLayout
      navItems={navItems}
      activeNav={activeTab}
      onNavChange={(nav) => setActiveTab(nav as TabType)}
      title={titles[activeTab]}
    >
      {activeTab === 'companies' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<Building2 className="w-5 h-5" />}
              label="Total Companies"
              value={stats.totalTenants}
              color="bg-primary-100 text-primary-600"
            />
            <StatCard
              icon={<CheckCircle className="w-5 h-5" />}
              label="Active"
              value={stats.activeTenants}
              color="bg-green-100 text-green-600"
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Pending"
              value={stats.pendingTenants}
              color="bg-yellow-100 text-yellow-600"
            />
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
              <TenantTable tenants={filteredTenants} onStatusChange={updateTenantStatus} />
            )}
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <SubscriptionPlanManager />
      )}

      {activeTab === 'payments' && (
        <PaymentManagement />
      )}

      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-6"><LoadingState /></div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 text-center">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No audit logs yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Timestamp</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Company</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Action</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Entity</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">{new Date(log.created_at).toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{log.tenant?.company_name || 'System'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <ActionBadge action={log.action} />
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 capitalize">{log.entity_type.replace('_', ' ')}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500 max-w-xs truncate">
                            {log.new_values ? JSON.stringify(log.new_values).slice(0, 50) + '...' : '-'}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
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

function TenantTable({ tenants, onStatusChange }: { tenants: Tenant[]; onStatusChange: (id: string, status: 'active' | 'suspended') => void }) {
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
                <div>
                  <p className="font-medium text-gray-900">{tenant.company_name}</p>
                  <p className="text-sm text-gray-500">{tenant.email}</p>
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
                <div className="relative">
                  <button onClick={() => setOpenMenu(openMenu === tenant.id ? null : tenant.id)} className="p-2 hover:bg-gray-100 rounded-lg">
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

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
    decision: 'bg-primary-100 text-primary-700',
    override: 'bg-yellow-100 text-yellow-700',
  };

  const style = Object.entries(styles).find(([key]) => action.toLowerCase().includes(key))?.[1] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${style}`}>
      {action.replace('_', ' ')}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
