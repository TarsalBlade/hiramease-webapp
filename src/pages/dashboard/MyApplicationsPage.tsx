import { useState, useEffect } from 'react';
import {
  FileText,
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
  Building2,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { calculateLoan, formatPHP } from '../../utils/loanCalculator';
import type { CreditApplication, BorrowerProfile, Document, ApplicationDecision, AIScoringResult, TenantLendingSettings } from '../../types/database';
import { NewApplicationModal } from './modals/NewApplicationModal';
import { SelectTenantModal } from './modals/SelectTenantModal';
import { SwitchCompanyModal } from './modals/SwitchCompanyModal';

interface ApplicationWithDetails extends CreditApplication {
  documents?: Document[];
  decision?: ApplicationDecision;
  ai_scoring?: AIScoringResult;
}

interface TenantInfo {
  id: string;
  company_name: string;
  logo_url: string | null;
  description: string | null;
}

export function MyApplicationsPage() {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [borrowerProfile, setBorrowerProfile] = useState<BorrowerProfile | null>(null);
  const [currentTenant, setCurrentTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewApplicationModal, setShowNewApplicationModal] = useState(false);
  const [showSelectTenantModal, setShowSelectTenantModal] = useState(false);
  const [showSwitchCompany, setShowSwitchCompany] = useState(false);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  const navItems = [
    { icon: <FileText className="w-5 h-5" />, label: 'My Applications', href: 'applications' },
  ];

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id, activeTenantId]);

  async function fetchData() {
    setLoading(true);

    try {
      let borrowerQuery = supabase
        .from('borrower_profiles')
        .select('*')
        .eq('user_id', user?.id);

      if (activeTenantId) {
        borrowerQuery = borrowerQuery.eq('tenant_id', activeTenantId);
      }

      const { data: borrowerRows } = await borrowerQuery.order('created_at', { ascending: false }).limit(1);
      const borrower = borrowerRows?.[0] || null;

      setBorrowerProfile(borrower);

      if (borrower) {
        const [appsResult, tenantResult] = await Promise.all([
          supabase
            .from('credit_applications')
            .select(`
              *,
              documents(*),
              decision:application_decisions(*),
              ai_scoring:ai_scoring_results(*)
            `)
            .eq('borrower_id', borrower.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('tenants')
            .select('id, company_name, logo_url, description')
            .eq('id', borrower.tenant_id)
            .maybeSingle(),
        ]);

        if (appsResult.data) {
          setApplications(
            appsResult.data.map((app) => ({
              ...app,
              decision: Array.isArray(app.decision) ? app.decision[0] : app.decision,
              ai_scoring: Array.isArray(app.ai_scoring) ? app.ai_scoring[0] : app.ai_scoring,
            }))
          );
        }

        if (tenantResult.data) {
          setCurrentTenant(tenantResult.data as TenantInfo);
        }
      }
    } catch (err) {
      console.error('Error loading borrower data:', err);
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

  return (
    <DashboardLayout
      navItems={navItems}
      activeNav="applications"
      onNavChange={() => {}}
      title="My Applications"
      onRefresh={fetchData}
      refreshing={loading}
    >
      <div className="space-y-6">
        {currentTenant && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {currentTenant.logo_url ? (
                  <img src={currentTenant.logo_url} alt={currentTenant.company_name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Currently with</p>
                <p className="font-semibold text-gray-900">{currentTenant.company_name}</p>
              </div>
            </div>
            <button
              onClick={() => setShowSwitchCompany(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Switch Company
            </button>
          </div>
        )}

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

      {showSwitchCompany && (
        <SwitchCompanyModal
          userId={user?.id || ''}
          currentTenantId={borrowerProfile?.tenant_id}
          onClose={() => setShowSwitchCompany(false)}
          onComplete={(newTenantId: string) => {
            setActiveTenantId(newTenantId);
            setShowSwitchCompany(false);
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
