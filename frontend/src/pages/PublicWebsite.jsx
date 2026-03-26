import { useState, useEffect } from 'react'

/* ── Data ── */
const CATEGORIES = [
  { id: 'sofa', name: 'Sofas', icon: '🛋', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80' },
  { id: 'bed', name: 'Beds', icon: '🛏', img: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&q=80' },
  { id: 'chair', name: 'Chairs', icon: '🪑', img: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80' },
  { id: 'dining', name: 'Dining', icon: '🍽', img: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&q=80' },
  { id: 'table', name: 'Tables', icon: '🪵', img: 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=400&q=80' },
  { id: 'wardrobe', name: 'Wardrobes', icon: '🚪', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400&q=80' },
  { id: 'cabinet', name: 'Cabinets', icon: '🗄', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
  { id: 'coffee', name: 'Coffee Tables', icon: '☕', img: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80' },
  { id: 'bookshelf', name: 'Bookshelves', icon: '📚', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80' },
  { id: 'tvunit', name: 'TV Units', icon: '📺', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80' },
  { id: 'mattress', name: 'Mattresses', icon: '💤', img: 'https://images.unsplash.com/photo-1631157769375-c3ee7da3fb68?w=400&q=80' },
  { id: 'curtain', name: 'Curtains', icon: '🪟', img: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=80' },
  { id: 'kitchen', name: 'Kitchen Tables', icon: '🍳', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80' },
  { id: 'study', name: 'Study Tables', icon: '✏️', img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80' },
]

const FALLBACK_PRODUCTS = [
  { id: 1, name: 'Velvet Luxe Sofa', category: 'sofa', price: 45000, originalPrice: 60000, discount: 25, tag: 'Bestseller', material: 'Velvet & Solid Teak', brand: 'Sunshine', weight: '48kg', dimensions: '220×85×80 cm', roomType: 'Living Room', description: 'Sink into unparalleled comfort with our Velvet Luxe Sofa. Hand-crafted from solid teak with premium velvet upholstery.', images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80', 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80'] },
  { id: 2, name: 'Nordic Oak Bed', category: 'bed', price: 62000, originalPrice: 80000, discount: 22, tag: 'New', material: 'Solid Oak', brand: 'Sunshine', weight: '75kg', dimensions: '200×160×120 cm', roomType: 'Bedroom', description: 'Inspired by Scandinavian craftsmanship, the Nordic Oak Bed brings warmth and tranquility to your bedroom.', images: ['https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80'] },
  { id: 3, name: 'Artisan Accent Chair', category: 'chair', price: 18500, originalPrice: 24000, discount: 23, tag: 'Limited', material: 'Walnut & Linen', brand: 'Sunshine', weight: '12kg', dimensions: '75×70×85 cm', roomType: 'Living Room', description: 'Handwoven linen fabric with solid walnut frame for a look that is both timeless and contemporary.', images: ['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80'] },
  { id: 4, name: 'Heritage Dining Set', category: 'dining', price: 95000, originalPrice: 120000, discount: 21, tag: 'Premium', material: 'Sheesham Wood', brand: 'Sunshine', weight: '120kg', dimensions: '180×90×76 cm', roomType: 'Dining Room', description: 'A magnificent 6-seater table and chair ensemble carved from premium Sheesham wood.', images: ['https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80'] },
  { id: 5, name: 'Marble Coffee Table', category: 'coffee', price: 28000, originalPrice: 38000, discount: 26, tag: 'Hot', material: 'Italian Marble & Steel', brand: 'Sunshine', weight: '35kg', dimensions: '120×60×45 cm', roomType: 'Living Room', description: 'A sculptural statement in Italian marble and brushed gold steel.', images: ['https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800&q=80'] },
  { id: 6, name: 'Colonial Wardrobe', category: 'wardrobe', price: 72000, originalPrice: 92000, discount: 22, tag: 'Bestseller', material: 'Solid Teak', brand: 'Sunshine', weight: '95kg', dimensions: '200×60×220 cm', roomType: 'Bedroom', description: 'Inspired by colonial craftsmanship, this 4-door wardrobe features ornate carved detailing.', images: ['https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&q=80'] },
]

const FALLBACK_ADS = [
  { title: 'Monsoon Sale', subtitle: 'Up to 40% OFF on all sofas', cta: 'Shop Now', bg: '#2C2420', color: '#E8C97A' },
  { title: 'Bank Offer', subtitle: '10% cashback on HDFC cards', cta: 'Know More', bg: '#4A3728', color: '#F8F4EF' },
  { title: 'Free Delivery', subtitle: 'On orders above ₹25,000', cta: 'Explore', bg: '#8B6F52', color: '#FDFAF7' },
]

const TESTIMONIALS = [
  { name: 'Priya Sharma', city: 'Mumbai', rating: 5, text: 'Sunshine Furniture transformed our home completely. The quality is extraordinary — every piece feels like it was made just for us.', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80' },
  { name: 'Arjun Mehta', city: 'Delhi', rating: 5, text: 'Nothing compares to Sunshine. The craftsmanship, the service, the delivery — all impeccable.', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80' },
  { name: 'Kavitha Nair', city: 'Bangalore', rating: 5, text: 'The Heritage Dining Set is the crown jewel of our home. Worth every rupee!', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80' },
  { name: 'Rohan Gupta', city: 'Pune', rating: 5, text: 'Fast delivery, zero damage, and the furniture looks even better in person than in photos.', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80' },
]

/* ── Fonts ── */
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap'

/* ── Shared components ── */
const StarRating = ({ rating }) => (
  <span style={{ color: '#C4963A', letterSpacing: 2 }}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
)

const TagBadge = ({ tag }) => {
  const colors = { Bestseller: '#C4963A', New: '#4A3728', Limited: '#8B4040', Hot: '#C4963A', Premium: '#4A3728' }
  return tag ? (
    <span style={{ position: 'absolute', top: 12, right: 12, background: colors[tag] || '#4A3728', color: '#fff', fontSize: 10, fontWeight: 600, letterSpacing: 1.5, padding: '4px 10px', textTransform: 'uppercase' }}>{tag}</span>
  ) : null
}

const WishlistBtn = ({ liked, onToggle }) => (
  <button onClick={e => { e.stopPropagation(); onToggle() }}
    style={{ position: 'absolute', top: 12, left: 12, width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
    {liked ? '❤️' : '🤍'}
  </button>
)

const ProductCard = ({ product, onClick }) => {
  const [liked, setLiked] = useState(false)
  const imgs = product.images || []
  return (
    <div onClick={() => onClick(product)} style={{ cursor: 'pointer', background: '#fff', border: '1px solid #EDE8E3', overflow: 'hidden', transition: 'transform 0.3s, box-shadow 0.3s', position: 'relative' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(44,36,32,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{ position: 'relative', overflow: 'hidden', height: 240 }}>
        <img src={imgs[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
        <TagBadge tag={product.tag} />
        <WishlistBtn liked={liked} onToggle={() => setLiked(l => !l)} />
      </div>
      <div style={{ padding: '16px 20px 20px' }}>
        <p style={{ fontSize: 11, color: '#8B6F52', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{product.material}</p>
        <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, marginBottom: 10, color: '#2C2420' }}>{product.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: 18, color: '#2C2420' }}>₹{Number(product.price).toLocaleString()}</span>
          {product.originalPrice > product.price && <>
            <span style={{ fontSize: 13, color: '#aaa', textDecoration: 'line-through' }}>₹{Number(product.originalPrice).toLocaleString()}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#C4963A', background: '#FDF6E8', padding: '3px 8px', borderRadius: 2 }}>{product.discount}% OFF</span>
          </>}
        </div>
      </div>
    </div>
  )
}

/* ── Navbar ── */
const SiteNavbar = ({ page, setPage }) => {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: scrolled ? 'rgba(253,250,247,0.97)' : 'transparent', backdropFilter: scrolled ? 'blur(12px)' : 'none', borderBottom: scrolled ? '1px solid #EDE8E3' : 'none', transition: 'all 0.4s', padding: '0 48px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Jost, sans-serif' }}>
      <button onClick={() => setPage('home')} style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, fontWeight: 600, color: scrolled ? '#2C2420' : '#FDFAF7', letterSpacing: 2, background: 'none', border: 'none', cursor: 'pointer' }}>
        ☀ SUNSHINE
      </button>
      <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
        {['Products', 'About', 'Contact'].map(n => (
          <button key={n} onClick={() => setPage(n.toLowerCase())}
            style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: scrolled ? '#4A3728' : '#FDFAF7', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#C4963A'}
            onMouseLeave={e => e.currentTarget.style.color = scrolled ? '#4A3728' : '#FDFAF7'}>
            {n}
          </button>
        ))}
        <button onClick={() => window.location.href = '/login'}
          style={{ background: '#2C2420', color: '#F8F4EF', padding: '10px 24px', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'background 0.2s', fontFamily: 'Jost, sans-serif' }}
          onMouseEnter={e => e.currentTarget.style.background = '#C4963A'}
          onMouseLeave={e => e.currentTarget.style.background = '#2C2420'}>
          Staff Login
        </button>
      </div>
    </nav>
  )
}

/* ── Hero ── */
const Hero = ({ setPage, setSelectedCategory }) => {
  const [imgIdx, setImgIdx] = useState(0)
  const heroImgs = [
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1600&q=80',
    'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=1600&q=80',
  ]
  useEffect(() => {
    const t = setInterval(() => setImgIdx(i => (i + 1) % heroImgs.length), 4000)
    return () => clearInterval(t)
  }, [])
  return (
    <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      {heroImgs.map((src, i) => (
        <img key={i} src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === imgIdx ? 1 : 0, transition: 'opacity 1.2s ease' }} />
      ))}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(44,36,32,0.65) 40%, transparent)' }} />
      <div style={{ position: 'relative', zIndex: 2, padding: '0 80px', maxWidth: 720 }}>
        <p style={{ color: '#E8C97A', letterSpacing: 4, fontSize: 11, textTransform: 'uppercase', marginBottom: 20, fontFamily: 'Jost, sans-serif' }}>Est. 2004 · Thoughtfully Crafted</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 80, fontWeight: 300, color: '#FDFAF7', lineHeight: 1.05, marginBottom: 24 }}>
          Best Quality<br /><em>Furniture &</em><br />Designs
        </h1>
        <p style={{ color: 'rgba(253,250,247,0.75)', fontSize: 16, fontWeight: 300, letterSpacing: 1, marginBottom: 40, maxWidth: 440, fontFamily: 'Jost, sans-serif' }}>
          From modern minimalism to rich traditional craftsmanship — every piece a legacy.
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => setPage('products')}
            style={{ background: '#C4963A', color: '#fff', padding: '16px 40px', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Jost, sans-serif', transition: 'background 0.3s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#A67E2A'}
            onMouseLeave={e => e.currentTarget.style.background = '#C4963A'}>
            Explore Collection
          </button>
          <button onClick={() => { setSelectedCategory('sofa'); setPage('category') }}
            style={{ background: 'transparent', color: '#FDFAF7', padding: '16px 40px', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 500, border: '1px solid rgba(253,250,247,0.5)', cursor: 'pointer', fontFamily: 'Jost, sans-serif', transition: 'background 0.3s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(253,250,247,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Our Bestsellers
          </button>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 2 }}>
        {heroImgs.map((_, i) => (
          <button key={i} onClick={() => setImgIdx(i)}
            style={{ width: i === imgIdx ? 32 : 8, height: 3, background: i === imgIdx ? '#C4963A' : 'rgba(255,255,255,0.4)', transition: 'all 0.3s', border: 'none', cursor: 'pointer', borderRadius: 2 }} />
        ))}
      </div>
    </section>
  )
}

/* ── Stats bar ── */
const StatsBar = () => (
  <section style={{ background: '#2C2420', padding: '70px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1 }}>
    {[{ n: '2000+', l: 'Happy Customers', icon: '😊' }, { n: '20+', l: 'Years Experience', icon: '🏆' }, { n: '150+', l: 'Product Range', icon: '🛋' }, { n: '100%', l: 'Affordable Pricing', icon: '✅' }].map((s, i) => (
      <div key={i} style={{ textAlign: 'center', padding: '32px 20px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.1)' : '' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 52, fontWeight: 600, color: '#E8C97A', lineHeight: 1 }}>{s.n}</div>
        <div style={{ color: 'rgba(248,244,239,0.6)', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginTop: 8, fontFamily: 'Jost, sans-serif' }}>{s.l}</div>
      </div>
    ))}
  </section>
)

/* ── Featured products ── */
const FeaturedProducts = ({ products, setPage, setSelectedProduct }) => (
  <section style={{ padding: '100px 80px', background: '#FDFAF7' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 60 }}>
      <div>
        <p style={{ color: '#C4963A', letterSpacing: 4, fontSize: 11, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Jost, sans-serif' }}>Handpicked for You</p>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 56, fontWeight: 400, color: '#2C2420', lineHeight: 1.1 }}>Our Speciality<br /><em>Collection</em></h2>
      </div>
      <button onClick={() => setPage('products')} style={{ background: 'none', color: '#2C2420', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 500, borderBottom: '1px solid #2C2420', paddingBottom: 4, border: 'none', borderBottom: '1px solid #2C2420', cursor: 'pointer', fontFamily: 'Jost, sans-serif' }}>View All Products →</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
      {products.slice(0, 6).map(p => (
        <ProductCard key={p.id} product={p} onClick={prod => { setSelectedProduct(prod); setPage('product') }} />
      ))}
    </div>
  </section>
)

/* ── Categories ── */
const CategoriesSection = ({ setPage, setSelectedCategory }) => (
  <section style={{ padding: '100px 80px', background: '#F8F4EF' }}>
    <div style={{ textAlign: 'center', marginBottom: 60 }}>
      <p style={{ color: '#C4963A', letterSpacing: 4, fontSize: 11, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Jost, sans-serif' }}>Browse By</p>
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 56, fontWeight: 400, color: '#2C2420' }}>Categories</h2>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 16 }}>
      {CATEGORIES.slice(0, 14).map(cat => (
        <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setPage('category') }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 8px', background: '#fff', border: '1px solid #EDE8E3', cursor: 'pointer', transition: 'all 0.3s', borderRadius: 2, fontFamily: 'Jost, sans-serif' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#2C2420'; e.currentTarget.style.color = '#E8C97A'; e.currentTarget.style.borderColor = '#2C2420' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'inherit'; e.currentTarget.style.borderColor = '#EDE8E3' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: '2px solid #EDE8E3' }}>
            <img src={cat.img} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 500 }}>{cat.name}</span>
        </button>
      ))}
    </div>
  </section>
)

/* ── Deals / Ads ── */
const DealsSection = ({ ads }) => {
  const [adIdx, setAdIdx] = useState(0)
  useEffect(() => {
    if (!ads.length) return
    const t = setInterval(() => setAdIdx(i => (i + 1) % ads.length), 3000)
    return () => clearInterval(t)
  }, [ads.length])
  if (!ads.length) return null
  const ad = ads[adIdx] || ads[0]
  return (
    <section style={{ padding: '100px 80px', background: '#FDFAF7' }}>
      <div style={{ textAlign: 'center', marginBottom: 50 }}>
        <p style={{ color: '#C4963A', letterSpacing: 4, fontSize: 11, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Jost, sans-serif' }}>Exclusive</p>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 56, fontWeight: 400, color: '#2C2420' }}>Offers & Deals</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        <div style={{ background: ad.bg, padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 320, transition: 'background 0.6s', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', border: '60px solid rgba(255,255,255,0.03)' }} />
          <p style={{ color: ad.color, letterSpacing: 4, fontSize: 11, textTransform: 'uppercase', marginBottom: 16, fontFamily: 'Jost, sans-serif' }}>Limited Time</p>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 52, fontWeight: 300, color: '#FDFAF7', marginBottom: 12 }}>{ad.title}</h3>
          <p style={{ color: 'rgba(253,250,247,0.7)', fontSize: 18, marginBottom: 32, fontFamily: 'Jost, sans-serif' }}>{ad.subtitle}</p>
          <button style={{ alignSelf: 'flex-start', background: ad.color, color: ad.bg, padding: '14px 36px', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Jost, sans-serif' }}>{ad.cta}</button>
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
            {ads.map((_, i) => (
              <button key={i} onClick={() => setAdIdx(i)} style={{ width: i === adIdx ? 24 : 6, height: 3, background: i === adIdx ? ad.color : 'rgba(255,255,255,0.3)', transition: 'all 0.3s', border: 'none', cursor: 'pointer', borderRadius: 2 }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: '#2C2420', padding: '28px 32px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ color: '#E8C97A', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Jost, sans-serif' }}>Bank Offer</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#FDFAF7', fontWeight: 400 }}>10% cashback on HDFC Credit Cards</p>
          </div>
          <div style={{ background: '#8B6F52', padding: '28px 32px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ color: '#F8F4EF', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Jost, sans-serif' }}>Membership Perk</p>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#FDFAF7', fontWeight: 400 }}>Free installation on orders above ₹50,000</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── New Arrivals ── */
const NewArrivals = ({ products, setPage, setSelectedProduct }) => {
  const [idx, setIdx] = useState(0)
  const arrivals = products.filter(p => p.tag === 'New')
  if (!arrivals.length) return null
  return (
    <section style={{ padding: '100px 80px', background: '#F8F4EF' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <p style={{ color: '#C4963A', letterSpacing: 4, fontSize: 11, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Jost, sans-serif' }}>Just In</p>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 56, fontWeight: 400, color: '#2C2420' }}>New Arrivals</h2>
        <div style={{ width: 60, height: 2, background: '#C4963A', margin: '20px auto 0' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {arrivals.slice(idx, idx + 3).map(p => (
          <ProductCard key={p.id} product={p} onClick={prod => { setSelectedProduct(prod); setPage('product') }} />
        ))}
      </div>
      {arrivals.length > 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 32 }}>
          <button onClick={() => setIdx(Math.max(0, idx - 3))} style={{ background: '#2C2420', color: '#fff', width: 48, height: 48, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}>←</button>
          <button onClick={() => setIdx(Math.min(arrivals.length - 3, idx + 3))} style={{ background: '#2C2420', color: '#fff', width: 48, height: 48, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}>→</button>
        </div>
      )}
    </section>
  )
}

/* ── Testimonials ── */
const TestimonialsSection = () => {
  const [idx, setIdx] = useState(0)
  return (
    <section style={{ background: '#2C2420', padding: '100px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <p style={{ color: '#E8C97A', letterSpacing: 4, fontSize: 11, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Jost, sans-serif' }}>What They Say</p>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 56, fontWeight: 300, color: '#FDFAF7' }}>Client Stories</h2>
      </div>
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <StarRating rating={TESTIMONIALS[idx].rating} />
        <blockquote style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 300, color: '#FDFAF7', lineHeight: 1.6, margin: '28px 0', fontStyle: 'italic' }}>
          "{TESTIMONIALS[idx].text}"
        </blockquote>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <img src={TESTIMONIALS[idx].img} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #C4963A' }} />
          <div style={{ textAlign: 'left' }}>
            <p style={{ color: '#E8C97A', fontWeight: 500, fontSize: 16, fontFamily: 'Jost, sans-serif' }}>{TESTIMONIALS[idx].name}</p>
            <p style={{ color: 'rgba(248,244,239,0.5)', fontSize: 13, letterSpacing: 1, fontFamily: 'Jost, sans-serif' }}>{TESTIMONIALS[idx].city}</p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
          {TESTIMONIALS.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 28 : 8, height: 3, background: i === idx ? '#C4963A' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s', border: 'none', cursor: 'pointer', borderRadius: 2 }} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Brand section ── */
const BrandSection = () => (
  <section style={{ padding: '80px', background: '#FDFAF7', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
    <div>
      <p style={{ color: '#C4963A', letterSpacing: 4, fontSize: 11, textTransform: 'uppercase', marginBottom: 16, fontFamily: 'Jost, sans-serif' }}>Sunshine Furniture</p>
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 64, fontWeight: 400, color: '#2C2420', lineHeight: 1.1, marginBottom: 24 }}>Our Quality<br /><em>is Our Brand</em></h2>
      <p style={{ color: '#7A6558', lineHeight: 1.8, fontSize: 16, marginBottom: 32, fontFamily: 'Jost, sans-serif' }}>
        For over two decades, Sunshine Furniture has been crafting heirloom-quality pieces that bring beauty, comfort, and meaning to every home. Each piece is handcrafted by master artisans using sustainably sourced materials.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {['Sustainable Materials', 'Master Artisans', '5-Year Warranty', 'Free Delivery'].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#C4963A', fontSize: 18 }}>✦</span>
            <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: 1, color: '#4A3728', fontFamily: 'Jost, sans-serif' }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
    <div style={{ position: 'relative', height: 500 }}>
      <img src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80" alt="Craftsmanship" style={{ width: '80%', height: '80%', objectFit: 'cover', position: 'absolute', top: 0, right: 0 }} />
      <img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80" alt="Furniture" style={{ width: '50%', height: '50%', objectFit: 'cover', position: 'absolute', bottom: 0, left: 0, border: '8px solid #FDFAF7' }} />
    </div>
  </section>
)

/* ── Footer ── */
const Footer = ({ setPage }) => (
  <footer style={{ background: '#1A1410', padding: '80px 80px 40px', fontFamily: 'Jost, sans-serif' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.2fr', gap: 60, marginBottom: 60, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 60 }}>
      <div>
        <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 600, color: '#E8C97A', letterSpacing: 2, marginBottom: 12 }}>☀ SUNSHINE</h3>
        <p style={{ color: 'rgba(248,244,239,0.5)', fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>Our Quality is Our Brand. Crafting beautiful furniture since 2004.</p>
      </div>
      <div>
        <h4 style={{ color: '#E8C97A', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>Information</h4>
        {['Payment', 'Shipping', 'Terms & Conditions', 'Warranty & Return'].map(l => (
          <button key={l} style={{ display: 'block', color: 'rgba(248,244,239,0.5)', fontSize: 13, marginBottom: 12, textAlign: 'left', cursor: 'pointer', border: 'none', background: 'none', fontFamily: 'Jost, sans-serif' }}
            onMouseEnter={e => e.currentTarget.style.color = '#E8C97A'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(248,244,239,0.5)'}>{l}</button>
        ))}
      </div>
      <div>
        <h4 style={{ color: '#E8C97A', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>Quick Links</h4>
        {[['home', 'Home'], ['products', 'Products'], ['about', 'About'], ['contact', 'Contact']].map(([pg, l]) => (
          <button key={l} onClick={() => setPage(pg)} style={{ display: 'block', color: 'rgba(248,244,239,0.5)', fontSize: 13, marginBottom: 12, textAlign: 'left', cursor: 'pointer', border: 'none', background: 'none', fontFamily: 'Jost, sans-serif' }}
            onMouseEnter={e => e.currentTarget.style.color = '#E8C97A'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(248,244,239,0.5)'}>{l}</button>
        ))}
      </div>
      <div>
        <h4 style={{ color: '#E8C97A', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>Address</h4>
        <p style={{ color: 'rgba(248,244,239,0.5)', fontSize: 13, lineHeight: 1.8 }}>42, Furniture Lane, MG Road<br />Pune, Maharashtra 411001</p>
        <p style={{ color: 'rgba(248,244,239,0.5)', fontSize: 13, lineHeight: 1.8, marginTop: 12 }}>📞 +91 98765 43210<br />✉ hello@sunshinefurniture.in</p>
      </div>
    </div>
    <p style={{ textAlign: 'center', color: 'rgba(248,244,239,0.3)', fontSize: 12, letterSpacing: 2 }}>
      © {new Date().getFullYear()} All Rights Reserved to Sunshine Furniture
    </p>
  </footer>
)

/* ── Pages ── */
const HomePage = ({ products, ads, setPage, setSelectedCategory, setSelectedProduct }) => (
  <>
    <Hero setPage={setPage} setSelectedCategory={setSelectedCategory} />
    <StatsBar />
    <FeaturedProducts products={products} setPage={setPage} setSelectedProduct={setSelectedProduct} />
    <CategoriesSection setPage={setPage} setSelectedCategory={setSelectedCategory} />
    <DealsSection ads={ads} />
    <NewArrivals products={products} setPage={setPage} setSelectedProduct={setSelectedProduct} />
    <BrandSection />
    <TestimonialsSection />
    <Footer setPage={setPage} />
  </>
)

const ProductsPage = ({ products, setPage, setSelectedProduct, setSelectedCategory }) => {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const filtered = products.filter(p =>
    (filter === 'all' || p.category === filter) &&
    ((p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.material || '').toLowerCase().includes(search.toLowerCase()))
  )
  return (
    <div style={{ paddingTop: 72, background: '#FDFAF7', minHeight: '100vh', fontFamily: 'Jost, sans-serif' }}>
      <div style={{ background: '#2C2420', padding: '80px 80px 60px', textAlign: 'center' }}>
        <p style={{ color: '#E8C97A', letterSpacing: 4, fontSize: 11, textTransform: 'uppercase', marginBottom: 12 }}>All Items</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 64, fontWeight: 300, color: '#FDFAF7' }}>Our Collection</h1>
        <div style={{ width: 60, height: 2, background: '#C4963A', margin: '20px auto 0' }} />
      </div>
      <div style={{ padding: '40px 80px', background: '#F8F4EF', borderBottom: '1px solid #EDE8E3', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ flex: 1, minWidth: 240, padding: '12px 20px', border: '1px solid #C9B89F', background: '#fff', fontSize: 14, outline: 'none', fontFamily: 'Jost, sans-serif' }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('all')} style={{ padding: '10px 20px', background: filter === 'all' ? '#2C2420' : '#fff', color: filter === 'all' ? '#E8C97A' : '#4A3728', border: '1px solid #C9B89F', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>All</button>
          {CATEGORIES.slice(0, 8).map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)} style={{ padding: '10px 20px', background: filter === c.id ? '#2C2420' : '#fff', color: filter === c.id ? '#E8C97A' : '#4A3728', border: '1px solid #C9B89F', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>{c.name}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: '60px 80px' }}>
        <p style={{ color: '#7A6558', marginBottom: 32, fontSize: 14 }}>{filtered.length} products found</p>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#7A6558' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, marginBottom: 16 }}>No products found</div>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} onClick={prod => { setSelectedProduct(prod); setPage('product') }} />
            ))}
          </div>
        )}
      </div>
      <Footer setPage={setPage} />
    </div>
  )
}

const CategoryPage = ({ products, setPage, setSelectedProduct, selectedCategory }) => {
  const catInfo = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0]
  const catProducts = products.filter(p => p.category === selectedCategory)
  return (
    <div style={{ paddingTop: 72, background: '#FDFAF7', minHeight: '100vh' }}>
      <div style={{ position: 'relative', height: 320, overflow: 'hidden' }}>
        <img src={catInfo.img} alt={catInfo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(44,36,32,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#E8C97A', letterSpacing: 4, fontSize: 11, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Jost, sans-serif' }}>Collection</p>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 72, fontWeight: 300, color: '#FDFAF7' }}>All {catInfo.name}</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8, fontSize: 14, fontFamily: 'Jost, sans-serif' }}>{catProducts.length} products</p>
        </div>
      </div>
      <div style={{ padding: '80px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {catProducts.length > 0 ? catProducts.map(p => (
          <ProductCard key={p.id} product={p} onClick={prod => { setSelectedProduct(prod); setPage('product') }} />
        )) : (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 80 }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 40, color: '#7A6558' }}>Coming Soon</p>
            <p style={{ color: '#7A6558', marginTop: 12, fontFamily: 'Jost, sans-serif' }}>We're adding products to this category</p>
          </div>
        )}
      </div>
      <Footer setPage={setPage} />
    </div>
  )
}

const ProductPage = ({ products, setPage, selectedProduct }) => {
  const [imgIdx, setImgIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const similar = products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).slice(0, 3)
  const imgs = selectedProduct.images || []
  return (
    <div style={{ paddingTop: 72, background: '#FDFAF7', minHeight: '100vh', fontFamily: 'Jost, sans-serif' }}>
      <div style={{ padding: '20px 80px', borderBottom: '1px solid #EDE8E3', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#7A6558' }}>
        <button onClick={() => setPage('home')} style={{ color: '#C4963A', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'Jost, sans-serif', fontSize: 13 }}>Home</button>
        <span>/</span>
        <button onClick={() => setPage('products')} style={{ cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'Jost, sans-serif', fontSize: 13, color: '#7A6558' }}>Products</button>
        <span>/</span>
        <span style={{ color: '#2C2420' }}>{selectedProduct.name}</span>
      </div>
      <div style={{ padding: '60px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
        <div>
          <div style={{ position: 'relative', height: 480, overflow: 'hidden', marginBottom: 12 }}>
            <img src={imgs[imgIdx] || imgs[0]} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {imgs.length > 1 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
                <button onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(253,250,247,0.9)', border: 'none', cursor: 'pointer', fontSize: 18 }}>←</button>
                <button onClick={() => setImgIdx(i => (i + 1) % imgs.length)} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(253,250,247,0.9)', border: 'none', cursor: 'pointer', fontSize: 18 }}>→</button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {imgs.map((img, i) => (
              <button key={i} onClick={() => setImgIdx(i)} style={{ width: 80, height: 60, overflow: 'hidden', border: i === imgIdx ? '2px solid #C4963A' : '2px solid transparent', cursor: 'pointer', padding: 0 }}>
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ color: '#8B6F52', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>{selectedProduct.material}</p>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 52, fontWeight: 500, color: '#2C2420', lineHeight: 1.1, marginBottom: 16 }}>{selectedProduct.name}</h1>
          <p style={{ color: '#7A6558', lineHeight: 1.8, fontSize: 16, marginBottom: 28 }}>{selectedProduct.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, fontSize: 42, color: '#2C2420' }}>₹{Number(selectedProduct.price).toLocaleString()}</span>
            {selectedProduct.originalPrice > selectedProduct.price && (
              <div>
                <span style={{ fontSize: 16, color: '#aaa', textDecoration: 'line-through', display: 'block' }}>₹{Number(selectedProduct.originalPrice).toLocaleString()}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#C4963A', background: '#FDF6E8', padding: '4px 10px' }}>{selectedProduct.discount}% OFF</span>
              </div>
            )}
          </div>
          <div style={{ background: '#F8F4EF', padding: '20px 24px', marginBottom: 28, borderLeft: '3px solid #C4963A' }}>
            <p style={{ color: '#4A3728', fontSize: 13, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>OFFERS</p>
            <p style={{ color: '#7A6558', fontSize: 13 }}>✦ Free delivery on this order</p>
            <p style={{ color: '#7A6558', fontSize: 13 }}>✦ 5-year craftsmanship warranty</p>
            <p style={{ color: '#7A6558', fontSize: 13 }}>✦ Easy EMI available</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28, padding: 24, background: '#fff', border: '1px solid #EDE8E3' }}>
            {[['Brand', selectedProduct.brand], ['Dimensions', selectedProduct.dimensions], ['Material', selectedProduct.material], ['Category', selectedProduct.category], ['Weight', selectedProduct.weight], ['Room Type', selectedProduct.roomType]].filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize: 11, color: '#8B6F52', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{k}</p>
                <p style={{ fontSize: 14, color: '#2C2420', fontWeight: 500 }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #C9B89F', overflow: 'hidden' }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 44, height: 48, fontSize: 20, cursor: 'pointer', background: '#F8F4EF', border: 'none', fontFamily: 'Jost, sans-serif' }}>−</button>
              <span style={{ width: 44, textAlign: 'center', fontSize: 16, fontWeight: 500 }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={{ width: 44, height: 48, fontSize: 20, cursor: 'pointer', background: '#F8F4EF', border: 'none', fontFamily: 'Jost, sans-serif' }}>+</button>
            </div>
            <button style={{ flex: 1, background: '#2C2420', color: '#F8F4EF', padding: '14px 32px', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Enquire Now
            </button>
          </div>
          <button onClick={() => window.location.href = '/login'} style={{ width: '100%', background: '#C4963A', color: '#fff', padding: '14px 32px', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Jost, sans-serif' }}>
            Login to Order
          </button>
        </div>
      </div>
      {similar.length > 0 && (
        <section style={{ padding: '60px 80px', background: '#F8F4EF', borderTop: '1px solid #EDE8E3' }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 40, fontWeight: 400, color: '#2C2420', marginBottom: 40 }}>Similar Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {similar.map(p => (
              <ProductCard key={p.id} product={p} onClick={prod => { setSelectedProduct(prod); setImgIdx(0); window.scrollTo(0, 0) }} />
            ))}
          </div>
        </section>
      )}
      <Footer setPage={setPage} />
    </div>
  )
}

const AboutPage = ({ setPage }) => (
  <div style={{ paddingTop: 72, background: '#FDFAF7', minHeight: '100vh' }}>
    <div style={{ position: 'relative', height: 500, overflow: 'hidden' }}>
      <img src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&q=80" alt="About" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(44,36,32,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <p style={{ color: '#E8C97A', letterSpacing: 4, fontSize: 11, textTransform: 'uppercase', marginBottom: 16, fontFamily: 'Jost, sans-serif' }}>Our Story</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 72, fontWeight: 300, color: '#FDFAF7' }}>About Sunshine</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 16, fontSize: 18, maxWidth: 600, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>"Our Quality is Our Brand"</p>
      </div>
    </div>
    <div style={{ padding: '100px 200px', textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 52, fontWeight: 400, color: '#2C2420', marginBottom: 28 }}>Crafting Homes Since 2004</h2>
      <p style={{ color: '#7A6558', lineHeight: 2, fontSize: 17, maxWidth: 800, margin: '0 auto', fontFamily: 'Jost, sans-serif' }}>
        Sunshine Furniture was born from a single belief: that your home deserves the finest. For over two decades, our master artisans have handcrafted each piece with meticulous attention to detail, using only the most sustainable and premium materials. Every Sunshine piece is crafted to last generations.
      </p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
      {['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80', 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&q=80', 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80'].map((src, i) => (
        <div key={i} style={{ height: 320, overflow: 'hidden' }}>
          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
        </div>
      ))}
    </div>
    <TestimonialsSection />
    <Footer setPage={setPage} />
  </div>
)

const ContactPage = ({ setPage }) => (
  <div style={{ paddingTop: 72, background: '#FDFAF7', minHeight: '100vh', fontFamily: 'Jost, sans-serif' }}>
    <div style={{ background: '#2C2420', padding: '80px', textAlign: 'center' }}>
      <p style={{ color: '#E8C97A', letterSpacing: 4, fontSize: 11, textTransform: 'uppercase', marginBottom: 12 }}>Reach Out</p>
      <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 64, fontWeight: 300, color: '#FDFAF7' }}>Contact Us</h1>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
      <div style={{ padding: '80px', background: '#F8F4EF' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 40, fontWeight: 400, color: '#2C2420', marginBottom: 32 }}>Send us a Message</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[['Name', 'text', 'Your name'], ['Email', 'email', 'your@email.com'], ['Subject', 'text', 'How can we help?']].map(([l, t, p]) => (
            <div key={l}>
              <label style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#4A3728', marginBottom: 8, display: 'block' }}>{l}</label>
              <input type={t} placeholder={p} style={{ width: '100%', padding: '14px 18px', border: '1px solid #C9B89F', background: '#fff', fontSize: 14, outline: 'none', fontFamily: 'Jost, sans-serif' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#4A3728', marginBottom: 8, display: 'block' }}>Message</label>
            <textarea rows={5} placeholder="Your message..." style={{ width: '100%', padding: '14px 18px', border: '1px solid #C9B89F', background: '#fff', fontSize: 14, outline: 'none', fontFamily: 'Jost, sans-serif', resize: 'vertical' }} />
          </div>
          <button style={{ background: '#2C2420', color: '#F8F4EF', padding: '16px 40px', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600, border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>Send Message</button>
        </div>
      </div>
      <div style={{ padding: '80px', background: '#2C2420' }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 40, fontWeight: 300, color: '#FDFAF7', marginBottom: 48 }}>Visit Us</h2>
        {[{ icon: '📍', title: 'Address', info: '42, Furniture Lane, MG Road, Pune, Maharashtra 411001' }, { icon: '📞', title: 'Phone', info: '+91 98765 43210' }, { icon: '✉', title: 'Email', info: 'hello@sunshinefurniture.in' }, { icon: '🕐', title: 'Hours', info: 'Mon–Sat: 10am–8pm\nSunday: 11am–6pm' }].map(({ icon, title, info }) => (
          <div key={title} style={{ display: 'flex', gap: 20, marginBottom: 36, paddingBottom: 36, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 28, minWidth: 40 }}>{icon}</span>
            <div>
              <p style={{ color: '#E8C97A', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>{title}</p>
              <p style={{ color: 'rgba(248,244,239,0.7)', fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{info}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
    <Footer setPage={setPage} />
  </div>
)

/* ── Main component ── */
export default function PublicWebsite() {
  const [page, setPage] = useState('home')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [products, setProducts] = useState(FALLBACK_PRODUCTS)
  const [ads, setAds] = useState(FALLBACK_ADS)

  // Load Google Fonts
  useEffect(() => {
    if (!document.getElementById('site-fonts')) {
      const link = document.createElement('link')
      link.id = 'site-fonts'
      link.rel = 'stylesheet'
      link.href = FONT_LINK
      document.head.appendChild(link)
    }
  }, [])

  // Scroll to top on page change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [page])

  // Fetch live data from ERP backend
  useEffect(() => {
    fetch('http://localhost:5000/api/website/public')
      .then(r => r.json())
      .then(data => {
        const FB_IMG = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80'
        if (data.products && data.products.length > 0) {
          setProducts(data.products.map(p => {
            let imgs = []
            try { imgs = typeof p.image_urls === 'string' ? JSON.parse(p.image_urls) : (p.image_urls || []) } catch { imgs = [] }
            if (!imgs.length) imgs = [FB_IMG]
            const orig = parseFloat(p.original_price) || 0
            const price = parseFloat(p.price) || 0
            const discount = orig > price ? Math.round(((orig - price) / orig) * 100) : 0
            return {
              id: p.id, name: p.title,
              category: (p.category || '').toLowerCase().replace(/\s+/g, ''),
              price, originalPrice: orig || price, discount,
              tag: p.tag || null, material: p.material || '',
              brand: p.brand || 'Sunshine', weight: p.weight || '',
              dimensions: p.dimensions || '', roomType: p.room_type || '',
              description: p.description || '', images: imgs,
            }
          }))
        }
        if (data.deals && data.deals.length > 0) {
          setAds(data.deals.map(d => ({
            title: d.title, subtitle: d.subtitle || '',
            cta: d.cta_text || 'Shop Now',
            bg: d.bg_color || '#2C2420', color: d.text_color || '#E8C97A',
          })))
        }
      })
      .catch(() => {}) // fall back to hardcoded data silently
  }, [])

  return (
    <div style={{ fontFamily: 'Jost, sans-serif', background: '#FDFAF7', color: '#2C2420', overflowX: 'hidden' }}>
      <SiteNavbar page={page} setPage={setPage} />
      {page === 'home' && <HomePage products={products} ads={ads} setPage={setPage} setSelectedCategory={setSelectedCategory} setSelectedProduct={setSelectedProduct} />}
      {page === 'products' && <ProductsPage products={products} setPage={setPage} setSelectedProduct={setSelectedProduct} setSelectedCategory={setSelectedCategory} />}
      {page === 'category' && <CategoryPage products={products} setPage={setPage} setSelectedProduct={setSelectedProduct} selectedCategory={selectedCategory} />}
      {page === 'product' && selectedProduct && <ProductPage products={products} setPage={setPage} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} />}
      {page === 'about' && <AboutPage setPage={setPage} />}
      {page === 'contact' && <ContactPage setPage={setPage} />}
    </div>
  )
}
