require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const { sequelize } = require('./config/database')

const app  = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: '*' }))          // Allow ALL origins — JWT in header, no cookies needed
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth',             require('./routes/auth'))
app.use('/api/users',            require('./routes/users'))
app.use('/api/workers',          require('./routes/workers'))
app.use('/api/products',         require('./routes/products'))
app.use('/api/materials',        require('./routes/materials'))
app.use('/api/customers',        require('./routes/customers'))
app.use('/api/orders',           require('./routes/orders'))
app.use('/api/work-assignments', require('./routes/workAssignments'))
app.use('/api/finance',          require('./routes/finance'))
app.use('/api/dashboard',        require('./routes/dashboard'))
app.use('/api/reports',          require('./routes/reports'))
app.use('/api/attendance',       require('./routes/attendance'))
app.use('/api/calendar',         require('./routes/calendar'))
app.use('/api/company',          require('./routes/company'))

app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }))

sequelize.authenticate()
  .then(() => {
    console.log('✅ MySQL connected')
    app.listen(PORT, () => {
      console.log(`🚀 Server: http://localhost:${PORT}`)
      console.log(`   Health: http://localhost:${PORT}/api/health`)
    })
  })
  .catch(err => {
    console.error('❌ DB Error:', err.message)
    process.exit(1)
  })
