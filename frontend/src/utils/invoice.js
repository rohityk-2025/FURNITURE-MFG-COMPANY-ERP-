export function generateInvoice(order, items, company) {
  const co  = company || {}
  const sub = parseFloat(order.subtotal || items.reduce((s,i)=>s+parseFloat(i.total_price||0),0))
  const discountAmt = Math.min(parseFloat(order.discount||0), sub)
  const taxableSub = Math.max(0, sub - discountAmt)
  const cgstAmt = parseFloat(order.cgst||0)
  const sgstAmt = parseFloat(order.sgst||0)
  const igstAmt = parseFloat(order.igst||0)
  const totalTax = cgstAmt+sgstAmt+igstAmt
  const grand = parseFloat(order.total_amount||0)
  const balance = grand - parseFloat(order.amount_paid||0)

  const M = (n) => `₹${parseFloat(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
  const D = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'

  // Number to words
  const nw = (n) => {
    const a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
    const b=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
    n=Math.round(n); if(!n) return 'Zero'
    if(n<20) return a[n]; if(n<100) return b[Math.floor(n/10)]+(n%10?' '+a[n%10]:'')
    if(n<1000) return a[Math.floor(n/100)]+' Hundred'+(n%100?' '+nw(n%100):'')
    if(n<100000) return nw(Math.floor(n/1000))+' Thousand'+(n%1000?' '+nw(n%1000):'')
    if(n<10000000) return nw(Math.floor(n/100000))+' Lakh'+(n%100000?' '+nw(n%100000):'')
    return nw(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+nw(n%10000000):'')
  }

  const useIGST = igstAmt > 0

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>Invoice ${order.order_number}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1a1a1a;background:#fff}
  .page{width:210mm;margin:0 auto;padding:8mm;min-height:297mm}
  /* ── Outer border box ── */
  .invoice-box{border:2px solid #1a1a1a;border-radius:0}
  /* ── Header ── */
  .header{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:10px 14px;border-bottom:2px solid #1a1a1a}
  .logo-box{width:56px;height:56px;border:1px solid #ddd;border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f9f9f9}
  .logo-box img{width:100%;height:100%;object-fit:contain}
  .logo-placeholder{font-size:22px;font-weight:900;color:#2563eb;letter-spacing:-1px}
  .co-name{font-size:18px;font-weight:900;color:#1a1a1a;line-height:1.2}
  .co-info{font-size:9.5px;color:#555;line-height:1.7;margin-top:2px}
  .invoice-title{text-align:right}
  .inv-label{font-size:20px;font-weight:900;color:#2563eb;letter-spacing:1px}
  .inv-num{font-size:13px;font-weight:800;color:#1a1a1a;margin-top:2px}
  .inv-date{font-size:10px;color:#666;margin-top:2px}
  /* ── Top info bar ── */
  .topbar{display:grid;grid-template-columns:1fr auto;gap:0;border-bottom:1.5px solid #1a1a1a}
  .gstin-bar{padding:5px 14px;font-size:10px;font-weight:700;letter-spacing:0.04em}
  .copy-bar{padding:5px 14px;font-size:9px;font-weight:700;color:#555;border-left:1px solid #ddd;display:flex;align-items:center}
  /* ── Buyer / Details grid ── */
  .info-grid{display:grid;grid-template-columns:1fr 1fr;border-bottom:1.5px solid #1a1a1a}
  .info-box{padding:9px 14px}
  .info-box+.info-box{border-left:1px solid #ddd}
  .info-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#888;margin-bottom:4px}
  .info-val{font-size:11px;color:#1a1a1a;line-height:1.7}
  /* ── Items table ── */
  table{width:100%;border-collapse:collapse}
  th{background:#1a1a1a;color:#fff;padding:7px 8px;text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700}
  th.num,td.num{text-align:right}
  td{padding:7px 8px;border-bottom:1px solid #e8e8e8;font-size:10.5px;vertical-align:top}
  tr:nth-child(even) td{background:#fafafa}
  tfoot td{border-top:2px solid #1a1a1a;font-size:11px;font-weight:700;padding:8px 8px;background:#f5f5f5}
  /* ── Bottom split ── */
  .bottom-grid{display:grid;grid-template-columns:1fr 1fr;border-top:1.5px solid #1a1a1a}
  .bottom-left{padding:10px 14px;border-right:1px solid #1a1a1a}
  .bottom-right{padding:10px 14px}
  .total-row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px}
  .total-row.grand{font-size:14px;font-weight:900;color:#2563eb;border-top:1.5px solid #1a1a1a;margin-top:4px;padding-top:5px}
  .total-row.balance{font-size:12px;font-weight:700;color:#dc2626}
  /* ── Bank + words ── */
  .bank-row{border-top:1.5px solid #1a1a1a;display:grid;grid-template-columns:1fr auto;gap:0}
  .bank-detail{padding:9px 14px;font-size:10px;line-height:1.8}
  .qr-box{padding:9px 14px;border-left:1px solid #1a1a1a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
  .qr-box img{width:72px;height:72px;object-fit:contain}
  .words-row{border-top:1.5px solid #1a1a1a;display:grid;grid-template-columns:1fr auto;gap:0}
  .words-left{padding:7px 14px;font-size:10px;color:#333;border-right:1px solid #1a1a1a}
  .words-right{padding:7px 14px;font-size:12px;font-weight:900;color:#2563eb;white-space:nowrap;display:flex;align-items:center}
  .terms-row{border-top:1.5px solid #1a1a1a;display:grid;grid-template-columns:1fr auto;gap:0}
  .terms-left{padding:7px 14px;font-size:9px;color:#555;line-height:1.6}
  .auth-right{padding:7px 16px;border-left:1px solid #1a1a1a;text-align:center;font-size:10px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:130px}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:4mm}}
</style>
</head>
<body><div class="page"><div class="invoice-box">

  <!-- TOP GSTIN BAR -->
  <div class="topbar">
    <div class="gstin-bar">GSTIN: ${co.gst_number || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</div>
    <div class="copy-bar">ORIGINAL FOR BUYER</div>
  </div>

  <!-- HEADER: Logo | Company | Invoice -->
  <div class="header">
    <div class="logo-box">
      ${co.logo_url ? `<img src="${co.logo_url}" alt="logo"/>` : `<div class="logo-placeholder">${(co.company_name||'W').charAt(0)}</div>`}
    </div>
    <div>
      <div class="co-name">${co.company_name||'WoodCraft Furniture'}</div>
      ${co.tagline?`<div style="font-size:10px;color:#555;font-style:italic;margin-bottom:2px">${co.tagline}</div>`:''}
      <div class="co-info">
        ${[co.address,[co.city,co.state,co.pincode].filter(Boolean).join(', ')].filter(Boolean).join(', ')}
        ${co.phone?`&nbsp;·&nbsp;Ph: ${co.phone}`:''}
        ${co.email?`&nbsp;·&nbsp;${co.email}`:''}
        ${co.extra_info?`<br/>${co.extra_info}`:''}
      </div>
    </div>
    <div class="invoice-title">
      <div class="inv-label">INVOICE</div>
      <div class="inv-num">${order.order_number}</div>
      <div class="inv-date">Date: ${D(order.order_date)}</div>
      ${order.delivery_date?`<div class="inv-date">Delivery: ${D(order.delivery_date)}</div>`:''}
    </div>
  </div>

  <!-- BUYER + ORDER INFO -->
  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Bill To</div>
      <div class="info-val">
        <strong>${order.customer_name||'—'}</strong><br/>
        ${order.customer_address?`${order.customer_address}<br/>`:''}
        ${order.customer_phone?`Ph: ${order.customer_phone}<br/>`:''}
        ${order.customer_email?`${order.customer_email}<br/>`:''}
        ${order.gst_number?`GSTIN: <strong>${order.gst_number}</strong>`:''}
      </div>
    </div>
    <div class="info-box">
      <div class="info-label">Order Details</div>
      <div class="info-val">
        <table style="width:100%;border-collapse:collapse">
          ${[['Invoice No.', order.order_number],['Order Date', D(order.order_date)],['Delivery Date', D(order.delivery_date)],['Payment Status',order.payment_status||'UNPAID'],['Payment Mode', order.payment_mode||'CASH']].map(([l,v])=>`<tr><td style="padding:1px 0;color:#666;width:45%">${l}</td><td style="padding:1px 0;font-weight:600">${v}</td></tr>`).join('')}
          ${order.transport_name?`<tr><td style="color:#666">Transport</td><td style="font-weight:600">${order.transport_name}</td></tr>`:''}
          ${order.vehicle_number?`<tr><td style="color:#666">Vehicle No.</td><td style="font-weight:600">${order.vehicle_number}</td></tr>`:''}
        </table>
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <table>
    <thead>
      <tr>
        <th style="width:28px">#</th>
        <th>Product / Description</th>
        <th style="width:50px">HSN</th>
        <th style="width:50px" class="num">Qty</th>
        <th style="width:55px" class="num">Unit</th>
        <th style="width:80px" class="num">Rate</th>
        ${useIGST ? `<th style="width:75px" class="num">IGST</th>` : `<th style="width:65px" class="num">CGST</th><th style="width:65px" class="num">SGST</th>`}
        <th style="width:90px" class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((it,i)=>{
        const qty   = parseFloat(it.quantity||1)
        const rate  = parseFloat(it.unit_price||0)
        const amt   = parseFloat(it.total_price||qty*rate)
        const cgstPct = parseFloat(it.cgst_pct||0), sgstPct=parseFloat(it.sgst_pct||0), igstPct=parseFloat(it.igst_pct||0)
        const cgstAmt2=amt*cgstPct/100, sgstAmt2=amt*sgstPct/100, igstAmt2=amt*igstPct/100
        return `<tr>
          <td class="num" style="color:#888">${i+1}</td>
          <td><strong>${it.custom_product_name||it.product_name_db||'Item'}</strong>${it.notes?`<br/><span style="font-size:9px;color:#888">${it.notes}</span>`:''}</td>
          <td>${it.hsn_code||''}</td>
          <td class="num">${qty}</td>
          <td class="num" style="color:#666">${it.unit||'Pcs.'}</td>
          <td class="num">${M(rate)}</td>
          ${useIGST ? `<td class="num">${igstPct}%<br/><strong>${M(igstAmt2)}</strong></td>` : `<td class="num">${cgstPct}%<br/><strong>${M(cgstAmt2)}</strong></td><td class="num">${sgstPct}%<br/><strong>${M(sgstAmt2)}</strong></td>`}
          <td class="num"><strong>${M(amt)}</strong></td>
        </tr>`
      }).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="${useIGST?6:7}" style="text-align:right;font-size:11px;font-weight:700">Subtotal Before Tax</td>
        <td class="num" colspan="${useIGST?2:1}">${M(sub)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- BOTTOM: Tax Summary | Totals -->
  <div class="bottom-grid">
    <div class="bottom-left">
      <div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Tax Summary</div>
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead><tr style="background:#f5f5f5">
          ${useIGST ? '<th style="padding:4px 6px;text-align:left">IGST %</th><th style="padding:4px 6px;text-align:right">Taxable Amt</th><th style="padding:4px 6px;text-align:right">IGST Amt</th>' : '<th style="padding:4px 6px;text-align:left">GST %</th><th style="padding:4px 6px;text-align:right">Taxable Amt</th><th style="padding:4px 6px;text-align:right">CGST</th><th style="padding:4px 6px;text-align:right">SGST</th><th style="padding:4px 6px;text-align:right">Total Tax</th>'}
        </tr></thead>
        <tbody>
          ${useIGST ? `<tr><td style="padding:4px 6px">${items[0]?.igst_pct||0}%</td><td style="padding:4px 6px;text-align:right">${M(taxableSub)}</td><td style="padding:4px 6px;text-align:right;font-weight:700">${M(igstAmt)}</td></tr>`
          : `<tr><td style="padding:4px 6px">${items[0]?.cgst_pct||0}+${items[0]?.sgst_pct||0}%</td><td style="padding:4px 6px;text-align:right">${M(taxableSub)}</td><td style="padding:4px 6px;text-align:right">${M(cgstAmt)}</td><td style="padding:4px 6px;text-align:right">${M(sgstAmt)}</td><td style="padding:4px 6px;text-align:right;font-weight:700">${M(cgstAmt+sgstAmt)}</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="bottom-right">
      <div class="total-row"><span>Subtotal</span><span>${M(sub)}</span></div>
      ${discountAmt>0?`<div class="total-row" style="color:#16a34a"><span>(-) Discount</span><span>${M(discountAmt)}</span></div>`:''}
      <div class="total-row"><span>Taxable Amount</span><span>${M(taxableSub)}</span></div>
      ${useIGST ? `<div class="total-row" style="color:#555;font-style:italic"><span>IGST</span><span>${M(igstAmt)}</span></div>` : `<div class="total-row" style="color:#555;font-style:italic"><span>CGST + SGST</span><span>${M(cgstAmt+sgstAmt)}</span></div>`}
      ${parseFloat(order.delivery_charges||0)>0?`<div class="total-row"><span>Delivery Charges</span><span>${M(order.delivery_charges)}</span></div>`:''}
      ${parseFloat(order.other_charges||0)>0?`<div class="total-row"><span>Other Charges</span><span>${M(order.other_charges)}</span></div>`:''}
      <div class="total-row grand"><span>GRAND TOTAL</span><span>${M(grand)}</span></div>
      ${parseFloat(order.amount_paid||0)>0?`<div class="total-row" style="color:#16a34a;font-weight:700"><span>Amount Paid</span><span>${M(order.amount_paid)}</span></div>`:''}
      ${balance>0?`<div class="total-row balance"><span>Balance Due</span><span>${M(balance)}</span></div>`:''}
    </div>
  </div>

  <!-- BANK + QR -->
  <div class="bank-row">
    <div class="bank-detail">
      <strong style="display:block;margin-bottom:4px;font-size:10px">Payment Details</strong>
      ${co.bank_name?`Bank: <strong>${co.bank_name}</strong>${co.bank_branch?` · Branch: ${co.bank_branch}`:''}<br/>`:'' }
      ${co.bank_account?`A/C No.: <strong>${co.bank_account}</strong> &nbsp; IFSC: <strong>${co.bank_ifsc||'—'}</strong><br/>`:''}
      ${co.upi_id?`UPI: <strong>${co.upi_id}</strong>${co.upi_phone?` &nbsp; Phone: ${co.upi_phone}`:''}`:''}
      ${!co.bank_name && !co.upi_id?'<em style="color:#aaa">Bank details not configured. Please update Company Settings.</em>':''}
    </div>
    ${co.qr_url?`<div class="qr-box"><img src="${co.qr_url}" alt="QR"/><div style="font-size:9px;color:#888">Scan to Pay</div></div>`:'<div style="padding:10px 14px;border-left:1px solid #ddd;min-width:100px"></div>'}
  </div>

  <!-- AMOUNT IN WORDS -->
  <div class="words-row">
    <div class="words-left"><strong>Amount in Words:</strong> ${nw(Math.round(grand))} Rupees Only${balance>0?` &nbsp;|&nbsp; Balance Due: ${nw(Math.round(balance))} Rupees`:''}</div>
    <div class="words-right">TOTAL &nbsp; ${M(Math.round(grand))}</div>
  </div>

  <!-- TERMS + SIGNATURE -->
  <div class="terms-row">
    <div class="terms-left">
      <strong>Terms &amp; Conditions:</strong><br/>
      ${(co.invoice_terms||'1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.').split('\n').filter(Boolean).map((t,i)=>`${i+1}. ${t.replace(/^\d+[.)]\s*/,'')}`).join(' &nbsp;·&nbsp; ')}
    </div>
    <div class="auth-right">
      <div style="height:36px"></div>
      <div style="border-top:1px solid #1a1a1a;width:100%;padding-top:5px;text-align:center">
        <strong>For ${co.company_name||'WoodCraft Furniture'}</strong><br/>Authorised Signatory
      </div>
    </div>
  </div>

</div></div></body></html>`

  const w = window.open('','_blank')
  w.document.write(html)
  w.document.close()
  setTimeout(()=>{ w.focus(); w.print() }, 600)
}
