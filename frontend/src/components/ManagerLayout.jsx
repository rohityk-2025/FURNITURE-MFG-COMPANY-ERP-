import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ToastProvider } from './ui'
import { useState } from 'react'

const NAV = [
  { to:'/manager',             end:true,  label:'Dashboard',   icon:'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
  { to:'/manager/assign-work', label:'Assign Work',  icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to:'/manager/orders',      label:'Orders',       icon:'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { to:'/manager/inventory',   label:'Inventory',    icon:'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  { to:'/manager/workers',     label:'Workers',      icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { to:'/manager/attendance',  label:'Attendance',   icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to:'/manager/calendar',    label:'Calendar',     icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to:'/manager/reports',     label:'Reports',      icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
]

function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  return (
    <div className="flex flex-col h-full bg-white border-r border-surface-100">
      <div className="px-4 py-5 border-b border-surface-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
          </div>
          <div>
            <div className="font-bold text-sm text-surface-900">WoodCraft ERP</div>
            <div className="text-xs text-surface-400">Manager Panel</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={n.icon}/></svg>
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-surface-100">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{user?.name?.charAt(0)?.toUpperCase()}</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-surface-900 truncate">{user?.name}</div>
            <div className="text-xs text-surface-400 truncate">{user?.email}</div>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 min-h-[40px]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          Logout
        </button>
      </div>
    </div>
  )
}

export default function ManagerLayout() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  return (
    <ToastProvider>
      <div className="flex h-screen bg-surface-50 overflow-hidden">
        <aside className="hidden lg:flex flex-col w-56 flex-shrink-0"><Sidebar onClose={() => {}} /></aside>
        {open && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <aside className="relative w-64 z-10"><Sidebar onClose={() => setOpen(false)} /></aside>
          </div>
        )}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-surface-100 sticky top-0 z-30">
            <button onClick={() => setOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <span className="font-bold text-surface-900">WoodCraft ERP</span>
            <div className="ml-auto w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center text-white text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase()}</div>
          </div>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6"><Outlet /></main>
        </div>
      </div>
    </ToastProvider>
  )
}
