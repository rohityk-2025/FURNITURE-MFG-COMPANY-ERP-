/**
 * Admin Users (Managers) Page
 * - Add, Edit, Deactivate, Reactivate users
 * - Admin cannot deactivate own account
 * - Supports password change on edit
 */
import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { Modal, ConfirmDialog, SearchBar, LoadingPage, EmptyState, useToast } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const emptyForm = { name:'', email:'', password:'', phone:'', role:'MANAGER' }
const ROLES = ['MANAGER','ADMIN','ACCOUNTANT']

const labelStyle = { display:'block', fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }
const inputStyle = { width:'100%', padding:'9px 12px', background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:13, outline:'none', minHeight:38 }

export default function AdminManagers() {
  const toast = useToast()
  const { user: me } = useAuth()
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [addModal,   setAddModal]   = useState(false)
  const [editModal,  setEditModal]  = useState(null)  // user object
  const [form,       setForm]       = useState(emptyForm)
  const [editForm,   setEditForm]   = useState(emptyForm)
  const [saving,     setSaving]     = useState(false)
  const [deactConfirm, setDeactConfirm] = useState(null)
  const [working,    setWorking]    = useState(false)

  const load = () =>
    api.get('/users')
       .then(r => setUsers(r.data))
       .catch(console.error)
       .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/users', form)
      toast('User created successfully')
      setAddModal(false); setForm(emptyForm); load()
    } catch(err) { toast(err.response?.data?.error || 'Failed to create user', 'error') }
    finally { setSaving(false) }
  }

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.put(`/users/${editModal.id}`, editForm)
      toast('User updated successfully')
      setEditModal(null); load()
    } catch(err) { toast(err.response?.data?.error || 'Failed to update', 'error') }
    finally { setSaving(false) }
  }

  const handleDeactivate = async () => {
    if (!deactConfirm) return
    setWorking(true)
    try {
      await api.delete(`/users/${deactConfirm.id}`)
      toast('User deactivated')
      setDeactConfirm(null); load()
    } catch(err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setWorking(false) }
  }

  const handleActivate = async (u) => {
    try {
      await api.post(`/users/${u.id}/activate`)
      toast('User reactivated'); load()
    } catch { toast('Failed', 'error') }
  }

  const openEdit = (u) => {
    setEditForm({ name:u.name, email:u.email, password:'', phone:u.phone||'', role:u.role })
    setEditModal(u)
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const roleBadge = (role) => {
    const colors = { ADMIN:'var(--primary)', MANAGER:'var(--secondary)', ACCOUNTANT:'var(--green)' }
    const bg     = { ADMIN:'var(--primary-bg)', MANAGER:'var(--secondary-bg)', ACCOUNTANT:'var(--green-bg)' }
    return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5, background:bg[role]||'var(--bg2)', color:colors[role]||'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{role}</span>
  }

  const FormFields = ({ vals, onChange }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <label style={labelStyle}>Full Name *</label>
          <input style={inputStyle} value={vals.name} onChange={e=>onChange('name',e.target.value)} required placeholder="Full name"
            onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input style={inputStyle} value={vals.phone} onChange={e=>onChange('phone',e.target.value)} placeholder="+91 98765 43210"
            onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
        </div>
        <div>
          <label style={labelStyle}>Email *</label>
          <input style={inputStyle} type="email" value={vals.email} onChange={e=>onChange('email',e.target.value)} required placeholder="user@company.com"
            onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
        </div>
        <div>
          <label style={labelStyle}>Role *</label>
          <select style={inputStyle} value={vals.role} onChange={e=>onChange('role',e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={labelStyle}>Password {vals.id ? '(leave blank to keep current)' : '*'}</label>
          <input style={inputStyle} type="password" value={vals.password} onChange={e=>onChange('password',e.target.value)}
            placeholder={vals.id ? 'Enter new password to change' : 'Minimum 6 characters'}
            onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
        </div>
      </div>
    </div>
  )

  if (loading) return <LoadingPage />

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', margin:0 }}>Users & Managers</h1>
          <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>Manage ERP access accounts</p>
        </div>
        <button onClick={()=>{ setForm(emptyForm); setAddModal(true) }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
          Add User
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name or email..." />

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
        {filtered.length === 0 ? (
          <EmptyState icon={<svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
            title="No users found" desc="Add a manager or admin account" />
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Name','Email','Role','Phone','Status','Actions'].map(h=><th key={h} className="table-th">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const isSelf = u.id === me?.id
                  return (
                    <tr key={u.id} className="table-row" style={{ opacity: u.is_active ? 1 : 0.6 }}>
                      <td className="table-td">
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),var(--secondary))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:700 }}>
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>
                              {u.name} {isSelf && <span style={{ fontSize:10, color:'var(--primary)', fontWeight:700 }}>(You)</span>}
                            </div>
                            <div style={{ fontSize:11, color:'var(--text3)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-td" style={{ fontSize:12, color:'var(--text2)' }}>{u.email}</td>
                      <td className="table-td">{roleBadge(u.role)}</td>
                      <td className="table-td" style={{ fontSize:12, color:'var(--text3)' }}>{u.phone || '—'}</td>
                      <td className="table-td">
                        <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:5, background: u.is_active ? 'var(--green-bg)' : 'var(--red-bg)', color: u.is_active ? 'var(--green)' : 'var(--red)' }}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-td">
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={()=>openEdit(u)}
                            style={{ padding:'4px 10px', borderRadius:7, background:'var(--primary-bg)', color:'var(--primary)', border:'none', fontWeight:700, fontSize:11, cursor:'pointer' }}>
                            Edit
                          </button>
                          {u.is_active ? (
                            <button onClick={()=>{
                              if (isSelf) { toast('You cannot deactivate your own account. Ask another admin.','error'); return }
                              setDeactConfirm(u)
                            }}
                              style={{ padding:'4px 10px', borderRadius:7, background:'var(--red-bg)', color:'var(--red)', border:'none', fontWeight:700, fontSize:11, cursor:'pointer' }}>
                              Deactivate
                            </button>
                          ) : (
                            <button onClick={()=>handleActivate(u)}
                              style={{ padding:'4px 10px', borderRadius:7, background:'var(--green-bg)', color:'var(--green)', border:'none', fontWeight:700, fontSize:11, cursor:'pointer' }}>
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal open={addModal} onClose={()=>setAddModal(false)} title="Add New User">
        <form onSubmit={handleAdd} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <FormFields vals={form} onChange={(k,v)=>setForm(p=>({...p,[k]:v}))} />
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={()=>setAddModal(false)} style={{ flex:1, padding:'10px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', color:'var(--text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex:2, padding:'10px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', opacity:saving?0.7:1 }}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      {editModal && (
        <Modal open={!!editModal} onClose={()=>setEditModal(null)} title={`Edit User — ${editModal.name}`}>
          <form onSubmit={handleEdit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {editModal.id === me?.id && (
              <div style={{ background:'var(--yellow-bg)', border:'1px solid var(--yellow)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--yellow)', fontWeight:600 }}>
                You are editing your own account. You cannot deactivate yourself.
              </div>
            )}
            <FormFields vals={editForm} onChange={(k,v)=>setEditForm(p=>({...p,[k]:v}))} />
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={()=>setEditModal(null)} style={{ flex:1, padding:'10px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', color:'var(--text2)' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ flex:2, padding:'10px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Deactivate Confirm */}
      <ConfirmDialog open={!!deactConfirm} onClose={()=>setDeactConfirm(null)} onConfirm={handleDeactivate} loading={working}
        title="Deactivate Account" message={`Deactivate "${deactConfirm?.name}"? They will lose access until reactivated.`} confirmLabel="Deactivate" />
    </div>
  )
}
