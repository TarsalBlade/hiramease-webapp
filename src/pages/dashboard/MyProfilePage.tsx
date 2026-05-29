import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Loader2,
  CheckCircle,
  Edit2,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { BorrowerProfile } from '../../types/database';

export function MyProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [borrowerProfile, setBorrowerProfile] = useState<BorrowerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(buildFormState(profile, null));

  const navItems = [
    { icon: <User className="w-5 h-5" />, label: 'Profile', href: 'profile' },
  ];

  function buildFormState(userProfile: any, borrower: BorrowerProfile | null) {
    return {
      email: userProfile?.email || '',
      phone: userProfile?.phone || '',
      date_of_birth: borrower?.date_of_birth || '',
      gender: borrower?.gender || '',
      civil_status: borrower?.civil_status || '',
      address: borrower?.address || '',
      city: borrower?.city || '',
      province: borrower?.province || '',
      employment_status: borrower?.employment_status || '',
      employer_name: borrower?.employer_name || '',
      monthly_income_php: borrower?.monthly_income_php?.toString() || '',
      years_employed: borrower?.years_employed?.toString() || '',
    };
  }

  React.useEffect(() => {
    fetchBorrowerProfile();
  }, []);

  async function fetchBorrowerProfile() {
    try {
      const { data: borrowerRows } = await supabase
        .from('borrower_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const borrower = borrowerRows?.[0] || null;
      setBorrowerProfile(borrower);
      setForm(buildFormState(profile, borrower));
    } catch (err) {
      console.error('Error loading borrower profile:', err);
    }
    setLoading(false);
  }

  function startEditing() {
    setForm(buildFormState(profile, borrowerProfile));
    setErrors({});
    setSaveSuccess(false);
    setEditing(true);
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(\+63|0)[0-9]{10}$/.test(form.phone.replace(/[\s-]/g, ''))) {
      newErrors.phone = 'Use format: +639XXXXXXXXX or 09XXXXXXXXX';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!borrowerProfile || !user?.id) return;

    if (!validateForm()) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          email: form.email,
          phone: form.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      const { error: borrowerError } = await supabase
        .from('borrower_profiles')
        .update({
          date_of_birth: form.date_of_birth || null,
          gender: form.gender || null,
          civil_status: form.civil_status || null,
          address: form.address || null,
          city: form.city || null,
          province: form.province || null,
          employment_status: form.employment_status || null,
          employer_name: form.employer_name || null,
          monthly_income_php: form.monthly_income_php ? parseFloat(form.monthly_income_php) : null,
          years_employed: form.years_employed ? parseInt(form.years_employed) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', borrowerProfile.id);

      if (profileError || borrowerError) {
        alert('Failed to update profile. Please try again.');
      } else {
        setEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        await refreshProfile();
        await fetchBorrowerProfile();
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('An error occurred while saving your profile.');
    }

    setSaving(false);
  }

  return (
    <DashboardLayout
      navItems={navItems}
      activeNav="profile"
      onNavChange={() => {}}
      title="My Profile"
      onRefresh={fetchBorrowerProfile}
      refreshing={loading}
    >
      <div className="space-y-6">
        {/* Profile Header Card */}
        {!loading && profile && (
          <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {profile.first_name} {profile.last_name}
                  </h2>
                  <p className="text-gray-600">{profile.email}</p>
                </div>
              </div>
              {borrowerProfile && !editing && (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Profile Card */}
        <div className="card">
          <div className="border-b border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
          </div>

          {saveSuccess && (
            <div className="p-6 bg-green-50 border-b border-green-200 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-green-700 font-medium">Profile updated successfully!</p>
            </div>
          )}

          {loading ? (
            <div className="p-6"><LoadingState /></div>
          ) : !borrowerProfile ? (
            <div className="p-8 text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Complete a loan application to create your borrower profile.</p>
            </div>
          ) : editing ? (
            <EditForm
              form={form}
              setForm={setForm}
              errors={errors}
              saving={saving}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <ViewProfile profile={profile} borrowerProfile={borrowerProfile} />
          )}
        </div>

        {/* Additional Information Cards */}
        {!loading && borrowerProfile && !editing && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Employment Card */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Employment</h3>
              </div>
              <div className="space-y-4">
                <InfoField
                  label="Status"
                  value={borrowerProfile.employment_status || 'Not provided'}
                />
                <InfoField
                  label="Employer"
                  value={borrowerProfile.employer_name || 'Not provided'}
                />
                <InfoField
                  label="Years Employed"
                  value={borrowerProfile.years_employed ? `${borrowerProfile.years_employed} years` : 'Not provided'}
                />
                <InfoField
                  label="Monthly Income"
                  value={borrowerProfile.monthly_income_php ? `PHP ${borrowerProfile.monthly_income_php.toLocaleString()}` : 'Not provided'}
                />
              </div>
            </div>

            {/* Contact & Address Card */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Address</h3>
              </div>
              <div className="space-y-4">
                <InfoField
                  label="Street Address"
                  value={borrowerProfile.address || 'Not provided'}
                />
                <InfoField
                  label="City"
                  value={borrowerProfile.city || 'Not provided'}
                />
                <InfoField
                  label="Province"
                  value={borrowerProfile.province || 'Not provided'}
                />
              </div>
            </div>

            {/* Personal Details Card */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
              </div>
              <div className="space-y-4">
                <InfoField
                  label="Date of Birth"
                  value={borrowerProfile.date_of_birth || 'Not provided'}
                />
                <InfoField
                  label="Gender"
                  value={borrowerProfile.gender ? borrowerProfile.gender.charAt(0).toUpperCase() + borrowerProfile.gender.slice(1) : 'Not provided'}
                />
                <InfoField
                  label="Civil Status"
                  value={borrowerProfile.civil_status ? borrowerProfile.civil_status.charAt(0).toUpperCase() + borrowerProfile.civil_status.slice(1) : 'Not provided'}
                />
              </div>
            </div>

            {/* Contact Card */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Contact</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900 break-all">{profile?.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{profile?.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

interface EditFormProps {
  form: Record<string, string>;
  setForm: (form: Record<string, string>) => void;
  errors: Record<string, string>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

function EditForm({ form, setForm, errors, saving, onSave, onCancel }: EditFormProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-700">Email and phone number are required for loan notifications and communication.</p>
      </div>

      {/* Contact Information */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Contact Information</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Email Address <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`input-field ${errors.email ? 'border-red-500' : ''}`}
              placeholder="your@email.com"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="label">Phone Number <span className="text-red-500">*</span></label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
              placeholder="+639171234567 or 09171234567"
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Personal Information</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Date of Birth</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="input-field"
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Civil Status</label>
            <select
              value={form.civil_status}
              onChange={(e) => setForm({ ...form, civil_status: e.target.value })}
              className="input-field"
            >
              <option value="">Select</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="widowed">Widowed</option>
              <option value="separated">Separated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Address Information</h4>
        <div className="space-y-4">
          <div>
            <label className="label">Street Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input-field"
              placeholder="Street address"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="input-field"
                placeholder="City"
              />
            </div>
            <div>
              <label className="label">Province</label>
              <input
                type="text"
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                className="input-field"
                placeholder="Province"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Employment Information */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Employment Information</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Employment Status</label>
            <select
              value={form.employment_status}
              onChange={(e) => setForm({ ...form, employment_status: e.target.value })}
              className="input-field"
            >
              <option value="">Select</option>
              <option value="employed">Employed</option>
              <option value="self_employed">Self Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          <div>
            <label className="label">Employer Name</label>
            <input
              type="text"
              value={form.employer_name}
              onChange={(e) => setForm({ ...form, employer_name: e.target.value })}
              className="input-field"
              placeholder="Employer name"
            />
          </div>
          <div>
            <label className="label">Years Employed</label>
            <input
              type="number"
              value={form.years_employed}
              onChange={(e) => setForm({ ...form, years_employed: e.target.value })}
              className="input-field"
              min="0"
              placeholder="e.g., 3"
            />
          </div>
          <div>
            <label className="label">Monthly Income (PHP)</label>
            <input
              type="number"
              value={form.monthly_income_php}
              onChange={(e) => setForm({ ...form, monthly_income_php: e.target.value })}
              className="input-field"
              placeholder="Monthly income"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
        <button onClick={onCancel} className="btn-outline" disabled={saving}>
          Cancel
        </button>
        <button onClick={onSave} disabled={saving} className="btn-primary">
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
}

function ViewProfile({ profile, borrowerProfile }: { profile: any; borrowerProfile: BorrowerProfile }) {
  return (
    <div className="p-6">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Contact Information
            </h4>
            <div className="space-y-3">
              <ProfileField label="Email Address" value={profile?.email || 'Not set'} icon={Mail} />
              <ProfileField label="Phone Number" value={profile?.phone || 'Not set'} icon={Phone} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Personal Information
            </h4>
            <div className="space-y-3">
              <ProfileField label="Date of Birth" value={borrowerProfile.date_of_birth || 'Not set'} />
              <ProfileField
                label="Gender"
                value={borrowerProfile.gender ? borrowerProfile.gender.charAt(0).toUpperCase() + borrowerProfile.gender.slice(1) : 'Not set'}
              />
              <ProfileField
                label="Civil Status"
                value={borrowerProfile.civil_status ? borrowerProfile.civil_status.charAt(0).toUpperCase() + borrowerProfile.civil_status.slice(1) : 'Not set'}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Address
            </h4>
            <div className="space-y-3">
              <ProfileField label="Street Address" value={borrowerProfile.address || 'Not set'} icon={MapPin} />
              <ProfileField label="City" value={borrowerProfile.city || 'Not set'} />
              <ProfileField label="Province" value={borrowerProfile.province || 'Not set'} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Employment
            </h4>
            <div className="space-y-3">
              <ProfileField label="Employment Status" value={borrowerProfile.employment_status || 'Not set'} />
              <ProfileField label="Employer" value={borrowerProfile.employer_name || 'Not set'} />
              <ProfileField label="Years Employed" value={borrowerProfile.years_employed?.toString() || 'Not set'} />
              <ProfileField
                label="Monthly Income"
                value={borrowerProfile.monthly_income_php ? `PHP ${borrowerProfile.monthly_income_php.toLocaleString()}` : 'Not set'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProfileFieldProps {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className: string }>;
}

function ProfileField({ label, value, icon: Icon }: ProfileFieldProps) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />}
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="font-medium text-gray-900 capitalize">{value}</p>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900 capitalize text-right">{value}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      ))}
    </div>
  );
}
