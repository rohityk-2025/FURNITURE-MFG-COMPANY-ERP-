import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../utils/api'
import { Modal, LoadingPage, StatusBadge, fmt, fmtDate, useToast } from '../../components/ui'
import { generateInvoice } from '../../utils/invoice'

const todayStr = () => new Date().toISOString().split('T')[0]
const emptyItem = { product_id:'', custom_product_name:'', quantity:1, unit_price:'', unit:'Pcs.', cgst_pct:9, sgst_pct:9, igst_pct:0, hsn_code:'', notes:'' }
const emptyOrder = { customer_name:'', customer_phone:'', customer_email:'', customer_address:'', gst_number:'', order_date:todayStr(), delivery_date:'', status:'PENDING', payment_status:'UNPAID', amount_paid:0, delivery_charges:0, other_charges:0, discount:0, payment_mode:'CASH', lr_number:'', transport_name:'', vehicle_number:'', notes:'', items:[{ ...emptyItem }] }
const STATUSES = ['PENDING','IN_PRODUCTION','READY','YET_TO_DELIVER','DELIVERED','CANCELLED']
const PAY_MODES = ['CASH','UPI','NEFT','CARD','CHEQUE','OTHER']

const inputStyle = { width:'100%', padding:'9px 12px', background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:13, fontFamily:'inherit', outline:'none', minHeight:38 }
const labelStyle = { display:'block', fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }
const sectionStyle = { background:'var(--bg2)', borderRadius:12, padding:14, display:'flex', flexDirection:'column', gap:12 }
const sectionTitleStyle = { fontSize:11, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }
const qtyButtonStyle = { width:30, height:30, border:'1px solid var(--border)', borderRadius:8, background:'var(--card)', color:'var(--text)', fontWeight:800, fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }

const num = (v) => Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0
const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100
const itemSubtotal = (item) => round2(num(item.quantity) * num(item.unit_price))

function calcTotals(form) {
  const items = Array.isArray(form?.items) ? form.items : []
  const sub = round2(items.reduce((s, item) => s + itemSubtotal(item), 0))
  const discountAmount = Math.min(Math.max(num(form?.discount), 0), sub)
  const taxableSubtotal = round2(sub - discountAmount)
  let remainingDiscount = discountAmount
  let cgstT = 0, sgstT = 0, igstT = 0

  items.forEach((item, index) => {
    const lineSub = itemSubtotal(item)
    const lineDiscount = sub > 0 ? (index === items.length - 1 ? remainingDiscount : round2(discountAmount * (lineSub / sub))) : 0
    remainingDiscount = round2(remainingDiscount - lineDiscount)
    const taxable = Math.max(0, round2(lineSub - lineDiscount))
    cgstT += taxable * num(item.cgst_pct) / 100
    sgstT += taxable * num(item.sgst_pct) / 100
    igstT += taxable * num(item.igst_pct) / 100
  })

  cgstT = round2(cgstT)
  sgstT = round2(sgstT)
  igstT = round2(igstT)
  const delivery = round2(num(form?.delivery_charges))
  const other = round2(num(form?.other_charges))
  return { sub, discountAmount, taxableSubtotal, cgstT, sgstT, igstT, delivery, other, total: round2(taxableSubtotal + cgstT + sgstT + igstT + delivery + other) }
}

export default function ManagerOrders() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [company, setCompany] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [form, setForm] = useState({ ...emptyOrder })
  const [editForm, setEditForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSugg, setShowSugg] = useState(false)
  const suggRef = useRef(null)
  const timer = useRef(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/orders').then(r => setOrders(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    api.get('/products').then(r => setProducts(r.data)).catch(console.error)
    api.get('/company').then(r => setCompany(r.data || {})).catch(console.error)
    const close = (e) => { if (suggRef.current && !suggRef.current.contains(e.target)) setShowSugg(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [load])

  const setField = (setter, key) => (e) => setter(prev => ({ ...prev, [key]: e.target.value }))
  const setOrder = (setter, updater) => setter(prev => updater(prev))
  const updItem = (idx, field, val, isEdit = false) => setOrder(isEdit ? setEditForm : setForm, prev => {
    const items = [...prev.items]
    items[idx] = { ...items[idx], [field]: val }
    return { ...prev, items }
  })
  const changeQty = (idx, delta, isEdit = false) => setOrder(isEdit ? setEditForm : setForm, prev => {
    const items = [...prev.items]
    items[idx] = { ...items[idx], quantity: Math.max(1, parseInt(items[idx].quantity || 1, 10) + delta) }
    return { ...prev, items }
  })
  const searchCust = (q) => {
    clearTimeout(timer.current)
    if (q.length < 2) return setShowSugg(false), setSuggestions([])
    timer.current = setTimeout(async () => {
      try { const r = await api.get('/customers/search', { params:{ q } }); setSuggestions(r.data); setShowSugg(r.data.length > 0) } catch {}
    }, 250)
  }
  const selectCust = (c) => { setForm(prev => ({ ...prev, customer_name:c.name, customer_phone:c.phone || '', customer_email:c.email || '', customer_address:c.address || '', gst_number:c.gst_number || '' })); setShowSugg(false) }
  const pickProduct = (idx, pid, isEdit = false) => {
    const product = products.find(p => p.id === parseInt(pid, 10))
    setOrder(isEdit ? setEditForm : setForm, prev => {
      const items = [...prev.items]
      items[idx] = { ...items[idx], product_id:pid, custom_product_name:'', unit_price:product ? String(product.price) : '', cgst_pct:product ? product.cgst_pct : 9, sgst_pct:product ? product.sgst_pct : 9, igst_pct:product ? product.igst_pct || 0 : 0, hsn_code:product?.hsn_code || '', unit:product?.unit || 'Pcs.' }
      return { ...prev, items }
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const totals = calcTotals(form)
      const r = await api.post('/orders', { ...form, cgst:totals.cgstT, sgst:totals.sgstT, igst:totals.igstT })
      toast(`Order ${r.data.order_number} created!`)
      setModal(false)
      setForm({ ...emptyOrder, order_date:todayStr() })
      load()
    } catch (err) {
      toast(err.response?.data?.error || 'Failed', 'error')
    } finally { setSaving(false) }
  }

  const openEdit = async (order) => {
    try {
      const r = await api.get(`/orders/${order.id}`)
      const { order:od, items } = r.data
      setEditForm({
        id:od.id, order_number:od.order_number, customer_name:od.customer_name || '', customer_phone:od.customer_phone || '', customer_email:od.customer_email || '', customer_address:od.customer_address || '', gst_number:od.gst_number || '',
        order_date:od.order_date?.slice(0, 10) || todayStr(), delivery_date:od.delivery_date?.slice(0, 10) || '', status:od.status || 'PENDING', payment_status:od.payment_status || 'UNPAID', payment_mode:od.payment_mode || 'CASH',
        amount_paid:od.amount_paid || 0, delivery_charges:od.delivery_charges || 0, other_charges:od.other_charges || 0, discount:od.discount || 0, lr_number:od.lr_number || '', transport_name:od.transport_name || '', vehicle_number:od.vehicle_number || '', notes:od.notes || '',
        items:items.map(item => ({ product_id:item.product_id ? String(item.product_id) : '', custom_product_name:item.custom_product_name || '', quantity:item.quantity, unit_price:String(item.unit_price), unit:item.unit || 'Pcs.', cgst_pct:item.cgst_pct || 9, sgst_pct:item.sgst_pct || 9, igst_pct:item.igst_pct || 0, hsn_code:item.hsn_code || '', notes:item.notes || '' })),
      })
      setEditModal(true)
    } catch { toast('Failed to load order', 'error') }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const totals = calcTotals(editForm)
      await api.put(`/orders/${editForm.id}`, { ...editForm, cgst:totals.cgstT, sgst:totals.sgstT, igst:totals.igstT })
      toast('Order updated')
      setEditModal(false)
      load()
    } catch (err) {
      toast(err.response?.data?.error || 'Failed', 'error')
    } finally { setSaving(false) }
  }

  const openDetail = async (order) => {
    setDetail(order)
    setDetailData(null)
    try { const r = await api.get(`/orders/${order.id}`); setDetailData(r.data) } catch {}
  }

  const tabs = [['all','All'],['active','Active'],['delivered','Delivered'],['unpaid','Unpaid']]
  const filtered = orders.filter(order => {
    if (tab === 'active') return !['DELIVERED', 'CANCELLED'].includes(order.status)
    if (tab === 'delivered') return order.status === 'DELIVERED'
    if (tab === 'unpaid') return order.payment_status !== 'PAID' && order.status !== 'CANCELLED'
    return true
  })

  const renderCustomerSection = (value, setter, enableSearch = false) => (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>Customer Details</div>
      <div ref={enableSearch ? suggRef : undefined} style={{ position:'relative' }}>
        <label style={labelStyle}>Customer Name *</label>
        <input style={inputStyle} value={value.customer_name} required autoComplete="off" onChange={(e) => { setter(prev => ({ ...prev, customer_name:e.target.value })); if (enableSearch) searchCust(e.target.value) }} placeholder="Type customer name" />
        {enableSearch && showSugg && suggestions.length > 0 && (
          <div style={{ position:'absolute', zIndex:20, width:'100%', marginTop:6, background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, boxShadow:'0 14px 30px rgba(0,0,0,0.12)', maxHeight:180, overflowY:'auto' }}>
            {suggestions.map(customer => (
              <button key={customer.id} type="button" onClick={() => selectCust(customer)} style={{ width:'100%', textAlign:'left', padding:'10px 12px', border:'none', background:'transparent', cursor:'pointer', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{customer.name}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{customer.phone || 'No phone'}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={value.customer_phone} onChange={setField(setter, 'customer_phone')} placeholder="9876543210" /></div>
        <div><label style={labelStyle}>Email</label><input style={inputStyle} value={value.customer_email} onChange={setField(setter, 'customer_email')} placeholder="customer@email.com" /></div>
        <div><label style={labelStyle}>GST Number</label><input style={inputStyle} value={value.gst_number} onChange={setField(setter, 'gst_number')} placeholder="27AABCU9603R1ZX" /></div>
        <div style={{ gridColumn:'1 / -1' }}><label style={labelStyle}>Address</label><input style={inputStyle} value={value.customer_address} onChange={setField(setter, 'customer_address')} placeholder="Full address" /></div>
      </div>
    </div>
  )

  const renderOrderSection = (value, setter, includePayment = false) => (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>Order Details</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div><label style={labelStyle}>Order Date *</label><input style={inputStyle} type="date" value={value.order_date} onChange={setField(setter, 'order_date')} required /></div>
        <div><label style={labelStyle}>Delivery Date</label><input style={inputStyle} type="date" value={value.delivery_date} onChange={setField(setter, 'delivery_date')} /></div>
        <div><label style={labelStyle}>Status</label><select style={inputStyle} value={value.status} onChange={setField(setter, 'status')}>{STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select></div>

        <div><label style={labelStyle}>Transport Name</label><input style={inputStyle} value={value.transport_name} onChange={setField(setter, 'transport_name')} placeholder="Transport company" /></div>
        <div><label style={labelStyle}>Vehicle Number</label><input style={inputStyle} value={value.vehicle_number} onChange={setField(setter, 'vehicle_number')} placeholder="GJ 06 1234" /></div>
        <div><label style={labelStyle}>LR Number</label><input style={inputStyle} value={value.lr_number} onChange={setField(setter, 'lr_number')} placeholder="LR-001" /></div>
      </div>
    </div>
  )

  const renderChargeSection = (value, setter) => (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>Charges and Notes</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
        <div><label style={labelStyle}>Delivery Charges</label><input style={inputStyle} type="number" min={0} value={value.delivery_charges} onChange={setField(setter, 'delivery_charges')} /></div>
        <div><label style={labelStyle}>Other Charges</label><input style={inputStyle} type="number" min={0} value={value.other_charges} onChange={setField(setter, 'other_charges')} /></div>
        <div><label style={labelStyle}>Discount</label><input style={inputStyle} type="number" min={0} value={value.discount} onChange={setField(setter, 'discount')} /></div>
      </div>
      <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight:80, resize:'vertical' }} value={value.notes} onChange={setField(setter, 'notes')} placeholder="Order notes..." /></div>
    </div>
  )

  const renderPaymentSection = (value, setter, grandTotal) => (
    <div style={{ ...sectionStyle, border:'2px solid var(--primary)', background:'var(--primary-bg)' }}>
      <div style={{ ...sectionTitleStyle, color:'var(--primary)' }}>Payment Details</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
        <div>
          <label style={labelStyle}>Payment Mode</label>
          <select style={inputStyle} value={value.payment_mode} onChange={setField(setter, 'payment_mode')}>
            {PAY_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Payment Status</label>
          <select style={inputStyle} value={value.payment_status || 'UNPAID'} onChange={setField(setter, 'payment_status')}>
            {['UNPAID','PARTIAL','PAID'].map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Amount Paid (₹)</label>
          <input style={{ ...inputStyle, fontWeight:800, color:'var(--primary)', fontSize:15 }}
            type="number" min={0} max={grandTotal} value={value.amount_paid || 0}
            onChange={setField(setter, 'amount_paid')} placeholder="0" />
          {num(value.amount_paid) > 0 && grandTotal > 0 && (
            <div style={{ fontSize:11, color: num(value.amount_paid) >= grandTotal ? 'var(--green)' : 'var(--red)', marginTop:3, fontWeight:700 }}>
              {num(value.amount_paid) >= grandTotal ? '✓ Fully Paid' : `Balance: ${fmt(round2(grandTotal - num(value.amount_paid)))}`}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const ItemsForm = ({ value, setter, isEdit }) => {
    const totals = calcTotals(value)
    return (
      <div style={sectionStyle}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <div style={sectionTitleStyle}>Order Items</div>
          <button type="button" onClick={() => setter(prev => ({ ...prev, items:[...prev.items, { ...emptyItem }] }))} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'var(--primary-bg)', color:'var(--primary)', border:'none', borderRadius:10, fontWeight:700, fontSize:12, cursor:'pointer' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Add Item
          </button>
        </div>

        {value.items.map((item, idx) => (
          <div key={idx} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:14, display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              <div style={{ fontSize:12, fontWeight:800, color:'var(--text2)' }}>Item {idx + 1}</div>
              {value.items.length > 1 && <button type="button" onClick={() => setter(prev => ({ ...prev, items:prev.items.filter((_, i) => i !== idx) }))} style={{ padding:'6px 10px', background:'var(--red-bg)', color:'var(--red)', border:'none', borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer' }}>Remove</button>}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.5fr) auto', gap:10, alignItems:'end' }}>
              <div>
                <label style={labelStyle}>Product</label>
                <select style={inputStyle} value={item.product_id} onChange={(e) => {
                  if (e.target.value) pickProduct(idx, e.target.value, isEdit)
                  else { updItem(idx, 'product_id', '', isEdit); updItem(idx, 'custom_product_name', '', isEdit) }
                }}>
                  <option value="">Custom item</option>
                  {products.map(product => <option key={product.id} value={product.id}>{product.name} - {fmt(product.price)}</option>)}
                </select>
              </div>
              <div style={{ minWidth:120 }}>
                <label style={labelStyle}>Line Total</label>
                <div style={{ ...inputStyle, background:'var(--primary-bg)', color:'var(--primary)', fontWeight:800, display:'flex', alignItems:'center' }}>{fmt(itemSubtotal(item))}</div>
              </div>
            </div>

            {!item.product_id && <div><label style={labelStyle}>Custom Product Name</label><input style={inputStyle} value={item.custom_product_name} onChange={e => updItem(idx, 'custom_product_name', e.target.value, isEdit)} placeholder="Enter custom item name" /></div>}

            <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr 1fr 1fr', gap:10 }}>
              <div>
                <label style={labelStyle}>Quantity</label>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button type="button" onClick={() => changeQty(idx, -1, isEdit)} style={qtyButtonStyle}>-</button>
                  <input style={{ ...inputStyle, textAlign:'center', fontWeight:700, padding:'9px 6px' }} type="number" min={1} value={item.quantity} onChange={e => updItem(idx, 'quantity', Math.max(1, parseInt(e.target.value || 1, 10)), isEdit)} />
                  <button type="button" onClick={() => changeQty(idx, 1, isEdit)} style={qtyButtonStyle}>+</button>
                </div>
              </div>
              <div><label style={labelStyle}>Unit Price</label><input style={inputStyle} type="number" min={0} value={item.unit_price} onChange={e => updItem(idx, 'unit_price', e.target.value, isEdit)} placeholder="0" /></div>
              <div><label style={labelStyle}>CGST %</label><input style={inputStyle} type="number" min={0} value={item.cgst_pct} onChange={e => updItem(idx, 'cgst_pct', e.target.value, isEdit)} /></div>
              <div><label style={labelStyle}>SGST %</label><input style={inputStyle} type="number" min={0} value={item.sgst_pct} onChange={e => updItem(idx, 'sgst_pct', e.target.value, isEdit)} /></div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><label style={labelStyle}>Unit</label><input style={inputStyle} value={item.unit} onChange={e => updItem(idx, 'unit', e.target.value, isEdit)} placeholder="Pcs." /></div>
              <div><label style={labelStyle}>HSN Code</label><input style={inputStyle} value={item.hsn_code} onChange={e => updItem(idx, 'hsn_code', e.target.value, isEdit)} placeholder="12345678" /></div>
            </div>
          </div>
        ))}

        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
          <div style={sectionTitleStyle}>Bill Summary</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginTop:10 }}>
            {[
              ['Subtotal', totals.sub, 'var(--text)'],
              ['Discount', totals.discountAmount, 'var(--green)'],
              ['Taxable Amount', totals.taxableSubtotal, 'var(--primary)'],
              ['CGST', totals.cgstT, 'var(--text)'],
              ['SGST', totals.sgstT, 'var(--text)'],
              ...(totals.igstT > 0 ? [['IGST', totals.igstT, 'var(--text)']] : []),
              ['Delivery', totals.delivery, 'var(--text)'],
              ['Other', totals.other, 'var(--text)'],
              ['Grand Total', totals.total, 'var(--primary)'],
            ].map(([label, amount, color]) => (
              <div key={label} style={{ background:'var(--bg2)', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:16, fontWeight:800, color }}>{fmt(amount)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="text-xs text-surface-400 mt-0.5">{orders.length} total orders</p>
        </div>
        <button onClick={() => { setForm({ ...emptyOrder, order_date:todayStr() }); setModal(true) }} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Order
        </button>
      </div>

      <div className="flex gap-1 bg-surface-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === id ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
            {label} {id === 'all' && `(${orders.length})`}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? <div className="py-12 text-center text-surface-400 text-sm">No orders found</div> : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead><tr>{['Order #','Customer','Date','Status','Payment','Total','Pending',''].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                  {filtered.map(order => (
                    <tr key={order.id} className="table-row cursor-pointer" onClick={() => openDetail(order)}>
                      <td className="table-td font-mono text-xs text-primary-600 font-semibold">{order.order_number}</td>
                      <td className="table-td font-medium text-sm">{order.customer_name}</td>
                      <td className="table-td text-xs text-surface-400">{fmtDate(order.order_date)}</td>
                      <td className="table-td"><StatusBadge status={order.status} /></td>
                      <td className="table-td"><StatusBadge status={order.payment_status} /></td>
                      <td className="table-td font-semibold">{fmt(order.total_amount)}</td>
                      <td className="table-td">{num(order.amount_paid) > 0 && num(order.total_amount) > num(order.amount_paid) ? <span style={{ color:'var(--red)', fontWeight:800, fontSize:13 }}>{fmt(num(order.total_amount) - num(order.amount_paid))}</span> : <span style={{ color:'var(--green)', fontSize:12 }}>OK</span>}</td>
                      <td className="table-td"><button onClick={e => { e.stopPropagation(); openEdit(order) }} className="btn-ghost !p-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-2 p-3">
              {filtered.map(order => (
                <div key={order.id} className="card-sm p-3 cursor-pointer" onClick={() => openDetail(order)}>
                  <div className="flex justify-between items-start">
                    <div><div className="font-mono text-xs text-primary-600 font-semibold">{order.order_number}</div><div className="font-semibold text-sm mt-0.5">{order.customer_name}</div></div>
                    <div className="text-right"><div className="font-bold">{fmt(order.total_amount)}</div><StatusBadge status={order.status} /></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Create New Order" size="2xl">
        <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {renderCustomerSection(form, setForm, true)}
          {renderOrderSection(form, setForm)}
          <ItemsForm value={form} setter={setForm} isEdit={false} />
          {renderChargeSection(form, setForm)}
          {renderPaymentSection(form, setForm, calcTotals(form).total)}
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={() => setModal(false)} style={{ flex:1, padding:'11px', background:'var(--bg2)', color:'var(--text2)', border:'1px solid var(--border)', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex:2, padding:'11px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', opacity:saving ? 0.7 : 1 }}>{saving ? 'Creating...' : 'Create Order'}</button>
          </div>
        </form>
      </Modal>

      {editForm && <Modal open={editModal} onClose={() => setEditModal(false)} title={`Edit Order - ${editForm.order_number}`} size="2xl">
        <form onSubmit={handleUpdate} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {renderCustomerSection(editForm, setEditForm)}
          {renderOrderSection(editForm, setEditForm, false)}
          <ItemsForm value={editForm} setter={setEditForm} isEdit />
          {renderChargeSection(editForm, setEditForm)}
          {renderPaymentSection(editForm, setEditForm, calcTotals(editForm).total)}
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={() => setEditModal(false)} style={{ flex:1, padding:'11px', background:'var(--bg2)', color:'var(--text2)', border:'1px solid var(--border)', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex:2, padding:'11px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', opacity:saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Update Order'}</button>
          </div>
        </form>
      </Modal>}

      <Modal open={!!detail} onClose={() => { setDetail(null); setDetailData(null) }} title={`Order ${detail?.order_number || ''}`} size="xl">
        {!detailData ? <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div> : (() => {
          const totals = calcTotals({ ...detailData.order, items:detailData.items.map(item => ({ quantity:item.quantity, unit_price:item.unit_price, cgst_pct:item.cgst_pct, sgst_pct:item.sgst_pct, igst_pct:item.igst_pct })) })
          return <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-50 dark:bg-gray-800 rounded-lg p-3"><div className="text-xs text-surface-400 mb-1">Customer</div><div className="font-semibold">{detailData.order.customer_name}</div><div className="text-xs text-surface-400">{detailData.order.customer_phone}</div>{detailData.order.gst_number && <div className="text-xs font-mono mt-0.5">{detailData.order.gst_number}</div>}</div>
              <div className="bg-surface-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">{[['Status', <StatusBadge status={detailData.order.status} />], ['Payment', <StatusBadge status={detailData.order.payment_status} />], ['Mode', detailData.order.payment_mode || '-'], ['Date', fmtDate(detailData.order.order_date)]].map(([label, value]) => <div key={label} className="flex justify-between text-xs"><span className="text-surface-400">{label}</span><span className="font-medium">{value}</span></div>)}</div>
            </div>
            <div className="border border-surface-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 dark:bg-gray-800"><tr><th className="table-th">Item</th><th className="table-th text-right">Qty</th><th className="table-th text-right">Price</th><th className="table-th text-right">CGST</th><th className="table-th text-right">SGST</th><th className="table-th text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-surface-100 dark:divide-gray-800">{detailData.items.map(item => <tr key={item.id}><td className="table-td font-medium">{item.custom_product_name || item.product_name_db || 'Item'}</td><td className="table-td text-right">{item.quantity}</td><td className="table-td text-right">{fmt(item.unit_price)}</td><td className="table-td text-right text-xs">{item.cgst_pct || 0}%</td><td className="table-td text-right text-xs">{item.sgst_pct || 0}%</td><td className="table-td text-right font-semibold">{fmt(item.total_price)}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="bg-surface-50 dark:bg-gray-800 rounded-lg p-3 space-y-1 text-sm">
              {[['Subtotal', totals.sub], ['Discount', totals.discountAmount], ['Taxable Amount', totals.taxableSubtotal], ['CGST', totals.cgstT], ['SGST', totals.sgstT], ...(totals.igstT > 0 ? [['IGST', totals.igstT]] : []), ['Delivery', totals.delivery], ['Other', totals.other]].filter(([, value]) => num(value) > 0).map(([label, value]) => <div key={label} className="flex justify-between text-xs"><span className="text-surface-400">{label}</span><span>{fmt(value)}</span></div>)}
              <div className="flex justify-between font-bold text-sm border-t border-surface-200 dark:border-gray-700 pt-1"><span>Grand Total</span><span className="text-primary-600">{fmt(detailData.order.total_amount)}</span></div>
              <div className="flex justify-between text-xs text-green-600"><span>Paid</span><span>{fmt(detailData.order.amount_paid)}</span></div>
              <div className="flex justify-between text-xs text-red-500"><span>Balance</span><span>{fmt(num(detailData.order.total_amount) - num(detailData.order.amount_paid))}</span></div>
            </div>
            <button onClick={() => generateInvoice(detailData.order, detailData.items, company)} className="btn-secondary w-full flex items-center justify-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>Print Invoice (GST Format)</button>
          </div>
        })()}
      </Modal>
    </div>
  )
}
