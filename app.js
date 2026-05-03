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

// ===== PAGINATED PREVIEW (manual paginator, identical to print) =====
//
// Page sizing in CSS pixels at 96 DPI:
//   A4: 210mm x 297mm = 794 x 1123 px
//   Body padding: 6mm all sides ≈ 23 px
//   Available content height per page: ~1077 px
//   Header takes ~270 px on every page (company info + buyer + col headers)
//   Footer block (page number) ~30 px
//   Totals + bank + signatures + disclaimer ~280 px (only on last page)
//
// We measure header/footer/items dynamically using a hidden measurement
// container so pagination is accurate even when the description text wraps.

const PAGE_HEIGHT_PX = 1123;
const PAGE_PADDING_PX = 23;
const PAGE_BOTTOM_RESERVE_PX = 26;

let previewRenderTimer = null;

function updatePreview() {
  if (previewRenderTimer) clearTimeout(previewRenderTimer);
  previewRenderTimer = setTimeout(renderPaginatedPreview, 150);
}

function renderPaginatedPreview() {
  const data = getFormData();
  const totals = calculateTotals();
  const target = document.getElementById('invoicePreview');
  target.innerHTML = renderPaginatedHTML(data, totals);
}

function renderPaginatedHTML(data, totals) {
  const headerHTML = buildHeaderHTML(data);
  const colHeadersHTML = buildColHeadersHTML();
  const itemRowsHTML = lineItems.map((item, i) => buildItemRowHTML(item, i));
  const totalsFooterHTML = buildTotalsFooterHTML(data, totals);

  // Measure heights using a hidden container
  const measureWrap = document.createElement('div');
  measureWrap.className = 'measure-wrap';
  measureWrap.style.cssText = `
    position: absolute; visibility: hidden; pointer-events: none;
    top: -99999px; left: 0; width: 794px;
    font-family: 'Times New Roman', Times, serif; font-size: 10px;
  `;
  document.body.appendChild(measureWrap);

  measureWrap.innerHTML = `<div class="page-padding-mirror" style="padding:${PAGE_PADDING_PX}px;">
    <div data-meas="header">${headerHTML}${colHeadersWrapper(colHeadersHTML)}</div>
  </div>`;
  const headerHeight = measureWrap.querySelector('[data-meas="header"]').offsetHeight;

  measureWrap.innerHTML = `<div style="padding:${PAGE_PADDING_PX}px;">
    <div data-meas="footer">${totalsFooterHTML}</div>
  </div>`;
  const footerHeight = measureWrap.querySelector('[data-meas="footer"]').offsetHeight;

  // Measure each item row by rendering individual full-table fragments
  const measureTableHTML = (rowsHTML) => `
    <div style="padding:${PAGE_PADDING_PX}px;">
      <table style="width:100%;border-collapse:collapse;font-family:'Times New Roman',serif;font-size:10px;">
        <colgroup>
          <col style="width:3%"><col style="width:5%"><col style="width:40%"><col style="width:7%"><col style="width:5%">
          <col style="width:8%"><col style="width:5%"><col style="width:8%"><col style="width:5%"><col style="width:14%">
        </colgroup>
        <tbody data-meas="items">${rowsHTML}</tbody>
      </table>
    </div>`;

  // Measure cumulative item heights to know where to break
  measureWrap.innerHTML = measureTableHTML(itemRowsHTML.join(''));
  const itemTbody = measureWrap.querySelector('[data-meas="items"]');
  const itemHeights = Array.from(itemTbody.children).map(tr => tr.offsetHeight);

  document.body.removeChild(measureWrap);

  // Available room for items per page, when header is the only thing reserved
  const availForItems = PAGE_HEIGHT_PX - headerHeight - PAGE_BOTTOM_RESERVE_PX;
  // Available room for items on last page (also has totals/footer below items)
  const availForItemsLast = PAGE_HEIGHT_PX - headerHeight - footerHeight - PAGE_BOTTOM_RESERVE_PX;

  // Build pages: greedy fit. After all items placed, see if footer fits with last items.
  const pages = [];
  let cur = { items: [], height: 0 };
  for (let i = 0; i < itemRowsHTML.length; i++) {
    const h = itemHeights[i];
    if (cur.items.length > 0 && cur.height + h > availForItems) {
      pages.push(cur);
      cur = { items: [], height: 0 };
    }
    cur.items.push(itemRowsHTML[i]);
    cur.height += h;
  }
  pages.push(cur);

  // Decide whether totals/footer fit on the last page or need a new page
  const lastPage = pages[pages.length - 1];
  const lastHasRoom = lastPage.height + footerHeight <= availForItems;
  let putFooterOnNewPage = !lastHasRoom;

  // If items would overflow availForItemsLast on the last items+footer page, push footer to new page
  if (!putFooterOnNewPage && lastPage.height > availForItemsLast) {
    putFooterOnNewPage = true;
  }

  if (putFooterOnNewPage) {
    pages.push({ items: [], height: 0, footerOnly: true });
  }

  const totalPages = pages.length;
  return pages.map((pg, idx) => {
    const isLast = idx === totalPages - 1;
    return buildPageHTML({
      headerHTML,
      colHeadersHTML,
      itemsHTML: pg.items.join(''),
      footerHTML: isLast ? totalsFooterHTML : '',
      pageNum: idx + 1,
      totalPages,
    });
  }).join('');
}

function colHeadersWrapper(colHeadersHTML) {
  return `<table style="width:100%;border-collapse:collapse;font-family:'Times New Roman',serif;font-size:10px;">
    <colgroup>
      <col style="width:3%"><col style="width:5%"><col style="width:40%"><col style="width:7%"><col style="width:5%">
      <col style="width:8%"><col style="width:5%"><col style="width:8%"><col style="width:5%"><col style="width:14%">
    </colgroup>
    ${colHeadersHTML}
  </table>`;
}

function buildPageHTML({ headerHTML, colHeadersHTML, itemsHTML, footerHTML, pageNum, totalPages }) {
  return `<section class="invoice-page">
    <div class="invoice-page-inner">
      <div class="invoice-content">
        ${headerHTML}
        <table style="width:100%;border-collapse:collapse;font-family:'Times New Roman',serif;font-size:10px;">
          <colgroup>
            <col style="width:3%"><col style="width:5%"><col style="width:40%"><col style="width:7%"><col style="width:5%">
            <col style="width:8%"><col style="width:5%"><col style="width:8%"><col style="width:5%"><col style="width:14%">
          </colgroup>
          ${colHeadersHTML}
          <tbody>${itemsHTML}</tbody>
        </table>
        ${footerHTML}
      </div>
      <div class="invoice-page-number">Page ${pageNum} of ${totalPages}</div>
    </div>
  </section>`;
}

function buildColHeadersHTML() {
  const c = 'border:1px solid #000;padding:3px;background:#f5f5f5;font-weight:bold;font-size:9px;';
  return `<thead><tr>
    <th style="${c}">Sn.</th>
    <th style="${c}">P.S.No</th>
    <th style="${c}">Description</th>
    <th style="${c}">HSN/SAC</th>
    <th style="${c}">Tax%</th>
    <th style="${c}">Quantity</th>
    <th style="${c}">Units</th>
    <th style="${c}">Rate</th>
    <th style="${c}">Dis%</th>
    <th style="${c}">Amount</th>
  </tr></thead>`;
}

function buildItemRowHTML(item, i) {
  const amount = calculateLineAmount(item);
  return `<tr>
    <td class="print-cell" style="text-align:center;">${i + 1}</td>
    <td class="print-cell" style="text-align:center;">${escapeHtml(item.psNo)}</td>
    <td class="print-cell" style="text-align:left;">${escapeHtml(item.description)}</td>
    <td class="print-cell" style="text-align:center;">${escapeHtml(item.hsn)}</td>
    <td class="print-cell" style="text-align:center;">${item.taxPct.toFixed(2)}</td>
    <td class="print-cell" style="text-align:center;">${item.qty.toFixed(2)}</td>
    <td class="print-cell" style="text-align:center;">${escapeHtml(item.unit)}</td>
    <td class="print-cell" style="text-align:right;">${item.rate.toFixed(2)}</td>
    <td class="print-cell" style="text-align:center;">${item.disPct > 0 ? item.disPct.toFixed(2) : ''}</td>
    <td class="print-cell" style="text-align:right;">${formatCurrency(amount)}</td>
  </tr>`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ===== HEADER / FOOTER BUILDERS (used by paginator) =====
function buildHeaderHTML(data) {
  const { seller, irn, invoice, buyer } = data;
  return `
    <div style="font-family:'Times New Roman',serif;font-size:10px;padding:0 0 4px 0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;font-size:9px;">
        <span>Office Copy</span>
        <span>(U/s 31 of CGST Act & SGST Act R.W. Sec. 20 of IGST Act)</span>
        <span style="border:1px solid #000;padding:2px 8px;font-weight:bold;font-size:11px;">GST Tax Invoice</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;border:1px solid #000;">
        <div>
          <div style="padding:4px 6px;font-size:9px;border-bottom:1px solid #000;">
            <div><strong>Ack. No.</strong> ${escapeHtml(irn.ackNo)}</div>
            <div><strong>Ack. Date.</strong> ${escapeHtml(irn.ackDate)}</div>
            <div><strong>IRN No.</strong> <span style="font-size:7px;word-break:break-all;">${escapeHtml(irn.irnNo)}</span></div>
          </div>
          <div style="text-align:center;padding:6px;">
            <div style="font-size:18px;font-weight:bold;letter-spacing:1px;">${escapeHtml(seller.name)}</div>
            <div style="font-size:9px;">${escapeHtml(seller.address)}</div>
            <div style="font-size:9px;">Mob: ${escapeHtml(seller.phone)}${seller.email ? ' | Email: ' + escapeHtml(seller.email) : ''}${seller.website ? ' | Website: ' + escapeHtml(seller.website) : ''}</div>
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
          <div>GSTIN : ${escapeHtml(seller.gstin)} &nbsp; W.E.F. 04/03/2026</div>
          <div>Invoice No. : ${escapeHtml(invoice.no)} &nbsp;&nbsp; Date : ${formatDate(invoice.date)}</div>
          <div>P.O. No. : ${escapeHtml(invoice.poNo)} &nbsp;&nbsp; Date : ${formatDate(invoice.poDate)}</div>
          <div>Delivery : ${escapeHtml(invoice.delivery)}</div>
        </div>
        <div style="padding:3px 6px;border-left:1px solid #000;">
          <div>State : ${escapeHtml(seller.stateCode)} ${escapeHtml(seller.state)} &nbsp; PAN No. ${escapeHtml(seller.pan)}</div>
          <div>Challan No. : ${escapeHtml(invoice.challanNo)}</div>
          <div>Pay. Terms : ${escapeHtml(invoice.payTerms)} &nbsp; Due On : ${formatDate(invoice.dueDate)}</div>
          <div>Kind Attn : ${escapeHtml(invoice.kindAttn)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;border-top:none;font-size:9px;">
        <div style="padding:3px 6px;">
          <div style="text-decoration:underline;font-weight:bold;">Buyer & Consignee:</div>
          <div><strong>${escapeHtml(buyer.name)}</strong></div>
          <div>${escapeHtml(buyer.address)}</div>
        </div>
        <div style="padding:3px 6px;border-left:1px solid #000;">
          <div>GST. No. : ${escapeHtml(buyer.gstin)}</div>
          <div>PAN No. : ${escapeHtml(buyer.pan)}</div>
          <div>Reg.Type : ${escapeHtml(buyer.regType)}</div>
          <div>State Code : ${escapeHtml(buyer.stateCode)} ${escapeHtml(buyer.state)}</div>
        </div>
      </div>
    </div>
  `;
}

function buildTotalsFooterHTML(data, totals) {
  const { seller, bank } = data;
  const taxRows = totals.taxes.map(t =>
    `<div style="display:flex;justify-content:flex-end;gap:20px;padding:1px 6px;font-size:10px;"><span>${escapeHtml(t.label)} on Amt : ${formatCurrency(t.on)}</span><span>${formatCurrency(t.amount)}</span></div>`
  ).join('');

  const bankSignaturesHTML = `
    <div style="font-family:'Times New Roman',serif;font-size:9px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;border-top:none;">
        <div style="padding:4px 6px;border-right:1px solid #000;">
          <div><strong>Our Bank Details :</strong></div>
          <div>Bank Name : ${escapeHtml(bank.name)}</div>
          <div>Account Name : ${escapeHtml(bank.accName)}</div>
          <div>Branch : ${escapeHtml(bank.branch)}</div>
          <div>A/c No : ${escapeHtml(bank.accNo)}</div>
          <div>IFSC/Neft Code : ${escapeHtml(bank.ifsc)}</div>
        </div>
        <div style="padding:4px 6px;text-align:right;">
          <div><strong>For ${escapeHtml(seller.name)}</strong></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #000;border-top:none;text-align:center;">
        <div style="padding:15px 6px 4px;border-right:1px solid #000;">Customer Receive Sign</div>
        <div style="padding:15px 6px 4px;border-right:1px solid #000;">Prepared by</div>
        <div style="padding:15px 6px 4px;">Authorised Signatory</div>
      </div>
    </div>
  `;

  return `
    <div style="font-family:'Times New Roman',serif;font-size:10px;">
      <div style="font-size:10px;font-weight:bold;padding:3px 6px;border:1px solid #000;border-top:none;">MSME No. : ${escapeHtml(seller.msme)}</div>
      <div style="border:1px solid #000;border-top:none;padding:3px 6px;display:flex;justify-content:space-between;font-size:11px;font-weight:bold;">
        <span>Sub Total</span><span>${formatCurrency(totals.subTotal)}</span>
      </div>
      <div style="border:1px solid #000;border-top:none;border-bottom:none;">
        ${taxRows}
      </div>
      <div style="border:1px solid #000;border-top:2px solid #000;padding:4px 6px;display:flex;justify-content:space-between;font-size:12px;font-weight:bold;">
        <span>Grand Total</span><span>${formatCurrency(totals.grandTotal)}</span>
      </div>
      <div style="border:1px solid #000;border-top:none;padding:3px 6px;font-size:10px;">
        Amount In Words : ${escapeHtml(numberToWords(totals.grandTotal))}
      </div>
      <div style="border:1px solid #000;border-top:none;padding:3px 6px;font-size:9px;">
        Issued On : ${new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'2-digit', year:'numeric'})} ${new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
      </div>
      ${bankSignaturesHTML}
      <div style="border:1px solid #000;border-top:none;padding:3px 6px;font-size:7px;color:#333;">
        I / we certify that our registration certificate under the GST Act, 2017 is in force on the date on which the supply of goods specified in this Tax Invoice is made by me/us & the transaction of supply covered by this Tax Invoice has been effected by me/us & it shall be accounted for in the turnover of supplies while filing of returns & the due tax if any payable on the supplies has been paid or shall be paid & further certified that the particulars given above are true and correct & the amount indicated represents the prices actually charged and that there is no flow additional consideration directly or indirectly from the buyer. Interest @ 18% p.a. charged on all outstanding more than one month after invoice has been rendered.
      </div>
    </div>
  `;
}

// ===== PRINT =====
function printInvoice() {
  // The preview is already paginated to A4 pages; just print the page.
  // Our @media print CSS hides everything except the .invoice-page sections.
  window.print();
}

// ===== RESIZABLE PANEL =====
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const handle = document.getElementById('resizeHandle');
    const formPanel = document.getElementById('formPanel');
    if (!handle || !formPanel) return;

    let isResizing = false;

    handle.addEventListener('mousedown', (e) => {
      isResizing = true;
      handle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const containerLeft = formPanel.parentElement.getBoundingClientRect().left;
      const newWidth = e.clientX - containerLeft;
      const minW = 300;
      const maxW = window.innerWidth * 0.8;
      formPanel.style.width = Math.min(Math.max(newWidth, minW), maxW) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  });
})();
