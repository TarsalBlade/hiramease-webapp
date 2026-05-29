import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { calculateLoan, formatPHP } from '../../../utils/loanCalculator';
import type { BorrowerProfile, TenantLendingSettings } from '../../../types/database';
import { FileUpload as FileUploadComponent } from '../../../components/dashboard/FileUpload';
import { Brain, Info, CheckCircle, Calculator, Percent, AlertTriangle as AlertTriangleIcon } from 'lucide-react';

interface NewApplicationModalProps {
  borrowerProfile: BorrowerProfile;
  onClose: () => void;
  onComplete: () => void;
}

export function NewApplicationModal({ borrowerProfile, onClose, onComplete }: NewApplicationModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoringComplete, setScoringComplete] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ score: number; risk: string; recommendation: string } | null>(null);
  const [lendingSettings, setLendingSettings] = useState<TenantLendingSettings | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    employment_status: borrowerProfile.employment_status || '',
    employer_name: borrowerProfile.employer_name || '',
    monthly_income_php: borrowerProfile.monthly_income_php?.toString() || '',
    years_employed: borrowerProfile.years_employed?.toString() || '',
    address: borrowerProfile.address || '',
    city: borrowerProfile.city || '',
    province: borrowerProfile.province || '',
  });
  const [form, setForm] = useState({
    loan_amount_php: '',
    loan_purpose: '',
    loan_term_months: '12',
    collateral_type: '',
    collateral_description: '',
    collateral_estimated_value_php: '',
  });
  const [files, setFiles] = useState<{ type: string; file: File }[]>([]);

  const profileComplete = profileForm.employment_status && profileForm.monthly_income_php && profileForm.address && profileForm.city && profileForm.province;

  async function saveProfileAndContinue() {
    if (!profileComplete) return;
    setSavingProfile(true);
    await supabase
      .from('borrower_profiles')
      .update({
        employment_status: profileForm.employment_status || null,
        employer_name: profileForm.employer_name || null,
        monthly_income_php: profileForm.monthly_income_php ? parseFloat(profileForm.monthly_income_php) : null,
        years_employed: profileForm.years_employed ? parseInt(profileForm.years_employed) : null,
        address: profileForm.address || null,
        city: profileForm.city || null,
        province: profileForm.province || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', borrowerProfile.id);
    borrowerProfile.employment_status = profileForm.employment_status || null;
    borrowerProfile.monthly_income_php = profileForm.monthly_income_php ? parseFloat(profileForm.monthly_income_php) : null;
    borrowerProfile.years_employed = profileForm.years_employed ? parseInt(profileForm.years_employed) : null;
    borrowerProfile.address = profileForm.address || null;
    borrowerProfile.city = profileForm.city || null;
    borrowerProfile.province = profileForm.province || null;
    borrowerProfile.employer_name = profileForm.employer_name || null;
    setSavingProfile(false);
    setStep(2);
  }

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
      straight_line: 'Straight Line',
      compound: 'Compound Interest',
    };
    return map[type] || type;
  };

  async function handleProceedToScoring() {
    setScoring(true);
    setScoringComplete(false);
    setStep(5);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const income = borrowerProfile.monthly_income_php || 0;
    const loanAmt = parseFloat(form.loan_amount_php);
    const term = parseInt(form.loan_term_months);

    const dti = income > 0 ? (loanAmt / term) / income : 1;
    const incomeScore = Math.min(100, (income / 50000) * 100);
    const dtiScore = Math.max(0, 100 - (dti * 100));
    const termScore = term <= 12 ? 90 : term <= 24 ? 75 : 60;
    const collateralScore = form.collateral_type ? 85 : 50;

    const weightedSum = (incomeScore * 0.3) + (dtiScore * 0.3) + (termScore * 0.2) + (collateralScore * 0.2);
    const overall = Math.round(300 + (weightedSum / 100) * 550);
    const risk = overall >= 720 ? 'low' : overall >= 620 ? 'medium' : 'high';
    const recommendation = overall >= 720 ? 'Likely to be approved' : overall >= 620 ? 'Under review - additional documents may help' : 'May require additional information or collateral';

    setScoreResult({ score: overall, risk, recommendation });
    setScoringComplete(true);
    setScoring(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

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

    if (error || !application) {
      setSubmitError(error?.message || 'Failed to submit application. Please try again.');
      setSubmitting(false);
      return;
    }

    // Upload documents
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
          tenant_id: borrowerProfile.tenant_id,
          application_id: application.id,
          loan_amount: parseFloat(form.loan_amount_php),
          loan_purpose: form.loan_purpose,
          action: 'new_application',
        }),
      });
    } catch {}

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
            <div className="flex items-center gap-3 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > s ? <CheckCircle className="w-3.5 h-3.5" /> : s}
                  </div>
                  <span className={`text-xs hidden sm:inline ${step >= s ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                    {s === 1 ? 'Profile' : s === 2 ? 'Loan' : s === 3 ? 'Review' : s === 4 ? 'Docs' : 'Score'}
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
            <ProfileStep profileForm={profileForm} setProfileForm={setProfileForm} />
          )}
          {step === 2 && (
            <LoanStep form={form} setForm={setForm} lendingSettings={lendingSettings} loanAmount={loanAmount} amountInRange={amountInRange} termOptions={termOptions} formatInterestLabel={formatInterestLabel} />
          )}
          {step === 3 && computation && lendingSettings && (
            <ReviewStep computation={computation} lendingSettings={lendingSettings} form={form} formatInterestLabel={formatInterestLabel} />
          )}
          {step === 4 && (
            <DocumentStep files={files} addFile={addFile} form={form} />
          )}
          {step === 5 && (
            <ScoringStep scoring={scoring} scoringComplete={scoringComplete} scoreResult={scoreResult} borrowerProfile={borrowerProfile} form={form} />
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
          {step > 1 && step < 5 ? (
            <button onClick={() => setStep(step - 1)} className="btn-outline">Back</button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <button onClick={saveProfileAndContinue} disabled={!profileComplete || savingProfile} className="btn-primary disabled:opacity-50">
              {savingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
            </button>
          )}
          {step === 2 && (
            <button onClick={() => setStep(3)} disabled={!canProceedStep1} className="btn-primary disabled:opacity-50">
              View Computation
            </button>
          )}
          {step === 3 && (
            <button onClick={() => setStep(4)} className="btn-primary">
              Continue to Upload
            </button>
          )}
          {step === 4 && (
            <button onClick={handleProceedToScoring} disabled={files.length === 0} className="btn-primary disabled:opacity-50 flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Analyze Application
            </button>
          )}
          {step === 5 && scoringComplete && (
            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
              {submitError && (
                <p className="text-sm text-red-600 text-right">{submitError}</p>
              )}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileStep({ profileForm, setProfileForm }: any) {
  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">Please fill in your employment and address details. This information is required for your loan application.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Employment Status <span className="text-red-500">*</span></label>
          <select value={profileForm.employment_status} onChange={(e) => setProfileForm({ ...profileForm, employment_status: e.target.value })} className="input-field">
            <option value="">Select</option>
            <option value="employed">Employed</option>
            <option value="self_employed">Self Employed</option>
            <option value="unemployed">Unemployed</option>
            <option value="retired">Retired</option>
          </select>
        </div>
        <div>
          <label className="label">Employer Name</label>
          <input type="text" value={profileForm.employer_name} onChange={(e) => setProfileForm({ ...profileForm, employer_name: e.target.value })} className="input-field" placeholder="Company name" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Monthly Income (PHP) <span className="text-red-500">*</span></label>
          <input type="number" value={profileForm.monthly_income_php} onChange={(e) => setProfileForm({ ...profileForm, monthly_income_php: e.target.value })} className="input-field" placeholder="Monthly income" />
        </div>
        <div>
          <label className="label">Years Employed</label>
          <input type="number" value={profileForm.years_employed} onChange={(e) => setProfileForm({ ...profileForm, years_employed: e.target.value })} className="input-field" placeholder="e.g., 3" min="0" />
        </div>
      </div>

      <div>
        <label className="label">Address <span className="text-red-500">*</span></label>
        <input type="text" value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} className="input-field" placeholder="Street address" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">City <span className="text-red-500">*</span></label>
          <input type="text" value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} className="input-field" placeholder="City" />
        </div>
        <div>
          <label className="label">Province <span className="text-red-500">*</span></label>
          <input type="text" value={profileForm.province} onChange={(e) => setProfileForm({ ...profileForm, province: e.target.value })} className="input-field" placeholder="Province" />
        </div>
      </div>
    </div>
  );
}

function LoanStep({ form, setForm, lendingSettings, loanAmount, amountInRange, termOptions, formatInterestLabel }: any) {
  return (
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
            {termOptions.map((t: number) => (
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
            <textarea value={form.collateral_description} onChange={(e) => setForm({ ...form, collateral_description: e.target.value })} className="input-field min-h-[80px]" placeholder="Describe your collateral" />
          </div>
          <div>
            <label className="label">Estimated Collateral Value (PHP)</label>
            <input type="number" value={form.collateral_estimated_value_php} onChange={(e) => setForm({ ...form, collateral_estimated_value_php: e.target.value })} className="input-field" />
          </div>
        </>
      )}
    </div>
  );
}

function ReviewStep({ computation, lendingSettings, form, formatInterestLabel }: any) {
  return (
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
            This is an estimate based on current rates. Final terms may vary based on credit assessment.
          </p>
        </div>
      </div>
    </div>
  );
}

function DocumentStep({ files, addFile, form }: any) {
  return (
    <div className="space-y-5">
      <p className="text-gray-600">Upload required documents to support your application.</p>

      <FileUploadComponent label="Valid Government ID" description="Driver's License, Passport, or other valid ID" type="valid_id" files={files} onUpload={addFile} />
      <FileUploadComponent label="Proof of Income" description="Payslip, ITR, or Certificate of Employment" type="proof_of_income" files={files} onUpload={addFile} />

      {form.collateral_type && (
        <FileUploadComponent label="Collateral Documents" description="Title, OR/CR, or ownership proof" type="collateral_proof" files={files} onUpload={addFile} />
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-1">Document Requirements</p>
            <p>All documents must be clear and readable. Accepted formats: PDF, JPG, PNG (max 10MB each).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoringStep({ scoring, scoringComplete, scoreResult, borrowerProfile, form }: any) {
  return (
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
        </div>
      )}
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
