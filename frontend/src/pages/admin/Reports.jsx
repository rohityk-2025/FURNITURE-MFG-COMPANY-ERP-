import { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../../utils/api'
import { LoadingPage, PageHeader, Tabs, fmt, fmtDate } from '../../components/ui'

const COLORS = ['#2563eb','#7c3aed','#10b981','#f59e0b','#ef4444','#06b6d4']
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-900 text-white px-3 py-2 rounded-xl text-xs shadow-modal">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value > 100 ? fmt(p.value) : p.value}</p>)}
    </div>
  )
}

export default function AdminReports() {
  const [tab, setTab] = useState('profit')
  const [data, setData] = useState({ profit: null, sales: null, workers: null })
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('monthly')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const getRange = useCallback(() => {
    const now = new Date()
    const f = d => d.toISOString().split('T')[0]
    const map = {
      daily:   { from: f(now), to: f(now) },
      weekly:  { from: f(new Date(now.setDate(now.getDate()-7))), to: f(new Date()) },
      monthly: { from: f(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), to: f(new Date()) },
      '6months':{ from: f(new Date(new Date().setMonth(new Date().getMonth()-6))), to: f(new Date()) },
      yearly:  { from: f(new Date(new Date().getFullYear(), 0, 1)), to: f(new Date()) },
      custom:  { from: customFrom, to: customTo },
    }
    return map[period] || map.monthly
  }, [period, customFrom, customTo])

  const load = useCallback(async () => {
    const range = getRange()
    if (period === 'custom' && (!customFrom || !customTo)) return
    setLoading(true)
    try {
      const [profRes, salesRes, workRes] = await Promise.all([
        api.get('/reports/profit'),
        api.get('/reports/sales', { params: range }),
        api.get('/reports/workers', { params: range }),
      ])
      setData({ profit: profRes.data, sales: salesRes.data, workers: workRes.data })
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [getRange, period, customFrom, customTo])

  useEffect(() => { load() }, [load])

  const exportPDF = () => {
    const range = getRange()
    const w = window.open('', '_blank')
    const totalSales = data.sales?.orders?.reduce((s,o) => s + parseFloat(o.total_amount||0), 0) || 0
    const totalOrders = data.sales?.orders?.length || 0
    const totalJobs = data.workers?.performance?.reduce((s,wk) => s + parseInt(wk.completed||0), 0) || 0

    w.document.write(`<!DOCTYPE html><html><head><title>Report</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#1e293b;max-width:900px;margin:0 auto}
      h1{color:#2563eb;font-size:26px}h2{font-size:18px;margin:24px 0 12px;color:#334155}
      .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}
      .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px}
      .card-val{font-size:20px;font-weight:800}.card-lbl{font-size:11px;color:#64748b;text-transform:uppercase;margin-top:2px}
      table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#64748b}
      td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px}
    </style></head><body>
    <h1>Business Report</h1>
    <p style="color:#64748b;margin-bottom:24px">Period: ${range.from} → ${range.to} · Generated: ${new Date().toLocaleString('en-IN')}</p>
    <div class="cards">
      <div class="card"><div class="card-val">₹${Number(totalSales).toLocaleString('en-IN')}</div><div class="card-lbl">Total Sales</div></div>
      <div class="card"><div class="card-val">${totalOrders}</div><div class="card-lbl">Orders</div></div>
      <div class="card"><div class="card-val">${totalJobs}</div><div class="card-lbl">Jobs Completed</div></div>
    </div>
    <h2>Orders</h2>
    <table><thead><tr><th>Order #</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
    <tbody>${(data.sales?.orders||[]).map(o=>`<tr><td>${o.order_number}</td><td>${o.customer_name}</td><td>${new Date(o.order_date).toLocaleDateString('en-IN')}</td><td>${o.status}</td><td>₹${Number(o.total_amount).toLocaleString('en-IN')}</td></tr>`).join('')}</tbody></table>
    <h2>Worker Performance</h2>
    <table><thead><tr><th>Worker</th><th>Completed</th><th>Pending</th><th>Earned</th></tr></thead>
    <tbody>${(data.workers?.performance||[]).map(wk=>`<tr><td>${wk.name}</td><td>${wk.completed}</td><td>${wk.pending}</td><td>₹${Number(wk.total_earned).toLocaleString('en-IN')}</td></tr>`).join('')}</tbody></table>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 600)
  }

  const profitMonthly = (data.profit?.monthly || []).map(r => ({
    month: r.month,
    Sales: parseFloat(r.sales || 0),
    Expenses: parseFloat(r.expenses || 0),
    Profit: parseFloat(r.profit || 0)
  }))

  const orderStatusData = (() => {
    const map = {}
    ;(data.sales?.orders || []).forEach(o => { map[o.status] = (map[o.status] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name: name.replace(/_/g,' '), value }))
  })()

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Reports"
        subtitle="Analytics and performance insights"
        action={
          <button onClick={exportPDF} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Download PDF
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly'],['6months','6 Months'],['yearly','Yearly'],['custom','Custom']].map(([id,label]) => (
          <button key={id} onClick={() => setPeriod(id)}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all min-h-[40px] ${period===id?'bg-primary-500 text-white shadow-blue':'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'}`}>
            {label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex gap-2 items-center flex-wrap">
            <input type="date" className="input py-2 text-sm" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} />
            <span className="text-surface-400 text-sm">→</span>
            <input type="date" className="input py-2 text-sm" value={customTo} onChange={e=>setCustomTo(e.target.value)} />
            <button onClick={load} className="btn-primary py-2 px-4 text-sm">Apply</button>
          </div>
        )}
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'profit',  label: 'Profit' },
        { id: 'sales',   label: 'Sales' },
        { id: 'workers', label: 'Workers' },
      ]} />

      {loading && <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}

      {/* Profit Tab */}
      {tab === 'profit' && data.profit && !loading && (
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="section-title mb-1">12-Month Profit Trend</h3>
            <p className="text-xs text-surface-400 mb-4">Sales, expenses and net profit over time</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={profitMonthly} margin={{ left: -15, right: 5 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Area type="monotone" dataKey="Sales" stroke="#2563eb" strokeWidth={2.5} fill="url(#salesGrad)" dot={false} />
                <Area type="monotone" dataKey="Expenses" stroke="#7c3aed" strokeWidth={2} fill="none" strokeDasharray="5 5" dot={false} />
                <Area type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={2.5} fill="url(#profitGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100"><h3 className="section-title">Monthly Breakdown</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-50 border-b border-surface-100"><tr>
                  <th className="table-th">Month</th><th className="table-th">Sales</th><th className="table-th">Expenses</th><th className="table-th">Profit</th><th className="table-th">Margin</th>
                </tr></thead>
                <tbody className="divide-y divide-surface-100">
                  {profitMonthly.map((r,i) => {
                    const margin = r.Sales > 0 ? ((r.Profit/r.Sales)*100).toFixed(1) : 0
                    return (
                      <tr key={i} className="hover:bg-surface-50">
                        <td className="table-td font-semibold">{r.month}</td>
                        <td className="table-td text-primary-600 font-semibold">{fmt(r.Sales)}</td>
                        <td className="table-td text-secondary-600">{fmt(r.Expenses)}</td>
                        <td className={`table-td font-bold ${r.Profit>=0?'text-green-600':'text-red-500'}`}>{fmt(r.Profit)}</td>
                        <td className="table-td"><span className={`badge text-xs ${r.Profit>=0?'badge-green':'badge-red'}`}>{margin}%</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sales Tab */}
      {tab === 'sales' && data.sales && !loading && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Orders', val: data.sales.orders?.length || 0, color: 'text-primary-600' },
              { label: 'Revenue', val: fmt(data.sales.orders?.reduce((s,o)=>s+parseFloat(o.total_amount||0),0)||0), color: 'text-green-600' },
              { label: 'Received', val: fmt(data.sales.orders?.reduce((s,o)=>s+parseFloat(o.amount_paid||0),0)||0), color: 'text-secondary-600' },
              { label: 'Products Sold', val: data.sales.productSales?.reduce((s,p)=>s+parseInt(p.total_qty||0),0)||0, color: 'text-amber-600' },
            ].map(c => (
              <div key={c.label} className="card p-4">
                <div className={`text-2xl font-bold ${c.color}`}>{c.val}</div>
                <div className="text-xs text-surface-400 uppercase tracking-wide mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {data.sales.productSales?.length > 0 && (
              <div className="card p-5">
                <h3 className="section-title mb-4">Revenue by Product</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.sales.productSales.slice(0,8)} margin={{ left:-15, right:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="product_name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="total_revenue" name="Revenue" fill="#2563eb" radius={[6,6,0,0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {orderStatusData.length > 0 && (
              <div className="card p-5">
                <h3 className="section-title mb-4">Order Status Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={orderStatusData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {orderStatusData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100"><h3 className="section-title">All Orders</h3></div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-50 border-b border-surface-100"><tr>
                  <th className="table-th">Order #</th><th className="table-th">Customer</th><th className="table-th">Date</th><th className="table-th">Status</th><th className="table-th">Total</th><th className="table-th">Paid</th>
                </tr></thead>
                <tbody className="divide-y divide-surface-100">
                  {data.sales.orders?.map(o => (
                    <tr key={o.id} className="hover:bg-surface-50">
                      <td className="table-td font-mono text-xs text-primary-600">{o.order_number}</td>
                      <td className="table-td font-medium">{o.customer_name}</td>
                      <td className="table-td text-xs text-surface-400">{fmtDate(o.order_date)}</td>
                      <td className="table-td"><span className="badge badge-gray text-xs">{o.status.replace(/_/g,' ')}</span></td>
                      <td className="table-td font-semibold">{fmt(o.total_amount)}</td>
                      <td className="table-td text-green-600">{fmt(o.amount_paid)}</td>
                    </tr>
                  ))}
                  {!data.sales.orders?.length && <tr><td colSpan={6} className="table-td text-center text-surface-400 py-8">No orders in period</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden space-y-3 p-3">
              {data.sales.orders?.map(o => (
                <div key={o.id} className="card p-4 space-y-2">
                  <div className="flex justify-between"><span className="font-mono text-xs text-primary-600">{o.order_number}</span><span className="font-bold">{fmt(o.total_amount)}</span></div>
                  <div className="font-semibold text-surface-800">{o.customer_name}</div>
                  <div className="flex gap-2"><span className="badge badge-gray text-xs">{o.status.replace(/_/g,' ')}</span><span className="text-xs text-surface-400">{fmtDate(o.order_date)}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workers Tab */}
      {tab === 'workers' && data.workers && !loading && (
        <div className="space-y-5">
          {data.workers.performance?.length > 0 && (
            <div className="card p-5">
              <h3 className="section-title mb-4">Worker Output</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.workers.performance} margin={{ left:-15, right:5 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="completed" name="Completed" fill="#2563eb" radius={[6,6,0,0]} maxBarSize={28} />
                  <Bar dataKey="pending"   name="Pending"   fill="#7c3aed" radius={[6,6,0,0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100"><h3 className="section-title">Performance Summary</h3></div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-50 border-b border-surface-100"><tr>
                  <th className="table-th">Worker</th><th className="table-th">Skill</th><th className="table-th">Total Jobs</th><th className="table-th">Completed</th><th className="table-th">Efficiency</th><th className="table-th">Earned</th>
                </tr></thead>
                <tbody className="divide-y divide-surface-100">
                  {data.workers.performance?.map((wk,i) => {
                    const eff = wk.total_jobs > 0 ? Math.round((wk.completed/wk.total_jobs)*100) : 0
                    return (
                      <tr key={i} className="hover:bg-surface-50">
                        <td className="table-td font-semibold">{wk.name}</td>
                        <td className="table-td"><span className="badge badge-gray">{wk.skill||'—'}</span></td>
                        <td className="table-td">{wk.total_jobs}</td>
                        <td className="table-td text-green-600 font-semibold">{wk.completed}</td>
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-surface-200 rounded-full h-1.5"><div className={`${eff>=75?'bg-green-500':eff>=50?'bg-amber-400':'bg-red-400'} rounded-full h-1.5`} style={{width:`${eff}%`}}/></div>
                            <span className="text-xs font-bold">{eff}%</span>
                          </div>
                        </td>
                        <td className="table-td font-semibold">{fmt(wk.total_earned)}</td>
                      </tr>
                    )
                  })}
                  {!data.workers.performance?.length && <tr><td colSpan={6} className="table-td text-center text-surface-400 py-8">No data for period</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden space-y-3 p-3">
              {data.workers.performance?.map((wk,i) => {
                const eff = wk.total_jobs > 0 ? Math.round((wk.completed/wk.total_jobs)*100) : 0
                return (
                  <div key={i} className="card p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{wk.name}</div>
                        <span className="badge badge-gray text-xs">{wk.skill||'—'}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary-600">{fmt(wk.total_earned)}</div>
                        <div className="text-xs text-surface-400">{wk.completed}/{wk.total_jobs} jobs</div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-surface-500">Efficiency</span><span className="font-bold">{eff}%</span></div>
                      <div className="bg-surface-200 rounded-full h-2"><div className={`${eff>=75?'bg-green-500':eff>=50?'bg-amber-400':'bg-red-400'} rounded-full h-2`} style={{width:`${eff}%`}}/></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
