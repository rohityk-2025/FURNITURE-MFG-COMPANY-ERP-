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
app.use('/api/attendance',       require('./routes/attendance'))
app.use('/api/calendar',         require('./routes/calendar'))
app.use('/api/company',          require('./routes/company'))
app.use('/api/search',           require('./routes/search'))

app.get('/api/health', (req, res) => res.json({ status:'OK', time:new Date() }))

sequelize.authenticate()
  .then(() => {
    console.log('✅ MySQL connected')
    app.listen(PORT, () => {
      console.log(`🚀 Server: http://localhost:${PORT}`)
      console.log(`   Uploads: http://localhost:${PORT}/uploads/`)
    })
  })
  .catch(err => { console.error('❌ DB Error:', err.message); process.exit(1) })
