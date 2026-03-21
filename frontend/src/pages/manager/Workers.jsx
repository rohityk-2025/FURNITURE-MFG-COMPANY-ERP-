import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge, fmt, fmtDate } from '../../components/ui'

export default function ManagerWorkers() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { api.get('/workers').then(r => setWorkers(r.data)).finally(() => setLoading(false)) }, [])

  const openDetail = async (w) => {
    setSelected(w)
    const r = await api.get(`/workers/${w.id}`)
    setDetail(r.data)
  }

  const filtered = workers.filter(w => w.name.toLowerCase().includes(search.toLowerCase()) || w.skill?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Workers</h1>
        <p className="text-sm text-surface-400 mt-1">Monitor worker performance and assignments</p>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input className="input pl-9 max-w-xs" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workers..." />
      </div>

      {/* Worker cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(w => {
          const total = parseInt(w.total_assignments) || 0
          const completed = parseInt(w.completed_assignments) || 0
          const pending = parseInt(w.pending_assignments) || 0
          const eff = total > 0 ? Math.round((completed / total) * 100) : 0

          return (
            <button key={w.id} onClick={() => openDetail(w)}
              className="card p-5 text-left group hover:shadow-card-hover transition-all hover:-translate-y-0.5">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-display text-xl font-bold flex-shrink-0 group-hover:bg-primary-200 transition-colors">
                  {w.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-surface-900 group-hover:text-primary-600 transition-colors">{w.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge bg-surface-100 text-surface-600 text-xs">{w.skill || 'General'}</span>
                    {w.phone && <span className="text-xs text-surface-400">{w.phone}</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[['Total', total, 'text-surface-700'], ['Done', completed, 'text-green-600'], ['Pending', pending, 'text-amber-500']].map(([label, val, cls]) => (
                  <div key={label} className="bg-surface-50 rounded-lg p-2 text-center">
                    <div className={`font-display text-xl font-bold ${cls}`}>{val}</div>
                    <div className="text-xs text-surface-400">{label}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-surface-500">Efficiency</span>
                  <span className={`font-semibold ${eff >= 75 ? 'text-green-600' : eff >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{eff}%</span>
                </div>
                <div className="bg-surface-200 rounded-full h-2">
                  <div className={`rounded-full h-2 transition-all ${eff >= 75 ? 'bg-green-500' : eff >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${eff}%` }} />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Worker Detail Side Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => { setSelected(null); setDetail(null) }} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-in flex flex-col">
            <div className="sticky top-0 bg-white border-b border-surface-100 px-6 py-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-display text-xl font-bold">
                  {selected.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-display font-bold text-surface-950">{selected.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-surface-100 text-surface-600 text-xs">{selected.skill}</span>
                    {selected.phone && <span className="text-xs text-surface-400">{selected.phone}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => { setSelected(null); setDetail(null) }} className="btn-ghost p-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {detail ? (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Total Jobs', detail.assignments.length, 'text-surface-700'],
                    ['Completed', detail.assignments.filter(a => a.status === 'COMPLETED').length, 'text-green-600'],
                    ['Pending', detail.assignments.filter(a => a.status !== 'COMPLETED').length, 'text-amber-500'],
                  ].map(([label, val, cls]) => (
                    <div key={label} className="card p-3 text-center">
                      <div className={`font-display text-2xl font-bold ${cls}`}>{val}</div>
                      <div className="text-xs text-surface-400 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="section-title mb-3">Work History</h3>
                  <div className="space-y-2">
                    {detail.assignments.map(a => (
                      <div key={a.id} className="card p-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{a.custom_product_name || a.product_name_db || 'Custom'}</div>
                          <div className="flex items-center gap-3 text-xs text-surface-400 mt-0.5">
                            <span>Qty: {a.quantity}</span>
                            <span className="text-green-600 font-semibold">{fmt(a.commission * a.quantity)}</span>
                            <span>{fmtDate(a.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <StatusBadge status={a.status} />
                          {a.is_paid ? (
                            <span className="text-xs text-green-500 font-semibold">✓ Paid</span>
                          ) : a.status === 'COMPLETED' ? (
                            <span className="text-xs text-amber-500">⏳ Unpaid</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {detail.assignments.length === 0 && (
                      <div className="text-center py-8 text-surface-400 text-sm">No assignments yet</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
