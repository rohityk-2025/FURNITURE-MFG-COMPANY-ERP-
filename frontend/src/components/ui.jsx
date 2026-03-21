import { useState, useEffect, createContext, useContext, useCallback } from 'react'

// ── Helpers ──────────────────────────────────────────────────────
export const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

export const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

// alias — some pages import fmtDT, others import fmtDateTime
export const fmtDT = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}
export const fmtDateTime = fmtDT   // ← alias so both names work

// ── Status Badge ─────────────────────────────────────────────────
const STATUS = {
  PENDING:        ['badge-yellow', 'Pending'],
  IN_PRODUCTION:  ['badge-blue',   'In Production'],
  READY:          ['badge-purple', 'Ready'],
  YET_TO_DELIVER: ['badge-orange', 'Yet to Deliver'],
  DELIVERED:      ['badge-green',  'Delivered'],
  CANCELLED:      ['badge-red',    'Cancelled'],
  PAID:           ['badge-green',  'Paid'],
  PARTIAL:        ['badge-yellow', 'Partial'],
  UNPAID:         ['badge-red',    'Unpaid'],
  ASSIGNED:       ['badge-blue',   'Assigned'],
  IN_PROGRESS:    ['badge-purple', 'In Progress'],
  COMPLETED:      ['badge-green',  'Completed'],
  PRESENT:        ['badge-green',  'Present'],
  ABSENT:         ['badge-red',    'Absent'],
  HALF_DAY:       ['badge-yellow', 'Half Day'],
  MATERIAL:       ['badge-yellow', 'Material'],
  SALARY:         ['badge-blue',   'Salary'],
  UTILITIES:      ['badge-purple', 'Utilities'],
  TRANSPORT:      ['badge-green',  'Transport'],
  OTHER:          ['badge-gray',   'Other'],
  DELIVERY:       ['badge-blue',   'Delivery'],
  TODO:           ['badge-purple', 'To-Do'],
  MEETING:        ['badge-orange', 'Meeting'],
}

export function StatusBadge({ status }) {
  const [cls, label] = STATUS[status] || ['badge-gray', status || '—']
  return <span className={cls}>{label}</span>
}

// ── Spinner ──────────────────────────────────────────────────────
export function Spinner({ size = 'md', white }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size]
  return (
    <div className={`${s} border-2 ${white ? 'border-white/40 border-t-white' : 'border-primary-500 border-t-transparent'} rounded-full animate-spin`} />
  )
}

// ── Loading Page ─────────────────────────────────────────────────
export function LoadingPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <span className="text-sm text-surface-400 font-medium">Loading…</span>
      </div>
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────
export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center mb-4 text-surface-400">
        {icon}
      </div>
      <h3 className="font-semibold text-surface-700 mb-1">{title}</h3>
      <p className="text-sm text-surface-400 mb-5 max-w-xs">{desc}</p>
      {action}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl', '2xl': 'sm:max-w-5xl' }[size]
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box ${w}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 sticky top-0 bg-white z-10">
          <h3 className="section-title">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center text-surface-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Confirm Dialog ───────────────────────────────────────────────
// exported as BOTH Confirm and ConfirmDialog so all pages work
function ConfirmBase({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box sm:max-w-sm">
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="font-bold text-surface-900 text-lg mb-2">{title}</h3>
          <p className="text-sm text-surface-500 mb-6">{message}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 btn bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2">
              {loading ? <Spinner size="sm" white /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Confirm       = ConfirmBase   // short name
export const ConfirmDialog = ConfirmBase   // ← pages import this name

// ── KPI Card ─────────────────────────────────────────────────────
export function KpiCard({ label, value, sub, icon, gradient = false, color = 'blue' }) {
  const colors = {
    blue:   'bg-primary-50 text-primary-600',
    purple: 'bg-secondary-50 text-secondary-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    gray:   'bg-surface-100 text-surface-500',
  }
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${gradient ? 'text-white' : colors[color]}`}
        style={gradient ? { background: 'linear-gradient(135deg,#2563eb,#7c3aed)' } : {}}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-surface-900">{value}</div>
      <div className="text-xs font-semibold text-surface-400 uppercase tracking-wider mt-0.5">{label}</div>
      {sub && <div className="text-xs text-surface-400 mt-1">{sub}</div>}
    </div>
  )
}

// ── Search Bar ───────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="relative">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input className="input pl-10" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-surface-100 p-1 rounded-xl overflow-x-auto flex-shrink-0">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[36px]
            ${active === t.id ? 'bg-white text-primary-600 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
          {t.label}
          {t.count !== undefined && (
            <span className={`badge text-xs ${active === t.id ? 'badge-blue' : 'badge-gray'}`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Page Header ──────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="text-sm text-surface-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ── Avatar ───────────────────────────────────────────────────────
export function Avatar({ name = '?', size = 'md', color = 'blue' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
  const colors = {
    blue:   'bg-primary-100 text-primary-700',
    purple: 'bg-secondary-100 text-secondary-700',
    green:  'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
  }
  return (
    <div className={`${sizes[size]} ${colors[color]} rounded-xl flex items-center justify-center font-bold flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

// ── Progress Bar ─────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = 'blue' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const colors = {
    blue:   'bg-primary-500',
    green:  'bg-green-500',
    purple: 'bg-secondary-500',
    amber:  'bg-amber-400',
    red:    'bg-red-400',
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-surface-200 rounded-full h-1.5">
        <div className={`${colors[color]} rounded-full h-1.5 transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-surface-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

// ── Toast ────────────────────────────────────────────────────────
const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])

  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[100] pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white
              ${t.type === 'success' ? 'bg-surface-900' : t.type === 'error' ? 'bg-red-500' : 'bg-primary-500'}`}
            style={{ animation: 'fadeIn .2s ease-out' }}>
            {t.type === 'success' && (
              <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
