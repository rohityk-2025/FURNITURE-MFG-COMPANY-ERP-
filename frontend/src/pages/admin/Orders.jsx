import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { Modal, SearchBar, LoadingPage, EmptyState, StatusBadge, fmt, fmtDate } from '../../components/ui'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderDetail, setOrderDetail] = useState(null)

  const load = () => api.get('/orders').then(r => setOrders(r.data)).catch(console.error).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openDetail = async (order) => {
    setSelectedOrder(order)
    const r = await api.get(`/orders/${order.id}`)
    setOrderDetail(r.data)
  }

  const filtered = orders.filter(o => {
    const matchSearch = o.customer_name?.toLowerCase().includes(search.toLowerCase()) || o.order_number?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || o.status === statusFilter
    return matchSearch && matchStatus
  })

  if (loading) return <LoadingPage />

  const STATUSES = ['', 'PENDING', 'IN_PRODUCTION', 'READY', 'YET_TO_DELIVER', 'DELIVERED', 'CANCELLED']

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Orders & Sales</h1>
        <p className="text-sm text-surface-400 mt-1">{orders.length} total orders</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', val: orders.length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Pending', val: orders.filter(o => ['PENDING','IN_PRODUCTION'].includes(o.status)).length, color: 'bg-amber-50 text-amber-700' },
          { label: 'Delivered', val: orders.filter(o => o.status === 'DELIVERED').length, color: 'bg-green-50 text-green-700' },
          { label: 'Unpaid', val: orders.filter(o => o.payment_status === 'UNPAID' && o.status !== 'CANCELLED').length, color: 'bg-red-50 text-red-600' },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <div className={`font-display text-2xl font-bold ${item.color.split(' ')[1]}`}>{item.val}</div>
            <div className="text-xs text-surface-500 uppercase tracking-wide mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="p-4 border-b border-surface-100 flex flex-col sm:flex-row gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search orders or customer..." />
          <select className="input sm:w-48 flex-shrink-0" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.slice(1).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} title="No orders found" desc="Orders will appear here once created by managers" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  <th className="table-th">Order</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Delivery</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Payment</th>
                  <th className="table-th">Total</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-surface-50 transition-colors">
                    <td className="table-td">
                      <span className="font-mono text-xs font-semibold text-primary-600">{o.order_number}</span>
                    </td>
                    <td className="table-td font-medium text-surface-900">{o.customer_name}</td>
                    <td className="table-td text-surface-400 text-xs">{fmtDate(o.order_date)}</td>
                    <td className="table-td text-surface-400 text-xs">{fmtDate(o.delivery_date)}</td>
                    <td className="table-td"><StatusBadge status={o.status} /></td>
                    <td className="table-td">
                      <div className="flex flex-col gap-0.5">
                        <StatusBadge status={o.payment_status} />
                        {o.payment_status === 'PARTIAL' && <span className="text-xs text-surface-400">{fmt(o.amount_paid)} paid</span>}
                      </div>
                    </td>
                    <td className="table-td font-semibold text-surface-900">{fmt(o.total_amount)}</td>
                    <td className="table-td">
                      <button onClick={() => openDetail(o)} className="btn-ghost p-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => { setSelectedOrder(null); setOrderDetail(null) }} title={`Order ${selectedOrder?.order_number}`} size="xl">
        {orderDetail ? (
          <div className="space-y-5">
            {/* Customer + Meta */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4">
                <p className="text-xs text-surface-400 uppercase tracking-wide mb-2">Customer</p>
                <p className="font-semibold text-surface-900">{orderDetail.order.customer_name}</p>
                <p className="text-sm text-surface-500">{orderDetail.order.customer_phone}</p>
                <p className="text-sm text-surface-500">{orderDetail.order.customer_address}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-surface-400 uppercase tracking-wide mb-2">Order Info</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-surface-500">Status</span><StatusBadge status={orderDetail.order.status} /></div>
                  <div className="flex justify-between text-sm"><span className="text-surface-500">Payment</span><StatusBadge status={orderDetail.order.payment_status} /></div>
                  <div className="flex justify-between text-sm"><span className="text-surface-500">Order Date</span><span className="font-medium">{fmtDate(orderDetail.order.order_date)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-surface-500">Delivery</span><span className="font-medium">{fmtDate(orderDetail.order.delivery_date)}</span></div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs text-surface-400 uppercase tracking-wide mb-2">Order Items</p>
              <div className="border border-surface-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-surface-50"><tr>
                    <th className="table-th">Product</th>
                    <th className="table-th">Qty</th>
                    <th className="table-th">Unit Price</th>
                    <th className="table-th">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-surface-100">
                    {orderDetail.items.map(item => (
                      <tr key={item.id}>
                        <td className="table-td font-medium">{item.custom_product_name || item.product_name_db || 'Custom Item'}</td>
                        <td className="table-td">{item.quantity}</td>
                        <td className="table-td">{fmt(item.unit_price)}</td>
                        <td className="table-td font-semibold">{fmt(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-surface-50 rounded-xl p-4 space-y-2">
              {[
                ['Subtotal', orderDetail.order.subtotal],
                ['Tax', orderDetail.order.tax],
                ['Delivery Charges', orderDetail.order.delivery_charges],
                ['Other Charges', orderDetail.order.other_charges],
                ['Discount', -orderDetail.order.discount],
              ].filter(([_, v]) => parseFloat(v) !== 0).map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-surface-500">{label}</span>
                  <span className={parseFloat(val) < 0 ? 'text-green-600' : ''}>{parseFloat(val) < 0 ? `- ${fmt(-val)}` : fmt(val)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t border-surface-200 pt-2 mt-2">
                <span>Total</span>
                <span className="text-primary-600 text-lg">{fmt(orderDetail.order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Amount Paid</span>
                <span className="text-green-600 font-semibold">{fmt(orderDetail.order.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Balance Due</span>
                <span className="text-red-500 font-semibold">{fmt(orderDetail.order.total_amount - orderDetail.order.amount_paid)}</span>
              </div>
            </div>
          </div>
        ) : <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}
      </Modal>
    </div>
  )
}
