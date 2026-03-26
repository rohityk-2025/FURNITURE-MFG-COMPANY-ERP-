import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useToast, LoadingPage } from '../../components/ui'

/* ── Constants ── */
const TABS = ['Company Info', 'Products', 'Deals', 'Speciality']

const CATEGORIES = ['Sofas', 'Beds', 'Chairs', 'Dining', 'Tables', 'Wardrobes',
  'Cabinets', 'Coffee Tables', 'Bookshelves', 'TV Units', 'Mattresses',
  'Curtains', 'Kitchen Tables', 'Study Tables', 'Other']

const TAGS = ['Bestseller', 'New', 'Limited', 'Hot', 'Premium', '']

const OFFER_OPTIONS = [
  '5-year craftsmanship warranty',
  'Free delivery on this order',
  'Free installation included',
  'EMI available at 0% interest',
  'Exchange offer available',
]

const emptyProduct = {
  title: '', description: '', price: '', original_price: '', category: 'Sofas',
  tag: '', material: '', brand: '', dimensions: '', weight: '', room_type: '',
  offers: [], image_urls: '', sort_order: 0, is_active: 1,
}

const emptyDeal = {
  title: '', subtitle: '', description: '',
  bg_color: '#2C2420', text_color: '#E8C97A',
  cta_text: 'Shop Now', is_active: 1, sort_order: 0,
}

/* ── Styles ── */
const s = {
  page:       { padding: '28px 32px' },
  heading:    { fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  subtext:    { fontSize: 13, color: 'var(--text2)', marginBottom: 24 },
  tabs:       { display: 'flex', gap: 4, marginBottom: 28, borderBottom: '2px solid var(--border)' },
  tab:        (active) => ({
    padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: 'none', border: 'none', color: active ? 'var(--primary)' : 'var(--text2)',
    borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
    marginBottom: -2, transition: 'all 0.2s',
  }),
  card:       { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 20 },
  sectionHd:  { fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 },
  grid2:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  grid3:      { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
  label:      { fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
  input:      { width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none' },
  textarea:   { width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical', minHeight: 80 },
  btn:        { padding: '10px 22px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'opacity 0.2s' },
  btnPrimary: { background: 'var(--primary)', color: '#fff' },
  btnDanger:  { background: '#ef4444', color: '#fff' },
  btnGhost:   { background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid var(--border)', background: 'var(--bg2)' },
  td:         { padding: '12px 14px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' },
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' },
  modal:      { background: 'var(--bg)', borderRadius: 12, width: '100%', maxWidth: 700, padding: 28, position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
  modalHd:    { fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 20 },
  badge:      (active) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 600,
    background: active ? 'var(--green-bg, #dcfce7)' : 'var(--red-bg, #fee2e2)',
    color: active ? 'var(--green, #16a34a)' : 'var(--red, #dc2626)',
  }),
}

function Field({ label, children }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════
   TAB 1: Company Info
══════════════════════════════════════════ */
function CompanyTab() {
  const toast = useToast()
  const [info, setInfo] = useState({
    company_name: '', tagline: '', est_year: '', address: '', phone: '', email: '',
    website_url: '', facebook: '', instagram: '', twitter: '', youtube: '',
    hero_tagline: '', brand_story: '', stat_customers: '', stat_experience: '',
    stat_products: '', stat_tagline: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/website/info').then(r => {
      setInfo(prev => ({ ...prev, ...r.data }))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const upd = (k) => (e) => setInfo(p => ({ ...p, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/website/info', info)
      toast('Company info saved')
    } catch { toast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingPage />

  return (
    <div>
      {/* Basic Info */}
      <div style={s.card}>
        <p style={s.sectionHd}>Basic Information</p>
        <div style={s.grid2}>
          <Field label="Company Name"><input style={s.input} value={info.company_name} onChange={upd('company_name')} placeholder="e.g. Sunshine Furniture" /></Field>
          <Field label="Tagline"><input style={s.input} value={info.tagline} onChange={upd('tagline')} placeholder="e.g. Our Quality is Our Brand" /></Field>
          <Field label="Established Year"><input style={s.input} value={info.est_year} onChange={upd('est_year')} placeholder="e.g. 2004" /></Field>
          <Field label="Website URL"><input style={s.input} value={info.website_url} onChange={upd('website_url')} placeholder="https://..." /></Field>
        </div>
      </div>

      {/* Contact */}
      <div style={s.card}>
        <p style={s.sectionHd}>Contact Details</p>
        <div style={s.grid3}>
          <Field label="Phone"><input style={s.input} value={info.phone} onChange={upd('phone')} placeholder="+91 98765 43210" /></Field>
          <Field label="Email"><input style={s.input} value={info.email} onChange={upd('email')} placeholder="hello@company.in" /></Field>
          <Field label="Address"><input style={s.input} value={info.address} onChange={upd('address')} placeholder="City, State PIN" /></Field>
        </div>
      </div>

      {/* Social Media */}
      <div style={s.card}>
        <p style={s.sectionHd}>Social Media Links</p>
        <div style={s.grid2}>
          <Field label="Facebook URL"><input style={s.input} value={info.facebook} onChange={upd('facebook')} placeholder="https://facebook.com/..." /></Field>
          <Field label="Instagram URL"><input style={s.input} value={info.instagram} onChange={upd('instagram')} placeholder="https://instagram.com/..." /></Field>
          <Field label="Twitter / X URL"><input style={s.input} value={info.twitter} onChange={upd('twitter')} placeholder="https://twitter.com/..." /></Field>
          <Field label="YouTube URL"><input style={s.input} value={info.youtube} onChange={upd('youtube')} placeholder="https://youtube.com/..." /></Field>
        </div>
      </div>

      {/* Hero / Stats */}
      <div style={s.card}>
        <p style={s.sectionHd}>Homepage Hero &amp; Stats</p>
        <div style={{ marginBottom: 16 }}>
          <Field label="Hero Tagline (shown on homepage hero section)">
            <input style={s.input} value={info.hero_tagline} onChange={upd('hero_tagline')} placeholder="e.g. From modern minimalism to rich traditional craftsmanship" />
          </Field>
        </div>
        <div style={s.grid2}>
          <Field label="Stat: Customers"><input style={s.input} value={info.stat_customers} onChange={upd('stat_customers')} placeholder="e.g. 2000+" /></Field>
          <Field label="Stat: Experience"><input style={s.input} value={info.stat_experience} onChange={upd('stat_experience')} placeholder="e.g. 20+ Years" /></Field>
          <Field label="Stat: Products"><input style={s.input} value={info.stat_products} onChange={upd('stat_products')} placeholder="e.g. 150+" /></Field>
          <Field label="Stat: Pricing Tagline"><input style={s.input} value={info.stat_tagline} onChange={upd('stat_tagline')} placeholder="e.g. 100% Affordable" /></Field>
        </div>
      </div>

      {/* Brand Story */}
      <div style={s.card}>
        <p style={s.sectionHd}>Brand Story (About Page)</p>
        <Field label="Brand Story Paragraph">
          <textarea style={s.textarea} rows={5} value={info.brand_story} onChange={upd('brand_story')} placeholder="Write your brand story here..." />
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Company Info'}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   TAB 2: Products
══════════════════════════════════════════ */
function ProductsTab() {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(emptyProduct)
  const [saving, setSaving]     = useState(false)
  const [delId, setDelId]       = useState(null)

  const load = async () => {
    try {
      const r = await api.get('/website/products')
      setProducts(r.data)
    } catch { toast('Failed to load', 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const upd = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const toggleOffer = (offer) => {
    setForm(p => ({
      ...p,
      offers: p.offers.includes(offer) ? p.offers.filter(o => o !== offer) : [...p.offers, offer],
    }))
  }

  const openAdd = () => {
    setEditing(null); setForm(emptyProduct); setModal(true)
  }

  const openEdit = (p) => {
    setEditing(p.id)
    const offers = typeof p.offers === 'string' ? JSON.parse(p.offers || '[]') : (p.offers || [])
    const images = typeof p.image_urls === 'string' && p.image_urls.startsWith('[')
      ? JSON.parse(p.image_urls).join('\n')
      : (p.image_urls || '')
    setForm({
      title: p.title || '', description: p.description || '',
      price: p.price || '', original_price: p.original_price || '',
      category: p.category || 'Sofas', tag: p.tag || '',
      material: p.material || '', brand: p.brand || '',
      dimensions: p.dimensions || '', weight: p.weight || '',
      room_type: p.room_type || '', offers, image_urls: images,
      sort_order: p.sort_order || 0, is_active: p.is_active ?? 1,
    })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast('Title is required', 'error'); return }
    if (!form.price) { toast('Price is required', 'error'); return }
    setSaving(true)
    try {
      // Convert newline-separated image URLs to JSON array
      const imageArr = form.image_urls.split('\n').map(u => u.trim()).filter(Boolean)
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        original_price: parseFloat(form.original_price) || 0,
        sort_order: parseInt(form.sort_order) || 0,
        is_active: parseInt(form.is_active),
        image_urls: JSON.stringify(imageArr),
        offers: JSON.stringify(form.offers),
      }
      if (editing) {
        await api.put(`/website/products/${editing}`, payload)
        toast('Product updated')
      } else {
        await api.post('/website/products', payload)
        toast('Product added')
      }
      setModal(false); load()
    } catch { toast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/website/products/${id}`)
      toast('Product deleted'); setDelId(null); load()
    } catch { toast('Failed to delete', 'error') }
  }

  const discount = form.price && form.original_price
    ? Math.round(((form.original_price - form.price) / form.original_price) * 100)
    : 0

  if (loading) return <LoadingPage />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={openAdd}>+ Add Product</button>
      </div>

      {products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>No products yet. Add your first website product.</div>
      ) : (
        <div style={s.card}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Title</th>
                <th style={s.th}>Category</th>
                <th style={s.th}>Price</th>
                <th style={s.th}>Tag</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td style={s.td}><strong>{p.title}</strong></td>
                  <td style={s.td}>{p.category}</td>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600 }}>₹{Number(p.price).toLocaleString('en-IN')}</div>
                    {p.original_price > 0 && <div style={{ fontSize: 11, color: 'var(--text2)', textDecoration: 'line-through' }}>₹{Number(p.original_price).toLocaleString('en-IN')}</div>}
                  </td>
                  <td style={s.td}>{p.tag || '—'}</td>
                  <td style={s.td}><span style={s.badge(p.is_active)}>{p.is_active ? 'Active' : 'Hidden'}</span></td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ ...s.btn, ...s.btnGhost, padding: '6px 14px' }} onClick={() => openEdit(p)}>Edit</button>
                      <button style={{ ...s.btn, ...s.btnDanger, padding: '6px 14px' }} onClick={() => setDelId(p.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Modal */}
      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={s.modal}>
            <p style={s.modalHd}>{editing ? 'Edit Product' : 'Add Website Product'}</p>
            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Title *"><input style={s.input} value={form.title} onChange={upd('title')} placeholder="e.g. Velvet Luxe Sofa" required /></Field>
                <Field label="Description">
                  <textarea style={s.textarea} value={form.description} onChange={upd('description')} placeholder="Describe this product..." />
                </Field>
                <div style={s.grid3}>
                  <Field label="Price (INR) *"><input type="number" style={s.input} value={form.price} onChange={upd('price')} placeholder="45000" /></Field>
                  <Field label="Original Price (INR)">
                    <input type="number" style={s.input} value={form.original_price} onChange={upd('original_price')} placeholder="60000" />
                  </Field>
                  <Field label={`Discount${discount > 0 ? ` (${discount}%)` : ''}`}>
                    <input style={{ ...s.input, background: 'var(--bg2)', color: 'var(--text2)' }} value={discount > 0 ? `${discount}% off` : '—'} readOnly />
                  </Field>
                </div>
                <div style={s.grid2}>
                  <Field label="Category">
                    <select style={s.input} value={form.category} onChange={upd('category')}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Tag">
                    <select style={s.input} value={form.tag} onChange={upd('tag')}>
                      <option value="">None</option>
                      {TAGS.filter(Boolean).map(t => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Material"><input style={s.input} value={form.material} onChange={upd('material')} placeholder="e.g. Solid Teak" /></Field>
                  <Field label="Brand"><input style={s.input} value={form.brand} onChange={upd('brand')} placeholder="e.g. Sunshine" /></Field>
                  <Field label="Dimensions"><input style={s.input} value={form.dimensions} onChange={upd('dimensions')} placeholder="e.g. 220×85×80 cm" /></Field>
                  <Field label="Weight"><input style={s.input} value={form.weight} onChange={upd('weight')} placeholder="e.g. 48kg" /></Field>
                  <Field label="Room Type"><input style={s.input} value={form.room_type} onChange={upd('room_type')} placeholder="e.g. Living Room" /></Field>
                  <Field label="Sort Order"><input type="number" style={s.input} value={form.sort_order} onChange={upd('sort_order')} /></Field>
                </div>
                <Field label="Status">
                  <select style={s.input} value={form.is_active} onChange={upd('is_active')}>
                    <option value={1}>Active (visible on website)</option>
                    <option value={0}>Hidden</option>
                  </select>
                </Field>
                <Field label="Offers / Highlights (check all that apply)">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 7 }}>
                    {OFFER_OPTIONS.map(o => (
                      <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.offers.includes(o)} onChange={() => toggleOffer(o)} />
                        {o}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Image URLs (one per line)">
                  <textarea style={s.textarea} rows={4} value={form.image_urls} onChange={upd('image_urls')} placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg" />
                </Field>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                  <button type="button" style={{ ...s.btn, ...s.btnGhost }} onClick={() => setModal(false)}>Cancel</button>
                  <button type="submit" style={{ ...s.btn, ...s.btnPrimary }} disabled={saving}>{saving ? 'Saving...' : 'Save Product'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delId && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setDelId(null)}>
          <div style={{ ...s.modal, maxWidth: 400, textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>Delete Product?</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>This will remove the product from the website permanently.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={{ ...s.btn, ...s.btnGhost }} onClick={() => setDelId(null)}>Cancel</button>
              <button style={{ ...s.btn, ...s.btnDanger }} onClick={() => handleDelete(delId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   TAB 3: Deals
══════════════════════════════════════════ */
function DealsTab() {
  const toast = useToast()
  const [deals, setDeals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]     = useState(emptyDeal)
  const [saving, setSaving] = useState(false)
  const [delId, setDelId]   = useState(null)

  const load = async () => {
    try { const r = await api.get('/website/deals'); setDeals(r.data) }
    catch { toast('Failed to load', 'error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const upd = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const openAdd = () => { setEditing(null); setForm(emptyDeal); setModal(true) }

  const openEdit = (d) => {
    setEditing(d.id)
    setForm({
      title: d.title || '', subtitle: d.subtitle || '', description: d.description || '',
      bg_color: d.bg_color || '#2C2420', text_color: d.text_color || '#E8C97A',
      cta_text: d.cta_text || 'Shop Now', is_active: d.is_active ?? 1, sort_order: d.sort_order || 0,
    })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast('Title is required', 'error'); return }
    setSaving(true)
    try {
      if (editing) { await api.put(`/website/deals/${editing}`, form); toast('Deal updated') }
      else         { await api.post('/website/deals', form);           toast('Deal added') }
      setModal(false); load()
    } catch { toast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/website/deals/${id}`); toast('Deal deleted'); setDelId(null); load() }
    catch { toast('Failed to delete', 'error') }
  }

  if (loading) return <LoadingPage />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={openAdd}>+ Add Deal</button>
      </div>

      {deals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>No deals yet. Add your first promotional deal.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {deals.map(d => (
            <div key={d.id} style={{ ...s.card, borderRadius: 8, overflow: 'hidden', padding: 0 }}>
              <div style={{ background: d.bg_color, padding: '28px 24px', minHeight: 120, position: 'relative' }}>
                <p style={{ color: d.text_color, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Limited Time</p>
                <p style={{ fontFamily: 'serif', fontSize: 24, color: '#FDFAF7', fontWeight: 300, marginBottom: 6 }}>{d.title}</p>
                <p style={{ color: 'rgba(253,250,247,0.7)', fontSize: 14 }}>{d.subtitle}</p>
                <div style={{ marginTop: 16, display: 'inline-block', background: d.text_color, color: d.bg_color, padding: '8px 20px', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
                  {d.cta_text}
                </div>
                <span style={s.badge(d.is_active)}
                  className=""
                  style={{ position: 'absolute', top: 12, right: 12, ...s.badge(d.is_active) }}>
                  {d.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                <button style={{ ...s.btn, ...s.btnGhost, padding: '6px 14px', flex: 1 }} onClick={() => openEdit(d)}>Edit</button>
                <button style={{ ...s.btn, ...s.btnDanger, padding: '6px 14px' }} onClick={() => setDelId(d.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deal Modal */}
      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={s.modal}>
            <p style={s.modalHd}>{editing ? 'Edit Deal' : 'Add Deal'}</p>
            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={s.grid2}>
                  <Field label="Title *"><input style={s.input} value={form.title} onChange={upd('title')} placeholder="e.g. Monsoon Sale" required /></Field>
                  <Field label="Subtitle"><input style={s.input} value={form.subtitle} onChange={upd('subtitle')} placeholder="e.g. Up to 40% OFF on all sofas" /></Field>
                </div>
                <Field label="Description"><textarea style={s.textarea} value={form.description} onChange={upd('description')} placeholder="Optional additional details..." /></Field>
                <div style={s.grid2}>
                  <Field label="CTA Button Text"><input style={s.input} value={form.cta_text} onChange={upd('cta_text')} placeholder="Shop Now" /></Field>
                  <Field label="Sort Order"><input type="number" style={s.input} value={form.sort_order} onChange={upd('sort_order')} /></Field>
                </div>
                <div style={s.grid2}>
                  <Field label="Background Color">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={form.bg_color} onChange={upd('bg_color')} style={{ width: 44, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
                      <input style={{ ...s.input, flex: 1 }} value={form.bg_color} onChange={upd('bg_color')} />
                    </div>
                  </Field>
                  <Field label="Text / Accent Color">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={form.text_color} onChange={upd('text_color')} style={{ width: 44, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
                      <input style={{ ...s.input, flex: 1 }} value={form.text_color} onChange={upd('text_color')} />
                    </div>
                  </Field>
                </div>
                <Field label="Status">
                  <select style={s.input} value={form.is_active} onChange={upd('is_active')}>
                    <option value={1}>Active (visible on website)</option>
                    <option value={0}>Hidden</option>
                  </select>
                </Field>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                  <button type="button" style={{ ...s.btn, ...s.btnGhost }} onClick={() => setModal(false)}>Cancel</button>
                  <button type="submit" style={{ ...s.btn, ...s.btnPrimary }} disabled={saving}>{saving ? 'Saving...' : 'Save Deal'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {delId && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setDelId(null)}>
          <div style={{ ...s.modal, maxWidth: 400, textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>Delete Deal?</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>This will remove the deal banner from the website.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={{ ...s.btn, ...s.btnGhost }} onClick={() => setDelId(null)}>Cancel</button>
              <button style={{ ...s.btn, ...s.btnDanger }} onClick={() => handleDelete(delId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   TAB 4: Speciality Showcase
══════════════════════════════════════════ */
function SpecialityTab() {
  const toast = useToast()
  const [allProducts, setAllProducts] = useState([])
  const [selected, setSelected]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/website/products'),
      api.get('/website/speciality'),
    ]).then(([all, spec]) => {
      setAllProducts(all.data)
      // spec.data has the currently featured product ids in order
      const ids = spec.data.map(s => s.id)
      setSelected(ids)
    }).catch(() => toast('Failed to load', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const moveUp = (idx) => {
    if (idx === 0) return
    const a = [...selected]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; setSelected(a)
  }
  const moveDown = (idx) => {
    if (idx === selected.length - 1) return
    const a = [...selected]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; setSelected(a)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/website/speciality', { product_ids: selected })
      toast('Speciality showcase saved')
    } catch { toast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingPage />

  const selectedProducts = selected.map(id => allProducts.find(p => p.id === id)).filter(Boolean)
  const unselected = allProducts.filter(p => !selected.includes(p.id))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Left: All products to pick from */}
      <div style={s.card}>
        <p style={s.sectionHd}>Available Products</p>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Click to add to the showcase</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
          {unselected.length === 0 && <p style={{ color: 'var(--text2)', fontSize: 13 }}>All products are selected.</p>}
          {unselected.map(p => (
            <div key={p.id} onClick={() => toggle(p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 18, color: 'var(--text2)' }}>+</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text2)' }}>{p.category} · ₹{Number(p.price).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Selected products in order */}
      <div style={s.card}>
        <p style={s.sectionHd}>Showcase Order ({selected.length} selected)</p>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>These appear in the "Our Speciality Collection" section</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto', marginBottom: 16 }}>
          {selectedProducts.length === 0 && <p style={{ color: 'var(--text2)', fontSize: 13 }}>No products selected yet.</p>}
          {selectedProducts.map((p, idx) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--primary)', borderRadius: 8, background: 'var(--bg)' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', width: 20, textAlign: 'center' }}>{idx + 1}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text2)' }}>{p.category}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button style={{ ...s.btn, ...s.btnGhost, padding: '2px 8px', fontSize: 11 }} onClick={() => moveUp(idx)}>Up</button>
                <button style={{ ...s.btn, ...s.btnGhost, padding: '2px 8px', fontSize: 11 }} onClick={() => moveDown(idx)}>Dn</button>
              </div>
              <button style={{ ...s.btn, ...s.btnDanger, padding: '4px 10px', fontSize: 12 }} onClick={() => toggle(p.id)}>Remove</button>
            </div>
          ))}
        </div>
        <button style={{ ...s.btn, ...s.btnPrimary, width: '100%' }} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Showcase'}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   Main Page
══════════════════════════════════════════ */
export default function AdminWebsiteInfo() {
  const [tab, setTab] = useState(0)

  return (
    <div style={s.page}>
      <h1 style={s.heading}>Website Management</h1>
      <p style={s.subtext}>Manage your public-facing website content, products, deals and showcase.</p>

      <div style={s.tabs}>
        {TABS.map((t, i) => (
          <button key={t} style={s.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && <CompanyTab />}
      {tab === 1 && <ProductsTab />}
      {tab === 2 && <DealsTab />}
      {tab === 3 && <SpecialityTab />}
    </div>
  )
}
