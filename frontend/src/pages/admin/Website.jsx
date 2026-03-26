/**
 * Admin Website Management Page
 * Controls all content shown on the public-facing website
 */
import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { Modal, LoadingPage, useToast, Confirm } from '../../components/ui'

const CATEGORIES = ['Sofas','Beds','Chairs','Dining Sets','Coffee Tables','Wardrobes','Cabinets','Bookshelves','Study Tables','TV Units','Mattresses','Outdoor','Other']
const TAGS = ['Bestseller','New','Limited','Premium','Hot','Sale']
const ROOM_TYPES = ['Living Room','Bedroom','Dining Room','Study','Outdoor','Kitchen']
const PRESET_OFFERS = [
  'Free delivery on this order',
  '5-year craftsmanship warranty',
  'Easy EMI available',
  'Cash on delivery available',
  'Assembly included',
  '30-day return policy',
]

const inputStyle = {
  width:'100%', padding:'9px 12px',
  background:'var(--card)', border:'1.5px solid var(--border)',
  borderRadius:8, color:'var(--text)', fontSize:13,
  fontFamily:'inherit', outline:'none', minHeight:38,
}
const labelStyle = {
  display:'block', fontSize:11, fontWeight:700,
  color:'var(--text3)', textTransform:'uppercase',
  letterSpacing:'0.06em', marginBottom:5,
}

const SectionHeader = ({ title, subtitle }) => (
  <div style={{ borderBottom:'2px solid var(--primary)', paddingBottom:10, marginBottom:18 }}>
    <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>{title}</div>
    {subtitle && <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{subtitle}</div>}
  </div>
)

export default function AdminWebsite() {
  const toast = useToast()
  const [tab, setTab] = useState('settings')
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState({})
  const [settings, setSettings] = useState({})
  const [products, setProducts] = useState([])
  const [deals, setDeals] = useState([])
  const [saving, setSaving] = useState(false)

  // Product form
  const emptyProduct = { title:'', category:'Sofas', description:'', price:'', dashed_price:'', tag:'', brand:'Sunshine', dimensions:'', materials_used:'', weight:'', room_type:'Living Room', image_urls:[''], offers:[], sort_order:0 }
  const [prodModal, setProdModal] = useState(false)
  const [prodForm, setProdForm] = useState(emptyProduct)
  const [editingProd, setEditingProd] = useState(null)
  const [delProd, setDelProd] = useState(null)

  // Deal form
  const emptyDeal = { title:'', subtitle:'', description:'', discount_text:'' }
  const [dealModal, setDealModal] = useState(false)
  const [dealForm, setDealForm] = useState(emptyDeal)
  const [editingDeal, setEditingDeal] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, wRes] = await Promise.all([api.get('/company'), api.get('/website')])
      setCompany(cRes.data || {})
      setSettings(wRes.data?.settings || {})
      setProducts(wRes.data?.products || [])
      setDeals(wRes.data?.deals || [])
    } catch(e) { toast('Failed to load','error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const discountCalc = (orig, actual) => {
    const o = parseFloat(orig), a = parseFloat(actual)
    if (o > 0 && a > 0 && o > a) return Math.round(((o - a) / o) * 100)
    return 0
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await api.put('/website/settings', settings)
      toast('Website settings saved')
    } catch { toast('Failed','error') }
    finally { setSaving(false) }
  }

  const saveProd = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...prodForm, image_urls: prodForm.image_urls.filter(Boolean), discount_pct: discountCalc(prodForm.dashed_price, prodForm.price) }
      if (editingProd) await api.put(`/website/products/${editingProd}`, payload)
      else await api.post('/website/products', payload)
      toast(editingProd ? 'Product updated' : 'Product added')
      setProdModal(false); setProdForm(emptyProduct); setEditingProd(null); load()
    } catch(err) { toast(err.response?.data?.error || 'Failed','error') }
    finally { setSaving(false) }
  }

  const saveDeal = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editingDeal) await api.put(`/website/deals/${editingDeal}`, dealForm)
      else await api.post('/website/deals', dealForm)
      toast(editingDeal ? 'Deal updated' : 'Deal added')
      setDealModal(false); setDealForm(emptyDeal); setEditingDeal(null); load()
    } catch { toast('Failed','error') }
    finally { setSaving(false) }
  }

  const openEditProd = (p) => {
    let imgs = []
    try { imgs = typeof p.image_urls === 'string' ? JSON.parse(p.image_urls) : (p.image_urls || []) } catch { imgs = [] }
    let offers = []
    try { offers = typeof p.offers === 'string' ? JSON.parse(p.offers) : (p.offers || []) } catch { offers = [] }
    setProdForm({ ...p, image_urls: imgs.length ? imgs : [''], offers })
    setEditingProd(p.id); setProdModal(true)
  }

  const openEditDeal = (d) => { setDealForm(d); setEditingDeal(d.id); setDealModal(true) }

  const delProduct = async () => {
    try { await api.delete(`/website/products/${delProd.id}`); toast('Product removed'); setDelProd(null); load() }
    catch { toast('Failed','error') }
  }

  const TABS = [
    { id:'settings', label:'Settings & Socials' },
    { id:'products', label:'Website Products' },
    { id:'deals',    label:'Offers & Deals' },
  ]

  if (loading) return <LoadingPage />

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', margin:0 }}>Website Management</h1>
        <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>Control the public-facing website content</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'var(--bg2)', padding:3, borderRadius:10 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
              background: tab===t.id?'var(--card)':'transparent',
              color:       tab===t.id?'var(--primary)':'var(--text2)',
              boxShadow:   tab===t.id?'var(--shadow)':'none', transition:'all 0.12s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Company info is in Company page - just show a note */}
          <div style={{ background:'var(--primary-bg)', border:'1px solid var(--primary)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'var(--primary)', fontWeight:600 }}>
            Company name, logo, address, phone, email are managed in the Company Settings page.
            Configure social media and website-specific content here.
          </div>

          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            <SectionHeader title="Website Content" subtitle="Text shown on the public website" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle}>Hero Tagline</label>
                <input style={inputStyle} value={settings.tagline||''} onChange={e=>setSettings(p=>({...p,tagline:e.target.value}))} placeholder="Our Quality is Our Brand" />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle}>Hero Subtitle</label>
                <textarea style={{ ...inputStyle, minHeight:70, resize:'vertical' }} value={settings.hero_subtitle||''} onChange={e=>setSettings(p=>({...p,hero_subtitle:e.target.value}))} placeholder="From modern minimalism to rich traditional craftsmanship..." />
              </div>
              <div>
                <label style={labelStyle}>Speciality Section Title</label>
                <input style={inputStyle} value={settings.speciality_title||''} onChange={e=>setSettings(p=>({...p,speciality_title:e.target.value}))} placeholder="Our Speciality Collection" />
              </div>
              <div>
                <label style={labelStyle}>Whatsapp Number</label>
                <input style={inputStyle} value={settings.whatsapp_number||''} onChange={e=>setSettings(p=>({...p,whatsapp_number:e.target.value}))} placeholder="+91 98765 43210" />
              </div>
            </div>
          </div>

          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            <SectionHeader title="Social Media Links" subtitle="Icons will appear in footer and contact page" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[['facebook_url','Facebook URL','https://facebook.com/yourpage'],['instagram_url','Instagram URL','https://instagram.com/yourpage'],['youtube_url','YouTube URL','https://youtube.com/@yourchannel'],['linkedin_url','LinkedIn URL','https://linkedin.com/company/yourco']].map(([k,l,p])=>(
                <div key={k}>
                  <label style={labelStyle}>{l}</label>
                  <input style={inputStyle} value={settings[k]||''} onChange={e=>setSettings(prev=>({...prev,[k]:e.target.value}))} placeholder={p} />
                </div>
              ))}
            </div>
          </div>

          <button onClick={saveSettings} disabled={saving}
            style={{ alignSelf:'flex-start', padding:'10px 24px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', opacity:saving?0.7:1 }}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Products Tab */}
      {tab === 'products' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontSize:12, color:'var(--text3)' }}>{products.length} website products · separate from ERP products</p>
            <button onClick={()=>{ setProdForm(emptyProduct); setEditingProd(null); setProdModal(true) }}
              style={{ padding:'8px 16px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:12, cursor:'pointer' }}>
              + Add Website Product
            </button>
          </div>
          {products.length === 0 ? (
            <div style={{ background:'var(--card)', borderRadius:14, border:'1px solid var(--border)', padding:40, textAlign:'center', color:'var(--text3)' }}>
              No website products yet. Add products to showcase on the public website.
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
              {products.map(p => {
                let imgs = []
                try { imgs = typeof p.image_urls==='string' ? JSON.parse(p.image_urls) : (p.image_urls||[]) } catch { imgs = [] }
                return (
                  <div key={p.id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                    <div style={{ height:140, background:'var(--bg2)', overflow:'hidden', position:'relative' }}>
                      {imgs[0] ? <img src={imgs[0]} alt={p.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text3)', fontSize:12 }}>No image</div>
                      )}
                      {p.tag && <span style={{ position:'absolute', top:8, right:8, background:'var(--primary)', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:4, textTransform:'uppercase' }}>{p.tag}</span>}
                    </div>
                    <div style={{ padding:'10px 12px' }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:4 }}>{p.title}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>{p.category}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                        <span style={{ fontWeight:700, color:'var(--primary)' }}>Rs. {parseFloat(p.price||0).toLocaleString()}</span>
                        {p.dashed_price && <span style={{ fontSize:11, color:'var(--text3)', textDecoration:'line-through' }}>Rs. {parseFloat(p.dashed_price).toLocaleString()}</span>}
                        {p.discount_pct > 0 && <span style={{ fontSize:10, fontWeight:700, color:'var(--green)' }}>{p.discount_pct}% off</span>}
                      </div>
                      <div style={{ display:'flex', gap:6, marginTop:10 }}>
                        <button onClick={()=>openEditProd(p)} style={{ flex:1, padding:'5px', background:'var(--primary-bg)', color:'var(--primary)', border:'none', borderRadius:7, fontWeight:700, fontSize:11, cursor:'pointer' }}>Edit</button>
                        <button onClick={()=>setDelProd(p)} style={{ padding:'5px 8px', background:'var(--red-bg)', color:'var(--red)', border:'none', borderRadius:7, fontWeight:700, fontSize:11, cursor:'pointer' }}>Del</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Deals Tab */}
      {tab === 'deals' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontSize:12, color:'var(--text3)' }}>{deals.length} offers/deals shown on website</p>
            <button onClick={()=>{ setDealForm(emptyDeal); setEditingDeal(null); setDealModal(true) }}
              style={{ padding:'8px 16px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:12, cursor:'pointer' }}>
              + Add Deal
            </button>
          </div>
          {deals.map(d => (
            <div key={d.id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{d.title}</div>
                {d.subtitle && <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>{d.subtitle}</div>}
                {d.discount_text && <span style={{ fontSize:11, fontWeight:700, color:'var(--green)', marginTop:4, display:'block' }}>{d.discount_text}</span>}
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button onClick={()=>openEditDeal(d)} style={{ padding:'4px 10px', background:'var(--primary-bg)', color:'var(--primary)', border:'none', borderRadius:7, fontWeight:700, fontSize:11, cursor:'pointer' }}>Edit</button>
              </div>
            </div>
          ))}
          {deals.length === 0 && <div style={{ background:'var(--card)', borderRadius:12, border:'1px solid var(--border)', padding:32, textAlign:'center', color:'var(--text3)' }}>No deals added yet</div>}
        </div>
      )}

      {/* Product Modal */}
      <Modal open={prodModal} onClose={()=>setProdModal(false)} title={editingProd?'Edit Website Product':'Add Website Product'} size="xl">
        <form onSubmit={saveProd} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:'var(--bg2)', borderRadius:10, padding:14, display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', textTransform:'uppercase' }}>Product Info</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle}>Product Title *</label>
                <input style={inputStyle} value={prodForm.title} onChange={e=>setProdForm(p=>({...p,title:e.target.value}))} required placeholder="e.g. Velvet Luxe Sofa" />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select style={inputStyle} value={prodForm.category} onChange={e=>setProdForm(p=>({...p,category:e.target.value}))}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tag</label>
                <select style={inputStyle} value={prodForm.tag} onChange={e=>setProdForm(p=>({...p,tag:e.target.value}))}>
                  <option value="">No tag</option>
                  {TAGS.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Price (Rs.) *</label>
                <input style={inputStyle} type="number" value={prodForm.price} onChange={e=>setProdForm(p=>({...p,price:e.target.value}))} required />
              </div>
              <div>
                <label style={labelStyle}>Dashed Price (Rs.)</label>
                <input style={inputStyle} type="number" value={prodForm.dashed_price||''} onChange={e=>setProdForm(p=>({...p,dashed_price:e.target.value}))} placeholder="Original / MRP" />
              </div>
              <div>
                <label style={labelStyle}>Discount (auto-calc)</label>
                <div style={{ ...inputStyle, background:'var(--green-bg)', color:'var(--green)', fontWeight:800, display:'flex', alignItems:'center' }}>
                  {discountCalc(prodForm.dashed_price, prodForm.price)}%
                </div>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, minHeight:70, resize:'vertical' }} value={prodForm.description} onChange={e=>setProdForm(p=>({...p,description:e.target.value}))} placeholder="Product description..." />
              </div>
            </div>
          </div>

          <div style={{ background:'var(--bg2)', borderRadius:10, padding:14, display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', textTransform:'uppercase' }}>Specifications</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <div>
                <label style={labelStyle}>Brand</label>
                <input style={inputStyle} value={prodForm.brand||''} onChange={e=>setProdForm(p=>({...p,brand:e.target.value}))} placeholder="Sunshine" />
              </div>
              <div>
                <label style={labelStyle}>Room Type</label>
                <select style={inputStyle} value={prodForm.room_type||''} onChange={e=>setProdForm(p=>({...p,room_type:e.target.value}))}>
                  {ROOM_TYPES.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Weight</label>
                <input style={inputStyle} value={prodForm.weight||''} onChange={e=>setProdForm(p=>({...p,weight:e.target.value}))} placeholder="48 kg" />
              </div>
              <div>
                <label style={labelStyle}>Dimensions</label>
                <input style={inputStyle} value={prodForm.dimensions||''} onChange={e=>setProdForm(p=>({...p,dimensions:e.target.value}))} placeholder="220x85x80 cm" />
              </div>
              <div style={{ gridColumn:'2/-1' }}>
                <label style={labelStyle}>Materials Used</label>
                <input style={inputStyle} value={prodForm.materials_used||''} onChange={e=>setProdForm(p=>({...p,materials_used:e.target.value}))} placeholder="Velvet, Solid Teak, Foam" />
              </div>
            </div>
          </div>

          <div style={{ background:'var(--bg2)', borderRadius:10, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', marginBottom:10 }}>Product Offers (shown on product page)</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {PRESET_OFFERS.map(offer => (
                <label key={offer} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
                  <input type="checkbox" checked={prodForm.offers.includes(offer)}
                    onChange={e=>setProdForm(p=>({ ...p, offers: e.target.checked ? [...p.offers, offer] : p.offers.filter(o=>o!==offer) }))}
                    style={{ width:14, height:14, accentColor:'var(--primary)' }} />
                  {offer}
                </label>
              ))}
            </div>
          </div>

          <div style={{ background:'var(--bg2)', borderRadius:10, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', marginBottom:10 }}>Product Images (URLs)</div>
            {prodForm.image_urls.map((url, i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                <input style={{ ...inputStyle, flex:1 }} value={url} onChange={e=>{ const imgs=[...prodForm.image_urls]; imgs[i]=e.target.value; setProdForm(p=>({...p,image_urls:imgs})) }} placeholder="https://example.com/image.jpg" />
                {prodForm.image_urls.length > 1 && (
                  <button type="button" onClick={()=>setProdForm(p=>({...p,image_urls:p.image_urls.filter((_,j)=>j!==i)}))}
                    style={{ padding:'0 10px', background:'var(--red-bg)', color:'var(--red)', border:'none', borderRadius:7, fontWeight:800, cursor:'pointer' }}>x</button>
                )}
              </div>
            ))}
            <button type="button" onClick={()=>setProdForm(p=>({...p,image_urls:[...p.image_urls,'']}))}
              style={{ padding:'5px 14px', background:'var(--bg2)', border:'1px dashed var(--border)', borderRadius:7, fontSize:12, color:'var(--text2)', cursor:'pointer', fontWeight:600 }}>
              + Add Image URL
            </button>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={()=>setProdModal(false)} style={{ flex:1, padding:'10px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', color:'var(--text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex:2, padding:'10px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', opacity:saving?0.7:1 }}>
              {saving ? 'Saving...' : editingProd ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deal Modal */}
      <Modal open={dealModal} onClose={()=>setDealModal(false)} title={editingDeal?'Edit Deal':'Add Deal/Offer'}>
        <form onSubmit={saveDeal} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[['title','Title *','e.g. Monsoon Sale','true'],['subtitle','Subtitle','e.g. Up to 40% OFF on all sofas',''],['discount_text','Discount Text','e.g. 40% OFF',''],['description','Description','Additional details...','']].map(([k,l,ph,req])=>(
            <div key={k}>
              <label style={labelStyle}>{l}</label>
              <input style={inputStyle} value={dealForm[k]||''} onChange={e=>setDealForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} required={req==='true'} />
            </div>
          ))}
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={()=>setDealModal(false)} style={{ flex:1, padding:'10px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', color:'var(--text2)' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex:2, padding:'10px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer' }}>
              {saving ? 'Saving...' : editingDeal ? 'Update Deal' : 'Add Deal'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm open={!!delProd} onClose={()=>setDelProd(null)} onConfirm={delProduct} title="Remove Product" message={`Remove "${delProd?.title}" from website?`} confirmLabel="Remove" />
    </div>
  )
}
