import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../utils/api'
import { Modal, LoadingPage, StatusBadge, fmt, fmtDate, useToast } from '../../components/ui'
import { generateInvoice } from '../../utils/invoice'

const todayStr = () => new Date().toISOString().split('T')[0]
const emptyItem = { product_id:'', custom_product_name:'', quantity:1, unit_price:'', unit:'Pcs.', cgst_pct:9, sgst_pct:9, igst_pct:0, hsn_code:'', notes:'' }
const emptyOrder = { customer_name:'', customer_phone:'', customer_email:'', customer_address:'', gst_number:'', order_date:todayStr(), delivery_date:'', status:'PENDING', delivery_charges:0, other_charges:0, discount:0, payment_mode:'CASH', lr_number:'', transport_name:'', vehicle_number:'', notes:'', items:[{...emptyItem}] }
const STATUSES = ['PENDING','IN_PRODUCTION','READY','YET_TO_DELIVER','DELIVERED','CANCELLED']
const PAY_MODES = ['CASH','UPI','NEFT','CARD','CHEQUE','OTHER']

export default function ManagerOrders() {
  const toast = useToast()
  const [orders, setOrders]   = useState([])
  const [products, setProducts] = useState([])
  const [company, setCompany] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('all')
  const [modal, setModal]     = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [detail, setDetail]   = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [form, setForm]       = useState({...emptyOrder})
  const [editForm, setEditForm] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSugg, setShowSugg] = useState(false)
  const suggRef = useRef(null)
  const timer   = useRef(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/orders').then(r => setOrders(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    api.get('/products').then(r => setProducts(r.data)).catch(console.error)
    api.get('/company').then(r => setCompany(r.data || {})).catch(console.error)
    const h = (e) => { if (suggRef.current && !suggRef.current.contains(e.target)) setShowSugg(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [load])

  const searchCust = (q) => {
    clearTimeout(timer.current)
    if (q.length < 2) { setSuggestions([]); setShowSugg(false); return }
    timer.current = setTimeout(async () => {
      try { const r = await api.get('/customers/search', { params: { q } }); setSuggestions(r.data); setShowSugg(r.data.length > 0) } catch {}
    }, 250)
  }

  const selectCust = (c) => {
    setForm(p => ({ ...p, customer_name: c.name, customer_phone: c.phone||'', customer_email: c.email||'', customer_address: c.address||'', gst_number: c.gst_number||'' }))
    setShowSugg(false)
  }

  const updItem = (idx, field, val, isEdit=false) => {
    const upd = f => { const items = [...f.items]; items[idx] = { ...items[idx], [field]: val }; return { ...f, items } }
    isEdit ? setEditForm(upd) : setForm(upd)
  }

  const pickProduct = (idx, pid, isEdit=false) => {
    const p = products.find(p => p.id === parseInt(pid))
    const upd = f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], product_id: pid, custom_product_name:'', unit_price: p ? String(p.price) : '', cgst_pct: p ? p.cgst_pct : 9, sgst_pct: p ? p.sgst_pct : 9, hsn_code: p?.hsn_code||'', unit: p?.unit||'Pcs.' }
      return { ...f, items }
    }
    isEdit ? setEditForm(upd) : setForm(upd)
  }

  const calcTotals = (f) => {
    const sub    = f.items.reduce((s,i) => s + (parseFloat(i.quantity||0) * parseFloat(i.unit_price||0)), 0)
    const cgstT  = f.items.reduce((s,i) => s + (parseFloat(i.quantity||0) * parseFloat(i.unit_price||0) * parseFloat(i.cgst_pct||0)/100), 0)
    const sgstT  = f.items.reduce((s,i) => s + (parseFloat(i.quantity||0) * parseFloat(i.unit_price||0) * parseFloat(i.sgst_pct||0)/100), 0)
    const total  = sub + cgstT + sgstT + parseFloat(f.delivery_charges||0) + parseFloat(f.other_charges||0) - parseFloat(f.discount||0)
    return { sub, cgstT, sgstT, total }
  }

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const { sub, cgstT, sgstT } = calcTotals(form)
      const r = await api.post('/orders', { ...form, cgst: cgstT, sgst: sgstT })
      toast(`Order ${r.data.order_number} created!`)
      setModal(false); setForm({...emptyOrder, order_date: todayStr()}); load()
    } catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setSaving(false) }
  }

  const openEdit = async (o) => {
    try {
      const r = await api.get(`/orders/${o.id}`)
      const { order: od, items } = r.data
      setEditForm({ id:od.id, order_number:od.order_number, customer_name:od.customer_name||'', customer_phone:od.customer_phone||'', customer_email:od.customer_email||'', customer_address:od.customer_address||'', gst_number:od.gst_number||'', order_date:od.order_date?.slice(0,10)||todayStr(), delivery_date:od.delivery_date?.slice(0,10)||'', status:od.status, payment_status:od.payment_status||'UNPAID', payment_mode:od.payment_mode||'CASH', amount_paid:od.amount_paid||0, delivery_charges:od.delivery_charges||0, other_charges:od.other_charges||0, discount:od.discount||0, lr_number:od.lr_number||'', transport_name:od.transport_name||'', vehicle_number:od.vehicle_number||'', notes:od.notes||'',
        items: items.map(i => ({ product_id:i.product_id?String(i.product_id):'', custom_product_name:i.custom_product_name||'', quantity:i.quantity, unit_price:String(i.unit_price), unit:i.unit||'Pcs.', cgst_pct:i.cgst_pct||9, sgst_pct:i.sgst_pct||9, igst_pct:i.igst_pct||0, hsn_code:i.hsn_code||'', notes:i.notes||'' }))
      }); setEditModal(true)
    } catch { toast('Failed to load order','error') }
  }

  const handleUpdate = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const { sub, cgstT, sgstT } = calcTotals(editForm)
      await api.put(`/orders/${editForm.id}`, { ...editForm, cgst: cgstT, sgst: sgstT })
      toast('Order updated'); setEditModal(false); load()
    } catch(err) { toast(err.response?.data?.error||'Failed','error') }
    finally { setSaving(false) }
  }

  const openDetail = async (o) => {
    setDetail(o); setDetailData(null)
    try { const r = await api.get(`/orders/${o.id}`); setDetailData(r.data) } catch {}
  }

  const tabs = [['all','All'],['active','Active'],['delivered','Delivered'],['unpaid','Unpaid']]
  const filtered = orders.filter(o => {
    if (tab==='active') return !['DELIVERED','CANCELLED'].includes(o.status)
    if (tab==='delivered') return o.status==='DELIVERED'
    if (tab==='unpaid') return o.payment_status!=='PAID' && o.status!=='CANCELLED'
    return true
  })

  // Shared form renderer
  const ItemsForm = ({ f, setF, isEdit }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label !mb-0">Items</label>
        <button type="button" onClick={() => setF(p => ({...p, items:[...p.items,{...emptyItem}]}))} className="text-xs text-primary-500 font-semibold hover:text-primary-700">+ Add Item</button>
      </div>
      {f.items.map((item,idx) => (
        <div key={idx} className="border border-surface-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <select className="input flex-1 !min-h-[34px] text-xs" value={item.product_id} onChange={e=>{ if(e.target.value) pickProduct(idx,e.target.value,isEdit); else updItem(idx,'product_id','',isEdit) }}>
              <option value="">Custom item</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} — {fmt(p.price)}</option>)}
            </select>
            {f.items.length > 1 && <button type="button" onClick={() => setF(p=>({...p,items:p.items.filter((_,i)=>i!==idx)}))} className="text-red-400 hover:text-red-600 px-2">✕</button>}
          </div>
          {!item.product_id && <input className="input text-xs !min-h-[34px]" value={item.custom_product_name} onChange={e=>updItem(idx,'custom_product_name',e.target.value,isEdit)} placeholder="Product name" />}
          <div className="grid grid-cols-4 gap-2">
            <div><label className="text-xs text-surface-400">Qty</label><input className="input text-xs !min-h-[34px]" type="number" value={item.quantity} onChange={e=>updItem(idx,'quantity',parseInt(e.target.value)||1,isEdit)} min={1}/></div>
            <div><label className="text-xs text-surface-400">Price ₹</label><input className="input text-xs !min-h-[34px]" type="number" value={item.unit_price} onChange={e=>updItem(idx,'unit_price',e.target.value,isEdit)} placeholder="0"/></div>
            <div><label className="text-xs text-surface-400">CGST %</label><input className="input text-xs !min-h-[34px]" type="number" value={item.cgst_pct} onChange={e=>updItem(idx,'cgst_pct',e.target.value,isEdit)} min={0}/></div>
            <div><label className="text-xs text-surface-400">SGST %</label><input className="input text-xs !min-h-[34px]" type="number" value={item.sgst_pct} onChange={e=>updItem(idx,'sgst_pct',e.target.value,isEdit)} min={0}/></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-xs text-surface-400">Unit</label><input className="input text-xs !min-h-[34px]" value={item.unit} onChange={e=>updItem(idx,'unit',e.target.value,isEdit)} placeholder="Pcs."/></div>
            <div><label className="text-xs text-surface-400">HSN Code</label><input className="input text-xs !min-h-[34px]" value={item.hsn_code} onChange={e=>updItem(idx,'hsn_code',e.target.value,isEdit)} placeholder="12345678"/></div>
            <div><label className="text-xs text-surface-400">Subtotal</label><div className="input bg-surface-100 dark:bg-gray-800 text-xs !min-h-[34px] flex items-center font-semibold">{fmt((item.quantity||0)*(parseFloat(item.unit_price)||0))}</div></div>
          </div>
        </div>
      ))}
      {/* Tax Summary */}
      {(() => { const {sub,cgstT,sgstT,total} = calcTotals(f); return (
        <div className="bg-surface-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1 text-sm">
          {[['Subtotal',sub],['CGST',cgstT],['SGST',sgstT],['Delivery',f.delivery_charges],['Other',f.other_charges],['Discount',-f.discount]].filter(([,v])=>parseFloat(v||0)!==0).map(([l,v])=>(
            <div key={l} className="flex justify-between text-xs"><span className="text-surface-500">{l}</span><span>{fmt(Math.abs(parseFloat(v||0)))}</span></div>
          ))}
          <div className="flex justify-between font-bold text-sm border-t border-surface-200 dark:border-gray-700 pt-1"><span>Total</span><span className="text-primary-600">{fmt(total)}</span></div>
        </div>
      )})()}
    </div>
  )

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="text-xs text-surface-400 mt-0.5">{orders.length} total orders</p>
        </div>
        <button onClick={() => { setForm({...emptyOrder, order_date:todayStr()}); setModal(true) }} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New Order
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {tabs.map(([id,label]) => (
          <button key={id} onClick={()=>setTab(id)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab===id?'bg-white dark:bg-gray-700 text-primary-600 shadow-sm':'text-surface-500 hover:text-surface-700'}`}>
            {label} {id==='all'&&`(${orders.length})`}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-surface-400 text-sm">No orders found</div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead><tr>{['Order #','Customer','Date','Status','Payment','Total','Pending',''].map(h=><th key={h} className="table-th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                {filtered.map(o => (
                  <tr key={o.id} className="table-row cursor-pointer" onClick={()=>openDetail(o)}>
                    <td className="table-td font-mono text-xs text-primary-600 font-semibold">{o.order_number}</td>
                    <td className="table-td font-medium text-sm">{o.customer_name}</td>
                    <td className="table-td text-xs text-surface-400">{fmtDate(o.order_date)}</td>
                    <td className="table-td"><StatusBadge status={o.status}/></td>
                    <td className="table-td"><StatusBadge status={o.payment_status}/></td>
                    <td className="table-td font-semibold">{fmt(o.total_amount)}</td>
                    <td className="table-td">{parseFloat(o.amount_paid||0)>0 && parseFloat(o.total_amount)>parseFloat(o.amount_paid||0) ? <span style={{color:'var(--red)',fontWeight:800,fontSize:13}}>{fmt(parseFloat(o.total_amount)-parseFloat(o.amount_paid||0))}</span> : <span style={{color:'var(--green)',fontSize:12}}>✓</span>}</td>
                    <td className="table-td">
                      <button onClick={e=>{e.stopPropagation();openEdit(o)}} className="btn-ghost !p-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2 p-3">
            {filtered.map(o=>(
              <div key={o.id} className="card-sm p-3 cursor-pointer" onClick={()=>openDetail(o)}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono text-xs text-primary-600 font-semibold">{o.order_number}</div>
                    <div className="font-semibold text-sm mt-0.5">{o.customer_name}</div>
                  </div>
                  <div className="text-right"><div className="font-bold">{fmt(o.total_amount)}</div><StatusBadge status={o.status}/></div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Create Order Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Create New Order" size="2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Customer */}
          <div className="card p-4 space-y-3">
            <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wide">Customer Details</h4>
            <div className="relative" ref={suggRef}>
              <label className="label">Customer Name *</label>
              <input className="input" value={form.customer_name} required autoComplete="off"
                onChange={e=>{setForm(p=>({...p,customer_name:e.target.value}));searchCust(e.target.value)}}
                placeholder="Type to search customers..." />
              {showSugg && suggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-surface-200 dark:border-gray-700 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                  {suggestions.map(c=>(
                    <button key={c.id} type="button" onClick={()=>selectCust(c)} className="w-full text-left px-3 py-2 hover:bg-surface-50 dark:hover:bg-gray-800 text-sm border-b border-surface-100 dark:border-gray-800 last:border-0">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-surface-400">{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Phone</label><input className="input" value={form.customer_phone} onChange={e=>setForm(p=>({...p,customer_phone:e.target.value}))} placeholder="9876543210"/></div>
              <div><label className="label">GST Number</label><input className="input" value={form.gst_number} onChange={e=>setForm(p=>({...p,gst_number:e.target.value}))} placeholder="27AABCU9603R1ZX"/></div>
              <div className="col-span-2"><label className="label">Address</label><input className="input" value={form.customer_address} onChange={e=>setForm(p=>({...p,customer_address:e.target.value}))} placeholder="Full address"/></div>
            </div>
          </div>
          {/* Order Info */}
          <div className="card p-4 space-y-3">
            <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wide">Order Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Order Date *</label><input className="input" type="date" value={form.order_date} onChange={e=>setForm(p=>({...p,order_date:e.target.value}))} required/></div>
              <div><label className="label">Delivery Date</label><input className="input" type="date" value={form.delivery_date} onChange={e=>setForm(p=>({...p,delivery_date:e.target.value}))}/></div>
              <div><label className="label">Status</label><select className="input" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="label">Payment Mode</label><select className="input" value={form.payment_mode} onChange={e=>setForm(p=>({...p,payment_mode:e.target.value}))}>{PAY_MODES.map(m=><option key={m}>{m}</option>)}</select></div>
              <div><label className="label">Transport Name</label><input className="input" value={form.transport_name} onChange={e=>setForm(p=>({...p,transport_name:e.target.value}))} placeholder="Narathion"/></div>
              <div><label className="label">Vehicle Number</label><input className="input" value={form.vehicle_number} onChange={e=>setForm(p=>({...p,vehicle_number:e.target.value}))} placeholder="GJ 06 1234"/></div>
            </div>
          </div>
          {/* Items */}
          <div className="card p-4">
            <ItemsForm f={form} setF={setForm} isEdit={false} />
            <div className="grid grid-cols-3 gap-3 mt-3">
              {[['Delivery ₹','delivery_charges'],['Other ₹','other_charges'],['Discount ₹','discount']].map(([l,k])=>(
                <div key={k}><label className="label">{l}</label><input className="input" type="number" value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} min={0}/></div>
              ))}
            </div>
          </div>
          <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Order notes..."/></div>
          <div className="flex gap-3">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Creating…':'Create Order'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal - same structure as create */}
      {editForm && (
        <Modal open={editModal} onClose={()=>setEditModal(false)} title={`Edit Order — ${editForm.order_number}`} size="2xl">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Status</label><select className="input" value={editForm.status} onChange={e=>setEditForm(p=>({...p,status:e.target.value}))}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="label">Payment Status</label><select className="input" value={editForm.payment_status||'UNPAID'} onChange={e=>setEditForm(p=>({...p,payment_status:e.target.value}))}>
                {['UNPAID','PARTIAL','PAID'].map(s=><option key={s}>{s}</option>)}
              </select></div>
              <div><label className="label">Payment Mode</label><select className="input" value={editForm.payment_mode||'CASH'} onChange={e=>setEditForm(p=>({...p,payment_mode:e.target.value}))}>{PAY_MODES.map(m=><option key={m}>{m}</option>)}</select></div>
              <div><label className="label">Amount Paid ₹</label><input className="input" type="number" value={editForm.amount_paid||0} onChange={e=>setEditForm(p=>({...p,amount_paid:e.target.value}))} min={0}/></div>
              <div><label className="label">Delivery Date</label><input className="input" type="date" value={editForm.delivery_date||''} onChange={e=>setEditForm(p=>({...p,delivery_date:e.target.value}))}/></div>
            </div>
            <div className="card p-4">
              <ItemsForm f={editForm} setF={setEditForm} isEdit={true} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={()=>setEditModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving…':'Update Order'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail + Invoice Modal */}
      <Modal open={!!detail} onClose={()=>{setDetail(null);setDetailData(null)}} title={`Order ${detail?.order_number||''}`} size="xl">
        {!detailData ? (
          <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-surface-400 mb-1">Customer</div>
                <div className="font-semibold">{detailData.order.customer_name}</div>
                <div className="text-xs text-surface-400">{detailData.order.customer_phone}</div>
                {detailData.order.gst_number && <div className="text-xs font-mono mt-0.5">{detailData.order.gst_number}</div>}
              </div>
              <div className="bg-surface-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
                {[['Status',<StatusBadge status={detailData.order.status}/>],['Payment',<StatusBadge status={detailData.order.payment_status}/>],['Mode',detailData.order.payment_mode||'—'],['Date',fmtDate(detailData.order.order_date)]].map(([l,v])=>(
                  <div key={l} className="flex justify-between text-xs"><span className="text-surface-400">{l}</span><span className="font-medium">{v}</span></div>
                ))}
              </div>
            </div>
            <div className="border border-surface-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 dark:bg-gray-800"><tr><th className="table-th">Item</th><th className="table-th text-right">Qty</th><th className="table-th text-right">Price</th><th className="table-th text-right">CGST</th><th className="table-th text-right">SGST</th><th className="table-th text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-surface-100 dark:divide-gray-800">
                  {detailData.items.map(i=>(
                    <tr key={i.id}><td className="table-td font-medium">{i.custom_product_name||i.product_name_db||'Item'}</td><td className="table-td text-right">{i.quantity}</td><td className="table-td text-right">{fmt(i.unit_price)}</td><td className="table-td text-right text-xs">{i.cgst_pct||0}%</td><td className="table-td text-right text-xs">{i.sgst_pct||0}%</td><td className="table-td text-right font-semibold">{fmt(i.total_price)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-surface-50 dark:bg-gray-800 rounded-lg p-3 space-y-1 text-sm">
              {[['Subtotal',detailData.order.subtotal],['CGST',detailData.order.cgst],['SGST',detailData.order.sgst]].filter(([,v])=>parseFloat(v||0)>0).map(([l,v])=>(
                <div key={l} className="flex justify-between text-xs"><span className="text-surface-400">{l}</span><span>{fmt(v)}</span></div>
              ))}
              <div className="flex justify-between font-bold text-sm border-t border-surface-200 dark:border-gray-700 pt-1"><span>Grand Total</span><span className="text-primary-600">{fmt(detailData.order.total_amount)}</span></div>
              <div className="flex justify-between text-xs text-green-600"><span>Paid</span><span>{fmt(detailData.order.amount_paid)}</span></div>
              <div className="flex justify-between text-xs text-red-500"><span>Balance</span><span>{fmt(detailData.order.total_amount - detailData.order.amount_paid)}</span></div>
            </div>
            <button onClick={() => generateInvoice(detailData.order, detailData.items, company)} className="btn-secondary w-full flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              Print Invoice (GST Format)
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
