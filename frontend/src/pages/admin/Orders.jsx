import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { Modal, SearchBar, LoadingPage, EmptyState, StatusBadge, fmt, fmtDate } from '../../components/ui'
import { generateInvoice } from '../../utils/invoice'

const IC = ({ d, cls='w-4 h-4' }) => <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d}/></svg>
const STATUSES = ['', 'PENDING', 'IN_PRODUCTION', 'READY', 'YET_TO_DELIVER', 'DELIVERED', 'CANCELLED']
const today = () => new Date().toISOString().split('T')[0]
const defaultMonthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [period, setPeriod] = useState('all')
  const [customFrom, setCustomFrom] = useState(defaultMonthStart())
  const [customTo, setCustomTo] = useState(today())
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderDetail, setOrderDetail] = useState(null)
  const [company, setCompany] = useState({})

  const load = () => {
    setLoading(true)
    const params = {}
    if (period !== 'all' && period !== 'custom') {
      const now = new Date()
      if (period === 'weekly') {
        const d = new Date(now)
        const day = d.getDay()
        const diff = day === 0 ? 6 : day - 1
        d.setDate(d.getDate() - diff)
        params.from = d.toISOString().split('T')[0]
        params.to = now.toISOString().split('T')[0]
      }
      if (period === 'monthly') { params.from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; params.to = now.toISOString().split('T')[0] }
      if (period === '6months') { const d = new Date(); d.setMonth(d.getMonth()-6); params.from = d.toISOString().split('T')[0]; params.to = now.toISOString().split('T')[0] }
    }
    if (period === 'custom') {
      if (customFrom) params.from = customFrom
      if (customTo) params.to = customTo
    }
    api.get('/orders', { params }).then(r => setOrders(r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [period, customFrom, customTo])
  useEffect(() => { api.get('/company').then(r => setCompany(r.data||{})).catch(()=>{}) }, [])

  const openDetail = async (order) => {
    setSelectedOrder(order); setOrderDetail(null)
    const r = await api.get(`/orders/${order.id}`)
    setOrderDetail(r.data)
  }

  const printInvoice = (od) => {
    const html = generateInvoice(od.order, od.items, company)
    const w = window.open('', '_blank')
    w.document.write(html); w.document.close()
    setTimeout(() => w.print(), 600)
  }

  const exportExcel = () => {
    const totalRevenue = filtered.reduce((s,o) => s + parseFloat(o.total_amount||0), 0)
    const totalCollected = filtered.reduce((s,o) => s + parseFloat(o.amount_paid||0), 0)
    const totalDue = totalRevenue - totalCollected
    const rows = [
      ['S.No.','Order #','Customer Name','Phone','Email','Customer Address','GST Number',
       'Order Date','Delivery Date','Status','Payment Status','Payment Mode',
       'Subtotal','CGST','SGST','IGST','Delivery Charges','Other Charges','Discount',
       'Grand Total','Amount Paid','Balance Due','Transport','Vehicle No.','LR No.','Notes'],
    ]
    filtered.forEach((o, index) => rows.push([
      index + 1,
      o.order_number,
      o.customer_name || '',
      o.customer_phone || '',
      o.customer_email || '',
      o.customer_address || '',
      o.gst_number || o.customer_gst || '',
      o.order_date?.split('T')[0] || '',
      o.delivery_date?.split('T')[0] || '',
      o.status,
      o.payment_status,
      o.payment_mode || 'CASH',
      parseFloat(o.subtotal||0).toFixed(2),
      parseFloat(o.cgst||0).toFixed(2),
      parseFloat(o.sgst||0).toFixed(2),
      parseFloat(o.igst||0).toFixed(2),
      parseFloat(o.delivery_charges||0).toFixed(2),
      parseFloat(o.other_charges||0).toFixed(2),
      parseFloat(o.discount||0).toFixed(2),
      parseFloat(o.total_amount||0).toFixed(2),
      parseFloat(o.amount_paid||0).toFixed(2),
      (parseFloat(o.total_amount||0) - parseFloat(o.amount_paid||0)).toFixed(2),
      o.transport_name || '',
      o.vehicle_number || '',
      o.lr_number || '',
      o.notes || '',
    ]))
    // Summary rows
    rows.push([])
    rows.push(['SUMMARY','','','','','','','','','','','','','','','','','','',
      'TOTAL REVENUE','COLLECTED','BALANCE DUE'])
    rows.push(['','','','','','','','','','','','','','','','','','','',
      totalRevenue.toFixed(2), totalCollected.toFixed(2), totalDue.toFixed(2)])

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `orders-detailed-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const w = window.open('', '_blank')
    const total = filtered.reduce((s,o) => s + parseFloat(o.total_amount||0), 0)
    w.document.write(`<!DOCTYPE html><html><head><title>Orders</title>
    <style>body{font-family:Arial;padding:32px;color:#1e293b;max-width:1000px;margin:0 auto}
    h1{font-size:20px;color:#2563eb}table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#f1f5f9;text-align:left;padding:7px 10px;font-size:10px;text-transform:uppercase;color:#64748b}
    td{padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:11px}
    .total{font-size:14px;font-weight:bold;text-align:right;margin-top:12px}
    @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
    <h1>Orders Report</h1>
    <p style="color:#64748b;font-size:12px;margin-bottom:8px">Generated: ${new Date().toLocaleString('en-IN')} | ${filtered.length} orders</p>
    <table><thead><tr><th>S.No.</th><th>Order #</th><th>Customer</th><th>Date</th><th>Delivery</th><th>Status</th><th>Payment</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead>
    <tbody>${filtered.map((o, index) => `<tr>
      <td>${index + 1}</td><td><b>${o.order_number}</b></td><td>${o.customer_name}</td>
      <td>${o.order_date?.split('T')[0] || ''}</td><td>${o.delivery_date?.split('T')[0] || '-'}</td>
      <td>${o.status.replace(/_/g,' ')}</td><td>${o.payment_status}</td>
      <td>Rs. ${Number(o.total_amount).toLocaleString('en-IN')}</td>
      <td>Rs. ${Number(o.amount_paid).toLocaleString('en-IN')}</td>
      <td>Rs. ${Number(o.total_amount - o.amount_paid).toLocaleString('en-IN')}</td>
    </tr>`).join('')}</tbody></table>
    <div class="total">Total Revenue: Rs. ${total.toLocaleString('en-IN')}</div>
    </body></html>`)
    w.document.close(); setTimeout(() => w.print(), 500)
  }

  const filtered = orders.filter(o => {
    const ms = search.toLowerCase()
    const matchSearch = !ms || o.customer_name?.toLowerCase().includes(ms) || o.order_number?.toLowerCase().includes(ms)
    const matchStatus = !statusFilter || o.status === statusFilter
    return matchSearch && matchStatus
  })

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Orders & Sales</h1>
          <p className="text-xs text-surface-400 mt-0.5">{orders.length} total orders</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportExcel} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-sm font-semibold transition-colors"><IC d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/> Download Excel</button>
          <button onClick={exportPDF} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-sm font-semibold transition-colors"><IC d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/> Download PDF</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'Total Orders', val:orders.length, color:'text-primary-600', bg:'bg-primary-50 dark:bg-primary-900/20' },
          { label:'Pending', val:orders.filter(o=>['PENDING','IN_PRODUCTION'].includes(o.status)).length, color:'text-amber-600', bg:'bg-amber-50 dark:bg-amber-900/20' },
          { label:'Delivered', val:orders.filter(o=>o.status==='DELIVERED').length, color:'text-green-600', bg:'bg-green-50 dark:bg-green-900/20' },
          { label:'Unpaid', val:orders.filter(o=>o.payment_status==='UNPAID'&&o.status!=='CANCELLED').length, color:'text-red-600', bg:'bg-red-50 dark:bg-red-900/20' },
        ].map(item => (
          <div key={item.label} className={`card p-4 ${item.bg} border-transparent`}>
            <div className={`text-xl font-bold ${item.color}`}>{item.val}</div>
            <div className="text-xs text-surface-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {[['all','All'],['weekly','This Week'],['monthly','This Month'],['6months','6 Months'],['custom','Custom']].map(([id,label]) => (
          <button key={id} onClick={() => setPeriod(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold min-h-[34px] border transition-all
              ${period===id?'bg-primary-500 text-white border-primary-500':'bg-white dark:bg-gray-800 border-surface-200 dark:border-gray-700 text-surface-600 dark:text-gray-400 hover:bg-surface-50'}`}>
            {label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-surface-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm">
            <label className="min-w-[170px] flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400 mb-1.5">From</span>
              <input type="date" className="input h-11 text-sm" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            </label>
            <label className="min-w-[170px] flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400 mb-1.5">To</span>
              <input type="date" className="input h-11 text-sm" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </label>
            <button
              type="button"
              onClick={() => { setCustomFrom(defaultMonthStart()); setCustomTo(today()) }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100"
            >
              This Month
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="p-3 border-b border-surface-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search orders or customer..." />
          <select className="input sm:w-44 flex-shrink-0" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.slice(1).map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<IC d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" cls="w-6 h-6"/>}
            title="No orders found" desc="Orders will appear here once created" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 dark:bg-gray-800/50 border-b border-surface-100 dark:border-gray-800">
                <tr>{['S.No.','Order','Customer','Date','Delivery','Status','Payment','Total','Pending',''].map(h=><th key={h} className="table-th">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                {filtered.map((o, index) => (
                  <tr key={o.id} className="table-row">
                    <td className="table-td text-xs font-semibold text-surface-500">{index + 1}</td>
                    <td className="table-td font-mono text-xs text-primary-600 font-semibold">{o.order_number}</td>
                    <td className="table-td font-medium text-sm text-surface-900 dark:text-gray-100">{o.customer_name}</td>
                    <td className="table-td text-xs text-surface-400">{fmtDate(o.order_date)}</td>
                    <td className="table-td text-xs text-surface-400">{fmtDate(o.delivery_date)}</td>
                    <td className="table-td"><StatusBadge status={o.status} /></td>
                    <td className="table-td">
                      <StatusBadge status={o.payment_status} />
                      {o.payment_status === 'PARTIAL' && <div className="text-xs text-surface-400 mt-0.5">{fmt(o.amount_paid)} paid</div>}
                    </td>
                    <td className="table-td font-semibold text-sm">{fmt(o.total_amount)}</td>
                    <td className="table-td">{parseFloat(o.amount_paid||0) > 0 && parseFloat(o.total_amount) > parseFloat(o.amount_paid||0) ? <span style={{color:'var(--red)',fontWeight:700,fontSize:13}}>{fmt(parseFloat(o.total_amount)-parseFloat(o.amount_paid||0))}</span> : <span className="text-green-600 text-xs font-semibold">Clear</span>}</td>
                    <td className="table-td">
                      <button onClick={() => openDetail(o)} className="btn-ghost p-1.5">
                        <IC d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => { setSelectedOrder(null); setOrderDetail(null) }}
        title={`Order ${selectedOrder?.order_number}`} size="xl">
        {orderDetail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4">
                <p className="text-xs text-surface-400 uppercase tracking-wide mb-2">Customer</p>
                <p className="font-semibold text-surface-900 dark:text-gray-100">{orderDetail.order.customer_name}</p>
                <p className="text-sm text-surface-500">{orderDetail.order.customer_phone}</p>
                <p className="text-sm text-surface-500">{orderDetail.order.customer_address}</p>
                {orderDetail.order.gst_number && <p className="text-xs text-surface-400 mt-1">GST: {orderDetail.order.gst_number}</p>}
              </div>
              <div className="card p-4">
                <p className="text-xs text-surface-400 uppercase tracking-wide mb-2">Order Info</p>
                <div className="space-y-1.5">
                  {[
                    ['Status', <StatusBadge status={orderDetail.order.status}/>],
                    ['Payment', <StatusBadge status={orderDetail.order.payment_status}/>],
                    ['Order Date', fmtDate(orderDetail.order.order_date)],
                    ['Delivery', fmtDate(orderDetail.order.delivery_date)],
                  ].map(([l,v]) => (
                    <div key={l} className="flex justify-between text-sm">
                      <span className="text-surface-400">{l}</span><span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border border-surface-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface-50 dark:bg-gray-800"><tr>
                  {['Product','Qty','Unit Price','Total'].map(h=><th key={h} className="table-th">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                  {orderDetail.items.map(item => (
                    <tr key={item.id} className="table-row">
                      <td className="table-td font-medium text-sm">{item.custom_product_name||item.product_name_db||'Item'}</td>
                      <td className="table-td text-sm">{item.quantity}</td>
                      <td className="table-td text-sm">{fmt(item.unit_price)}</td>
                      <td className="table-td font-semibold text-sm">{fmt(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-surface-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
              {[
                ['Subtotal', orderDetail.order.subtotal],
                ['Tax', orderDetail.order.tax],
                ['Delivery', orderDetail.order.delivery_charges],
                ['Other', orderDetail.order.other_charges],
                ['Discount', -orderDetail.order.discount],
              ].filter(([,v]) => parseFloat(v||0) !== 0).map(([l,v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-surface-400">{l}</span>
                  <span className={parseFloat(v)<0?'text-green-600':''}>{parseFloat(v)<0?`- ${fmt(-v)}`:fmt(v)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t border-surface-200 dark:border-gray-700 pt-2">
                <span>Total</span><span className="text-primary-600">{fmt(orderDetail.order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm"><span className="text-surface-400">Paid</span><span className="text-green-600 font-semibold">{fmt(orderDetail.order.amount_paid)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-surface-400">Balance</span><span className="text-red-500 font-semibold">{fmt(orderDetail.order.total_amount - orderDetail.order.amount_paid)}</span></div>
            </div>
            <button onClick={() => printInvoice(orderDetail)} className="btn-secondary w-full justify-center">
              <IC d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
              Print Invoice (GST Format)
            </button>
          </div>
        ) : <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>}
      </Modal>
    </div>
  )
}


