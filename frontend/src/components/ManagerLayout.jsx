import { Outlet, NavLink } from 'react-router-dom'
import { ToastProvider } from './ui'
import { useState } from 'react'
import Navbar from './Navbar'

const NAV = [
  { to:'/manager',            end:true, label:'Dashboard',   icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to:'/manager/assign-work',label:'Assign Work',  icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to:'/manager/orders',     label:'Orders',       icon:'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { to:'/manager/customers',  label:'Customers',    icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { to:'/manager/inventory',  label:'Inventory',    icon:'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  { to:'/manager/workers',    label:'Workers',      icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { to:'/manager/attendance', label:'Attendance',   icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to:'/manager/expenses',   label:'Expenses',     icon:'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { to:'/manager/reports',    label:'Reports',      icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to:'/manager/calendar',   label:'Calendar',     icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
]

function Sidebar({ onClose }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--card)', borderRight:'1px solid var(--border)', width:200 }}>
      <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
        <span style={{ fontSize:10, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Manager Panel</span>
      </div>
      <nav style={{ flex:1, padding:8, overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={onClose}
            className={({isActive}) => `nav-item${isActive?' active':''}`}>
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={n.icon}/></svg>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function ManagerLayout() {
  const [open, setOpen] = useState(false)
  return (
    <ToastProvider>
      <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>
        <Navbar onMenuClick={() => setOpen(true)} />
        <div style={{ display:'flex', flex:1, minHeight:0, overflow:'hidden' }}>
          <aside style={{ flexShrink:0, overflowY:'auto' }} className="sidebar-desktop2">
            <style>{`.sidebar-desktop2{display:none}@media(min-width:1024px){.sidebar-desktop2{display:flex!important}}`}</style>
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
