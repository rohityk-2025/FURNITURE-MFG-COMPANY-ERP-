import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { LoadingPage, fmt } from '../../components/ui'
import { useToast } from '../../components/ui'

export default function ManagerInventory() {
  const toast = useToast()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [txnModal, setTxnModal] = useState(null)
  const [txnForm, setTxnForm] = useState({ type: 'OUT', quantity: '', unit_price: '', vendor_name: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = () => api.get('/materials').then(r => setMaterials(r.data)).catch(console.error).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openTxn = (m) => {
    setTxnModal(m)
    setTxnForm({ type: 'OUT', quantity: '', unit_price: m.unit_price || '', vendor_name: m.vendor_name || '', notes: '' })
  }

  const handleTxn = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post(`/materials/${txnModal.id}/transaction`, txnForm)
      toast(txnForm.type === 'IN' ? `✓ ${txnForm.quantity} ${txnModal.unit} added to ${txnModal.name}` : `✓ ${txnForm.quantity} ${txnModal.unit} deducted from ${txnModal.name}`)
      setTxnModal(null)
      load()
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const filtered = materials.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.vendor_name?.toLowerCase().includes(search.toLowerCase()))
  const lowStock = materials.filter(m => parseFloat(m.quantity) <= parseFloat(m.min_stock))

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Inventory Usage</h1>
        <p className="text-sm text-surface-400 mt-1">Add or deduct materials from stock</p>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Low Stock: {lowStock.map(m => m.name).join(', ')}</p>
            <p className="text-xs text-amber-600 mt-0.5">Please inform admin to restock these materials</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-surface-100">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="input pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials..." />
          </div>
        </div>

        <div className="divide-y divide-surface-100">
          {filtered.map(m => {
            const isLow = parseFloat(m.quantity) <= parseFloat(m.min_stock)
            const pct = m.min_stock > 0 ? Math.min(100, Math.round((m.quantity / (m.min_stock * 3)) * 100)) : 50
            return (
              <div key={m.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-50 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isLow ? 'bg-amber-100 text-amber-600' : 'bg-surface-100 text-surface-500'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-surface-900 text-sm">{m.name}</span>
                      {isLow && <span className="badge bg-amber-50 text-amber-600 text-xs">Low Stock</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs font-semibold ${isLow ? 'text-amber-500' : 'text-surface-700'}`}>{m.quantity} {m.unit}</span>
                      {m.vendor_name && <span className="text-xs text-surface-400">{m.vendor_name}</span>}
                      {m.unit_price > 0 && <span className="text-xs text-surface-400">{fmt(m.unit_price)}/{m.unit}</span>}
                    </div>
                    <div className="mt-2 w-48">
                      <div className="bg-surface-200 rounded-full h-1">
                        <div className={`rounded-full h-1 transition-all ${isLow ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={() => openTxn(m)} className="btn-primary ml-4 flex-shrink-0 text-sm">
                  Update Stock
                </button>
              </div>
            )
          })}
          {filtered.length === 0 && <div className="py-12 text-center text-surface-400">No materials found</div>}
        </div>
      </div>

      {/* Transaction Modal */}
      {txnModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setTxnModal(null)}>
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-surface-100">
              <div>
                <h3 className="section-title">{txnModal.name}</h3>
                <p className="text-sm text-surface-400 mt-0.5">Current: <strong>{txnModal.quantity} {txnModal.unit}</strong></p>
              </div>
              <button onClick={() => setTxnModal(null)} className="btn-ghost p-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleTxn} className="p-5 space-y-4">
              <div className="flex gap-3">
                <button type="button" onClick={() => setTxnForm(p => ({ ...p, type: 'IN' }))}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${txnForm.type === 'IN' ? 'border-green-500 bg-green-50 text-green-700' : 'border-surface-200 text-surface-400'}`}>
                  ↑ Stock In (Purchase)
                </button>
                <button type="button" onClick={() => setTxnForm(p => ({ ...p, type: 'OUT' }))}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${txnForm.type === 'OUT' ? 'border-red-400 bg-red-50 text-red-600' : 'border-surface-200 text-surface-400'}`}>
                  ↓ Stock Out (Use)
                </button>
              </div>

              <div>
                <label className="label">Quantity ({txnModal.unit}) *</label>
                <input className="input" type="number" value={txnForm.quantity} onChange={e => setTxnForm(p => ({ ...p, quantity: e.target.value }))} required min="0.01" step="0.01" placeholder="Enter quantity" autoFocus />
              </div>

              {txnForm.type === 'IN' && (
                <>
                  <div>
                    <label className="label">Unit Price (₹)</label>
                    <input className="input" type="number" value={txnForm.unit_price} onChange={e => setTxnForm(p => ({ ...p, unit_price: e.target.value }))} placeholder={`Default: ${fmt(txnModal.unit_price)}`} min="0" />
                    {txnForm.quantity && txnForm.unit_price && (
                      <p className="text-xs text-green-600 mt-1">Total cost: {fmt(txnForm.quantity * txnForm.unit_price)}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Vendor Name</label>
                    <input className="input" value={txnForm.vendor_name} onChange={e => setTxnForm(p => ({ ...p, vendor_name: e.target.value }))} placeholder="Vendor name" />
                  </div>
                </>
              )}

              <div>
                <label className="label">Notes</label>
                <input className="input" value={txnForm.notes} onChange={e => setTxnForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setTxnModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className={`flex-1 justify-center inline-flex items-center gap-2 font-semibold px-4 py-2 rounded-lg transition-all text-sm text-white ${txnForm.type === 'IN' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                  {saving ? 'Processing...' : txnForm.type === 'IN' ? '↑ Add to Stock' : '↓ Deduct from Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
