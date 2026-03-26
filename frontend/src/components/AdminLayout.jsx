import { Outlet, NavLink } from 'react-router-dom'
import { ToastProvider } from './ui'
import { useState } from 'react'
import Navbar from './Navbar'

const NAV_GROUPS = [
  { label:'Overview', items:[
    { to:'/admin', end:true, label:'Dashboard', icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  ]},
  { label:'Sales', items:[
    { to:'/admin/orders',    label:'Orders',     icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { to:'/admin/customers', label:'Customers',  icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  ]},
  { label:'Catalog', items:[
    { to:'/admin/products',  label:'Products',   icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { to:'/admin/inventory', label:'Inventory',  icon:'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  ]},
  { label:'Finance', items:[
    { to:'/admin/finance',   label:'Finance',    icon:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { to:'/admin/expenses',  label:'Expenses',   icon:'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { to:'/admin/gst',       label:'GST',        icon:'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 7v4m6 8H6a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { to:'/admin/reports',   label:'Reports',    icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ]},
  { label:'Operations', items:[
    { to:'/admin/workers',   label:'Workers',    icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { to:'/admin/managers',  label:'Users',      icon:'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { to:'/admin/attendance',label:'Attendance', icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  ]},
  { label:'Settings', items:[
    { to:'/admin/calendar',  label:'Calendar',   icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { to:'/admin/company',   label:'Company',    icon:'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { to:'/admin/website',   label:'Website',    icon:'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
  ]},
]

function Sidebar({ onClose }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--card)', borderRight:'1px solid var(--border)', width:200 }}>
      <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
        <span style={{ fontSize:10, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Admin Panel</span>
      </div>
      <nav style={{ flex:1, padding:8, overflowY:'auto', display:'flex', flexDirection:'column', gap:12 }}>
        {NAV_GROUPS.map(g => (
          <div key={g.label}>
            <div style={{ fontSize:9, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', padding:'0 8px', marginBottom:3 }}>{g.label}</div>
            {g.items.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={onClose}
                className={({isActive}) => `nav-item${isActive?' active':''}`}>
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={n.icon}/></svg>
                {n.label}
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
      <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>
        <Navbar onMenuClick={() => setOpen(true)} />
        <div style={{ display:'flex', flex:1, minHeight:0, overflow:'hidden' }}>
          <aside style={{ flexShrink:0, overflowY:'auto' }} className="sidebar-desktop">
            <style>{`.sidebar-desktop{display:none}@media(min-width:1024px){.sidebar-desktop{display:flex!important}}`}</style>
            <Sidebar onClose={() => {}} />
          </aside>
          {open && (
            <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex' }}>
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)' }} onClick={()=>setOpen(false)} />
              <aside style={{ position:'relative', zIndex:1, overflowY:'auto' }}>
                <Sidebar onClose={() => setOpen(false)} />
              </aside>
            </div>
          )}
          <main style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
