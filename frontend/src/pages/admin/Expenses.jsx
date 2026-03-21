import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import { Modal, StatusBadge, LoadingPage, EmptyState, SearchBar, fmt, fmtDate, useToast } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const CATS = ['MATERIAL','SALARY','UTILITIES','TRANSPORT','MAINTENANCE','RENT','OTHER']
const empty = { title:'', category:'OTHER', amount:'', tax_pct:'', tax_amount:'', vendor_name:'', vendor_gst:'', description:'', date: new Date().toISOString().split('T')[0] }

export default function Expenses() {
  const toast = useToast()
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [detail, setDetail]     = useState(null)
  const [form, setForm]         = useState(empty)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const [sort, setSort]         = useState('newest')
  const [catFilter, setCatFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/expenses'); setExpenses(r.data) }
    catch { toast('Failed to load', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/expenses', form)
      toast('Expense added')
      setModal(false); setForm(empty); load()
    } catch(err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const calcTax = () => {
    if (form.amount && form.tax_pct) {
      const t = (parseFloat(form.amount) * parseFloat(form.tax_pct)) / 100
      setForm(p => ({ ...p, tax_amount: t.toFixed(2) }))
    }
  }

  let filtered = expenses.filter(e =>
    (!search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.vendor_name?.toLowerCase().includes(search.toLowerCase())) &&
    (!catFilter || e.category === catFilter)
  )
  filtered = filtered.sort((a, b) => sort === 'newest'
    ? new Date(b.created_at) - new Date(a.created_at)
    : new Date(a.created_at) - new Date(b.created_at)
  )

  const total = filtered.reduce((s, e) => s + parseFloat(e.amount || 0), 0)

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="text-xs text-surface-400 mt-0.5">{filtered.length} expenses · Total: {fmt(total)}</p>
        </div>
        <button onClick={() => { setForm(empty); setModal(true) }} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[180px]"><SearchBar value={search} onChange={setSearch} placeholder="Search expenses..." /></div>
        <select className="input w-36 !min-h-[38px]" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input w-32 !min-h-[38px]" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATS.slice(0,4).map(cat => {
          const amt = expenses.filter(e => e.category === cat).reduce((s,e) => s + parseFloat(e.amount||0), 0)
          if (!amt) return null
          return (
            <div key={cat} className="card p-3">
              <div className="text-xs text-surface-400 font-semibold uppercase">{cat}</div>
              <div className="text-base font-bold text-surface-900 dark:text-gray-100 mt-0.5">{fmt(amt)}</div>
            </div>
          )
        }).filter(Boolean)}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>}
            title="No expenses found" desc="Add your first expense record" action={<button onClick={() => setModal(true)} className="btn-primary">Add Expense</button>}
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  {['Title','Category','Amount','Tax','Vendor','Date','Added By',''].map(h => <th key={h} className="table-th">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                  {filtered.map(e => (
                    <tr key={e.id} className="table-row cursor-pointer" onClick={() => setDetail(e)}>
                      <td className="table-td font-medium">{e.title}</td>
                      <td className="table-td"><StatusBadge status={e.category} /></td>
                      <td className="table-td font-semibold text-red-600">{fmt(e.amount)}</td>
                      <td className="table-td text-surface-400">{e.tax_amount ? fmt(e.tax_amount) : '—'}</td>
                      <td className="table-td text-surface-500 text-xs">{e.vendor_name || '—'}</td>
                      <td className="table-td text-xs text-surface-400">{fmtDate(e.date)}</td>
                      <td className="table-td text-xs text-surface-400">{e.created_by_name || '—'}</td>
                      <td className="table-td">
                        <svg className="w-4 h-4 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden space-y-2 p-3">
              {filtered.map(e => (
                <div key={e.id} className="card-sm p-3 cursor-pointer" onClick={() => setDetail(e)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-sm">{e.title}</div>
                      <div className="flex gap-2 mt-1"><StatusBadge status={e.category} /><span className="text-xs text-surface-400">{fmtDate(e.date)}</span></div>
                    </div>
                    <div className="font-bold text-red-600">{fmt(e.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Expense" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} required placeholder="e.g. Plywood purchase" />
            </div>
            <div>
              <label className="label">Category *</label>
              <select className="input" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input className="input" type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} required min={0} placeholder="0" />
            </div>
            <div>
              <label className="label">Tax % (optional)</label>
              <input className="input" type="number" value={form.tax_pct} onChange={e=>setForm(p=>({...p,tax_pct:e.target.value}))} onBlur={calcTax} placeholder="18" min={0} max={100} />
            </div>
            <div>
              <label className="label">Tax Amount (₹)</label>
              <input className="input" type="number" value={form.tax_amount} onChange={e=>setForm(p=>({...p,tax_amount:e.target.value}))} placeholder="Auto-calculated" min={0} />
            </div>
            <div>
              <label className="label">Vendor / Company Name</label>
              <input className="input" value={form.vendor_name} onChange={e=>setForm(p=>({...p,vendor_name:e.target.value}))} placeholder="Sharma Timber" />
            </div>
            <div>
              <label className="label">Vendor GST (optional)</label>
              <input className="input" value={form.vendor_gst} onChange={e=>setForm(p=>({...p,vendor_gst:e.target.value}))} placeholder="27AABCU9603R1ZX" />
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Additional notes..." />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Add Expense'}</button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal-box sm:max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-gray-800">
              <h3 className="section-title">Expense Details</h3>
              <button onClick={() => setDetail(null)} className="btn-ghost !p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-base text-surface-900 dark:text-gray-100">{detail.title}</div>
                  <StatusBadge status={detail.category} />
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-red-600">{fmt(detail.amount)}</div>
                  {detail.tax_amount > 0 && <div className="text-xs text-surface-400">+{fmt(detail.tax_amount)} tax</div>}
                </div>
              </div>
              {[
                ['Date', fmtDate(detail.date)],
                ['Vendor', detail.vendor_name || '—'],
                ['Vendor GST', detail.vendor_gst || '—'],
                ['Added By', detail.created_by_name || '—'],
                ['Description', detail.description || '—'],
              ].map(([l,v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-surface-400">{l}</span>
                  <span className="font-medium text-surface-800 dark:text-gray-200 text-right max-w-[200px]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
