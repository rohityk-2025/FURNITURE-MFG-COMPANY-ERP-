/**
 * GST MODULE - frontend/src/pages/admin/GST.jsx
 * Tabs: Dashboard | Output GST | Input GST | GSTR-1
 */
import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import { LoadingPage, useToast, fmt } from '../../components/ui'

// ── Helpers ───────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const round2 = (v) => Math.round((parseFloat(v||0) + Number.EPSILON) * 100) / 100
const fmtN   = (n) => `₹${round2(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const fmtDate= (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

// ── Month Selector ────────────────────────────────────────────────
function MonthFilter({ year, month, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <select value={month} onChange={e=>onChange(parseInt(e.target.value),year)}
        style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', fontSize:13, fontWeight:600, cursor:'pointer', outline:'none' }}>
        {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
      </select>
      <select value={year} onChange={e=>onChange(month,parseInt(e.target.value))}
        style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', fontSize:13, fontWeight:600, cursor:'pointer', outline:'none' }}>
        {[2023,2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
      </select>
      <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>
        {MONTHS[month-1]} {year}
      </span>
    </div>
  )
}

// ── Summary Box ───────────────────────────────────────────────────
function SBox({ label, value, color='var(--text)', bg='var(--card)', sub }) {
  return (
    <div style={{ background:bg, border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
      <div style={{ fontSize:10, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:900, color, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>{sub}</div>}
    </div>
  )
}

// ── Export helpers ────────────────────────────────────────────────
function exportCSV(rows, filename) {
  const csv = rows.map(r => r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href=url; a.download=filename; a.click()
  URL.revokeObjectURL(url)
}

function exportJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href=url; a.download=filename; a.click()
  URL.revokeObjectURL(url)
}

function exportPDF(title, summaryRows, tableHeaders, tableRows, monthLabel) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:20px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #2563eb;padding-bottom:10px;margin-bottom:14px}
    .title{font-size:18px;font-weight:900;color:#2563eb}
    .sub{font-size:11px;color:#64748b;margin-top:3px}
    .badge{background:#eff6ff;color:#2563eb;padding:4px 10px;border-radius:5px;font-weight:700;font-size:11px}
    .summary{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:14px}
    .scard{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px}
    .sv{font-size:15px;font-weight:800}.sl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-top:1px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#1e293b;color:#fff;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase}
    td{padding:6px 8px;border-bottom:1px solid #f1f5f9}
    tr:nth-child(even) td{background:#fafafa}
    tfoot td{background:#f1f5f9!important;border-top:2px solid #e2e8f0;font-weight:700}
    @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <div class="header">
    <div><div class="title">${title}</div><div class="sub">Period: ${monthLabel} · Generated: ${new Date().toLocaleDateString('en-IN')}</div></div>
    <div class="badge">${monthLabel}</div>
  </div>
  <div class="summary">
    ${summaryRows.map(([l,v,c])=>`<div class="scard"><div class="sv" style="color:${c||'#1e293b'}">${v}</div><div class="sl">${l}</div></div>`).join('')}
  </div>
  <table>
    <thead><tr>${tableHeaders.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
  </body></html>`
  const w = window.open('','_blank'); w.document.write(html); w.document.close()
  setTimeout(()=>{ w.focus(); w.print() }, 500)
}

// ── TAB: Dashboard ────────────────────────────────────────────────
function GSTDashboard({ year, month }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/gst/summary', { params:{ year, month } })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, month])

  if (loading) return <LoadingPage />
  if (!data) return null

  const boxes = [
    { label:'Total Sales', value:fmtN(data.totalSales), color:'var(--primary)', bg:'var(--primary-bg)', sub:`${data.orderCount} orders` },
    { label:'Total Purchases', value:fmtN(data.totalPurchases), color:'var(--red)', bg:'var(--red-bg)', sub:`${data.expenseCount} expenses` },
    { label:'Output GST', value:fmtN(data.outputGST), color:'#7c3aed', bg:'var(--secondary-bg)', sub:`CGST: ${fmtN(data.cgst)} + SGST: ${fmtN(data.sgst)}${data.igst>0?` + IGST: ${fmtN(data.igst)}`:''}` },
    { label:'Input GST (ITC)', value:fmtN(data.inputGST), color:'var(--orange)', bg:'var(--orange-bg)', sub:'From eligible expenses' },
    { label:'Net GST Payable', value:fmtN(data.netPayable), color: data.netPayable>0 ? 'var(--red)' : 'var(--green)', bg: data.netPayable>0 ? 'var(--red-bg)' : 'var(--green-bg)', sub: data.netPayable>0 ? 'Tax to be paid' : '—' },
    { label:'ITC Carry Forward', value:fmtN(data.itcCarryForward), color:'var(--green)', bg:'var(--green-bg)', sub:'Excess ITC for next month' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
        {boxes.map(b => <SBox key={b.label} {...b} />)}
      </div>

      {/* GST Payable Banner */}
      <div style={{ background: data.netPayable > 0 ? '#fef2f2' : '#f0fdf4', border:`2px solid ${data.netPayable>0?'var(--red)':'var(--green)'}`, borderRadius:14, padding:'16px 20px' }}>
        <div style={{ fontSize:13, fontWeight:700, color: data.netPayable>0?'var(--red)':'var(--green)', marginBottom:8 }}>
          {data.netPayable > 0 ? '⚠ GST Payable This Month' : '✓ No GST Payable — ITC Sufficient'}
        </div>
        <div style={{ display:'flex', gap:24, flexWrap:'wrap', fontSize:13 }}>
          <span>Output GST: <strong>{fmtN(data.outputGST)}</strong></span>
          <span style={{ color:'var(--text3)' }}>−</span>
          <span>Input GST (ITC): <strong>{fmtN(data.inputGST)}</strong></span>
          <span style={{ color:'var(--text3)' }}>=</span>
          <span style={{ fontWeight:800, fontSize:16, color:data.netPayable>0?'var(--red)':'var(--green)' }}>
            {data.netPayable > 0 ? fmtN(data.netPayable) : `ITC Carry Fwd: ${fmtN(data.itcCarryForward)}`}
          </span>
        </div>
      </div>

      {/* Period Info */}
      <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center' }}>
        Period: {fmtDate(data.from)} to {fmtDate(data.to)}
      </div>
    </div>
  )
}

// ── TAB: Output GST ───────────────────────────────────────────────
function OutputGST({ year, month }) {
  const toast  = useToast()
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState({}) // orderId -> {cgst,sgst,igst}
  const [saving,   setSaving]   = useState({})
  const monthLabel = `${MONTHS[month-1]} ${year}`

  const load = useCallback(() => {
    setLoading(true)
    api.get('/gst/output', { params:{ year, month } })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, month])

  useEffect(() => { load() }, [load])

  const startEdit = (o) => setEditing(p => ({ ...p, [o.id]:{ cgst: o.cgst, sgst: o.sgst, igst: o.igst } }))
  const cancelEdit = (id) => setEditing(p => { const n={...p}; delete n[id]; return n })

  const saveEdit = async (id) => {
    setSaving(p => ({ ...p, [id]:true }))
    try {
      await api.put(`/gst/output/${id}`, editing[id])
      toast('GST values updated')
      cancelEdit(id); load()
    } catch(err) { toast(err.response?.data?.error || 'Failed','error') }
    finally { setSaving(p => ({ ...p, [id]:false })) }
  }

  const handleExcelOutput = () => {
    if (!data) return
    const rows = [['Sr.No.','Invoice No.','Date','Customer','GSTIN','Taxable Amt','CGST','SGST','IGST','Total GST','Invoice Total']]
    data.orders.forEach((o,i) => rows.push([
      i+1, o.order_number, o.order_date?.slice(0,10), o.customer_name, o.customer_gstin||'',
      round2(o.taxable_amount), round2(o.cgst), round2(o.sgst), round2(o.igst),
      round2(parseFloat(o.cgst||0)+parseFloat(o.sgst||0)+parseFloat(o.igst||0)),
      round2(o.total_amount)
    ]))
    rows.push([]); rows.push(['TOTAL','','','','',round2(data.summary.totalTaxable),round2(data.summary.totalCGST),round2(data.summary.totalSGST),0,round2(data.summary.totalOutput),''  ])
    exportCSV(rows, `Output_GST_${monthLabel.replace(' ','_')}.csv`)
  }

  const handlePDFOutput = () => {
    if (!data) return
    const s = data.summary
    exportPDF(
      `Output GST Report — ${monthLabel}`,
      [['Taxable Amount',fmtN(s.totalTaxable),'#2563eb'],['CGST',fmtN(s.totalCGST),'#7c3aed'],['SGST',fmtN(s.totalSGST),'#7c3aed'],['IGST',fmtN(s.totalIGST),'#7c3aed'],['Total Output GST',fmtN(s.totalOutput),'#dc2626']],
      ['#','Invoice No.','Date','Customer','GSTIN','Taxable','CGST','SGST','IGST','Total GST'],
      data.orders.map((o,i) => [i+1, o.order_number, o.order_date?.slice(0,10), o.customer_name, o.customer_gstin||'—', fmtN(o.taxable_amount), fmtN(o.cgst), fmtN(o.sgst), fmtN(o.igst), fmtN(parseFloat(o.cgst||0)+parseFloat(o.sgst||0)+parseFloat(o.igst||0))]),
      monthLabel
    )
  }

  const handleJSONOutput = () => {
    if (!data) return
    exportJSON({ period:monthLabel, summary:data.summary, orders:data.orders }, `Output_GST_${monthLabel.replace(' ','_')}.json`)
  }

  if (loading) return <LoadingPage />
  if (!data) return null
  const s = data.summary

  const inp = (val, key, id) => (
    <input type="number" value={editing[id]?.[key]??val} step="0.01" min={0}
      onChange={e => setEditing(p => ({ ...p, [id]:{ ...p[id], [key]:e.target.value } }))}
      style={{ width:70, padding:'3px 6px', borderRadius:6, border:'1.5px solid var(--primary)', background:'var(--card)', color:'var(--text)', fontSize:12, textAlign:'right', outline:'none' }} />
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Summary Boxes */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
        <SBox label="Total Taxable" value={fmtN(s.totalTaxable)} color="var(--primary)" />
        <SBox label="Total CGST" value={fmtN(s.totalCGST)} color="#7c3aed" />
        <SBox label="Total SGST" value={fmtN(s.totalSGST)} color="#7c3aed" />
        <SBox label="Total IGST" value={fmtN(s.totalIGST)} color="#2563eb" />
        <SBox label="Total Output GST" value={fmtN(s.totalOutput)} color="var(--red)" bg="var(--red-bg)" />
        <SBox label="Orders" value={s.orderCount} color="var(--text)" sub={monthLabel} />
      </div>

      {/* Rate-wise breakdown */}
      {data.rateBreakdown?.length > 0 && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:10 }}>GST Rate-wise Breakdown</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr>{['Rate','Taxable Amt','CGST','SGST','IGST','Total Tax'].map(h=><th key={h} className="table-th">{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.rateBreakdown.map((r,i) => (
                  <tr key={i} className="table-row">
                    <td className="table-td"><span style={{ background:'var(--primary-bg)',color:'var(--primary)',padding:'2px 8px',borderRadius:6,fontWeight:700,fontSize:11 }}>{parseFloat(r.gst_rate||0)}%</span></td>
                    <td className="table-td">{fmtN(r.taxable)}</td>
                    <td className="table-td">{fmtN(r.cgst_amt)}</td>
                    <td className="table-td">{fmtN(r.sgst_amt)}</td>
                    <td className="table-td">{fmtN(r.igst_amt)}</td>
                    <td className="table-td" style={{ fontWeight:700 }}>{fmtN(parseFloat(r.cgst_amt||0)+parseFloat(r.sgst_amt||0)+parseFloat(r.igst_amt||0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button onClick={handleExcelOutput} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--green)', background:'var(--green-bg)', color:'var(--green)', fontWeight:700, fontSize:12, cursor:'pointer' }}>↓ Excel</button>
        <button onClick={handlePDFOutput}   style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--red)', background:'var(--red-bg)', color:'var(--red)', fontWeight:700, fontSize:12, cursor:'pointer' }}>↓ PDF</button>
        <button onClick={handleJSONOutput}  style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--primary)', background:'var(--primary-bg)', color:'var(--primary)', fontWeight:700, fontSize:12, cursor:'pointer' }}>↓ JSON</button>
        <span style={{ fontSize:11, color:'var(--text3)', alignSelf:'center', marginLeft:4 }}>Click any row to edit GST values (CA use)</span>
      </div>

      {/* Order List */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr>{['#','Invoice','Date','Customer','GSTIN','Taxable','CGST','SGST','IGST','Total GST','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.orders.length === 0 && (
                <tr><td colSpan={11} style={{ padding:24, textAlign:'center', color:'var(--text3)' }}>No orders found for {monthLabel}</td></tr>
              )}
              {data.orders.map((o,i) => {
                const isEditing = !!editing[o.id]
                const editV = editing[o.id] || {}
                const totalGST = round2(parseFloat(o.cgst||0)+parseFloat(o.sgst||0)+parseFloat(o.igst||0))
                return (
                  <tr key={o.id} className="table-row">
                    <td className="table-td" style={{ color:'var(--text3)' }}>{i+1}</td>
                    <td className="table-td" style={{ fontWeight:700, fontFamily:'monospace', color:'var(--primary)', fontSize:11 }}>{o.order_number}</td>
                    <td className="table-td" style={{ fontSize:11, color:'var(--text3)', whiteSpace:'nowrap' }}>{o.order_date?.slice(0,10)}</td>
                    <td className="table-td" style={{ fontWeight:600 }}>{o.customer_name}</td>
                    <td className="table-td" style={{ fontSize:11, fontFamily:'monospace', color:'var(--text3)' }}>{o.customer_gstin||<span style={{color:'var(--border)'}}>B2C</span>}</td>
                    <td className="table-td" style={{ fontWeight:600 }}>{fmtN(o.taxable_amount)}</td>
                    <td className="table-td">{isEditing ? inp(o.cgst,'cgst',o.id) : fmtN(o.cgst)}</td>
                    <td className="table-td">{isEditing ? inp(o.sgst,'sgst',o.id) : fmtN(o.sgst)}</td>
                    <td className="table-td">{isEditing ? inp(o.igst,'igst',o.id) : fmtN(o.igst)}</td>
                    <td className="table-td" style={{ fontWeight:700, color:'#7c3aed' }}>{fmtN(totalGST)}</td>
                    <td className="table-td">
                      {isEditing ? (
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>saveEdit(o.id)} disabled={saving[o.id]}
                            style={{ padding:'3px 8px', borderRadius:6, background:'var(--green)', color:'#fff', border:'none', fontWeight:700, fontSize:11, cursor:'pointer' }}>
                            {saving[o.id]?'…':'Save'}
                          </button>
                          <button onClick={()=>cancelEdit(o.id)}
                            style={{ padding:'3px 8px', borderRadius:6, background:'var(--bg2)', color:'var(--text2)', border:'1px solid var(--border)', fontWeight:700, fontSize:11, cursor:'pointer' }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button onClick={()=>startEdit(o)}
                          style={{ padding:'3px 10px', borderRadius:6, background:'var(--primary-bg)', color:'var(--primary)', border:'none', fontWeight:700, fontSize:11, cursor:'pointer' }}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {data.orders.length > 0 && (
              <tfoot>
                <tr style={{ background:'var(--bg2)' }}>
                  <td colSpan={5} className="table-td" style={{ fontWeight:700, textAlign:'right' }}>TOTAL</td>
                  <td className="table-td" style={{ fontWeight:800 }}>{fmtN(s.totalTaxable)}</td>
                  <td className="table-td" style={{ fontWeight:800 }}>{fmtN(s.totalCGST)}</td>
                  <td className="table-td" style={{ fontWeight:800 }}>{fmtN(s.totalSGST)}</td>
                  <td className="table-td" style={{ fontWeight:800 }}>{fmtN(s.totalIGST)}</td>
                  <td className="table-td" style={{ fontWeight:900, color:'var(--red)', fontSize:14 }}>{fmtN(s.totalOutput)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

// ── TAB: Input GST ────────────────────────────────────────────────
function InputGST({ year, month }) {
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [excluded, setExcluded] = useState(new Set())
  const monthLabel = `${MONTHS[month-1]} ${year}`

  useEffect(() => {
    setLoading(true)
    setExcluded(new Set())
    api.get('/gst/input', { params:{ year, month } })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, month])

  const toggle = (id) => setExcluded(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n })

  const active = (data?.expenses || []).filter(e => !excluded.has(e.id))
  const totalInputGST  = active.reduce((s,e) => s + parseFloat(e.tax_amount||0), 0)
  const totalTaxable   = active.reduce((s,e) => s + parseFloat(e.taxable_amount||0), 0)
  const totalWithTax   = active.reduce((s,e) => s + parseFloat(e.amount||0), 0)

  const handleExcel = () => {
    const rows = [['Sr.No.','Title','Category','Vendor','Vendor GSTIN','Date','Taxable Amt','Tax %','Tax (GST)','Amount with Tax']]
    active.forEach((e,i) => rows.push([
      i+1, e.title, e.category, e.vendor_name||'', e.vendor_gst||'',
      e.date?.slice(0,10), round2(e.taxable_amount), e.tax_pct||0, round2(e.tax_amount), round2(e.amount)
    ]))
    rows.push([]); rows.push(['TOTAL','','','','','',round2(totalTaxable),'',round2(totalInputGST),round2(totalWithTax)])
    exportCSV(rows, `Input_GST_${monthLabel.replace(' ','_')}.csv`)
  }

  const handlePDF = () => {
    exportPDF(
      `Input GST Report — ${monthLabel}`,
      [['Total Taxable',fmtN(totalTaxable),'#2563eb'],['Total Input GST (ITC)',fmtN(totalInputGST),'#16a34a'],['Total Amount',fmtN(totalWithTax),'#1e293b']],
      ['#','Title','Category','Vendor','Date','Taxable','Tax%','Tax Amt','Total'],
      active.map((e,i) => [i+1, e.title, e.category, e.vendor_name||'—', e.date?.slice(0,10), fmtN(e.taxable_amount), `${e.tax_pct||0}%`, fmtN(e.tax_amount), fmtN(e.amount)]),
      monthLabel
    )
  }

  const handleJSON = () => {
    exportJSON({ period:monthLabel, summary:{ totalTaxable, totalInputGST, totalWithTax, count:active.length }, expenses:active }, `Input_GST_${monthLabel.replace(' ','_')}.json`)
  }

  if (loading) return <LoadingPage />
  if (!data) return null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
        <SBox label="Taxable Amount" value={fmtN(totalTaxable)} color="var(--primary)" />
        <SBox label="Input GST (ITC)" value={fmtN(totalInputGST)} color="var(--green)" bg="var(--green-bg)" />
        <SBox label="Total with Tax" value={fmtN(totalWithTax)} color="var(--text)" />
        <SBox label="Active Expenses" value={active.length} color="var(--text3)" sub={`${excluded.size} excluded`} />
      </div>

      {excluded.size > 0 && (
        <div style={{ background:'var(--yellow-bg)', border:'1px solid var(--yellow)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'var(--yellow)', fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>⚠ {excluded.size} expense(s) excluded from ITC calculation</span>
          <button onClick={()=>setExcluded(new Set())} style={{ padding:'3px 10px', borderRadius:6, background:'var(--yellow)', color:'#fff', border:'none', fontWeight:700, fontSize:11, cursor:'pointer' }}>Reset</button>
        </div>
      )}

      {/* Export */}
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={handleExcel} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--green)', background:'var(--green-bg)', color:'var(--green)', fontWeight:700, fontSize:12, cursor:'pointer' }}>↓ Excel</button>
        <button onClick={handlePDF}   style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--red)', background:'var(--red-bg)', color:'var(--red)', fontWeight:700, fontSize:12, cursor:'pointer' }}>↓ PDF</button>
        <button onClick={handleJSON}  style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--primary)', background:'var(--primary-bg)', color:'var(--primary)', fontWeight:700, fontSize:12, cursor:'pointer' }}>↓ JSON</button>
        <span style={{ fontSize:11, color:'var(--text3)', alignSelf:'center' }}>Use ☐ checkbox or ✕ to exclude expenses</span>
      </div>

      {/* Expense Table */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr>{['☐','#','Title','Category','Vendor','Date','Taxable Amt','Tax%','Input GST','Amt with Tax',''].map(h=><th key={h} className="table-th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.expenses.length === 0 && (
                <tr><td colSpan={11} style={{ padding:24, textAlign:'center', color:'var(--text3)' }}>No expenses with GST for {monthLabel}</td></tr>
              )}
              {data.expenses.map((e,i) => {
                const isExcluded = excluded.has(e.id)
                return (
                  <tr key={e.id} className="table-row" style={{ opacity: isExcluded ? 0.4 : 1, background: isExcluded ? 'var(--bg2)' : '' }}>
                    <td className="table-td">
                      <input type="checkbox" checked={!isExcluded} onChange={()=>toggle(e.id)}
                        style={{ width:14, height:14, cursor:'pointer', accentColor:'var(--primary)' }} />
                    </td>
                    <td className="table-td" style={{ color:'var(--text3)' }}>{i+1}</td>
                    <td className="table-td" style={{ fontWeight:600 }}>{e.title}</td>
                    <td className="table-td"><span style={{ background:'var(--bg2)', padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:700 }}>{e.category}</span></td>
                    <td className="table-td" style={{ fontSize:11, color:'var(--text3)' }}>{e.vendor_name||'—'}</td>
                    <td className="table-td" style={{ fontSize:11, color:'var(--text3)', whiteSpace:'nowrap' }}>{e.date?.slice(0,10)}</td>
                    <td className="table-td">{fmtN(e.taxable_amount)}</td>
                    <td className="table-td" style={{ color:'var(--text3)' }}>{e.tax_pct||0}%</td>
                    <td className="table-td" style={{ fontWeight:700, color:'var(--green)' }}>{fmtN(e.tax_amount)}</td>
                    <td className="table-td" style={{ fontWeight:600 }}>{fmtN(e.amount)}</td>
                    <td className="table-td">
                      <button onClick={()=>toggle(e.id)}
                        style={{ width:22, height:22, borderRadius:'50%', border:'none', background:isExcluded?'var(--green)':'var(--red-bg)', color:isExcluded?'#fff':'var(--red)', fontWeight:800, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {isExcluded ? '+' : '✕'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {data.expenses.length > 0 && (
              <tfoot>
                <tr style={{ background:'var(--bg2)' }}>
                  <td colSpan={6} className="table-td" style={{ fontWeight:700, textAlign:'right' }}>TOTAL ({active.length} active)</td>
                  <td className="table-td" style={{ fontWeight:800 }}>{fmtN(totalTaxable)}</td>
                  <td></td>
                  <td className="table-td" style={{ fontWeight:900, color:'var(--green)', fontSize:14 }}>{fmtN(totalInputGST)}</td>
                  <td className="table-td" style={{ fontWeight:800 }}>{fmtN(totalWithTax)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

// ── TAB: GSTR-1 ───────────────────────────────────────────────────
function GSTR1({ year, month }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const monthLabel = `${MONTHS[month-1]} ${year}`

  useEffect(() => {
    setLoading(true)
    api.get('/gst/gstr1', { params:{ year, month } })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, month])

  const handleGSTR1Excel = () => {
    if (!data) return
    const rows = [
      ['GSTR-1 Report', data.legal_name || '', 'GSTIN:', data.gstin || '', 'Period:', monthLabel],
      [],
      ['B2B INVOICES (Registered Buyers)'],
      ['Sr.No.','Invoice No.','Invoice Date','Buyer Name','Buyer GSTIN','Taxable Value','CGST','SGST','IGST','Total Tax','Invoice Value'],
    ]
    data.b2b.forEach((o,i) => rows.push([
      i+1, o.inv_no, o.inv_date?.slice(0,10), o.buyer_name, o.buyer_gstin,
      round2(o.taxable_value), round2(o.cgst), round2(o.sgst), round2(o.igst),
      round2(parseFloat(o.cgst||0)+parseFloat(o.sgst||0)+parseFloat(o.igst||0)),
      round2(o.invoice_value)
    ]))
    rows.push(['TOTAL','','','','',round2(data.b2b.reduce((s,o)=>s+parseFloat(o.taxable_value||0),0)),'','','','',round2(data.b2b.reduce((s,o)=>s+parseFloat(o.invoice_value||0),0))])
    rows.push([]); rows.push(['B2C INVOICES (Unregistered Buyers)'])
    rows.push(['Sr.No.','Invoice No.','Date','Buyer Name','Taxable Value','CGST','SGST','IGST','Invoice Value'])
    data.b2c.forEach((o,i) => rows.push([i+1, o.inv_no, o.inv_date?.slice(0,10), o.buyer_name, round2(o.taxable_value), round2(o.cgst), round2(o.sgst), round2(o.igst), round2(o.invoice_value)]))
    exportCSV(rows, `GSTR1_${monthLabel.replace(' ','_')}.csv`)
  }

  const handleGSTR1JSON = () => {
    if (!data) return
    // GSTR-1 JSON format (simplified, per GST portal structure)
    const gstr1 = {
      gstin: data.gstin,
      fp: data.ret_period,
      b2b: data.b2b.map(o => ({
        ctin: o.buyer_gstin,
        inv: [{
          inum: o.inv_no, idt: o.inv_date?.slice(0,10),
          val: parseFloat(o.invoice_value),
          pos: '27', // state code — update as needed
          rchrg: 'N', inv_typ: 'R',
          itms: [{ num: 1, itm_det: { txval: parseFloat(o.taxable_value), rt: 18, camt: parseFloat(o.cgst), samt: parseFloat(o.sgst), iamt: parseFloat(o.igst), csamt: 0 } }]
        }]
      })),
      b2cl: data.b2c.map(o => ({
        pos: '27',
        inv: [{ inum: o.inv_no, idt: o.inv_date?.slice(0,10), val: parseFloat(o.invoice_value), itms: [{ num: 1, itm_det: { txval: parseFloat(o.taxable_value), rt: 18, camt: parseFloat(o.cgst), samt: parseFloat(o.sgst), iamt: parseFloat(o.igst) } }] }]
      }))
    }
    exportJSON(gstr1, `GSTR1_${monthLabel.replace(' ','_')}.json`)
  }

  const handleGSTR3B = () => {
    if (!data) return
    const totalB2BTax = data.summary.totalB2BTax || 0
    const totalB2CTax = data.summary.totalB2CTax || 0
    const rows = [
      ['GSTR-3B Summary', data.legal_name, 'GSTIN:', data.gstin, 'Period:', monthLabel],
      [],
      ['3.1 Tax on outward supplies'],
      ['Nature of Supplies','Taxable Value','IGST','CGST','SGST','Cess'],
      ['(a) Outward taxable supplies (B2B)', round2(data.b2b.reduce((s,o)=>s+parseFloat(o.taxable_value||0),0)), 0, round2(data.b2b.reduce((s,o)=>s+parseFloat(o.cgst||0),0)), round2(data.b2b.reduce((s,o)=>s+parseFloat(o.sgst||0),0)), 0],
      ['(b) Outward taxable supplies (B2C)', round2(data.b2c.reduce((s,o)=>s+parseFloat(o.taxable_value||0),0)), 0, round2(data.b2c.reduce((s,o)=>s+parseFloat(o.cgst||0),0)), round2(data.b2c.reduce((s,o)=>s+parseFloat(o.sgst||0),0)), 0],
      [],
      ['Total Output Tax (approx)', round2(totalB2BTax + totalB2CTax),'','','',''],
      ['Note: Please verify with your CA before filing on GST portal.']
    ]
    exportCSV(rows, `GSTR3B_${monthLabel.replace(' ','_')}.csv`)
  }

  if (loading) return <LoadingPage />
  if (!data) return null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Info */}
      <div style={{ background:'var(--primary-bg)', border:'1px solid var(--primary)', borderRadius:12, padding:'14px 16px' }}>
        <div style={{ fontWeight:700, fontSize:13, color:'var(--primary)', marginBottom:6 }}>GSTR-1 Filing Data — {monthLabel}</div>
        <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.8 }}>
          <strong>Company:</strong> {data.legal_name || '—'} &nbsp;&nbsp;
          <strong>GSTIN:</strong> {data.gstin || <span style={{color:'var(--red)'}}>Not configured — update in Company Settings</span>} &nbsp;&nbsp;
          <strong>Period:</strong> {data.ret_period}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
        <SBox label="B2B Orders" value={data.b2b.length} color="var(--primary)" sub="With customer GSTIN" />
        <SBox label="B2C Orders" value={data.b2c.length} color="var(--orange)" sub="Without GSTIN" />
        <SBox label="B2B Output Tax" value={fmtN(data.summary.totalB2BTax)} color="#7c3aed" />
        <SBox label="B2C Output Tax" value={fmtN(data.summary.totalB2CTax)} color="#2563eb" />
      </div>

      {/* Export */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button onClick={handleGSTR1Excel} style={{ padding:'9px 18px', borderRadius:9, border:'1px solid var(--green)', background:'var(--green-bg)', color:'var(--green)', fontWeight:700, fontSize:13, cursor:'pointer' }}>↓ GSTR-1 Excel</button>
        <button onClick={handleGSTR1JSON}  style={{ padding:'9px 18px', borderRadius:9, border:'1px solid var(--primary)', background:'var(--primary-bg)', color:'var(--primary)', fontWeight:700, fontSize:13, cursor:'pointer' }}>↓ GSTR-1 JSON</button>
        <button onClick={handleGSTR3B}     style={{ padding:'9px 18px', borderRadius:9, border:'1px solid #7c3aed', background:'var(--secondary-bg)', color:'var(--secondary)', fontWeight:700, fontSize:13, cursor:'pointer' }}>↓ GSTR-3B Excel</button>
      </div>

      {/* Note */}
      <div style={{ background:'var(--yellow-bg)', border:'1px solid var(--yellow)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'var(--yellow)', fontWeight:600 }}>
        ⚠ Note: Always verify GST data with your Chartered Accountant before filing on the GST portal. This is a helper tool for data organization.
      </div>

      {/* B2B Table */}
      {data.b2b.length > 0 && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:13 }}>B2B Invoices ({data.b2b.length})</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr>{['#','Invoice','Date','Buyer','GSTIN','Taxable','CGST','SGST','IGST','Value'].map(h=><th key={h} className="table-th">{h}</th>)}</tr></thead>
              <tbody>
                {data.b2b.map((o,i) => (
                  <tr key={i} className="table-row">
                    <td className="table-td" style={{ color:'var(--text3)' }}>{i+1}</td>
                    <td className="table-td" style={{ fontFamily:'monospace', fontSize:11, color:'var(--primary)', fontWeight:700 }}>{o.inv_no}</td>
                    <td className="table-td" style={{ fontSize:11, whiteSpace:'nowrap' }}>{o.inv_date?.slice(0,10)}</td>
                    <td className="table-td" style={{ fontWeight:600 }}>{o.buyer_name}</td>
                    <td className="table-td" style={{ fontFamily:'monospace', fontSize:11, color:'var(--text3)' }}>{o.buyer_gstin}</td>
                    <td className="table-td">{fmtN(o.taxable_value)}</td>
                    <td className="table-td">{fmtN(o.cgst)}</td>
                    <td className="table-td">{fmtN(o.sgst)}</td>
                    <td className="table-td">{fmtN(o.igst)}</td>
                    <td className="table-td" style={{ fontWeight:700 }}>{fmtN(o.invoice_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
const TABS = [
  { id:'dashboard', label:'GST Dashboard' },
  { id:'output',    label:'Output GST' },
  { id:'input',     label:'Input GST (ITC)' },
  { id:'gstr1',     label:'GSTR-1 / 3B' },
]

export default function GSTPage() {
  const now   = new Date()
  const [tab,   setTab]   = useState('dashboard')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())

  const handleMonthChange = (m, y) => { setMonth(m); setYear(y) }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', margin:0 }}>GST Management</h1>
          <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>Input/Output GST · GSTR-1 · GSTR-3B</p>
        </div>
        <MonthFilter year={year} month={month} onChange={handleMonthChange} />
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'var(--bg2)', padding:3, borderRadius:10, overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:700, border:'none', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.12s',
              background: tab===t.id ? 'var(--card)' : 'transparent',
              color:       tab===t.id ? 'var(--primary)' : 'var(--text2)',
              boxShadow:   tab===t.id ? 'var(--shadow)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'dashboard' && <GSTDashboard year={year} month={month} />}
      {tab === 'output'    && <OutputGST    year={year} month={month} />}
      {tab === 'input'     && <InputGST     year={year} month={month} />}
      {tab === 'gstr1'     && <GSTR1        year={year} month={month} />}
    </div>
  )
}
