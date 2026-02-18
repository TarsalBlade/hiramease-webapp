import { useState, useEffect } from 'react';
import { Building2, Save, Loader2, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Tenant {
  id: string;
  company_name: string;
  registration_type: string;
  registration_number: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  logo_url: string | null;
  description: string;
}

interface CompanyProfileProps {
  tenantId: string;
}

export function CompanyProfile({ tenantId }: CompanyProfileProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    description: '',
  });

  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  async function fetchTenant() {
    setLoading(true);
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .maybeSingle();

    if (data) {
      const t = data as Tenant;
      setTenant(t);
      setForm({
        company_name: t.company_name || '',
        email: t.email || '',
        phone: t.phone || '',
        address: t.address || '',
        city: t.city || '',
        province: t.province || '',
        postal_code: t.postal_code || '',
        description: t.description || '',
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!tenantId) return;
    setSaving(true);

    const { error } = await supabase
      .from('tenants')
      .update({
        company_name: form.company_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        province: form.province,
        postal_code: form.postal_code,
        description: form.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) {
      alert('Failed to update company profile.');
    } else {
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await fetchTenant();
    }
    setSaving(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB.');
      return;
    }

    setUploading(true);

    const filePath = `logos/${tenantId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert('Failed to upload logo.');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    if (urlData?.publicUrl) {
      await supabase
        .from('tenants')
        .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', tenantId);
      await fetchTenant();
    }

    setUploading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Save className="w-5 h-5 text-green-600" />
          <p className="text-green-700 font-medium">Company profile updated successfully.</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-6 mb-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-xl bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.company_name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl cursor-pointer transition-opacity">
              {uploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
            </label>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{tenant.company_name}</h2>
                <p className="text-sm text-gray-500">{tenant.registration_type} - {tenant.registration_number}</p>
              </div>
              {!editing && (
                <button onClick={() => setEditing(true)} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Edit Profile
                </button>
              )}
            </div>
            {!editing && tenant.description && (
              <p className="text-sm text-gray-600 mt-2">{tenant.description}</p>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Company Name</label>
                <input type="text" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Postal Code</label>
                <input type="text" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="input-field" />
              </div>
            </div>

            <div>
              <label className="label">Address</label>
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
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

            <div>
              <label className="label">Company Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field min-h-[100px]"
                placeholder="Describe your company to borrowers..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button onClick={() => { setEditing(false); fetchTenant(); }} className="btn-outline">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <InfoItem label="Email" value={tenant.email || 'Not set'} />
            <InfoItem label="Phone" value={tenant.phone || 'Not set'} />
            <InfoItem label="Address" value={tenant.address || 'Not set'} />
            <InfoItem label="City" value={tenant.city || 'Not set'} />
            <InfoItem label="Province" value={tenant.province || 'Not set'} />
            <InfoItem label="Postal Code" value={tenant.postal_code || 'Not set'} />
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
