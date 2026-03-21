import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { Modal, ConfirmDialog, SearchBar, StatusBadge, LoadingPage, EmptyState, fmt } from '../../components/ui'
import { useToast } from '../../components/ui'

const emptyForm = { name: '', phone: '', address: '', skill: '', daily_rate: '', joined_date: '' }

export default function AdminWorkers() {
  const toast = useToast()
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [detailWorker, setDetailWorker] = useState(null)
  const [detailData, setDetailData] = useState(null)

  const load = () => api.get('/workers').then(r => setWorkers(r.data)).catch(console.error).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModal(true) }
  const openEdit = (w) => {
    setEditing(w.id)
    setForm({ name: w.name, phone: w.phone || '', address: w.address || '', skill: w.skill || '', daily_rate: w.daily_rate || '', joined_date: w.joined_date?.split('T')[0] || '' })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/workers/${editing}`, { ...form, is_active: true })
        toast('Worker updated')
      } else {
        await api.post('/workers', form)
        toast('Worker added')
      }
      setModal(false)
      load()
    } catch (err) {
      toast(err.response?.data?.error || 'Failed', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/workers/${confirmDel}`)
      toast('Worker removed')
      setConfirmDel(null)
      load()
    } catch { toast('Failed to remove', 'error') }
    finally { setDeleting(false) }
  }

  const openDetail = async (w) => {
    setDetailWorker(w)
    const r = await api.get(`/workers/${w.id}`)
    setDetailData(r.data)
  }

  const filtered = workers.filter(w => w.name.toLowerCase().includes(search.toLowerCase()) || w.skill?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Workers</h1>
          <p className="text-sm text-surface-400 mt-1">{workers.length} active workers</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Worker
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-surface-100">
          <SearchBar value={search} onChange={setSearch} placeholder="Search workers..." />
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            title="No workers found"
            desc="Add your first worker to get started"
            action={<button onClick={openAdd} className="btn-primary">Add Worker</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="table-th">Worker</th>
                  <th className="table-th">Skill</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Daily Rate</th>
                  <th className="table-th">Jobs</th>
                  <th className="table-th">Completed</th>
                  <th className="table-th">Joined</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map(w => (
                  <tr key={w.id} className="hover:bg-surface-50 transition-colors">
                    <td className="table-td">
                      <button onClick={() => openDetail(w)} className="flex items-center gap-3 text-left group">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-bold flex-shrink-0">
                          {w.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-surface-900 group-hover:text-primary-600 transition-colors">{w.name}</span>
                      </button>
                    </td>
                    <td className="table-td"><span className="badge bg-surface-100 text-surface-700">{w.skill || '—'}</span></td>
                    <td className="table-td text-surface-500">{w.phone || '—'}</td>
                    <td className="table-td font-medium">{w.daily_rate ? fmt(w.daily_rate) : '—'}</td>
                    <td className="table-td">{w.total_assignments || 0}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-semibold">{w.completed_assignments || 0}</span>
                        {w.total_assignments > 0 && (
                          <div className="flex-1 bg-surface-200 rounded-full h-1.5 min-w-[40px]">
                            <div
                              className="bg-green-500 rounded-full h-1.5"
                              style={{ width: `${Math.round((w.completed_assignments / w.total_assignments) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-td text-surface-400 text-xs">{w.joined_date ? new Date(w.joined_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(w)} className="btn-ghost p-1.5 text-xs">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setConfirmDel(w.id)} className="btn-ghost p-1.5 text-xs text-red-500 hover:bg-red-50">
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

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Worker' : 'Add Worker'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required placeholder="Worker name" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="9876543210" />
            </div>
            <div>
              <label className="label">Skill</label>
              <select className="input" value={form.skill} onChange={e => setForm(p => ({...p, skill: e.target.value}))}>
                <option value="">Select skill</option>
                {['Carpentry','Polishing','Upholstery','Assembly','Cutting','Finishing','Welding','Other'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Daily Rate (₹)</label>
              <input className="input" type="number" value={form.daily_rate} onChange={e => setForm(p => ({...p, daily_rate: e.target.value}))} placeholder="600" />
            </div>
            <div>
              <label className="label">Joining Date</label>
              <input className="input" type="date" value={form.joined_date} onChange={e => setForm(p => ({...p, joined_date: e.target.value}))} />
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <textarea className="input resize-none" rows={2} value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} placeholder="Full address" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving...' : editing ? 'Update Worker' : 'Add Worker'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Worker Detail Modal */}
      <Modal open={!!detailWorker} onClose={() => { setDetailWorker(null); setDetailData(null) }} title={`${detailWorker?.name} — Work History`} size="xl">
        {detailData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="card p-4 text-center">
                <div className="font-display text-2xl font-bold text-surface-950">{detailData.assignments.length}</div>
                <div className="text-xs text-surface-500 uppercase tracking-wide mt-1">Total Jobs</div>
              </div>
              <div className="card p-4 text-center">
                <div className="font-display text-2xl font-bold text-green-600">{detailData.assignments.filter(a => a.status === 'COMPLETED').length}</div>
                <div className="text-xs text-surface-500 uppercase tracking-wide mt-1">Completed</div>
              </div>
              <div className="card p-4 text-center">
                <div className="font-display text-2xl font-bold text-amber-500">{detailData.assignments.filter(a => a.status !== 'COMPLETED').length}</div>
                <div className="text-xs text-surface-500 uppercase tracking-wide mt-1">Pending</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-50">
                  <tr>
                    <th className="table-th">Product</th>
                    <th className="table-th">Qty</th>
                    <th className="table-th">Commission</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Payment</th>
                    <th className="table-th">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {detailData.assignments.map(a => (
                    <tr key={a.id} className="hover:bg-surface-50">
                      <td className="table-td font-medium">{a.custom_product_name || a.product_name_db || '—'}</td>
                      <td className="table-td">{a.quantity}</td>
                      <td className="table-td">{fmt(a.commission * a.quantity)}</td>
                      <td className="table-td"><StatusBadge status={a.status} /></td>
                      <td className="table-td">
                        {a.is_paid ? (
                          <span className="badge bg-green-50 text-green-700">Paid</span>
                        ) : (
                          <span className="badge bg-red-50 text-red-600">Unpaid</span>
                        )}
                      </td>
                      <td className="table-td text-surface-400 text-xs">{new Date(a.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                  {detailData.assignments.length === 0 && (
                    <tr><td colSpan={6} className="table-td text-center text-surface-400 py-6">No assignments yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Remove Worker"
        message="This will deactivate the worker. Their records will be preserved."
        confirmLabel="Remove"
        loading={deleting}
      />
    </div>
  )
}
