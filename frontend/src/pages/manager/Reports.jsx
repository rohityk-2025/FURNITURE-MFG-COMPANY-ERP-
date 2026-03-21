import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts'
import api from '../../utils/api'
import { LoadingPage, PageHeader, fmt, fmtDate } from '../../components/ui'

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return <div className="bg-surface-900 text-white px-3 py-2 rounded-xl text-xs shadow-modal"><p className="font-semibold mb-1">{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color}}>{p.name}: {p.value>100?fmt(p.value):p.value}</p>)}</div>
}

export default function ManagerReports() {
  const [salesData, setSalesData] = useState(null)
  const [workerData, setWorkerData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('weekly')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const getRange = useCallback(() => {
    const now = new Date(), f = d => d.toISOString().split('T')[0]
    if (period === 'daily')   return { from: f(now), to: f(now) }
    if (period === 'weekly')  { const s = new Date(now); s.setDate(now.getDate()-7); return { from: f(s), to: f(now) } }
    if (period === 'monthly') return { from: f(new Date(now.getFullYear(), now.getMonth(), 1)), to: f(now) }
    if (period === 'custom')  return { from: customFrom, to: customTo }
    return { from: f(now), to: f(now) }
  }, [period, customFrom, customTo])

  const load = useCallback(async () => {
    const range = getRange()
    if (period === 'custom' && (!customFrom || !customTo)) return
    setLoading(true)
    try {
      const [s, w] = await Promise.all([
        api.get('/reports/sales', { params: range }),
        api.get('/reports/workers', { params: range }),
      ])
      setSalesData(s.data); setWorkerData(w.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [getRange, period, customFrom, customTo])

  useEffect(() => { load() }, [load])

  const exportPDF = () => {
    const range = getRange()
    const w = window.open('', '_blank')
    const totalSales = salesData?.orders?.reduce((s,o)=>s+parseFloat(o.total_amount||0),0)||0
    w.document.write(`<!DOCTYPE html><html><head><title>Report</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b;max-width:800px;margin:0 auto}h1{color:#2563eb}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#f1f5f9;text-align:left;padding:8px 12px;font-size:11px;text-transform:uppercase;color:#64748b}td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px}</style>
    </head><body>
    <h1>Daily/Weekly Report</h1>
    <p style="color:#64748b">Period: ${range.from} → ${range.to}</p>
    <p><strong>Total Sales:</strong> ₹${Number(totalSales).toLocaleString('en-IN')} · <strong>Orders:</strong> ${salesData?.orders?.length||0}</p>
    <table><thead><tr><th>Order #</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead><tbody>
    ${(salesData?.orders||[]).map(o=>`<tr><td>${o.order_number}</td><td>${o.customer_name}</td><td>${o.status}</td><td>₹${Number(o.total_amount).toLocaleString('en-IN')}</td></tr>`).join('')}
    </tbody></table></body></html>`)
    w.document.close(); setTimeout(()=>w.print(),600)
  }

  const totalSales = salesData?.orders?.reduce((s,o)=>s+parseFloat(o.total_amount||0),0)||0
  const totalOrders = salesData?.orders?.length||0
  const completedJobs = workerData?.performance?.reduce((s,w)=>s+parseInt(w.completed||0),0)||0

  if (loading && !salesData) return <LoadingPage />

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Reports" subtitle="Daily, weekly and monthly summary"
        action={<button onClick={exportPDF} className="btn-secondary"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Download PDF</button>}
      />

      {/* Period selector */}
      <div className="flex flex-wrap gap-2 items-center">
        {[['daily','Today'],['weekly','This Week'],['monthly','This Month'],['custom','Custom']].map(([id,label])=>(
          <button key={id} onClick={()=>setPeriod(id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all min-h-[40px] ${period===id?'bg-primary-500 text-white shadow-blue':'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'}`}>
            {label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex gap-2 items-center flex-wrap">
            <input type="date" className="input py-2 text-sm" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} />
            <span className="text-surface-400">→</span>
            <input type="date" className="input py-2 text-sm" value={customTo} onChange={e=>setCustomTo(e.target.value)} />
            <button onClick={load} className="btn-primary py-2 px-4 text-sm">Apply</button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders',    val: totalOrders,       color: 'text-primary-600',   bg: 'bg-primary-50' },
          { label: 'Sales Value',     val: fmt(totalSales),   color: 'text-green-600',     bg: 'bg-green-50' },
          { label: 'Received',        val: fmt(salesData?.orders?.reduce((s,o)=>s+parseFloat(o.amount_paid||0),0)||0), color: 'text-secondary-600', bg: 'bg-secondary-50' },
          { label: 'Jobs Completed',  val: completedJobs,     color: 'text-amber-600',     bg: 'bg-amber-50' },
        ].map(c => (
          <div key={c.label} className={`card p-4 ${c.bg} border-transparent`}>
            <div className={`text-2xl font-bold ${c.color}`}>{c.val}</div>
            <div className="text-xs text-surface-500 uppercase tracking-wide mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && (
        <div className="grid lg:grid-cols-2 gap-4">
          {workerData?.performance?.length > 0 && (
            <div className="card p-5">
              <h3 className="section-title mb-4">Worker Output</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={workerData.performance} margin={{left:-15,right:5}} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{fontSize:12,paddingTop:8}} />
                  <Bar dataKey="completed" name="Completed" fill="#2563eb" radius={[5,5,0,0]} maxBarSize={28} />
                  <Bar dataKey="pending"   name="Pending"   fill="#7c3aed" radius={[5,5,0,0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {salesData?.productSales?.length > 0 && (
            <div className="card p-5">
              <h3 className="section-title mb-4">Top Products</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={salesData.productSales.slice(0,6)} layout="vertical" margin={{left:0,right:20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                  <YAxis dataKey="product_name" type="category" width={90} tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="total_revenue" name="Revenue" fill="#2563eb" radius={[0,5,5,0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {!loading && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100"><h3 className="section-title">Orders Summary</h3></div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100"><tr>
                <th className="table-th">Order #</th><th className="table-th">Customer</th><th className="table-th">Date</th><th className="table-th">Status</th><th className="table-th">Total</th><th className="table-th">Received</th>
              </tr></thead>
              <tbody className="divide-y divide-surface-100">
                {salesData?.orders?.map(o=>(
                  <tr key={o.id} className="hover:bg-surface-50">
                    <td className="table-td font-mono text-xs text-primary-600">{o.order_number}</td>
                    <td className="table-td font-medium">{o.customer_name}</td>
                    <td className="table-td text-xs text-surface-400">{fmtDate(o.order_date)}</td>
                    <td className="table-td"><span className="badge badge-gray text-xs">{o.status.replace(/_/g,' ')}</span></td>
                    <td className="table-td font-semibold">{fmt(o.total_amount)}</td>
                    <td className="table-td text-green-600">{fmt(o.amount_paid)}</td>
                  </tr>
                ))}
                {!salesData?.orders?.length && <tr><td colSpan={6} className="table-td text-center text-surface-400 py-8">No orders in this period</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden space-y-3 p-3">
            {salesData?.orders?.map(o=>(
              <div key={o.id} className="card p-4 space-y-2">
                <div className="flex justify-between"><span className="font-mono text-xs text-primary-600">{o.order_number}</span><span className="font-bold">{fmt(o.total_amount)}</span></div>
                <div className="font-semibold">{o.customer_name}</div>
                <div className="flex gap-2"><span className="badge badge-gray text-xs">{o.status.replace(/_/g,' ')}</span><span className="text-xs text-surface-400">{fmtDate(o.order_date)}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
