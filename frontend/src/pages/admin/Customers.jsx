import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import { Modal, LoadingPage, EmptyState, SearchBar, StatusBadge, fmt, fmtDate, useToast, Confirm } from '../../components/ui'

const empty = { name:'', phone:'', email:'', address:'', gst_number:'' }

export default function Customers() {
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState(false)
  const [editData, setEditData]   = useState(null)
  const [profile, setProfile]     = useState(null)
  const [orders, setOrders]       = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [form, setForm]           = useState(empty)
  const [saving, setSaving]       = useState(false)
  const [delConfirm, setDelConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/customers'); setCustomers(r.data) }
    catch { toast('Failed to load','error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openProfile = async (c) => {
    setProfile(c); setOrders([]); setOrdersLoading(true)
    try {
      const r = await api.get('/orders', { params: { customer_id: c.id } })
      setOrders(r.data)
    } catch { }
    finally { setOrdersLoading(false) }
  }

  const openEdit = (c) => {
    setEditData(c)
    setForm({ name:c.name, phone:c.phone||'', email:c.email||'', address:c.address||'', gst_number:c.gst_number||'' })
    setModal(true)
  }

  const openAdd = () => { setEditData(null); setForm(empty); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editData) await api.put(`/customers/${editData.id}`, form)
      else await api.post('/customers', form)
      toast(editData ? 'Customer updated' : 'Customer added')
      setModal(false); load()
    } catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setSaving(false) }
  }

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const totalOrders = profile ? orders.length : 0
  const totalSpent  = profile ? orders.reduce((s,o) => s + parseFloat(o.total_amount||0), 0) : 0

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-xs text-surface-400 mt-0.5">{customers.length} customers</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Add Customer
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, phone, email..." />

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
            title="No customers" desc="Add your first customer" action={<button onClick={openAdd} className="btn-primary">Add Customer</button>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                {['Customer','Phone','Email','GST','Address','Orders','Total Spent',''].map(h => <th key={h} className="table-th">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                {filtered.map(c => (
                  <tr key={c.id} className="table-row cursor-pointer" onClick={() => openProfile(c)}>
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        {c.image_url
                          ? <img src={c.image_url} className="w-8 h-8 rounded-full object-cover" alt={c.name} />
                          : <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold">{c.name?.charAt(0)?.toUpperCase()}</div>
                        }
                        <span className="font-semibold text-sm">{c.name}</span>
                      </div>
                    </td>
                    <td className="table-td text-xs">{c.phone||'—'}</td>
                    <td className="table-td text-xs text-surface-400">{c.email||'—'}</td>
                    <td className="table-td text-xs font-mono">{c.gst_number||'—'}</td>
                    <td className="table-td text-xs text-surface-400 max-w-[150px] truncate">{c.address||'—'}</td>
                    <td className="table-td"><span className="badge-blue">{c.total_orders||0}</span></td>
                    <td className="table-td font-semibold text-green-600">{fmt(c.total_value||0)}</td>
                    <td className="table-td">
                      <button onClick={e => { e.stopPropagation(); openEdit(c) }} className="btn-ghost !p-1.5 mr-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="md:hidden space-y-2 p-3">
            {filtered.map(c => (
              <div key={c.id} className="card-sm p-3 cursor-pointer" onClick={() => openProfile(c)}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 flex items-center justify-center font-bold text-sm">{c.name?.charAt(0)?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="text-xs text-surface-400">{c.phone} · {c.total_orders||0} orders · {fmt(c.total_value||0)}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); openEdit(c) }} className="btn-ghost !p-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editData ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSave} className="space-y-3">
          <div><label className="label">Full Name *</label><input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required placeholder="Reliance Industries" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="9876543210" /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="info@company.com" /></div>
          </div>
          <div><label className="label">GST Number</label><input className="input" value={form.gst_number} onChange={e=>setForm(p=>({...p,gst_number:e.target.value}))} placeholder="27AABCU9603R1ZX" /></div>
          <div><label className="label">Address</label><textarea className="input resize-none" rows={2} value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="Full address with city, state" /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving…': editData?'Update':'Add Customer'}</button>
          </div>
        </form>
      </Modal>

      {/* Profile Modal */}
      {profile && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setProfile(null)}>
          <div className="modal-box sm:max-w-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h3 className="section-title">{profile.name}</h3>
              <button onClick={() => setProfile(null)} className="btn-ghost !p-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[['Total Orders', totalOrders, 'badge-blue'],['Total Spent', fmt(totalSpent), 'badge-green'],['Balance Due', fmt(orders.reduce((s,o)=>s+(parseFloat(o.total_amount||0)-parseFloat(o.amount_paid||0)),0)), 'badge-red']].map(([l,v,c])=>(
                  <div key={l} className="card p-3 text-center">
                    <div className="text-base font-bold">{v}</div>
                    <div className="text-xs text-surface-400 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
              {/* Details */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[['Phone',profile.phone||'—'],['Email',profile.email||'—'],['GST',profile.gst_number||'—'],['Address',profile.address||'—']].map(([l,v])=>(
                  <div key={l} className="bg-surface-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-surface-400 mb-0.5">{l}</div>
                    <div className="font-medium text-surface-800 dark:text-gray-200 text-sm">{v}</div>
                  </div>
                ))}
              </div>
              {/* Orders */}
              <div>
                <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wide mb-3">Purchase History</h4>
                {ordersLoading ? (
                  <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : orders.length === 0 ? (
                  <p className="text-sm text-surface-400 text-center py-4">No orders yet</p>
                ) : (
                  <div className="space-y-2">
                    {orders.map(o => (
                      <div key={o.id} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <div className="text-xs font-mono text-primary-600 font-semibold">{o.order_number}</div>
                          <div className="text-xs text-surface-400">{fmtDate(o.order_date)}{o.delivery_date ? ` → ${fmtDate(o.delivery_date)}` : ''}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">{fmt(o.total_amount)}</div>
                          <StatusBadge status={o.payment_status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
