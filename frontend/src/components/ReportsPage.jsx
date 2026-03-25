import { useState } from 'react'
import api from '../utils/api'
import { LoadingPage, fmt, fmtDate, StatusBadge, useToast } from './ui'

const REPORT_TYPES = [
  { id: 'sales', label: 'Sales / Orders', color: '#2563eb', bg: '#eff6ff' },
  { id: 'expenses', label: 'Expenses', color: '#dc2626', bg: '#fef2f2' },
  { id: 'profit', label: 'Profit / Loss', color: '#16a34a', bg: '#f0fdf4' },
  { id: 'inventory', label: 'Inventory / Stock', color: '#d97706', bg: '#fffbeb' },
  { id: 'workers', label: 'Worker / Salary', color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'payments', label: 'Payment Report', color: '#0891b2', bg: '#ecfeff' },
]

const defaultRange = () => ({
  from: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().split('T')[0],
  to: new Date().toISOString().split('T')[0],
})

const fmtPrecise = (value) =>
  `Rs. ${parseFloat(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const fmtPercent = (value) => `${parseFloat(value || 0).toFixed(2)}%`

function DateRange({ from, to, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Date Range:</span>
      <input
        type="date"
        className="input"
        style={{ width: 'auto' }}
        value={from}
        onChange={(e) => onChange({ from: e.target.value, to })}
      />
      <span style={{ color: 'var(--text3)' }}>to</span>
      <input
        type="date"
        className="input"
        style={{ width: 'auto' }}
        value={to}
        onChange={(e) => onChange({ from, to: e.target.value })}
      />
    </div>
  )
}

function profitSummaryRows(data) {
  const summary = data.summary || {}
  return [
    ['Revenue', summary.sales || 0, 'var(--primary)'],
    ['Material Cost', summary.materialCost || 0, '#d97706'],
    ['Gross Profit', summary.grossProfit || 0, (summary.grossProfit || 0) >= 0 ? 'var(--green)' : 'var(--red)'],
    ['Operating Expenses', summary.expenses || 0, 'var(--red)'],
    ['Net Profit', summary.netProfit || 0, (summary.netProfit || 0) >= 0 ? 'var(--green)' : 'var(--red)'],
  ]
}

function generatePDF(type, data, range) {
  const title = REPORT_TYPES.find((report) => report.id === type)?.label || 'Report'
  const fmtD = (value) => (value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-')
  let summaryHTML = ''
  let tableHTML = ''

  if (type === 'sales') {
    const total = data.orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0
    const received = data.orders?.reduce((sum, order) => sum + parseFloat(order.amount_paid || 0), 0) || 0
    summaryHTML = `
      <div class="summary-grid">
        <div class="summary-card"><div class="s-val">${data.orders?.length || 0}</div><div class="s-lbl">Total Orders</div></div>
        <div class="summary-card"><div class="s-val" style="color:#2563eb">${fmtPrecise(total)}</div><div class="s-lbl">Total Revenue</div></div>
        <div class="summary-card"><div class="s-val" style="color:#16a34a">${fmtPrecise(received)}</div><div class="s-lbl">Amount Received</div></div>
        <div class="summary-card"><div class="s-val" style="color:#dc2626">${fmtPrecise(total - received)}</div><div class="s-lbl">Balance Due</div></div>
      </div>`
    tableHTML = `
      <table>
        <thead><tr><th>Order #</th><th>Customer</th><th>Date</th><th>Status</th><th>Payment</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead>
        <tbody>
          ${(data.orders || []).map((order) => `
            <tr>
              <td class="mono">${order.order_number}</td>
              <td>${order.customer_name || '-'}</td>
              <td>${fmtD(order.order_date)}</td>
              <td>${order.status || '-'}</td>
              <td>${order.payment_status || '-'}</td>
              <td class="num">${fmtPrecise(order.total_amount)}</td>
              <td class="num green">${fmtPrecise(order.amount_paid)}</td>
              <td class="num red">${fmtPrecise(parseFloat(order.total_amount || 0) - parseFloat(order.amount_paid || 0))}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
  }

  if (type === 'expenses') {
    const total = data.expenses?.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0) || 0
    summaryHTML = `
      <div class="summary-grid">
        <div class="summary-card"><div class="s-val">${data.expenses?.length || 0}</div><div class="s-lbl">Total Entries</div></div>
        <div class="summary-card"><div class="s-val" style="color:#dc2626">${fmtPrecise(total)}</div><div class="s-lbl">Total Expenses</div></div>
      </div>`
    tableHTML = `
      <table>
        <thead><tr><th>Title</th><th>Category</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Tax</th></tr></thead>
        <tbody>
          ${(data.expenses || []).map((expense) => `
            <tr>
              <td>${expense.title}</td>
              <td>${expense.category}</td>
              <td>${expense.vendor_name || '-'}</td>
              <td>${fmtD(expense.date)}</td>
              <td class="num red">${fmtPrecise(expense.amount)}</td>
              <td class="num">${expense.tax_amount ? fmtPrecise(expense.tax_amount) : '-'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
  }

  if (type === 'profit') {
    const totalOrders = data.summary?.totalOrders || data.orderDetails?.length || 0
    summaryHTML = `
      <div class="summary-grid">
        ${profitSummaryRows(data).map(([label, value, color]) => `
          <div class="summary-card">
            <div class="s-val" style="color:${color}">${fmtPrecise(value)}</div>
            <div class="s-lbl">${label}</div>
          </div>`).join('')}
      </div>
      <div class="note-box">
        <strong>Total Orders:</strong> ${totalOrders}<br/>
        <strong>Operating Expenses:</strong> ${data.operatingExpenseSource || '-'}
      </div>`
    tableHTML = `
      <table>
        <thead><tr><th>Sr No</th><th>Order ID</th><th>Customer</th><th>Date</th><th>Amount</th><th>Material Cost</th><th>Commission</th><th>Gross Profit</th><th>% Profit</th></tr></thead>
        <tbody>
          ${(data.orderDetails || []).map((order) => `
            <tr>
              <td>${order.srNo}</td>
              <td class="mono">${order.orderId}</td>
              <td>${order.customerName}</td>
              <td>${fmtD(order.date)}</td>
              <td class="num">${fmtPrecise(order.amount)}</td>
              <td class="num" style="color:#d97706">${fmtPrecise(order.materialCost)}</td>
              <td class="num">${fmtPrecise(order.commission)}</td>
              <td class="num ${order.grossProfit >= 0 ? 'green' : 'red'}">${fmtPrecise(order.grossProfit)}</td>
              <td class="num ${order.profitPercent >= 0 ? 'green' : 'red'}">${fmtPercent(order.profitPercent)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
  }

  if (type === 'inventory') {
    const totalValue = data.materials?.reduce((sum, item) => sum + parseFloat(item.stock_value || 0), 0) || 0
    summaryHTML = `
      <div class="summary-grid">
        <div class="summary-card"><div class="s-val">${data.materials?.length || 0}</div><div class="s-lbl">Total Items</div></div>
        <div class="summary-card"><div class="s-val" style="color:#2563eb">${fmtPrecise(totalValue)}</div><div class="s-lbl">Stock Value</div></div>
      </div>`
    tableHTML = `
      <table>
        <thead><tr><th>Material</th><th>Unit</th><th>Qty</th><th>Min Stock</th><th>Unit Price</th><th>Value</th><th>Status</th></tr></thead>
        <tbody>
          ${(data.materials || []).map((material) => `
            <tr>
              <td>${material.name}</td>
              <td>${material.unit}</td>
              <td class="num">${Math.round(material.quantity || 0)}</td>
              <td class="num">${Math.round(material.min_stock || 0)}</td>
              <td class="num">${fmtPrecise(material.unit_price)}</td>
              <td class="num">${fmtPrecise(material.stock_value)}</td>
              <td>${material.stock_status}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
  }

  if (type === 'workers') {
    const totalEarned = data.performance?.reduce((sum, worker) => sum + parseFloat(worker.total_earned || 0), 0) || 0
    const totalPaid = data.performance?.reduce((sum, worker) => sum + parseFloat(worker.paid || 0), 0) || 0
    summaryHTML = `
      <div class="summary-grid">
        <div class="summary-card"><div class="s-val">${data.performance?.length || 0}</div><div class="s-lbl">Total Workers</div></div>
        <div class="summary-card"><div class="s-val" style="color:#7c3aed">${fmtPrecise(totalEarned)}</div><div class="s-lbl">Total Earnings</div></div>
        <div class="summary-card"><div class="s-val" style="color:#16a34a">${fmtPrecise(totalPaid)}</div><div class="s-lbl">Paid</div></div>
      </div>`
    tableHTML = `
      <table>
        <thead><tr><th>Worker</th><th>Skill</th><th>Jobs</th><th>Done</th><th>Earned</th><th>Paid</th><th>Due</th></tr></thead>
        <tbody>
          ${(data.performance || []).map((worker) => `
            <tr>
              <td>${worker.name}</td>
              <td>${worker.skill || '-'}</td>
              <td class="num">${worker.total_jobs || 0}</td>
              <td class="num">${worker.completed || 0}</td>
              <td class="num">${fmtPrecise(worker.total_earned)}</td>
              <td class="num green">${fmtPrecise(worker.paid)}</td>
              <td class="num red">${fmtPrecise(parseFloat(worker.total_earned || 0) - parseFloat(worker.paid || 0))}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
  }

  if (type === 'payments') {
    const totalAmount = data.orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0
    const totalPaid = data.orders?.reduce((sum, order) => sum + parseFloat(order.amount_paid || 0), 0) || 0
    summaryHTML = `
      <div class="summary-grid">
        <div class="summary-card"><div class="s-val">${data.orders?.length || 0}</div><div class="s-lbl">Total Orders</div></div>
        <div class="summary-card"><div class="s-val" style="color:#2563eb">${fmtPrecise(totalAmount)}</div><div class="s-lbl">Total Billed</div></div>
        <div class="summary-card"><div class="s-val" style="color:#16a34a">${fmtPrecise(totalPaid)}</div><div class="s-lbl">Received</div></div>
      </div>`
    tableHTML = `
      <table>
        <thead><tr><th>Order #</th><th>Customer</th><th>Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
        <tbody>
          ${(data.orders || []).map((order) => `
            <tr>
              <td class="mono">${order.order_number}</td>
              <td>${order.customer_name || '-'}</td>
              <td>${fmtD(order.order_date)}</td>
              <td class="num">${fmtPrecise(order.total_amount)}</td>
              <td class="num green">${fmtPrecise(order.amount_paid)}</td>
              <td class="num red">${fmtPrecise(order.balance)}</td>
              <td>${order.payment_status || '-'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
  }

  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:20px;background:#fff}
        .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #2563eb;padding-bottom:12px;margin-bottom:16px}
        .report-title{font-size:20px;font-weight:800;color:#2563eb}
        .report-sub{font-size:11px;color:#64748b;margin-top:4px}
        .date-badge{background:#eff6ff;color:#2563eb;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700}
        .summary-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px}
        .summary-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px}
        .s-val{font-size:16px;font-weight:800;color:#1e293b}
        .s-lbl{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-top:2px}
        .note-box{margin-bottom:16px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;line-height:1.6}
        h3{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px}
        table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}
        th{background:#1e293b;color:#fff;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.06em}
        td{padding:7px 10px;border-bottom:1px solid #f1f5f9}
        tr:nth-child(even) td{background:#f8fafc}
        .num{text-align:right}
        .mono{font-family:monospace;font-size:10px}
        .green{color:#16a34a;font-weight:600}
        .red{color:#dc2626;font-weight:600}
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="report-title">${title}</div>
          <div class="report-sub">WoodCraft Furniture ERP</div>
        </div>
        <div class="date-badge">${fmtD(range.from)} to ${fmtD(range.to)}</div>
      </div>
      ${summaryHTML}
      <h3>Detailed Report</h3>
      ${tableHTML}
    </body>
  </html>`

  const popup = window.open('', '_blank')
  popup.document.write(html)
  popup.document.close()
  setTimeout(() => {
    popup.focus()
    popup.print()
  }, 300)
}

function generateExcel(type, data, range) {
  const title = REPORT_TYPES.find((report) => report.id === type)?.label || 'Report'
  let rows = []

  if (type === 'sales') {
    rows = [['Order #', 'Customer', 'Date', 'Status', 'Payment', 'Total', 'Paid', 'Balance']]
    data.orders?.forEach((order) => {
      rows.push([
        order.order_number,
        order.customer_name || '',
        order.order_date,
        order.status,
        order.payment_status,
        order.total_amount,
        order.amount_paid,
        (parseFloat(order.total_amount || 0) - parseFloat(order.amount_paid || 0)).toFixed(2),
      ])
    })
  }

  if (type === 'expenses') {
    rows = [['Title', 'Category', 'Vendor', 'Date', 'Amount', 'Tax']]
    data.expenses?.forEach((expense) => {
      rows.push([expense.title, expense.category, expense.vendor_name || '', expense.date, expense.amount, expense.tax_amount || 0])
    })
  }

  if (type === 'profit') {
    rows = [[
      'Sr No',
      'Order ID',
      'Customer Name',
      'Date',
      'Amount',
      'Material Cost',
      'Commission',
      'Gross Profit',
      '% Profit',
    ]]
    data.orderDetails?.forEach((order) => {
      rows.push([
        order.srNo,
        order.orderId,
        order.customerName,
        order.date,
        order.amount.toFixed(2),
        order.materialCost.toFixed(2),
        order.commission.toFixed(2),
        order.grossProfit.toFixed(2),
        order.profitPercent.toFixed(2),
      ])
    })
    if (data.summary) {
      rows.push([
        '',
        'TOTAL',
        '',
        '',
        (data.summary.sales || 0).toFixed(2),
        (data.summary.materialCost || 0).toFixed(2),
        (data.summary.commission || 0).toFixed(2),
        (data.summary.grossProfit || 0).toFixed(2),
        '',
      ])
    }
  }

  if (type === 'inventory') {
    rows = [['Material', 'Unit', 'Quantity', 'Min Stock', 'Unit Price', 'Stock Value', 'Status']]
    data.materials?.forEach((material) => {
      rows.push([
        material.name,
        material.unit,
        Math.round(material.quantity || 0),
        Math.round(material.min_stock || 0),
        material.unit_price,
        parseFloat(material.stock_value || 0).toFixed(2),
        material.stock_status,
      ])
    })
  }

  if (type === 'workers') {
    rows = [['Worker', 'Skill', 'Jobs', 'Done', 'Earned', 'Paid', 'Due']]
    data.performance?.forEach((worker) => {
      rows.push([
        worker.name,
        worker.skill || '',
        worker.total_jobs || 0,
        worker.completed || 0,
        parseFloat(worker.total_earned || 0).toFixed(2),
        parseFloat(worker.paid || 0).toFixed(2),
        (parseFloat(worker.total_earned || 0) - parseFloat(worker.paid || 0)).toFixed(2),
      ])
    })
  }

  if (type === 'payments') {
    rows = [['Order #', 'Customer', 'Date', 'Total', 'Paid', 'Balance', 'Status']]
    data.orders?.forEach((order) => {
      rows.push([order.order_number, order.customer_name || '', order.order_date, order.total_amount, order.amount_paid, order.balance, order.payment_status])
    })
  }

  const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title.replace(/[/ ]/g, '_')}_${range.from}_${range.to}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function renderProfitTable(data) {
  const summary = data.summary || {}
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          {['Sr No', 'Order ID', 'Customer Name', 'Date', 'Amount', 'Material Cost', 'Commission', 'Gross Profit', '% Profit'].map((heading) => (
            <th key={heading} className="table-th">{heading}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(data.orderDetails || []).map((order) => (
          <tr key={order.id} className="table-row">
            <td className="table-td">{order.srNo}</td>
            <td className="table-td" style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary)' }}>{order.orderId}</td>
            <td className="table-td" style={{ fontWeight: 600 }}>{order.customerName}</td>
            <td className="table-td" style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(order.date)}</td>
            <td className="table-td" style={{ fontWeight: 700 }}>{fmt(order.amount)}</td>
            <td className="table-td" style={{ color: '#d97706' }}>{fmt(order.materialCost)}</td>
            <td className="table-td">{fmt(order.commission)}</td>
            <td className="table-td" style={{ color: order.grossProfit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{fmt(order.grossProfit)}</td>
            <td className="table-td" style={{ color: order.profitPercent >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{fmtPercent(order.profitPercent)}</td>
          </tr>
        ))}
        <tr className="table-row">
          <td className="table-td" colSpan={4} style={{ fontWeight: 800 }}>TOTAL</td>
          <td className="table-td" style={{ fontWeight: 800 }}>{fmt(summary.sales || 0)}</td>
          <td className="table-td" style={{ color: '#d97706', fontWeight: 800 }}>{fmt(summary.materialCost || 0)}</td>
          <td className="table-td" style={{ fontWeight: 800 }}>{fmt(summary.commission || 0)}</td>
          <td className="table-td" style={{ color: (summary.grossProfit || 0) >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 800 }}>{fmt(summary.grossProfit || 0)}</td>
          <td className="table-td">-</td>
        </tr>
      </tbody>
    </table>
  )
}

export default function ReportsPage() {
  const toast = useToast()
  const [active, setActive] = useState(null)
  const [range, setRange] = useState(defaultRange())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadReport = async (type, nextRange = range) => {
    setActive(type)
    setData(null)
    setLoading(true)
    try {
      const url = type === 'profit' ? '/reports/profit' : `/reports/${type}`
      const response = await api.get(url, { params: nextRange })
      setData(response.data)
    } catch (error) {
      toast(error.response?.data?.error || 'Failed to load report', 'error')
    } finally {
      setLoading(false)
    }
  }

  const reportType = REPORT_TYPES.find((report) => report.id === active)

  const renderTable = () => {
    if (!data) return null

    if (active === 'sales') {
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Order #', 'Customer', 'Date', 'Status', 'Total', 'Paid'].map((heading) => <th key={heading} className="table-th">{heading}</th>)}</tr></thead>
          <tbody>{(data.orders || []).map((order) => (
            <tr key={order.id} className="table-row">
              <td className="table-td" style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary)' }}>{order.order_number}</td>
              <td className="table-td" style={{ fontWeight: 600 }}>{order.customer_name}</td>
              <td className="table-td" style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(order.order_date)}</td>
              <td className="table-td"><StatusBadge status={order.status} /></td>
              <td className="table-td" style={{ fontWeight: 700 }}>{fmt(order.total_amount)}</td>
              <td className="table-td" style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(order.amount_paid)}</td>
            </tr>
          ))}</tbody>
        </table>
      )
    }

    if (active === 'expenses') {
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Title', 'Category', 'Amount', 'Tax', 'Date'].map((heading) => <th key={heading} className="table-th">{heading}</th>)}</tr></thead>
          <tbody>{(data.expenses || []).map((expense, index) => (
            <tr key={index} className="table-row">
              <td className="table-td" style={{ fontWeight: 600 }}>{expense.title}</td>
              <td className="table-td"><StatusBadge status={expense.category} /></td>
              <td className="table-td" style={{ color: 'var(--red)', fontWeight: 700 }}>{fmt(expense.amount)}</td>
              <td className="table-td" style={{ color: 'var(--text3)' }}>{expense.tax_amount ? fmt(expense.tax_amount) : '-'}</td>
              <td className="table-td" style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(expense.date)}</td>
            </tr>
          ))}</tbody>
        </table>
      )
    }

    if (active === 'profit') return renderProfitTable(data)

    if (active === 'inventory') {
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Material', 'Qty', 'Min Stock', 'Unit Price', 'Value', 'Status'].map((heading) => <th key={heading} className="table-th">{heading}</th>)}</tr></thead>
          <tbody>{(data.materials || []).map((material, index) => (
            <tr key={index} className="table-row">
              <td className="table-td" style={{ fontWeight: 600 }}>{material.name}</td>
              <td className="table-td">{Math.round(material.quantity)} {material.unit}</td>
              <td className="table-td" style={{ color: 'var(--text3)' }}>{Math.round(material.min_stock)}</td>
              <td className="table-td">{fmt(material.unit_price)}</td>
              <td className="table-td" style={{ fontWeight: 600 }}>{fmt(material.stock_value)}</td>
              <td className="table-td"><span className={`badge-${material.stock_status === 'OK' ? 'green' : material.stock_status === 'LOW' ? 'yellow' : 'red'}`}>{material.stock_status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      )
    }

    if (active === 'workers') {
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Worker', 'Skill', 'Jobs', 'Done', 'Earned', 'Paid', 'Due'].map((heading) => <th key={heading} className="table-th">{heading}</th>)}</tr></thead>
          <tbody>{(data.performance || []).map((worker, index) => (
            <tr key={index} className="table-row">
              <td className="table-td" style={{ fontWeight: 600 }}>{worker.name}</td>
              <td className="table-td" style={{ color: 'var(--text3)' }}>{worker.skill || '-'}</td>
              <td className="table-td">{worker.total_jobs || 0}</td>
              <td className="table-td" style={{ color: 'var(--green)', fontWeight: 700 }}>{worker.completed || 0}</td>
              <td className="table-td">{fmt(worker.total_earned)}</td>
              <td className="table-td" style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(worker.paid)}</td>
              <td className="table-td" style={{ color: 'var(--red)', fontWeight: 700 }}>{fmt(parseFloat(worker.total_earned || 0) - parseFloat(worker.paid || 0))}</td>
            </tr>
          ))}</tbody>
        </table>
      )
    }

    if (active === 'payments') {
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Order #', 'Customer', 'Total', 'Paid', 'Balance', 'Status'].map((heading) => <th key={heading} className="table-th">{heading}</th>)}</tr></thead>
          <tbody>{(data.orders || []).map((order, index) => (
            <tr key={index} className="table-row">
              <td className="table-td" style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary)' }}>{order.order_number}</td>
              <td className="table-td" style={{ fontWeight: 600 }}>{order.customer_name}</td>
              <td className="table-td">{fmt(order.total_amount)}</td>
              <td className="table-td" style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(order.amount_paid)}</td>
              <td className="table-td" style={{ color: 'var(--red)', fontWeight: 700 }}>{fmt(order.balance)}</td>
              <td className="table-td"><StatusBadge status={order.payment_status} /></td>
            </tr>
          ))}</tbody>
        </table>
      )
    }

    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-fade-in">
      <div>
        <h1 className="page-title">Reports</h1>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>Generate and export business reports</p>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Generate Reports</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {REPORT_TYPES.map((report) => (
            <div
              key={report.id}
              style={{
                border: `2px solid ${active === report.id ? report.color : 'var(--border)'}`,
                borderRadius: 12,
                padding: '12px 16px',
                minWidth: 140,
                background: active === report.id ? report.bg : 'var(--card)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => loadReport(report.id)}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: active === report.id ? report.color : 'var(--text)', marginBottom: 8 }}>{report.label}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    if (data && active === report.id) generatePDF(report.id, data, range)
                    else loadReport(report.id)
                  }}
                  style={{ padding: '3px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: '#fee2e2', color: '#dc2626' }}
                >
                  PDF
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    if (data && active === report.id) generateExcel(report.id, data, range)
                    else loadReport(report.id)
                  }}
                  style={{ padding: '3px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: '#dcfce7', color: '#16a34a' }}
                >
                  EXCEL
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {active ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <DateRange
            from={range.from}
            to={range.to}
            onChange={(nextRange) => {
              setRange(nextRange)
              loadReport(active, nextRange)
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => loadReport(active)} className="btn btn-secondary" style={{ fontSize: 12 }}>Refresh</button>
            {data ? (
              <>
                <button onClick={() => generateExcel(active, data, range)} className="btn btn-success" style={{ fontSize: 12 }}>Excel</button>
                <button onClick={() => generatePDF(active, data, range)} className="btn btn-primary" style={{ fontSize: 12 }}>PDF</button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {active && data ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
            {active === 'sales' && [
              ['Orders', data.orders?.length || 0, 'var(--text)'],
              ['Revenue', fmt(data.orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0), 'var(--primary)'],
              ['Received', fmt(data.orders?.reduce((sum, order) => sum + parseFloat(order.amount_paid || 0), 0) || 0), 'var(--green)'],
              ['Due', fmt((data.orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0) - (data.orders?.reduce((sum, order) => sum + parseFloat(order.amount_paid || 0), 0) || 0)), 'var(--red)'],
            ].map(([label, value, color]) => (
              <div key={label} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
              </div>
            ))}

            {active === 'expenses' && [
              ['Entries', data.expenses?.length || 0, 'var(--text)'],
              ['Total', fmt(data.expenses?.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0) || 0), 'var(--red)'],
            ].map(([label, value, color]) => (
              <div key={label} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
              </div>
            ))}

            {active === 'profit' && profitSummaryRows(data).map(([label, value, color]) => (
              <div key={label} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>{fmt(value)}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {active === 'profit' ? (
            <div className="card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  Total Orders: {data.summary?.totalOrders || data.orderDetails?.length || 0}
                </div>
                {data.expenseBreakdown?.length ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    Categories: {data.expenseBreakdown.map((item) => `${item.category} (${fmt(item.amount)})`).join(', ')}
                  </div>
                ) : null}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                {data.operatingExpenseSource}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {loading ? <LoadingPage /> : null}

      {!loading && data ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: reportType?.color }}>{reportType?.label}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(range.from)} to {fmtDate(range.to)}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>{renderTable()}</div>
        </div>
      ) : null}

      {!loading && !data && !active ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Select a Report Type</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Click any report card above to generate and view it</div>
        </div>
      ) : null}
    </div>
  )
}
