import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { Modal, ConfirmDialog, SearchBar, LoadingPage, EmptyState } from '../../components/ui'
import { useToast } from '../../components/ui'

const emptyForm = { name: '', email: '', password: '', phone: '', role: 'MANAGER' }

export default function AdminManagers() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => api.get('/users').then(r => setUsers(r.data)).catch(console.error).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/users', form)
      toast('Manager added successfully')
      setModal(false)
      setForm(emptyForm)
      load()
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to add manager', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/users/${confirmDel}`)
      toast('Manager deactivated')
      setConfirmDel(null)
      load()
    } catch { toast('Failed', 'error') }
    finally { setDeleting(false) }
  }

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Managers</h1>
          <p className="text-sm text-surface-400 mt-1">User accounts with access to the ERP</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setModal(true) }} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Manager
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-surface-100">
          <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} title="No users found" desc="Add managers to give them access" action={<button onClick={() => setModal(true)} className="btn-primary">Add Manager</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Added</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-surface-50 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${u.role === 'ADMIN' ? 'bg-primary-500' : 'bg-blue-500'}`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-surface-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="table-td text-surface-500">{u.email}</td>
                    <td className="table-td">
                      <span className={`badge ${u.role === 'ADMIN' ? 'bg-primary-50 text-primary-700' : 'bg-blue-50 text-blue-700'}`}>{u.role}</span>
                    </td>
                    <td className="table-td text-surface-500">{u.phone || '—'}</td>
                    <td className="table-td">
                      <span className={`badge ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td text-surface-400 text-xs">{new Date(u.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td>
                    <td className="table-td">
                      <button onClick={() => setConfirmDel(u.id)} className="btn-ghost p-1.5 text-xs text-red-500 hover:bg-red-50">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Manager">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} required placeholder="Manager name" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} required placeholder="email@company.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} placeholder="9876543210" />
            </div>
            <div>
              <label className="label">Password *</label>
              <input className="input" type="password" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} required placeholder="Min 6 characters" minLength={6} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(p=>({...p,role:e.target.value}))}>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Adding...' : 'Add Manager'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={handleDelete}
        title="Deactivate User" message="This user will lose access to the ERP system."
        confirmLabel="Deactivate" loading={deleting}
      />
    </div>
  )
}
