import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import {
  Modal,
  LoadingPage,
  StatusBadge,
  PageHeader,
  Tabs,
  fmt,
  fmtDate,
  fmtDateTime,
  FormSection,
} from '../../components/ui'
import { useToast } from '../../components/ui'

const emptyForm = {
  worker_id: '',
  product_id: '',
  custom_product_name: '',
  quantity: 1,
  commission: '',
  due_date: '',
  notes: '',
}

export default function AssignWork() {
  const toast = useToast()
  const [assignments, setAssignments] = useState([])
  const [workers, setWorkers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('assigned')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(null)
  const [useCustom, setUseCustom] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api.get('/work-assignments')
      setAssignments(r.data)
    } catch {
      toast('Failed to load', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
    Promise.all([api.get('/workers'), api.get('/products')])
      .then(([w, p]) => {
        setWorkers(w.data)
        setProducts(p.data)
      })
      .catch(console.error)
  }, [load])

  const handleProductChange = (productId) => {
    const product = products.find((item) => item.id === parseInt(productId, 10))
    setForm((prev) => ({
      ...prev,
      product_id: productId,
      commission: product ? String(product.commission) : prev.commission,
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/work-assignments', {
        worker_id: parseInt(form.worker_id, 10),
        product_id: useCustom ? null : form.product_id ? parseInt(form.product_id, 10) : null,
        custom_product_name: useCustom ? form.custom_product_name : null,
        quantity: parseInt(form.quantity, 10),
        commission: parseFloat(form.commission) || 0,
        due_date: form.due_date || null,
        notes: form.notes || null,
      })
      toast('Work assigned successfully')
      setModal(false)
      setForm(emptyForm)
      setUseCustom(false)
      load()
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to assign', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkDone = async (id) => {
    if (completing === id) return
    setCompleting(id)
    try {
      await api.put(`/work-assignments/${id}`, {
        status: 'COMPLETED',
        completed_date: new Date().toISOString().split('T')[0],
      })
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === id
            ? {
                ...assignment,
                status: 'COMPLETED',
                completed_date: new Date().toISOString().split('T')[0],
              }
            : assignment,
        ),
      )
      toast('Marked as completed')
    } catch {
      toast('Failed to update status', 'error')
    } finally {
      setCompleting(null)
    }
  }

  const assigned = assignments.filter((assignment) => assignment.status !== 'COMPLETED')
  const completed = assignments.filter((assignment) => assignment.status === 'COMPLETED')
  const displayed = tab === 'assigned' ? assigned : completed

  const paymentBadge = (assignment) => {
    if (!assignment.is_paid && assignment.status !== 'COMPLETED') return null
    if (assignment.is_paid) return <span className="badge-green">Paid</span>
    return <span className="badge-red">Unpaid</span>
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Work Assignments"
        subtitle={`${assigned.length} active | ${completed.length} completed`}
        action={
          <button
            onClick={() => {
              setForm(emptyForm)
              setUseCustom(false)
              setModal(true)
            }}
            className="btn-primary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Assign Work
          </button>
        }
      />

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'assigned', label: 'Assigned', count: assigned.length },
          { id: 'completed', label: 'Completed', count: completed.length },
        ]}
      />

      {displayed.length === 0 ? (
        <div className="list-shell">
          <div className="py-14 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="font-semibold text-slate-600 dark:text-slate-200 mb-1">
              {tab === 'assigned' ? 'No active assignments' : 'No completed assignments'}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-300 mb-4">
              {tab === 'assigned'
                ? 'Assign work to workers to get started.'
                : 'Completed jobs will appear here.'}
            </p>
            {tab === 'assigned' ? (
              <button onClick={() => setModal(true)} className="btn-primary">
                Assign Work
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map((assignment) => (
            <div key={assignment.id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {assignment.worker_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                      {assignment.worker_name}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-300 truncate">
                      {assignment.assigned_by_name}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={assignment.status} />
                  {paymentBadge(assignment)}
                </div>
              </div>

              <div className="form-section" style={{ padding: 14 }}>
                <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  {assignment.custom_product_name || assignment.product_name_db || 'Custom Item'}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-300">
                  <span>
                    Qty: <strong className="text-slate-700 dark:text-slate-100">{assignment.quantity}</strong>
                  </span>
                  <span>
                    Commission:{' '}
                    <strong className="text-green-600">
                      {fmt(assignment.commission * assignment.quantity)}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-400 dark:text-slate-300">
                <div>Assigned: {fmtDateTime(assignment.created_at)}</div>
                {assignment.due_date ? <div>Due: {fmtDate(assignment.due_date)}</div> : null}
                {assignment.status === 'COMPLETED' && assignment.completed_date ? (
                  <div className="text-green-600">Completed: {fmtDate(assignment.completed_date)}</div>
                ) : null}
                {assignment.is_paid && assignment.paid_date ? (
                  <div className="text-primary-600">Paid: {fmtDate(assignment.paid_date)}</div>
                ) : null}
              </div>

              {assignment.notes ? (
                <p className="text-xs text-slate-400 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-2">
                  {assignment.notes}
                </p>
              ) : null}

              {assignment.status !== 'COMPLETED' ? (
                <button
                  onClick={() => handleMarkDone(assignment.id)}
                  disabled={completing === assignment.id}
                  className="btn-success mt-auto"
                >
                  {completing === assignment.id ? 'Updating...' : 'Mark as Done'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => {
          setModal(false)
          setForm(emptyForm)
          setUseCustom(false)
        }}
        title="Assign Work to Worker"
        subtitle="Manager forms now use the same rounded section layout as the admin product form."
        size="lg"
      >
        <form onSubmit={handleSave} className="form-shell">
          <FormSection title="Worker and Product">
            <div>
              <label className="label">Worker *</label>
              <select
                className="input"
                value={form.worker_id}
                onChange={(e) => setForm((prev) => ({ ...prev, worker_id: e.target.value }))}
                required
              >
                <option value="">Select worker...</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name} - {worker.skill || 'General'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Product *</label>
                <button
                  type="button"
                  onClick={() => {
                    setUseCustom(!useCustom)
                    setForm((prev) => ({
                      ...prev,
                      product_id: '',
                      custom_product_name: '',
                    }))
                  }}
                  className="btn-ghost"
                  style={{ minHeight: 28, padding: '6px 10px' }}
                >
                  {useCustom ? 'Use product list' : 'Custom product'}
                </button>
              </div>

              {useCustom ? (
                <input
                  className="input"
                  value={form.custom_product_name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, custom_product_name: e.target.value }))
                  }
                  required={useCustom}
                  placeholder="Enter custom product name"
                />
              ) : (
                <select
                  className="input"
                  value={form.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  required={!useCustom}
                >
                  <option value="">Select product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (INR {product.commission} commission)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </FormSection>

          <FormSection title="Assignment Details">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        quantity: Math.max(1, prev.quantity - 1),
                      }))
                    }
                    className="btn-secondary"
                    style={{ width: 42, paddingInline: 0 }}
                  >
                    -
                  </button>
                  <input
                    className="input text-center"
                    type="number"
                    value={form.quantity}
                    min={1}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, quantity: prev.quantity + 1 }))}
                    className="btn-secondary"
                    style={{ width: 42, paddingInline: 0 }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Commission / piece (INR)</label>
                <input
                  className="input"
                  type="number"
                  value={form.commission}
                  min={0}
                  onChange={(e) => setForm((prev) => ({ ...prev, commission: e.target.value }))}
                  placeholder="500"
                />
                {form.commission && form.quantity > 1 ? (
                  <p className="text-xs text-green-600 mt-2 font-semibold">
                    Total: {fmt(parseFloat(form.commission) * form.quantity)}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="label">Due Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Special instructions..."
              />
            </div>
          </FormSection>

          <div className="form-actions">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
              {saving ? 'Assigning...' : 'Assign Work'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
