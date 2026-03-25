import { useState, useEffect, useRef } from 'react'
import api from '../../utils/api'
import { Modal, ConfirmDialog, SearchBar, StatusBadge, LoadingPage, EmptyState, fmt, fmtDate, Tabs } from '../../components/ui'
import { useToast } from '../../components/ui'

const emptyForm = {
  name: '', phone: '', address: '', skill: '', daily_rate: '', joined_date: '',
  worker_type: 'PERMANENT', salary_type: 'DAILY', monthly_salary: ''
}

const IC = ({ d, cls = 'w-4 h-4' }) => (
  <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
  </svg>
)

const getWorkerImage = (worker) => worker?.image_url || worker?.profile_image || null

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
  const [detailTab, setDetailTab] = useState('jobs')
  const [profileFile, setProfileFile] = useState(null)
  const [profilePreview, setProfilePreview] = useState(null)
  const fileRef = useRef()
  const [payModal, setPayModal] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payType, setPayType] = useState('FULL')
  const [advModal, setAdvModal] = useState(null)
  const [advAmount, setAdvAmount] = useState('')
  const [advNote, setAdvNote] = useState('')
  const [editAdvModal, setEditAdvModal] = useState(null)
  const [editAdvAmt, setEditAdvAmt] = useState('')

  const load = () => api.get('/workers').then(r => setWorkers(r.data)).catch(console.error).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const upd = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const openAdd = () => {
    setEditing(null); setForm(emptyForm)
    setProfileFile(null); setProfilePreview(null); setModal(true)
  }

  const openEdit = (w) => {
    setEditing(w.id)
    setForm({
      name: w.name, phone: w.phone || '', address: w.address || '',
      skill: w.skill || '', daily_rate: w.daily_rate || '',
      joined_date: w.joined_date?.split('T')[0] || '',
      worker_type: w.worker_type || 'PERMANENT',
      salary_type: w.salary_type || 'DAILY',
      monthly_salary: w.monthly_salary || ''
    })
    setProfilePreview(getWorkerImage(w))
    setProfileFile(null); setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const fd = new FormData()
      const rate = form.salary_type === 'MONTHLY'
        ? Math.round((parseFloat(form.monthly_salary) || 0) / 30)
        : parseFloat(form.daily_rate) || 0
      const payload = { ...form, daily_rate: rate, is_active: true }
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v ?? ''))
      if (profileFile) fd.append('image', profileFile)
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } }
      if (editing) { await api.put(`/workers/${editing}`, fd, cfg); toast('Worker updated') }
      else { await api.post('/workers', fd, cfg); toast('Worker added') }
      setModal(false); load()
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await api.delete(`/workers/${confirmDel}`); toast('Worker deactivated'); setConfirmDel(null); load() }
    catch { toast('Failed', 'error') } finally { setDeleting(false) }
  }

  const openDetail = async (w) => {
    setDetailWorker(w); setDetailData(null); setDetailTab('jobs')
    try {
      const r = await api.get(`/workers/${w.id}`)
      setDetailData(r.data)
    } catch { toast('Failed to load', 'error') }
  }

  const handlePayJob = async (job) => {
    if (!payAmount) return; setSaving(true)
    try {
      await api.post(`/work-assignments/${job.id}/pay`, { amount: payAmount, payment_type: payType })
      toast('Payment recorded'); setPayModal(null); setPayAmount('')
      const r = await api.get(`/workers/${detailWorker.id}`); setDetailData(r.data)
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const handleAddAdvance = async () => {
    if (!advAmount) return; setSaving(true)
    try {
      await api.post('/finance/advance', {
        worker_id: advModal.id, amount: advAmount,
        payment_date: new Date().toISOString().split('T')[0], note: advNote
      })
      toast('Advance recorded'); setAdvModal(null); setAdvAmount(''); setAdvNote('')
      const r = await api.get(`/workers/${detailWorker.id}`); setDetailData(r.data)
    } catch { toast('Failed', 'error') } finally { setSaving(false) }
  }

  const handleEditAdvance = async () => {
    if (!editAdvAmt) return; setSaving(true)
    try {
      await api.put(`/finance/advance/${editAdvModal.id}`, { remaining: editAdvAmt })
      toast('Advance updated'); setEditAdvModal(null)
      const r = await api.get(`/workers/${detailWorker.id}`); setDetailData(r.data)
    } catch { toast('Failed', 'error') } finally { setSaving(false) }
  }

  const exportPDF = (w, data) => {
    const win = window.open('', '_blank')
    const jobs = data.assignments || []
    const advances = data.advances || []
    const totalEarned = jobs.filter(j => j.status === 'COMPLETED').reduce((s, j) => s + j.commission * j.quantity, 0)
    const totalPaid = jobs.filter(j => j.is_paid).reduce((s, j) => s + j.commission * j.quantity, 0)
    const totalAdv = advances.reduce((s, a) => s + parseFloat(a.amount), 0)
    win.document.write(`<!DOCTYPE html><html><head><title>Worker Payment - ${w.name}</title>
    <style>body{font-family:Arial;padding:32px;color:#1e293b;max-width:900px;margin:0 auto}
    h1{font-size:22px;color:#2563eb}h2{font-size:15px;margin:20px 0 8px;color:#334155}
    .row{display:flex;gap:16px;margin:16px 0}.box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;flex:1}
    .lbl{font-size:10px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px}.val{font-size:18px;font-weight:700}
    table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#64748b}
    td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px}
    @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
    <h1>Worker Payment Statement — ${w.name}</h1>
    <p style="color:#64748b;font-size:13px">${w.skill || ''} · ${w.phone || ''} · Generated: ${new Date().toLocaleString('en-IN')}</p>
    <div class="row">
      <div class="box"><div class="lbl">Total Earned</div><div class="val" style="color:#2563eb">₹${totalEarned.toLocaleString('en-IN')}</div></div>
      <div class="box"><div class="lbl">Paid</div><div class="val" style="color:#16a34a">₹${totalPaid.toLocaleString('en-IN')}</div></div>
      <div class="box"><div class="lbl">Pending</div><div class="val" style="color:#dc2626">₹${(totalEarned - totalPaid).toLocaleString('en-IN')}</div></div>
      <div class="box"><div class="lbl">Total Advance</div><div class="val" style="color:#7c3aed">₹${totalAdv.toLocaleString('en-IN')}</div></div>
    </div>
    <h2>Job-wise Payment</h2>
    <table><thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Commission</th><th>Status</th><th>Payment</th><th>Date</th></tr></thead>
    <tbody>${jobs.map((j, i) => `<tr><td>${i + 1}</td><td>${j.custom_product_name || j.product_name_db || '—'}</td>
    <td>${j.quantity}</td><td>₹${(j.commission * j.quantity).toLocaleString('en-IN')}</td>
    <td>${j.status}</td><td>${j.is_paid ? 'Paid' : 'Pending'}</td>
    <td>${j.created_at ? new Date(j.created_at).toLocaleDateString('en-IN') : '—'}</td></tr>`).join('')}</tbody></table>
    ${advances.length ? `<h2>Advances</h2>
    <table><thead><tr><th>Date</th><th>Amount</th><th>Remaining</th><th>Note</th></tr></thead>
    <tbody>${advances.map(a => `<tr><td>${new Date(a.payment_date).toLocaleDateString('en-IN')}</td>
    <td>₹${parseFloat(a.amount).toLocaleString('en-IN')}</td><td>₹${parseFloat(a.remaining).toLocaleString('en-IN')}</td>
    <td>${a.note || '—'}</td></tr>`).join('')}</tbody></table>` : ''}
    </body></html>`)
    win.document.close(); setTimeout(() => win.print(), 500)
  }

  const filtered = workers.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.skill || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Workers</h1>
          <p className="text-xs text-surface-400 mt-0.5">{workers.length} active workers</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <IC d="M12 4v16m8-8H4" /> Add Worker
        </button>
      </div>

      <div className="card">
        <div className="p-3 border-b border-surface-100 dark:border-gray-800">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name or skill..." />
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<IC d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" cls="w-6 h-6" />}
            title="No workers found" desc="Add your first worker to get started"
            action={<button onClick={openAdd} className="btn-primary">Add Worker</button>} />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-50 dark:bg-gray-800/50 border-b border-surface-100 dark:border-gray-800">
                  <tr>{['Worker', 'Type', 'Skill', 'Phone', 'Daily Rate', 'Jobs', 'Completed', 'Actions'].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                  {filtered.map(w => (
                    <tr key={w.id} className="table-row">
                      <td className="table-td">
                        <button onClick={() => openDetail(w)} className="flex items-center gap-2.5 text-left group">
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-primary-100 dark:bg-primary-900/30">
                            {getWorkerImage(w)
                              ? <img src={getWorkerImage(w)} className="w-full h-full object-cover" alt="" />
                              : <div className="w-full h-full flex items-center justify-center text-primary-600 text-xs font-bold">{w.name.charAt(0)}</div>
                            }
                          </div>
                          <span className="font-medium text-sm text-surface-900 dark:text-gray-100 group-hover:text-primary-600">{w.name}</span>
                        </button>
                      </td>
                      <td className="table-td">
                        <span className={`badge text-xs ${w.worker_type === 'CONTRACT' ? 'badge-purple' : 'badge-blue'}`}>
                          {w.worker_type === 'CONTRACT' ? 'Contract' : 'Permanent'}
                        </span>
                      </td>
                      <td className="table-td"><span className="badge badge-gray text-xs">{w.skill || '—'}</span></td>
                      <td className="table-td text-xs text-surface-500 dark:text-gray-400">{w.phone || '—'}</td>
                      <td className="table-td">
                        <div className="font-semibold text-sm">{fmt(w.daily_rate)}/day</div>
                        {w.salary_type === 'MONTHLY' && <div className="text-xs text-surface-400">~₹{((w.daily_rate || 0) * 30).toLocaleString('en-IN')}/mo</div>}
                      </td>
                      <td className="table-td text-sm">{w.total_assignments || 0}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 dark:text-green-400 font-semibold text-sm">{w.completed_assignments || 0}</span>
                          {(w.total_assignments || 0) > 0 && (
                            <div className="flex-1 bg-surface-200 dark:bg-gray-700 rounded-full h-1.5 min-w-[36px]">
                              <div className="bg-green-500 rounded-full h-1.5" style={{ width: `${Math.round(((w.completed_assignments || 0) / w.total_assignments) * 100)}%` }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(w)} className="btn-ghost p-1.5"><IC d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></button>
                          <button onClick={() => setConfirmDel(w.id)} className="btn-ghost p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><IC d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="sm:hidden space-y-3 p-3">
              {filtered.map(w => (
                <div key={w.id} className="card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-100 flex-shrink-0">
                      {getWorkerImage(w)
                        ? <img src={getWorkerImage(w)} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full flex items-center justify-center text-primary-600 font-bold">{w.name.charAt(0)}</div>
                      }
                    </div>
                    <div className="flex-1"><div className="font-semibold">{w.name}</div><div className="text-xs text-surface-400">{w.skill} · {fmt(w.daily_rate)}/day</div></div>
                    <span className={`badge text-xs ${w.worker_type === 'CONTRACT' ? 'badge-purple' : 'badge-blue'}`}>{w.worker_type === 'CONTRACT' ? 'Contract' : 'Permanent'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openDetail(w)} className="btn-secondary flex-1 text-xs justify-center">View</button>
                    <button onClick={() => openEdit(w)} className="btn-secondary flex-1 text-xs justify-center">Edit</button>
                    <button onClick={() => setConfirmDel(w.id)} className="btn-danger text-xs px-3">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Worker' : 'Add Worker'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-surface-300 dark:border-gray-600 overflow-hidden flex items-center justify-center bg-surface-50 dark:bg-gray-800 cursor-pointer flex-shrink-0"
              onClick={() => fileRef.current?.click()}>
              {profilePreview
                ? <img src={profilePreview} className="w-full h-full object-cover" alt="" />
                : <IC d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" cls="w-8 h-8 text-surface-300" />
              }
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary text-xs">Upload Photo</button>
              <p className="text-xs text-surface-400 mt-1">Optional profile image</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files[0]; if (f) { setProfileFile(f); setProfilePreview(URL.createObjectURL(f)) } }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label">Full Name *</label><input className="input" value={form.name} onChange={upd('name')} required placeholder="Worker name" /></div>
            <div>
              <label className="label">Worker Type</label>
              <select className="input" value={form.worker_type} onChange={upd('worker_type')}>
                <option value="PERMANENT">Permanent</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
            <div>
              <label className="label">Skill</label>
              <select className="input" value={form.skill} onChange={upd('skill')}>
                <option value="">Select skill</option>
                {['Carpentry','Polishing','Upholstery','Assembly','Cutting','Finishing','Welding','Other'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={upd('phone')} placeholder="9876543210" /></div>
            <div><label className="label">Joining Date</label><input className="input" type="date" value={form.joined_date} onChange={upd('joined_date')} /></div>
            <div>
              <label className="label">Salary Type</label>
              <select className="input" value={form.salary_type} onChange={upd('salary_type')}>
                <option value="DAILY">Daily Rate</option>
                <option value="MONTHLY">Monthly Salary</option>
                <option value="WEEKLY">Weekly Rate</option>
              </select>
            </div>
            <div>
              <label className="label">{form.salary_type === 'MONTHLY' ? 'Monthly Salary (₹)' : 'Daily Rate (₹)'}</label>
              <input className="input" type="number" min="0"
                value={form.salary_type === 'MONTHLY' ? form.monthly_salary : form.daily_rate}
                onChange={form.salary_type === 'MONTHLY' ? upd('monthly_salary') : upd('daily_rate')}
                placeholder={form.salary_type === 'MONTHLY' ? '9000' : '500'} />
              {form.salary_type === 'MONTHLY' && form.monthly_salary && (
                <p className="text-xs text-primary-500 mt-1">= ₹{Math.round(parseFloat(form.monthly_salary) / 30)}/day</p>
              )}
            </div>
            <div className="col-span-2"><label className="label">Address</label><textarea className="input resize-none" rows={2} value={form.address} onChange={upd('address')} placeholder="Full address" /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : editing ? 'Update Worker' : 'Add Worker'}</button>
          </div>
        </form>
      </Modal>

      {/* Worker Detail */}
      <Modal open={!!detailWorker} onClose={() => { setDetailWorker(null); setDetailData(null) }} title=" " size="2xl">
        {detailData ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-surface-50 dark:bg-gray-800 rounded-xl">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-primary-100 flex-shrink-0">
                {getWorkerImage(detailWorker)
                  ? <img src={getWorkerImage(detailWorker)} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center text-primary-600 text-xl font-bold">{detailWorker?.name?.charAt(0)}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-surface-900 dark:text-gray-100">{detailWorker?.name}</div>
                <div className="text-sm text-surface-500">{detailWorker?.skill} · {detailWorker?.phone}</div>
                {detailWorker?.address && <div className="text-xs text-surface-400 mt-0.5 truncate">{detailWorker.address}</div>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setAdvModal(detailWorker)} className="btn-secondary text-xs">+ Advance</button>
                <button onClick={() => exportPDF(detailWorker, detailData)} className="btn-secondary text-xs">
                  <IC d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                ['Jobs', detailData.assignments.length, 'text-primary-600'],
                ['Completed', detailData.assignments.filter(a => a.status === 'COMPLETED').length, 'text-green-600'],
                ['Earned', fmt(detailData.assignments.filter(a => a.status === 'COMPLETED').reduce((s, a) => s + a.commission * a.quantity, 0)), 'text-amber-600'],
                ['Advances', fmt((detailData.advances || []).reduce((s, a) => s + parseFloat(a.amount), 0)), 'text-purple-600'],
              ].map(([l, v, c]) => (
                <div key={l} className="card p-3 text-center">
                  <div className={`font-bold text-base ${c}`}>{v}</div>
                  <div className="text-xs text-surface-400 uppercase tracking-wide mt-0.5">{l}</div>
                </div>
              ))}
            </div>

            <Tabs active={detailTab} onChange={setDetailTab} tabs={[
              { id: 'jobs', label: 'Jobs & Payments' },
              { id: 'advances', label: `Advances (${(detailData.advances || []).length})` },
            ]} />

            {detailTab === 'jobs' && (
              <div className="overflow-x-auto border border-surface-200 dark:border-gray-700 rounded-xl">
                <table className="w-full">
                  <thead className="bg-surface-50 dark:bg-gray-800">
                    <tr>{['Product', 'Qty', 'Commission', 'Status', 'Payment', 'Date', ''].map(h => <th key={h} className="table-th">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                    {detailData.assignments.length === 0
                      ? <tr><td colSpan={7} className="table-td text-center text-surface-400 py-6 text-sm">No assignments yet</td></tr>
                      : detailData.assignments.map(a => (
                        <tr key={a.id} className="table-row">
                          <td className="table-td font-medium text-sm">{a.custom_product_name || a.product_name_db || '—'}</td>
                          <td className="table-td text-sm">{a.quantity}</td>
                          <td className="table-td font-semibold text-sm">{fmt(a.commission * a.quantity)}</td>
                          <td className="table-td"><StatusBadge status={a.status} /></td>
                          <td className="table-td">
                            {a.is_paid ? <span className="badge badge-green text-xs">Paid</span>
                              : a.status === 'COMPLETED' ? <span className="badge badge-red text-xs">Unpaid</span>
                              : <span className="badge badge-gray text-xs">N/A</span>}
                          </td>
                          <td className="table-td text-xs text-surface-400">{fmtDate(a.created_at)}</td>
                          <td className="table-td">
                            {a.status === 'COMPLETED' && !a.is_paid && (
                              <button onClick={() => { setPayModal(a); setPayAmount(String(a.commission * a.quantity)); setPayType('FULL') }}
                                className="btn-primary text-xs !py-1 !px-2.5 !min-h-0">Pay</button>
                            )}
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )}

            {detailTab === 'advances' && (
              <div className="space-y-2">
                {(detailData.advances || []).length === 0
                  ? <p className="text-center text-surface-400 py-6 text-sm">No advances recorded</p>
                  : (detailData.advances || []).map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 card">
                      <div>
                        <div className="font-semibold text-sm">{fmt(a.amount)} given</div>
                        <div className="text-xs text-surface-400">{fmtDate(a.payment_date)}{a.note ? ` · ${a.note}` : ''}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-surface-400">Remaining</div>
                          <div className={`font-bold text-sm ${parseFloat(a.remaining) > 0 ? 'text-red-500' : 'text-green-600'}`}>{fmt(a.remaining)}</div>
                        </div>
                        <button onClick={() => { setEditAdvModal(a); setEditAdvAmt(String(a.remaining)) }} className="btn-ghost p-1.5">
                          <IC d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        ) : <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}
      </Modal>

      {/* Pay Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Record Payment" size="sm">
        {payModal && <div className="space-y-4">
          <div className="bg-surface-50 dark:bg-gray-800 rounded-xl p-4">
            <div className="font-semibold text-sm">{payModal.custom_product_name || payModal.product_name_db}</div>
            <div className="text-xs text-surface-400 mt-0.5">Commission: {fmt(payModal.commission * payModal.quantity)}</div>
          </div>
          <div><label className="label">Payment Type</label>
            <select className="input" value={payType} onChange={e => { setPayType(e.target.value); if (e.target.value === 'FULL') setPayAmount(String(payModal.commission * payModal.quantity)) }}>
              <option value="FULL">Full Payment</option>
              <option value="PARTIAL">Partial Payment</option>
            </select>
          </div>
          <div><label className="label">Amount (₹)</label><input className="input" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} min="1" /></div>
          <div className="flex gap-3">
            <button onClick={() => setPayModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={() => handlePayJob(payModal)} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Confirm'}</button>
          </div>
        </div>}
      </Modal>

      {/* Advance Modal */}
      <Modal open={!!advModal} onClose={() => setAdvModal(null)} title="Record Advance" size="sm">
        <div className="space-y-4">
          <div><label className="label">Advance Amount (₹)</label><input className="input" type="number" value={advAmount} onChange={e => setAdvAmount(e.target.value)} placeholder="1000" min="1" /></div>
          <div><label className="label">Note (optional)</label><input className="input" value={advNote} onChange={e => setAdvNote(e.target.value)} placeholder="Reason for advance" /></div>
          <div className="flex gap-3">
            <button onClick={() => setAdvModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleAddAdvance} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Record Advance'}</button>
          </div>
        </div>
      </Modal>

      {/* Edit Advance Modal */}
      <Modal open={!!editAdvModal} onClose={() => setEditAdvModal(null)} title="Update Advance" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-500">Original: {fmt(editAdvModal?.amount)} · Update remaining (reduce if worker repaid)</p>
          <div><label className="label">Remaining Balance (₹)</label><input className="input" type="number" value={editAdvAmt} onChange={e => setEditAdvAmt(e.target.value)} min="0" /></div>
          <div className="flex gap-3">
            <button onClick={() => setEditAdvModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleEditAdvance} disabled={saving} className="btn-primary flex-1 justify-center">Update</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={handleDelete}
        title="Deactivate Worker" message="Worker will be marked inactive. All payment history is preserved."
        confirmLabel="Deactivate" loading={deleting}
      />
    </div>
  )
}
