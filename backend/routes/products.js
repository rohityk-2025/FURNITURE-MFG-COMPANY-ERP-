const express = require('express')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const { sequelize } = require('../config/database')
const { auth, adminOnly } = require('../middleware/auth')
const router = express.Router()

const uploadDir = path.join(__dirname, '../../uploads/products')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive:true })

const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, uploadDir),
  filename:    (req,file,cb) => cb(null, `p_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`)
})
const upload = multer({ storage, limits:{ fileSize:5*1024*1024 }, fileFilter:(req,file,cb)=>{
  if (file.mimetype.startsWith('image/')) cb(null,true)
  else cb(new Error('Images only'))
}})

// Single image upload (for inline upload button)
router.post('/upload-image', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error:'No file uploaded' })
  res.json({ url:`/uploads/products/${req.file.filename}` })
})

async function getProductCols() {
  const [c] = await sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products'`)
  return c.map(x=>x.COLUMN_NAME)
}

async function ensureProductImagesTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      is_primary TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `)
}

function normalizeImageUrls(bodyImages, files) {
  const urls = []

  if (files?.length) {
    for (const file of files) urls.push(`/uploads/products/${file.filename}`)
  }

  if (bodyImages) {
    const raw = Array.isArray(bodyImages) ? bodyImages : [bodyImages]
    for (const url of raw) {
      if (url && !urls.includes(url)) urls.push(url)
    }
  }

  return urls
}

// Get product images safely
async function getProductImages(productId) {
  try {
    await ensureProductImagesTable()
    const [imgs] = await sequelize.query('SELECT * FROM product_images WHERE product_id=? ORDER BY is_primary DESC', { replacements:[productId] })
    return imgs
  } catch { return [] }
}

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await sequelize.query('SELECT p.* FROM products p WHERE p.is_active=1 ORDER BY p.name')
    // Attach primary image to each product
    for (const p of rows) {
      const imgs = await getProductImages(p.id)
      p.primary_image = imgs.find(i=>i.is_primary)?.image_url || imgs[0]?.image_url || p.image_url || null
      p.images = imgs.length ? imgs.map(i=>i.image_url) : (p.image_url ? [p.image_url] : [])
    }
    res.json(rows)
  } catch (err) { res.status(500).json({ error:err.message }) }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await sequelize.query('SELECT * FROM products WHERE id=?', { replacements:[req.params.id] })
    if (!rows.length) return res.status(404).json({ error:'Not found' })
    const imgs = await getProductImages(req.params.id)
    const product = rows[0]
    const imageUrls = imgs.length ? imgs.map(i=>i.image_url) : (product.image_url ? [product.image_url] : [])
    res.json({
      product: {
        ...product,
        primary_image: imgs.find(i=>i.is_primary)?.image_url || imgs[0]?.image_url || product.image_url || null,
        images: imageUrls,
      },
      images: imgs,
    })
  } catch (err) { res.status(500).json({ error:err.message }) }
})

// POST - accepts both JSON and FormData (multipart)
router.post('/', auth, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    const body = req.body
    const name = (body.name||'').trim()
    if (!name) return res.status(400).json({ error:'Product name is required' })

    await ensureProductImagesTable()
    const cols = await getProductCols()
    const imageUrls = normalizeImageUrls(body.images, req.files)
    const fields = ['name','category','description','price','commission']
    const vals   = [
      name,
      body.category||null,
      body.description||null,
      parseFloat(body.price)||0,
      parseFloat(body.commission)||0
    ]

    if (cols.includes('hsn_code'))    { fields.push('hsn_code');    vals.push(body.hsn_code||null) }
    if (cols.includes('cgst_pct'))    { fields.push('cgst_pct');    vals.push(parseFloat(body.cgst_pct)||0) }
    if (cols.includes('sgst_pct'))    { fields.push('sgst_pct');    vals.push(parseFloat(body.sgst_pct)||0) }
    if (cols.includes('igst_pct'))    { fields.push('igst_pct');    vals.push(parseFloat(body.igst_pct)||0) }
    if (cols.includes('unit'))        { fields.push('unit');        vals.push(body.unit||'Pcs.') }
    if (cols.includes('tags'))        { fields.push('tags');        vals.push(body.tags||null) }
    if (cols.includes('material_list')){ fields.push('material_list'); vals.push(body.material_list||null) }
    if (cols.includes('material_cost')){ fields.push('material_cost'); vals.push(parseFloat(body.material_cost)||0) }
    if (cols.includes('image_url'))   { fields.push('image_url');   vals.push(imageUrls[0] || null) }

    const [insertResult] = await sequelize.query(
      `INSERT INTO products(${fields.join(',')}) VALUES(${fields.map(()=>'?').join(',')})`,
      { replacements: vals }
    )
    const productId = insertResult?.insertId || insertResult

    if (imageUrls.length) {
      for (let i=0; i<imageUrls.length; i++) {
        await sequelize.query(
          'INSERT INTO product_images(product_id,image_url,is_primary)VALUES(?,?,?)',
          { replacements:[productId, imageUrls[i], i===0?1:0] }
        ).catch(()=>{})
      }
    }

    res.json({ success:true, id:productId })
  } catch (err) {
    console.error('Product POST error:', err.message)
    res.status(500).json({ error:err.message })
  }
})

// PUT - accepts both JSON and FormData
router.put('/:id', auth, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    const body = req.body
    const name = (body.name||'').trim()
    if (!name) return res.status(400).json({ error:'Product name is required' })

    await ensureProductImagesTable()
    const cols = await getProductCols()
    const imageUrls = normalizeImageUrls(body.images, req.files)
    const updates = ['name=?','category=?','description=?','price=?','commission=?','is_active=?']
    const vals    = [name, body.category||null, body.description||null, parseFloat(body.price)||0, parseFloat(body.commission)||0, body.is_active??1]

    if (cols.includes('hsn_code'))    { updates.push('hsn_code=?');    vals.push(body.hsn_code||null) }
    if (cols.includes('cgst_pct'))    { updates.push('cgst_pct=?');    vals.push(parseFloat(body.cgst_pct)||0) }
    if (cols.includes('sgst_pct'))    { updates.push('sgst_pct=?');    vals.push(parseFloat(body.sgst_pct)||0) }
    if (cols.includes('igst_pct'))    { updates.push('igst_pct=?');    vals.push(parseFloat(body.igst_pct)||0) }
    if (cols.includes('unit'))        { updates.push('unit=?');        vals.push(body.unit||'Pcs.') }
    if (cols.includes('tags'))        { updates.push('tags=?');        vals.push(body.tags||null) }
    if (cols.includes('material_list')){ updates.push('material_list=?'); vals.push(body.material_list||null) }
    if (cols.includes('material_cost')){ updates.push('material_cost=?'); vals.push(parseFloat(body.material_cost)||0) }
    if (cols.includes('image_url') && imageUrls.length) { updates.push('image_url=?'); vals.push(imageUrls[0]) }

    vals.push(req.params.id)
    await sequelize.query(`UPDATE products SET ${updates.join(',')} WHERE id=?`, { replacements:vals })

    if (imageUrls.length) {
      await sequelize.query('DELETE FROM product_images WHERE product_id=?', { replacements:[req.params.id] }).catch(()=>{})
      for (let i=0; i<imageUrls.length; i++) {
        await sequelize.query('INSERT INTO product_images(product_id,image_url,is_primary)VALUES(?,?,?)',
          { replacements:[req.params.id, imageUrls[i], i===0?1:0] }
        ).catch(()=>{})
      }
    }

    res.json({ success:true })
  } catch (err) {
    console.error('Product PUT error:', err.message)
    res.status(500).json({ error:err.message })
  }
})

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await sequelize.query('UPDATE products SET is_active=0 WHERE id=?', { replacements:[req.params.id] })
    res.json({ success:true })
  } catch (err) { res.status(500).json({ error:err.message }) }
})

module.exports = router
