import { useState, useEffect } from 'react'
import api from '../../utils/api'
import {
  Modal,
  ConfirmDialog,
  SearchBar,
  LoadingPage,
  EmptyState,
  PageHeader,
  Avatar,
  FormSection,
} from '../../components/ui'
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

  const load = () =>
    api
      .get('/users')
      .then((r) => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

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
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/users/${confirmDel}`)
      toast('Manager deactivated')
      setConfirmDel(null)
      load()
    } catch {
      toast('Failed', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Managers"
        subtitle="User accounts with access to the ERP"
        action={
          <button
            onClick={() => {
              setForm(emptyForm)
              setModal(true)
            }}
            className="btn-primary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Manager
          </button>
        }
      />

      <div className="list-shell">
        <div className="list-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            }
            title="No users found"
            desc="Add managers to give them access."
            action={
              <button onClick={() => setModal(true)} className="btn-primary">
                Add Manager
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
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
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="table-row">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <span className="font-semibold text-[13px] text-slate-900 dark:text-slate-100">
                          {u.name}
                        </span>
                      </div>
                    </td>
                    <td className="table-td text-slate-500 dark:text-slate-300">{u.email}</td>
                    <td className="table-td">
                      <span className={u.role === 'ADMIN' ? 'badge-blue' : 'badge-purple'}>
                        {u.role}
                      </span>
                    </td>
                    <td className="table-td text-slate-500 dark:text-slate-300">{u.phone || '-'}</td>
                    <td className="table-td">
                      <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td text-xs text-slate-400">
                      {new Date(u.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="table-td">
                      <button onClick={() => setConfirmDel(u.id)} className="btn-ghost icon-button text-red-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Add Manager"
        subtitle="Use the same account setup pattern used across admin forms."
      >
        <form onSubmit={handleSave} className="form-shell">
          <FormSection title="Account Information">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Full Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="Manager name"
                />
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  placeholder="email@company.com"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="label">Password *</label>
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                >
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
          </FormSection>

          <div className="form-actions">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
              {saving ? 'Adding...' : 'Add Manager'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Deactivate User"
        message="This user will lose access to the ERP system."
        confirmLabel="Deactivate"
        loading={deleting}
      />
    </div>
  )
}
