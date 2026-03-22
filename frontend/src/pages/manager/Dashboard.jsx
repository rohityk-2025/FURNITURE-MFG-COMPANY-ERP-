import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import { fmt, fmtDate, StatusBadge } from '../../components/ui'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const THOUGHTS = [
  "Quality is never an accident; it is always the result of intelligent effort.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "The secret of getting ahead is getting started.",
  "Hard work beats talent when talent doesn't work hard.",
  "Build something people love. The rest will follow.",
  "Every expert was once a beginner. Keep going.",
  "Your work is going to fill a large part of your life. Make it count.",
]

const UNSPLASH = [
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80', // workshop
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80', // tools
  'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80', // wood
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', // furniture
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { text:'Good Morning', emoji:'🌅' }
  if (h < 17) return { text:'Good Afternoon', emoji:'☀️' }
  return { text:'Good Evening', emoji:'🌙' }
}

const COLORS = ['#2563eb','#7c3aed','#16a34a','#d97706','#dc2626']

export default function ManagerDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const greeting = getGreeting()
  const thought  = THOUGHTS[new Date().getDay() % THOUGHTS.length]
  const img      = UNSPLASH[new Date().getDay() % UNSPLASH.length]

  useEffect(() => {
    api.get('/dashboard/manager')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Build chart data from assignments
  const statusData = data ? [
    { name:'Assigned',   value: (data.recentAssignments||[]).filter(a=>a.status==='ASSIGNED').length,    fill:'#2563eb' },
    { name:'In Progress',value: (data.recentAssignments||[]).filter(a=>a.status==='IN_PROGRESS').length, fill:'#7c3aed' },
    { name:'Completed',  value: (data.recentAssignments||[]).filter(a=>a.status==='COMPLETED').length,   fill:'#16a34a' },
  ] : []

  const orderData = data ? [
    { name:'Active',      value: data.kpis?.activeOrders||0 },
    { name:'Pending',     value: data.kpis?.pendingOrders||0 },
    { name:'Production',  value: data.kpis?.inProduction||0 },
    { name:'Delivering',  value: data.kpis?.todaysDeliveries||0 },
  ] : []

  const C = ({ label, value, sub, color='#2563eb', onClick }) => (
    <div onClick={onClick} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px', cursor:onClick?'pointer':'default', transition:'all 0.15s', position:'relative', overflow:'hidden' }}
      onMouseEnter={e=>onClick&&(e.currentTarget.style.transform='translateY(-2px)',e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,0.12)')}
      onMouseLeave={e=>onClick&&(e.currentTarget.style.transform='none',e.currentTarget.style.boxShadow='none')}>
      <div style={{ position:'absolute', top:0, left:0, width:4, height:'100%', background:color, borderRadius:'14px 0 0 14px' }} />
      <div style={{ fontSize:26, fontWeight:900, color:color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:3 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{sub}</div>}
    </div>
  )

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {/* Greeting Banner */}
      <div style={{ background:'linear-gradient(135deg,#0f172a,#1e1b4b,#312e81)', borderRadius:18, padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, overflow:'hidden', position:'relative' }}>
        <div style={{ position:'absolute', top:-40, right:180, width:200, height:200, background:'rgba(99,102,241,0.15)', borderRadius:'50%' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#fff', lineHeight:1.2 }}>
            {greeting.emoji} {greeting.text}, {user?.name?.split(' ')[0]}!
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:5 }}>
            {new Date().toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'long' })}
          </div>
          <div style={{ marginTop:12, fontSize:12, color:'rgba(255,255,255,0.5)', fontStyle:'italic', maxWidth:360, lineHeight:1.6 }}>
            "{thought}"
          </div>
        </div>
        <div style={{ flexShrink:0, borderRadius:14, overflow:'hidden', width:120, height:90, position:'relative', zIndex:1 }}>
          <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.8 }} onError={e=>e.target.style.display='none'} />
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.2)' }} />
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12 }}>
        <C label="Completed Today" value={data?.kpis?.completedToday||0} color="#16a34a" onClick={()=>navigate('/manager/assign-work')} />
        <C label="Pending Work" value={data?.kpis?.pendingWork||0} color="#d97706" onClick={()=>navigate('/manager/assign-work')} />
        <C label="Active Orders" value={data?.kpis?.activeOrders||0} color="#2563eb" onClick={()=>navigate('/manager/orders')} />
        <C label="Today Deliveries" value={data?.kpis?.todaysDeliveries||0} color="#7c3aed" onClick={()=>navigate('/manager/orders')} />
      </div>

      {/* Charts Row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Work Status Bar Chart */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:16 }}>Work Assignments Status</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={statusData} margin={{ top:0, right:0, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'var(--text3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {statusData.map((entry,i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Pie */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Order Overview</div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <ResponsiveContainer width={140} height={160}>
              <PieChart>
                <Pie data={orderData.filter(d=>d.value>0)} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {orderData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', flexDirection:'column', gap:8, flex:1 }}>
              {orderData.map((d,i) => (
                <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:COLORS[i%COLORS.length], flexShrink:0 }} />
                  <span style={{ color:'var(--text2)', flex:1 }}>{d.name}</span>
                  <span style={{ fontWeight:700, color:'var(--text)' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Assignments */}
      {data?.recentAssignments?.length > 0 && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Pending Work Assignments</span>
            <button onClick={()=>navigate('/manager/assign-work')} style={{ fontSize:12, color:'var(--primary)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>View All →</button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>
                {['Worker','Product','Qty','Commission','Status','Due'].map(h=><th key={h} className="table-th">{h}</th>)}
              </tr></thead>
              <tbody>
                {data.recentAssignments.slice(0,6).map(a=>(
                  <tr key={a.id} className="table-row">
                    <td className="table-td" style={{ fontWeight:600 }}>{a.worker_name}</td>
                    <td className="table-td" style={{ color:'var(--text2)', fontSize:12 }}>{a.product_name_db||a.custom_product_name||'Custom'}</td>
                    <td className="table-td">{a.quantity}</td>
                    <td className="table-td" style={{ color:'var(--primary)', fontWeight:600 }}>{fmt(a.commission*a.quantity)}</td>
                    <td className="table-td"><StatusBadge status={a.status} /></td>
                    <td className="table-td" style={{ fontSize:11, color:'var(--text3)' }}>{fmtDate(a.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Today's Deliveries */}
      {data?.todayDeliveries?.length > 0 && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontWeight:700, fontSize:14, color:'var(--orange)' }}>🚚 Today's Deliveries</span>
          </div>
          <div style={{ padding:14, display:'flex', flexDirection:'column', gap:8 }}>
            {data.todayDeliveries.map(o=>(
              <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'var(--bg2)', borderRadius:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{o.customer_name}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{o.order_number}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700 }}>{fmt(o.total_amount)}</div>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
