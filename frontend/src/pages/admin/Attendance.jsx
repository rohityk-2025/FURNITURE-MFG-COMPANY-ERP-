import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge, useToast, fmt } from '../../components/ui'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function Attendance() {
  const toast = useToast()
  const today = new Date()
  const [date,    setDate]    = useState(today.toISOString().split('T')[0])
  const [workers, setWorkers] = useState([])
  const [att,     setAtt]     = useState({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState({})
  const [tab,     setTab]     = useState('mark')  // mark | calendar | monthly
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth,setCalMonth]= useState(today.getMonth())
  const [calData, setCalData] = useState({})   // { 'YYYY-MM-DD': {present,absent,half} }
  const [monthAtt,setMonthAtt]= useState([])   // monthly per-worker list

  const loadDay = useCallback(async () => {
    setLoading(true)
    try {
      const [w, a] = await Promise.all([api.get('/workers'), api.get('/attendance', { params:{ date } })])
      setWorkers(w.data)
      const map = {}; a.data.forEach(r => { map[r.worker_id] = r }); setAtt(map)
    } catch { toast('Failed to load','error') }
    finally { setLoading(false) }
  }, [date])

  const loadCalendar = useCallback(async () => {
    const year = calYear, month = calMonth + 1
    const days = new Date(year, month, 0).getDate()
    const data = {}
    for (let d = 1; d <= days; d++) {
      const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      data[ds] = { present:0, absent:0, half:0, total:0 }
    }
    try {
      const r = await api.get('/attendance/monthly', { params:{ year, month } })
      r.data.forEach(row => {
        const ds = row.date?.slice(0,10)
        if (data[ds]) {
          if (row.status==='PRESENT')   data[ds].present++
          if (row.status==='ABSENT')    data[ds].absent++
          if (row.status==='HALF_DAY')  data[ds].half++
          data[ds].total++
        }
      })
    } catch {}
    setCalData(data)
  }, [calYear, calMonth])

  const loadMonthly = useCallback(async () => {
    const year = calYear, month = calMonth + 1
    const daysInMonth = new Date(year, month, 0).getDate()
    try {
      const [wRes, aRes] = await Promise.all([
        api.get('/workers'),
        api.get('/attendance/monthly', { params:{ year, month } })
      ])
      const workers = wRes.data
      const attMap = {}
      aRes.data.forEach(a => {
        if (!attMap[a.worker_id]) attMap[a.worker_id] = { present:0, absent:0, half:0, total:0 }
        if (a.status==='PRESENT')  attMap[a.worker_id].present++
        if (a.status==='ABSENT')   attMap[a.worker_id].absent++
        if (a.status==='HALF_DAY') attMap[a.worker_id].half++
        attMap[a.worker_id].total++
      })
      const list = workers.map(w => {
        const a = attMap[w.id] || { present:0, absent:0, half:0, total:0 }
        const effectiveDays = a.present + (a.half * 0.5)
        const salary = effectiveDays * parseFloat(w.daily_rate || 0)
        return { ...w, ...a, daysInMonth, effectiveDays, salary }
      })
      setMonthAtt(list)
    } catch { toast('Failed','error') }
  }, [calYear, calMonth])

  useEffect(() => { loadDay() }, [loadDay])
  useEffect(() => { if (tab==='calendar') loadCalendar() }, [tab, loadCalendar])
  useEffect(() => { if (tab==='monthly')  loadMonthly()  }, [tab, loadMonthly])

  const mark = async (wid, status) => {
    setSaving(p => ({ ...p, [wid]:true }))
    try {
      await api.post('/attendance', { worker_id:wid, date, status })
      setAtt(p => ({ ...p, [wid]:{ worker_id:wid, status, date } }))
      toast('Marked')
    } catch { toast('Failed','error') }
    finally { setSaving(p => ({ ...p, [wid]:false })) }
  }

  const present  = Object.values(att).filter(a => a.status==='PRESENT').length
  const absent   = Object.values(att).filter(a => a.status==='ABSENT').length
  const halfDay  = Object.values(att).filter(a => a.status==='HALF_DAY').length

  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate()

  const TABS = [{ id:'mark', label:'Mark Attendance' }, { id:'calendar', label:'Monthly Calendar' }, { id:'monthly', label:'Salary Sheet' }]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 className="page-title">Attendance</h1>
          <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>Track daily worker attendance</p>
        </div>
        {tab==='mark' && <input type="date" className="input" style={{ width:'auto' }} value={date} onChange={e => setDate(e.target.value)} />}
        {tab !== 'mark' && (
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={() => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else setCalMonth(m=>m-1) }} className="btn btn-secondary" style={{ padding:'4px 10px' }}>‹</button>
            <span style={{ fontWeight:700, fontSize:14, minWidth:100, textAlign:'center' }}>{MONTHS[calMonth]} {calYear}</span>
            <button onClick={() => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else setCalMonth(m=>m+1) }} className="btn btn-secondary" style={{ padding:'4px 10px' }}>›</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'var(--bg2)', padding:3, borderRadius:8, width:'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', background:tab===t.id?'var(--card)':'transparent', color:tab===t.id?'var(--primary)':'var(--text2)', boxShadow:tab===t.id?'var(--shadow)':'none', transition:'all 0.12s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Mark Attendance ── */}
      {tab==='mark' && (
        <>
          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[['Total',workers.length,'var(--bg2)','var(--text)'],['Present',present,'var(--green-bg)','var(--green)'],['Absent',absent,'var(--red-bg)','var(--red)']].map(([l,v,bg,color])=>(
              <div key={l} className="card" style={{ padding:12, background:bg, borderColor:'transparent' }}>
                <div style={{ fontSize:24, fontWeight:800, color }}>{v}</div>
                <div style={{ fontSize:11, fontWeight:700, color, opacity:0.8, textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</div>
              </div>
            ))}
          </div>

          {loading ? <LoadingPage /> : (
            <div className="card" style={{ overflow:'hidden' }}>
              {/* Desktop */}
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{['Worker','Skill','Status','Mark'].map(h=><th key={h} className="table-th">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {workers.map(w => {
                      const a = att[w.id]
                      return (
                        <tr key={w.id} className="table-row">
                          <td className="table-td">
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              {w.image_url
                                ? <img src={w.image_url} alt={w.name} style={{ width:32,height:32,borderRadius:'50%',objectFit:'cover' }} />
                                : <div style={{ width:32,height:32,borderRadius:'50%',background:'var(--primary-bg)',color:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13 }}>{w.name?.charAt(0)}</div>
                              }
                              <div>
                                <div style={{ fontWeight:600, fontSize:13 }}>{w.name}</div>
                                <div style={{ fontSize:11, color:'var(--text3)' }}>{w.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="table-td"><span className="badge-gray">{w.skill||'—'}</span></td>
                          <td className="table-td">{a ? <StatusBadge status={a.status}/> : <span className="badge-gray">Not Marked</span>}</td>
                          <td className="table-td">
                            <div style={{ display:'flex', gap:5 }}>
                              {[['PRESENT','P','var(--green)','var(--green-bg)'],['ABSENT','A','var(--red)','var(--red-bg)'],['HALF_DAY','½','var(--yellow)','var(--yellow-bg)']].map(([s,lbl,col,bg])=>(
                                <button key={s} disabled={saving[w.id]} onClick={() => mark(w.id,s)}
                                  style={{ padding:'4px 10px', borderRadius:6, border:'1px solid', cursor:'pointer', fontSize:12, fontWeight:700, transition:'all 0.1s', background: a?.status===s ? col : 'transparent', color: a?.status===s ? '#fff' : col, borderColor: col }}>
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB: Monthly Calendar ── */}
      {tab==='calendar' && (
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--border)' }}>
            {DAYS.map(d => <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text3)', padding:'10px 0', textTransform:'uppercase' }}>{d}</div>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
            {Array.from({length:firstDay}).map((_,i) => (
              <div key={`e${i}`} style={{ minHeight:70, borderRight:'1px solid var(--border2)', borderBottom:'1px solid var(--border2)', background:'var(--bg2)' }} />
            ))}
            {Array.from({length:daysInMonth}).map((_,i) => {
              const day = i+1
              const ds  = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const d   = calData[ds]
              const isToday = ds === today.toISOString().split('T')[0]
              return (
                <div key={day} style={{ minHeight:70, borderRight:'1px solid var(--border2)', borderBottom:'1px solid var(--border2)', padding:6, cursor:'pointer', background: isToday ? 'var(--primary-bg)' : 'var(--card)' }}
                  onClick={() => { setDate(ds); setTab('mark') }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, marginBottom:4, background: isToday ? 'var(--primary)' : 'transparent', color: isToday ? '#fff' : 'var(--text)' }}>{day}</div>
                  {d && d.total > 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      {d.present > 0 && <div style={{ fontSize:10, fontWeight:700, color:'var(--green)', background:'var(--green-bg)', borderRadius:4, padding:'1px 4px' }}>✓ {d.present}</div>}
                      {d.absent  > 0 && <div style={{ fontSize:10, fontWeight:700, color:'var(--red)',   background:'var(--red-bg)',   borderRadius:4, padding:'1px 4px' }}>✗ {d.absent}</div>}
                      {d.half    > 0 && <div style={{ fontSize:10, fontWeight:700, color:'var(--yellow)',background:'var(--yellow-bg)',borderRadius:4, padding:'1px 4px' }}>½ {d.half}</div>}
                    </div>
                  )}
                  {(!d || d.total===0) && <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>—</div>}
                </div>
              )
            })}
          </div>
          <div style={{ padding:'10px 14px', background:'var(--bg2)', display:'flex', gap:12, fontSize:11 }}>
            {[['✓ Present','var(--green)'],['✗ Absent','var(--red)'],['½ Half Day','var(--yellow)']].map(([l,c])=>(
              <span key={l} style={{ color:c, fontWeight:700 }}>{l}</span>
            ))}
            <span style={{ color:'var(--text3)', marginLeft:'auto' }}>Click a date to mark attendance</span>
          </div>
        </div>
      )}

      {/* ── TAB: Salary Sheet ── */}
      {tab==='monthly' && (
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:700, fontSize:13 }}>Monthly Salary Sheet — {MONTHS[calMonth]} {calYear}</span>
            <span style={{ fontSize:12, color:'var(--text3)' }}>Total: {fmt(monthAtt.reduce((s,w)=>s+w.salary,0))}</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Worker','Skill','Rate/Day','Present','Absent','Half','Working Days','Salary'].map(h=><th key={h} className="table-th">{h}</th>)}</tr>
              </thead>
              <tbody>
                {monthAtt.map(w => (
                  <tr key={w.id} className="table-row">
                    <td className="table-td">
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {w.image_url ? <img src={w.image_url} style={{ width:28,height:28,borderRadius:'50%',objectFit:'cover' }} /> : <div style={{ width:28,height:28,borderRadius:'50%',background:'var(--primary-bg)',color:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:11 }}>{w.name?.charAt(0)}</div>}
                        <div>
                          <div style={{ fontWeight:600, fontSize:13 }}>{w.name}</div>
                          <div style={{ fontSize:11, color:'var(--text3)' }}>{w.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td"><span className="badge-gray">{w.skill||'—'}</span></td>
                    <td className="table-td" style={{ fontWeight:600 }}>{fmt(w.daily_rate)}</td>
                    <td className="table-td"><span style={{ color:'var(--green)', fontWeight:700 }}>{w.present}</span></td>
                    <td className="table-td"><span style={{ color:'var(--red)', fontWeight:700 }}>{w.absent}</span></td>
                    <td className="table-td"><span style={{ color:'var(--yellow)', fontWeight:700 }}>{w.half_days||0}</span></td>
                    <td className="table-td">
                      <span style={{ fontWeight:700 }}>{w.effectiveDays}</span>
                      <span style={{ color:'var(--text3)', fontSize:11 }}> / {w.daysInMonth}</span>
                    </td>
                    <td className="table-td" style={{ fontWeight:700, color:'var(--primary)', fontSize:14 }}>{fmt(w.salary)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:'2px solid var(--border)' }}>
                  <td colSpan={7} className="table-td" style={{ fontWeight:700, textAlign:'right' }}>Total Salary:</td>
                  <td className="table-td" style={{ fontWeight:800, color:'var(--primary)', fontSize:15 }}>{fmt(monthAtt.reduce((s,w)=>s+w.salary,0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
