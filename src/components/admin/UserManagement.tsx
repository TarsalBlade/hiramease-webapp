import { useState, useEffect } from 'react';
import { Search, Key, UserX, UserCheck, Eye, EyeOff, Loader2, Shield, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserEntry {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  tenant_id: string | null;
  is_active: boolean;
  created_at: string;
  tenant_name?: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [resetModal, setResetModal] = useState<UserEntry | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*, tenant:tenants(company_name)')
      .order('created_at', { ascending: false });

    if (profiles) {
      setUsers(
        profiles.map((p) => ({
          ...p,
          tenant_name: Array.isArray(p.tenant) ? p.tenant[0]?.company_name : (p.tenant as any)?.company_name,
        }))
      );
    }
    setLoading(false);
  }

  async function toggleUserActive(userId: string, isActive: boolean) {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`;
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
        'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'toggle_user_active', user_id: userId, is_active: isActive }),
    });

    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u)));
    }
  }

  const filtered = users.filter((u) => {
    const matchesSearch =
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'lending_admin').length,
    borrowers: users.filter((u) => u.role === 'borrower').length,
    inactive: users.filter((u) => !u.is_active).length,
  };

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      super_admin: 'bg-red-100 text-red-700',
      lending_admin: 'bg-blue-100 text-blue-700',
      borrower: 'bg-green-100 text-green-700',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${styles[role] || 'bg-gray-100 text-gray-700'}`}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Users</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-blue-600">{stats.admins}</p>
          <p className="text-sm text-gray-500">Lending Admins</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-green-600">{stats.borrowers}</p>
          <p className="text-sm text-gray-500">Borrowers</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
          <p className="text-sm text-gray-500">Inactive</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input-field w-48"
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="lending_admin">Lending Admin</option>
          <option value="borrower">Borrower</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">User</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Company</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Joined</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 ${!user.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                      <p className="text-sm text-gray-500">{user.email || '-'}</p>
                      {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                    </td>
                    <td className="px-6 py-4">{roleBadge(user.role)}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{user.tenant_name || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.role !== 'super_admin' && (
                          <>
                            <button
                              onClick={() => setResetModal(user)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleUserActive(user.id, !user.is_active)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.is_active
                                  ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                  : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                              }`}
                              title={user.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resetModal && (
        <ResetPasswordModal
          user={resetModal}
          onClose={() => setResetModal(null)}
        />
      )}
    </div>
  );
}

function ResetPasswordModal({ user, onClose }: { user: UserEntry; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleReset() {
    if (password.length < 8) {
      setResult({ success: false, message: 'Password must be at least 8 characters' });
      return;
    }
    setLoading(true);
    setResult(null);

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions`;
    const { data: { session } } = await supabase.auth.getSession();

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action: 'reset_password', user_id: user.id, new_password: password }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: 'Password reset successfully' });
        setTimeout(onClose, 1500);
      } else {
        setResult({ success: false, message: data.error || 'Failed to reset password' });
      }
    } catch {
      setResult({ success: false, message: 'Network error' });
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Reset Password</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-700">
                You are resetting the password for <strong>{user.first_name} {user.last_name}</strong> ({user.email}).
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10"
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {result && (
            <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {result.message}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={handleReset} disabled={loading || password.length < 8} className="btn-primary disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
