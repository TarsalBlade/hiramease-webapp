import { useState, useEffect } from 'react';
import {
  FileText,
  Settings,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Brain,
  FileCheck,
  X,
  Loader2,
  Info,
  Sliders,
  Shield,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  Users,
  TrendingUp,
  TrendingDown,
  Bell,
  DollarSign,
  Building2,
  Mail,
} from 'lucide-react';
import { DashboardLayout, SubscriptionBilling, LendingSettings, BorrowerManagement, NotificationTemplates, ManualPaymentForm, CompanyProfile, AnalyticsDashboard, LoanDisbursement, FinancialStatements } from '../../components/dashboard';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { CreditApplication, BorrowerProfile, UserProfile, Document, AIScoringResult, ScoringConfiguration, FactorExplanation } from '../../types/database';
import {
  getOrCreateScoringConfig,
  updateScoringConfig,
  checkDocumentsVerified,
  logDecisionAudit,
} from '../../services/creditScoringEngine';

type TabType = 'overview' | 'applications' | 'borrowers' | 'loans' | 'scoring' | 'lending_settings' | 'payments' | 'notifications' | 'company' | 'billing' | 'financials';

interface ApplicationWithDetails extends CreditApplication {
  borrower?: BorrowerProfile & { user?: UserProfile };
  documents?: Document[];
  ai_scoring?: AIScoringResult;
  is_read_by_admin?: boolean;
}

export function LendingAdminDashboard() {
  const { user, profile, subscription } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
  const [planFeatures, setPlanFeatures] = useState<Record<string, boolean>>({});

  const unreadCount = applications.filter((a) => !a.is_read_by_admin && ['submitted', 'under_review', 'verified'].includes(a.status)).length;

  // Features available by plan tier (all plans get core features; advanced ones are gated)
  // Starter: core only | Professional: + advanced_reports, custom_scoring, priority_support
  // Enterprise: all features
  const hasFeature = (key: string): boolean => {
    // During trial, grant all features so users can explore
    if (subscription?.status === 'trial') return true;
    if (Object.keys(planFeatures).length === 0) return true; // fallback while loading
    return planFeatures[key] === true;
  };

  const navItems = [
    { icon: <TrendingUp className="w-5 h-5" />, label: 'Overview', href: 'overview' },
    { icon: <FileText className="w-5 h-5" />, label: 'Applications', href: 'applications', badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: <Users className="w-5 h-5" />, label: 'Borrowers', href: 'borrowers' },
    { icon: <DollarSign className="w-5 h-5" />, label: 'Loans', href: 'loans' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Payments', href: 'payments' },
    { icon: <Settings className="w-5 h-5" />, label: 'Lending Settings', href: 'lending_settings' },
    // Credit Scoring requires custom_scoring (Professional+)
    ...(hasFeature('custom_scoring') ? [{ icon: <Sliders className="w-5 h-5" />, label: 'Credit Scoring', href: 'scoring' }] : []),
    // Financials requires advanced_reports (Professional+)
    ...(hasFeature('advanced_reports') ? [{ icon: <TrendingDown className="w-5 h-5" />, label: 'Financials', href: 'financials' }] : []),
    { icon: <Bell className="w-5 h-5" />, label: 'Notifications', href: 'notifications' },
    { icon: <Building2 className="w-5 h-5" />, label: 'Company Profile', href: 'company' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Billing', href: 'billing' },
  ];

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchData();
    }
  }, [profile?.tenant_id]);

  async function fetchData() {
    if (!profile?.tenant_id) return;
    setLoading(true);

    const [appsResult, configResult] = await Promise.all([
      supabase
        .from('credit_applications')
        .select(`
          *,
          borrower:borrower_profiles(
            *,
            user:user_profiles(id, first_name, last_name, email, phone, role)
          ),
          documents(*),
          ai_scoring:ai_scoring_results(*)
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false }),
      getOrCreateScoringConfig(profile.tenant_id),
    ]);

    if (appsResult.error) {
      console.error('fetchData applications error:', appsResult.error);
    }

    if (appsResult.data) {
      setApplications(
        appsResult.data.map((app) => ({
          ...app,
          ai_scoring: Array.isArray(app.ai_scoring) ? app.ai_scoring[0] : app.ai_scoring,
        }))
      );
    }

    setScoringConfig(configResult);

    // Load plan features for sidebar gating
    if (subscription?.plan_id) {
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('features')
        .eq('id', subscription.plan_id)
        .maybeSingle();
      if (plan?.features) setPlanFeatures(plan.features as Record<string, boolean>);
    }

    setLoading(false);
  }

  async function handleVerifyDocument(docId: string, status: 'verified' | 'rejected', notes?: string) {
    if (!user?.id) return;

    await supabase.from('documents').update({ verification_status: status }).eq('id', docId);

    await supabase.from('document_verifications').insert({
      document_id: docId,
      verified_by: user.id,
      status,
      notes: notes || null,
      verified_at: new Date().toISOString(),
    });

    setSelectedApplication((prev) =>
      prev
        ? {
            ...prev,
            documents: prev.documents?.map((d) =>
              d.id === docId ? { ...d, verification_status: status } : d
            ),
          }
        : prev
    );

    if (selectedApplication?.id) {
      const { data: refreshedApp } = await supabase
        .from('credit_applications')
        .select(`
          *,
          borrower:borrower_profiles(*, user:user_profiles(*)),
          documents(*),
          ai_scoring:ai_scoring_results(*)
        `)
        .eq('id', selectedApplication.id)
        .maybeSingle();

      if (refreshedApp) {
        const normalized = {
          ...refreshedApp,
          ai_scoring: Array.isArray(refreshedApp.ai_scoring) ? refreshedApp.ai_scoring[0] : refreshedApp.ai_scoring,
        };
        setSelectedApplication(normalized);
        setApplications((prev) => prev.map((a) => a.id === normalized.id ? normalized : a));
      }
    } else {
      fetchData();
    }
  }

  async function triggerAIScoring(application: ApplicationWithDetails) {
    if (!profile?.tenant_id || !scoringConfig || !application.borrower) return;

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-credit-scoring`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ application_id: application.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Scoring failed');
      }

      // Refresh the open modal immediately so scoring results appear without closing
      const { data: refreshedApp } = await supabase
        .from('credit_applications')
        .select(`
          *,
          borrower:borrower_profiles(*, user:user_profiles(*)),
          documents(*),
          ai_scoring:ai_scoring_results(*)
        `)
        .eq('id', application.id)
        .maybeSingle();

      if (refreshedApp) {
        const normalized = {
          ...refreshedApp,
          ai_scoring: Array.isArray(refreshedApp.ai_scoring) ? refreshedApp.ai_scoring[0] : refreshedApp.ai_scoring,
        };
        setSelectedApplication(normalized);
        setApplications((prev) => prev.map((a) => a.id === normalized.id ? normalized : a));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Scoring failed');
    }
  }

  async function sendLoanNotification(
    application: ApplicationWithDetails,
    decision: 'approved' | 'rejected',
    approvalDetails?: { amount?: number; term?: number; rate?: number },
    rejectionReason?: string
  ) {
    if (!profile?.tenant_id) return;

    const templateType = decision === 'approved' ? 'loan_approval' : 'loan_rejection';

    const templateResult = await supabase
      .rpc('get_or_create_notification_template', {
        p_tenant_id: profile.tenant_id,
        p_template_type: templateType,
      });

    if (!templateResult.data) return;

    const template = templateResult.data;
    const borrower = application.borrower;
    const borrowerUser = borrower?.user;

    if (!borrower || !borrowerUser) return;

    const loanAmount = approvalDetails?.amount || application.loan_amount_php;
    const loanTerm = approvalDetails?.term || application.loan_term_months;
    const monthlyPayment = approvalDetails?.amount
      ? (approvalDetails.amount * (1 + (approvalDetails.rate || 0) / 100)) / (approvalDetails.term || 12)
      : 0;

    const replacements: Record<string, string> = {
      '{{loan_amount}}': `PHP ${Number(loanAmount).toLocaleString()}`,
      '{{loan_term}}': String(loanTerm),
      '{{monthly_payment}}': `PHP ${monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      '{{rejection_reason}}': rejectionReason || 'Not specified',
    };

    let emailBody = template.email_body;

    Object.entries(replacements).forEach(([key, value]) => {
      emailBody = emailBody.replace(new RegExp(key, 'g'), value);
    });

    if (!borrowerUser.email) return;

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`;
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: borrowerUser.id,
          tenant_id: profile.tenant_id,
          email: borrowerUser.email,
          title: template.subject,
          message: template.subject,
          type: decision === 'approved' ? 'loan_approved' : 'loan_rejected',
          email_body: emailBody,
        }),
      });
    } catch {}
  }

  async function handleSendRejectionEmail(application: ApplicationWithDetails) {
    const { data: decisionRow } = await supabase
      .from('application_decisions')
      .select('rejection_reason')
      .eq('application_id', application.id)
      .maybeSingle();

    await sendLoanNotification(application, 'rejected', undefined, decisionRow?.rejection_reason || undefined);
  }

  async function handleSendApprovalEmail(application: ApplicationWithDetails) {
    const { data: decisionRow } = await supabase
      .from('application_decisions')
      .select('approved_amount_php, approved_term_months, interest_rate_percent')
      .eq('application_id', application.id)
      .maybeSingle();

    await sendLoanNotification(
      application,
      'approved',
      decisionRow
        ? {
            amount: decisionRow.approved_amount_php || undefined,
            term: decisionRow.approved_term_months || undefined,
            rate: decisionRow.interest_rate_percent || undefined,
          }
        : undefined
    );
  }

  async function handleDecision(
    applicationId: string,
    decision: 'approved' | 'rejected',
    isOverride: boolean,
    overrideReason?: string,
    approvalDetails?: { amount?: number; term?: number; rate?: number; conditions?: string },
    rejectionReason?: string
  ) {
    if (!user?.id || !profile?.tenant_id) return;

    const application = applications.find((a) => a.id === applicationId);
    const aiRecommendation = application?.ai_scoring?.recommendation || 'none';

    await supabase.from('credit_applications').update({
      status: decision,
      decided_at: new Date().toISOString(),
    }).eq('id', applicationId);

    await supabase.from('application_decisions').upsert({
      application_id: applicationId,
      decided_by: user.id,
      decision,
      override_ai_recommendation: isOverride,
      override_reason: isOverride ? overrideReason : null,
      original_ai_recommendation: aiRecommendation,
      approved_amount_php: approvalDetails?.amount || null,
      approved_term_months: approvalDetails?.term || null,
      interest_rate_percent: approvalDetails?.rate || null,
      conditions: approvalDetails?.conditions || null,
      rejection_reason: rejectionReason || null,
      decided_at: new Date().toISOString(),
    });

    await logDecisionAudit(
      profile.tenant_id,
      user.id,
      applicationId,
      decision,
      aiRecommendation,
      isOverride,
      overrideReason
    );

    if (application) {
      await sendLoanNotification(application, decision, approvalDetails, rejectionReason);
    }

    fetchData();
    setSelectedApplication(null);
  }

  async function markAsRead(applicationId: string) {
    await supabase
      .from('credit_applications')
      .update({ is_read_by_admin: true })
      .eq('id', applicationId);
    setApplications((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, is_read_by_admin: true } : a))
    );
  }

  async function handleUpdateScoringConfig(updates: Partial<ScoringConfiguration>) {
    if (!profile?.tenant_id) return;
    try {
      const updated = await updateScoringConfig(profile.tenant_id, updates);
      setScoringConfig(updated);
    } catch (error) {
      alert('Failed to update scoring configuration');
    }
  }

  const filteredApplications = applications
    .filter((app) => {
      const matchesSearch =
        app.application_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.borrower?.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.borrower?.user?.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aUnread = !a.is_read_by_admin ? 1 : 0;
      const bUnread = !b.is_read_by_admin ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => ['submitted', 'under_review', 'verified'].includes(a.status)).length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  const titles: Record<TabType, string> = {
    overview: 'Dashboard Overview',
    applications: 'Credit Applications',
    borrowers: 'Borrower Management',
    loans: 'Loan Management',
    payments: 'Payment Management',
    scoring: 'Credit Scoring',
    lending_settings: 'Lending Settings',
    notifications: 'Notification Templates',
    company: 'Company Profile',
    financials: 'Financial Statements',
    billing: 'Subscription & Billing',
  };

  return (
    <DashboardLayout
      navItems={navItems}
      activeNav={activeTab}
      onNavChange={(nav) => setActiveTab(nav as TabType)}
      title={titles[activeTab]}
      onRefresh={fetchData}
      refreshing={loading}
    >
      {activeTab === 'overview' && profile?.tenant_id && (
        <AnalyticsDashboard tenantId={profile.tenant_id} />
      )}

      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={<FileText className="w-5 h-5" />} label="Total" value={stats.total} color="bg-primary-100 text-primary-600" />
            <StatCard icon={<Clock className="w-5 h-5" />} label="Pending" value={stats.pending} color="bg-yellow-100 text-yellow-600" />
            <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Approved" value={stats.approved} color="bg-green-100 text-green-600" />
            <StatCard icon={<XCircle className="w-5 h-5" />} label="Rejected" value={stats.rejected} color="bg-red-100 text-red-600" />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search applications..."
                className="input-field pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-full sm:w-48"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="verified">Verified</option>
              <option value="scored">Scored</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-6"><LoadingState /></div>
            ) : filteredApplications.length === 0 ? (
              <div className="p-8"><EmptyState message="No applications found" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Application</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Borrower</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Amount</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Score</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredApplications.map((app) => (
                      <tr key={app.id} className={`hover:bg-gray-50 ${!app.is_read_by_admin ? 'bg-blue-50/40' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {!app.is_read_by_admin && (
                              <span className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0" />
                            )}
                            <div>
                              <p className={`font-medium text-gray-900 ${!app.is_read_by_admin ? 'font-bold' : ''}`}>{app.application_number}</p>
                              <p className="text-sm text-gray-500">{new Date(app.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-900">{app.borrower?.user?.first_name} {app.borrower?.user?.last_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">PHP {app.loan_amount_php.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">{app.loan_term_months} months</p>
                        </td>
                        <td className="px-6 py-4">
                          <ScoreBadge scoring={app.ai_scoring} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              if (!app.is_read_by_admin) markAsRead(app.id);
                              setSelectedApplication(app);
                            }}
                            className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm"
                          >
                            <Eye className="w-4 h-4" />View
                          </button>
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

      {activeTab === 'borrowers' && profile?.tenant_id && (
        <BorrowerManagement tenantId={profile.tenant_id} />
      )}

      {activeTab === 'loans' && profile?.tenant_id && (
        <LoanDisbursement tenantId={profile.tenant_id} />
      )}

      {activeTab === 'scoring' && (
        hasFeature('custom_scoring')
          ? scoringConfig && <ScoringConfigPanel config={scoringConfig} onUpdate={handleUpdateScoringConfig} />
          : <UpgradePrompt feature="Custom Credit Scoring" requiredPlan="Professional" onUpgrade={() => setActiveTab('billing')} />
      )}

      {activeTab === 'payments' && profile?.tenant_id && (
        <ManualPaymentForm tenantId={profile.tenant_id} />
      )}

      {activeTab === 'lending_settings' && (
        <LendingSettings />
      )}

      {activeTab === 'notifications' && profile?.tenant_id && (
        <NotificationTemplates tenantId={profile.tenant_id} />
      )}

      {activeTab === 'company' && profile?.tenant_id && (
        <CompanyProfile tenantId={profile.tenant_id} />
      )}

      {activeTab === 'financials' && (
        hasFeature('advanced_reports') && profile?.tenant_id
          ? <FinancialStatements tenantId={profile.tenant_id} />
          : <UpgradePrompt feature="Financial Statements & Advanced Reports" requiredPlan="Professional" onUpgrade={() => setActiveTab('billing')} />
      )}

      {activeTab === 'billing' && (
        <SubscriptionBilling />
      )}

      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          scoringConfig={scoringConfig}
          onClose={() => setSelectedApplication(null)}
          onVerifyDocument={handleVerifyDocument}
          onTriggerAI={triggerAIScoring}
          onDecision={handleDecision}
          onSendEmail={handleSendRejectionEmail}
          onSendApprovalEmail={handleSendApprovalEmail}
        />
      )}
    </DashboardLayout>
  );
}

function UpgradePrompt({ feature, requiredPlan, onUpgrade }: { feature: string; requiredPlan: string; onUpgrade: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
        <Shield className="w-8 h-8 text-blue-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{feature}</h2>
      <p className="text-gray-500 mb-6 max-w-md">
        This feature is available on the <strong>{requiredPlan}</strong> plan and above.
        Upgrade your subscription to unlock it.
      </p>
      <button
        onClick={onUpgrade}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Upgrade Plan
      </button>
    </div>
  );
}

function ScoringConfigPanel({ config, onUpdate }: { config: ScoringConfiguration; onUpdate: (updates: Partial<ScoringConfiguration>) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    income_stability_weight: (config.income_stability_weight * 100).toString(),
    dti_weight: (config.dti_weight * 100).toString(),
    credit_history_weight: (config.credit_history_weight * 100).toString(),
    loan_risk_weight: (config.loan_risk_weight * 100).toString(),
    low_risk_threshold: config.low_risk_threshold.toString(),
    medium_risk_threshold: config.medium_risk_threshold.toString(),
  });

  const totalWeight = parseFloat(form.income_stability_weight) + parseFloat(form.dti_weight) + parseFloat(form.credit_history_weight) + parseFloat(form.loan_risk_weight);
  const isValid = Math.abs(totalWeight - 100) < 0.01;

  function handleSave() {
    if (!isValid) return;
    onUpdate({
      income_stability_weight: parseFloat(form.income_stability_weight) / 100,
      dti_weight: parseFloat(form.dti_weight) / 100,
      credit_history_weight: parseFloat(form.credit_history_weight) / 100,
      loan_risk_weight: parseFloat(form.loan_risk_weight) / 100,
      low_risk_threshold: parseInt(form.low_risk_threshold),
      medium_risk_threshold: parseInt(form.medium_risk_threshold),
    });
    setEditing(false);
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Sliders className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scoring Weights</h3>
              <p className="text-sm text-gray-500">Configure how each factor affects the credit score</p>
            </div>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-primary-600 hover:text-primary-700 font-medium text-sm">
              Edit
            </button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Credit Score Formula</p>
              <p>Final Score = (Income Stability x W1 + DTI x W2 + Credit History x W3 + Loan Risk x W4) x 5.5</p>
              <p className="mt-1">Score Range: {config.min_score} - {config.max_score}</p>
            </div>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <WeightInput label="Income Stability Weight" value={form.income_stability_weight} onChange={(v) => setForm({ ...form, income_stability_weight: v })} suffix="%" />
              <WeightInput label="Debt-to-Income Weight" value={form.dti_weight} onChange={(v) => setForm({ ...form, dti_weight: v })} suffix="%" />
              <WeightInput label="Credit History Weight" value={form.credit_history_weight} onChange={(v) => setForm({ ...form, credit_history_weight: v })} suffix="%" />
              <WeightInput label="Loan Risk Weight" value={form.loan_risk_weight} onChange={(v) => setForm({ ...form, loan_risk_weight: v })} suffix="%" />
            </div>

            <div className={`p-3 rounded-lg ${isValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <p className="text-sm font-medium">Total Weight: {totalWeight.toFixed(1)}% {isValid ? '(Valid)' : '(Must equal 100%)'}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <WeightInput label="Low Risk Threshold" value={form.low_risk_threshold} onChange={(v) => setForm({ ...form, low_risk_threshold: v })} suffix="" description="Score >= this = Low Risk (Approve)" />
              <WeightInput label="Medium Risk Threshold" value={form.medium_risk_threshold} onChange={(v) => setForm({ ...form, medium_risk_threshold: v })} suffix="" description="Score >= this = Medium Risk (Review)" />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button onClick={() => setEditing(false)} className="btn-outline">Cancel</button>
              <button onClick={handleSave} disabled={!isValid} className="btn-primary disabled:opacity-50">Save Changes</button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <ConfigDisplay label="Income Stability" value={`${(config.income_stability_weight * 100).toFixed(0)}%`} />
            <ConfigDisplay label="Debt-to-Income" value={`${(config.dti_weight * 100).toFixed(0)}%`} />
            <ConfigDisplay label="Credit History" value={`${(config.credit_history_weight * 100).toFixed(0)}%`} />
            <ConfigDisplay label="Loan Risk" value={`${(config.loan_risk_weight * 100).toFixed(0)}%`} />
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Risk Thresholds</h3>
            <p className="text-sm text-gray-500">Score ranges for risk classification</p>
          </div>
        </div>

        <div className="space-y-4">
          <ThresholdBar label="Low Risk" range={`${config.low_risk_threshold} - ${config.max_score}`} recommendation="Approve" color="bg-green-500" />
          <ThresholdBar label="Medium Risk" range={`${config.medium_risk_threshold} - ${config.low_risk_threshold - 1}`} recommendation="Review" color="bg-yellow-500" />
          <ThresholdBar label="High Risk" range={`${config.min_score} - ${config.medium_risk_threshold - 1}`} recommendation="Reject" color="bg-red-500" />
        </div>
      </div>
    </div>
  );
}

function WeightInput({ label, value, onChange, suffix, description }: { label: string; value: string; onChange: (v: string) => void; suffix: string; description?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="input-field pr-8" min="0" max="100" step="1" />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{suffix}</span>}
      </div>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

function ConfigDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function ThresholdBar({ label, range, recommendation, color }: { label: string; range: string; recommendation: string; color: string }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">Score: {range}</p>
      </div>
      <span className="text-sm font-medium text-gray-600">{recommendation}</span>
    </div>
  );
}

function BorrowerInfoPanel({ application }: { application: ApplicationWithDetails }) {
  const borrower = application.borrower;
  const user = borrower?.user;

  const monthlyPayment = application.loan_amount_php / application.loan_term_months;
  const monthlyIncome = borrower?.monthly_income_php || 0;
  const dtiRatio = monthlyIncome > 0 ? (monthlyPayment / monthlyIncome) * 100 : 0;
  const existingDebts = borrower?.existing_debts_php || 0;
  const totalDti = monthlyIncome > 0 ? ((monthlyPayment + existingDebts) / monthlyIncome) * 100 : 0;
  const annualIncome = monthlyIncome * 12;
  const incomeMultiple = annualIncome > 0 ? application.loan_amount_php / annualIncome : 0;

  const getDtiColor = (ratio: number) => {
    if (ratio <= 20) return 'text-green-700 bg-green-100';
    if (ratio <= 35) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  if (!borrower) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <p className="text-sm text-yellow-700 font-medium">Borrower information is unavailable. The profile may not have been fully set up.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          Borrower Profile
        </h3>
        {monthlyIncome > 0 && (
          <span className={`px-3 py-1 text-xs font-bold rounded-full ${getDtiColor(totalDti)}`}>
            DTI: {totalDti.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-x-6 gap-y-3">
        <div>
          <p className="text-xs text-gray-500">Full Name</p>
          <p className="text-sm font-semibold text-gray-900">{user?.first_name || ''} {user?.last_name || ''}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Email</p>
          <p className="text-sm font-medium text-gray-900">{user?.email || 'Not provided'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Phone</p>
          <p className="text-sm font-medium text-gray-900">{user?.phone || 'Not provided'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Date of Birth</p>
          <p className="text-sm font-medium text-gray-900">{borrower.date_of_birth ? new Date(borrower.date_of_birth).toLocaleDateString() : 'Not provided'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Gender</p>
          <p className="text-sm font-medium text-gray-900 capitalize">{borrower.gender || 'Not provided'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Civil Status</p>
          <p className="text-sm font-medium text-gray-900 capitalize">{borrower.civil_status || 'Not provided'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Employment Status</p>
          <p className="text-sm font-medium text-gray-900 capitalize">{borrower.employment_status?.replace('_', ' ') || 'Not provided'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Employer</p>
          <p className="text-sm font-medium text-gray-900">{borrower.employer_name || 'Not provided'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Years Employed</p>
          <p className="text-sm font-medium text-gray-900">{borrower.years_employed != null ? `${borrower.years_employed} years` : 'Not provided'}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Monthly Income</p>
          <p className="text-sm font-bold text-gray-900">{monthlyIncome > 0 ? `PHP ${monthlyIncome.toLocaleString()}` : 'Not provided'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Other Income</p>
          <p className="text-sm font-medium text-gray-900">{borrower.other_monthly_income_php ? `PHP ${borrower.other_monthly_income_php.toLocaleString()}` : 'None'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Existing Debts</p>
          <p className="text-sm font-medium text-gray-900">{existingDebts > 0 ? `PHP ${existingDebts.toLocaleString()}/mo` : 'None declared'}</p>
        </div>

        <div className="md:col-span-2">
          <p className="text-xs text-gray-500">Address</p>
          <p className="text-sm font-medium text-gray-900">
            {[borrower.address, borrower.city, borrower.province].filter(Boolean).join(', ') || 'Not provided'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">TIN</p>
          <p className="text-sm font-medium text-gray-900">{borrower.tin || 'Not provided'}</p>
        </div>
      </div>

      {monthlyIncome > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200">
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Est. Monthly Payment</p>
            <p className="text-sm font-bold text-gray-900">PHP {monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Loan DTI Ratio</p>
            <p className={`text-sm font-bold ${dtiRatio <= 20 ? 'text-green-700' : dtiRatio <= 35 ? 'text-yellow-700' : 'text-red-700'}`}>
              {dtiRatio.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Income Multiple</p>
            <p className={`text-sm font-bold ${incomeMultiple <= 1 ? 'text-green-700' : incomeMultiple <= 2 ? 'text-yellow-700' : 'text-red-700'}`}>
              {incomeMultiple.toFixed(1)}x annual
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicationDetailModal({
  application,
  scoringConfig,
  onClose,
  onVerifyDocument,
  onTriggerAI,
  onDecision,
  onSendEmail,
  onSendApprovalEmail,
}: {
  application: ApplicationWithDetails;
  scoringConfig: ScoringConfiguration | null;
  onClose: () => void;
  onVerifyDocument: (docId: string, status: 'verified' | 'rejected', notes?: string) => void;
  onTriggerAI: (app: ApplicationWithDetails) => void;
  onDecision: (
    applicationId: string,
    decision: 'approved' | 'rejected',
    isOverride: boolean,
    overrideReason?: string,
    approvalDetails?: { amount?: number; term?: number; rate?: number; conditions?: string },
    rejectionReason?: string
  ) => void;
  onSendEmail: (application: ApplicationWithDetails) => Promise<void>;
  onSendApprovalEmail: (application: ApplicationWithDetails) => Promise<void>;
}) {
  const [showDecisionModal, setShowDecisionModal] = useState<'approve' | 'reject' | null>(null);
  const [scoring, setScoring] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sendingApprovalEmail, setSendingApprovalEmail] = useState(false);
  const [approvalEmailSent, setApprovalEmailSent] = useState(false);

  const documents = application.documents || [];
  const allDocsVerified = checkDocumentsVerified(documents);
  const hasScoring = !!application.ai_scoring;
  const canScore = !hasScoring && ['submitted', 'under_review', 'verified', 'scored'].includes(application.status);
  const canDecide = ['submitted', 'under_review', 'verified', 'scored'].includes(application.status);

  async function handleRunScoring() {
    setScoring(true);
    await onTriggerAI(application);
    setScoring(false);
  }

  async function handleSendEmail() {
    setSendingEmail(true);
    await onSendEmail(application);
    setSendingEmail(false);
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 4000);
  }

  async function handleSendApprovalEmailClick() {
    setSendingApprovalEmail(true);
    await onSendApprovalEmail(application);
    setSendingApprovalEmail(false);
    setApprovalEmailSent(true);
    setTimeout(() => setApprovalEmailSent(false), 4000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{application.application_number}</h2>
            <p className="text-sm text-gray-700 font-medium">{application.borrower?.user?.first_name} {application.borrower?.user?.last_name}</p>
            {application.borrower?.user?.email && (
              <p className="text-sm text-gray-500">{application.borrower.user.email}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={application.status} />
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <BorrowerInfoPanel application={application} />

          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Loan Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Amount Requested</p>
                <p className="text-lg font-bold text-gray-900">PHP {application.loan_amount_php.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Loan Term</p>
                <p className="text-lg font-bold text-gray-900">{application.loan_term_months} months</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Purpose</p>
                <p className="text-sm font-semibold text-gray-900">{application.loan_purpose}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Collateral</p>
                <p className="text-sm font-semibold text-gray-900">{application.collateral_type || 'None (Unsecured)'}</p>
              </div>
              {application.collateral_estimated_value_php && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Collateral Value</p>
                  <p className="text-sm font-semibold text-gray-900">PHP {application.collateral_estimated_value_php.toLocaleString()}</p>
                </div>
              )}
              {application.collateral_estimated_value_php && application.collateral_estimated_value_php > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">LTV Ratio</p>
                  <p className="text-sm font-semibold text-gray-900">{((application.loan_amount_php / application.collateral_estimated_value_php) * 100).toFixed(1)}%</p>
                </div>
              )}
            </div>
          </div>

          <DocumentVerificationSection documents={documents} onVerify={onVerifyDocument} />

          {hasScoring && application.ai_scoring && scoringConfig && (
            <ScoreBreakdownSection scoring={application.ai_scoring} config={scoringConfig} />
          )}

          {canScore && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-6 h-6 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Credit Scoring</h3>
              </div>
              {!allDocsVerified && (
                <div className="flex items-center gap-3 text-yellow-700 bg-yellow-50 p-3 rounded-lg mb-4">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">Some documents are unverified. Scoring will proceed but accuracy may be lower.</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{allDocsVerified ? 'Documents verified. Ready to run AI-assisted credit scoring.' : 'Run scoring with available information.'}</p>
                <button onClick={handleRunScoring} disabled={scoring} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  {scoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  {scoring ? 'Scoring...' : 'Run Scoring'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap gap-3 justify-end">
          {application.status === 'approved' && (
            <button
              onClick={handleSendApprovalEmailClick}
              disabled={sendingApprovalEmail}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-colors disabled:opacity-50 ${
                approvalEmailSent
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {sendingApprovalEmail ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : approvalEmailSent ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {sendingApprovalEmail ? 'Sending...' : approvalEmailSent ? 'Email Sent' : 'Send Approval Email'}
            </button>
          )}
          {application.status === 'rejected' && (
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-colors disabled:opacity-50 ${
                emailSent
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              {sendingEmail ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : emailSent ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {sendingEmail ? 'Sending...' : emailSent ? 'Email Sent' : 'Send Rejection Email'}
            </button>
          )}
          {canDecide && (
            <>
              <button onClick={() => setShowDecisionModal('reject')} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium">
                Reject
              </button>
              <button onClick={() => setShowDecisionModal('approve')} className="btn-primary">
                Approve
              </button>
            </>
          )}
        </div>
      </div>

      {showDecisionModal && (
        <DecisionModal
          type={showDecisionModal}
          application={application}
          onClose={() => setShowDecisionModal(null)}
          onConfirm={onDecision}
        />
      )}
    </div>
  );
}

function DocumentVerificationSection({ documents, onVerify }: { documents: Document[]; onVerify: (docId: string, status: 'verified' | 'rejected', notes?: string) => void }) {
  const [viewError, setViewError] = useState<string | null>(null);

  async function handleViewDocument(doc: Document) {
    setViewError(null);
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 300);
    if (error || !data?.signedUrl) {
      setViewError(`Unable to load "${doc.file_name}". The file may not have been uploaded successfully.`);
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-gray-900 mb-3">Document Verification</h3>
      {viewError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{viewError}</p>
          <button onClick={() => setViewError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileCheck className={`w-5 h-5 ${doc.verification_status === 'verified' ? 'text-green-500' : doc.verification_status === 'rejected' ? 'text-red-500' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{doc.document_type.replace('_', ' ')} {doc.file_size_bytes ? `- ${(doc.file_size_bytes / 1024).toFixed(0)} KB` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewDocument(doc)}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 transition-colors"
                  title="View document"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View
                </button>
                {doc.verification_status === 'pending' ? (
                  <>
                    <button onClick={() => onVerify(doc.id, 'rejected')} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      Reject
                    </button>
                    <button onClick={() => onVerify(doc.id, 'verified')} className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                      Verify
                    </button>
                  </>
                ) : (
                  <StatusBadge status={doc.verification_status} />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No documents uploaded</p>
      )}
    </div>
  );
}

function ScoreBreakdownSection({ scoring, config }: { scoring: AIScoringResult; config: ScoringConfiguration }) {
  const [expanded, setExpanded] = useState(false);
  const factors = scoring.factors_explanation as FactorExplanation[] | null;

  return (
    <div className="bg-primary-50 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">AI Credit Score Analysis</h3>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
          {expanded ? 'Hide' : 'Show'} Details
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-primary-600">{scoring.overall_score}</p>
          <p className="text-xs text-gray-500">Overall Score</p>
          <p className="text-xs text-gray-400">({config.min_score}-{config.max_score})</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <ScoreBadge scoring={scoring} large />
          <p className="text-xs text-gray-500 mt-2">Risk Level</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <p className={`text-xl font-bold capitalize ${scoring.recommendation === 'approve' ? 'text-green-600' : scoring.recommendation === 'reject' ? 'text-red-600' : 'text-yellow-600'}`}>
            {scoring.recommendation}
          </p>
          <p className="text-xs text-gray-500">AI Recommendation</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <p className="text-xl font-bold text-gray-900">{scoring.documents_verified ? 'Yes' : 'No'}</p>
          <p className="text-xs text-gray-500">Docs Verified</p>
        </div>
      </div>

      {expanded && factors && (
        <div className="space-y-4 mt-6 pt-6 border-t border-primary-200">
          <h4 className="font-medium text-gray-900">Score Breakdown by Factor</h4>
          {factors.map((factor, index) => (
            <FactorBreakdown key={index} factor={factor} />
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-white rounded-lg">
        <p className="text-xs text-gray-500 mb-1">AI Explanation (Internal)</p>
        <p className="text-sm text-gray-700">{scoring.explanation}</p>
      </div>
    </div>
  );
}

function FactorBreakdown({ factor }: { factor: FactorExplanation & { risk_signals?: string[]; positive_signals?: string[] } }) {
  const [showDetails, setShowDetails] = useState(false);
  const riskSignals = factor.risk_signals || [];
  const positiveSignals = factor.positive_signals || [];

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${factor.score >= 70 ? 'bg-green-100' : factor.score >= 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
            <span className={`text-lg font-bold ${factor.score >= 70 ? 'text-green-700' : factor.score >= 50 ? 'text-yellow-700' : 'text-red-700'}`}>{factor.score}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{factor.factor}</p>
            <p className="text-xs text-gray-500">{factor.description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">Weight: {(factor.weight * 100).toFixed(0)}%</p>
          <p className="text-xs text-gray-500">Contribution: {factor.weighted_score.toFixed(1)}</p>
        </div>
      </div>

      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${factor.score >= 70 ? 'bg-green-500' : factor.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${factor.score}%` }}></div>
      </div>

      {(positiveSignals.length > 0 || riskSignals.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {positiveSignals.map((s, i) => (
            <span key={`p${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-medium rounded-full">
              <CheckCircle className="w-3 h-3" />{s}
            </span>
          ))}
          {riskSignals.map((s, i) => (
            <span key={`r${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-medium rounded-full">
              <AlertTriangle className="w-3 h-3" />{s}
            </span>
          ))}
        </div>
      )}

      <button onClick={() => setShowDetails(!showDetails)} className="text-xs text-primary-600 hover:text-primary-700">
        {showDetails ? 'Hide calculation details' : 'Show calculation details'}
      </button>

      {showDetails && factor.details && (
        <ul className="mt-2 space-y-1 bg-gray-50 rounded-lg p-3">
          {factor.details.map((detail, i) => (
            <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">-</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DecisionModal({
  type,
  application,
  onClose,
  onConfirm,
}: {
  type: 'approve' | 'reject';
  application: ApplicationWithDetails;
  onClose: () => void;
  onConfirm: (
    applicationId: string,
    decision: 'approved' | 'rejected',
    isOverride: boolean,
    overrideReason?: string,
    approvalDetails?: { amount?: number; term?: number; rate?: number; conditions?: string },
    rejectionReason?: string
  ) => void;
}) {
  const aiRecommendation = application.ai_scoring?.recommendation;
  const isOverride = (type === 'approve' && aiRecommendation === 'reject') || (type === 'reject' && aiRecommendation === 'approve');

  const [overrideReason, setOverrideReason] = useState('');
  const [approvedAmount, setApprovedAmount] = useState(application.loan_amount_php.toString());
  const [approvedTerm, setApprovedTerm] = useState(application.loan_term_months.toString());
  const [interestRate, setInterestRate] = useState('');
  const [conditions, setConditions] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  function handleConfirm() {
    if (isOverride && !overrideReason) {
      alert('Override reason is required');
      return;
    }

    if (type === 'approve') {
      onConfirm(
        application.id,
        'approved',
        isOverride,
        isOverride ? overrideReason : undefined,
        {
          amount: parseFloat(approvedAmount),
          term: parseInt(approvedTerm),
          rate: interestRate ? parseFloat(interestRate) : undefined,
          conditions: conditions || undefined,
        }
      );
    } else {
      onConfirm(application.id, 'rejected', isOverride, isOverride ? overrideReason : undefined, undefined, rejectionReason);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {type === 'approve' ? 'Approve Application' : 'Reject Application'}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          {isOverride && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">AI Override Required</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    You are overriding the AI recommendation ({aiRecommendation}). This will be logged for audit purposes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isOverride && (
            <div>
              <label className="label">Override Reason (Required)</label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="input-field min-h-[80px]"
                placeholder="Explain why you are overriding the AI recommendation..."
                required
              />
            </div>
          )}

          {type === 'approve' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Approved Amount (PHP)</label>
                  <input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Term (Months)</label>
                  <input
                    type="number"
                    value={approvedTerm}
                    onChange={(e) => setApprovedTerm(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="label">Interest Rate (%)</label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="input-field"
                  placeholder="e.g., 12.5"
                  step="0.1"
                />
              </div>
              <div>
                <label className="label">Conditions (Optional)</label>
                <textarea
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  className="input-field min-h-[60px]"
                  placeholder="Any special conditions..."
                />
              </div>
            </>
          )}

          {type === 'reject' && (
            <div>
              <label className="label">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="input-field min-h-[80px]"
                placeholder="Reason for rejection..."
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button
            onClick={handleConfirm}
            className={type === 'approve' ? 'btn-primary' : 'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium'}
          >
            Confirm {type === 'approve' ? 'Approval' : 'Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ scoring, large = false }: { scoring?: AIScoringResult | null; large?: boolean }) {
  if (!scoring) {
    return <span className="text-sm text-gray-400">Not scored</span>;
  }

  const styles: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  };

  return (
    <div className={`flex items-center gap-2 ${large ? 'flex-col' : ''}`}>
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${styles[scoring.risk_level]}`}>
        {scoring.risk_level}
      </span>
      <span className={`${large ? 'text-2xl font-bold' : 'text-sm'} text-gray-700`}>{scoring.overall_score}</span>
    </div>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    verified: 'bg-cyan-100 text-cyan-700',
    scored: 'bg-sky-100 text-sky-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    disbursed: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}
