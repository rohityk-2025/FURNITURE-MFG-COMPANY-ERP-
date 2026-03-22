import { useState } from 'react'
import api from '../../utils/api'
import { LoadingPage, fmt, fmtDate, StatusBadge, useToast } from '../../components/ui'

const REPORT_TYPES = [
  { id:'sales',     label:'Sales / Orders',   color:'#2563eb', bg:'#eff6ff' },
  { id:'expenses',  label:'Expenses',         color:'#dc2626', bg:'#fef2f2' },
  { id:'profit',    label:'Profit / Loss',    color:'#16a34a', bg:'#f0fdf4' },
  { id:'inventory', label:'Inventory / Stock',color:'#d97706', bg:'#fffbeb' },
  { id:'workers',   label:'Worker / Salary',  color:'#7c3aed', bg:'#f5f3ff' },
  { id:'payments',  label:'Payment Report',   color:'#0891b2', bg:'#ecfeff' },
]

function DateRange({ from, to, onChange }) {
  return (
    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
      <span style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>Date Range:</span>
      <input type="date" className="input" style={{ width:'auto' }} value={from} onChange={e=>onChange({from:e.target.value,to})} />
      <span style={{ color:'var(--text3)' }}>→</span>
      <input type="date" className="input" style={{ width:'auto' }} value={to} onChange={e=>onChange({from,to:e.target.value})} />
    </div>
  )
}

// ── PDF Generator ────────────────────────────────────────────────
function generatePDF(type, data, range) {
  const { from, to } = range
  const title = REPORT_TYPES.find(r=>r.id===type)?.label || 'Report'
  const fmtM  = (n) => `₹${parseFloat(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
  const fmtN  = (n) => Math.round(parseFloat(n||0)).toLocaleString('en-IN')
  const fmtD  = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

  let summaryHTML = ''
  let tableHTML   = ''

  if (type==='sales') {
    const total = data.orders?.reduce((s,o)=>s+parseFloat(o.total_amount||0),0)||0
    const received = data.orders?.reduce((s,o)=>s+parseFloat(o.amount_paid||0),0)||0
    summaryHTML = `
      <div class="summary-grid">
        <div class="summary-card"><div class="s-val">${data.orders?.length||0}</div><div class="s-lbl">Total Orders</div></div>
        <div class="summary-card"><div class="s-val" style="color:#2563eb">${fmtM(total)}</div><div class="s-lbl">Total Revenue</div></div>
        <div class="summary-card"><div class="s-val" style="color:#16a34a">${fmtM(received)}</div><div class="s-lbl">Amount Received</div></div>
        <div class="summary-card"><div class="s-val" style="color:#dc2626">${fmtM(total-received)}</div><div class="s-lbl">Balance Due</div></div>
      </div>`
    tableHTML = `
      <table>
        <thead><tr><th>Order #</th><th>Customer</th><th>Date</th><th>Status</th><th>Payment</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead>
        <tbody>
          ${(data.orders||[]).map(o=>`<tr>
            <td class="mono">${o.order_number}</td>
            <td>${o.customer_name||'—'}</td>
            <td>${fmtD(o.order_date)}</td>
            <td><span class="pill">${o.status?.replace(/_/g,' ')}</span></td>
            <td><span class="pill">${o.payment_status||'—'}</span></td>
            <td class="num">${fmtM(o.total_amount)}</td>
            <td class="num green">${fmtM(o.amount_paid)}</td>
            <td class="num red">${fmtM(parseFloat(o.total_amount||0)-parseFloat(o.amount_paid||0))}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr><td colspan="5"><strong>TOTAL</strong></td><td class="num"><strong>${fmtM(total)}</strong></td><td class="num green"><strong>${fmtM(received)}</strong></td><td class="num red"><strong>${fmtM(total-received)}</strong></td></tr></tfoot>
      </table>
      ${data.productSales?.length ? `<h3 style="margin-top:24px">Top Products</h3>
      <table><thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
      <tbody>${data.productSales.map(p=>`<tr><td>${p.product_name}</td><td class="num">${fmtN(p.total_qty)}</td><td class="num">${fmtM(p.total_revenue)}</td></tr>`).join('')}</tbody></table>` : ''}`
  }

  if (type==='expenses') {
    const total = data.expenses?.reduce((s,e)=>s+parseFloat(e.amount||0),0)||0
    summaryHTML = `
      <div class="summary-grid">
        <div class="summary-card"><div class="s-val">${data.expenses?.length||0}</div><div class="s-lbl">Total Entries</div></div>
        <div class="summary-card"><div class="s-val" style="color:#dc2626">${fmtM(total)}</div><div class="s-lbl">Total Expenses</div></div>
        ${(data.byCategory||[]).map(c=>`<div class="summary-card"><div class="s-val">${fmtM(c.total)}</div><div class="s-lbl">${c.category}</div></div>`).join('')}
      </div>`
    tableHTML = `<table>
      <thead><tr><th>Title</th><th>Category</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Tax</th></tr></thead>
      <tbody>${(data.expenses||[]).map(e=>`<tr>
        <td>${e.title}</td><td>${e.category}</td>
        <td>${e.vendor_name||'—'}</td><td>${fmtD(e.date)}</td>
        <td class="num red">${fmtM(e.amount)}</td>
        <td class="num">${e.tax_amount?fmtM(e.tax_amount):'—'}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4"><strong>TOTAL</strong></td><td class="num red"><strong>${fmtM(total)}</strong></td><td></td></tr></tfoot>
    </table>`
  }

  if (type==='profit') {
    const totalSales = data.monthly?.reduce((s,m)=>s+m.sales,0)||0
    const totalExp   = data.monthly?.reduce((s,m)=>s+m.expenses,0)||0
    summaryHTML = `<div class="summary-grid">
      <div class="summary-card"><div class="s-val" style="color:#2563eb">${fmtM(totalSales)}</div><div class="s-lbl">Total Revenue</div></div>
      <div class="summary-card"><div class="s-val" style="color:#dc2626">${fmtM(totalExp)}</div><div class="s-lbl">Total Expenses</div></div>
      <div class="summary-card"><div class="s-val" style="color:${totalSales-totalExp>=0?'#16a34a':'#dc2626'}">${fmtM(totalSales-totalExp)}</div><div class="s-lbl">Net Profit</div></div>
    </div>`
    tableHTML = `<table>
      <thead><tr><th>Month</th><th>Sales</th><th>Expenses</th><th>Profit</th><th>Margin</th></tr></thead>
      <tbody>${(data.monthly||[]).map(m=>`<tr>
        <td>${m.month}</td>
        <td class="num">${fmtM(m.sales)}</td>
        <td class="num red">${fmtM(m.expenses)}</td>
        <td class="num" style="color:${m.profit>=0?'#16a34a':'#dc2626'};font-weight:700">${fmtM(m.profit)}</td>
        <td class="num">${m.sales>0?(((m.profit/m.sales)*100).toFixed(1)+'%'):'—'}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><td><strong>TOTAL</strong></td><td class="num"><strong>${fmtM(totalSales)}</strong></td><td class="num red"><strong>${fmtM(totalExp)}</strong></td><td class="num" style="color:${totalSales-totalExp>=0?'#16a34a':'#dc2626'};font-weight:700"><strong>${fmtM(totalSales-totalExp)}</strong></td><td></td></tr></tfoot>
    </table>`
  }

  if (type==='inventory') {
    const totalValue = data.materials?.reduce((s,m)=>s+parseFloat(m.stock_value||0),0)||0
    const lowStock   = data.materials?.filter(m=>m.stock_status==='LOW')||[]
    summaryHTML = `<div class="summary-grid">
      <div class="summary-card"><div class="s-val">${data.materials?.length||0}</div><div class="s-lbl">Total Items</div></div>
      <div class="summary-card"><div class="s-val" style="color:#2563eb">${fmtM(totalValue)}</div><div class="s-lbl">Stock Value</div></div>
      <div class="summary-card"><div class="s-val" style="color:#dc2626">${lowStock.length}</div><div class="s-lbl">Low Stock Items</div></div>
    </div>`
    tableHTML = `<table>
      <thead><tr><th>Material</th><th>Unit</th><th>Qty</th><th>Min Stock</th><th>Unit Price</th><th>Value</th><th>Status</th></tr></thead>
      <tbody>${(data.materials||[]).map(m=>`<tr>
        <td><strong>${m.name}</strong>${m.vendor_name?`<br/><small>${m.vendor_name}</small>`:''}</td>
        <td>${m.unit}</td><td class="num">${fmtN(m.quantity)}</td>
        <td class="num">${fmtN(m.min_stock)}</td>
        <td class="num">${fmtM(m.unit_price)}</td>
        <td class="num">${fmtM(m.stock_value)}</td>
        <td><span class="pill" style="background:${m.stock_status==='OK'?'#f0fdf4':m.stock_status==='LOW'?'#fffbeb':'#fef2f2'};color:${m.stock_status==='OK'?'#16a34a':m.stock_status==='LOW'?'#d97706':'#dc2626'}">${m.stock_status}</span></td>
      </tr>`).join('')}</tbody>
    </table>`
  }

  if (type==='workers') {
    const totalEarned = data.performance?.reduce((s,w)=>s+parseFloat(w.total_earned||0),0)||0
    const totalPaid   = data.performance?.reduce((s,w)=>s+parseFloat(w.paid||0),0)||0
    summaryHTML = `<div class="summary-grid">
      <div class="summary-card"><div class="s-val">${data.performance?.length||0}</div><div class="s-lbl">Total Workers</div></div>
      <div class="summary-card"><div class="s-val" style="color:#7c3aed">${fmtM(totalEarned)}</div><div class="s-lbl">Total Earnings</div></div>
      <div class="summary-card"><div class="s-val" style="color:#16a34a">${fmtM(totalPaid)}</div><div class="s-lbl">Paid</div></div>
      <div class="summary-card"><div class="s-val" style="color:#dc2626">${fmtM(totalEarned-totalPaid)}</div><div class="s-lbl">Pending</div></div>
    </div>`
    tableHTML = `<table>
      <thead><tr><th>Worker</th><th>Skill</th><th>Jobs</th><th>Completed</th><th>Pending</th><th>Earned</th><th>Paid</th><th>Due</th></tr></thead>
      <tbody>${(data.performance||[]).map(w=>`<tr>
        <td><strong>${w.name}</strong></td><td>${w.skill||'—'}</td>
        <td class="num">${w.total_jobs||0}</td>
        <td class="num" style="color:#16a34a;font-weight:700">${w.completed||0}</td>
        <td class="num" style="color:#d97706">${w.pending||0}</td>
        <td class="num">${fmtM(w.total_earned)}</td>
        <td class="num green">${fmtM(w.paid)}</td>
        <td class="num red">${fmtM(parseFloat(w.total_earned||0)-parseFloat(w.paid||0))}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="5"><strong>TOTAL</strong></td><td class="num"><strong>${fmtM(totalEarned)}</strong></td><td class="num green"><strong>${fmtM(totalPaid)}</strong></td><td class="num red"><strong>${fmtM(totalEarned-totalPaid)}</strong></td></tr></tfoot>
    </table>`
  }

  if (type==='payments') {
    const totalAmt  = data.orders?.reduce((s,o)=>s+parseFloat(o.total_amount||0),0)||0
    const totalPaid = data.orders?.reduce((s,o)=>s+parseFloat(o.amount_paid||0),0)||0
    summaryHTML = `<div class="summary-grid">
      <div class="summary-card"><div class="s-val">${data.orders?.length||0}</div><div class="s-lbl">Total Orders</div></div>
      <div class="summary-card"><div class="s-val" style="color:#2563eb">${fmtM(totalAmt)}</div><div class="s-lbl">Total Billed</div></div>
      <div class="summary-card"><div class="s-val" style="color:#16a34a">${fmtM(totalPaid)}</div><div class="s-lbl">Received</div></div>
      <div class="summary-card"><div class="s-val" style="color:#dc2626">${fmtM(totalAmt-totalPaid)}</div><div class="s-lbl">Outstanding</div></div>
    </div>`
    tableHTML = `<table>
      <thead><tr><th>Order #</th><th>Customer</th><th>Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
      <tbody>${(data.orders||[]).map(o=>`<tr>
        <td class="mono">${o.order_number}</td>
        <td>${o.customer_name}</td><td>${fmtD(o.order_date)}</td>
        <td class="num">${fmtM(o.total_amount)}</td>
        <td class="num green">${fmtM(o.amount_paid)}</td>
        <td class="num red">${fmtM(o.balance)}</td>
        <td><span class="pill">${o.payment_status}</span></td>
      </tr>`).join('')}</tbody>
    </table>`
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
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
    h3{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}
    th{background:#1e293b;color:#fff;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.06em}
    td{padding:7px 10px;border-bottom:1px solid #f1f5f9}
    tr:nth-child(even) td{background:#f8fafc}
    tfoot td{background:#f1f5f9!important;border-top:2px solid #e2e8f0;font-size:11px}
    .num{text-align:right}.mono{font-family:monospace;font-size:10px}
    .green{color:#16a34a;font-weight:600}.red{color:#dc2626;font-weight:600}
    .pill{display:inline-block;padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;background:#f1f5f9;color:#475569}
    @media print{body{padding:10px}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <div class="header">
    <div>
      <div class="report-title">${title}</div>
      <div class="report-sub">WoodCraft Furniture ERP · Generated ${new Date().toLocaleDateString('en-IN')}</div>
    </div>
    <div class="date-badge">${fmtD(from)} → ${fmtD(to)}</div>
  </div>
  ${summaryHTML}
  <h3>Detailed Report</h3>
  ${tableHTML}
  <div style="margin-top:20px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center">
    WoodCraft ERP · ${title} · ${fmtD(from)} to ${fmtD(to)}
  </div>
  </body></html>`

  const w = window.open('','_blank')
  w.document.write(html)
  w.document.close()
  setTimeout(()=>{ w.focus(); w.print() }, 500)
}

// ── Excel Export ─────────────────────────────────────────────────
function generateExcel(type, data, range) {
  const title = REPORT_TYPES.find(r=>r.id===type)?.label || 'Report'
  let rows = []

  if (type==='sales') {
    rows = [['Order #','Customer','Date','Status','Payment','Total','Paid','Balance']]
    data.orders?.forEach(o => rows.push([o.order_number,o.customer_name,o.order_date,o.status,o.payment_status,o.total_amount,o.amount_paid,(parseFloat(o.total_amount||0)-parseFloat(o.amount_paid||0)).toFixed(2)]))
  }
  if (type==='expenses') {
    rows = [['Title','Category','Vendor','Date','Amount','Tax','Description']]
    data.expenses?.forEach(e => rows.push([e.title,e.category,e.vendor_name||'',e.date,e.amount,e.tax_amount||0,e.description||e.notes||'']))
  }
  if (type==='profit') {
    rows = [['Month','Sales','Expenses','Profit','Margin %']]
    data.monthly?.forEach(m => rows.push([m.month,m.sales.toFixed(2),m.expenses.toFixed(2),m.profit.toFixed(2),(m.sales>0?((m.profit/m.sales)*100).toFixed(1):0)+'%']))
  }
  if (type==='inventory') {
    rows = [['Material','Unit','Quantity','Min Stock','Unit Price','Stock Value','Status']]
    data.materials?.forEach(m => rows.push([m.name,m.unit,Math.round(m.quantity),Math.round(m.min_stock),m.unit_price,(parseFloat(m.quantity||0)*parseFloat(m.unit_price||0)).toFixed(2),m.stock_status]))
  }
  if (type==='workers') {
    rows = [['Worker','Skill','Total Jobs','Completed','Pending','Total Earned','Paid','Due']]
    data.performance?.forEach(w => rows.push([w.name,w.skill||'',w.total_jobs||0,w.completed||0,w.pending||0,parseFloat(w.total_earned||0).toFixed(2),parseFloat(w.paid||0).toFixed(2),(parseFloat(w.total_earned||0)-parseFloat(w.paid||0)).toFixed(2)]))
  }
  if (type==='payments') {
    rows = [['Order #','Customer','Date','Total','Paid','Balance','Status']]
    data.orders?.forEach(o => rows.push([o.order_number,o.customer_name,o.order_date,o.total_amount,o.amount_paid,o.balance,o.payment_status]))
  }

  const csv  = rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `${title.replace(/[/ ]/g,'_')}_${range.from}_${range.to}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ── Main Component ────────────────────────────────────────────────
export default function Reports() {
  const toast   = useToast()
  const [active, setActive]   = useState(null)  // current report type
  const [range,  setRange]    = useState({ from: new Date(new Date().getFullYear(),0,1).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] })
  const [data,   setData]     = useState(null)
  const [loading,setLoading]  = useState(false)

  const loadReport = async (type) => {
    setActive(type); setData(null); setLoading(true)
    try {
      const url = type==='profit' ? '/reports/profit' : `/reports/${type}`
      const r   = await api.get(url, { params: range })
      setData(r.data)
    } catch(err) {
      toast(err.response?.data?.error || 'Failed to load report', 'error')
    } finally { setLoading(false) }
  }

  const reportType = REPORT_TYPES.find(r=>r.id===active)

  // Inline preview renderers
  const renderTable = () => {
    if (!data) return null
    if (active==='sales') return (
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr>{['Order #','Customer','Date','Status','Total','Paid'].map(h=><th key={h} className="table-th">{h}</th>)}</tr></thead>
        <tbody>{(data.orders||[]).map(o=>(
          <tr key={o.id} className="table-row">
            <td className="table-td" style={{ fontFamily:'monospace', fontSize:11, color:'var(--primary)' }}>{o.order_number}</td>
            <td className="table-td" style={{ fontWeight:600 }}>{o.customer_name}</td>
            <td className="table-td" style={{ fontSize:11, color:'var(--text3)' }}>{fmtDate(o.order_date)}</td>
            <td className="table-td"><StatusBadge status={o.status}/></td>
            <td className="table-td" style={{ fontWeight:700 }}>{fmt(o.total_amount)}</td>
            <td className="table-td" style={{ color:'var(--green)', fontWeight:600 }}>{fmt(o.amount_paid)}</td>
          </tr>
        ))}</tbody>
      </table>
    )
    if (active==='expenses') return (
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr>{['Title','Category','Amount','Tax','Date'].map(h=><th key={h} className="table-th">{h}</th>)}</tr></thead>
        <tbody>{(data.expenses||[]).map((e,i)=>(
          <tr key={i} className="table-row">
            <td className="table-td" style={{ fontWeight:600 }}>{e.title}</td>
            <td className="table-td"><StatusBadge status={e.category}/></td>
            <td className="table-td" style={{ color:'var(--red)', fontWeight:700 }}>{fmt(e.amount)}</td>
            <td className="table-td" style={{ color:'var(--text3)' }}>{e.tax_amount?fmt(e.tax_amount):'—'}</td>
            <td className="table-td" style={{ fontSize:11, color:'var(--text3)' }}>{fmtDate(e.date)}</td>
          </tr>
        ))}</tbody>
      </table>
    )
    if (active==='profit') return (
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr>{['Month','Sales','Expenses','Profit'].map(h=><th key={h} className="table-th">{h}</th>)}</tr></thead>
        <tbody>{(data.monthly||[]).map((m,i)=>(
          <tr key={i} className="table-row">
            <td className="table-td" style={{ fontWeight:600 }}>{m.month}</td>
            <td className="table-td" style={{ color:'var(--primary)', fontWeight:600 }}>{fmt(m.sales)}</td>
            <td className="table-td" style={{ color:'var(--red)' }}>{fmt(m.expenses)}</td>
            <td className="table-td" style={{ color:m.profit>=0?'var(--green)':'var(--red)', fontWeight:700, fontSize:14 }}>{fmt(m.profit)}</td>
          </tr>
        ))}</tbody>
      </table>
    )
    if (active==='inventory') return (
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr>{['Material','Qty','Min Stock','Unit Price','Value','Status'].map(h=><th key={h} className="table-th">{h}</th>)}</tr></thead>
        <tbody>{(data.materials||[]).map((m,i)=>(
          <tr key={i} className="table-row">
            <td className="table-td" style={{ fontWeight:600 }}>{m.name}</td>
            <td className="table-td">{Math.round(m.quantity)} {m.unit}</td>
            <td className="table-td" style={{ color:'var(--text3)' }}>{Math.round(m.min_stock)}</td>
            <td className="table-td">{fmt(m.unit_price)}</td>
            <td className="table-td" style={{ fontWeight:600 }}>{fmt(m.stock_value)}</td>
            <td className="table-td"><span className={`badge-${m.stock_status==='OK'?'green':m.stock_status==='LOW'?'yellow':'red'}`}>{m.stock_status}</span></td>
          </tr>
        ))}</tbody>
      </table>
    )
    if (active==='workers') return (
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr>{['Worker','Skill','Jobs','Done','Earned','Paid','Due'].map(h=><th key={h} className="table-th">{h}</th>)}</tr></thead>
        <tbody>{(data.performance||[]).map((w,i)=>(
          <tr key={i} className="table-row">
            <td className="table-td" style={{ fontWeight:600 }}>{w.name}</td>
            <td className="table-td" style={{ color:'var(--text3)' }}>{w.skill||'—'}</td>
            <td className="table-td">{w.total_jobs||0}</td>
            <td className="table-td" style={{ color:'var(--green)', fontWeight:700 }}>{w.completed||0}</td>
            <td className="table-td">{fmt(w.total_earned)}</td>
            <td className="table-td" style={{ color:'var(--green)', fontWeight:600 }}>{fmt(w.paid)}</td>
            <td className="table-td" style={{ color:'var(--red)', fontWeight:700 }}>{fmt(parseFloat(w.total_earned||0)-parseFloat(w.paid||0))}</td>
          </tr>
        ))}</tbody>
      </table>
    )
    if (active==='payments') return (
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead><tr>{['Order #','Customer','Total','Paid','Balance','Status'].map(h=><th key={h} className="table-th">{h}</th>)}</tr></thead>
        <tbody>{(data.orders||[]).map((o,i)=>(
          <tr key={i} className="table-row">
            <td className="table-td" style={{ fontFamily:'monospace', fontSize:11, color:'var(--primary)' }}>{o.order_number}</td>
            <td className="table-td" style={{ fontWeight:600 }}>{o.customer_name}</td>
            <td className="table-td">{fmt(o.total_amount)}</td>
            <td className="table-td" style={{ color:'var(--green)', fontWeight:600 }}>{fmt(o.amount_paid)}</td>
            <td className="table-td" style={{ color:'var(--red)', fontWeight:700 }}>{fmt(o.balance)}</td>
            <td className="table-td"><StatusBadge status={o.payment_status}/></td>
          </tr>
        ))}</tbody>
      </table>
    )
    return null
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }} className="animate-fade-in">
      <div>
        <h1 className="page-title">Reports</h1>
        <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>Generate and export business reports</p>
      </div>

      {/* Report Type Cards — matches the image exactly */}
      <div className="card" style={{ padding:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.06em' }}>Generate Reports</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {REPORT_TYPES.map(rt => (
            <div key={rt.id} style={{ border:`2px solid ${active===rt.id ? rt.color : 'var(--border)'}`, borderRadius:12, padding:'12px 16px', minWidth:140, background: active===rt.id ? rt.bg : 'var(--card)', cursor:'pointer', transition:'all 0.15s' }}
              onClick={() => loadReport(rt.id)}>
              <div style={{ fontSize:12, fontWeight:700, color: active===rt.id ? rt.color : 'var(--text)', marginBottom:8 }}>{rt.label}</div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={e=>{ e.stopPropagation(); if(data && active===rt.id) generatePDF(rt.id, data, range); else { loadReport(rt.id).then(()=>{}) } }}
                  style={{ padding:'3px 10px', borderRadius:6, border:'none', fontSize:11, fontWeight:700, cursor:'pointer', background:'#fee2e2', color:'#dc2626' }}>
                  PDF
                </button>
                <button onClick={e=>{ e.stopPropagation(); if(data && active===rt.id) generateExcel(rt.id, data, range); else { loadReport(rt.id).then(()=>{}) } }}
                  style={{ padding:'3px 10px', borderRadius:6, border:'none', fontSize:11, fontWeight:700, cursor:'pointer', background:'#dcfce7', color:'#16a34a' }}>
                  EXCEL
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Date Range + Export (shown when report is active) */}
      {active && (
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', justifyContent:'space-between' }}>
          <DateRange from={range.from} to={range.to} onChange={newRange => { setRange(newRange); loadReport(active) }} />
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => loadReport(active)} className="btn btn-secondary" style={{ fontSize:12 }}>↻ Refresh</button>
            {data && <>
              <button onClick={() => generateExcel(active, data, range)} className="btn btn-success" style={{ fontSize:12 }}>↓ Excel</button>
              <button onClick={() => generatePDF(active, data, range)} className="btn btn-primary" style={{ fontSize:12 }}>↓ PDF</button>
            </>}
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      {active && data && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
          {active==='sales' && [
            ['Orders', data.orders?.length||0, 'var(--text)'],
            ['Revenue', fmt(data.orders?.reduce((s,o)=>s+parseFloat(o.total_amount||0),0)||0), 'var(--primary)'],
            ['Received', fmt(data.orders?.reduce((s,o)=>s+parseFloat(o.amount_paid||0),0)||0), 'var(--green)'],
            ['Due', fmt((data.orders?.reduce((s,o)=>s+parseFloat(o.total_amount||0),0)||0)-(data.orders?.reduce((s,o)=>s+parseFloat(o.amount_paid||0),0)||0)), 'var(--red)'],
          ].map(([l,v,c])=>(
            <div key={l} className="card" style={{ padding:'12px 14px' }}>
              <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginTop:2 }}>{l}</div>
            </div>
          ))}
          {active==='expenses' && [
            ['Entries', data.expenses?.length||0, 'var(--text)'],
            ['Total', fmt(data.expenses?.reduce((s,e)=>s+parseFloat(e.amount||0),0)||0), 'var(--red)'],
          ].map(([l,v,c])=>(
            <div key={l} className="card" style={{ padding:'12px 14px' }}>
              <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginTop:2 }}>{l}</div>
            </div>
          ))}
          {active==='profit' && (() => {
            const s=data.monthly?.reduce((x,m)=>x+m.sales,0)||0, e=data.monthly?.reduce((x,m)=>x+m.expenses,0)||0
            return [['Revenue',fmt(s),'var(--primary)'],['Expenses',fmt(e),'var(--red)'],['Net Profit',fmt(s-e),s-e>=0?'var(--green)':'var(--red)']].map(([l,v,c])=>(
              <div key={l} className="card" style={{ padding:'12px 14px' }}>
                <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginTop:2 }}>{l}</div>
              </div>
            ))
          })()}
        </div>
      )}

      {/* Data Table */}
      {loading && <LoadingPage />}
      {!loading && data && (
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:700, fontSize:13, color: reportType?.color }}>{reportType?.label}</span>
            <span style={{ fontSize:11, color:'var(--text3)' }}>{fmtDate(range.from)} → {fmtDate(range.to)}</span>
          </div>
          <div style={{ overflowX:'auto' }}>{renderTable()}</div>
        </div>
      )}
      {!loading && !data && !active && (
        <div className="card" style={{ padding:48, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:6 }}>Select a Report Type</div>
          <div style={{ fontSize:13, color:'var(--text3)' }}>Click any report card above to generate and view it</div>
        </div>
      )}
    </div>
  )
}
