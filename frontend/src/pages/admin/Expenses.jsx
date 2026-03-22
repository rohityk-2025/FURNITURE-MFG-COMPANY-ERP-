import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import { Modal, LoadingPage, EmptyState, SearchBar, StatusBadge, fmt, fmtDate, useToast, Confirm } from '../../components/ui'

const CATS = ['MATERIAL','UTILITIES','TRANSPORT','MAINTENANCE','RENT','OTHER']
const empty = { title:'', category:'OTHER', amount:'', tax_pct:'', tax_amount:'', vendor_name:'', vendor_gst:'', description:'', date:new Date().toISOString().split('T')[0] }

function exportPDF(expenses) {
  const total = expenses.reduce((s,e)=>s+parseFloat(e.amount||0),0)
  const fmtM  = (n) => `₹${parseFloat(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
  const fmtD  = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'
  const byCat = CATS.map(c=>({ cat:c, total:expenses.filter(e=>e.category===c).reduce((s,e)=>s+parseFloat(e.amount||0),0) })).filter(c=>c.total>0)

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
    <div><div class="title">Expenses Report</div><div class="sub">WoodCraft ERP · ${fmtD(new Date())}</div></div>
    <div class="date-badge">Total: ${fmtM(total)}</div>
  </div>
  <div class="summary">
    <div class="card"><div class="sv">${expenses.length}</div><div class="sl">Total Entries</div></div>
    <div class="card"><div class="sv" style="color:#dc2626">${fmtM(total)}</div><div class="sl">Total Amount</div></div>
    ${byCat.slice(0,2).map(c=>`<div class="card"><div class="sv">${fmtM(c.total)}</div><div class="sl">${c.cat}</div></div>`).join('')}
  </div>
  <table>
    <thead><tr><th>#</th><th>Title</th><th>Category</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Tax</th></tr></thead>
    <tbody>${expenses.map((e,i)=>`<tr><td>${i+1}</td><td>${e.title}</td><td>${e.category}</td><td>${e.vendor_name||'—'}</td><td>${fmtD(e.date)}</td><td style="text-align:right;color:#dc2626;font-weight:600">${fmtM(e.amount)}</td><td style="text-align:right">${e.tax_amount?fmtM(e.tax_amount):'—'}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="5">TOTAL</td><td style="text-align:right;color:#dc2626">${fmtM(total)}</td><td></td></tr></tfoot>
  </table>
  </body></html>`

  const w = window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>{ w.focus(); w.print() }, 500)
}

function exportExcel(expenses) {
  const rows = [['Title','Category','Amount','Tax %','Tax Amount','Vendor','GST','Date','Description','Added By']]
  expenses.forEach(e => rows.push([e.title,e.category,e.amount,e.tax_pct||'',e.tax_amount||'',e.vendor_name||'',e.vendor_gst||'',e.date,e.description||e.notes||'',e.created_by_name||'']))
  const csv = rows.map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href=url; a.download=`Expenses_${new Date().toISOString().split('T')[0]}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export default function Expenses() {
  const toast  = useToast()
  const [expenses,setExpenses] = useState([])
  const [loading,setLoading]   = useState(true)
  const [modal,  setModal]     = useState(false)
  const [editData,setEditData] = useState(null)
  const [detail, setDetail]    = useState(null)
  const [form,   setForm]      = useState(empty)
  const [saving, setSaving]    = useState(false)
  const [search, setSearch]    = useState('')
  const [sort,   setSort]      = useState('newest')
  const [catFilter,setCatFilter] = useState('')
  const [delConfirm,setDelConfirm] = useState(null)
  const [deleting, setDeleting]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r=await api.get('/expenses'); setExpenses(r.data) }
    catch { toast('Failed','error') }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editData) await api.put(`/expenses/${editData.id}`, form)
      else await api.post('/expenses', form)
      toast(editData ? 'Expense updated' : 'Expense added')
      setModal(false); setEditData(null); setForm(empty); load()
    } catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setSaving(false) }
  }

  const openEdit = (exp) => {
    setEditData(exp)
    setForm({ title:exp.title, category:exp.category, amount:exp.amount, tax_pct:exp.tax_pct||'', tax_amount:exp.tax_amount||'', vendor_name:exp.vendor_name||'', vendor_gst:exp.vendor_gst||'', description:exp.description||exp.notes||'', date:exp.date?.slice(0,10)||new Date().toISOString().split('T')[0] })
    setModal(true)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await api.delete(`/expenses/${delConfirm.id}`); toast('Expense removed'); setDelConfirm(null); load() }
    catch { toast('Failed','error') }
    finally { setDeleting(false) }
  }

  const calcTax = () => {
    if (form.amount && form.tax_pct) setForm(p=>({...p, tax_amount:((parseFloat(p.amount)*parseFloat(p.tax_pct))/100).toFixed(2)}))
  }

  let filtered = expenses
    .filter(e => (!search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.vendor_name?.toLowerCase().includes(search.toLowerCase())) && (!catFilter || e.category===catFilter))
    .sort((a,b) => sort==='newest' ? new Date(b.created_at)-new Date(a.created_at) : new Date(a.created_at)-new Date(b.created_at))

  const total = filtered.reduce((s,e)=>s+parseFloat(e.amount||0),0)

  if (loading) return <LoadingPage />

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 className="page-title">Expenses</h1>
          <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>{filtered.length} expenses · {fmt(total)}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>exportExcel(filtered)} className="btn btn-success" style={{ fontSize:12 }}>↓ Excel</button>
          <button onClick={()=>exportPDF(filtered)}   className="btn btn-secondary" style={{ fontSize:12 }}>↓ PDF</button>
          <button onClick={()=>{ setEditData(null); setForm(empty); setModal(true) }} className="btn btn-primary">+ Add Expense</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:200 }}><SearchBar value={search} onChange={setSearch} placeholder="Search expenses..." /></div>
        <select className="input" style={{ width:160 }} value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {CATS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" style={{ width:140 }} value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* Summary strip */}
      <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:2 }}>
        {CATS.filter(c=>expenses.some(e=>e.category===c)).map(cat => {
          const amt = filtered.filter(e=>e.category===cat).reduce((s,e)=>s+parseFloat(e.amount||0),0)
          return (
            <div key={cat} onClick={()=>setCatFilter(catFilter===cat?'':cat)}
              style={{ cursor:'pointer', padding:'8px 14px', borderRadius:8, background:catFilter===cat?'var(--red-bg)':'var(--card)', border:`1px solid ${catFilter===cat?'var(--red)':'var(--border)'}`, flexShrink:0, transition:'all 0.12s' }}>
              <div style={{ fontSize:13, fontWeight:700, color:catFilter===cat?'var(--red)':'var(--text)' }}>{fmt(amt)}</div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginTop:1 }}>{cat}</div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow:'hidden' }}>
        {filtered.length===0 ? (
          <EmptyState icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>}
            title="No expenses found" desc="Add your first expense record"
            action={<button onClick={()=>{ setForm(empty); setModal(true) }} className="btn btn-primary">Add Expense</button>} />
        ) : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>
                  {['Title','Category','Amount','Tax','Vendor','Date','By',''].map(h=><th key={h} className="table-th">{h}</th>)}
                </tr></thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="table-row" style={{ cursor:'pointer' }} onClick={()=>setDetail(e)}>
                      <td className="table-td" style={{ fontWeight:600 }}>{e.title}</td>
                      <td className="table-td"><StatusBadge status={e.category}/></td>
                      <td className="table-td" style={{ fontWeight:700, color:'var(--red)' }}>{fmt(e.amount)}</td>
                      <td className="table-td" style={{ color:'var(--text3)', fontSize:12 }}>{e.tax_amount?fmt(e.tax_amount):'—'}</td>
                      <td className="table-td" style={{ color:'var(--text3)', fontSize:12 }}>{e.vendor_name||'—'}</td>
                      <td className="table-td" style={{ color:'var(--text3)', fontSize:12 }}>{fmtDate(e.date)}</td>
                      <td className="table-td" style={{ color:'var(--text3)', fontSize:12 }}>{e.created_by_name||'—'}</td>
                      <td className="table-td" onClick={ev=>ev.stopPropagation()}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>openEdit(e)} className="btn btn-secondary" style={{ fontSize:11, padding:'3px 8px', minHeight:28 }}>Edit</button>
                          <button onClick={()=>setDelConfirm(e)} className="btn btn-danger"    style={{ fontSize:11, padding:'3px 8px', minHeight:28 }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop:'2px solid var(--border)' }}>
                    <td colSpan={2} className="table-td" style={{ fontWeight:700 }}>TOTAL</td>
                    <td className="table-td" style={{ fontWeight:800, color:'var(--red)', fontSize:15 }}>{fmt(total)}</td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={()=>{ setModal(false); setEditData(null) }} title={editData?'Edit Expense':'Add Expense'} size="lg">
        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} required placeholder="e.g. Plywood purchase" />
            </div>
            <div>
              <label className="label">Category *</label>
              <select className="input" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                {CATS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} required />
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input className="input" type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} required min={0} placeholder="0" />
            </div>
            <div>
              <label className="label">Tax % (optional)</label>
              <input className="input" type="number" value={form.tax_pct} onChange={e=>setForm(p=>({...p,tax_pct:e.target.value}))} onBlur={calcTax} placeholder="18" min={0} max={100} />
            </div>
            <div>
              <label className="label">Tax Amount (₹)</label>
              <input className="input" type="number" value={form.tax_amount} onChange={e=>setForm(p=>({...p,tax_amount:e.target.value}))} placeholder="Auto-calc" min={0} />
            </div>
            <div>
              <label className="label">Vendor / Company</label>
              <input className="input" value={form.vendor_name} onChange={e=>setForm(p=>({...p,vendor_name:e.target.value}))} placeholder="Sharma Timber" />
            </div>
            <div>
              <label className="label">Vendor GST</label>
              <input className="input" value={form.vendor_gst} onChange={e=>setForm(p=>({...p,vendor_gst:e.target.value}))} placeholder="27AABCU9603R1ZX" />
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label className="label">Description</label>
              <textarea className="input" rows={2} style={{ resize:'none' }} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Additional notes..." />
            </div>
          </div>
          <div style={{ display:'flex', gap:10, paddingTop:4 }}>
            <button type="button" onClick={()=>{ setModal(false); setEditData(null) }} className="btn btn-secondary" style={{ flex:1 }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex:1 }}>{saving?'Saving…':editData?'Update Expense':'Add Expense'}</button>
          </div>
        </form>
      </Modal>

      {/* Detail Popup */}
      {detail && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDetail(null)}>
          <div className="modal-box" style={{ maxWidth:420 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
              <span className="section-title">Expense Details</span>
              <button onClick={()=>setDetail(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:18 }}>✕</button>
            </div>
            <div style={{ padding:18, display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>{detail.title}</div>
                  <StatusBadge status={detail.category} />
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:22, fontWeight:800, color:'var(--red)' }}>{fmt(detail.amount)}</div>
                  {detail.tax_amount>0 && <div style={{ fontSize:11, color:'var(--text3)' }}>+{fmt(detail.tax_amount)} tax</div>}
                </div>
              </div>
              <div style={{ background:'var(--bg2)', borderRadius:8, padding:12, display:'flex', flexDirection:'column', gap:6 }}>
                {[['Date',fmtDate(detail.date)],['Vendor',detail.vendor_name||'—'],['GST',detail.vendor_gst||'—'],['Added By',detail.created_by_name||'—'],['Description',detail.description||detail.notes||'—']].map(([l,v])=>(
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span style={{ color:'var(--text3)' }}>{l}</span>
                    <span style={{ fontWeight:600, color:'var(--text)', textAlign:'right', maxWidth:220 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>{ openEdit(detail); setDetail(null) }} className="btn btn-secondary" style={{ flex:1 }}>Edit</button>
                <button onClick={()=>{ setDelConfirm(detail); setDetail(null) }} className="btn btn-danger" style={{ flex:1 }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <Confirm open={!!delConfirm} onClose={()=>setDelConfirm(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Expense" message={`Remove "${delConfirm?.title}"? This will mark it as inactive.`} confirmLabel="Delete" />
    </div>
  )
}
