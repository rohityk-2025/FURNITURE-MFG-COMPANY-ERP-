/**
 * GST MODULE - backend/routes/gst.js
 * Handles Output GST (from orders), Input GST (from expenses), GSTR-1, GSTR-3B
 *
 * GST Calculation Logic (Indian GST):
 * - Output GST = Tax collected on sales (CGST + SGST or IGST from orders)
 * - Input GST (ITC) = Tax paid on purchases (tax_amount from expenses, excl. salary)
 * - Net Payable = Output GST - Input GST
 * - If Input > Output => carry forward as ITC
 */
const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

// ── Helper: get month date range ──────────────────────────────────
function getMonthRange(year, month) {
  const y = parseInt(year), m = parseInt(month)
  const from = `${y}-${String(m).padStart(2,'0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to = `${y}-${String(m).padStart(2,'0')}-${lastDay}`
  return { from, to }
}

// ── GST Dashboard Summary ─────────────────────────────────────────
router.get('/summary', auth, async (req, res) => {
  try {
    const year  = req.query.year  || new Date().getFullYear()
    const month = req.query.month || (new Date().getMonth() + 1)
    const { from, to } = getMonthRange(year, month)

    // Output GST from orders (non-cancelled)
    const [outGST] = await sequelize.query(
      `SELECT
         COALESCE(SUM(total_amount),0) as total_sales,
         COALESCE(SUM(cgst),0) as total_cgst,
         COALESCE(SUM(sgst),0) as total_sgst,
         COALESCE(SUM(igst),0) as total_igst,
         COALESCE(SUM(cgst)+SUM(sgst)+SUM(igst),0) as total_output_gst,
         COUNT(*) as order_count
       FROM orders
       WHERE order_date BETWEEN ? AND ?
         AND status NOT IN ('CANCELLED')`,
      { replacements:[from, to] }
    )

    // Input GST from expenses (exclude SALARY category, only include tax_amount > 0)
    const [inGST] = await sequelize.query(
      `SELECT
         COALESCE(SUM(amount),0) as total_purchases,
         COALESCE(SUM(tax_amount),0) as total_input_gst,
         COUNT(*) as expense_count
       FROM expenses
       WHERE date BETWEEN ? AND ?
         AND COALESCE(is_active,1)=1
         AND category != 'SALARY'`,
      { replacements:[from, to] }
    )

    const outputGST = parseFloat(outGST[0].total_output_gst || 0)
    const inputGST  = parseFloat(inGST[0].total_input_gst || 0)
    const netPayable = Math.max(0, outputGST - inputGST)
    const itcCarryForward = Math.max(0, inputGST - outputGST)

    res.json({
      month, year, from, to,
      totalSales:     parseFloat(outGST[0].total_sales),
      totalPurchases: parseFloat(inGST[0].total_purchases),
      orderCount:     outGST[0].order_count,
      expenseCount:   inGST[0].expense_count,
      cgst:           parseFloat(outGST[0].total_cgst),
      sgst:           parseFloat(outGST[0].total_sgst),
      igst:           parseFloat(outGST[0].total_igst),
      outputGST,
      inputGST,
      netPayable,
      itcCarryForward,
    })
  } catch(err) {
    console.error('GST summary error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Output GST - order list with GST details ─────────────────────
router.get('/output', auth, async (req, res) => {
  try {
    const year  = req.query.year  || new Date().getFullYear()
    const month = req.query.month || (new Date().getMonth() + 1)
    const { from, to } = getMonthRange(year, month)

    const [orders] = await sequelize.query(
      `SELECT
         o.id, o.order_number, o.order_date,
         c.name as customer_name, c.gst_number as customer_gstin,
         c.address as customer_address,
         o.subtotal, o.discount,
         (o.subtotal - o.discount) as taxable_amount,
         o.cgst, o.sgst, o.igst,
         (o.cgst + o.sgst + o.igst) as total_gst,
         o.delivery_charges, o.other_charges,
         o.total_amount, o.amount_paid, o.payment_status,
         o.status
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.order_date BETWEEN ? AND ?
         AND o.status NOT IN ('CANCELLED')
       ORDER BY o.order_date ASC`,
      { replacements:[from, to] }
    )

    // GST rate-wise breakdown from order items
    const [rateBreakdown] = await sequelize.query(
      `SELECT
         oi.cgst_pct, oi.sgst_pct, oi.igst_pct,
         (oi.cgst_pct + oi.sgst_pct + oi.igst_pct) as gst_rate,
         SUM(oi.total_price) as taxable,
         SUM(oi.total_price * oi.cgst_pct / 100) as cgst_amt,
         SUM(oi.total_price * oi.sgst_pct / 100) as sgst_amt,
         SUM(oi.total_price * oi.igst_pct / 100) as igst_amt
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.order_date BETWEEN ? AND ?
         AND o.status NOT IN ('CANCELLED')
       GROUP BY oi.cgst_pct, oi.sgst_pct, oi.igst_pct
       ORDER BY gst_rate`,
      { replacements:[from, to] }
    )

    const totalCGST  = orders.reduce((s,o) => s + parseFloat(o.cgst||0), 0)
    const totalSGST  = orders.reduce((s,o) => s + parseFloat(o.sgst||0), 0)
    const totalIGST  = orders.reduce((s,o) => s + parseFloat(o.igst||0), 0)
    const totalOutput = totalCGST + totalSGST + totalIGST
    const totalTaxable = orders.reduce((s,o) => s + parseFloat(o.taxable_amount||0), 0)

    res.json({
      from, to, month, year,
      orders,
      rateBreakdown,
      summary: { totalTaxable, totalCGST, totalSGST, totalIGST, totalOutput, orderCount: orders.length }
    })
  } catch(err) {
    console.error('Output GST error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Update order GST values (for CA edits) ───────────────────────
router.put('/output/:orderId', auth, async (req, res) => {
  try {
    const { cgst, sgst, igst } = req.body
    const cgstV = parseFloat(cgst) || 0
    const sgstV = parseFloat(sgst) || 0
    const igstV = parseFloat(igst) || 0

    // Recalculate total
    const [rows] = await sequelize.query('SELECT * FROM orders WHERE id=?', { replacements:[req.params.orderId] })
    if (!rows.length) return res.status(404).json({ error:'Order not found' })
    const o = rows[0]
    const newTotal = parseFloat(o.subtotal||0) - parseFloat(o.discount||0) + cgstV + sgstV + igstV + parseFloat(o.delivery_charges||0) + parseFloat(o.other_charges||0)

    await sequelize.query(
      'UPDATE orders SET cgst=?, sgst=?, igst=?, total_amount=? WHERE id=?',
      { replacements:[cgstV, sgstV, igstV, Math.round(newTotal*100)/100, req.params.orderId] }
    )
    res.json({ success:true })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Input GST - expense list (exclude SALARY) ────────────────────
router.get('/input', auth, async (req, res) => {
  try {
    const year  = req.query.year  || new Date().getFullYear()
    const month = req.query.month || (new Date().getMonth() + 1)
    const { from, to } = getMonthRange(year, month)

    const [expenses] = await sequelize.query(
      `SELECT
         e.id, e.title, e.category, e.vendor_name, e.vendor_gst,
         e.amount,
         COALESCE(e.tax_pct, 0) as tax_pct,
         COALESCE(e.tax_amount, 0) as tax_amount,
         (e.amount - COALESCE(e.tax_amount, 0)) as taxable_amount,
         e.date,
         u.name as created_by_name
       FROM expenses e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.date BETWEEN ? AND ?
         AND COALESCE(e.is_active,1) = 1
         AND e.category != 'SALARY'
       ORDER BY e.date ASC`,
      { replacements:[from, to] }
    )

    const totalTaxable = expenses.reduce((s,e) => s + parseFloat(e.taxable_amount||0), 0)
    const totalInputGST = expenses.reduce((s,e) => s + parseFloat(e.tax_amount||0), 0)
    const totalWithTax  = expenses.reduce((s,e) => s + parseFloat(e.amount||0), 0)

    res.json({
      from, to, month, year,
      expenses,
      summary: { totalTaxable, totalInputGST, totalWithTax, count: expenses.length }
    })
  } catch(err) {
    console.error('Input GST error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── GSTR-1 data (B2B invoices for JSON / Excel) ──────────────────
router.get('/gstr1', auth, async (req, res) => {
  try {
    const year  = req.query.year  || new Date().getFullYear()
    const month = req.query.month || (new Date().getMonth() + 1)
    const { from, to } = getMonthRange(year, month)

    // B2B: orders where customer has GST number
    const [b2b] = await sequelize.query(
      `SELECT
         o.order_number as inv_no, o.order_date as inv_date,
         c.name as buyer_name, c.gst_number as buyer_gstin,
         c.address as buyer_address,
         o.subtotal, o.discount,
         (o.subtotal - COALESCE(o.discount,0)) as taxable_value,
         o.cgst, o.sgst, o.igst,
         (o.cgst + o.sgst + o.igst) as total_tax,
         o.total_amount as invoice_value
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.order_date BETWEEN ? AND ?
         AND o.status NOT IN ('CANCELLED')
         AND c.gst_number IS NOT NULL AND c.gst_number != ''
       ORDER BY o.order_date`,
      { replacements:[from, to] }
    )

    // B2C: orders where customer has no GST number
    const [b2c] = await sequelize.query(
      `SELECT
         o.order_number as inv_no, o.order_date as inv_date,
         c.name as buyer_name,
         (o.subtotal - COALESCE(o.discount,0)) as taxable_value,
         o.cgst, o.sgst, o.igst,
         o.total_amount as invoice_value
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.order_date BETWEEN ? AND ?
         AND o.status NOT IN ('CANCELLED')
         AND (c.gst_number IS NULL OR c.gst_number = '')
       ORDER BY o.order_date`,
      { replacements:[from, to] }
    )

    // Get company info for filing
    const [company] = await sequelize.query('SELECT * FROM company_details WHERE id=1')
    const co = company[0] || {}

    res.json({
      gstin: co.gst_number || '',
      legal_name: co.company_name || '',
      ret_period: `${String(month).padStart(2,'0')}${year}`,
      from, to, month, year,
      b2b,
      b2c,
      summary: {
        b2bCount: b2b.length,
        b2cCount: b2c.length,
        totalB2BTax: b2b.reduce((s,o) => s+parseFloat(o.total_tax||0),0),
        totalB2CTax: b2c.reduce((s,o) => s+parseFloat(o.cgst||0)+parseFloat(o.sgst||0)+parseFloat(o.igst||0),0),
      }
    })
  } catch(err) {
    console.error('GSTR-1 error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
