import { useState, createContext, useContext, useCallback } from 'react'

export const fmt = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)

export const fmtDate = (d) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

export const fmtDT = (d) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

export const fmtDateTime = fmtDT

const STATUS = {
  PENDING: ['badge-yellow', 'Pending'],
  IN_PRODUCTION: ['badge-blue', 'In Production'],
  READY: ['badge-purple', 'Ready'],
  YET_TO_DELIVER: ['badge-orange', 'Yet to Deliver'],
  DELIVERED: ['badge-green', 'Delivered'],
  CANCELLED: ['badge-red', 'Cancelled'],
  PAID: ['badge-green', 'Paid'],
  PARTIAL: ['badge-yellow', 'Partial'],
  UNPAID: ['badge-red', 'Unpaid'],
  ASSIGNED: ['badge-blue', 'Assigned'],
  IN_PROGRESS: ['badge-purple', 'In Progress'],
  COMPLETED: ['badge-green', 'Completed'],
  PRESENT: ['badge-green', 'Present'],
  ABSENT: ['badge-red', 'Absent'],
  HALF_DAY: ['badge-yellow', 'Half Day'],
  HOLIDAY: ['badge-purple', 'Holiday'],
  WORKOFF: ['badge-gray', 'Work Off'],
  MATERIAL: ['badge-yellow', 'Material'],
  SALARY: ['badge-blue', 'Salary'],
  UTILITIES: ['badge-purple', 'Utilities'],
  TRANSPORT: ['badge-green', 'Transport'],
  MAINTENANCE: ['badge-orange', 'Maintenance'],
  RENT: ['badge-red', 'Rent'],
  OTHER: ['badge-gray', 'Other'],
  DELIVERY: ['badge-blue', 'Delivery'],
  TODO: ['badge-purple', 'To-Do'],
  MEETING: ['badge-orange', 'Meeting'],
  FULL: ['badge-green', 'Paid Full'],
  PERMANENT: ['badge-blue', 'Permanent'],
  CONTRACT: ['badge-orange', 'Contract'],
  DAILY: ['badge-gray', 'Daily'],
  WEEKLY: ['badge-purple', 'Weekly'],
  MONTHLY: ['badge-green', 'Monthly'],
}

export function StatusBadge({ status }) {
  const [cls, label] = STATUS[status] || ['badge-gray', status || '-']
  return <span className={cls}>{label}</span>
}

export function Spinner({ size = 'md' }) {
  const s = { sm: '16px', md: '22px', lg: '30px' }[size]
  return (
    <div
      style={{
        width: s,
        height: s,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--primary)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}

export function LoadingPage({ title = 'Loading...' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        flex: 1,
      }}
    >
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          padding: 24,
          minWidth: 160,
        }}
      >
        <Spinner size="lg" />
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{title}</span>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, desc, action }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '52px 18px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          background: 'linear-gradient(180deg, var(--bg2), var(--card))',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          color: 'var(--text3)',
          boxShadow: 'var(--shadow)',
        }}
      >
        {icon}
      </div>
      <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
        {title}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text3)',
          marginBottom: action ? 18 : 0,
          maxWidth: 300,
          lineHeight: 1.6,
        }}
      >
        {desc}
      </div>
      {action}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  actions,
}) {
  if (!open) return null
  const maxW = {
    sm: '430px',
    md: '560px',
    lg: '760px',
    xl: '920px',
    '2xl': '1080px',
  }[size]

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box" style={{ maxWidth: maxW }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 18px',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            background: 'color-mix(in srgb, var(--card) 92%, transparent)',
            backdropFilter: 'blur(8px)',
            zIndex: 1,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="section-title">{title}</div>
            {subtitle ? (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text3)',
                  marginTop: 3,
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {actions}
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost icon-button"
              aria-label="Close modal"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  )
}

export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  loading,
}) {
  if (!open) return null
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: 'var(--red-bg)',
              border: '1px solid color-mix(in srgb, var(--red) 14%, transparent)',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              color: 'var(--red)',
            }}
          >
            <svg
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 16,
              marginBottom: 8,
              color: 'var(--text)',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text2)',
              marginBottom: 20,
              lineHeight: 1.6,
            }}
          >
            {message}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="btn-danger"
              style={{ flex: 1 }}
            >
              {loading ? <Spinner size="sm" /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ConfirmDialog = Confirm

export function KpiCard({ label, value, sub, icon, color = 'blue', gradient }) {
  const colors = {
    blue: { bg: 'var(--primary-bg)', color: 'var(--primary)' },
    purple: { bg: 'var(--secondary-bg)', color: 'var(--secondary)' },
    green: { bg: 'var(--green-bg)', color: 'var(--green)' },
    amber: { bg: 'var(--yellow-bg)', color: 'var(--yellow)' },
    red: { bg: 'var(--red-bg)', color: 'var(--red)' },
    gray: { bg: 'var(--bg2)', color: 'var(--text3)' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className="stat-card">
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          background: gradient
            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
            : c.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          color: gradient ? '#fff' : c.color,
        }}
      >
        {icon}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub ? (
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{sub}</div>
      ) : null}
    </div>
  )
}

export function StatCard({ label, value, tone = 'default', sub }) {
  const toneColor = {
    default: 'var(--text)',
    primary: 'var(--primary)',
    success: 'var(--green)',
    warning: 'var(--yellow)',
    danger: 'var(--red)',
    secondary: 'var(--secondary)',
  }[tone]

  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color: toneColor }}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
      {sub ? (
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{sub}</div>
      ) : null}
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div style={{ position: 'relative' }}>
      <svg
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text3)',
        }}
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        className="input"
        style={{ paddingLeft: 36 }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '999px',
        width: 'fit-content',
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          style={{
            minHeight: 34,
            padding: '8px 14px',
            borderRadius: '999px',
            fontSize: 12,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.14s ease',
            background: active === tab.id ? 'var(--card)' : 'transparent',
            color: active === tab.id ? 'var(--primary-strong)' : 'var(--text2)',
            boxShadow: active === tab.id ? 'var(--shadow)' : 'none',
          }}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.72 }}>
              ({tab.count})
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? (
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{subtitle}</p>
        ) : null}
      </div>
      {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
    </div>
  )
}

export function Avatar({ name = '?', size = 'md', src }) {
  const s = { sm: 28, md: 36, lg: 44 }[size]
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{
          width: s,
          height: s,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    )
  }
  return (
    <div
      style={{
        width: s,
        height: s,
        borderRadius: '50%',
        background: 'var(--primary-bg)',
        color: 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: s * 0.36,
        flexShrink: 0,
      }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

export function ProgressBar({ value, max = 100, color = 'blue' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const colors = {
    blue: 'var(--primary)',
    green: 'var(--green)',
    red: 'var(--red)',
    orange: 'var(--orange)',
    gray: 'var(--text3)',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          flex: 1,
          background: 'var(--bg2)',
          borderRadius: 999,
          height: 6,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            background: colors[color] || colors.blue,
            borderRadius: 999,
            height: 6,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text3)',
          width: 34,
          textAlign: 'right',
        }}
      >
        {pct}%
      </span>
    </div>
  )
}

export function ImageUploadBtn({
  onUpload,
  uploading,
  label = 'Upload Image',
  accept = 'image/*',
}) {
  return (
    <label style={{ cursor: 'pointer' }}>
      <span className="btn-secondary" style={{ pointerEvents: 'none' }}>
        {uploading ? (
          <Spinner size="sm" />
        ) : (
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
        {label}
      </span>
      <input
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files[0]) onUpload(e.target.files[0])
        }}
      />
    </label>
  )
}

export function QtyInput({ value, onChange, min = 1, max = 9999 }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: '1px solid var(--border)',
        borderRadius: '999px',
        overflow: 'hidden',
        minHeight: 42,
        background: 'var(--card)',
      }}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, parseInt(value || 0, 10) - 1))}
        className="btn-ghost"
        style={{ width: 38, minHeight: 42, borderRadius: 0 }}
      >
        -
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) =>
          onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10) || min)
        }
        onBlur={(e) => {
          if (!e.target.value || parseInt(e.target.value, 10) < min) onChange(min)
        }}
        style={{
          width: 52,
          textAlign: 'center',
          border: 'none',
          borderLeft: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
          background: 'var(--card)',
          color: 'var(--text)',
          fontSize: 13,
          height: '100%',
          outline: 'none',
          padding: '0 4px',
        }}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, parseInt(value || 0, 10) + 1))}
        className="btn-ghost"
        style={{ width: 38, minHeight: 42, borderRadius: 0 }}
      >
        +
      </button>
    </div>
  )
}

export function FormSection({ title, children, note, className = '', style }) {
  return (
    <div className={`form-section ${className}`.trim()} style={style}>
      {title ? (
        <div className="form-section-title">
          {title}
          {note ? (
            <span
              style={{
                fontWeight: 500,
                textTransform: 'none',
                letterSpacing: 0,
                marginLeft: 6,
              }}
            >
              {note}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

export function DetailGrid({ items = [] }) {
  return (
    <div className="detail-grid">
      {items.map(([label, value]) => (
        <div key={label} className="detail-item">
          <div className="detail-label">{label}</div>
          <div className="detail-value">{value}</div>
        </div>
      ))}
    </div>
  )
}

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, msg, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 200,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-fade-in"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 16,
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.26)',
              background:
                toast.type === 'error'
                  ? '#dc2626'
                  : toast.type === 'info'
                    ? '#2563eb'
                    : '#0f172a',
            }}
          >
            {toast.type === 'success' ? (
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="#4ade80"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : null}
            {toast.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
