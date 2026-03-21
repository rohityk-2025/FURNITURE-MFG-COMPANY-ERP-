import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useToast } from '../../components/ui'

const Section = ({ title, children }) => (
  <div className="card p-5 space-y-4">
    <h3 className="text-sm font-bold text-surface-800 dark:text-gray-200 border-b border-surface-100 dark:border-gray-800 pb-2">{title}</h3>
    {children}
  </div>
)
const F = ({ label, children }) => <div><label className="label">{label}</label>{children}</div>

export default function Company() {
  const toast = useToast()
  const [data, setData]   = useState({})
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const [qrPreview, setQrPreview]     = useState(null)
  const [logoFile, setLogoFile]       = useState(null)
  const [qrFile, setQrFile]           = useState(null)

  useEffect(() => {
    api.get('/company').then(r => {
      setData(r.data || {})
      if (r.data?.logo_url) setLogoPreview(r.data.logo_url)
      if (r.data?.qr_url)   setQrPreview(r.data.qr_url)
    }).catch(() => {})
  }, [])

  const handleLogoChange = (e) => {
    const f = e.target.files[0]; if (!f) return
    setLogoFile(f); setLogoPreview(URL.createObjectURL(f))
  }
  const handleQrChange = (e) => {
    const f = e.target.files[0]; if (!f) return
    setQrFile(f); setQrPreview(URL.createObjectURL(f))
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      let logo_url = data.logo_url || '', qr_url = data.qr_url || ''
      if (logoFile) {
        const fd = new FormData(); fd.append('file', logoFile); fd.append('type', 'logo')
        const r = await api.post('/company/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        logo_url = r.data.url
      }
      if (qrFile) {
        const fd = new FormData(); fd.append('file', qrFile); fd.append('type', 'qr')
        const r = await api.post('/company/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        qr_url = r.data.url
      }
      await api.put('/company', { ...data, logo_url, qr_url })
      const updated = { ...data, logo_url, qr_url }
      localStorage.setItem('erp_company', JSON.stringify(updated))
      setData(updated); setLogoFile(null); setQrFile(null)
      toast('Company details saved!')
    } catch(err) { toast(err.response?.data?.error || 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const upd = k => e => setData(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div>
        <h1 className="page-title">Company Settings</h1>
        <p className="text-xs text-surface-400 mt-0.5">Details appear on all invoices</p>
      </div>
      <form onSubmit={handleSave} className="space-y-4">

        <Section title="Branding">
          <div className="grid grid-cols-2 gap-6">
            {[['Company Logo','logo',logoPreview,handleLogoChange,()=>{setLogoPreview(null);setLogoFile(null);setData(p=>({...p,logo_url:''}))}, 'PNG/JPG logo file'],
              ['UPI QR Code','qr',qrPreview,handleQrChange,()=>{setQrPreview(null);setQrFile(null);setData(p=>({...p,qr_url:''}))}, 'UPI payment QR']
            ].map(([label,key,preview,onChange,onRemove,hint]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-surface-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-surface-50 dark:bg-gray-800 flex-shrink-0">
                    {preview
                      ? <img src={preview} alt={key} className="w-full h-full object-contain" />
                      : <svg className="w-6 h-6 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    }
                  </div>
                  <div className="space-y-1">
                    <label className="btn-secondary !text-xs cursor-pointer">{preview?'Change':'Upload'}
                      <input type="file" className="hidden" accept="image/*" onChange={onChange} />
                    </label>
                    <p className="text-xs text-surface-400">{hint}</p>
                    {preview && <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:underline block">Remove</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Company Information">
          <div className="grid sm:grid-cols-2 gap-3">
            <F label="Company Name *"><input className="input" value={data.company_name||''} onChange={upd('company_name')} required placeholder="WoodCraft Furniture" /></F>
            <F label="Tagline"><input className="input" value={data.tagline||''} onChange={upd('tagline')} placeholder="Quality Furniture Manufacturers" /></F>
            <F label="GST Number"><input className="input" value={data.gst_number||''} onChange={upd('gst_number')} placeholder="24GSTINKETAN1ZR" /></F>
            <F label="PAN Number"><input className="input" value={data.pan_number||''} onChange={upd('pan_number')} placeholder="AABCU9603R" /></F>
            <F label="Phone"><input className="input" value={data.phone||''} onChange={upd('phone')} placeholder="0265-1234567, 9898989898" /></F>
            <F label="Email"><input className="input" type="email" value={data.email||''} onChange={upd('email')} placeholder="info@company.com" /></F>
            <F label="Website"><input className="input" value={data.website||''} onChange={upd('website')} placeholder="www.company.com" /></F>
            <F label="Invoice Prefix"><input className="input" value={data.invoice_prefix||''} onChange={upd('invoice_prefix')} placeholder="WC" maxLength={5} /></F>
          </div>
          <F label="Address"><textarea className="input resize-none" rows={2} value={data.address||''} onChange={upd('address')} placeholder="A/12, Shrenik Park, Opp. Jain Temple, Near Akota Stadium..." /></F>
          <div className="grid grid-cols-3 gap-3">
            <F label="City"><input className="input" value={data.city||''} onChange={upd('city')} placeholder="Vadodara" /></F>
            <F label="State"><input className="input" value={data.state||''} onChange={upd('state')} placeholder="Gujarat" /></F>
            <F label="Pincode"><input className="input" value={data.pincode||''} onChange={upd('pincode')} placeholder="390001" /></F>
          </div>
          <F label="Additional License / Info (appears below address on invoice)">
            <input className="input" value={data.extra_info||''} onChange={upd('extra_info')} placeholder="FLZ Lic No. : RWR/147F, Seed Lic No. : RWR/203RS, Pesticide Lic No. : RWR/47RP" />
          </F>
        </Section>

        <Section title="Bank & Payment Details">
          <div className="grid sm:grid-cols-2 gap-3">
            <F label="Bank Name"><input className="input" value={data.bank_name||''} onChange={upd('bank_name')} placeholder="Punjab National Bank" /></F>
            <F label="Account Number"><input className="input" value={data.bank_account||''} onChange={upd('bank_account')} placeholder="0405008700008228" /></F>
            <F label="IFSC Code"><input className="input" value={data.bank_ifsc||''} onChange={upd('bank_ifsc')} placeholder="PUNB0040500" /></F>
            <F label="Branch"><input className="input" value={data.bank_branch||''} onChange={upd('bank_branch')} placeholder="Br. Circular Rd, Rewari." /></F>
            <F label="UPI ID"><input className="input" value={data.upi_id||''} onChange={upd('upi_id')} placeholder="company@upi" /></F>
            <F label="UPI Phone"><input className="input" value={data.upi_phone||''} onChange={upd('upi_phone')} placeholder="9876543210" /></F>
          </div>
        </Section>

        <Section title="Invoice Terms & Conditions">
          <F label="Terms (one per line, shown at bottom of invoice)">
            <textarea className="input resize-none" rows={4} value={data.invoice_terms||''} onChange={upd('invoice_terms')}
              placeholder={"Goods once sold will not be taken back or exchanged\nCheque Bounce Charges Rs. 450\nSubject to local Jurisdication"} />
          </F>
        </Section>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : 'Save Company Details'}
        </button>
      </form>
    </div>
  )
}
