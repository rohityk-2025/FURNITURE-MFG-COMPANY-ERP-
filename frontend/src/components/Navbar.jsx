import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../utils/api'

// Icons
const Icon = ({ d, className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
  </svg>
)

const ICONS = {
  search:  'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  plus:    'M12 4v16m8-8H4',
  moon:    'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  sun:     'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  logout:  'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  chevron: 'M19 9l-7 7-7-7',
  user:    'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  order:   'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  customer:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  product: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
}

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [company, setCompany]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('erp_company') || '{}') } catch { return {} }
  })

  const searchRef  = useRef(null)
  const profileRef = useRef(null)
  const actionsRef = useRef(null)
  const timerRef   = useRef(null)

  // Load company info
  useEffect(() => {
    api.get('/company').then(r => {
      setCompany(r.data || {})
      localStorage.setItem('erp_company', JSON.stringify(r.data || {}))
    }).catch(() => {})
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
      if (actionsRef.current && !actionsRef.current.contains(e.target)) setShowActions(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) { setShowSearch(false); setResults([]) }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced global search
  const handleSearch = (q) => {
    setQuery(q)
    clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); setShowSearch(false); return }
    setSearching(true)
    timerRef.current = setTimeout(async () => {
      try {
        const r = await api.get('/search', { params: { q } })
        setResults(r.data)
        setShowSearch(true)
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
  }

  const goTo = (item) => {
    setQuery(''); setResults([]); setShowSearch(false)
    const base = user?.role === 'ADMIN' ? '/admin' : '/manager'
    if (item.type === 'order')    navigate(`${base}/orders`)
    if (item.type === 'customer') navigate(`${base}/orders`)
    if (item.type === 'product')  navigate(`/admin/products`)
  }

  const isAdmin = user?.role === 'ADMIN'
  const base    = isAdmin ? '/admin' : '/manager'

  const quickActions = [
    { label: 'New Order',    icon: ICONS.order,    action: () => { navigate(`${base}/orders?new=1`);    setShowActions(false) } },
    { label: 'Add Customer', icon: ICONS.customer, action: () => { navigate(`${base}/orders?customer=1`); setShowActions(false) } },
    ...(isAdmin ? [{ label: 'Add Product', icon: ICONS.product, action: () => { navigate('/admin/products?new=1'); setShowActions(false) } }] : []),
  ]

  const roleColors = { ADMIN: 'badge-blue', MANAGER: 'badge-purple', ACCOUNTANT: 'badge-green', WORKER: 'badge-gray', DELIVERY: 'badge-orange' }

  return (
    <header className="h-12 bg-white dark:bg-gray-900 border-b border-surface-200 dark:border-gray-800 flex items-center px-3 gap-3 flex-shrink-0 z-30">
      {/* Mobile menu button */}
      <button onClick={onMenuClick} className="lg:hidden btn-ghost !min-h-0 !p-1.5 flex-shrink-0">
        <Icon d="M4 6h16M4 12h16M4 18h16" />
      </button>

      {/* Company Logo + Name */}
      <div className="hidden lg:flex items-center gap-2 flex-shrink-0 min-w-[160px]">
        {company.logo_url ? (
          <img src={company.logo_url} alt="logo" className="w-6 h-6 rounded object-cover" />
        ) : (
          <div className="w-6 h-6 rounded bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
            </svg>
          </div>
        )}
        <span className="text-sm font-bold text-surface-900 dark:text-gray-100 truncate max-w-[120px]">
          {company.company_name || 'WoodCraft ERP'}
        </span>
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-md mx-auto relative" ref={searchRef}>
        <div className="relative">
          <Icon d={ICONS.search} className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
          <input
            className="input !pl-8 !py-1.5 !min-h-0 !text-xs w-full"
            placeholder="Search orders, customers, products…"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => query && setShowSearch(true)}
          />
          {searching && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 border border-primary-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Search Results */}
        {showSearch && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
            {['order','customer','product'].map(type => {
              const group = results.filter(r => r.type === type)
              if (!group.length) return null
              return (
                <div key={type}>
                  <div className="px-3 py-1.5 text-xs font-bold text-surface-400 uppercase tracking-wide bg-surface-50 dark:bg-gray-800">
                    {type}s
                  </div>
                  {group.map((item, i) => (
                    <button key={i} onClick={() => goTo(item)}
                      className="w-full text-left px-3 py-2 hover:bg-surface-50 dark:hover:bg-gray-800 flex items-center gap-2.5 border-b border-surface-100 dark:border-gray-800 last:border-0">
                      <span className={`badge ${type==='order'?'badge-blue':type==='customer'?'badge-green':'badge-purple'} text-xs`}>{type}</span>
                      <span className="text-sm font-medium text-surface-800 dark:text-gray-200">{item.label}</span>
                      {item.sub && <span className="text-xs text-surface-400 ml-auto">{item.sub}</span>}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}
        {showSearch && query && results.length === 0 && !searching && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-700 rounded-xl shadow-xl z-50 px-4 py-3 text-sm text-surface-400 text-center">
            No results for "{query}"
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Date */}
        <span className="hidden xl:block text-xs text-surface-400 dark:text-gray-500 px-2">
          {new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
        </span>

        {/* Quick Actions */}
        <div className="relative" ref={actionsRef}>
          <button onClick={() => setShowActions(p => !p)}
            className="btn-secondary !px-2.5 !py-1.5 !min-h-0 !text-xs gap-1">
            <Icon d={ICONS.plus} className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
          {showActions && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
              {quickActions.map(a => (
                <button key={a.label} onClick={a.action}
                  className="w-full text-left px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-gray-800 flex items-center gap-2.5 text-sm text-surface-700 dark:text-gray-300 border-b border-surface-100 dark:border-gray-800 last:border-0">
                  <Icon d={a.icon} className="w-4 h-4 text-primary-500" />
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button onClick={toggle} className="btn-ghost !min-h-0 !p-1.5" title={dark ? 'Light mode' : 'Dark mode'}>
          <Icon d={dark ? ICONS.sun : ICONS.moon} className="w-4 h-4" />
        </button>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button onClick={() => setShowProfile(p => !p)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-100 dark:hover:bg-gray-800 transition-colors">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-surface-800 dark:text-gray-200 leading-tight">{user?.name}</div>
              <div className={`text-xs ${roleColors[user?.role] || 'badge-gray'} px-1 py-0 rounded text-center leading-4`}>{user?.role}</div>
            </div>
            <Icon d={ICONS.chevron} className="w-3 h-3 text-surface-400 hidden sm:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-surface-100 dark:border-gray-800">
                <div className="font-semibold text-sm text-surface-900 dark:text-gray-100">{user?.name}</div>
                <div className="text-xs text-surface-400 dark:text-gray-500">{user?.email}</div>
                <span className={`${roleColors[user?.role] || 'badge-gray'} mt-1 inline-block`}>{user?.role}</span>
              </div>
              <button onClick={logout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Icon d={ICONS.logout} className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
