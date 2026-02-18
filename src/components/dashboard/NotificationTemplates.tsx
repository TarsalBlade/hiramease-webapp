import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Bell, Save, Loader2, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NotificationTemplate {
  id: string;
  tenant_id: string;
  template_type: string;
  subject: string;
  email_body: string;
  sms_body: string;
  in_app_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationTemplatesProps {
  tenantId: string;
}

export function NotificationTemplates({ tenantId }: NotificationTemplatesProps) {
  const [templates, setTemplates] = useState<Record<string, NotificationTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'loan_approval' | 'loan_rejection' | 'payment_reminder' | 'payment_overdue'>('loan_approval');

  useEffect(() => {
    if (tenantId) {
      fetchTemplates();
    }
  }, [tenantId]);

  async function fetchTemplates() {
    setLoading(true);

    const templateTypes = ['loan_approval', 'loan_rejection', 'payment_reminder', 'payment_overdue'];
    const results = await Promise.all(
      templateTypes.map(type =>
        supabase.rpc('get_or_create_notification_template', {
          p_tenant_id: tenantId,
          p_template_type: type,
        })
      )
    );

    const newTemplates: Record<string, NotificationTemplate> = {};
    results.forEach((result, i) => {
      if (result.data) {
        newTemplates[templateTypes[i]] = result.data;
      }
    });

    setTemplates(newTemplates);
    setLoading(false);
  }

  async function handleSave(templateType: string) {
    const template = templates[templateType];
    if (!template) return;

    setSaving(true);

    const { error } = await supabase
      .from('notification_templates')
      .update({
        subject: template.subject,
        email_body: template.email_body,
        sms_body: template.sms_body,
        in_app_message: template.in_app_message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', template.id);

    if (error) {
      alert('Failed to save template. Please try again.');
    } else {
      alert('Template saved successfully!');
    }

    setSaving(false);
  }

  function updateTemplate(templateType: string, field: keyof NotificationTemplate, value: string) {
    setTemplates({
      ...templates,
      [templateType]: {
        ...templates[templateType],
        [field]: value,
      },
    });
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
        <p className="text-gray-500 mt-4">Loading templates...</p>
      </div>
    );
  }

  const currentTemplate = templates[activeTab];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Notification Templates</p>
            <p>Customize the messages sent to borrowers. Use placeholders like {'{{loan_amount}}'}, {'{{loan_term}}'}, {'{{monthly_payment}}'}, {'{{rejection_reason}}'}, {'{{due_date}}'}, {'{{amount_due}}'}, and {'{{days_overdue}}'} which will be automatically replaced with actual values.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {([
          { key: 'loan_approval', label: 'Loan Approval' },
          { key: 'loan_rejection', label: 'Loan Rejection' },
          { key: 'payment_reminder', label: 'Payment Reminder' },
          { key: 'payment_overdue', label: 'Payment Overdue' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {currentTemplate && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Email Notification</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={currentTemplate.subject}
                  onChange={(e) => updateTemplate(activeTab, 'subject', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                <textarea
                  value={currentTemplate.email_body}
                  onChange={(e) => updateTemplate(activeTab, 'email_body', e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Email message body"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">SMS Notification</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMS Message
                <span className="text-xs text-gray-500 ml-2">(Keep it short - max 160 characters recommended)</span>
              </label>
              <textarea
                value={currentTemplate.sms_body}
                onChange={(e) => updateTemplate(activeTab, 'sms_body', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SMS message"
              />
              <p className="text-xs text-gray-500 mt-1">{currentTemplate.sms_body.length} characters</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">In-App Notification</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">In-App Message</label>
              <textarea
                value={currentTemplate.in_app_message}
                onChange={(e) => updateTemplate(activeTab, 'in_app_message', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="In-app notification message"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleSave(activeTab)}
              disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
