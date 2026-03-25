import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import {
  LoadingPage,
  fmt,
  fmtDate,
  Modal,
  useToast,
  PageHeader,
  Tabs,
  StatCard,
  FormSection,
} from '../../components/ui'

const PERIODS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: '3m', label: '3 Months' },
  { id: '6m', label: '6 Months' },
  { id: 'year', label: 'Year' },
  { id: 'custom', label: 'Custom' },
]

function getRange(period) {
  const now = new Date()
  const to = now.toISOString().split('T')[0]
  let from
  if (period === 'week') from = new Date(now - 7 * 864e5).toISOString().split('T')[0]
  if (period === 'month')
    from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  if (period === '3m') from = new Date(now - 90 * 864e5).toISOString().split('T')[0]
  if (period === '6m') from = new Date(now - 180 * 864e5).toISOString().split('T')[0]
  if (period === 'year') from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  return { from: from || to, to }
}

export default function Finance() {
  const toast = useToast()
  const [tab, setTab] = useState('payments')
  const [period, setPeriod] = useState('month')
  const [custom, setCustom] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  })
  const [summary, setSummary] = useState(null)
  const [jobs, setJobs] = useState([])
  const [advances, setAdvances] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [payModal, setPayModal] = useState(null)
  const [payAmt, setPayAmt] = useState('')
  const [saving, setSaving] = useState(false)
  const [advModal, setAdvModal] = useState(false)
  const [advForm, setAdvForm] = useState({
    worker_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    note: '',
  })
  const [editAdv, setEditAdv] = useState(null)

  const loadAll = useCallback(async (selectedPeriod, customRange) => {
    setLoading(true)
    const range = selectedPeriod === 'custom' ? customRange : getRange(selectedPeriod)
    try {
      const [summaryRes, jobsRes, advancesRes, workersRes] = await Promise.allSettled([
        api.get('/finance/summary', { params: range }),
        api.get('/finance/workers-payment'),
        api.get('/finance/advances'),
        api.get('/workers'),
      ])

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data)
      if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value.data)
      if (advancesRes.status === 'fulfilled') setAdvances(advancesRes.value.data)
      if (workersRes.status === 'fulfilled') setWorkers(workersRes.value.data)

      if (jobsRes.status === 'rejected') console.error('workers-payment:', jobsRes.reason?.response?.data?.error)
      if (advancesRes.status === 'rejected') console.error('advances:', advancesRes.reason?.response?.data?.error)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll(period, custom)
  }, [period, custom, loadAll])

  const reload = () => loadAll(period, custom)

  const handlePay = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await api.post(`/finance/pay-job/${payModal.id}`, {
        amount: parseFloat(payAmt),
      })
      const paid = parseFloat(response.data?.paid || payAmt || 0)
      const remaining = parseFloat(response.data?.remaining || 0)
      toast(remaining > 0 ? `Paid ${fmt(paid)} | ${fmt(remaining)} still pending` : 'Paid in full!')
      setPayModal(null)
      reload()
    } catch (err) {
      toast(err.response?.data?.error || 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAdvance = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/finance/advance', advForm)
      toast('Advance recorded')
      setAdvModal(false)
      setAdvForm({
        worker_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        note: '',
      })
      reload()
    } catch (err) {
      toast(err.response?.data?.error || 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEditAdv = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/finance/advance/${editAdv.id}`, editAdv)
      toast('Updated')
      setEditAdv(null)
      reload()
    } catch {
      toast('Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const unpaid = jobs.filter((job) => parseFloat(job.remaining || 0) > 0)
  const paid = jobs.filter((job) => parseFloat(job.remaining || 0) <= 0 && job.is_paid)
  const totalPending = unpaid.reduce(
    (sum, job) => sum + parseFloat(job.remaining || job.total_commission || 0),
    0,
  )

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Finance"
        subtitle="Financial overview and worker payments"
      />

      <div className="flex gap-2 flex-wrap items-center">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPeriod(item.id)}
            className={`filter-pill ${period === item.id ? 'active' : ''}`}
          >
            {item.label}
          </button>
        ))}
        {period === 'custom' ? (
          <div className="card-sm" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 10 }}>
            <input
              type="date"
              className="input"
              style={{ width: 'auto' }}
              value={custom.from}
              onChange={(e) => setCustom((prev) => ({ ...prev, from: e.target.value }))}
            />
            <span className="muted">to</span>
            <input
              type="date"
              className="input"
              style={{ width: 'auto' }}
              value={custom.to}
              onChange={(e) => setCustom((prev) => ({ ...prev, to: e.target.value }))}
            />
          </div>
        ) : null}
      </div>

      {summary ? (
        <div className="list-summary-grid">
          <StatCard label="Sales" value={fmt(summary.sales?.total || 0)} tone="primary" />
          <StatCard label="Received" value={fmt(summary.sales?.received || 0)} tone="success" />
          <StatCard label="Expenses" value={fmt(summary.expenses?.total || 0)} tone="danger" />
          <StatCard
            label="Profit"
            value={fmt((summary.sales?.total || 0) - (summary.expenses?.total || 0))}
            tone="secondary"
          />
          <StatCard label="Worker Due" value={fmt(totalPending)} tone="warning" />
        </div>
      ) : null}

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'payments', label: 'Worker Payments' },
          { id: 'advances', label: 'Advance Payments' },
        ]}
      />

      {tab === 'payments' ? (
        <div className="space-y-4">
          {unpaid.length > 0 ? (
            <div className="list-shell">
              <div className="list-toolbar">
                <div className="font-bold text-red-600">
                  Pending ({unpaid.length}) | Due: {fmt(totalPending)}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Worker', 'Job', 'Commission', 'Paid', 'Pending', 'Status', ''].map((h) => (
                        <th key={h} className="table-th">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unpaid.map((job) => (
                      <tr key={job.id} className="table-row">
                        <td className="table-td font-semibold">{job.worker_name}</td>
                        <td className="table-td text-xs text-slate-500 dark:text-slate-300">
                          {`${job.product_name} x ${job.quantity}`}
                        </td>
                        <td className="table-td">{fmt(job.total_commission)}</td>
                        <td className="table-td font-semibold text-green-600">{fmt(job.paid || 0)}</td>
                        <td className="table-td font-bold text-red-600">{fmt(job.remaining)}</td>
                        <td className="table-td">
                          {parseFloat(job.paid || 0) > 0 ? (
                            <span className="badge-yellow">Partial</span>
                          ) : (
                            <span className="badge-red">Unpaid</span>
                          )}
                        </td>
                        <td className="table-td">
                          <button
                            onClick={() => {
                              setPayModal(job)
                              setPayAmt(String(job.remaining))
                            }}
                            className="btn-primary"
                          >
                            Pay
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {paid.length > 0 ? (
            <div className="list-shell">
              <div className="list-toolbar">
                <div className="font-bold">Paid Jobs ({paid.length})</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Worker', 'Job', 'Commission', 'Date', 'Status'].map((h) => (
                        <th key={h} className="table-th">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paid.map((job) => (
                      <tr key={job.id} className="table-row">
                        <td className="table-td font-semibold">{job.worker_name}</td>
                        <td className="table-td text-xs">{`${job.product_name} x ${job.quantity}`}</td>
                        <td className="table-td font-semibold">{fmt(job.total_commission)}</td>
                        <td className="table-td text-xs text-slate-500 dark:text-slate-300">
                          {fmtDate(job.completed_date)}
                        </td>
                        <td className="table-td">
                          <span className="badge-green">Paid</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {jobs.length === 0 ? (
            <div className="list-shell">
              <div className="py-14 text-center text-slate-400 dark:text-slate-300">
                No completed jobs found
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="list-shell">
          <div
            className="list-toolbar"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
          >
            <span className="font-bold">Advance Payments</span>
            <button onClick={() => setAdvModal(true)} className="btn-primary">
              Add Advance
            </button>
          </div>

          {advances.length === 0 ? (
            <div className="py-14 text-center text-slate-400 dark:text-slate-300">
              No advance records
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Worker', 'Advance Taken', 'Remaining', 'Note', 'Date', ''].map((h) => (
                      <th key={h} className="table-th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {advances.map((advance) => (
                    <tr key={advance.id} className="table-row">
                      <td className="table-td font-semibold">{advance.worker_name}</td>
                      <td className="table-td font-semibold">{fmt(advance.amount)}</td>
                      <td className="table-td">
                        <span
                          className={
                            parseFloat(advance.remaining) > 0 ? 'badge-red' : 'badge-green'
                          }
                        >
                          {fmt(advance.remaining)}
                        </span>
                      </td>
                      <td className="table-td text-xs text-slate-500 dark:text-slate-300">
                        {advance.note || '-'}
                      </td>
                      <td className="table-td text-xs text-slate-500 dark:text-slate-300">
                        {fmtDate(advance.payment_date)}
                      </td>
                      <td className="table-td">
                        <button
                          onClick={() => setEditAdv({ ...advance })}
                          className="btn-secondary"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {payModal ? (
        <Modal
          open={!!payModal}
          onClose={() => setPayModal(null)}
          title="Pay Worker"
          subtitle="Confirm the amount being released for this completed job."
        >
          <form onSubmit={handlePay} className="form-shell">
            <FormSection title="Payment Summary">
              <div className="font-bold">{payModal.worker_name}</div>
              <div className="text-sm text-slate-500 dark:text-slate-300">
                {`${payModal.product_name} x ${payModal.quantity}`}
              </div>
              <div className="flex gap-4 flex-wrap text-sm">
                <span>
                  Total: <strong>{fmt(payModal.total_commission)}</strong>
                </span>
                <span className="text-green-600">
                  Paid: <strong>{fmt(payModal.paid || 0)}</strong>
                </span>
                <span className="text-red-600">
                  Pending: <strong>{fmt(payModal.remaining)}</strong>
                </span>
              </div>
            </FormSection>

            <FormSection title="Confirm Payment">
              <div>
                <label className="label">Amount to Pay (INR) *</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={payAmt}
                  onChange={(e) => setPayAmt(e.target.value)}
                  required
                  min={0.01}
                  placeholder="Enter amount"
                />
                {parseFloat(payAmt) > 0 &&
                parseFloat(payAmt) < parseFloat(payModal.remaining) ? (
                  <div className="text-xs font-semibold text-amber-600 mt-2">
                    Partial payment | {fmt(payModal.remaining - parseFloat(payAmt))} will remain pending
                  </div>
                ) : null}
              </div>
            </FormSection>

            <div className="form-actions">
              <button type="button" onClick={() => setPayModal(null)} className="btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? 'Processing...' : 'Confirm Pay'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      <Modal
        open={advModal}
        onClose={() => setAdvModal(false)}
        title="Record Advance"
        subtitle="Use the same rounded form treatment as the other admin forms."
      >
        <form onSubmit={handleAdvance} className="form-shell">
          <FormSection title="Advance Details">
            <div>
              <label className="label">Worker *</label>
              <select
                className="input"
                value={advForm.worker_id}
                onChange={(e) => setAdvForm((prev) => ({ ...prev, worker_id: e.target.value }))}
                required
              >
                <option value="">Select worker</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                    {worker.skill ? ` (${worker.skill})` : ''}
                  </option>
                ))}
              </select>
              {workers.length === 0 ? (
                <div className="text-xs text-red-500 mt-2">No workers loaded. Please refresh the page.</div>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount (INR) *</label>
                <input
                  className="input"
                  type="number"
                  value={advForm.amount}
                  onChange={(e) => setAdvForm((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                  min={1}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Date *</label>
                <input
                  className="input"
                  type="date"
                  value={advForm.payment_date}
                  onChange={(e) =>
                    setAdvForm((prev) => ({ ...prev, payment_date: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Note</label>
              <input
                className="input"
                value={advForm.note}
                onChange={(e) => setAdvForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Reason for advance..."
              />
            </div>
          </FormSection>

          <div className="form-actions">
            <button type="button" onClick={() => setAdvModal(false)} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
              {saving ? 'Saving...' : 'Record Advance'}
            </button>
          </div>
        </form>
      </Modal>

      {editAdv ? (
        <Modal
          open={!!editAdv}
          onClose={() => setEditAdv(null)}
          title={`Edit Advance - ${editAdv.worker_name}`}
          subtitle="Adjust the remaining balance once the worker repays part of the advance."
        >
          <form onSubmit={handleEditAdv} className="form-shell">
            <FormSection title="Advance Summary">
              <div className="text-sm">
                Total advance: <strong>{fmt(editAdv.amount)}</strong>
              </div>
            </FormSection>

            <FormSection title="Update Balance">
              <div>
                <label className="label">Remaining Amount (INR)</label>
                <p className="text-xs text-slate-500 dark:text-slate-300 mb-2">
                  Reduce this when the worker has paid back some amount.
                </p>
                <input
                  className="input"
                  type="number"
                  value={editAdv.remaining}
                  step="0.01"
                  onChange={(e) => setEditAdv((prev) => ({ ...prev, remaining: e.target.value }))}
                  required
                  min={0}
                  max={editAdv.amount}
                />
              </div>
              <div>
                <label className="label">Note</label>
                <input
                  className="input"
                  value={editAdv.note || ''}
                  onChange={(e) => setEditAdv((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Note"
                />
              </div>
            </FormSection>

            <div className="form-actions">
              <button type="button" onClick={() => setEditAdv(null)} className="btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}
