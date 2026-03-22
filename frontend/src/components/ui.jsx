import { useState, createContext, useContext, useCallback } from 'react'

// ── Helpers ──────────────────────────────────────────────────────
export const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(n||0)

export const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) }
  catch { return '—' }
}
export const fmtDT = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) }
  catch { return '—' }
}
export const fmtDateTime = fmtDT

// ── Status Badge ─────────────────────────────────────────────────
const STATUS = {
  PENDING:        ['badge-yellow','Pending'],
  IN_PRODUCTION:  ['badge-blue',  'In Production'],
  READY:          ['badge-purple','Ready'],
  YET_TO_DELIVER: ['badge-orange','Yet to Deliver'],
  DELIVERED:      ['badge-green', 'Delivered'],
  CANCELLED:      ['badge-red',   'Cancelled'],
  PAID:           ['badge-green', 'Paid'],
  PARTIAL:        ['badge-yellow','Partial'],
  UNPAID:         ['badge-red',   'Unpaid'],
  ASSIGNED:       ['badge-blue',  'Assigned'],
  IN_PROGRESS:    ['badge-purple','In Progress'],
  COMPLETED:      ['badge-green', 'Completed'],
  PRESENT:        ['badge-green', 'Present'],
  ABSENT:         ['badge-red',   'Absent'],
  HALF_DAY:       ['badge-yellow','Half Day'],
  HOLIDAY:        ['badge-purple','Holiday'],
  WORKOFF:        ['badge-gray',  'Work Off'],
  MATERIAL:       ['badge-yellow','Material'],
  SALARY:         ['badge-blue',  'Salary'],
  UTILITIES:      ['badge-purple','Utilities'],
  TRANSPORT:      ['badge-green', 'Transport'],
  MAINTENANCE:    ['badge-orange','Maintenance'],
  RENT:           ['badge-red',   'Rent'],
  OTHER:          ['badge-gray',  'Other'],
  DELIVERY:       ['badge-blue',  'Delivery'],
  TODO:           ['badge-purple','To-Do'],
  MEETING:        ['badge-orange','Meeting'],
  FULL:           ['badge-green', 'Paid Full'],
  PERMANENT:      ['badge-blue',  'Permanent'],
  CONTRACT:       ['badge-orange','Contract'],
  DAILY:          ['badge-gray',  'Daily'],
  WEEKLY:         ['badge-purple','Weekly'],
  MONTHLY:        ['badge-green', 'Monthly'],
}
export function StatusBadge({ status }) {
  const [cls, label] = STATUS[status] || ['badge-gray', status || '—']
  return <span className={cls}>{label}</span>
}

// ── Spinner ──────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const s = { sm:'16px', md:'22px', lg:'30px' }[size]
  return (
    <div style={{ width:s, height:s, border:'2px solid var(--border)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />
  )
}

// ── Loading Page ─────────────────────────────────────────────────
export function LoadingPage() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'300px', flex:1 }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <Spinner size="lg" />
        <span style={{ fontSize:12, color:'var(--text3)' }}>Loading…</span>
      </div>
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────
export function EmptyState({ icon, title, desc, action }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 16px', textAlign:'center' }}>
      <div style={{ width:52, height:52, background:'var(--bg2)', borderRadius:'var(--radius)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, color:'var(--text3)' }}>{icon}</div>
      <div style={{ fontWeight:700, color:'var(--text)', marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:12, color:'var(--text3)', marginBottom:16, maxWidth:260 }}>{desc}</div>
      {action}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const maxW = { sm:'400px', md:'520px', lg:'680px', xl:'860px', '2xl':'1040px' }[size]
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth:maxW }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--card)', zIndex:1 }}>
          <span className="section-title">{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:4, borderRadius:6, display:'flex', alignItems:'center' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ padding:18 }}>{children}</div>
      </div>
    </div>
  )
}

// ── Confirm ──────────────────────────────────────────────────────
export function Confirm({ open, onClose, onConfirm, title, message, confirmLabel='Delete', loading }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth:400 }}>
        <div style={{ padding:24, textAlign:'center' }}>
          <div style={{ width:52, height:52, background:'var(--red-bg)', borderRadius:'var(--radius)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color:'var(--red)' }}>
            <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div style={{ fontWeight:700, fontSize:16, marginBottom:8, color:'var(--text)' }}>{title}</div>
          <div style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>{message}</div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex:1 }}>Cancel</button>
            <button onClick={onConfirm} disabled={loading} className="btn btn-danger" style={{ flex:1 }}>
              {loading ? <Spinner size="sm" /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export const ConfirmDialog = Confirm

// ── KPI Card ─────────────────────────────────────────────────────
export function KpiCard({ label, value, sub, icon, color='blue', gradient }) {
  const colors = {
    blue:   { bg:'var(--primary-bg)',   color:'var(--primary)' },
    purple: { bg:'var(--secondary-bg)', color:'var(--secondary)' },
    green:  { bg:'var(--green-bg)',     color:'var(--green)' },
    amber:  { bg:'var(--yellow-bg)',    color:'var(--yellow)' },
    red:    { bg:'var(--red-bg)',       color:'var(--red)' },
    gray:   { bg:'var(--bg2)',          color:'var(--text3)' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className="card" style={{ padding:'16px' }}>
      <div style={{ width:36, height:36, borderRadius:8, background: gradient ? 'linear-gradient(135deg,var(--primary),var(--secondary))' : c.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10, color: gradient ? '#fff' : c.color }}>{icon}</div>
      <div style={{ fontSize:22, fontWeight:800, color:'var(--text)', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:3 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{sub}</div>}
    </div>
  )
}

// ── Search Bar ───────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder='Search…' }) {
  return (
    <div style={{ position:'relative' }}>
      <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }} width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input className="input" style={{ paddingLeft:32 }} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', gap:3, background:'var(--bg2)', padding:3, borderRadius:8, overflowX:'auto' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.12s', background: active===t.id ? 'var(--card)' : 'transparent', color: active===t.id ? 'var(--primary)' : 'var(--text2)', boxShadow: active===t.id ? 'var(--shadow)' : 'none' }}>
          {t.label}{t.count !== undefined && <span style={{ marginLeft:4, fontSize:10, opacity:0.7 }}>({t.count})</span>}
        </button>
      ))}
    </div>
  )
}

// ── Page Header ──────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink:0 }}>{action}</div>}
    </div>
  )
}

// ── Avatar ───────────────────────────────────────────────────────
export function Avatar({ name='?', size='md', src }) {
  const s = { sm:28, md:34, lg:42 }[size]
  if (src) return <img src={src} alt={name} style={{ width:s, height:s, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
  return (
    <div style={{ width:s, height:s, borderRadius:'50%', background:'var(--primary-bg)', color:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:s*0.38, flexShrink:0 }}>
      {name?.charAt(0)?.toUpperCase()||'?'}
    </div>
  )
}

// ── Progress Bar ─────────────────────────────────────────────────
export function ProgressBar({ value, max=100, color='blue' }) {
  const pct = max>0 ? Math.min(100, Math.round((value/max)*100)) : 0
  const colors = { blue:'var(--primary)', green:'var(--green)', red:'var(--red)', orange:'var(--orange)', gray:'var(--text3)' }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, background:'var(--bg2)', borderRadius:99, height:5 }}>
        <div style={{ width:`${pct}%`, background:colors[color]||colors.blue, borderRadius:99, height:5, transition:'width 0.3s' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:'var(--text3)', width:32, textAlign:'right' }}>{pct}%</span>
    </div>
  )
}

// ── Image Upload Button ───────────────────────────────────────────
export function ImageUploadBtn({ onUpload, uploading, label='Upload Image', accept='image/*' }) {
  return (
    <label style={{ cursor:'pointer' }}>
      <span className="btn btn-secondary" style={{ pointerEvents:'none' }}>
        {uploading ? <Spinner size="sm" /> : (
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        )}
        {label}
      </span>
      <input type="file" accept={accept} style={{ display:'none' }} onChange={e => { if(e.target.files[0]) onUpload(e.target.files[0]) }} />
    </label>
  )
}

// ── Quantity Input ────────────────────────────────────────────────
export function QtyInput({ value, onChange, min=1, max=9999 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', border:'1px solid var(--border)', borderRadius:6, overflow:'hidden', height:36 }}>
      <button type="button" onClick={() => onChange(Math.max(min, parseInt(value||0)-1))}
        style={{ width:30, background:'var(--bg2)', border:'none', cursor:'pointer', color:'var(--text)', fontSize:16, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>−</button>
      <input type="number" value={value} min={min} max={max}
        onChange={e => onChange(e.target.value === '' ? '' : parseInt(e.target.value)||min)}
        onBlur={e => { if(!e.target.value || parseInt(e.target.value) < min) onChange(min) }}
        style={{ width:48, textAlign:'center', border:'none', borderLeft:'1px solid var(--border)', borderRight:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', fontSize:13, height:'100%', outline:'none', padding:'0 4px' }} />
      <button type="button" onClick={() => onChange(Math.min(max, parseInt(value||0)+1))}
        style={{ width:30, background:'var(--bg2)', border:'none', cursor:'pointer', color:'var(--text)', fontSize:16, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>+</button>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────
const ToastCtx = createContext(null)
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type='success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div style={{ position:'fixed', bottom:20, right:20, display:'flex', flexDirection:'column', gap:8, zIndex:200, pointerEvents:'none' }}>
        {toasts.map(t => (
          <div key={t.id} className="animate-fade-in" style={{
            pointerEvents:'auto', display:'flex', alignItems:'center', gap:10,
            padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:600, color:'#fff',
            boxShadow:'0 4px 20px rgba(0,0,0,0.25)',
            background: t.type==='error' ? '#dc2626' : t.type==='info' ? '#2563eb' : '#111827'
          }}>
            {t.type==='success' && <svg width="14" height="14" fill="none" stroke="#22c55e" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)
