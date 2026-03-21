import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const user = await login(form.email, form.password)
      navigate(user.role === 'ADMIN' ? '/admin' : '/manager', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0f172a,#1e1b4b,#312e81)' }}>
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20 bg-blue-500" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-15 bg-purple-500" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
            </svg>
          </div>
          <span className="font-bold text-white text-lg">WoodCraft ERP</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-5xl font-bold text-white leading-tight mb-5">
            Manage your<br />furniture business<br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              with precision.
            </span>
          </h1>
          <p className="text-slate-400 text-base">Orders · Workers · Inventory · Finance</p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[['Orders','Live tracking'],['Workers','Performance'],['Finance','Reports']].map(([t,s]) => (
            <div key={t} className="rounded-2xl p-4 border border-white/10 bg-white/5">
              <div className="font-bold text-white text-sm">{t}</div>
              <div className="text-slate-400 text-xs mt-0.5">{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/></svg>
            </div>
            <span className="font-bold text-surface-900 text-lg">WoodCraft ERP</span>
          </div>

          <h2 className="text-3xl font-bold text-surface-900 mb-1">Welcome back</h2>
          <p className="text-surface-400 text-sm mb-8">Sign in to your workspace</p>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="admin@furnitureerp.com"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Enter password"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn text-white font-bold py-3 text-base min-h-[48px] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              {loading ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Signing in…</> : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-surface-50 rounded-2xl border border-surface-100">
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Demo Credentials</p>
            <div className="space-y-2">
              {[['Admin','admin@furnitureerp.com','badge-blue'],['Manager','manager@furnitureerp.com','badge-purple']].map(([role,email,cls]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className={cls}>{role}</span><span className="text-xs font-mono text-surface-500">{email}</span></div>
                  <button type="button" onClick={() => setForm({ email, password: 'admin123' })}
                    className="text-xs text-primary-500 hover:text-primary-700 font-semibold">Use</button>
                </div>
              ))}
              <p className="text-xs text-surface-400 pt-1">Password: <span className="font-mono font-semibold">admin123</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
