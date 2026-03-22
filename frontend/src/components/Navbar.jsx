import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../utils/api'

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [showRes,   setShowRes]   = useState(false)
  const [showProf,  setShowProf]  = useState(false)
  const [showAct,   setShowAct]   = useState(false)
  const [company,   setCompany]   = useState(() => { try { return JSON.parse(localStorage.getItem('erp_company')||'{}') } catch { return {} } })
  const searchRef = useRef(null)
  const profRef   = useRef(null)
  const actRef    = useRef(null)
  const timer     = useRef(null)

  useEffect(() => {
    api.get('/company').then(r => { setCompany(r.data||{}); localStorage.setItem('erp_company', JSON.stringify(r.data||{})) }).catch(()=>{})
  }, [])

  useEffect(() => {
    const h = (e) => {
      if (profRef.current && !profRef.current.contains(e.target)) setShowProf(false)
      if (actRef.current  && !actRef.current.contains(e.target))  setShowAct(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) { setShowRes(false); setResults([]) }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleSearch = (q) => {
    setQuery(q)
    clearTimeout(timer.current)
    if (!q.trim()) { setResults([]); setShowRes(false); return }
    setSearching(true)
    timer.current = setTimeout(async () => {
      try {
        const r = await api.get('/search', { params:{ q } })
        setResults(r.data); setShowRes(true)
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
  }

  const goTo = (item) => {
    setQuery(''); setResults([]); setShowRes(false)
    const base = user?.role==='ADMIN' ? '/admin' : '/manager'
    if (item.type==='order')    navigate(`${base}/orders`)
    if (item.type==='customer') navigate(`${base}/customers`)
    if (item.type==='product')  navigate('/admin/products')
  }

  const isAdmin = user?.role==='ADMIN'
  const base    = isAdmin ? '/admin' : '/manager'

  const DDItem = ({ label, onClick }) => (
    <button onClick={onClick} style={{ width:'100%', textAlign:'left', padding:'8px 14px', fontSize:13, color:'var(--text)', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid var(--border2)', display:'flex', alignItems:'center', gap:8 }}
      onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
      {label}
    </button>
  )

  return (
    <header style={{ height:48, background:'var(--card)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 12px', gap:10, flexShrink:0, zIndex:30, position:'sticky', top:0 }}>
      {/* Mobile menu */}
      <button onClick={onMenuClick} style={{ display:'none', padding:6, borderRadius:6, border:'none', background:'none', cursor:'pointer', color:'var(--text)' }} className="mobile-menu-btn">
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <style>{`@media(max-width:1024px){.mobile-menu-btn{display:flex!important}}`}</style>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
        <div style={{ width:26, height:26, borderRadius:6, background:'linear-gradient(135deg,var(--primary),var(--secondary))', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {company.logo_url
            ? <img src={company.logo_url} style={{ width:22,height:22,objectFit:'contain',borderRadius:4 }} alt="logo" />
            : <svg width="14" height="14" fill="none" stroke="#fff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
          }
        </div>
        <span style={{ fontWeight:800, fontSize:13, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:120, display:'none' }} className="co-name">
          {company.company_name||'WoodCraft ERP'}
        </span>
        <style>{`@media(min-width:1024px){.co-name{display:block!important}}`}</style>
      </div>

      {/* Search */}
      <div style={{ flex:1, maxWidth:400, position:'relative' }} ref={searchRef}>
        <svg style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }} width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input style={{ width:'100%', padding:'6px 10px 6px 29px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, color:'var(--text)', outline:'none', height:32 }}
          placeholder="Search orders, customers, products…" value={query} onChange={e=>handleSearch(e.target.value)} onFocus={()=>query&&setShowRes(true)} />
        {searching && <div style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', width:12, height:12, border:'2px solid var(--border)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />}

        {showRes && results.length > 0 && (
          <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, boxShadow:'var(--shadow-lg)', zIndex:100, maxHeight:280, overflowY:'auto' }}>
            {['order','customer','product'].map(type => {
              const g = results.filter(r=>r.type===type); if (!g.length) return null
              return (
                <div key={type}>
                  <div style={{ padding:'6px 12px', fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', background:'var(--bg2)', borderBottom:'1px solid var(--border2)' }}>{type}s</div>
                  {g.map((item,i) => (
                    <button key={i} onClick={()=>goTo(item)} style={{ width:'100%', textAlign:'left', padding:'8px 12px', display:'flex', alignItems:'center', gap:8, border:'none', borderBottom:'1px solid var(--border2)', background:'none', cursor:'pointer', fontSize:13, color:'var(--text)' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                      <span className={`badge-${type==='order'?'blue':type==='customer'?'green':'purple'}`} style={{ fontSize:10 }}>{type}</span>
                      <span style={{ fontWeight:600 }}>{item.label}</span>
                      {item.sub && <span style={{ fontSize:11, color:'var(--text3)', marginLeft:'auto' }}>{item.sub}</span>}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:4, marginLeft:'auto' }}>
        {/* Date */}
        <span style={{ fontSize:11, color:'var(--text3)', padding:'0 6px', display:'none' }} className="date-show">
          {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
        </span>
        <style>{`@media(min-width:1280px){.date-show{display:block!important}}`}</style>

        {/* Quick Actions */}
        <div style={{ position:'relative' }} ref={actRef}>
          <button onClick={()=>setShowAct(p=>!p)} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', border:'1px solid var(--border)', borderRadius:6, background:'var(--card)', color:'var(--text)', cursor:'pointer', fontSize:12, fontWeight:600, height:30 }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            <span style={{ display:'none' }} className="new-label">New</span>
            <style>{`@media(min-width:640px){.new-label{display:block!important}}`}</style>
          </button>
          {showAct && (
            <div style={{ position:'absolute', right:0, top:'100%', marginTop:4, background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, boxShadow:'var(--shadow-lg)', zIndex:100, minWidth:160, overflow:'hidden' }}>
              <DDItem label="📋 New Order"    onClick={()=>{ navigate(`${base}/orders`); setShowAct(false) }} />
              <DDItem label="👤 Add Customer" onClick={()=>{ navigate(`${base}/customers`); setShowAct(false) }} />
              {isAdmin && <DDItem label="📦 Add Product" onClick={()=>{ navigate('/admin/products'); setShowAct(false) }} />}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button onClick={toggle} style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)', borderRadius:6, background:'var(--card)', cursor:'pointer', color:'var(--text)' }}>
          {dark
            ? <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            : <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
          }
        </button>

        {/* Profile */}
        <div style={{ position:'relative' }} ref={profRef}>
          <button onClick={()=>setShowProf(p=>!p)} style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 8px', border:'1px solid var(--border)', borderRadius:8, background:'var(--card)', cursor:'pointer', height:30 }}>
            <div style={{ width:22, height:22, borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),var(--secondary))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0 }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ display:'none', textAlign:'left' }} className="prof-info">
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', lineHeight:1.2 }}>{user?.name}</div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>{user?.role}</div>
            </div>
            <style>{`@media(min-width:768px){.prof-info{display:block!important}}`}</style>
          </button>
          {showProf && (
            <div style={{ position:'absolute', right:0, top:'100%', marginTop:4, background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, boxShadow:'var(--shadow-lg)', zIndex:100, minWidth:180, overflow:'hidden' }}>
              <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{user?.name}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>{user?.email}</div>
                <span className={`badge-${user?.role==='ADMIN'?'blue':'purple'}`} style={{ marginTop:5, display:'inline-block', fontSize:10 }}>{user?.role}</span>
              </div>
              <button onClick={logout} style={{ width:'100%', textAlign:'left', padding:'10px 14px', fontSize:13, color:'var(--red)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontWeight:600 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
