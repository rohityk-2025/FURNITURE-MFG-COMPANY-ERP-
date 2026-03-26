// Run from backend folder: node run-this-first.js
// Creates correct password hashes for your machine

const bcrypt = require('bcryptjs')
const mysql  = require('mysql2/promise')
require('dotenv').config()

;(async () => {
  const hash = bcrypt.hashSync('admin123', 10)
  console.log('\n✅ Hash for admin123:', hash)
  console.log('\nSQL to run:\n')
  console.log(`UPDATE users SET password='${hash}' WHERE email='admin@furnitureerp.com';`)
  console.log(`UPDATE users SET password='${hash}' WHERE email='manager@furnitureerp.com';\n`)

  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST||'localhost', user: process.env.DB_USER||'root',
      password: process.env.DB_PASSWORD||'manager', database: process.env.DB_NAME||'furniture_erp6'
    })
    await conn.execute(`UPDATE users SET password=? WHERE email='admin@furnitureerp.com'`, [hash])
    await conn.execute(`UPDATE users SET password=? WHERE email='manager@furnitureerp.com'`, [hash])
    console.log('✅ Passwords updated in database!')
    console.log('   Login: admin@furnitureerp.com / admin123')
    await conn.end()
  } catch(e) {
    console.log('Could not auto-update DB:', e.message)
    console.log('Run the SQL above manually.')
  }
})()
