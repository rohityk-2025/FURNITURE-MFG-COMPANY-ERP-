import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { LoadingPage, PageHeader } from '../../components/ui'
import { useToast } from '../../components/ui'

export default function CompanyDetails() {
  const toast = useToast()
  const [form, setForm] = useState({
    company_name: '', tagline: '', gst_number: '', pan_number: '',
    address: '', city: '', state: '', pincode: '', phone: '', email: '', website: '',
    upi_id: '', upi_phone: '', bank_name: '', bank_account: '', bank_ifsc: '',
    invoice_prefix: 'WC', invoice_terms: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/company').then(r => setForm(f => ({ ...f, ...r.data }))).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.put('/company', form)
      toast('Company details saved')
    } catch { toast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const f = (key) => ({ value: form[key] || '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) })

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Company Details" subtitle="Used in invoices and business documents" />

      <form onSubmit={handleSave} className="space-y-5">
        {/* Company Info */}
        <div className="card p-5 space-y-4">
          <h3 className="section-title flex items-center gap-2">
            <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center text-xs font-bold">1</span>
            Company Information
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Company Name *</label>
              <input className="input text-lg font-semibold" {...f('company_name')} required placeholder="WoodCraft Furniture" />
            </div>
            <div>
              <label className="label">Tagline</label>
              <input className="input" {...f('tagline')} placeholder="Quality Furniture Manufacturers" />
            </div>
            <div>
              <label className="label">GST Number</label>
              <input className="input font-mono" {...f('gst_number')} placeholder="27AABCU9603R1ZX" />
            </div>
            <div>
              <label className="label">PAN Number</label>
              <input className="input font-mono" {...f('pan_number')} placeholder="AABCU9603R" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" {...f('phone')} placeholder="9876543210" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" {...f('email')} placeholder="info@company.com" />
            </div>
            <div>
              <label className="label">Website</label>
              <input className="input" {...f('website')} placeholder="www.company.com" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <textarea className="input resize-none" rows={2} {...f('address')} placeholder="Shop No., Street, Area" />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" {...f('city')} placeholder="Pune" />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" {...f('state')} placeholder="Maharashtra" />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input className="input" {...f('pincode')} placeholder="411001" />
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="card p-5 space-y-4">
          <h3 className="section-title flex items-center gap-2">
            <span className="w-6 h-6 bg-secondary-100 text-secondary-600 rounded-lg flex items-center justify-center text-xs font-bold">2</span>
            Payment Details
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">UPI ID</label>
              <input className="input" {...f('upi_id')} placeholder="business@upi" />
            </div>
            <div>
              <label className="label">UPI Phone</label>
              <input className="input" {...f('upi_phone')} placeholder="9876543210" />
            </div>
            <div>
              <label className="label">Bank Name</label>
              <input className="input" {...f('bank_name')} placeholder="HDFC Bank" />
            </div>
            <div>
              <label className="label">Account Number</label>
              <input className="input font-mono" {...f('bank_account')} placeholder="XXXX XXXX XXXX" />
            </div>
            <div>
              <label className="label">IFSC Code</label>
              <input className="input font-mono" {...f('bank_ifsc')} placeholder="HDFC0001234" />
            </div>
          </div>
        </div>

        {/* Invoice Settings */}
        <div className="card p-5 space-y-4">
          <h3 className="section-title flex items-center gap-2">
            <span className="w-6 h-6 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xs font-bold">3</span>
            Invoice Settings
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Invoice Prefix</label>
              <input className="input font-mono" {...f('invoice_prefix')} placeholder="WC" maxLength={10} />
              <p className="text-xs text-surface-400 mt-1">e.g. WC → WC-2024-001</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Invoice Terms & Conditions</label>
              <textarea className="input resize-none" rows={3} {...f('invoice_terms')}
                placeholder="Payment due within 30 days. Goods once sold are not returnable..." />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="card p-5 border-2 border-dashed border-surface-200">
          <h3 className="section-title mb-4">Invoice Preview</h3>
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-xl font-bold text-surface-900">{form.company_name || 'Company Name'}</div>
                {form.tagline && <div className="text-sm text-surface-500">{form.tagline}</div>}
                <div className="text-sm text-surface-600 mt-2 space-y-0.5">
                  {form.address && <div>{form.address}</div>}
                  {(form.city || form.state) && <div>{[form.city, form.state, form.pincode].filter(Boolean).join(', ')}</div>}
                  {form.phone && <div>📞 {form.phone}</div>}
                  {form.gst_number && <div>GST: {form.gst_number}</div>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-surface-300">INVOICE</div>
                <div className="text-sm font-mono text-surface-500 mt-1">{form.invoice_prefix || 'WC'}-2024-001</div>
              </div>
            </div>
            {(form.upi_id || form.bank_name) && (
              <div className="border-t border-surface-100 pt-4 mt-4">
                <div className="text-xs font-bold text-surface-400 uppercase tracking-wide mb-2">Payment Details</div>
                <div className="text-sm text-surface-600 space-y-1">
                  {form.upi_id && <div>UPI: {form.upi_id} {form.upi_phone && `| 📱 ${form.upi_phone}`}</div>}
                  {form.bank_name && <div>Bank: {form.bank_name} | A/C: {form.bank_account} | IFSC: {form.bank_ifsc}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? 'Saving...' : 'Save Company Details'}
          </button>
        </div>
      </form>
    </div>
  )
}
