require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const path    = require('path')
const { sequelize } = require('./config/database')

const app  = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

// Serve all uploaded files (logos, worker images, product images, QR codes)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use('/api/auth',             require('./routes/auth'))
app.use('/api/users',            require('./routes/users'))
app.use('/api/workers',          require('./routes/workers'))
app.use('/api/products',         require('./routes/products'))
app.use('/api/materials',        require('./routes/materials'))
app.use('/api/customers',        require('./routes/customers'))
app.use('/api/orders',           require('./routes/orders'))
app.use('/api/work-assignments', require('./routes/workAssignments'))
app.use('/api/finance',          require('./routes/finance'))
app.use('/api/expenses',         require('./routes/expenses'))
app.use('/api/dashboard',        require('./routes/dashboard'))
app.use('/api/reports',          require('./routes/reports'))
app.use('/api/gst',              require('./routes/gst'))
app.use('/api/website',          require('./routes/website'))
app.use('/api/attendance',       require('./routes/attendance'))
app.use('/api/calendar',         require('./routes/calendar'))
app.use('/api/company',          require('./routes/company'))
app.use('/api/search',           require('./routes/search'))

app.get('/api/health', (req, res) => res.json({ status:'OK', time:new Date() }))

sequelize.authenticate()
  .then(async () => {
    console.log('✅ MySQL connected')

    // Auto-create website tables if they don't exist
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS website_info (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          key_name   VARCHAR(100) NOT NULL UNIQUE,
          key_value  TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `)
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS website_products (
          id             INT AUTO_INCREMENT PRIMARY KEY,
          title          VARCHAR(255) NOT NULL,
          description    TEXT,
          price          DECIMAL(12,2) DEFAULT 0,
          original_price DECIMAL(12,2) DEFAULT 0,
          category       VARCHAR(100),
          tag            VARCHAR(50),
          material       VARCHAR(255),
          brand          VARCHAR(100),
          dimensions     VARCHAR(255),
          weight         VARCHAR(100),
          room_type      VARCHAR(100),
          offers         TEXT,
          image_urls     TEXT,
          sort_order     INT DEFAULT 0,
          is_active      TINYINT DEFAULT 1,
          created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS website_deals (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          title       VARCHAR(255) NOT NULL,
          subtitle    VARCHAR(255),
          description TEXT,
          bg_color    VARCHAR(20) DEFAULT '#2C2420',
          text_color  VARCHAR(20) DEFAULT '#E8C97A',
          cta_text    VARCHAR(100) DEFAULT 'Shop Now',
          is_active   TINYINT DEFAULT 1,
          sort_order  INT DEFAULT 0,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS website_speciality (
          id                 INT AUTO_INCREMENT PRIMARY KEY,
          website_product_id INT NOT NULL,
          sort_order         INT DEFAULT 0,
          FOREIGN KEY (website_product_id) REFERENCES website_products(id) ON DELETE CASCADE
        )
      `)
      console.log('✅ Website tables ready')
    } catch(e) {
      console.warn('⚠️  Website tables:', e.message)
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server: http://localhost:${PORT}`)
      console.log(`   Uploads: http://localhost:${PORT}/uploads/`)
    })
  })
  .catch(err => { console.error('❌ DB Error:', err.message); process.exit(1) })
