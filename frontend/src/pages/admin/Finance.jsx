import { useState, useEffect, useCallback, useRef } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../../utils/api'
import { LoadingPage, StatusBadge, PageHeader, Tabs, fmt, fmtDate } from '../../components/ui'
import { useToast } from '../../components/ui'

const COLORS = ['#2563eb','#7c3aed','#10b981','#f59e0b','#ef4444','#06b6d4']

const CustomTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-900 text-white px-3 py-2 rounded-xl text-xs shadow-modal">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 100 ? fmt(p.value) : p.value}</p>)}
    </div>
  )
}

const emptyExpense = { title: '', category: 'OTHER', amount: '', date: new Date().toISOString().split('T')[0], notes: '' }

export default function AdminFinance() {
  const toast = useToast()
  const printRef = useRef(null)
  const [summary, setSummary] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [workerPayments, setWorkerPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [expModal, setExpModal] = useState(false)
  const [expForm, setExpForm] = useState(emptyExpense)
  const [saving, setSaving] = useState(false)
  const [workerDetail, setWorkerDetail] = useState(null)
  const [workerJobs, setWorkerJobs] = useState([])
  const [payModal, setPayModal] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [advModal, setAdvModal] = useState(null)
  const [advAmount, setAdvAmount] = useState('')
  const [dateFilter, setDateFilter] = useState('monthly')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const getDateRange = useCallback(() => {
    const now = new Date()
    const fmt = d => d.toISOString().split('T')[0]
    if (dateFilter === 'weekly') {
      const start = new Date(now); start.setDate(now.getDate() - 7)
      return { from: fmt(start), to: fmt(now) }
    }
    if (dateFilter === 'monthly') {
      return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) }
    }
    if (dateFilter === 'yearly') {
      return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: fmt(now) }
    }
    if (dateFilter === '6months') {
      const start = new Date(now); start.setMonth(now.getMonth() - 6)
      return { from: fmt(start), to: fmt(now) }
    }
    return { from: customFrom, to: customTo }
  }, [dateFilter, customFrom, customTo])

  const loadAll = useCallback(async () => {
    const range = getDateRange()
    if (dateFilter === 'custom' && (!customFrom || !customTo)) return
    setLoading(true)
    try {
      const [sumRes, expRes, wpRes] = await Promise.all([
        api.get('/finance/summary', { params: range }),
        api.get('/finance/expenses', { params: range }),
        api.get('/finance/workers-payment')
      ])
      setSummary(sumRes.data)
      setExpenses(expRes.data)
      setWorkerPayments(wpRes.data)
    } catch (err) { toast('Load failed', 'error') }
    finally { setLoading(false) }
  }, [getDateRange, dateFilter, customFrom, customTo])

  useEffect(() => { loadAll() }, [loadAll])

  const openWorkerDetail = async (w) => {
    setWorkerDetail(w)
    const r = await api.get('/work-assignments', { params: { worker_id: w.id } })
    setWorkerJobs(r.data)
  }

  const handleAddExpense = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/finance/expenses', expForm)
      toast('Expense added')
      setExpModal(false); setExpForm(emptyExpense)
      loadAll()
    } catch { toast('Failed', 'error') }
    finally { setSaving(false) }
  }

  const handlePayWorker = async (job) => {
    if (!payAmount) return
    setSaving(true)
    try {
      const amount = parseFloat(payAmount)
      const expected = job.commission * job.quantity
      const isPartial = amount < expected
      await api.post(`/work-assignments/${job.id}/pay`, {
        amount,
        payment_type: isPartial ? 'PARTIAL' : 'FULL',
        notes: isPartial ? `Partial payment. Remaining: ${fmt(expected - amount)}` : ''
      })
      toast(isPartial ? 'Partial payment recorded' : 'Payment recorded ✓')
      setPayModal(null); setPayAmount('')
      if (workerDetail) {
        const r = await api.get('/work-assignments', { params: { worker_id: workerDetail.id } })
        setWorkerJobs(r.data)
      }
      loadAll()
    } catch { toast('Payment failed', 'error') }
    finally { setSaving(false) }
  }

  const handleAdvance = async () => {
    if (!advAmount || !advModal) return
    setSaving(true)
    try {
      await api.post('/finance/advance', { worker_id: advModal.id, amount: parseFloat(advAmount), payment_date: new Date().toISOString().split('T')[0] })
      toast('Advance payment recorded')
      setAdvModal(null); setAdvAmount('')
      loadAll()
    } catch { toast('Failed', 'error') }
    finally { setSaving(false) }
  }

  // PDF export
  const exportPDF = () => {
    const range = getDateRange()
    const w = window.open('', '_blank')
    const totalSales = summary?.sales?.total || 0
    const totalExp = summary?.expenses?.total || 0
    const profit = totalSales - totalExp

    w.document.write(`<!DOCTYPE html><html><head><title>Finance Report</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#1e293b;max-width:900px;margin:0 auto}
      h1{color:#2563eb;font-size:28px;margin-bottom:4px}
      .subtitle{color:#64748b;font-size:14px;margin-bottom:32px}
      .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}
      .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px}
      .card-val{font-size:22px;font-weight:800;color:#1e293b}
      .card-lbl{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-top:4px}
      table{width:100%;border-collapse:collapse;margin-top:24px}
      th{background:#f1f5f9;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.05em}
      td{padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px}
      .badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600}
      .green{background:#f0fdf4;color:#15803d}.red{background:#fef2f2;color:#b91c1c}.yellow{background:#fffbeb;color:#b45309}
      @media print{body{padding:16px}}
    </style></head><body>
    <h1>Finance Report</h1>
    <div class="subtitle">Period: ${range.from} to ${range.to} · Generated: ${new Date().toLocaleString('en-IN')}</div>
    <div class="cards">
      <div class="card"><div class="card-val">₹${Number(totalSales).toLocaleString('en-IN')}</div><div class="card-lbl">Total Sales</div></div>
      <div class="card"><div class="card-val">₹${Number(summary?.sales?.received || 0).toLocaleString('en-IN')}</div><div class="card-lbl">Received</div></div>
      <div class="card"><div class="card-val">₹${Number(totalExp).toLocaleString('en-IN')}</div><div class="card-lbl">Expenses</div></div>
      <div class="card"><div class="card-val" style="color:${profit>=0?'#15803d':'#b91c1c'}">₹${Number(profit).toLocaleString('en-IN')}</div><div class="card-lbl">Net Profit</div></div>
    </div>
    <h2 style="font-size:18px;margin-bottom:12px">Expense Details</h2>
    <table>
      <thead><tr><th>Title</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead>
      <tbody>${expenses.map(e => `
        <tr><td>${e.title}</td><td>${e.category}</td><td>₹${Number(e.amount).toLocaleString('en-IN')}</td><td>${new Date(e.date).toLocaleDateString('en-IN')}</td></tr>
      `).join('')}</tbody>
    </table>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 600)
  }

  const monthlyData = (summary?.monthlySales || []).map(s => {
    const exp = (summary?.monthlyExpenses || []).find(e => e.month === s.month)
    return { month: s.month, Sales: parseFloat(s.sales || 0), Expenses: parseFloat(exp?.expenses || 0) }
  })

  const expByCategory = (summary?.expenses?.byCategory || []).map(e => ({ name: e.category, value: parseFloat(e.total_expenses || 0) }))

  if (loading && !summary) return <LoadingPage />

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Finance"
        subtitle="Revenue, expenses and worker payments"
        action={
          <div className="flex flex-wrap gap-2">
            <button onClick={exportPDF} className="btn-secondary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export PDF
            </button>
            <button onClick={() => { setExpForm(emptyExpense); setExpModal(true) }} className="btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Expense
            </button>
          </div>
        }
      />

      {/* Date Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {[['weekly','Weekly'],['monthly','Monthly'],['6months','6 Months'],['yearly','Yearly'],['custom','Custom']].map(([id, label]) => (
          <button key={id} onClick={() => setDateFilter(id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all min-h-[40px] ${dateFilter === id ? 'bg-primary-500 text-white shadow-blue' : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'}`}>
            {label}
          </button>
        ))}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" className="input py-2 text-sm" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-surface-400">→</span>
            <input type="date" className="input py-2 text-sm" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            <button onClick={loadAll} className="btn-primary py-2 px-4 text-sm">Apply</button>
          </div>
        )}
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'workers',  label: 'Worker Payments' },
        { id: 'expenses', label: 'All Expenses' },
      ]} />

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Sales',    value: fmt(summary?.sales?.total),    color: 'text-primary-600',   bg: 'bg-primary-50' },
              { label: 'Received',       value: fmt(summary?.sales?.received), color: 'text-green-600',     bg: 'bg-green-50' },
              { label: 'Total Expenses', value: fmt(summary?.expenses?.total), color: 'text-red-500',       bg: 'bg-red-50' },
              { label: 'Net Profit',     value: fmt(summary?.profit),          color: (summary?.profit||0) >= 0 ? 'text-green-600' : 'text-red-500', bg: (summary?.profit||0) >= 0 ? 'bg-green-50' : 'bg-red-50' },
            ].map(item => (
              <div key={item.label} className={`card p-5 ${item.bg} border-transparent`}>
                <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-xs font-semibold text-surface-500 uppercase tracking-wide mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="card p-5 lg:col-span-2">
              <h3 className="section-title mb-4">Sales vs Expenses</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} margin={{ left: -15, right: 5 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="Sales" fill="#2563eb" radius={[6,6,0,0]} maxBarSize={28} />
                  <Bar dataKey="Expenses" fill="#7c3aed" radius={[6,6,0,0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-5">
              <h3 className="section-title mb-4">Expense Breakdown</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={expByCategory} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {expByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === 'workers' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="table-th">Worker</th>
                  <th className="table-th">Jobs</th>
                  <th className="table-th">Total Earned</th>
                  <th className="table-th">Paid</th>
                  <th className="table-th">Pending</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {workerPayments.map(w => (
                  <tr key={w.id} className="hover:bg-surface-50 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0">{w.name.charAt(0)}</div>
                        <div>
                          <div className="font-semibold text-surface-900 text-sm">{w.name}</div>
                          <div className="text-xs text-surface-400">{w.skill || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-center">{w.total_assignments}</td>
                    <td className="table-td font-semibold">{fmt(w.total_earned)}</td>
                    <td className="table-td text-green-600 font-semibold">{fmt(w.total_paid)}</td>
                    <td className="table-td">
                      {parseFloat(w.pending_payment) > 0
                        ? <span className="font-bold text-amber-600">{fmt(w.pending_payment)}</span>
                        : <span className="text-surface-300">—</span>}
                    </td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button onClick={() => openWorkerDetail(w)} className="btn-secondary !py-1.5 !px-3 text-xs">View Jobs</button>
                        <button onClick={() => { setAdvModal(w); setAdvAmount('') }} className="btn-purple !py-1.5 !px-3 text-xs">Advance</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {workerPayments.length === 0 && (
                  <tr><td colSpan={6} className="table-td text-center text-surface-400 py-8">No workers found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 p-3">
            {workerPayments.map(w => (
              <div key={w.id} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center font-bold">{w.name.charAt(0)}</div>
                    <div>
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-xs text-surface-400">{w.skill}</div>
                    </div>
                  </div>
                  {parseFloat(w.pending_payment) > 0 && <span className="badge badge-yellow">{fmt(w.pending_payment)}</span>}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-surface-50 rounded-lg p-2"><div className="font-bold text-sm">{w.total_assignments}</div><div className="text-xs text-surface-400">Jobs</div></div>
                  <div className="bg-green-50 rounded-lg p-2"><div className="font-bold text-sm text-green-600">{fmt(w.total_paid)}</div><div className="text-xs text-surface-400">Paid</div></div>
                  <div className="bg-amber-50 rounded-lg p-2"><div className="font-bold text-sm text-amber-600">{fmt(w.pending_payment)}</div><div className="text-xs text-surface-400">Due</div></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openWorkerDetail(w)} className="btn-secondary flex-1 text-sm !py-2">View Jobs</button>
                  <button onClick={() => { setAdvModal(w); setAdvAmount('') }} className="btn-purple flex-1 text-sm !py-2">Advance</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'expenses' && (
        <div className="card overflow-hidden">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="table-th">Title</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Added By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-surface-50">
                    <td className="table-td font-medium">{e.title}</td>
                    <td className="table-td"><StatusBadge status={e.category} /></td>
                    <td className="table-td font-semibold text-red-500">{fmt(e.amount)}</td>
                    <td className="table-td text-xs text-surface-400">{fmtDate(e.date)}</td>
                    <td className="table-td text-surface-500 text-xs">{e.created_by_name || '—'}</td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={5} className="table-td text-center text-surface-400 py-8">No expenses recorded</td></tr>}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="sm:hidden space-y-3 p-3">
            {expenses.map(e => (
              <div key={e.id} className="card p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="font-semibold text-surface-900 text-sm">{e.title}</div>
                  <div className="font-bold text-red-500">{fmt(e.amount)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={e.category} />
                  <span className="text-xs text-surface-400">{fmtDate(e.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Worker Detail Drawer */}
      {workerDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setWorkerDetail(null); setWorkerJobs([]) }} />
          <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="section-title">{workerDetail.name}</h3>
                <p className="text-xs text-surface-400">Pending: <span className="text-amber-600 font-bold">{fmt(workerDetail.pending_payment)}</span></p>
              </div>
              <button onClick={() => { setWorkerDetail(null); setWorkerJobs([]) }} className="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-3">
                {workerJobs.map(j => (
                  <div key={j.id} className="card p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{j.custom_product_name || j.product_name_db}</div>
                      <div className="text-xs text-surface-400 mt-0.5">Qty: {j.quantity} · Commission: {fmt(j.commission * j.quantity)}</div>
                      <div className="text-xs text-surface-400">{fmtDate(j.created_at)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <StatusBadge status={j.status} />
                      {j.is_paid
                        ? <span className="badge badge-green text-xs">Paid {j.paid_date ? fmtDate(j.paid_date) : ''}</span>
                        : j.status === 'COMPLETED'
                          ? <button onClick={() => { setPayModal(j); setPayAmount(String(j.commission * j.quantity)) }}
                              className="btn-primary !py-1 !px-3 text-xs">Pay Now</button>
                          : <span className="badge badge-gray text-xs">Pending Work</span>
                      }
                    </div>
                  </div>
                ))}
                {workerJobs.length === 0 && <p className="text-center text-surface-400 py-8">No assignments</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal-box sm:max-w-sm">
            <div className="p-6">
              <h3 className="section-title mb-4">Record Payment</h3>
              <div className="space-y-3 mb-5">
                <div className="bg-surface-50 rounded-xl p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-surface-500">Job:</span><span className="font-semibold">{payModal.custom_product_name || payModal.product_name_db}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Expected:</span><span className="font-semibold">{fmt(payModal.commission * payModal.quantity)}</span></div>
                </div>
                <div>
                  <label className="label">Amount to Pay (₹)</label>
                  <input className="input text-lg font-bold" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} min={0} autoFocus />
                  {payAmount && parseFloat(payAmount) < payModal.commission * payModal.quantity && (
                    <p className="text-xs text-amber-600 mt-1 font-semibold">⚠ Partial payment — remaining: {fmt((payModal.commission * payModal.quantity) - parseFloat(payAmount))}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPayModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => handlePayWorker(payModal)} disabled={saving || !payAmount}
                  className="btn-primary flex-1">{saving ? 'Processing...' : 'Confirm Payment'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advance Payment Modal */}
      {advModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAdvModal(null)}>
          <div className="modal-box sm:max-w-sm">
            <div className="p-6">
              <h3 className="section-title mb-1">Advance Payment</h3>
              <p className="text-sm text-surface-400 mb-5">For: <strong>{advModal.name}</strong></p>
              <div>
                <label className="label">Advance Amount (₹)</label>
                <input className="input text-lg font-bold" type="number" value={advAmount} onChange={e => setAdvAmount(e.target.value)} min={0} autoFocus />
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setAdvModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAdvance} disabled={saving || !advAmount}
                  className="btn-purple flex-1">{saving ? 'Processing...' : 'Record Advance'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {expModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setExpModal(false)}>
          <div className="modal-box sm:max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h3 className="section-title">Add Expense</h3>
              <button onClick={() => setExpModal(false)} className="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleAddExpense} className="p-5 space-y-4">
              <div><label className="label">Title *</label><input className="input" value={expForm.title} onChange={e => setExpForm(p=>({...p,title:e.target.value}))} required placeholder="e.g. Electricity bill" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Category</label><select className="input" value={expForm.category} onChange={e => setExpForm(p=>({...p,category:e.target.value}))}>{['MATERIAL','SALARY','UTILITIES','TRANSPORT','OTHER'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="label">Amount (₹) *</label><input className="input" type="number" value={expForm.amount} onChange={e => setExpForm(p=>({...p,amount:e.target.value}))} required min={0} /></div>
                <div><label className="label">Date *</label><input className="input" type="date" value={expForm.date} onChange={e => setExpForm(p=>({...p,date:e.target.value}))} required /></div>
              </div>
              <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={expForm.notes} onChange={e => setExpForm(p=>({...p,notes:e.target.value}))} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setExpModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Add Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
