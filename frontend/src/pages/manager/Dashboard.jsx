import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge, fmtDate } from '../../components/ui'

export default function ManagerDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/manager').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingPage />
  if (!data) return <div className="text-surface-400">Failed to load</div>

  const { kpis, recentAssignments, todayDeliveries } = data

  const kpiCards = [
    { label: "Completed Today", value: kpis.completedToday, color: "bg-green-50", text: "text-green-700", border: "border-green-100",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: "Pending Work", value: kpis.pendingWork, color: "bg-amber-50", text: "text-amber-700", border: "border-amber-100",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: "Active Orders", value: kpis.activeOrders, color: "bg-blue-50", text: "text-blue-700", border: "border-blue-100",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
    { label: "Pending Orders", value: kpis.pendingOrders, color: "bg-orange-50", text: "text-orange-700", border: "border-orange-100",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg> },
    { label: "In Production", value: kpis.inProduction, color: "bg-purple-50", text: "text-purple-700", border: "border-purple-100",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { label: "Today's Deliveries", value: kpis.todaysDeliveries, color: "bg-pink-50", text: "text-pink-700", border: "border-pink-100",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Good morning 👋</h1>
        <p className="text-sm text-surface-400 mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card, i) => (
          <div key={i} className={`card p-5 border ${card.border}`}>
            <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center ${card.text} mb-3`}>
              {card.icon}
            </div>
            <div className={`font-display text-3xl font-bold ${card.text}`}>{card.value}</div>
            <div className="text-xs font-semibold text-surface-500 uppercase tracking-wide mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Pending assignments */}
        <div className="card">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
            <h3 className="section-title">Pending Work Assignments</h3>
            <span className="badge bg-amber-50 text-amber-700">{recentAssignments.length}</span>
          </div>
          <div className="divide-y divide-surface-100">
            {recentAssignments.length === 0 ? (
              <div className="py-10 text-center text-surface-400 text-sm">No pending assignments</div>
            ) : recentAssignments.slice(0, 6).map(a => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                    {a.worker_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-surface-900 truncate">{a.worker_name}</div>
                    <div className="text-xs text-surface-400 truncate">{a.custom_product_name || a.product_name_db} × {a.quantity}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {a.due_date && <span className="text-xs text-surface-400">{fmtDate(a.due_date)}</span>}
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's deliveries */}
        <div className="card">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
            <h3 className="section-title">Today's Deliveries</h3>
            <span className={`badge ${kpis.todaysDeliveries > 0 ? 'bg-blue-50 text-blue-700' : 'bg-surface-100 text-surface-500'}`}>{kpis.todaysDeliveries}</span>
          </div>
          <div className="divide-y divide-surface-100">
            {todayDeliveries.length === 0 ? (
              <div className="py-10 text-center text-surface-400 text-sm">No deliveries scheduled today</div>
            ) : todayDeliveries.map(o => (
              <div key={o.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-50 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-surface-900">{o.customer_name}</div>
                  <div className="text-xs text-surface-400 font-mono">{o.order_number}</div>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
