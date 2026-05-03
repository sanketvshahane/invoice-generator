// ===== AUTH =====
const AUTH_HASH = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';

function checkAuth() {
  const input = document.getElementById('authPassword').value;
  if (input === 'Aspa@01') {
    sessionStorage.setItem('authenticated', 'true');
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = '';
    updatePreview();
  } else {
    document.getElementById('authError').textContent = 'Incorrect password';
  }
}

(function() {
  if (sessionStorage.getItem('authenticated') === 'true') {
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('authScreen').style.display = 'none';
      document.getElementById('appContainer').style.display = '';
    });
  }
})();

// ===== STATE =====
let lineItems = [];
let itemIdCounter = 0;
let qrCodeDataUrl = '';

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('invoiceDate').value = today;
  document.getElementById('dueDate').value = today;

  addLineItem();
  updatePreview();

  // Auto-update preview on any input change
  document.getElementById('formPanel').addEventListener('input', debounce(updatePreview, 300));
  document.getElementById('formPanel').addEventListener('change', updatePreview);
});

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function handleQrUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    qrCodeDataUrl = e.target.result;
    updatePreview();
  };
  reader.readAsDataURL(file);
}

// ===== LINE ITEMS =====
function addLineItem() {
  const id = ++itemIdCounter;
  lineItems.push({ id, psNo: '', description: '', hsn: '', taxPct: 18, qty: 1, unit: 'EA', rate: 0, disPct: 0 });
  renderLineItems();
  updatePreview();
}

function removeLineItem(id) {
  lineItems = lineItems.filter(item => item.id !== id);
  renderLineItems();
  updatePreview();
}

function updateLineItem(id, field, value) {
  const item = lineItems.find(i => i.id === id);
  if (item) {
    if (['taxPct', 'qty', 'rate', 'disPct'].includes(field)) {
      item[field] = parseFloat(value) || 0;
    } else {
      item[field] = value;
    }
  }
  updatePreview();
}

function renderLineItems() {
  const tbody = document.getElementById('lineItemsBody');
  tbody.innerHTML = lineItems.map(item => `
    <tr>
      <td><input type="text" value="${item.psNo}" onchange="updateLineItem(${item.id},'psNo',this.value)"></td>
      <td><input type="text" value="${item.description}" onchange="updateLineItem(${item.id},'description',this.value)"></td>
      <td><input type="text" value="${item.hsn}" onchange="updateLineItem(${item.id},'hsn',this.value)"></td>
      <td><input type="number" value="${item.taxPct}" onchange="updateLineItem(${item.id},'taxPct',this.value)" style="width:45px"></td>
      <td><input type="number" value="${item.qty}" onchange="updateLineItem(${item.id},'qty',this.value)" style="width:50px"></td>
      <td><input type="text" value="${item.unit}" onchange="updateLineItem(${item.id},'unit',this.value)" style="width:40px"></td>
      <td><input type="number" value="${item.rate}" onchange="updateLineItem(${item.id},'rate',this.value)" style="width:70px"></td>
      <td><input type="number" value="${item.disPct}" onchange="updateLineItem(${item.id},'disPct',this.value)" style="width:45px"></td>
      <td><button class="btn-remove" onclick="removeLineItem(${item.id})">X</button></td>
    </tr>
  `).join('');
}

// ===== CALCULATIONS =====
function calculateLineAmount(item) {
  const gross = item.qty * item.rate;
  const discount = gross * (item.disPct / 100);
  return gross - discount;
}

function calculateTotals() {
  const gstType = document.getElementById('gstType').value;
  let subTotal = 0;
  const taxBreakdown = {};

  lineItems.forEach(item => {
    const amount = calculateLineAmount(item);
    subTotal += amount;

    const key = item.taxPct;
    if (!taxBreakdown[key]) taxBreakdown[key] = { rate: key, taxableAmount: 0 };
    taxBreakdown[key].taxableAmount += amount;
  });

  let totalTax = 0;
  const taxes = [];

  Object.values(taxBreakdown).forEach(tb => {
    if (gstType === 'intra') {
      const halfRate = tb.rate / 2;
      const halfTax = tb.taxableAmount * (halfRate / 100);
      taxes.push({ label: `CGST ${halfRate}%`, amount: halfTax, on: tb.taxableAmount });
      taxes.push({ label: `SGST ${halfRate}%`, amount: halfTax, on: tb.taxableAmount });
      totalTax += halfTax * 2;
    } else {
      const tax = tb.taxableAmount * (tb.rate / 100);
      taxes.push({ label: `IGST ${tb.rate}%`, amount: tax, on: tb.taxableAmount });
      totalTax += tax;
    }
  });

  return { subTotal, taxes, totalTax, grandTotal: subTotal + totalTax };
}

// ===== NUMBER TO WORDS =====
function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = 'Rupees ' + convert(rupees);
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  return result + ' Only';
}

function formatCurrency(num) {
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ===== PREVIEW GENERATION =====
function getFormData() {
  const g = id => document.getElementById(id).value;
  return {
    seller: {
      name: g('sellerName'), address: g('sellerAddress'), phone: g('sellerPhone'),
      email: g('sellerEmail'), website: g('sellerWebsite'), gstin: g('sellerGstin'),
      pan: g('sellerPan'), state: g('sellerState'), stateCode: g('sellerStateCode'), msme: g('sellerMsme')
    },
    irn: {
      ackNo: g('ackNo'), ackDate: g('ackDate'), irnNo: g('irnNo')
    },
    invoice: {
      no: g('invoiceNo'), date: g('invoiceDate'), poNo: g('poNo'), poDate: g('poDate'),
      challanNo: g('challanNo'), payTerms: g('payTerms'), dueDate: g('dueDate'),
      delivery: g('delivery'), kindAttn: g('kindAttn')
    },
    buyer: {
      name: g('buyerName'), address: g('buyerAddress'), gstin: g('buyerGstin'),
      pan: g('buyerPan'), state: g('buyerState'), stateCode: g('buyerStateCode'), regType: g('buyerRegType')
    },
    bank: {
      name: g('bankName'), accName: g('bankAccName'), branch: g('bankBranch'),
      accNo: g('bankAccNo'), ifsc: g('bankIfsc')
    },
    gstType: g('gstType')
  };
}

function generateInvoiceHTML(data, totals) {
  const { seller, irn, invoice, buyer, bank } = data;

  const itemRows = lineItems.map((item, i) => {
    const amount = calculateLineAmount(item);
    return `<tr>
      <td>${i + 1}</td>
      <td>${item.psNo}</td>
      <td class="desc">${item.description}</td>
      <td>${item.hsn}</td>
      <td>${item.taxPct.toFixed(2)}</td>
      <td>${item.qty.toFixed(2)}</td>
      <td>${item.unit}</td>
      <td>${item.rate.toFixed(2)}</td>
      <td>${item.disPct > 0 ? item.disPct.toFixed(2) : ''}</td>
      <td class="amount">${formatCurrency(amount)}</td>
    </tr>`;
  }).join('');

  const taxRows = totals.taxes.map(t =>
    `<div class="row tax"><span>${t.label} on Amt : ${formatCurrency(t.on)}</span><span>${formatCurrency(t.amount)}</span></div>`
  ).join('');

  return `
    <div class="inv-header-top">
      <span>Office Copy</span>
      <span>(U/s 31 of CGST Act & SGST Act R.W. Sec. 20 of IGST Act)</span>
      <span class="inv-title">GST Tax Invoice</span>
    </div>

    <div class="inv-outer">
      <div class="inv-top-block">
        <div class="inv-top-left">
          <div class="inv-irn-left">
            <div><strong>Ack. No.</strong> &nbsp;&nbsp; ${irn.ackNo}</div>
            <div><strong>Ack. Date.</strong> &nbsp; ${irn.ackDate}</div>
            <div><strong>IRN No.</strong> &nbsp;&nbsp;&nbsp; <span class="irn-text">${irn.irnNo}</span></div>
          </div>
          <div class="inv-company-inner">
            <h2>${seller.name}</h2>
            <p>${seller.address}</p>
            <p>Mob: ${seller.phone}${seller.email ? ' | Email: ' + seller.email : ''}</p>
            ${seller.website ? `<p>Website: ${seller.website}</p>` : ''}
          </div>
        </div>
        <div class="inv-top-right">
          ${qrCodeDataUrl
            ? `<img src="${qrCodeDataUrl}" class="qr-image" alt="QR Code">`
            : `<div class="qr-placeholder">QR</div>`}
        </div>
      </div>

      <div class="inv-details-grid">
        <div class="left">
          <div class="row gstin-row"><span>GSTIN : ${seller.gstin}</span><span>W.E.F. 04/03/2026</span></div>
          <div class="row"><span>Invoice No. : ${invoice.no}</span><span>Date : ${formatDate(invoice.date)}</span></div>
          <div class="row"><span>P.O. No. : ${invoice.poNo}</span><span>Date : ${formatDate(invoice.poDate)}</span></div>
          <div class="row"><span>Delivery : ${invoice.delivery}</span></div>
        </div>
        <div class="right">
          <div class="row gstin-row"><span>State : ${seller.stateCode} ${seller.state}</span><span>PAN No. ${seller.pan}</span></div>
          <div class="row"><span>Challan No. : ${invoice.challanNo}</span></div>
          <div class="row"><span>Pay. Terms : ${invoice.payTerms}</span><span>Due On : ${formatDate(invoice.dueDate)}</span></div>
          <div class="row"><span>Kind Attn : ${invoice.kindAttn}</span></div>
        </div>
      </div>

      <div class="inv-buyer">
        <div class="left">
          <h4>Buyer & Consignee:</h4>
          <p><strong>${buyer.name}</strong></p>
          <p>${buyer.address}</p>
        </div>
        <div class="right">
          <div class="row"><span>GST. No. :</span><span>${buyer.gstin}</span></div>
          <div class="row"><span>PAN No. :</span><span>${buyer.pan}</span></div>
          <div class="row"><span>Reg.Type :</span><span>${buyer.regType}</span></div>
          <div class="row"><span>State Code :</span><span>${buyer.stateCode} ${buyer.state}</span></div>
        </div>
      </div>

      <table class="inv-table">
        <thead>
          <tr>
            <th>Sn.</th>
            <th>P.S.No</th>
            <th>Description</th>
            <th>HSN/SAC</th>
            <th>Tax%</th>
            <th>Quantity</th>
            <th>Units</th>
            <th>Rate</th>
            <th>Dis%</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      ${seller.msme ? `<div class="inv-msme">MSME No. : ${seller.msme}</div>` : ''}

      <div class="inv-totals">
        <div class="row sub"><span>Sub Total</span><span>${formatCurrency(totals.subTotal)}</span></div>
        ${taxRows}
        <div class="row grand"><span>Grand Total</span><span>${formatCurrency(totals.grandTotal)}</span></div>
      </div>

      <div class="inv-amount-words">
        Amount In Words : ${numberToWords(totals.grandTotal)}
      </div>

      <div class="inv-issued">
        Issued On : ${new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'2-digit', year:'numeric'})} ${new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
      </div>

      <div class="inv-footer">
        <div class="left">
          <p><strong>Our Bank Details :</strong></p>
          <p>Bank Name : ${bank.name}</p>
          <p>Account Name : ${bank.accName}</p>
          <p>Branch : ${bank.branch}</p>
          <p>A/c No : ${bank.accNo}</p>
          <p>IFSC/Neft Code : ${bank.ifsc}</p>
        </div>
        <div class="right">
          <p>For ${seller.name}</p>
        </div>
      </div>

      <div class="inv-signatures">
        <div>Customer Receive Sign</div>
        <div>Prepared by</div>
        <div>Authorised Signatory</div>
      </div>

      <div class="inv-disclaimer">
        I / we certify that our registration certificate under the GST Act, 2017 is in force on the date on which the supply of goods specified in this Tax Invoice is made by me/us & the transaction of supply covered by this Tax Invoice has been effected by me/us & it shall be accounted for in the turnover of supplies while filing of returns & the due tax if any payable on the supplies has been paid or shall be paid & further certified that the particulars given above are true and correct & the amount indicated represents the prices actually charged and that there is no flow additional consideration directly or indirectly from the buyer. Interest @ 18% p.a. charged on all outstanding more than one month after invoice has been rendered.
      </div>
    </div>
  `;
}

function updatePreview() {
  const data = getFormData();
  const totals = calculateTotals();
  const html = generateInvoiceHTML(data, totals);
  document.getElementById('invoicePreview').innerHTML = html;
}

// ===== PRINT =====
function generatePrintHTML(data, totals) {
  const { seller, irn, invoice, buyer, bank } = data;

  const headerHTML = `
    <div style="font-family:'Times New Roman',serif;font-size:10px;padding:4px 0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;font-size:9px;">
        <span>Office Copy</span>
        <span>(U/s 31 of CGST Act & SGST Act R.W. Sec. 20 of IGST Act)</span>
        <span style="border:1px solid #000;padding:2px 8px;font-weight:bold;font-size:11px;">GST Tax Invoice</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;border:1px solid #000;">
        <div>
          <div style="padding:4px 6px;font-size:9px;border-bottom:1px solid #000;">
            <div><strong>Ack. No.</strong> ${irn.ackNo}</div>
            <div><strong>Ack. Date.</strong> ${irn.ackDate}</div>
            <div><strong>IRN No.</strong> <span style="font-size:7px;word-break:break-all;">${irn.irnNo}</span></div>
          </div>
          <div style="text-align:center;padding:6px;">
            <div style="font-size:18px;font-weight:bold;letter-spacing:1px;">${seller.name}</div>
            <div style="font-size:9px;">${seller.address}</div>
            <div style="font-size:9px;">Mob: ${seller.phone}${seller.email ? ' | Email: ' + seller.email : ''}${seller.website ? ' | Website: ' + seller.website : ''}</div>
          </div>
        </div>
        <div style="border-left:1px solid #000;display:flex;align-items:center;justify-content:center;padding:6px;">
          ${qrCodeDataUrl
            ? `<img src="${qrCodeDataUrl}" style="width:75px;height:75px;" alt="QR">`
            : `<div style="width:70px;height:70px;border:1px solid #999;display:flex;align-items:center;justify-content:center;font-size:7px;color:#999;">QR</div>`}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;border-top:none;font-size:9px;">
        <div style="padding:3px 6px;">
          <div>GSTIN : ${seller.gstin} &nbsp; W.E.F. 04/03/2026</div>
          <div>Invoice No. : ${invoice.no} &nbsp;&nbsp; Date : ${formatDate(invoice.date)}</div>
          <div>P.O. No. : ${invoice.poNo} &nbsp;&nbsp; Date : ${formatDate(invoice.poDate)}</div>
          <div>Delivery : ${invoice.delivery}</div>
        </div>
        <div style="padding:3px 6px;border-left:1px solid #000;">
          <div>State : ${seller.stateCode} ${seller.state} &nbsp; PAN No. ${seller.pan}</div>
          <div>Challan No. : ${invoice.challanNo}</div>
          <div>Pay. Terms : ${invoice.payTerms} &nbsp; Due On : ${formatDate(invoice.dueDate)}</div>
          <div>Kind Attn : ${invoice.kindAttn}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;border-top:none;font-size:9px;">
        <div style="padding:3px 6px;">
          <div style="text-decoration:underline;font-weight:bold;">Buyer & Consignee:</div>
          <div><strong>${buyer.name}</strong></div>
          <div>${buyer.address}</div>
        </div>
        <div style="padding:3px 6px;border-left:1px solid #000;">
          <div>GST. No. : ${buyer.gstin}</div>
          <div>PAN No. : ${buyer.pan}</div>
          <div>Reg.Type : ${buyer.regType}</div>
          <div>State Code : ${buyer.stateCode} ${buyer.state}</div>
        </div>
      </div>
    </div>
  `;

  const footerHTML = `
    <div style="font-family:'Times New Roman',serif;font-size:9px;border-top:1px solid #000;padding-top:4px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;">
        <div style="padding:4px 6px;border-right:1px solid #000;">
          <p><strong>Our Bank Details :</strong></p>
          <p>Bank Name : ${bank.name}</p>
          <p>Account Name : ${bank.accName}</p>
          <p>Branch : ${bank.branch}</p>
          <p>A/c No : ${bank.accNo}</p>
          <p>IFSC/Neft Code : ${bank.ifsc}</p>
        </div>
        <div style="padding:4px 6px;text-align:right;">
          <p><strong>For ${seller.name}</strong></p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #000;border-top:none;text-align:center;">
        <div style="padding:15px 6px 4px;border-right:1px solid #000;">Customer Receive Sign</div>
        <div style="padding:15px 6px 4px;border-right:1px solid #000;">Prepared by</div>
        <div style="padding:15px 6px 4px;">Authorised Signatory</div>
      </div>
    </div>
  `;

  const itemRows = lineItems.map((item, i) => {
    const amount = calculateLineAmount(item);
    return `<tr>
      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">${i + 1}</td>
      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">${item.psNo}</td>
      <td style="border:1px solid #000;padding:2px 4px;text-align:left;">${item.description}</td>
      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">${item.hsn}</td>
      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">${item.taxPct.toFixed(2)}</td>
      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">${item.qty.toFixed(2)}</td>
      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">${item.unit}</td>
      <td style="border:1px solid #000;padding:2px 4px;text-align:right;">${item.rate.toFixed(2)}</td>
      <td style="border:1px solid #000;padding:2px 4px;text-align:center;">${item.disPct > 0 ? item.disPct.toFixed(2) : ''}</td>
      <td style="border:1px solid #000;padding:2px 4px;text-align:right;">${formatCurrency(amount)}</td>
    </tr>`;
  }).join('');

  const taxRows = totals.taxes.map(t =>
    `<div style="display:flex;justify-content:flex-end;gap:20px;padding:1px 6px;font-size:10px;"><span>${t.label} on Amt : ${formatCurrency(t.on)}</span><span>${formatCurrency(t.amount)}</span></div>`
  ).join('');

  return `
    <table class="page-table" style="width:100%;border-collapse:collapse;font-family:'Times New Roman',serif;font-size:10px;">
      <thead><tr><td>${headerHTML}
        <table style="width:100%;border-collapse:collapse;font-size:9px;">
          <tr>
            <th style="border:1px solid #000;padding:3px;background:#f5f5f5;">Sn.</th>
            <th style="border:1px solid #000;padding:3px;background:#f5f5f5;">P.S.No</th>
            <th style="border:1px solid #000;padding:3px;background:#f5f5f5;">Description</th>
            <th style="border:1px solid #000;padding:3px;background:#f5f5f5;">HSN/SAC</th>
            <th style="border:1px solid #000;padding:3px;background:#f5f5f5;">Tax%</th>
            <th style="border:1px solid #000;padding:3px;background:#f5f5f5;">Quantity</th>
            <th style="border:1px solid #000;padding:3px;background:#f5f5f5;">Units</th>
            <th style="border:1px solid #000;padding:3px;background:#f5f5f5;">Rate</th>
            <th style="border:1px solid #000;padding:3px;background:#f5f5f5;">Dis%</th>
            <th style="border:1px solid #000;padding:3px;background:#f5f5f5;">Amount</th>
          </tr>
        </table>
      </td></tr></thead>
      <tfoot><tr><td>
        <div style="font-size:10px;font-weight:bold;padding:2px 6px;">MSME No. : ${seller.msme}</div>
        <div style="border:1px solid #000;padding:2px 6px;display:flex;justify-content:space-between;font-size:11px;">
          <span><strong>Sub Total</strong></span><span><strong>${formatCurrency(totals.subTotal)}</strong></span>
        </div>
        ${taxRows}
        <div style="border:1px solid #000;border-top:none;padding:3px 6px;display:flex;justify-content:space-between;font-size:12px;font-weight:bold;">
          <span>Grand Total</span><span>${formatCurrency(totals.grandTotal)}</span>
        </div>
        <div style="border:1px solid #000;border-top:none;padding:2px 6px;font-size:10px;font-style:italic;">
          Amount In Words : ${numberToWords(totals.grandTotal)}
        </div>
        ${footerHTML}
        <div style="border:1px solid #000;border-top:none;padding:3px 6px;font-size:7px;color:#333;">
          I / we certify that our registration certificate under the GST Act, 2017 is in force on the date on which the supply of goods specified in this Tax Invoice is made by me/us & the transaction of supply covered by this Tax Invoice has been effected by me/us & it shall be accounted for in the turnover of supplies while filing of returns & the due tax if any payable on the supplies has been paid or shall be paid & further certified that the particulars given above are true and correct & the amount indicated represents the prices actually charged and that there is no flow additional consideration directly or indirectly from the buyer. Interest @ 18% p.a. charged on all outstanding more than one month after invoice has been rendered.
        </div>
      </td></tr></tfoot>
      <tbody><tr><td>
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          ${itemRows}
        </table>
      </td></tr></tbody>
    </table>
  `;
}

function printInvoice() {
  const data = getFormData();
  const totals = calculateTotals();
  const printHTML = generatePrintHTML(data, totals);
  document.getElementById('printArea').innerHTML = printHTML;

  setTimeout(() => window.print(), 200);
}
