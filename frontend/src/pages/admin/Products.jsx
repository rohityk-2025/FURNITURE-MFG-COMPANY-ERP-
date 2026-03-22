import { useState, useEffect, useRef } from 'react'
import api from '../../utils/api'
import { LoadingPage, EmptyState, SearchBar, fmt, useToast, Confirm } from '../../components/ui'

const CATS = ['Seating','Tables','Bedroom','Storage','Office','Outdoor','Other']
const emptyForm = { name:'', category:'Seating', description:'', price:'', commission:'', hsn_code:'', cgst_pct:'9', sgst_pct:'9', igst_pct:'0', unit:'Pcs.', tags:'', material_list:'', material_cost:'0' }

const S = (style={}) => ({ ...style })

export default function AdminProducts() {
  const toast   = useToast()
  const [products,  setProducts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState(emptyForm)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [delConfirm,setDelConfirm]= useState(null)
  const [deleting,  setDeleting]  = useState(false)
  const [detail,    setDetail]    = useState(null)
  const [imgFiles,  setImgFiles]  = useState([])
  const [imgPreviews,setImgPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [taxMode,   setTaxMode]   = useState('cgst_sgst') // 'cgst_sgst' or 'igst'
  const fileRef = useRef(null)

  const load = async () => {
    try { const r = await api.get('/products'); setProducts(r.data) }
    catch(e) { toast('Failed to load','error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const upd = k => e => {
    const val = e.target.value
    setForm(p => {
      const next = { ...p, [k]: val }
      // Tax mode logic
      if (k==='cgst_pct' || k==='sgst_pct') { next.igst_pct = '0'; setTaxMode('cgst_sgst') }
      if (k==='igst_pct' && val !== '0')    { next.cgst_pct = '0'; next.sgst_pct = '0'; setTaxMode('igst') }
      return next
    })
  }

  const openAdd = () => {
    setEditing(null); setForm(emptyForm); setImgFiles([]); setImgPreviews([])
    setTaxMode('cgst_sgst'); setShowModal(true)
  }

  const openEdit = (p) => {
    setEditing(p.id)
    const igst = parseFloat(p.igst_pct||0)
    setTaxMode(igst > 0 ? 'igst' : 'cgst_sgst')
    setForm({
      name: p.name||'', category: p.category||'Seating', description: p.description||'',
      price: p.price||'', commission: p.commission||'',
      hsn_code: p.hsn_code||'', cgst_pct: p.cgst_pct??9, sgst_pct: p.sgst_pct??9,
      igst_pct: p.igst_pct||'0', unit: p.unit||'Pcs.',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags||''),
      material_list: p.material_list||'', material_cost: p.material_cost||'0'
    })
    setImgFiles([]); setImgPreviews(Array.isArray(p.images) ? p.images : [])
    setShowModal(true)
  }

  const handleImgChange = (e) => {
    const files = Array.from(e.target.files)
    setImgFiles(files)
    setImgPreviews(files.map(f => URL.createObjectURL(f)))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const name = (form.name||'').trim()
    if (!name) { toast('Product name is required','error'); return }
    if (!form.price) { toast('Price is required','error'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', name)
      fd.append('category', form.category||'Other')
      fd.append('description', form.description||'')
      fd.append('price', form.price||0)
      fd.append('commission', form.commission||0)
      fd.append('hsn_code', form.hsn_code||'')
      fd.append('cgst_pct', taxMode==='igst' ? '0' : (form.cgst_pct||0))
      fd.append('sgst_pct', taxMode==='igst' ? '0' : (form.sgst_pct||0))
      fd.append('igst_pct', taxMode==='cgst_sgst' ? '0' : (form.igst_pct||0))
      fd.append('unit', form.unit||'Pcs.')
      fd.append('tags', form.tags||'')
      fd.append('material_list', form.material_list||'')
      fd.append('material_cost', form.material_cost||0)
      fd.append('is_active', '1')
      imgFiles.forEach(f => fd.append('images', f))

      if (editing) { await api.put(`/products/${editing}`, fd); toast('Product updated') }
      else         { await api.post('/products', fd);           toast('Product added') }

      setShowModal(false); setEditing(null); setForm(emptyForm); setImgFiles([]); setImgPreviews([])
      load()
    } catch(err) { toast(err.response?.data?.error || 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await api.delete(`/products/${delConfirm.id}`); toast('Product removed'); setDelConfirm(null); load() }
    catch { toast('Failed','error') }
    finally { setDeleting(false) }
  }

  const filtered = products.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()))

  const grossProfit = (p) => {
    const price = parseFloat(p.price||0)
    const cost  = parseFloat(p.material_cost||0)
    return price - cost
  }

  if (loading) return <LoadingPage />

  const inputStyle = { width:'100%', padding:'9px 12px', background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:13, fontFamily:'inherit', outline:'none', transition:'border-color 0.15s', minHeight:38 }
  const labelStyle = { display:'block', fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', margin:0 }}>Products</h1>
          <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>{filtered.length} products</p>
        </div>
        <button onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 2px 8px rgba(37,99,235,0.3)' }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
          Add Product
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search products..." />

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ background:'var(--card)', borderRadius:16, border:'1px solid var(--border)', padding:40, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
          <div style={{ fontWeight:700, color:'var(--text)', marginBottom:6 }}>No products found</div>
          <button onClick={openAdd} style={{ padding:'8px 20px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>Add First Product</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', cursor:'pointer', transition:'box-shadow 0.15s, transform 0.15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e=>{ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none' }}
              onClick={() => setDetail(p)}>
              {/* Image */}
              <div style={{ height:140, background:'var(--bg2)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
                {p.primary_image
                  ? <img src={p.primary_image} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <svg width="40" height="40" fill="none" stroke="var(--text3)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                }
                {p.category && <span style={{ position:'absolute', top:8, left:8, background:'rgba(0,0,0,0.6)', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{p.category}</span>}
              </div>
              {/* Info */}
              <div style={{ padding:'12px 14px' }}>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:6, lineHeight:1.3 }}>{p.name}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:18, fontWeight:800, color:'var(--primary)' }}>{fmt(p.price)}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>Commission: {fmt(p.commission)}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    {parseFloat(p.material_cost||0) > 0 && (
                      <div style={{ fontSize:11, color:'var(--green)', fontWeight:700 }}>GP: {fmt(grossProfit(p))}</div>
                    )}
                    <div style={{ fontSize:10, color:'var(--text3)' }}>{p.cgst_pct||0}+{p.sgst_pct||0}% GST</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, marginTop:10 }}>
                  <button onClick={e=>{ e.stopPropagation(); openEdit(p) }}
                    style={{ flex:1, padding:'7px 0', background:'var(--primary-bg)', color:'var(--primary)', border:'none', borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                    Edit
                  </button>
                  <button onClick={e=>{ e.stopPropagation(); setDelConfirm(p) }}
                    style={{ padding:'7px 12px', background:'var(--red-bg)', color:'var(--red)', border:'none', borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--card)', borderRadius:18, width:'100%', maxWidth:640, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            {/* Modal header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--card)', zIndex:1, borderRadius:'18px 18px 0 0' }}>
              <div>
                <div style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>{editing ? 'Edit Product' : 'Add New Product'}</div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:1 }}>Fill in product details below</div>
              </div>
              <button onClick={()=>setShowModal(false)} style={{ width:32, height:32, background:'var(--bg2)', border:'none', borderRadius:'50%', cursor:'pointer', color:'var(--text2)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
              {/* Basic Info */}
              <div style={{ background:'var(--bg2)', borderRadius:12, padding:14, display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Basic Information</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={labelStyle}>Product Name *</label>
                    <input style={inputStyle} value={form.name} onChange={upd('name')} placeholder="e.g. Wooden Chair" required
                      onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                  </div>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select style={inputStyle} value={form.category} onChange={upd('category')}>
                      {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Unit</label>
                    <input style={inputStyle} value={form.unit} onChange={upd('unit')} placeholder="Pcs."
                      onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                  </div>
                  <div>
                    <label style={labelStyle}>Selling Price (₹) *</label>
                    <input style={inputStyle} type="number" value={form.price} onChange={upd('price')} placeholder="0" min={0} required
                      onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                  </div>
                  <div>
                    <label style={labelStyle}>Commission (₹)</label>
                    <input style={inputStyle} type="number" value={form.commission} onChange={upd('commission')} placeholder="0" min={0}
                      onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={labelStyle}>Description</label>
                    <textarea style={{ ...inputStyle, minHeight:70, resize:'vertical' }} value={form.description} onChange={upd('description')} placeholder="Product description..."
                      onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                  </div>
                </div>
              </div>

              {/* GST */}
              <div style={{ background:'var(--bg2)', borderRadius:12, padding:14, display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>GST Settings</div>
                <div style={{ display:'flex', gap:8, marginBottom:4 }}>
                  {[['cgst_sgst','CGST + SGST (Intrastate)'],['igst','IGST (Interstate)']].map(([m,l])=>(
                    <button key={m} type="button" onClick={()=>{ setTaxMode(m); if(m==='igst'){setForm(p=>({...p,cgst_pct:'0',sgst_pct:'0'}))} else{setForm(p=>({...p,igst_pct:'0'}))} }}
                      style={{ flex:1, padding:'7px 12px', borderRadius:8, border:`2px solid ${taxMode===m?'var(--primary)':'var(--border)'}`, background:taxMode===m?'var(--primary-bg)':'transparent', color:taxMode===m?'var(--primary)':'var(--text2)', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ ...labelStyle, opacity:taxMode==='igst'?0.4:1 }}>CGST %</label>
                    <input style={{ ...inputStyle, opacity:taxMode==='igst'?0.5:1 }} type="number" value={taxMode==='igst'?'0':form.cgst_pct} onChange={upd('cgst_pct')} min={0} max={50} disabled={taxMode==='igst'}
                      onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, opacity:taxMode==='igst'?0.4:1 }}>SGST %</label>
                    <input style={{ ...inputStyle, opacity:taxMode==='igst'?0.5:1 }} type="number" value={taxMode==='igst'?'0':form.sgst_pct} onChange={upd('sgst_pct')} min={0} max={50} disabled={taxMode==='igst'}
                      onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, opacity:taxMode==='cgst_sgst'?0.4:1 }}>IGST %</label>
                    <input style={{ ...inputStyle, opacity:taxMode==='cgst_sgst'?0.5:1 }} type="number" value={taxMode==='cgst_sgst'?'0':form.igst_pct} onChange={upd('igst_pct')} min={0} max={100} disabled={taxMode==='cgst_sgst'}
                      onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                  </div>
                  <div>
                    <label style={labelStyle}>HSN Code</label>
                    <input style={inputStyle} value={form.hsn_code} onChange={upd('hsn_code')} placeholder="94036090"
                      onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                  </div>
                  <div style={{ gridColumn:'2/-1' }}>
                    <label style={labelStyle}>Total Tax</label>
                    <div style={{ ...inputStyle, background:'var(--bg2)', display:'flex', alignItems:'center', color:'var(--primary)', fontWeight:700 }}>
                      {taxMode==='igst' ? `${form.igst_pct||0}% IGST` : `${parseFloat(form.cgst_pct||0)+parseFloat(form.sgst_pct||0)}% (${form.cgst_pct||0}+${form.sgst_pct||0})`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Materials */}
              <div style={{ background:'var(--bg2)', borderRadius:12, padding:14, display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Bill of Materials <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(Optional)</span></div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={labelStyle}>Materials Used</label>
                    <input style={inputStyle} value={form.material_list} onChange={upd('material_list')} placeholder="Wood, Foam, Fabric, Nails, Glue..."
                      onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>Comma separated list of materials</div>
                  </div>
                  <div>
                    <label style={labelStyle}>Material Cost (₹) *</label>
                    <input style={inputStyle} type="number" value={form.material_cost} onChange={upd('material_cost')} placeholder="0" min={0}
                      onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                  </div>
                  <div>
                    <label style={labelStyle}>Gross Profit</label>
                    <div style={{ ...inputStyle, background:'var(--green-bg)', color:'var(--green)', fontWeight:800, display:'flex', alignItems:'center' }}>
                      {fmt((parseFloat(form.price)||0) - (parseFloat(form.material_cost)||0))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Images */}
              <div style={{ background:'var(--bg2)', borderRadius:12, padding:14 }}>
                <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Product Images</div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                  {imgPreviews.map((src,i) => (
                    <div key={i} style={{ position:'relative', width:80, height:80 }}>
                      <img src={src} style={{ width:80, height:80, borderRadius:8, objectFit:'cover', border:'2px solid var(--border)' }} alt="" />
                      <button type="button" onClick={()=>{ const p=[...imgPreviews]; p.splice(i,1); setImgPreviews(p); const f=[...imgFiles]; f.splice(i,1); setImgFiles(f) }}
                        style={{ position:'absolute', top:-6, right:-6, width:20, height:20, background:'var(--red)', color:'#fff', border:'none', borderRadius:'50%', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>✕</button>
                    </div>
                  ))}
                  <label style={{ width:80, height:80, border:'2px dashed var(--border)', borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text3)', fontSize:11, fontWeight:700, gap:4 }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
                    Add Photo
                    <input type="file" multiple accept="image/*" style={{ display:'none' }} onChange={handleImgChange} ref={fileRef} />
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label style={labelStyle}>Tags (comma separated)</label>
                <input style={inputStyle} value={form.tags} onChange={upd('tags')} placeholder="premium, best-seller, new-arrival"
                  onFocus={e=>e.target.style.borderColor='var(--primary)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:10, paddingTop:4 }}>
                <button type="button" onClick={()=>setShowModal(false)}
                  style={{ flex:1, padding:'11px', background:'var(--bg2)', color:'var(--text2)', border:'1px solid var(--border)', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex:2, padding:'11px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', opacity:saving?0.7:1 }}>
                  {saving ? '⏳ Saving…' : editing ? '✓ Update Product' : '✓ Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {detail && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--card)', borderRadius:18, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            {detail.primary_image && <div style={{ height:200, overflow:'hidden', borderRadius:'18px 18px 0 0' }}><img src={detail.primary_image} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt={detail.name}/></div>}
            <div style={{ padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:18, color:'var(--text)' }}>{detail.name}</div>
                  <span style={{ background:'var(--primary-bg)', color:'var(--primary)', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>{detail.category}</span>
                </div>
                <button onClick={()=>setDetail(null)} style={{ width:32, height:32, background:'var(--bg2)', border:'none', borderRadius:'50%', cursor:'pointer', color:'var(--text2)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>
              {detail.description && <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14, lineHeight:1.6 }}>{detail.description}</p>}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                {[
                  ['Selling Price', fmt(detail.price), 'var(--primary)'],
                  ['Commission', fmt(detail.commission), 'var(--green)'],
                  ['Material Cost', fmt(detail.material_cost||0), 'var(--red)'],
                  ['Gross Profit', fmt(grossProfit(detail)), parseFloat(grossProfit(detail))>=0?'var(--green)':'var(--red)'],
                  ['CGST', `${detail.cgst_pct||0}%`, 'var(--text)'],
                  ['SGST', `${detail.sgst_pct||0}%`, 'var(--text)'],
                  ...(parseFloat(detail.igst_pct||0)>0 ? [['IGST', `${detail.igst_pct}%`, 'var(--text)']] : []),
                  ['HSN Code', detail.hsn_code||'—', 'var(--text)'],
                  ['Unit', detail.unit||'Pcs.', 'var(--text)'],
                ].map(([l,v,c])=>(
                  <div key={l} style={{ background:'var(--bg2)', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:c }}>{v}</div>
                  </div>
                ))}
              </div>
              {detail.material_list && (
                <div style={{ background:'var(--bg2)', borderRadius:8, padding:'10px 12px', marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:4 }}>Materials Used</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {detail.material_list.split(',').map((m,i) => (
                      <span key={i} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:6, padding:'3px 10px', fontSize:12, color:'var(--text2)' }}>{m.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>{ openEdit(detail); setDetail(null) }} style={{ flex:1, padding:11, background:'var(--primary)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer' }}>Edit</button>
                <button onClick={()=>{ setDelConfirm(detail); setDetail(null) }} style={{ padding:'11px 16px', background:'var(--red-bg)', color:'var(--red)', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer' }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Confirm open={!!delConfirm} onClose={()=>setDelConfirm(null)} onConfirm={handleDelete} loading={deleting}
        title="Remove Product" message={`Remove "${delConfirm?.name}"? It will be marked inactive.`} confirmLabel="Remove" />
    </div>
  )
}
