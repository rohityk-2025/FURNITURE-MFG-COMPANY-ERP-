import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import {
  Modal,
  LoadingPage,
  EmptyState,
  SearchBar,
  StatusBadge,
  fmt,
  fmtDate,
  useToast,
  Confirm,
  PageHeader,
  FormSection,
  StatCard,
  DetailGrid,
} from '../../components/ui'

const CATS = ['MATERIAL', 'UTILITIES', 'TRANSPORT', 'MAINTENANCE', 'RENT', 'OTHER']
const empty = {
  title: '',
  category: 'OTHER',
  amount: '',
  tax_pct: '',
  tax_amount: '',
  vendor_name: '',
  vendor_gst: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
}

function exportPDF(expenses) {
  const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
  const fmtM = (n) =>
    `Rs. ${parseFloat(n || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  const fmtD = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-'
  const byCat = CATS.map((cat) => ({
    cat,
    total: expenses
      .filter((expense) => expense.category === cat)
      .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0),
  })).filter((item) => item.total > 0)

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Expenses Report</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:20px}
  .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #dc2626;padding-bottom:10px;margin-bottom:14px}
  .title{font-size:18px;font-weight:800;color:#dc2626}.sub{font-size:11px;color:#64748b;margin-top:3px}
  .date-badge{background:#fef2f2;color:#dc2626;padding:5px 10px;border-radius:5px;font-weight:700;font-size:11px}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
  .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px}
  .sv{font-size:15px;font-weight:800}.sl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-top:1px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#dc2626;color:#fff;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase}
  td{padding:6px 8px;border-bottom:1px solid #f1f5f9}tr:nth-child(even) td{background:#fafafa}
  tfoot td{background:#fee2e2!important;border-top:2px solid #e2e8f0;font-weight:700}
  @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
  <div class="hdr">
    <div><div class="title">Expenses Report</div><div class="sub">WoodCraft ERP | ${fmtD(new Date())}</div></div>
    <div class="date-badge">Total: ${fmtM(total)}</div>
  </div>
  <div class="summary">
    <div class="card"><div class="sv">${expenses.length}</div><div class="sl">Total Entries</div></div>
    <div class="card"><div class="sv" style="color:#dc2626">${fmtM(total)}</div><div class="sl">Total Amount</div></div>
    ${byCat
      .slice(0, 2)
      .map((item) => `<div class="card"><div class="sv">${fmtM(item.total)}</div><div class="sl">${item.cat}</div></div>`)
      .join('')}
  </div>
  <table>
    <thead><tr><th>#</th><th>Title</th><th>Category</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Tax</th></tr></thead>
    <tbody>${expenses
      .map(
        (expense, index) =>
          `<tr><td>${index + 1}</td><td>${expense.title}</td><td>${expense.category}</td><td>${expense.vendor_name || '-'}</td><td>${fmtD(expense.date)}</td><td style="text-align:right;color:#dc2626;font-weight:600">${fmtM(expense.amount)}</td><td style="text-align:right">${expense.tax_amount ? fmtM(expense.tax_amount) : '-'}</td></tr>`,
      )
      .join('')}</tbody>
    <tfoot><tr><td colspan="5">TOTAL</td><td style="text-align:right;color:#dc2626">${fmtM(total)}</td><td></td></tr></tfoot>
  </table>
  </body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  setTimeout(() => {
    w.focus()
    w.print()
  }, 500)
}

function exportExcel(expenses) {
  const rows = [['Title', 'Category', 'Amount', 'Tax %', 'Tax Amount', 'Vendor', 'GST', 'Date', 'Description', 'Added By']]
  expenses.forEach((expense) =>
    rows.push([
      expense.title,
      expense.category,
      expense.amount,
      expense.tax_pct || '',
      expense.tax_amount || '',
      expense.vendor_name || '',
      expense.vendor_gst || '',
      expense.date,
      expense.description || expense.notes || '',
      expense.created_by_name || '',
    ]),
  )
  const csv = rows
    .map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Expenses_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function Expenses() {
  const toast = useToast()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editData, setEditData] = useState(null)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [catFilter, setCatFilter] = useState('')
  const [delConfirm, setDelConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/expenses')
      setExpenses(r.data)
    } catch {
      toast('Failed', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editData) await api.put(`/expenses/${editData.id}`, form)
      else await api.post('/expenses', form)
      toast(editData ? 'Expense updated' : 'Expense added')
      setModal(false)
      setEditData(null)
      setForm(empty)
      load()
    } catch (err) {
      toast(err.response?.data?.error || 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (expense) => {
    setEditData(expense)
    setForm({
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      tax_pct: expense.tax_pct || '',
      tax_amount: expense.tax_amount || '',
      vendor_name: expense.vendor_name || '',
      vendor_gst: expense.vendor_gst || '',
      description: expense.description || expense.notes || '',
      date: expense.date?.slice(0, 10) || new Date().toISOString().split('T')[0],
    })
    setModal(true)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/expenses/${delConfirm.id}`)
      toast('Expense removed')
      setDelConfirm(null)
      load()
    } catch {
      toast('Failed', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const calcTax = () => {
    if (form.amount && form.tax_pct) {
      setForm((prev) => ({
        ...prev,
        tax_amount: ((parseFloat(prev.amount) * parseFloat(prev.tax_pct)) / 100).toFixed(2),
      }))
    }
  }

  const filtered = expenses
    .filter(
      (expense) =>
        (!search ||
          expense.title?.toLowerCase().includes(search.toLowerCase()) ||
          expense.vendor_name?.toLowerCase().includes(search.toLowerCase())) &&
        (!catFilter || expense.category === catFilter),
    )
    .sort((a, b) =>
      sort === 'newest'
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at),
    )

  const total = filtered.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Expenses"
        subtitle={`${filtered.length} expenses | ${fmt(total)}`}
        action={
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => exportExcel(filtered)} className="btn-success">
              Export Excel
            </button>
            <button onClick={() => exportPDF(filtered)} className="btn-secondary">
              Export PDF
            </button>
            <button
              onClick={() => {
                setEditData(null)
                setForm(empty)
                setModal(true)
              }}
              className="btn-primary"
            >
              Add Expense
            </button>
          </div>
        }
      />

      <div className="list-summary-grid">
        <StatCard label="Total Expenses" value={filtered.length} tone="danger" />
        <StatCard label="Total Amount" value={fmt(total)} tone="danger" />
        <StatCard label="Categories" value={CATS.filter((cat) => filtered.some((expense) => expense.category === cat)).length} tone="secondary" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {CATS.filter((cat) => expenses.some((expense) => expense.category === cat)).map((cat) => {
          const amount = filtered
            .filter((expense) => expense.category === cat)
            .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCatFilter(catFilter === cat ? '' : cat)}
              className={`filter-pill ${catFilter === cat ? 'active' : ''}`}
            >
              {`${cat} | ${fmt(amount)}`}
            </button>
          )
        })}
      </div>

      <div className="list-shell">
        <div className="list-toolbar flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} placeholder="Search expenses..." />
          </div>
          <select className="input sm:w-48" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select className="input sm:w-40" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              </svg>
            }
            title="No expenses found"
            desc="Add your first expense record."
            action={
              <button
                onClick={() => {
                  setForm(empty)
                  setModal(true)
                }}
                className="btn-primary"
              >
                Add Expense
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Title', 'Category', 'Amount', 'Tax', 'Vendor', 'Date', 'By', ''].map((h) => (
                    <th key={h} className="table-th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr
                    key={expense.id}
                    className="table-row cursor-pointer"
                    onClick={() => setDetail(expense)}
                  >
                    <td className="table-td font-semibold">{expense.title}</td>
                    <td className="table-td">
                      <StatusBadge status={expense.category} />
                    </td>
                    <td className="table-td font-bold text-red-600">{fmt(expense.amount)}</td>
                    <td className="table-td text-xs text-slate-500 dark:text-slate-300">
                      {expense.tax_amount ? fmt(expense.tax_amount) : '-'}
                    </td>
                    <td className="table-td text-xs text-slate-500 dark:text-slate-300">
                      {expense.vendor_name || '-'}
                    </td>
                    <td className="table-td text-xs text-slate-500 dark:text-slate-300">
                      {fmtDate(expense.date)}
                    </td>
                    <td className="table-td text-xs text-slate-500 dark:text-slate-300">
                      {expense.created_by_name || '-'}
                    </td>
                    <td
                      className="table-td"
                      onClick={(ev) => {
                        ev.stopPropagation()
                      }}
                    >
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(expense)} className="btn-secondary">
                          Edit
                        </button>
                        <button onClick={() => setDelConfirm(expense)} className="btn-danger">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="table-td font-bold">
                    Total
                  </td>
                  <td className="table-td text-red-600 font-extrabold">{fmt(total)}</td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => {
          setModal(false)
          setEditData(null)
        }}
        title={editData ? 'Edit Expense' : 'Add Expense'}
        subtitle="Expense forms now use the same sectioned treatment as the product form."
        size="lg"
      >
        <form onSubmit={handleSave} className="form-shell">
          <FormSection title="Expense Information">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Title *</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  placeholder="e.g. Plywood purchase"
                />
              </div>
              <div>
                <label className="label">Category *</label>
                <select
                  className="input"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {CATS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Date *</label>
                <input
                  className="input"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Amount (INR) *</label>
                <input
                  className="input"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                  min={0}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Tax %</label>
                <input
                  className="input"
                  type="number"
                  value={form.tax_pct}
                  onChange={(e) => setForm((prev) => ({ ...prev, tax_pct: e.target.value }))}
                  onBlur={calcTax}
                  placeholder="18"
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <label className="label">Tax Amount (INR)</label>
                <input
                  className="input"
                  type="number"
                  value={form.tax_amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, tax_amount: e.target.value }))}
                  placeholder="Auto-calc"
                  min={0}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Vendor Details">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Vendor / Company</label>
                <input
                  className="input"
                  value={form.vendor_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, vendor_name: e.target.value }))}
                  placeholder="Sharma Timber"
                />
              </div>
              <div>
                <label className="label">Vendor GST</label>
                <input
                  className="input"
                  value={form.vendor_gst}
                  onChange={(e) => setForm((prev) => ({ ...prev, vendor_gst: e.target.value }))}
                  placeholder="27AABCU9603R1ZX"
                />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
          </FormSection>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setModal(false)
                setEditData(null)
              }}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
              {saving ? 'Saving...' : editData ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {detail ? (
        <Modal open={!!detail} onClose={() => setDetail(null)} title="Expense Details" size="md">
          <div className="form-shell">
            <FormSection title="Overview">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-bold text-base">{detail.title}</div>
                  <div className="mt-2">
                    <StatusBadge status={detail.category} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-red-600">{fmt(detail.amount)}</div>
                  {detail.tax_amount > 0 ? (
                    <div className="text-xs text-slate-500 dark:text-slate-300">
                      + {fmt(detail.tax_amount)} tax
                    </div>
                  ) : null}
                </div>
              </div>
            </FormSection>

            <FormSection title="Recorded Details">
              <DetailGrid
                items={[
                  ['Date', fmtDate(detail.date)],
                  ['Vendor', detail.vendor_name || '-'],
                  ['GST', detail.vendor_gst || '-'],
                  ['Added By', detail.created_by_name || '-'],
                  ['Description', detail.description || detail.notes || '-'],
                ]}
              />
            </FormSection>

            <div className="form-actions">
              <button
                onClick={() => {
                  openEdit(detail)
                  setDetail(null)
                }}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setDelConfirm(detail)
                  setDetail(null)
                }}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      <Confirm
        open={!!delConfirm}
        onClose={() => setDelConfirm(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Expense"
        message={`Remove "${delConfirm?.title}"? This will mark it as inactive.`}
        confirmLabel="Delete"
      />
    </div>
  )
}
