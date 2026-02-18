import { useState, useEffect } from 'react';
import { Building2, Users, FileText, TrendingUp, CreditCard, Activity, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SystemStats {
  total_companies: number;
  active_companies: number;
  total_users: number;
  total_borrowers: number;
  total_applications: number;
  approved_applications: number;
  total_loan_volume: number;
  active_subscriptions: number;
  recent_activity: { action_type: string; description: string; created_at: string }[];
}

export function SystemOverview() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);

    const [tenantsRes, usersRes, appsRes, subsRes, activityRes] = await Promise.all([
      supabase.from('tenants').select('id, status'),
      supabase.from('user_profiles').select('id, role'),
      supabase.from('credit_applications').select('id, status, loan_amount_php'),
      supabase.from('subscriptions').select('id, status'),
      supabase.from('activity_logs').select('action_type, description, created_at').order('created_at', { ascending: false }).limit(10),
    ]);

    const tenants = tenantsRes.data || [];
    const users = usersRes.data || [];
    const apps = appsRes.data || [];
    const subs = subsRes.data || [];

    setStats({
      total_companies: tenants.length,
      active_companies: tenants.filter((t: any) => t.status === 'active').length,
      total_users: users.length,
      total_borrowers: users.filter((u: any) => u.role === 'borrower').length,
      total_applications: apps.length,
      approved_applications: apps.filter((a: any) => a.status === 'approved').length,
      total_loan_volume: apps.reduce((sum: number, a: any) => sum + (a.loan_amount_php || 0), 0),
      active_subscriptions: subs.filter((s: any) => s.status === 'active' || s.status === 'trial').length,
      recent_activity: (activityRes.data || []) as any[],
    });

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Building2 className="w-5 h-5" />}
          label="Companies"
          value={stats.total_companies}
          subtitle={`${stats.active_companies} active`}
          color="bg-blue-50 text-blue-600"
        />
        <MetricCard
          icon={<Users className="w-5 h-5" />}
          label="Total Users"
          value={stats.total_users}
          subtitle={`${stats.total_borrowers} borrowers`}
          color="bg-teal-50 text-teal-600"
        />
        <MetricCard
          icon={<FileText className="w-5 h-5" />}
          label="Applications"
          value={stats.total_applications}
          subtitle={`${stats.approved_applications} approved`}
          color="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          icon={<CreditCard className="w-5 h-5" />}
          label="Subscriptions"
          value={stats.active_subscriptions}
          subtitle="active plans"
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Loan Volume</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            PHP {stats.total_loan_volume.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Total requested across {stats.total_applications} applications
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Approval Rate</span>
              <span className="font-medium text-gray-900">
                {stats.total_applications > 0
                  ? ((stats.approved_applications / stats.total_applications) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-green-500"
                style={{
                  width: `${stats.total_applications > 0 ? (stats.approved_applications / stats.total_applications) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {stats.recent_activity.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
            ) : (
              stats.recent_activity.map((entry, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{entry.description || entry.action_type}</p>
                    <p className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, subtitle, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}
