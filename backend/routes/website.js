/**
 * Website Route - provides public website data managed by admin
 * Separate from ERP data - only website-specific info
 */
const express = require('express')
const { sequelize } = require('../config/database')
const { auth, adminOnly } = require('../middleware/auth')
const router = express.Router()

/* ─────────────────────────────────────────
   PUBLIC endpoint — no auth (for public website)
───────────────────────────────────────── */
router.get('/public', async (req, res) => {
  try {
    // Company info
    const [company] = await sequelize.query('SELECT * FROM company_details WHERE id=1')

    // Website info (key-value)
    let info = {}
    try {
      const [rows] = await sequelize.query('SELECT key_name, key_value FROM website_info')
      rows.forEach(r => { info[r.key_name] = r.key_value })
    } catch { /* table may not exist yet */ }

    // Active products
    let products = []
    try {
      const [p] = await sequelize.query(
        'SELECT * FROM website_products WHERE is_active=1 ORDER BY sort_order ASC, created_at DESC'
      )
      products = p
    } catch { /* table may not exist yet */ }

    // Active deals
    let deals = []
    try {
      const [d] = await sequelize.query(
        'SELECT * FROM website_deals WHERE is_active=1 ORDER BY sort_order ASC'
      )
      deals = d
    } catch { /* table may not exist yet */ }

    // Speciality showcase products
    let speciality = []
    try {
      const [s] = await sequelize.query(
        `SELECT wp.* FROM website_speciality ws
         JOIN website_products wp ON ws.website_product_id = wp.id
         WHERE wp.is_active = 1
         ORDER BY ws.sort_order ASC`
      )
      speciality = s
    } catch { /* table may not exist yet */ }

    res.json({ company: company[0] || {}, info, products, deals, speciality })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

/* ─────────────────────────────────────────
   ADMIN: Website Info (key-value store)
───────────────────────────────────────── */
router.get('/info', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await sequelize.query('SELECT key_name, key_value FROM website_info')
    const obj = {}
    rows.forEach(r => { obj[r.key_name] = r.key_value })
    res.json(obj)
  } catch(err) { res.status(500).json({ error: err.message }) }
})

router.put('/info', auth, adminOnly, async (req, res) => {
  try {
    const entries = Object.entries(req.body)
    for (const [key, value] of entries) {
      await sequelize.query(
        `INSERT INTO website_info (key_name, key_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE key_value=?, updated_at=CURRENT_TIMESTAMP`,
        { replacements: [key, value ?? '', value ?? ''] }
      )
    }
    res.json({ success: true })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

/* ─────────────────────────────────────────
   ADMIN: Products
───────────────────────────────────────── */
router.get('/products', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      'SELECT * FROM website_products ORDER BY sort_order ASC, created_at DESC'
    )
    res.json(rows)
  } catch(err) { res.status(500).json({ error: err.message }) }
})

router.post('/products', auth, adminOnly, async (req, res) => {
  try {
    const {
      title, category, description, price, original_price,
      tag, brand, dimensions, material, weight, room_type,
      image_urls, offers, sort_order
    } = req.body

    const [r] = await sequelize.query(
      `INSERT INTO website_products
       (title, category, description, price, original_price, tag, brand, dimensions, material, weight, room_type, image_urls, offers, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      { replacements: [
        title, category, description || null, price, original_price || null,
        tag || null, brand || null, dimensions || null, material || null,
        weight || null, room_type || null,
        typeof image_urls === 'string' ? image_urls : JSON.stringify(image_urls || []),
        typeof offers === 'string' ? offers : JSON.stringify(offers || []),
        sort_order || 0
      ]}
    )
    res.json({ success: true, id: r })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

router.put('/products/:id', auth, adminOnly, async (req, res) => {
  try {
    const {
      title, category, description, price, original_price,
      tag, brand, dimensions, material, weight, room_type,
      image_urls, offers, sort_order, is_active
    } = req.body

    await sequelize.query(
      `UPDATE website_products
       SET title=?, category=?, description=?, price=?, original_price=?,
           tag=?, brand=?, dimensions=?, material=?, weight=?, room_type=?,
           image_urls=?, offers=?, sort_order=?, is_active=?
       WHERE id=?`,
      { replacements: [
        title, category, description || null, price, original_price || null,
        tag || null, brand || null, dimensions || null, material || null,
        weight || null, room_type || null,
        typeof image_urls === 'string' ? image_urls : JSON.stringify(image_urls || []),
        typeof offers === 'string' ? offers : JSON.stringify(offers || []),
        sort_order || 0, is_active ?? 1, req.params.id
      ]}
    )
    res.json({ success: true })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

router.delete('/products/:id', auth, adminOnly, async (req, res) => {
  try {
    await sequelize.query('DELETE FROM website_products WHERE id=?', { replacements: [req.params.id] })
    res.json({ success: true })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

/* ─────────────────────────────────────────
   ADMIN: Deals
───────────────────────────────────────── */
router.get('/deals', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await sequelize.query('SELECT * FROM website_deals ORDER BY sort_order ASC')
    res.json(rows)
  } catch(err) { res.status(500).json({ error: err.message }) }
})

router.post('/deals', auth, adminOnly, async (req, res) => {
  try {
    const { title, subtitle, description, bg_color, text_color, cta_text, sort_order } = req.body
    const [r] = await sequelize.query(
      `INSERT INTO website_deals (title, subtitle, description, bg_color, text_color, cta_text, sort_order)
       VALUES (?,?,?,?,?,?,?)`,
      { replacements: [
        title, subtitle || null, description || null,
        bg_color || '#2C2420', text_color || '#E8C97A',
        cta_text || 'Shop Now', sort_order || 0
      ]}
    )
    res.json({ success: true, id: r })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

router.put('/deals/:id', auth, adminOnly, async (req, res) => {
  try {
    const { title, subtitle, description, bg_color, text_color, cta_text, sort_order, is_active } = req.body
    await sequelize.query(
      `UPDATE website_deals
       SET title=?, subtitle=?, description=?, bg_color=?, text_color=?, cta_text=?, sort_order=?, is_active=?
       WHERE id=?`,
      { replacements: [
        title, subtitle || null, description || null,
        bg_color || '#2C2420', text_color || '#E8C97A',
        cta_text || 'Shop Now', sort_order || 0,
        is_active ?? 1, req.params.id
      ]}
    )
    res.json({ success: true })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

router.delete('/deals/:id', auth, adminOnly, async (req, res) => {
  try {
    await sequelize.query('DELETE FROM website_deals WHERE id=?', { replacements: [req.params.id] })
    res.json({ success: true })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

/* ─────────────────────────────────────────
   ADMIN: Speciality Showcase
───────────────────────────────────────── */
router.get('/speciality', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT ws.website_product_id AS id, wp.title, wp.category, wp.price
       FROM website_speciality ws
       JOIN website_products wp ON ws.website_product_id = wp.id
       ORDER BY ws.sort_order ASC`
    )
    res.json(rows)
  } catch(err) { res.status(500).json({ error: err.message }) }
})

router.put('/speciality', auth, adminOnly, async (req, res) => {
  try {
    const { product_ids } = req.body
    await sequelize.query('DELETE FROM website_speciality')
    if (Array.isArray(product_ids) && product_ids.length > 0) {
      const values = product_ids.map((id, idx) => `(${parseInt(id)}, ${idx})`).join(',')
      await sequelize.query(
        `INSERT INTO website_speciality (website_product_id, sort_order) VALUES ${values}`
      )
    }
    res.json({ success: true })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
