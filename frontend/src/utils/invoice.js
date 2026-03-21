// Invoice generator - matches the provided invoice image format exactly
export function generateInvoice(order, items, company) {
  const co = company || {}
  
  const subtotal = items.reduce((s, i) => s + parseFloat(i.total_price || 0), 0)
  const cgst = parseFloat(order.cgst || 0)
  const sgst = parseFloat(order.sgst || 0)
  const igst = parseFloat(order.igst || 0)
  const totalTax = cgst + sgst + igst
  const grandTotal = subtotal + totalTax + parseFloat(order.delivery_charges || 0) + parseFloat(order.other_charges || 0) - parseFloat(order.discount || 0)

  // Number to words
  const numToWords = (n) => {
    const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
    const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
    n = Math.round(n)
    if (n === 0) return 'Zero'
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n/10)] + (n%10 ? ' ' + a[n%10] : '')
    if (n < 1000) return a[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + numToWords(n%100) : '')
    if (n < 100000) return numToWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + numToWords(n%1000) : '')
    if (n < 10000000) return numToWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + numToWords(n%100000) : '')
    return numToWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + numToWords(n%10000000) : '')
  }

  const fmtMoney = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtDate2 = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—'

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Invoice ${order.order_number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: white; }
  .page { width: 210mm; margin: 0 auto; padding: 8mm; }
  /* Header */
  .top-bar { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:4px; margin-bottom:4px; }
  .top-bar .gstin { font-size:10px; }
  .top-bar .title { font-size:13px; font-weight:bold; }
  .top-bar .copy-type { font-size:10px; font-weight:bold; }
  .company-section { text-align:center; margin:6px 0; }
  .company-name { font-size:20px; font-weight:bold; color:#1a1a1a; }
  .company-address { font-size:10px; margin-top:2px; color:#333; line-height:1.5; }
  .company-extra { font-size:9px; color:#555; margin-top:2px; }
  /* Info row */
  .info-row { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1px solid #000; margin-top:6px; }
  .buyer-box { padding:5px 8px; border-right:1px solid #000; }
  .buyer-box h4 { font-size:10px; font-weight:bold; text-decoration:underline; margin-bottom:3px; }
  .buyer-box p { font-size:10px; line-height:1.6; }
  .invoice-meta { padding:5px 8px; }
  .invoice-meta table { width:100%; }
  .invoice-meta td { font-size:10px; padding:1px 0; }
  .invoice-meta td:first-child { font-weight:bold; width:50%; }
  /* Items table */
  .items-table { width:100%; border-collapse:collapse; margin-top:6px; font-size:10px; }
  .items-table th { background:#f0f0f0; border:1px solid #000; padding:4px 5px; text-align:center; font-size:9px; font-weight:bold; }
  .items-table td { border:1px solid #000; padding:3px 5px; vertical-align:top; }
  .items-table td.num { text-align:center; }
  .items-table td.money { text-align:right; }
  .items-table .product-name { font-weight:bold; }
  .items-table .batch { font-size:9px; color:#555; }
  /* Footer split */
  .footer-split { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1px solid #000; border-top:none; }
  .footer-left { padding:6px 8px; border-right:1px solid #000; }
  .footer-right { padding:6px 8px; }
  .gst-summary { width:100%; font-size:10px; border-collapse:collapse; }
  .gst-summary th, .gst-summary td { border:1px solid #ccc; padding:2px 4px; text-align:right; }
  .gst-summary th { background:#f5f5f5; text-align:center; font-size:9px; }
  .total-section { font-size:10px; }
  .total-row { display:flex; justify-content:space-between; padding:2px 0; }
  .total-row.main { font-size:12px; font-weight:bold; border-top:2px solid #000; margin-top:4px; padding-top:4px; }
  .total-row.tax { font-style:italic; font-weight:bold; }
  /* Bank + signature */
  .bank-section { border:1px solid #000; border-top:none; padding:6px 8px; display:flex; justify-content:space-between; align-items:flex-end; }
  .bank-details { font-size:10px; line-height:1.7; }
  .qr-box { text-align:center; }
  .qr-box img { width:60px; height:60px; }
  /* Words row */
  .words-row { border:1px solid #000; border-top:none; display:grid; grid-template-columns:1fr auto; }
  .words-left { padding:5px 8px; font-size:10px; border-right:1px solid #000; }
  .words-right { padding:5px 16px; font-size:12px; font-weight:bold; white-space:nowrap; }
  /* Terms */
  .terms-row { border:1px solid #000; border-top:none; display:grid; grid-template-columns:1fr auto; }
  .terms-left { padding:5px 8px; font-size:9px; color:#333; border-right:1px solid #000; }
  .terms-left p { margin-bottom:1px; }
  .auth-right { padding:5px 12px; text-align:center; font-size:10px; font-weight:bold; }
  @media print { .page { padding:5mm; } }
</style>
</head>
<body>
<div class="page">
  <!-- TOP BAR -->
  <div class="top-bar">
    <div class="gstin">GSTIN : ${co.gst_number || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</div>
    <div class="title">INVOICE CUM CHALLAN</div>
    <div class="copy-type">Original For Buyer</div>
  </div>

  <!-- COMPANY HEADER -->
  <div class="company-section">
    ${co.logo_url ? `<img src="${co.logo_url}" style="height:40px;margin-bottom:4px;object-fit:contain" alt="logo"/>` : ''}
    <div class="company-name">${co.company_name || 'WoodCraft Furniture'}</div>
    <div class="company-address">
      ${[co.address, [co.city,co.state,co.pincode].filter(Boolean).join(', ')].filter(Boolean).join(', ')}
      ${co.phone ? `&nbsp;&nbsp;Ph. ${co.phone}` : ''}
      ${co.email ? `&nbsp;&nbsp;E mail : ${co.email}` : ''}
    </div>
    ${co.website ? `<div class="company-extra">${co.website}</div>` : ''}
  </div>

  <!-- BUYER + INVOICE META -->
  <div class="info-row">
    <div class="buyer-box">
      <h4>Buyer's Name and Address</h4>
      <p><strong>${order.customer_name || '—'}</strong></p>
      ${order.customer_address ? `<p>${order.customer_address}</p>` : ''}
      ${order.customer_phone ? `<p>Contact No. = , ${order.customer_phone}</p>` : ''}
      ${order.gst_number ? `<p>GSTIN = ${order.gst_number}</p>` : ''}
    </div>
    <div class="invoice-meta">
      <table>
        <tr><td>Invoice No. :</td><td><strong>${order.order_number}</strong></td></tr>
        <tr><td>Date :</td><td><strong>${fmtDate2(order.order_date)}</strong></td></tr>
        ${order.lr_number ? `<tr><td>LR Reference No</td><td>${order.lr_number}</td></tr>` : ''}
        ${order.transport_name ? `<tr><td>Transport Name</td><td>${order.transport_name}</td></tr>` : ''}
        ${order.vehicle_number ? `<tr><td>Vehicle No</td><td>${order.vehicle_number}</td></tr>` : ''}
        ${order.notes ? `<tr><td>Notes</td><td>${order.notes}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:30px">Sr.</th>
        <th>Product / Description</th>
        <th>HSN Code</th>
        <th>Basic Price</th>
        <th>CGST Rs.<br/>CGST %</th>
        <th>SGST Rs.<br/>SGST %</th>
        <th>IGST Rs.<br/>IGST %</th>
        <th>Sales Price</th>
        <th>Qty</th>
        <th>Unit</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((it, i) => {
        const qty     = parseFloat(it.quantity || 1)
        const price   = parseFloat(it.unit_price || 0)
        const basic   = price / (1 + (parseFloat(it.cgst_pct||0) + parseFloat(it.sgst_pct||0) + parseFloat(it.igst_pct||0))/100) || price
        const cgstAmt = basic * parseFloat(it.cgst_pct||0) / 100
        const sgstAmt = basic * parseFloat(it.sgst_pct||0) / 100
        const igstAmt = basic * parseFloat(it.igst_pct||0) / 100
        const amount  = parseFloat(it.total_price || qty * price)
        return `
        <tr>
          <td class="num">${i+1}</td>
          <td>
            <span class="product-name">${it.custom_product_name || it.product_name_db || 'Item'}</span>
            ${it.notes ? `<br/><span class="batch">${it.notes}</span>` : ''}
          </td>
          <td class="num">${it.hsn_code || ''}</td>
          <td class="money">${fmtMoney(basic)}</td>
          <td class="money">${cgstAmt>0?fmtMoney(cgstAmt):'0.00'}<br/>${it.cgst_pct||0} %</td>
          <td class="money">${sgstAmt>0?fmtMoney(sgstAmt):'0.00'}<br/>${it.sgst_pct||0} %</td>
          <td class="money">0.00<br/>0.00 %</td>
          <td class="money">${fmtMoney(price)}</td>
          <td class="num">${qty}</td>
          <td class="num">${it.unit || 'Pcs.'}</td>
          <td class="money"><strong>${fmtMoney(amount)}</strong></td>
        </tr>`
      }).join('')}
      <!-- Spacer rows -->
      ${Array(Math.max(0, 5-items.length)).fill('<tr><td colspan="11" style="height:18px"></td></tr>').join('')}
    </tbody>
  </table>

  <!-- FOOTER SPLIT: GST SUMMARY + TOTALS -->
  <div class="footer-split">
    <div class="footer-left">
      ${(() => {
        const taxable = subtotal
        const cgstAmt = cgst || items.reduce((s,i)=>s+(parseFloat(i.unit_price||0)*parseFloat(i.quantity||1)*parseFloat(i.cgst_pct||0)/100),0)
        const sgstAmt = sgst || items.reduce((s,i)=>s+(parseFloat(i.unit_price||0)*parseFloat(i.quantity||1)*parseFloat(i.sgst_pct||0)/100),0)
        return `
        <table class="gst-summary">
          <thead><tr><th>GST %</th><th>Taxable Amt</th><th>SGST Amt.</th><th>CGST Amt.</th><th>Tax Amt.</th></tr></thead>
          <tbody>
            <tr>
              <td>${items[0]?.cgst_pct || items[0]?.sgst_pct ? (parseFloat(items[0]?.cgst_pct||0)+parseFloat(items[0]?.sgst_pct||0))+'%' : '—'}</td>
              <td>${fmtMoney(taxable)}</td>
              <td>${fmtMoney(sgstAmt)}</td>
              <td>${fmtMoney(cgstAmt)}</td>
              <td>${fmtMoney(cgstAmt+sgstAmt)}</td>
            </tr>
          </tbody>
        </table>`
      })()}
    </div>
    <div class="footer-right">
      <div class="total-section">
        <div class="total-row"><span>Total Amount Before Tax</span><strong>${fmtMoney(subtotal)}</strong></div>
        ${cgst||sgst ? `
        <div class="total-row tax"><span>Add: SGST</span><strong>${fmtMoney(sgst)}</strong></div>
        <div class="total-row tax"><span>Add: CGST</span><strong>${fmtMoney(cgst)}</strong></div>
        <div class="total-row tax"><span>Add: IGST</span><strong>${fmtMoney(igst)}</strong></div>
        <div class="total-row" style="border-top:1px solid #ccc;margin-top:2px;padding-top:2px"><span>Total Tax Amount : GST</span><strong>${fmtMoney(totalTax)}</strong></div>` : ''}
        ${order.discount ? `<div class="total-row"><span>(-) Discount</span><strong>${fmtMoney(order.discount)}</strong></div>` : ''}
        ${order.delivery_charges ? `<div class="total-row"><span>Delivery Charges</span><strong>${fmtMoney(order.delivery_charges)}</strong></div>` : ''}
        <div style="font-size:9px;color:#888;text-align:right">(-) Round Off : ${(Math.round(grandTotal)-grandTotal).toFixed(2)}</div>
      </div>
    </div>
  </div>

  <!-- BANK + QR -->
  <div class="bank-section">
    <div class="bank-details">
      ${co.bank_name ? `<strong>Bank Name : ${co.bank_name}</strong><br/>` : ''}
      ${co.bank_account ? `Ac No. : ${co.bank_account}<br/>` : ''}
      ${co.bank_ifsc ? `IFSC Code : ${co.bank_ifsc}` : ''}
      ${co.upi_id ? `<br/>UPI : ${co.upi_id}` : ''}
      ${!co.bank_name && !co.upi_id ? '<em style="color:#aaa">Bank/UPI details not configured</em>' : ''}
    </div>
    ${co.qr_url ? `<div class="qr-box"><img src="${co.qr_url}" alt="UPI QR"/><div style="font-size:9px">Scan to Pay</div></div>` : ''}
  </div>

  <!-- GRAND TOTAL IN WORDS -->
  <div class="words-row">
    <div class="words-left">
      <strong>Bill Amount In Words :</strong> ${numToWords(Math.round(grandTotal))} Rupees Only
    </div>
    <div class="words-right">GRAND TOTAL &nbsp;&nbsp; ${fmtMoney(Math.round(grandTotal))}</div>
  </div>

  <!-- TERMS + SIGNATURE -->
  <div class="terms-row">
    <div class="terms-left">
      <strong>Terms &amp; Conditions:</strong><br/>
      ${(co.invoice_terms || '1) Goods once sold will not be taken back or exchanged\n2) Subject to local jurisdiction').split('\n').map((t,i)=>`<p>${i+1}) ${t.replace(/^\d+[\)\.]\s*/,'')}</p>`).join('')}
    </div>
    <div class="auth-right">
      <div style="height:40px"></div>
      For ${co.company_name || 'WoodCraft Furniture'}<br/>
      <br/>Auth. Signatory
    </div>
  </div>

</div>
</body>
</html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 600)
}
