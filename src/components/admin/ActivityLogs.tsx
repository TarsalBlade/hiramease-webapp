import { useState, useEffect } from 'react';
import { Search, Filter, Download, Loader2, Activity, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ActivityLogEntry {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  action_type: string;
  description: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user_profile?: { first_name: string; last_name: string; role: string } | null;
  tenant?: { company_name: string } | null;
}

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

type LogSource = 'activity' | 'audit';

export function ActivityLogs() {
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [logSource, setLogSource] = useState<LogSource>('activity');
  const [entityFilter, setEntityFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, [logSource]);

  async function fetchLogs() {
    setLoading(true);
    if (logSource === 'activity') {
      const { data } = await supabase
        .from('activity_logs')
        .select('*, user_profile:user_profiles(first_name, last_name, role), tenant:tenants(company_name)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (data) {
        setActivityLogs(
          data.map((d) => ({
            ...d,
            user_profile: Array.isArray(d.user_profile) ? d.user_profile[0] : d.user_profile,
            tenant: Array.isArray(d.tenant) ? d.tenant[0] : d.tenant,
          }))
        );
      }
    } else {
      const { data } = await supabase
        .from('audit_logs')
        .select('*, tenant:tenants(company_name)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (data) {
        setAuditLogs(
          data.map((d) => ({
            ...d,
            tenant: Array.isArray(d.tenant) ? d.tenant[0] : d.tenant,
          }))
        );
      }
    }
    setLoading(false);
  }

  function exportCSV() {
    const rows = logSource === 'activity'
      ? activityLogs.map((l) => ({
          timestamp: new Date(l.created_at).toISOString(),
          user: l.user_profile ? `${l.user_profile.first_name} ${l.user_profile.last_name}` : l.user_id || '-',
          company: l.tenant?.company_name || '-',
          action: l.action_type,
          entity: l.entity_type,
          description: l.description,
        }))
      : auditLogs.map((l) => ({
          timestamp: new Date(l.created_at).toISOString(),
          user: l.user_id || '-',
          company: l.tenant?.company_name || '-',
          action: l.action,
          entity: l.entity_type,
          details: l.new_values ? JSON.stringify(l.new_values) : '-',
        }));

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        headers.map((h) => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${logSource}_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const actionBadge = (action: string) => {
    const lower = action.toLowerCase();
    let style = 'bg-gray-100 text-gray-700';
    if (lower.includes('create') || lower.includes('insert') || lower.includes('submit')) style = 'bg-green-100 text-green-700';
    else if (lower.includes('update') || lower.includes('edit')) style = 'bg-blue-100 text-blue-700';
    else if (lower.includes('delete') || lower.includes('reject') || lower.includes('deactivat')) style = 'bg-red-100 text-red-700';
    else if (lower.includes('approv') || lower.includes('activat')) style = 'bg-emerald-100 text-emerald-700';
    else if (lower.includes('reset') || lower.includes('password')) style = 'bg-yellow-100 text-yellow-700';
    else if (lower.includes('login') || lower.includes('auth')) style = 'bg-cyan-100 text-cyan-700';

    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${style}`}>
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  const filteredActivity = activityLogs.filter((l) => {
    const matchesSearch =
      l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.user_profile?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.user_profile?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tenant?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = entityFilter === 'all' || l.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const filteredAudit = auditLogs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tenant?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = entityFilter === 'all' || l.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const entityTypes = logSource === 'activity'
    ? [...new Set(activityLogs.map((l) => l.entity_type).filter(Boolean))]
    : [...new Set(auditLogs.map((l) => l.entity_type).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setLogSource('activity')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              logSource === 'activity' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Activity Logs
          </button>
          <button
            onClick={() => setLogSource('audit')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              logSource === 'audit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Audit Logs
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="input-field pl-10"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="input-field w-44"
        >
          <option value="all">All Entities</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <button onClick={fetchLogs} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <RefreshCw className="w-5 h-5" />
        </button>

        <button onClick={exportCSV} className="btn-outline flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
          </div>
        ) : logSource === 'activity' ? (
          filteredActivity.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No activity logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Time</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">User</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Company</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Action</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Entity</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredActivity.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <p className="text-xs text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm text-gray-900">
                          {log.user_profile ? `${log.user_profile.first_name} ${log.user_profile.last_name}` : 'System'}
                        </p>
                        {log.user_profile && (
                          <p className="text-xs text-gray-400 capitalize">{log.user_profile.role.replace('_', ' ')}</p>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm text-gray-600">{log.tenant?.company_name || '-'}</p>
                      </td>
                      <td className="px-6 py-3">{actionBadge(log.action_type)}</td>
                      <td className="px-6 py-3">
                        <p className="text-sm text-gray-600 capitalize">{log.entity_type.replace(/_/g, ' ')}</p>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm text-gray-500 max-w-xs truncate">{log.description}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredAudit.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Time</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Company</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Action</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Entity</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAudit.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <p className="text-xs text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm text-gray-600">{log.tenant?.company_name || 'System'}</p>
                      </td>
                      <td className="px-6 py-3">{actionBadge(log.action)}</td>
                      <td className="px-6 py-3">
                        <p className="text-sm text-gray-600 capitalize">{log.entity_type.replace(/_/g, ' ')}</p>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm text-gray-500 max-w-xs truncate">
                          {log.new_values ? JSON.stringify(log.new_values).slice(0, 80) : '-'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
