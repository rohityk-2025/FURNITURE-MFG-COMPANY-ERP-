import { useState, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../../utils/api'
import { KpiCard, LoadingPage, StatusBadge, fmt, fmtDate } from '../../components/ui'

const COLORS = ['#2563eb','#7c3aed','#10b981','#f59e0b','#ef4444','#06b6d4']

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-900 text-white px-3 py-2 rounded-xl text-xs shadow-modal">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p,i) => <p key={i} style={{color:p.color}}>{p.name}: {p.value > 100 ? fmt(p.value) : p.value}</p>)}
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/admin').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingPage />
  if (!data) return <div className="text-surface-400">Failed to load dashboard</div>

  const { kpis, monthlySales = [], monthlyExpenses = [], workerEfficiency = [], orderStatusDist = [], recentOrders = [] } = data

  const allMonths = [...new Set([...monthlySales.map(d=>d.month), ...monthlyExpenses.map(d=>d.month)])]
  const merged = allMonths.map(m => ({
    month: m,
    Sales:    parseFloat(monthlySales.find(d=>d.month===m)?.sales || 0),
    Expenses: parseFloat(monthlyExpenses.find(d=>d.month===m)?.expenses || 0),
    Profit:   parseFloat(monthlySales.find(d=>d.month===m)?.sales || 0) - parseFloat(monthlyExpenses.find(d=>d.month===m)?.expenses || 0),
  }))

  const pieData = orderStatusDist.map(d => ({ name: d.status.replace(/_/g,' '), value: parseInt(d.count) }))

  const kpiCards = [
    { label:'Total Sales',   value:fmt(kpis.totalSales),   sub:`${kpis.totalOrders} orders`,       color:'blue',   gradient:true,
      icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg> },
    { label:'Received',      value:fmt(kpis.received),     sub:`Pending: ${fmt(kpis.totalSales-kpis.received)}`, color:'green',
      icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg> },
    { label:'Net Profit',    value:fmt(kpis.profit),       sub:`Expenses: ${fmt(kpis.totalExpenses)}`, color: kpis.profit >= 0 ? 'green' : 'red',
      icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10"/></svg> },
    { label:'Worker Dues',   value:fmt(kpis.pendingWorkerPayments), sub:'Payments pending',        color:'amber',
      icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-surface-400 mt-1">Business overview — this month</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="section-title mb-1">Sales vs Expenses vs Profit</h3>
          <p className="text-xs text-surface-400 mb-4">Last 6 months trend</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={merged} margin={{left:-15,right:5}}>
              <defs>
                <linearGradient id="salesG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.12}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient>
                <linearGradient id="profitG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.12}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<Tip />} />
              <Legend wrapperStyle={{fontSize:12,paddingTop:12}} />
              <Area type="monotone" dataKey="Sales"    stroke="#2563eb" strokeWidth={2.5} fill="url(#salesG)"  dot={false} />
              <Area type="monotone" dataKey="Expenses" stroke="#7c3aed" strokeWidth={2}   fill="none" strokeDasharray="5 5" dot={false} />
              <Area type="monotone" dataKey="Profit"   stroke="#10b981" strokeWidth={2.5} fill="url(#profitG)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-1">Order Status</h3>
          <p className="text-xs text-surface-400 mb-4">All time distribution</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="42%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v=>[v,'Orders']} />
              <Legend wrapperStyle={{fontSize:11}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Worker efficiency + Recent Orders */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="section-title mb-4">Worker Efficiency</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={workerEfficiency} layout="vertical" margin={{left:0,right:16}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis dataKey="worker" type="category" width={85} tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Legend wrapperStyle={{fontSize:12,paddingTop:8}} />
              <Bar dataKey="assigned"  name="Assigned"  fill="#e2e8f0" radius={[0,5,5,0]} maxBarSize={14} />
              <Bar dataKey="completed" name="Completed" fill="#2563eb" radius={[0,5,5,0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-4">Recent Orders</h3>
          <div className="space-y-1">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-8">No orders yet</p>
            ) : recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0 gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-surface-900 truncate">{o.customer_name}</div>
                  <div className="text-xs text-surface-400 font-mono">{o.order_number} · {fmtDate(o.order_date)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={o.status} />
                  <span className="text-sm font-bold text-surface-900">{fmt(o.total_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
