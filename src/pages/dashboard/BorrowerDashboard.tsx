import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  User,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  X,
  Loader2,
  Brain,
  Info,
  Upload,
  Wallet,
  Calculator,
  Percent,
  Building2,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { PaymentHistory } from '../../components/payment';
import { calculateLoan, formatPHP } from '../../utils/loanCalculator';
import type { CreditApplication, BorrowerProfile, Document, ApplicationDecision, AIScoringResult, TenantLendingSettings } from '../../types/database';

type TabType = 'applications' | 'profile' | 'payments';

interface ApplicationWithDetails extends CreditApplication {
  documents?: Document[];
  decision?: ApplicationDecision;
  ai_scoring?: AIScoringResult;
}

export function BorrowerDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('applications');
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [borrowerProfile, setBorrowerProfile] = useState<BorrowerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewApplicationModal, setShowNewApplicationModal] = useState(false);
  const [showSelectTenantModal, setShowSelectTenantModal] = useState(false);

  const navItems = [
    { icon: <FileText className="w-5 h-5" />, label: 'My Applications', href: 'applications' },
    { icon: <Wallet className="w-5 h-5" />, label: 'Payments', href: 'payments' },
    { icon: <User className="w-5 h-5" />, label: 'Profile', href: 'profile' },
  ];

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  async function fetchData() {
    setLoading(true);

    const { data: borrower } = await supabase
      .from('borrower_profiles')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    setBorrowerProfile(borrower);

    if (borrower) {
      const { data: apps } = await supabase
        .from('credit_applications')
        .select(`
          *,
          documents(*),
          decision:application_decisions(*),
          ai_scoring:ai_scoring_results(*)
        `)
        .eq('borrower_id', borrower.id)
        .order('created_at', { ascending: false });

      if (apps) {
        setApplications(
          apps.map((app) => ({
            ...app,
            decision: Array.isArray(app.decision) ? app.decision[0] : app.decision,
            ai_scoring: Array.isArray(app.ai_scoring) ? app.ai_scoring[0] : app.ai_scoring,
          }))
        );
      }
    }

    setLoading(false);
  }

  function handleNewApplication() {
    if (!borrowerProfile) {
      setShowSelectTenantModal(true);
    } else {
      setShowNewApplicationModal(true);
    }
  }

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => !['approved', 'rejected', 'disbursed'].includes(a.status)).length,
    approved: applications.filter((a) => a.status === 'approved' || a.status === 'disbursed').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  const titles: Record<TabType, string> = {
    applications: 'My Applications',
    payments: 'Payment History',
    profile: 'My Profile',
  };

  return (
    <DashboardLayout
      navItems={navItems}
      activeNav={activeTab}
      onNavChange={(nav) => setActiveTab(nav as TabType)}
      title={titles[activeTab]}
    >
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <StatCard icon={<FileText className="w-5 h-5" />} label="Total" value={stats.total} color="bg-primary-100 text-primary-600" />
              <StatCard icon={<Clock className="w-5 h-5" />} label="Pending" value={stats.pending} color="bg-yellow-100 text-yellow-600" />
              <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Approved" value={stats.approved} color="bg-green-100 text-green-600" />
            </div>
            <button onClick={handleNewApplication} className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Application
            </button>
          </div>

          {loading ? (
            <div className="card p-6"><LoadingState /></div>
          ) : applications.length === 0 ? (
            <div className="card p-8">
              <EmptyState onNewApplication={handleNewApplication} />
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <ApplicationDetailCard key={app.id} application={app} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="card p-6">
          <PaymentHistory />
        </div>
      )}

      {activeTab === 'profile' && (
        <ProfileSection
          profile={profile}
          borrowerProfile={borrowerProfile}
          onUpdate={fetchData}
        />
      )}

      {showSelectTenantModal && (
        <SelectTenantModal
          userId={user?.id || ''}
          onClose={() => setShowSelectTenantModal(false)}
          onComplete={() => {
            setShowSelectTenantModal(false);
            fetchData();
            setShowNewApplicationModal(true);
          }}
        />
      )}

      {showNewApplicationModal && borrowerProfile && (
        <NewApplicationModal
          borrowerProfile={borrowerProfile}
          onClose={() => setShowNewApplicationModal(false)}
          onComplete={() => {
            setShowNewApplicationModal(false);
            fetchData();
          }}
        />
      )}
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function ApplicationDetailCard({ application }: { application: ApplicationWithDetails }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{application.application_number}</p>
            <p className="text-sm text-gray-500">Submitted {application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : 'Draft'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold text-gray-900">PHP {application.loan_amount_php.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{application.loan_term_months} months</p>
          </div>
          <StatusBadge status={application.status} />
          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="grid md:grid-cols-2 gap-6 pt-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Loan Details</h4>
              <InfoRow label="Purpose" value={application.loan_purpose} />
              <InfoRow label="Collateral" value={application.collateral_type || 'None'} />
              {application.collateral_estimated_value_php && (
                <InfoRow label="Collateral Value" value={`PHP ${application.collateral_estimated_value_php.toLocaleString()}`} />
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Status Timeline</h4>
              <StatusTimeline status={application.status} />
            </div>
          </div>

          {application.ai_scoring && application.ai_scoring.overall_score && (
            <CreditScoreExplanation scoring={application.ai_scoring} />
          )}

          {application.decision && (
            <div className={`mt-6 p-4 rounded-lg ${application.decision.decision === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {application.decision.decision === 'approved' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-semibold capitalize ${application.decision.decision === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
                  {application.decision.decision}
                </span>
              </div>
              {application.decision.decision === 'approved' && application.decision.approved_amount_php && (
                <p className="text-sm text-green-700">
                  Approved Amount: PHP {application.decision.approved_amount_php.toLocaleString()} at {application.decision.interest_rate_percent}% interest
                </p>
              )}
              {application.decision.rejection_reason && (
                <p className="text-sm text-red-700">Reason: {application.decision.rejection_reason}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreditScoreExplanation({ scoring }: { scoring: AIScoringResult }) {
  const score = scoring.overall_score || 0;
  const riskLevel = scoring.risk_level || 'unknown';

  const getScoreColor = () => {
    if (score >= 720) return { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50' };
    if (score >= 620) return { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-50' };
    return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50' };
  };

  const getRiskBadge = () => {
    const styles: Record<string, string> = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700',
    };
    return styles[riskLevel] || 'bg-gray-100 text-gray-700';
  };

  const scorePercent = Math.min(100, Math.max(0, ((score - 300) / 550) * 100));
  const colors = getScoreColor();

  return (
    <div className={`mt-6 p-5 rounded-xl ${colors.light} border border-gray-200`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">Credit Score Analysis</h4>
          <p className="text-sm text-gray-500">AI-powered evaluation</p>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-4">
        <div className="text-center">
          <p className={`text-4xl font-bold ${colors.text}`}>{score}</p>
          <p className="text-xs text-gray-500 mt-1">out of 850</p>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">300</span>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${getRiskBadge()}`}>
              {riskLevel} Risk
            </span>
            <span className="text-xs text-gray-500">850</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full flex">
              <div className="w-[36%] bg-red-400"></div>
              <div className="w-[18%] bg-yellow-400"></div>
              <div className="w-[46%] bg-green-400"></div>
            </div>
          </div>
          <div className="relative -mt-1" style={{ marginLeft: `calc(${scorePercent}% - 6px)` }}>
            <div className={`w-3 h-3 ${colors.bg} rotate-45 transform`}></div>
          </div>
        </div>
      </div>

      {scoring.borrower_explanation && (
        <div className="bg-white/60 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 leading-relaxed">{scoring.borrower_explanation}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        Score generated on {new Date(scoring.scored_at || '').toLocaleDateString()}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    verified: 'bg-cyan-100 text-cyan-700',
    scored: 'bg-primary-100 text-primary-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    disbursed: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <span className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function StatusTimeline({ status }: { status: string }) {
  const progressSteps = ['submitted', 'under_review', 'verified', 'scored'];
  const isRejected = status === 'rejected';
  const isApproved = status === 'approved';
  const isDisbursed = status === 'disbursed';

  const progressIndex = progressSteps.indexOf(status);
  const resolvedIndex = isRejected || isApproved || isDisbursed ? progressSteps.length : progressIndex;

  const stepLabels: Record<string, string> = {
    submitted: 'Application Submitted',
    under_review: 'Under Review',
    verified: 'Documents Verified',
    scored: 'Credit Scored',
  };

  return (
    <div className="space-y-1">
      {progressSteps.map((step, index) => {
        const isCompleted = index <= resolvedIndex - 1;
        const isCurrent = index === resolvedIndex && !isRejected && !isApproved && !isDisbursed;

        return (
          <div key={step} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-200'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : isCurrent ? (
                  <Clock className="w-3.5 h-3.5 text-white" />
                ) : null}
              </div>
              {index < progressSteps.length - 1 && (
                <div className={`w-0.5 h-5 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
            <span className={`text-sm pt-0.5 ${isCurrent ? 'font-semibold text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
              {stepLabels[step]}
            </span>
          </div>
        );
      })}

      {(isApproved || isDisbursed) && (
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-2 bg-green-300" />
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-500">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          </div>
          <span className="text-sm font-semibold text-green-700 pt-2.5">{isDisbursed ? 'Loan Disbursed' : 'Approved'}</span>
        </div>
      )}

      {isRejected && (
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-2 bg-red-300" />
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-red-500">
              <XCircle className="w-4 h-4 text-white" />
            </div>
          </div>
          <span className="text-sm font-semibold text-red-700 pt-2.5">Application Rejected</span>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function ProfileSection({ profile, borrowerProfile, onUpdate }: { profile: any; borrowerProfile: BorrowerProfile | null; onUpdate: () => void }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    email: profile?.email || '',
    phone: profile?.phone || '',
    date_of_birth: borrowerProfile?.date_of_birth || '',
    gender: borrowerProfile?.gender || '',
    civil_status: borrowerProfile?.civil_status || '',
    address: borrowerProfile?.address || '',
    city: borrowerProfile?.city || '',
    province: borrowerProfile?.province || '',
    employment_status: borrowerProfile?.employment_status || '',
    employer_name: borrowerProfile?.employer_name || '',
    monthly_income_php: borrowerProfile?.monthly_income_php?.toString() || '',
  });

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(\+63|0)[0-9]{10}$/.test(form.phone.replace(/\s+/g, ''))) {
      newErrors.phone = 'Invalid Philippine phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!borrowerProfile || !user?.id) return;

    if (!validateForm()) return;

    setSaving(true);

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        email: form.email,
        phone: form.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

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
        updated_at: new Date().toISOString(),
      })
      .eq('id', borrowerProfile.id);

    if (profileError || borrowerError) {
      alert('Failed to update profile. Please try again.');
    } else {
      setEditing(false);
      onUpdate();
    }

    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
          {borrowerProfile && !editing && (
            <button onClick={() => setEditing(true)} className="text-primary-600 hover:text-primary-700 font-medium text-sm">
              Edit
            </button>
          )}
        </div>

        {!borrowerProfile ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Complete a loan application to create your borrower profile.</p>
          </div>
        ) : editing ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-700">Email and phone number are required for loan notifications and communication.</p>
            </div>

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

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="input-field">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Civil Status</label>
                <select value={form.civil_status} onChange={(e) => setForm({ ...form, civil_status: e.target.value })} className="input-field">
                  <option value="">Select</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="widowed">Widowed</option>
                  <option value="separated">Separated</option>
                </select>
              </div>
              <div>
                <label className="label">Employment Status</label>
                <select value={form.employment_status} onChange={(e) => setForm({ ...form, employment_status: e.target.value })} className="input-field">
                  <option value="">Select</option>
                  <option value="employed">Employed</option>
                  <option value="self_employed">Self Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Address</label>
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" placeholder="Street address" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">City</label>
                <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Province</label>
                <input type="text" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="input-field" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Employer Name</label>
                <input type="text" value={form.employer_name} onChange={(e) => setForm({ ...form, employer_name: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Monthly Income (PHP)</label>
                <input type="number" value={form.monthly_income_php} onChange={(e) => setForm({ ...form, monthly_income_php: e.target.value })} className="input-field" />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button onClick={() => setEditing(false)} className="btn-outline">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <ProfileField label="Name" value={`${profile?.first_name} ${profile?.last_name}`} />
            <ProfileField label="Email Address" value={profile?.email || 'Not set'} />
            <ProfileField label="Phone Number" value={profile?.phone || 'Not set'} />
            <ProfileField label="Date of Birth" value={borrowerProfile.date_of_birth || 'Not set'} />
            <ProfileField label="Gender" value={borrowerProfile.gender || 'Not set'} />
            <ProfileField label="Civil Status" value={borrowerProfile.civil_status || 'Not set'} />
            <ProfileField label="Address" value={borrowerProfile.address || 'Not set'} />
            <ProfileField label="City/Province" value={`${borrowerProfile.city || ''}, ${borrowerProfile.province || ''}`.trim() || 'Not set'} />
            <ProfileField label="Employment" value={borrowerProfile.employment_status || 'Not set'} />
            <ProfileField label="Monthly Income" value={borrowerProfile.monthly_income_php ? `PHP ${borrowerProfile.monthly_income_php.toLocaleString()}` : 'Not set'} />
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-900 capitalize">{value}</p>
    </div>
  );
}

interface TenantWithSettings {
  id: string;
  company_name: string;
  registration_type: string;
  registration_number: string;
  lending_settings?: TenantLendingSettings;
}

function SelectTenantModal({ userId, onClose, onComplete }: { userId: string; onClose: () => void; onComplete: () => void }) {
  const [tenants, setTenants] = useState<TenantWithSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    const [tenantsRes, settingsRes] = await Promise.all([
      supabase.from('tenants').select('id, company_name, registration_type, registration_number').eq('status', 'active'),
      supabase.from('tenant_lending_settings').select('*'),
    ]);

    const settingsMap = new Map<string, TenantLendingSettings>();
    if (settingsRes.data) {
      for (const s of settingsRes.data) {
        settingsMap.set(s.tenant_id, s as TenantLendingSettings);
      }
    }

    const combined = (tenantsRes.data || []).map((t) => ({
      ...t,
      lending_settings: settingsMap.get(t.id),
    }));

    setTenants(combined);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!selectedTenant) return;
    setSubmitting(true);

    await supabase.from('borrower_profiles').insert({
      user_id: userId,
      tenant_id: selectedTenant,
    });

    onComplete();
  }

  const formatInterestType = (type: string) => {
    const map: Record<string, string> = {
      diminishing_balance: 'Diminishing Balance',
      flat: 'Flat Rate',
      add_on: 'Add-On',
    };
    return map[type] || type;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Select Lending Company</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-4">Choose a lending company to apply with:</p>

          {loading ? (
            <LoadingState />
          ) : tenants.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No lending companies available</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {tenants.map((tenant) => {
                const s = tenant.lending_settings;
                return (
                  <button
                    key={tenant.id}
                    onClick={() => setSelectedTenant(tenant.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedTenant === tenant.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <p className="font-semibold text-gray-900">{tenant.company_name}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 ml-6">{tenant.registration_type} - {tenant.registration_number}</p>
                      </div>
                      {selectedTenant === tenant.id && (
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    {s && (
                      <div className="mt-3 ml-6 grid grid-cols-3 gap-2">
                        <div className="bg-white/80 rounded-lg px-2.5 py-1.5">
                          <p className="text-xs text-gray-500">Interest</p>
                          <p className="text-sm font-semibold text-gray-900">{s.interest_rate_annual_percent}%/yr</p>
                        </div>
                        <div className="bg-white/80 rounded-lg px-2.5 py-1.5">
                          <p className="text-xs text-gray-500">Type</p>
                          <p className="text-sm font-semibold text-gray-900">{formatInterestType(s.interest_type).split(' ')[0]}</p>
                        </div>
                        <div className="bg-white/80 rounded-lg px-2.5 py-1.5">
                          <p className="text-xs text-gray-500">Loan Range</p>
                          <p className="text-sm font-semibold text-gray-900">{(s.min_loan_amount_php / 1000).toFixed(0)}K - {(s.max_loan_amount_php / 1000).toFixed(0)}K</p>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={handleSubmit} disabled={!selectedTenant || submitting} className="btn-primary disabled:opacity-50">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewApplicationModal({ borrowerProfile, onClose, onComplete }: { borrowerProfile: BorrowerProfile; onClose: () => void; onComplete: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoringComplete, setScoringComplete] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ score: number; risk: string; recommendation: string } | null>(null);
  const [lendingSettings, setLendingSettings] = useState<TenantLendingSettings | null>(null);
  const [form, setForm] = useState({
    loan_amount_php: '',
    loan_purpose: '',
    loan_term_months: '12',
    collateral_type: '',
    collateral_description: '',
    collateral_estimated_value_php: '',
  });
  const [files, setFiles] = useState<{ type: string; file: File }[]>([]);

  useEffect(() => {
    supabase
      .rpc('get_or_create_lending_settings', { p_tenant_id: borrowerProfile.tenant_id })
      .then(({ data }) => {
        if (data) {
          const s = data as TenantLendingSettings;
          setLendingSettings(s);
          setForm((prev) => ({
            ...prev,
            loan_amount_php: prev.loan_amount_php || s.min_loan_amount_php.toString(),
          }));
        }
      });
  }, [borrowerProfile.tenant_id]);

  const computation = useMemo(() => {
    const amount = parseFloat(form.loan_amount_php);
    const term = parseInt(form.loan_term_months);
    if (!amount || amount <= 0 || !term || !lendingSettings) return null;
    return calculateLoan(
      amount,
      lendingSettings.interest_rate_annual_percent,
      term,
      lendingSettings.interest_type,
      lendingSettings.processing_fee_percent,
      lendingSettings.service_fee_percent,
      lendingSettings.insurance_fee_percent
    );
  }, [form.loan_amount_php, form.loan_term_months, lendingSettings]);

  const termOptions = useMemo(() => {
    const defaults = [3, 6, 12, 18, 24, 36, 48, 60];
    if (!lendingSettings) return defaults.filter((t) => t >= 3 && t <= 60);
    return defaults.filter(
      (t) => t >= lendingSettings.min_loan_term_months && t <= lendingSettings.max_loan_term_months
    );
  }, [lendingSettings]);

  const formatInterestLabel = (type: string) => {
    const map: Record<string, string> = {
      diminishing_balance: 'Diminishing Balance',
      flat: 'Flat Rate',
      add_on: 'Add-On',
    };
    return map[type] || type;
  };

  async function handleProceedToScoring() {
    setScoring(true);
    setScoringComplete(false);
    setStep(4);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const income = borrowerProfile.monthly_income_php || 0;
    const loanAmt = parseFloat(form.loan_amount_php);
    const term = parseInt(form.loan_term_months);

    const dti = income > 0 ? (loanAmt / term) / income : 1;
    const incomeScore = Math.min(100, (income / 50000) * 100);
    const dtiScore = Math.max(0, 100 - (dti * 100));
    const termScore = term <= 12 ? 90 : term <= 24 ? 75 : 60;
    const collateralScore = form.collateral_type ? 85 : 50;

    const overall = Math.round((incomeScore * 0.3) + (dtiScore * 0.3) + (termScore * 0.2) + (collateralScore * 0.2));
    const risk = overall >= 700 ? 'low' : overall >= 550 ? 'medium' : 'high';
    const recommendation = overall >= 650 ? 'Likely to be approved' : overall >= 500 ? 'Under review' : 'May require additional information';

    setScoreResult({ score: overall, risk, recommendation });
    setScoringComplete(true);
    setScoring(false);
  }

  async function handleSubmit() {
    setSubmitting(true);

    const { data: application, error } = await supabase
      .from('credit_applications')
      .insert({
        borrower_id: borrowerProfile.id,
        tenant_id: borrowerProfile.tenant_id,
        loan_amount_php: parseFloat(form.loan_amount_php),
        loan_purpose: form.loan_purpose,
        loan_term_months: parseInt(form.loan_term_months),
        collateral_type: form.collateral_type || null,
        collateral_description: form.collateral_description || null,
        collateral_estimated_value_php: form.collateral_estimated_value_php ? parseFloat(form.collateral_estimated_value_php) : null,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && application) {
      for (const fileItem of files) {
        const filePath = `${borrowerProfile.tenant_id}/${application.id}/${fileItem.file.name}`;
        await supabase.storage.from('documents').upload(filePath, fileItem.file);
        await supabase.from('documents').insert({
          application_id: application.id,
          document_type: fileItem.type,
          file_name: fileItem.file.name,
          file_path: filePath,
          file_size_bytes: fileItem.file.size,
          mime_type: fileItem.file.type,
          uploaded_by: user?.id,
          verification_status: 'pending',
        });
      }
    }

    setSubmitting(false);
    onComplete();
  }

  function addFile(type: string, file: File) {
    setFiles([...files.filter((f) => f.type !== type), { type, file }]);
  }

  const loanAmount = parseFloat(form.loan_amount_php) || 0;
  const amountInRange = lendingSettings
    ? loanAmount >= lendingSettings.min_loan_amount_php && loanAmount <= lendingSettings.max_loan_amount_php
    : loanAmount > 0;
  const canProceedStep1 = form.loan_amount_php && form.loan_purpose && amountInRange;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">New Loan Application</h2>
            <div className="flex items-center gap-4 mt-1">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > s ? <CheckCircle className="w-3.5 h-3.5" /> : s}
                  </div>
                  <span className={`text-xs ${step >= s ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                    {s === 1 ? 'Details' : s === 2 ? 'Review' : s === 3 ? 'Documents' : 'Score'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {step === 1 && (
            <div className="space-y-5">
              {lendingSettings && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Lending Terms</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-blue-700">{lendingSettings.interest_rate_annual_percent}%</p>
                      <p className="text-xs text-blue-600">Annual Rate</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-700">{formatInterestLabel(lendingSettings.interest_type)}</p>
                      <p className="text-xs text-blue-600">Interest Type</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-700">{lendingSettings.processing_fee_percent}%</p>
                      <p className="text-xs text-blue-600">Processing Fee</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Loan Amount (PHP)</label>
                  <input
                    type="number"
                    value={form.loan_amount_php}
                    onChange={(e) => setForm({ ...form, loan_amount_php: e.target.value })}
                    className="input-field"
                    placeholder={lendingSettings ? `${lendingSettings.min_loan_amount_php.toLocaleString()} - ${lendingSettings.max_loan_amount_php.toLocaleString()}` : '100,000'}
                    min={lendingSettings?.min_loan_amount_php}
                    max={lendingSettings?.max_loan_amount_php}
                    required
                  />
                  {lendingSettings && loanAmount > 0 && !amountInRange ? (
                    <p className="text-xs text-red-600 mt-1">
                      Amount must be between {formatPHP(lendingSettings.min_loan_amount_php)} and {formatPHP(lendingSettings.max_loan_amount_php)}
                    </p>
                  ) : lendingSettings ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Range: {formatPHP(lendingSettings.min_loan_amount_php)} - {formatPHP(lendingSettings.max_loan_amount_php)}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="label">Loan Term (Months)</label>
                  <select value={form.loan_term_months} onChange={(e) => setForm({ ...form, loan_term_months: e.target.value })} className="input-field">
                    {termOptions.map((t) => (
                      <option key={t} value={t.toString()}>{t} months</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Loan Purpose</label>
                <select value={form.loan_purpose} onChange={(e) => setForm({ ...form, loan_purpose: e.target.value })} className="input-field" required>
                  <option value="">Select purpose</option>
                  <option value="Business Capital">Business Capital</option>
                  <option value="Personal">Personal</option>
                  <option value="Home Improvement">Home Improvement</option>
                  <option value="Vehicle Purchase">Vehicle Purchase</option>
                  <option value="Education">Education</option>
                  <option value="Medical">Medical</option>
                  <option value="Debt Consolidation">Debt Consolidation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Collateral Type</label>
                <select value={form.collateral_type} onChange={(e) => setForm({ ...form, collateral_type: e.target.value })} className="input-field">
                  <option value="">No collateral</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Vehicle">Vehicle</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Jewelry">Jewelry</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {form.collateral_type && (
                <>
                  <div>
                    <label className="label">Collateral Description</label>
                    <textarea value={form.collateral_description} onChange={(e) => setForm({ ...form, collateral_description: e.target.value })} className="input-field min-h-[80px]" placeholder="Describe your collateral..." />
                  </div>
                  <div>
                    <label className="label">Estimated Collateral Value (PHP)</label>
                    <input type="number" value={form.collateral_estimated_value_php} onChange={(e) => setForm({ ...form, collateral_estimated_value_php: e.target.value })} className="input-field" placeholder="500,000" />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && computation && lendingSettings && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <Calculator className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-gray-900">Loan Computation</h3>
                <p className="text-sm text-gray-500">Review the estimated charges before proceeding</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white text-center">
                <p className="text-sm text-blue-200 mb-1">Monthly Payment</p>
                <p className="text-4xl font-bold">{formatPHP(computation.monthlyPayment)}</p>
                <p className="text-sm text-blue-200 mt-2">for {form.loan_term_months} months</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ComputationRow label="Loan Amount" value={formatPHP(parseFloat(form.loan_amount_php))} />
                <ComputationRow label="Interest Rate" value={`${lendingSettings.interest_rate_annual_percent}% per year`} />
                <ComputationRow label="Interest Type" value={formatInterestLabel(lendingSettings.interest_type)} />
                <ComputationRow label="Loan Term" value={`${form.loan_term_months} months`} />
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Interest</span>
                  <span className="font-medium text-gray-900">{formatPHP(computation.totalInterest)}</span>
                </div>
                {computation.processingFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Processing Fee ({lendingSettings.processing_fee_percent}%)</span>
                    <span className="font-medium text-gray-900">{formatPHP(computation.processingFee)}</span>
                  </div>
                )}
                {computation.serviceFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service Fee ({lendingSettings.service_fee_percent}%)</span>
                    <span className="font-medium text-gray-900">{formatPHP(computation.serviceFee)}</span>
                  </div>
                )}
                {computation.insuranceFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Insurance Fee ({lendingSettings.insurance_fee_percent}%)</span>
                    <span className="font-medium text-gray-900">{formatPHP(computation.insuranceFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                  <span className="font-semibold text-gray-900">Total Amount Payable</span>
                  <span className="font-bold text-gray-900">{formatPHP(computation.totalAmount)}</span>
                </div>
                {computation.totalFees > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-gray-900">Net Proceeds (after fees)</span>
                    <span className="font-bold text-green-700">{formatPHP(computation.netProceeds)}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">
                    This is an estimate based on the lending company's current rates. The final terms may vary based on your credit assessment. Fees are deducted from the loan proceeds before disbursement.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && !computation && (
            <div className="text-center py-8">
              <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Unable to compute loan details. Please go back and fill in the loan amount.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <p className="text-gray-600">Upload required documents to support your application.</p>

              <FileUploadField label="Valid Government ID" description="Driver's License, Passport, or other valid ID" type="valid_id" files={files} onUpload={addFile} />
              <FileUploadField label="Proof of Income" description="Payslip, ITR, or Certificate of Employment" type="proof_of_income" files={files} onUpload={addFile} />

              {form.collateral_type && (
                <FileUploadField label="Collateral Documents" description="Title, OR/CR, or ownership proof" type="collateral_proof" files={files} onUpload={addFile} />
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium mb-1">Document Requirements</p>
                    <p>All documents must be clear and readable. Accepted formats: PDF, JPG, PNG (max 10MB each).</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              {!scoringComplete && (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Your Application</h3>
                  <p className="text-gray-600 mb-6">Our AI is evaluating your creditworthiness...</p>
                  <div className="max-w-md mx-auto">
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full animate-[progress_1.5s_ease-in-out]" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
              )}

              {scoringComplete && scoreResult && (
                <div className="space-y-5">
                  <div className="text-center py-6">
                    <div className="w-32 h-32 mx-auto mb-4 relative">
                      <svg className="transform -rotate-90" width="128" height="128">
                        <circle cx="64" cy="64" r="54" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                        <circle
                          cx="64" cy="64" r="54"
                          stroke={scoreResult.risk === 'low' ? '#10b981' : scoreResult.risk === 'medium' ? '#f59e0b' : '#ef4444'}
                          strokeWidth="8" fill="none"
                          strokeDasharray={`${(scoreResult.score / 850) * 339.292} 339.292`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-gray-900">{scoreResult.score}</span>
                        <span className="text-xs text-gray-500">/ 850</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Credit Score Analysis Complete</h3>
                    <p className={`text-sm font-medium ${
                      scoreResult.risk === 'low' ? 'text-green-600' : scoreResult.risk === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {scoreResult.risk.toUpperCase()} RISK
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900 mb-1">Analysis Result</p>
                        <p className="text-blue-700">{scoreResult.recommendation}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase">Score Factors</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Income Level</span>
                        <span className="font-medium text-gray-900">{Math.min(100, Math.round((borrowerProfile.monthly_income_php || 0) / 50000 * 100))}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Debt-to-Income Ratio</span>
                        <span className="font-medium text-gray-900">Good</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Loan Term</span>
                        <span className="font-medium text-gray-900">{form.loan_term_months} months</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Collateral</span>
                        <span className="font-medium text-gray-900">{form.collateral_type ? 'Provided' : 'None'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600">
                        This is a preliminary assessment. Final approval will be subject to document verification and review by the lending company.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
          {step > 1 && step < 4 ? (
            <button onClick={() => setStep(step - 1)} className="btn-outline">Back</button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <button onClick={() => setStep(2)} disabled={!canProceedStep1} className="btn-primary disabled:opacity-50">
              View Computation
            </button>
          )}
          {step === 2 && (
            <button onClick={() => setStep(3)} className="btn-primary">
              Continue to Upload
            </button>
          )}
          {step === 3 && (
            <button onClick={handleProceedToScoring} disabled={files.length === 0} className="btn-primary disabled:opacity-50 flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Analyze Application
            </button>
          )}
          {step === 4 && scoringComplete && (
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ComputationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function FileUploadField({ label, description, type, files, onUpload }: { label: string; description: string; type: string; files: { type: string; file: File }[]; onUpload: (type: string, file: File) => void }) {
  const existingFile = files.find((f) => f.type === type);

  return (
    <div>
      <label className="label">{label}</label>
      <p className="text-xs text-gray-500 mb-2">{description}</p>
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
        {existingFile ? (
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-700">{existingFile.file.name}</span>
          </div>
        ) : (
          <label className="cursor-pointer flex items-center justify-center gap-2 text-gray-500">
            <Upload className="w-5 h-5" />
            <span className="text-sm">Click to upload</span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(type, file);
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onNewApplication }: { onNewApplication: () => void }) {
  return (
    <div className="text-center py-8">
      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
      <p className="text-gray-500 mb-4">Start your first loan application today.</p>
      <button onClick={onNewApplication} className="btn-primary">
        <Plus className="w-5 h-5 mr-2" />
        New Application
      </button>
    </div>
  );
}
