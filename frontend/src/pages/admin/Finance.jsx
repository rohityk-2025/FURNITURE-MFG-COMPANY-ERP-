import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import { LoadingPage, fmt, fmtDate, Modal, useToast } from '../../components/ui'

const PERIODS = [{ id:'week',label:'Week'},{ id:'month',label:'Month'},{ id:'3m',label:'3 Months'},{ id:'6m',label:'6 Months'},{ id:'year',label:'Year'},{ id:'custom',label:'Custom'}]

function getRange(period) {
  const now = new Date(); const to = now.toISOString().split('T')[0]; let from
  if (period==='week')  from = new Date(now-7*864e5).toISOString().split('T')[0]
  if (period==='month') from = new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0]
  if (period==='3m')    from = new Date(now-90*864e5).toISOString().split('T')[0]
  if (period==='6m')    from = new Date(now-180*864e5).toISOString().split('T')[0]
  if (period==='year')  from = new Date(now.getFullYear(),0,1).toISOString().split('T')[0]
  return { from:from||to, to }
}

export default function Finance() {
  const toast  = useToast()
  const [tab,     setTab]     = useState('payments')
  const [period,  setPeriod]  = useState('month')
  const [custom,  setCustom]  = useState({ from:new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split('T')[0], to:new Date().toISOString().split('T')[0] })
  const [summary, setSummary] = useState(null)
  const [jobs,    setJobs]    = useState([])
  const [advances,setAdvances]= useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [payModal,setPayModal]= useState(null)
  const [payAmt,  setPayAmt]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [advModal,setAdvModal]= useState(false)
  const [advForm, setAdvForm] = useState({ worker_id:'', amount:'', payment_date:new Date().toISOString().split('T')[0], note:'' })
  const [editAdv, setEditAdv] = useState(null)

  const loadAll = useCallback(async (p, c) => {
    setLoading(true)
    const range = p==='custom' ? c : getRange(p)
    try {
      // Load each independently so one failure doesn't block others
      const [sRes, jRes, advRes, wRes] = await Promise.allSettled([
        api.get('/finance/summary', { params:range }),
        api.get('/finance/workers-payment'),
        api.get('/finance/advances'),
        api.get('/workers'),
      ])
      if (sRes.status==='fulfilled')   setSummary(sRes.value.data)
      if (jRes.status==='fulfilled')   setJobs(jRes.value.data)
      if (advRes.status==='fulfilled') setAdvances(advRes.value.data)
      if (wRes.status==='fulfilled')   setWorkers(wRes.value.data)

      // Log any failures for debugging
      if (jRes.status==='rejected')   console.error('workers-payment:', jRes.reason?.response?.data?.error)
      if (advRes.status==='rejected') console.error('advances:', advRes.reason?.response?.data?.error)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAll(period, custom) }, [period, custom, loadAll])

  const reload = () => loadAll(period, custom)

  const handlePay = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post(`/finance/pay-job/${payModal.id}`, { amount:parseFloat(payAmt) })
      const rem = parseFloat(payModal.total_commission) - parseFloat(payAmt)
      toast(rem>0 ? `Paid ${fmt(payAmt)} · ${fmt(rem)} still pending` : 'Paid in full!')
      setPayModal(null); reload()
    } catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setSaving(false) }
  }

  const handleAdvance = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/finance/advance', advForm)
      toast('Advance recorded'); setAdvModal(false)
      setAdvForm({ worker_id:'', amount:'', payment_date:new Date().toISOString().split('T')[0], note:'' })
      reload()
    } catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setSaving(false) }
  }

  const handleEditAdv = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await api.put(`/finance/advance/${editAdv.id}`, editAdv); toast('Updated'); setEditAdv(null); reload() }
    catch(err) { toast('Failed','error') }
    finally { setSaving(false) }
  }

  const unpaid = jobs.filter(j => parseFloat(j.remaining||0) > 0)
  const paid   = jobs.filter(j => parseFloat(j.remaining||0) <= 0 && j.is_paid)
  const totalPending = unpaid.reduce((s,j)=>s+parseFloat(j.remaining||j.total_commission||0),0)

  const Btn = ({ id, label }) => (
    <button onClick={()=>setTab(id)} style={{ padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', background:tab===id?'var(--card)':'transparent', color:tab===id?'var(--primary)':'var(--text2)', boxShadow:tab===id?'var(--shadow)':'none', transition:'all 0.12s' }}>{label}</button>
  )

  if (loading) return <LoadingPage />

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }} className="animate-fade-in">
      <div>
        <h1 className="page-title">Finance</h1>
        <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>Financial overview and worker payments</p>
      </div>

      {/* Period filter */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
        {PERIODS.map(f => (
          <button key={f.id} onClick={()=>setPeriod(f.id)}
            style={{ padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:600, border:`1px solid ${period===f.id?'var(--primary)':'var(--border)'}`, cursor:'pointer', background:period===f.id?'var(--primary-bg)':'var(--card)', color:period===f.id?'var(--primary)':'var(--text2)', transition:'all 0.12s' }}>
            {f.label}
          </button>
        ))}
        {period==='custom' && (
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input type="date" className="input" style={{ width:'auto' }} value={custom.from} onChange={e=>setCustom(p=>({...p,from:e.target.value}))} />
            <span style={{ color:'var(--text3)' }}>→</span>
            <input type="date" className="input" style={{ width:'auto' }} value={custom.to} onChange={e=>setCustom(p=>({...p,to:e.target.value}))} />
          </div>
        )}
      </div>

      {/* KPI */}
      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
          {[['Sales',fmt(summary.sales?.total||0),'var(--primary)'],['Received',fmt(summary.sales?.received||0),'var(--green)'],['Expenses',fmt(summary.expenses?.total||0),'var(--red)'],['Profit',fmt((summary.sales?.total||0)-(summary.expenses?.total||0)),'var(--secondary)'],['Worker Due',fmt(totalPending),'var(--orange)']].map(([l,v,c])=>(
            <div key={l} className="card" style={{ padding:14 }}>
              <div style={{ fontSize:19, fontWeight:800, color:c }}>{v}</div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'var(--bg2)', padding:3, borderRadius:8, width:'fit-content' }}>
        <Btn id="payments" label="Worker Payments" />
        <Btn id="advances" label="Advance Payments" />
      </div>

      {/* Worker Payments */}
      {tab==='payments' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {unpaid.length>0 && (
            <div className="card" style={{ overflow:'hidden' }}>
              <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontWeight:700, fontSize:13, color:'var(--red)' }}>Pending ({unpaid.length}) — Due: {fmt(totalPending)}</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Worker','Job','Commission','Paid','Pending','Status',''].map(h=><th key={h} className="table-th">{h}</th>)}</tr></thead>
                  <tbody>
                    {unpaid.map(j => (
                      <tr key={j.id} className="table-row">
                        <td className="table-td" style={{ fontWeight:600 }}>{j.worker_name}</td>
                        <td className="table-td" style={{ fontSize:12, color:'var(--text3)' }}>{j.product_name} × {j.quantity}</td>
                        <td className="table-td">{fmt(j.total_commission)}</td>
                        <td className="table-td" style={{ color:'var(--green)', fontWeight:600 }}>{fmt(j.paid||0)}</td>
                        <td className="table-td" style={{ color:'var(--red)', fontWeight:700 }}>{fmt(j.remaining)}</td>
                        <td className="table-td">{parseFloat(j.paid||0)>0?<span className="badge-yellow">Partial</span>:<span className="badge-red">Unpaid</span>}</td>
                        <td className="table-td">
                          <button onClick={()=>{ setPayModal(j); setPayAmt(String(j.remaining)) }} className="btn btn-primary" style={{ fontSize:11, padding:'4px 10px', minHeight:28 }}>Pay</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {paid.length>0 && (
            <div className="card" style={{ overflow:'hidden' }}>
              <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontWeight:700, fontSize:13 }}>Paid Jobs ({paid.length})</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Worker','Job','Commission','Date','Status'].map(h=><th key={h} className="table-th">{h}</th>)}</tr></thead>
                  <tbody>
                    {paid.map(j => (
                      <tr key={j.id} className="table-row">
                        <td className="table-td" style={{ fontWeight:600 }}>{j.worker_name}</td>
                        <td className="table-td" style={{ fontSize:12 }}>{j.product_name} × {j.quantity}</td>
                        <td className="table-td" style={{ fontWeight:600 }}>{fmt(j.total_commission)}</td>
                        <td className="table-td" style={{ fontSize:12, color:'var(--text3)' }}>{fmtDate(j.completed_date)}</td>
                        <td className="table-td"><span className="badge-green">Paid</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {jobs.length===0 && <div className="card" style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>No completed jobs found</div>}
        </div>
      )}

      {/* Advances */}
      {tab==='advances' && (
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:700, fontSize:13 }}>Advance Payments</span>
            <button onClick={()=>setAdvModal(true)} className="btn btn-primary" style={{ fontSize:12 }}>+ Add Advance</button>
          </div>
          {advances.length===0 ? (
            <div style={{ padding:32, textAlign:'center', color:'var(--text3)', fontSize:13 }}>No advance records</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Worker','Advance Taken','Remaining','Note','Date',''].map(h=><th key={h} className="table-th">{h}</th>)}</tr></thead>
                <tbody>
                  {advances.map(a => (
                    <tr key={a.id} className="table-row">
                      <td className="table-td" style={{ fontWeight:600 }}>{a.worker_name}</td>
                      <td className="table-td" style={{ fontWeight:600 }}>{fmt(a.amount)}</td>
                      <td className="table-td"><span style={{ fontWeight:700, color:parseFloat(a.remaining)>0?'var(--red)':'var(--green)' }}>{fmt(a.remaining)}</span></td>
                      <td className="table-td" style={{ fontSize:12, color:'var(--text3)' }}>{a.note||'—'}</td>
                      <td className="table-td" style={{ fontSize:12, color:'var(--text3)' }}>{fmtDate(a.payment_date)}</td>
                      <td className="table-td"><button onClick={()=>setEditAdv({...a})} className="btn btn-secondary" style={{ fontSize:11, padding:'3px 8px', minHeight:26 }}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <Modal open={!!payModal} onClose={()=>setPayModal(null)} title="Pay Worker">
          <form onSubmit={handlePay} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:'var(--bg2)', borderRadius:8, padding:12, fontSize:13 }}>
              <div style={{ fontWeight:700 }}>{payModal.worker_name}</div>
              <div style={{ color:'var(--text3)', marginTop:2 }}>{payModal.product_name} × {payModal.quantity}</div>
              <div style={{ display:'flex', gap:16, marginTop:8, flexWrap:'wrap' }}>
                <span>Total: <strong>{fmt(payModal.total_commission)}</strong></span>
                <span style={{ color:'var(--green)' }}>Paid: <strong>{fmt(payModal.paid||0)}</strong></span>
                <span style={{ color:'var(--red)' }}>Pending: <strong>{fmt(payModal.remaining)}</strong></span>
              </div>
            </div>
            <div>
              <label className="label">Amount to Pay (₹) *</label>
              <input className="input" type="number" step="0.01" value={payAmt} onChange={e=>setPayAmt(e.target.value)} required min={0.01} placeholder="Enter amount" />
              {parseFloat(payAmt)>0 && parseFloat(payAmt)<parseFloat(payModal.remaining) && (
                <div style={{ fontSize:11, color:'var(--yellow)', marginTop:4, fontWeight:600 }}>
                  ⚠ Partial — {fmt(payModal.remaining-parseFloat(payAmt))} will remain pending
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={()=>setPayModal(null)} className="btn btn-secondary" style={{ flex:1 }}>Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex:1 }}>{saving?'Processing…':'Confirm Pay'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Advance Modal */}
      <Modal open={advModal} onClose={()=>setAdvModal(false)} title="Record Advance">
        <form onSubmit={handleAdvance} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label className="label">Worker *</label>
            <select className="input" value={advForm.worker_id} onChange={e=>setAdvForm(p=>({...p,worker_id:e.target.value}))} required>
              <option value="">— Select Worker —</option>
              {workers.map(w=><option key={w.id} value={w.id}>{w.name}{w.skill?` (${w.skill})`:''}</option>)}
            </select>
            {workers.length===0 && <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>⚠ No workers loaded. Please refresh the page.</div>}
          </div>
          <div>
            <label className="label">Amount (₹) *</label>
            <input className="input" type="number" value={advForm.amount} onChange={e=>setAdvForm(p=>({...p,amount:e.target.value}))} required min={1} placeholder="0" />
          </div>
          <div>
            <label className="label">Date *</label>
            <input className="input" type="date" value={advForm.payment_date} onChange={e=>setAdvForm(p=>({...p,payment_date:e.target.value}))} required />
          </div>
          <div>
            <label className="label">Note</label>
            <input className="input" value={advForm.note} onChange={e=>setAdvForm(p=>({...p,note:e.target.value}))} placeholder="Reason for advance..." />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={()=>setAdvModal(false)} className="btn btn-secondary" style={{ flex:1 }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex:1 }}>{saving?'Saving…':'Record Advance'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Advance */}
      {editAdv && (
        <Modal open={!!editAdv} onClose={()=>setEditAdv(null)} title={`Edit Advance — ${editAdv.worker_name}`}>
          <form onSubmit={handleEditAdv} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:'var(--bg2)', borderRadius:8, padding:12, fontSize:13 }}>Total advance: <strong>{fmt(editAdv.amount)}</strong></div>
            <div>
              <label className="label">Remaining Amount (₹)</label>
              <p style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>Reduce if worker paid back some amount</p>
              <input className="input" type="number" value={editAdv.remaining} step="0.01" onChange={e=>setEditAdv(p=>({...p,remaining:e.target.value}))} required min={0} max={editAdv.amount} />
            </div>
            <div>
              <label className="label">Note</label>
              <input className="input" value={editAdv.note||''} onChange={e=>setEditAdv(p=>({...p,note:e.target.value}))} placeholder="Note" />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={()=>setEditAdv(null)} className="btn btn-secondary" style={{ flex:1 }}>Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex:1 }}>{saving?'Saving…':'Update'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
