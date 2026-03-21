import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { Modal, ConfirmDialog, SearchBar, LoadingPage, EmptyState, fmt } from '../../components/ui'
import { useToast } from '../../components/ui'

const emptyForm = { name: '', category: '', description: '', price: '', commission: '' }
const CATEGORIES = ['Seating', 'Tables', 'Bedroom', 'Storage', 'Office', 'Outdoor', 'Other']

export default function AdminProducts() {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const load = () => api.get('/products').then(r => setProducts(r.data)).catch(console.error).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModal(true) }
  const openEdit = (p) => { setEditing(p.id); setForm({ name: p.name, category: p.category || '', description: p.description || '', price: p.price, commission: p.commission }); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) { await api.put(`/products/${editing}`, { ...form, is_active: true }); toast('Product updated') }
      else { await api.post('/products', form); toast('Product added') }
      setModal(false)
      load()
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await api.delete(`/products/${confirmDel}`); toast('Product removed'); setConfirmDel(null); load() }
    catch { toast('Failed', 'error') }
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()))
  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Products</h1><p className="text-sm text-surface-400 mt-1">Furniture catalog with pricing & commissions</p></div>
        <button onClick={openAdd} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Product
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-surface-100">
          <SearchBar value={search} onChange={setSearch} placeholder="Search products..." />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} title="No products" desc="Add your furniture products" action={<button onClick={openAdd} className="btn-primary">Add Product</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="table-th">Product</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Wholesale Price</th>
                  <th className="table-th">Commission</th>
                  <th className="table-th">Commission %</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-surface-50 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                        <div>
                          <div className="font-medium text-surface-900">{p.name}</div>
                          {p.description && <div className="text-xs text-surface-400 truncate max-w-[180px]">{p.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="table-td"><span className="badge bg-surface-100 text-surface-700">{p.category || '—'}</span></td>
                    <td className="table-td font-semibold text-surface-900">{fmt(p.price)}</td>
                    <td className="table-td text-green-700 font-semibold">{fmt(p.commission)}</td>
                    <td className="table-td">
                      <span className="text-xs text-surface-500">{p.price > 0 ? ((p.commission / p.price) * 100).toFixed(1) : 0}%</span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="btn-ghost p-1.5 text-xs">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setConfirmDel(p.id)} className="btn-ghost p-1.5 text-xs text-red-500 hover:bg-red-50">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Product Name *</label>
              <input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required placeholder="e.g. Wooden Chair" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Wholesale Price (₹) *</label>
              <input className="input" type="number" value={form.price} onChange={e=>setForm(p=>({...p,price:e.target.value}))} required placeholder="2500" min="0" />
            </div>
            <div>
              <label className="label">Worker Commission (₹)</label>
              <input className="input" type="number" value={form.commission} onChange={e=>setForm(p=>({...p,commission:e.target.value}))} placeholder="500" min="0" />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Optional description" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : editing ? 'Update' : 'Add Product'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={handleDelete} title="Remove Product" message="This product will be deactivated." confirmLabel="Remove" />
    </div>
  )
}
