import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ToastProvider } from './ui'
import { useState } from 'react'
import Navbar from './Navbar'

const Icon = ({ d }) => <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d}/></svg>

const NAV_GROUPS = [
  { label: 'Overview', items: [
    { to:'/admin', end:true, label:'Dashboard', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  ]},
  { label: 'Operations', items: [
    { to:'/admin/workers',   label:'Workers',    icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { to:'/admin/managers',  label:'Users',      icon:'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { to:'/admin/attendance',label:'Attendance', icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  ]},
  { label: 'Catalog', items: [
    { to:'/admin/products',  label:'Products',   icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { to:'/admin/inventory', label:'Inventory',  icon:'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  ]},
  { label: 'Sales', items: [
    { to:'/admin/orders',    label:'Orders',     icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { to:'/admin/customers', label:'Customers',  icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  ]},
  { label: 'Finance', items: [
    { to:'/admin/finance',   label:'Finance',    icon:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { to:'/admin/expenses',  label:'Expenses',   icon:'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { to:'/admin/reports',   label:'Reports',    icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ]},
  { label: 'Settings', items: [
    { to:'/admin/calendar',  label:'Calendar',   icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { to:'/admin/company',   label:'Company',    icon:'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  ]},
]

function Sidebar({ onClose }) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-surface-200 dark:border-gray-800 w-52">
      <div className="px-3 py-3 border-b border-surface-100 dark:border-gray-800">
        <span className="text-xs font-bold text-surface-400 dark:text-gray-500 uppercase tracking-widest">Navigation</span>
      </div>
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-3">
        {NAV_GROUPS.map(g => (
          <div key={g.label}>
            <p className="text-xs font-bold text-surface-300 dark:text-gray-600 uppercase tracking-widest px-2 mb-1">{g.label}</p>
            {g.items.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={onClose}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon d={n.icon} />{n.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </div>
  )
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  return (
    <ToastProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-surface-50 dark:bg-gray-950">
        <Navbar onMenuClick={() => setOpen(true)} />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <aside className="hidden lg:flex flex-col flex-shrink-0 overflow-y-auto">
            <Sidebar onClose={() => {}} />
          </aside>
          {open && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
              <aside className="relative z-10 overflow-y-auto">
                <Sidebar onClose={() => setOpen(false)} />
              </aside>
            </div>
          )}
          <main className="flex-1 overflow-y-auto p-4 sm:p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
