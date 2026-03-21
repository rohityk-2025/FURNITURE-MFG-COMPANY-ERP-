import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge, useToast } from '../../components/ui'

export default function Attendance() {
  const toast = useToast()
  const [workers, setWorkers] = useState([])
  const [attendance, setAttendance] = useState({})
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [w, a] = await Promise.all([api.get('/workers'), api.get('/attendance', { params: { date } })])
      setWorkers(w.data)
      const map = {}; a.data.forEach(r => { map[r.worker_id] = r }); setAttendance(map)
    } finally { setLoading(false) }
  }, [date])

  useEffect(() => { load() }, [load])

  const mark = async (wid, status) => {
    setSaving(p => ({ ...p, [wid]: true }))
    try {
      await api.post('/attendance', { worker_id: wid, date, status })
      setAttendance(p => ({ ...p, [wid]: { worker_id: wid, status, date } }))
      toast('Attendance marked')
    } catch { toast('Failed', 'error') }
    finally { setSaving(p => ({ ...p, [wid]: false })) }
  }

  const present = Object.values(attendance).filter(a => a.status === 'PRESENT').length
  const absent  = Object.values(attendance).filter(a => a.status === 'ABSENT').length

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-title">Attendance</h1><p className="text-sm text-surface-400 mt-1">Mark daily worker attendance</p></div>
        <input type="date" className="input w-auto" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[['Total', workers.length,'bg-surface-100 text-surface-700'],['Present', present,'bg-green-50 text-green-700'],['Absent', absent,'bg-red-50 text-red-600']].map(([l,v,c]) => (
          <div key={l} className={`card p-4 ${c} border-transparent`}><div className="text-2xl font-bold">{v}</div><div className="text-xs uppercase tracking-wide mt-1 font-semibold opacity-70">{l}</div></div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50 border-b border-surface-100"><tr><th className="table-th">Worker</th><th className="table-th">Skill</th><th className="table-th">Status</th><th className="table-th">Mark</th></tr></thead>
            <tbody className="divide-y divide-surface-100">
              {workers.map(w => {
                const a = attendance[w.id]
                return (
                  <tr key={w.id} className="hover:bg-surface-50">
                    <td className="table-td"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center font-bold text-sm">{w.name.charAt(0)}</div><div><div className="font-semibold text-sm">{w.name}</div><div className="text-xs text-surface-400">{w.phone}</div></div></div></td>
                    <td className="table-td"><span className="badge-gray">{w.skill || '—'}</span></td>
                    <td className="table-td">{a ? <StatusBadge status={a.status} /> : <span className="badge-gray">Not Marked</span>}</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        {['PRESENT','ABSENT','HALF_DAY'].map(s => (
                          <button key={s} disabled={saving[w.id]} onClick={() => mark(w.id, s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all min-h-[36px] ${a?.status===s ? s==='PRESENT'?'bg-green-500 text-white border-green-500':s==='ABSENT'?'bg-red-500 text-white border-red-500':'bg-yellow-400 text-white border-yellow-400' : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'}`}>
                            {s==='HALF_DAY'?'Half':s.charAt(0)+s.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="sm:hidden space-y-3 p-3">
          {workers.map(w => {
            const a = attendance[w.id]
            return (
              <div key={w.id} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center font-bold">{w.name.charAt(0)}</div><div><div className="font-semibold">{w.name}</div><div className="text-xs text-surface-400">{w.skill}</div></div></div>
                  {a ? <StatusBadge status={a.status} /> : <span className="badge-gray text-xs">Not Marked</span>}
                </div>
                <div className="flex gap-2">
                  {['PRESENT','ABSENT','HALF_DAY'].map(s => (
                    <button key={s} onClick={() => mark(w.id, s)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${a?.status===s?s==='PRESENT'?'bg-green-500 text-white border-green-500':s==='ABSENT'?'bg-red-500 text-white border-red-500':'bg-yellow-400 text-white border-yellow-400':'bg-white text-surface-600 border-surface-200'}`}>
                      {s==='HALF_DAY'?'Half Day':s.charAt(0)+s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
