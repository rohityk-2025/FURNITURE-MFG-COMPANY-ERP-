import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { Modal, SearchBar, LoadingPage, EmptyState, fmt } from '../../components/ui'
import { useToast } from '../../components/ui'

const emptyMaterial = { name: '', unit: 'pcs', min_stock: '', unit_price: '', vendor_name: '', vendor_phone: '', vendor_gst: '', gst_pct: '', notes: '' }
const emptyTxn = { type: 'IN', quantity: '', unit_price: '', vendor_name: '', notes: '' }
const UNITS = ['pcs', 'sheets', 'liters', 'meters', 'kg', 'box', 'pack', 'pairs', 'rolls']

export default function AdminInventory() {
  const toast = useToast()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [matModal, setMatModal] = useState(false)
  const [txnModal, setTxnModal] = useState(null)
  const [matForm, setMatForm] = useState(emptyMaterial)
  const [txnForm, setTxnForm] = useState(emptyTxn)
  const [editingMat, setEditingMat] = useState(null)
  const [saving, setSaving] = useState(false)
  const [txnHistory, setTxnHistory] = useState(null)
  const [historyMat, setHistoryMat] = useState(null)

  const load = () => api.get('/materials').then(r => setMaterials(r.data)).catch(console.error).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openAddMat = () => { setEditingMat(null); setMatForm(emptyMaterial); setMatModal(true) }
  const openEditMat = (m) => { setEditingMat(m.id); setMatForm({ name: m.name, unit: m.unit, min_stock: m.min_stock, unit_price: m.unit_price, vendor_name: m.vendor_name || '', vendor_phone: m.vendor_phone || '', vendor_gst: m.vendor_gst || '', gst_pct: m.gst_pct || '', notes: m.notes || '' }); setMatModal(true) }
  const openTxn = (m) => { setTxnModal(m); setTxnForm({ ...emptyTxn, vendor_name: m.vendor_name || '', unit_price: m.unit_price }) }

  const openHistory = async (m) => {
    setHistoryMat(m)
    const r = await api.get(`/materials/${m.id}/transactions`)
    setTxnHistory(r.data)
  }

  const handleMatSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editingMat) { await api.put(`/materials/${editingMat}`, matForm); toast('Material updated') }
      else { await api.post('/materials', matForm); toast('Material added') }
      setMatModal(false); load()
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const handleTxn = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post(`/materials/${txnModal.id}/transaction`, txnForm)
      toast(txnForm.type === 'IN' ? 'Stock added' : 'Stock deducted')
      setTxnModal(null); load()
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const filtered = materials.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.vendor_name?.toLowerCase().includes(search.toLowerCase()))
  const lowStock = materials.filter(m => parseFloat(m.quantity) <= parseFloat(m.min_stock))

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Inventory</h1><p className="text-sm text-surface-400 mt-1">{materials.length} materials tracked</p></div>
        <button onClick={openAddMat} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Material
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span className="text-sm font-semibold text-amber-800">Low Stock Alert — {lowStock.length} items</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(m => <span key={m.id} className="badge bg-amber-100 text-amber-800">{m.name} ({m.quantity} {m.unit})</span>)}
          </div>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-surface-100">
          <SearchBar value={search} onChange={setSearch} placeholder="Search materials..." />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>} title="No materials" desc="Add your raw materials to track inventory" action={<button onClick={openAddMat} className="btn-primary">Add Material</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="table-th">Material</th>
                  <th className="table-th">Stock</th>
                  <th className="table-th">Min Stock</th>
                  <th className="table-th">Unit Price</th>
                  <th className="table-th">Vendor</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map(m => {
                  const isLow = parseFloat(m.quantity) <= parseFloat(m.min_stock)
                  return (
                    <tr key={m.id} className={`hover:bg-surface-50 transition-colors ${isLow ? 'bg-amber-50/40' : ''}`}>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          {isLow && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />}
                          <span className="font-medium text-surface-900">{m.name}</span>
                        </div>
                      </td>
                      <td className="table-td">
                        <span className={`font-semibold ${isLow ? 'text-amber-600' : 'text-surface-900'}`}>
                          {m.quantity} <span className="text-surface-400 font-normal text-xs">{m.unit}</span>
                        </span>
                      </td>
                      <td className="table-td text-surface-400">{m.min_stock} {m.unit}</td>
                      <td className="table-td">{m.unit_price ? fmt(m.unit_price) : '—'}</td>
                      <td className="table-td text-surface-500">{m.vendor_name || '—'}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openTxn(m)} className="btn-primary py-1 px-2 text-xs">
                            Stock In/Out
                          </button>
                          <button onClick={() => openEditMat(m)} className="btn-ghost p-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => openHistory(m)} className="btn-ghost p-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Material Modal */}
      <Modal open={matModal} onClose={() => setMatModal(false)} title={editingMat ? 'Edit Material' : 'Add Material'}>
        <form onSubmit={handleMatSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Material Name *</label>
              <input className="input" value={matForm.name} onChange={e=>setMatForm(p=>({...p,name:e.target.value}))} required placeholder="e.g. Plywood (18mm)" />
            </div>
            <div>
              <label className="label">Unit *</label>
              <select className="input" value={matForm.unit} onChange={e=>setMatForm(p=>({...p,unit:e.target.value}))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Min Stock (Alert)</label>
              <input className="input" type="number" value={matForm.min_stock} onChange={e=>setMatForm(p=>({...p,min_stock:e.target.value}))} placeholder="20" min="0" />
            </div>
            <div>
              <label className="label">Unit Price (₹)</label>
              <input className="input" type="number" value={matForm.unit_price} onChange={e=>setMatForm(p=>({...p,unit_price:e.target.value}))} placeholder="850" min="0" />
            </div>
            <div>
              <label className="label">Vendor Name</label>
              <input className="input" value={matForm.vendor_name} onChange={e=>setMatForm(p=>({...p,vendor_name:e.target.value}))} placeholder="Sharma Timber" />
            </div>
            <div>
              <label className="label">Vendor Phone</label>
              <input className="input" value={matForm.vendor_phone} onChange={e=>setMatForm(p=>({...p,vendor_phone:e.target.value}))} placeholder="9876543210" />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={2} value={matForm.notes} onChange={e=>setMatForm(p=>({...p,notes:e.target.value}))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setMatModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : editingMat ? 'Update' : 'Add Material'}</button>
          </div>
        </form>
      </Modal>

      {/* Stock Transaction Modal */}
      <Modal open={!!txnModal} onClose={() => setTxnModal(null)} title={`Stock Transaction — ${txnModal?.name}`}>
        <form onSubmit={handleTxn} className="space-y-4">
          <div className="flex gap-3">
            <button type="button" onClick={() => setTxnForm(p=>({...p,type:'IN'}))}
              className={`flex-1 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${txnForm.type === 'IN' ? 'border-green-500 bg-green-50 text-green-700' : 'border-surface-200 text-surface-500'}`}>
              ↑ Stock In
            </button>
            <button type="button" onClick={() => setTxnForm(p=>({...p,type:'OUT'}))}
              className={`flex-1 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${txnForm.type === 'OUT' ? 'border-red-400 bg-red-50 text-red-600' : 'border-surface-200 text-surface-500'}`}>
              ↓ Stock Out
            </button>
          </div>
          <div>
            <p className="text-xs text-surface-500 text-center">Current stock: <strong>{txnModal?.quantity} {txnModal?.unit}</strong></p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity *</label>
              <input className="input" type="number" value={txnForm.quantity} onChange={e=>setTxnForm(p=>({...p,quantity:e.target.value}))} required placeholder="Enter quantity" min="0.01" step="0.01" />
            </div>
            {txnForm.type === 'IN' && (
              <div>
                <label className="label">Unit Price (₹)</label>
                <input className="input" type="number" value={txnForm.unit_price} onChange={e=>setTxnForm(p=>({...p,unit_price:e.target.value}))} placeholder="850" min="0" />
              </div>
            )}
            {txnForm.type === 'IN' && (
              <div className="col-span-2">
                <label className="label">Vendor</label>
                <input className="input" value={txnForm.vendor_name} onChange={e=>setTxnForm(p=>({...p,vendor_name:e.target.value}))} placeholder="Vendor name" />
              </div>
            )}
            <div className="col-span-2">
              <label className="label">Notes</label>
              <input className="input" value={txnForm.notes} onChange={e=>setTxnForm(p=>({...p,notes:e.target.value}))} placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setTxnModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className={`flex-1 justify-center inline-flex items-center gap-2 font-medium px-4 py-2 rounded-lg transition-all text-sm text-white ${txnForm.type === 'IN' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
              {saving ? 'Processing...' : txnForm.type === 'IN' ? 'Add Stock' : 'Deduct Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal open={!!historyMat} onClose={() => { setHistoryMat(null); setTxnHistory(null) }} title={`Transaction History — ${historyMat?.name}`} size="lg">
        {txnHistory ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50"><tr>
                <th className="table-th">Type</th>
                <th className="table-th">Qty</th>
                <th className="table-th">Unit Price</th>
                <th className="table-th">Vendor</th>
                <th className="table-th">By</th>
                <th className="table-th">Date</th>
              </tr></thead>
              <tbody className="divide-y divide-surface-100">
                {txnHistory.map(t => (
                  <tr key={t.id} className="hover:bg-surface-50">
                    <td className="table-td"><span className={`badge ${t.type === 'IN' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{t.type === 'IN' ? '↑ IN' : '↓ OUT'}</span></td>
                    <td className="table-td font-medium">{t.quantity} {historyMat.unit}</td>
                    <td className="table-td">{t.unit_price ? fmt(t.unit_price) : '—'}</td>
                    <td className="table-td text-surface-500">{t.vendor_name || '—'}</td>
                    <td className="table-td text-surface-500">{t.created_by_name || '—'}</td>
                    <td className="table-td text-xs text-surface-400">{new Date(t.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                  </tr>
                ))}
                {txnHistory.length === 0 && <tr><td colSpan={6} className="text-center text-surface-400 py-6 table-td">No transactions yet</td></tr>}
              </tbody>
            </table>
          </div>
        ) : <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}
      </Modal>
    </div>
  )
}
