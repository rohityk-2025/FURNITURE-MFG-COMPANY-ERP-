import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../utils/api'
import { Modal, LoadingPage, StatusBadge, fmt, fmtDate } from '../../components/ui'
import { useToast } from '../../components/ui'

const todayStr = () => new Date().toISOString().split('T')[0]
const emptyItem = { product_id: '', custom_product_name: '', quantity: 1, unit_price: '', notes: '' }
const emptyOrder = {
  customer_name: '', customer_phone: '', customer_email: '',
  customer_address: '', customer_gst: '',
  order_date: todayStr(), delivery_date: '', status: 'PENDING',
  tax: 0, delivery_charges: 0, other_charges: 0, discount: 0, notes: '',
  items: [{ ...emptyItem }]
}
const ORDER_STATUSES = ['PENDING','IN_PRODUCTION','READY','YET_TO_DELIVER','DELIVERED','CANCELLED']

export default function ManagerOrders() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [company, setCompany] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [detailModal, setDetailModal] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [form, setForm] = useState({ ...emptyOrder, order_date: todayStr() })
  const [editForm, setEditForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggRef = useRef(null)
  const searchTimer = useRef(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/orders')
      .then(r => setOrders(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    api.get('/products').then(r => setProducts(r.data)).catch(console.error)
    api.get('/company').then(r => setCompany(r.data || {})).catch(console.error)
    const handler = (e) => {
      if (suggRef.current && !suggRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [load])

  const searchCustomers = (q) => {
    clearTimeout(searchTimer.current)
    if (q.length < 2) { setCustomerSuggestions([]); setShowSuggestions(false); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await api.get('/customers/search', { params: { q } })
        setCustomerSuggestions(r.data)
        setShowSuggestions(r.data.length > 0)
      } catch { /* silent */ }
    }, 300)
  }

  const selectCustomer = (c) => {
    setForm(f => ({ ...f, customer_name: c.name, customer_phone: c.phone || '', customer_email: c.email || '', customer_address: c.address || '', customer_gst: c.gst_number || '' }))
    setShowSuggestions(false)
  }

  const handleProductSelect = (idx, pid, isEdit = false) => {
    const prod = products.find(p => p.id === parseInt(pid))
    const upd = f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], product_id: pid, custom_product_name: '', unit_price: prod ? String(prod.price) : '' }
      return { ...f, items }
    }
    isEdit ? setEditForm(upd) : setForm(upd)
  }

  const updItem = (idx, field, val, isEdit = false) => {
    const upd = f => { const items = [...f.items]; items[idx] = { ...items[idx], [field]: val }; return { ...f, items } }
    isEdit ? setEditForm(upd) : setForm(upd)
  }

  const addItem = (isEdit = false) => {
    const upd = f => ({ ...f, items: [...f.items, { ...emptyItem }] })
    isEdit ? setEditForm(upd) : setForm(upd)
  }

  const removeItem = (idx, isEdit = false) => {
    const upd = f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })
    isEdit ? setEditForm(upd) : setForm(upd)
  }

  const calcTotal = (f) => {
    const sub = f.items.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.unit_price || 0)), 0)
    return sub + parseFloat(f.tax || 0) + parseFloat(f.delivery_charges || 0) + parseFloat(f.other_charges || 0) - parseFloat(f.discount || 0)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await api.post('/orders', form)
      toast(`Order ${r.data.order_number} created`)
      setModal(false)
      setForm({ ...emptyOrder, order_date: todayStr() })
      load()
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const openEdit = async (order) => {
    try {
      const r = await api.get(`/orders/${order.id}`)
      const { order: o, items } = r.data
      setEditForm({
        id: o.id, order_number: o.order_number,
        customer_name: o.customer_name || '', customer_phone: o.customer_phone || '',
        customer_email: o.customer_email || '', customer_address: o.customer_address || '',
        order_date: o.order_date?.slice(0,10) || todayStr(),
        delivery_date: o.delivery_date?.slice(0,10) || '',
        status: o.status, payment_status: o.payment_status || 'UNPAID',
        amount_paid: o.amount_paid || 0,
        tax: o.tax || 0, delivery_charges: o.delivery_charges || 0,
        other_charges: o.other_charges || 0, discount: o.discount || 0,
        notes: o.notes || '',
        items: items.map(i => ({
          product_id: i.product_id ? String(i.product_id) : '',
          custom_product_name: i.custom_product_name || '',
          quantity: i.quantity,
          unit_price: String(i.unit_price),
          notes: i.notes || ''
        }))
      })
      setEditModal(true)
    } catch { toast('Failed to load order', 'error') }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/orders/${editForm.id}`, editForm)
      toast('Order updated')
      setEditModal(false)
      load()
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const openDetail = async (order) => {
    setDetailModal(order)
    setDetailData(null)
    try {
      const r = await api.get(`/orders/${order.id}`)
      setDetailData(r.data)
    } catch { toast('Failed to load details', 'error') }
  }

  const printInvoice = (order, items) => {
    const w = window.open('', '_blank')
    const co = company
    const subtotal = items.reduce((s, i) => s + parseFloat(i.total_price || 0), 0)
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${order.order_number}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;color:#1e293b;padding:40px;max-width:800px;margin:0 auto}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #e2e8f0;margin-bottom:28px}
      .co-name{font-size:22px;font-weight:800;color:#2563eb}
      .co-info{font-size:12px;color:#64748b;line-height:1.7;margin-top:4px}
      .inv-label{font-size:30px;font-weight:800;color:#e2e8f0;letter-spacing:2px}
      .inv-num{font-size:13px;color:#64748b;text-align:right;margin-top:4px}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
      .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px}
      .box h4{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700;margin-bottom:8px}
      .box p{font-size:13px;color:#334155;margin-bottom:2px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      thead tr{background:linear-gradient(135deg,#2563eb,#7c3aed)}
      th{color:#fff;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
      td{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px}
      tr:nth-child(even) td{background:#f8fafc}
      .totals{display:flex;justify-content:flex-end;margin-bottom:24px}
      .tot-box{width:260px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
      .tr{display:flex;justify-content:space-between;padding:8px 14px;font-size:13px;border-bottom:1px solid #f1f5f9}
      .tr:last-child{border:none;font-weight:800;font-size:15px;background:#eff6ff}
      .pay-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:20px}
      .pay-box h4{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700;margin-bottom:8px}
      .foot{text-align:center;color:#94a3b8;font-size:11px;padding-top:16px;border-top:1px solid #e2e8f0;margin-top:16px}
      @media print{body{padding:20px}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>
    <div class="hdr">
      <div>
        <div class="co-name">${co.company_name || 'WoodCraft Furniture'}</div>
        ${co.tagline ? `<div class="co-info" style="font-style:italic">${co.tagline}</div>` : ''}
        <div class="co-info">
          ${[co.address, [co.city,co.state,co.pincode].filter(Boolean).join(', ')].filter(Boolean).join('<br>')}
          ${co.phone ? `<br>📞 ${co.phone}` : ''}${co.email ? ` · ✉ ${co.email}` : ''}
          ${co.gst_number ? `<br>GST: <b>${co.gst_number}</b>` : ''}
        </div>
      </div>
      <div style="text-align:right">
        <div class="inv-label">INVOICE</div>
        <div class="inv-num">${order.order_number}</div>
        <div style="margin-top:6px;font-size:12px;color:#64748b">Status: <b>${order.status.replace(/_/g,' ')}</b></div>
      </div>
    </div>
    <div class="meta">
      <div class="box">
        <h4>Bill To</h4>
        <p><b>${order.customer_name}</b></p>
        ${order.customer_phone ? `<p>📞 ${order.customer_phone}</p>` : ''}
        ${order.customer_email ? `<p>✉ ${order.customer_email}</p>` : ''}
        ${order.customer_address ? `<p>📍 ${order.customer_address}</p>` : ''}
        ${order.gst_number ? `<p>GST: ${order.gst_number}</p>` : ''}
      </div>
      <div class="box">
        <h4>Invoice Details</h4>
        <p>Invoice #: <b>${order.order_number}</b></p>
        <p>Date: <b>${new Date(order.order_date).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</b></p>
        ${order.delivery_date ? `<p>Delivery: <b>${new Date(order.delivery_date).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</b></p>` : ''}
        <p>Payment: <b>${order.payment_status}</b></p>
      </div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>
        ${items.map((it,i) => `<tr><td>${i+1}</td><td><b>${it.custom_product_name || it.product_name_db || 'Item'}</b>${it.notes ? `<br><small style="color:#94a3b8">${it.notes}</small>` : ''}</td><td>${it.quantity}</td><td>₹${parseFloat(it.unit_price).toLocaleString('en-IN')}</td><td><b>₹${parseFloat(it.total_price).toLocaleString('en-IN')}</b></td></tr>`).join('')}
      </tbody>
    </table>
    <div class="totals"><div class="tot-box">
      <div class="tr"><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
      ${parseFloat(order.tax)>0 ? `<div class="tr"><span>Tax</span><span>₹${parseFloat(order.tax).toLocaleString('en-IN')}</span></div>` : ''}
      ${parseFloat(order.delivery_charges)>0 ? `<div class="tr"><span>Delivery</span><span>₹${parseFloat(order.delivery_charges).toLocaleString('en-IN')}</span></div>` : ''}
      ${parseFloat(order.other_charges)>0 ? `<div class="tr"><span>Other</span><span>₹${parseFloat(order.other_charges).toLocaleString('en-IN')}</span></div>` : ''}
      ${parseFloat(order.discount)>0 ? `<div class="tr" style="color:#16a34a"><span>Discount</span><span>- ₹${parseFloat(order.discount).toLocaleString('en-IN')}</span></div>` : ''}
      <div class="tr"><span>Grand Total</span><span style="color:#2563eb">₹${parseFloat(order.total_amount).toLocaleString('en-IN')}</span></div>
      <div class="tr" style="color:#16a34a"><span>Amount Paid</span><span>₹${parseFloat(order.amount_paid||0).toLocaleString('en-IN')}</span></div>
      <div class="tr" style="color:#dc2626"><span>Balance Due</span><span>₹${(parseFloat(order.total_amount)-parseFloat(order.amount_paid||0)).toLocaleString('en-IN')}</span></div>
    </div></div>
    ${(co.upi_id || co.bank_name) ? `<div class="pay-box">
      <h4>Payment Details</h4>
      ${co.upi_id ? `<p style="font-size:13px">UPI: <b>${co.upi_id}</b>${co.upi_phone ? ` · 📱 ${co.upi_phone}` : ''}</p>` : ''}
      ${co.bank_name ? `<p style="font-size:13px">Bank: <b>${co.bank_name}</b> · A/C: ${co.bank_account} · IFSC: ${co.bank_ifsc}</p>` : ''}
    </div>` : ''}
    ${order.notes ? `<div class="box" style="margin-bottom:20px"><h4>Notes</h4><p style="font-size:13px">${order.notes}</p></div>` : ''}
    ${co.invoice_terms ? `<div style="font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px"><b>Terms:</b> ${co.invoice_terms}</div>` : ''}
    <div class="foot">Generated on ${new Date().toLocaleString('en-IN')} · ${co.company_name || 'WoodCraft Furniture'}</div>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const filtered = orders.filter(o => {
    if (tab === 'active') return !['DELIVERED','CANCELLED'].includes(o.status)
    if (tab === 'delivered') return o.status === 'DELIVERED'
    if (tab === 'unpaid') return o.payment_status !== 'PAID' && o.status !== 'CANCELLED'
    return true
  })

  if (loading) return <LoadingPage />

  // Shared item editor component
  const ItemRow = ({ item, idx, isEdit }) => (
    <div className="bg-surface-50 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <select className="input text-sm flex-1" value={item.product_id}
          onChange={e => { if (e.target.value) handleProductSelect(idx, e.target.value, isEdit); else updItem(idx,'product_id','',isEdit) }}>
          <option value="">Custom product</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name} — {fmt(p.price)}</option>)}
        </select>
        {(isEdit ? editForm : form).items.length > 1 && (
          <button type="button" onClick={() => removeItem(idx, isEdit)}
            className="w-8 h-8 bg-red-50 text-red-400 hover:text-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            ✕
          </button>
        )}
      </div>
      {!item.product_id && (
        <input className="input text-sm" value={item.custom_product_name}
          onChange={e => updItem(idx,'custom_product_name',e.target.value,isEdit)} placeholder="Product name" />
      )}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-surface-400 mb-1 block">Qty</label>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => updItem(idx,'quantity',Math.max(1,item.quantity-1),isEdit)} className="w-7 h-7 bg-white border border-surface-200 rounded font-bold text-sm flex items-center justify-center">-</button>
            <input className="input text-center text-sm !px-1 !py-1.5" type="number" value={item.quantity} min={1}
              onChange={e => updItem(idx,'quantity',parseInt(e.target.value)||1,isEdit)} />
            <button type="button" onClick={() => updItem(idx,'quantity',item.quantity+1,isEdit)} className="w-7 h-7 bg-white border border-surface-200 rounded font-bold text-sm flex items-center justify-center">+</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-surface-400 mb-1 block">Unit Price ₹</label>
          <input className="input text-sm" type="number" value={item.unit_price} min={0}
            onChange={e => updItem(idx,'unit_price',e.target.value,isEdit)} placeholder="0" />
        </div>
        <div>
          <label className="text-xs text-surface-400 mb-1 block">Total</label>
          <div className="input bg-surface-100 text-sm font-semibold">
            {fmt((item.quantity||0)*(parseFloat(item.unit_price)||0))}
          </div>
        </div>
      </div>
    </div>
  )

  const OrderForm = ({ f, setF, onSubmit, isEdit = false }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Customer */}
      <div className="card p-4 space-y-3">
        <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wide">Customer</h4>
        <div className="relative" ref={!isEdit ? suggRef : null}>
          <label className="label">Customer Name *</label>
          <input className="input" value={f.customer_name} required placeholder="Type to search..."
            autoComplete="off"
            onChange={e => { setF(p=>({...p,customer_name:e.target.value})); if(!isEdit) searchCustomers(e.target.value) }} />
          {!isEdit && showSuggestions && customerSuggestions.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-surface-200 rounded-xl shadow-modal max-h-40 overflow-y-auto">
              {customerSuggestions.map(c => (
                <button key={c.id} type="button" onClick={() => selectCustomer(c)}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface-50 text-sm border-b border-surface-100 last:border-0">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-surface-400">{c.phone}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Phone</label><input className="input" value={f.customer_phone} onChange={e=>setF(p=>({...p,customer_phone:e.target.value}))} placeholder="9876543210" /></div>
          <div><label className="label">GST</label><input className="input" value={f.customer_gst||''} onChange={e=>setF(p=>({...p,customer_gst:e.target.value}))} placeholder="GST no." /></div>
          <div className="col-span-2"><label className="label">Address</label><input className="input" value={f.customer_address} onChange={e=>setF(p=>({...p,customer_address:e.target.value}))} placeholder="Delivery address" /></div>
        </div>
      </div>

      {/* Order info */}
      <div className="card p-4 space-y-3">
        <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wide">Order Details</h4>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Order Date *</label><input className="input" type="date" value={f.order_date} onChange={e=>setF(p=>({...p,order_date:e.target.value}))} required /></div>
          <div><label className="label">Delivery Date</label><input className="input" type="date" value={f.delivery_date} onChange={e=>setF(p=>({...p,delivery_date:e.target.value}))} /></div>
          <div><label className="label">Status</label>
            <select className="input" value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))}>
              {ORDER_STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          {isEdit && <>
            <div><label className="label">Payment Status</label>
              <select className="input" value={f.payment_status||'UNPAID'} onChange={e=>setF(p=>({...p,payment_status:e.target.value}))}>
                {['UNPAID','PARTIAL','PAID'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {f.payment_status !== 'UNPAID' && <div><label className="label">Amount Paid ₹</label><input className="input" type="number" value={f.amount_paid||0} onChange={e=>setF(p=>({...p,amount_paid:e.target.value}))} min={0} /></div>}
          </>}
        </div>
      </div>

      {/* Items */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wide">Items</h4>
          <button type="button" onClick={() => addItem(isEdit)} className="text-xs text-primary-500 font-semibold hover:text-primary-700">+ Add Item</button>
        </div>
        <div className="space-y-3">
          {f.items.map((item, idx) => <ItemRow key={idx} item={item} idx={idx} isEdit={isEdit} />)}
        </div>
        {/* Charges */}
        <div className="border-t border-surface-200 pt-3 grid grid-cols-2 gap-3">
          {[['Tax','tax'],['Delivery','delivery_charges'],['Other','other_charges'],['Discount','discount']].map(([label,key])=>(
            <div key={key}><label className="text-xs text-surface-400 mb-1 block">{label} ₹</label>
              <input className="input text-sm" type="number" value={f[key]||0} onChange={e=>setF(p=>({...p,[key]:e.target.value}))} min={0} /></div>
          ))}
        </div>
        <div className="flex justify-between items-center bg-primary-50 rounded-xl px-4 py-3">
          <span className="font-bold text-surface-900">Total</span>
          <span className="font-bold text-xl text-primary-600">{fmt(calcTotal(f))}</span>
        </div>
      </div>

      <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="Order notes..." /></div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => isEdit ? setEditModal(false) : setModal(false)} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : isEdit ? 'Update Order' : 'Create Order'}</button>
      </div>
    </form>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div><h1 className="page-title">Orders</h1><p className="text-sm text-surface-400 mt-1">{orders.length} total orders</p></div>
        <button onClick={() => { setForm({...emptyOrder,order_date:todayStr()}); setModal(true) }} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New Order
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit overflow-x-auto">
        {[['all','All'],['active','Active'],['delivered','Delivered'],['unpaid','Unpaid']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${tab===id?'bg-white text-primary-600 shadow-card':'text-surface-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Orders table - desktop */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-surface-400">
            <p className="font-semibold">No orders found</p>
            <button onClick={() => setModal(true)} className="btn-primary mt-4 mx-auto">Create First Order</button>
          </div>
        ) : <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  {['Order #','Customer','Date','Delivery','Status','Payment','Total',''].map(h=><th key={h} className="table-th">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-surface-50 transition-colors">
                    <td className="table-td font-mono text-xs text-primary-600 font-semibold">{o.order_number}</td>
                    <td className="table-td font-semibold text-surface-900">{o.customer_name}</td>
                    <td className="table-td text-xs text-surface-400">{fmtDate(o.order_date)}</td>
                    <td className="table-td text-xs text-surface-400">{fmtDate(o.delivery_date)}</td>
                    <td className="table-td"><StatusBadge status={o.status} /></td>
                    <td className="table-td"><StatusBadge status={o.payment_status} /></td>
                    <td className="table-td font-semibold">{fmt(o.total_amount)}</td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button onClick={()=>openDetail(o)} className="btn-ghost !min-h-0 p-1.5" title="View">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                        <button onClick={()=>openEdit(o)} className="btn-ghost !min-h-0 p-1.5" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 p-3">
            {filtered.map(o => (
              <div key={o.id} className="card p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs text-primary-600 font-semibold">{o.order_number}</span>
                    <div className="font-semibold text-surface-900 mt-0.5">{o.customer_name}</div>
                    <div className="text-xs text-surface-400 mt-0.5">{fmtDate(o.order_date)}{o.delivery_date ? ` → ${fmtDate(o.delivery_date)}` : ''}</div>
                  </div>
                  <div className="font-bold text-surface-900">{fmt(o.total_amount)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2"><StatusBadge status={o.status} /><StatusBadge status={o.payment_status} /></div>
                  <div className="flex gap-2">
                    <button onClick={()=>openDetail(o)} className="btn-secondary !py-1.5 !px-3 text-xs">View</button>
                    <button onClick={()=>openEdit(o)} className="btn-primary !py-1.5 !px-3 text-xs">Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>}
      </div>

      {/* Create Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Create New Order" size="2xl">
        <OrderForm f={form} setF={setForm} onSubmit={handleCreate} />
      </Modal>

      {/* Edit Modal */}
      {editForm && (
        <Modal open={editModal} onClose={()=>setEditModal(false)} title={`Edit Order — ${editForm.order_number}`} size="2xl">
          <OrderForm f={editForm} setF={setEditForm} onSubmit={handleUpdate} isEdit />
        </Modal>
      )}

      {/* Detail + Invoice Modal */}
      <Modal open={!!detailModal} onClose={()=>{setDetailModal(null);setDetailData(null)}} title={`Order ${detailModal?.order_number}`} size="xl">
        {!detailData ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-50 rounded-xl p-4">
                <p className="label">Customer</p>
                <p className="font-semibold text-surface-900">{detailData.order.customer_name}</p>
                <p className="text-sm text-surface-500">{detailData.order.customer_phone}</p>
                <p className="text-sm text-surface-500">{detailData.order.customer_address}</p>
              </div>
              <div className="bg-surface-50 rounded-xl p-4 space-y-1.5">
                {[['Status',<StatusBadge status={detailData.order.status}/>],['Payment',<StatusBadge status={detailData.order.payment_status}/>],['Order Date',fmtDate(detailData.order.order_date)],['Delivery',fmtDate(detailData.order.delivery_date)]].map(([l,v])=>(
                  <div key={l} className="flex justify-between text-sm"><span className="text-surface-400">{l}</span><span className="font-medium">{v}</span></div>
                ))}
              </div>
            </div>
            <div className="border border-surface-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface-50"><tr><th className="table-th">Item</th><th className="table-th">Qty</th><th className="table-th">Price</th><th className="table-th">Total</th></tr></thead>
                <tbody className="divide-y divide-surface-100">
                  {detailData.items.map(i=>(
                    <tr key={i.id}><td className="table-td font-medium">{i.custom_product_name||i.product_name_db||'Item'}</td><td className="table-td">{i.quantity}</td><td className="table-td">{fmt(i.unit_price)}</td><td className="table-td font-semibold">{fmt(i.total_price)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-surface-50 rounded-xl p-4 space-y-2">
              {[['Subtotal',detailData.order.subtotal],['Tax',detailData.order.tax],['Delivery',detailData.order.delivery_charges],['Discount',-detailData.order.discount]].filter(([,v])=>parseFloat(v)!==0).map(([l,v])=>(
                <div key={l} className="flex justify-between text-sm"><span className="text-surface-500">{l}</span><span className={parseFloat(v)<0?'text-green-600':''}>{parseFloat(v)<0?`- ${fmt(-v)}`:fmt(v)}</span></div>
              ))}
              <div className="flex justify-between font-bold text-lg border-t border-surface-200 pt-2"><span>Total</span><span className="text-primary-600">{fmt(detailData.order.total_amount)}</span></div>
              <div className="flex justify-between text-sm text-green-600"><span>Paid</span><span>{fmt(detailData.order.amount_paid)}</span></div>
              <div className="flex justify-between text-sm text-red-500"><span>Balance</span><span>{fmt(detailData.order.total_amount - detailData.order.amount_paid)}</span></div>
            </div>
            <button onClick={()=>printInvoice(detailData.order, detailData.items)} className="btn-secondary w-full">
              🖨 Print / Download Invoice
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
