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
      ackNo: g('ackNo'), ackDate: g('ackDate')
    },
    invoice: {
      no: g('invoiceNo'), date: g('invoiceDate'), poNo: g('poNo'), poDate: g('poDate'),
      challanNo: g('challanNo'), payTerms: g('payTerms'), dueDate: g('dueDate'),
      delivery: g('delivery'), kindAttn: g('kindAttn'), vendorCode: g('vendorCode')
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

// ===== PAGED INVOICE RENDERING =====
// Builds an array of A4 .preview-page divs. The same HTML is used for both the
// on-screen preview and for printing (so what you see is exactly what prints).

// Header content shown at the top of every page (~75mm tall area).
function buildPageHeaderHTML(data, copyName) {
  const { seller, irn, invoice, buyer } = data;
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3px;font-size:11px;">
      <span>${copyName}</span>
      <span>(U/s 31 of CGST Act & SGST Act R.W. Sec. 20 of IGST Act)</span>
      <span style="border:1px solid #000;padding:2px 8px;font-weight:bold;font-size:13px;">Delivery Challan</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr auto;border:1px solid #000;">
      <div>
        <div style="padding:3px 6px;font-size:11px;border-bottom:1px solid #000;">
          <div><strong>Eway Bill No.</strong> ${irn.ackNo}</div>
          <div><strong>Eway Bill Date</strong> ${irn.ackDate}</div>
        </div>
        <div style="text-align:center;padding:5px 6px;">
          <div style="font-size:20px;font-weight:bold;letter-spacing:1px;">${seller.name}</div>
          <div style="font-size:12px;font-weight:bold;margin-bottom:2px;">Electrical Engineering Projects and Services</div>
          <div style="font-size:11px;">${seller.address}</div>
          <div style="font-size:11px;">Mob: ${seller.phone}${seller.email ? ' | Email: ' + seller.email : ''}${seller.website ? ' | Website: ' + seller.website : ''}</div>
        </div>
      </div>
      <div style="border-left:1px solid #000;display:flex;align-items:center;justify-content:center;padding:6px;">
        ${qrCodeDataUrl
          ? `<img src="${qrCodeDataUrl}" style="width:72px;height:72px;" alt="QR">`
          : `<div style="width:68px;height:68px;border:1px solid #999;display:flex;align-items:center;justify-content:center;font-size:9px;color:#999;">QR</div>`}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;border-top:none;font-size:11px;">
      <div style="padding:3px 6px;">
        <div>GSTIN : ${seller.gstin} &nbsp; W.E.F. 04/03/2026</div>
        <div>Invoice No. : ${invoice.no} &nbsp;&nbsp; Date : ${formatDate(invoice.date)}</div>
        <div>P.O. No. : ${invoice.poNo} &nbsp;&nbsp; Date : ${formatDate(invoice.poDate)}</div>
        <div>Delivery : ${invoice.delivery}</div>
        <div>Vendor Code : ${invoice.vendorCode}</div>
      </div>
      <div style="padding:3px 6px;border-left:1px solid #000;">
        <div>State : ${seller.stateCode} ${seller.state} &nbsp; PAN No. ${seller.pan}</div>
        <div>Challan No. : ${invoice.challanNo}</div>
        <div>Pay. Terms : ${invoice.payTerms} &nbsp; Due On : ${formatDate(invoice.dueDate)}</div>
        <div>Kind Attn : ${invoice.kindAttn}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;border-top:none;font-size:11px;">
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
  `;
}

// Footer content shown at the bottom of every page (~55mm tall area). Embeds page indicator.
function buildPageFooterHTML(data, pageNum, totalPages) {
  const { seller, bank } = data;
  return `
    <div style="border:1px solid #000;border-bottom:none;padding:3px 6px;font-size:11px;font-weight:bold;">
      MSME No. : ${seller.msme}
    </div>
    <div style="display:grid;grid-template-columns:max-content 1fr 1fr;border:1px solid #000;font-size:11px;min-height:27mm;">
      <div style="padding:3px 6px;border-right:1px solid #000;">
        <p style="font-weight:bold;text-decoration:underline;margin:0 0 1px 0;">Our Bank Details :</p>
        <p style="margin:0;">Bank Name : ${bank.name}</p>
        <p style="margin:0;">Account Name : ${bank.accName}</p>
        <p style="margin:0;">Branch : ${bank.branch}</p>
        <p style="margin:0;">A/c No : ${bank.accNo}</p>
        <p style="margin:0;">IFSC/Neft Code : ${bank.ifsc}</p>
      </div>
      <div style="padding:3px 6px;border-right:1px solid #000;display:flex;align-items:flex-end;justify-content:center;">
        <span style="margin-bottom:4px;">Customer Receive Sign</span>
      </div>
      <div style="padding:3px 6px;display:flex;flex-direction:column;justify-content:space-between;text-align:right;">
        <p style="font-weight:bold;text-decoration:underline;margin:0;">For ${seller.name}</p>
        <span style="margin-bottom:4px;align-self:flex-end;text-align:center;width:100%;">Authorised Signatory</span>
      </div>
    </div>
    <div style="border:1px solid #000;border-top:none;padding:3px 6px;font-size:9px;color:#333;line-height:1.25;display:flex;gap:6px;align-items:flex-end;">
      <span style="flex:1;">I / we certify that the particulars given above are true and correct & the amount indicated represents the prices actually charged.</span>
      <span style="font-weight:bold;font-size:10px;white-space:nowrap;">Page ${pageNum} of ${totalPages}</span>
    </div>
  `;
}

function buildColumnHeadersHTML() {
  const css = 'border:1px solid #000;padding:3px;background:#f5f5f5;font-weight:bold;font-size:11px;';
  return `
    <tr>
      <th style="${css}width:3%;">Sn.</th>
      <th style="${css}width:5%;">P.S.No</th>
      <th style="${css}width:40%;">Description</th>
      <th style="${css}width:7%;">HSN/SAC</th>
      <th style="${css}width:5%;">Tax%</th>
      <th style="${css}width:8%;">Quantity</th>
      <th style="${css}width:5%;">Units</th>
      <th style="${css}width:8%;">Rate</th>
      <th style="${css}width:5%;">Dis%</th>
      <th style="${css}width:14%;">Amount</th>
    </tr>
  `;
}

function buildItemRowsHTML(items, startIdx) {
  return items.map((item, i) => {
    const amount = calculateLineAmount(item);
    return `<tr>
      <td class="print-cell" style="text-align:center;width:3%;">${startIdx + i + 1}</td>
      <td class="print-cell" style="text-align:center;width:5%;">${item.psNo}</td>
      <td class="print-cell" style="text-align:left;width:40%;">${item.description}</td>
      <td class="print-cell" style="text-align:center;width:7%;">${item.hsn}</td>
      <td class="print-cell" style="text-align:center;width:5%;">${item.taxPct.toFixed(2)}</td>
      <td class="print-cell" style="text-align:center;width:8%;">${item.qty.toFixed(2)}</td>
      <td class="print-cell" style="text-align:center;width:5%;">${item.unit}</td>
      <td class="print-cell" style="text-align:right;width:8%;">${item.rate.toFixed(2)}</td>
      <td class="print-cell" style="text-align:center;width:5%;">${item.disPct > 0 ? item.disPct.toFixed(2) : ''}</td>
      <td class="print-cell" style="text-align:right;width:14%;">${formatCurrency(amount)}</td>
    </tr>`;
  }).join('');
}

function buildTotalsHTML(data, totals) {
  const { seller } = data;
  const taxRows = totals.taxes.map(t =>
    `<div style="display:flex;justify-content:flex-end;gap:20px;padding:1px 6px;font-size:12px;"><span>${t.label} on Amt : ${formatCurrency(t.on)}</span><span>${formatCurrency(t.amount)}</span></div>`
  ).join('');

  return `
    <div style="border-left:1px solid #000;border-right:1px solid #000;border-bottom:1px solid #000;padding:3px 6px;display:flex;justify-content:space-between;font-size:13px;font-weight:bold;">
      <span>Sub Total</span><span>${formatCurrency(totals.subTotal)}</span>
    </div>
    <div style="border-left:1px solid #000;border-right:1px solid #000;">
      ${taxRows}
    </div>
    <div style="border:1px solid #000;border-top:2px solid #000;padding:4px 6px;display:flex;justify-content:space-between;font-size:14px;font-weight:bold;">
      <span>Grand Total</span><span>${formatCurrency(totals.grandTotal)}</span>
    </div>
    <div style="border:1px solid #000;border-top:none;padding:3px 6px;font-size:12px;">
      Amount In Words : ${numberToWords(totals.grandTotal)}
    </div>
  `;
}

// Splits line items into pages by physically measuring them in the DOM.
// This perfectly handles any amount of wrapping text in descriptions.
function paginateItemsDOM(data, totals, items) {
  const measureDiv = document.createElement('div');
  measureDiv.style.position = 'absolute';
  measureDiv.style.visibility = 'hidden';
  measureDiv.style.top = '-9999px';
  measureDiv.style.left = '-9999px';
  measureDiv.innerHTML = `
    <div class="preview-page" style="width:210mm;height:297mm;display:flex;flex-direction:column;padding:25.4mm;box-sizing:border-box;">
      <div class="preview-header" style="flex-shrink:0;">${buildPageHeaderHTML(data, 'Original')}</div>
      <div class="preview-body" id="measureBody" style="flex-grow:1;display:flex;flex-direction:column;overflow:hidden;">
        <table class="print-items-table" id="measureTable" style="width:100%;border-collapse:collapse;font-size:12px;font-family:'Times New Roman',Times,serif;">
          <thead>${buildColumnHeadersHTML()}</thead>
          <tbody id="measureTbody"></tbody>
        </table>
        <div id="measureTotals" class="print-totals" style="font-family:'Times New Roman',Times,serif;display:none;flex-shrink:0;">
          ${buildTotalsHTML(data, totals)}
        </div>
      </div>
      <div class="preview-footer" style="flex-shrink:0;">${buildPageFooterHTML(data, 1, 1)}</div>
    </div>
  `;
  document.body.appendChild(measureDiv);

  const measureBody = document.getElementById('measureBody');
  const measureTable = document.getElementById('measureTable');
  const measureTbody = document.getElementById('measureTbody');
  const measureTotals = document.getElementById('measureTotals');
  
  const MAX_HEIGHT = measureBody.clientHeight; 

  const pages = [];
  let currentPageItems = [];
  let startIdx = 0;
  
  if (items.length === 0) {
    pages.push({ items: [], hasTotals: true, startIdx: 0 });
    document.body.removeChild(measureDiv);
    return pages;
  }

  for (let i = 0; i < items.length; i++) {
    currentPageItems.push(items[i]);
    measureTbody.innerHTML = buildItemRowsHTML(currentPageItems, startIdx);
    
    // Check if adding this item exceeded the allowed height
    if (measureTable.offsetHeight > MAX_HEIGHT - 2) {
      if (currentPageItems.length === 1) {
        // Item is larger than a whole page on its own. Force it to avoid infinite loop.
        pages.push({ items: [...currentPageItems], hasTotals: false, startIdx });
        startIdx += currentPageItems.length;
        currentPageItems = [];
      } else {
        // Pop the item that pushed it over the edge
        currentPageItems.pop();
        pages.push({ items: [...currentPageItems], hasTotals: false, startIdx });
        startIdx += currentPageItems.length;
        
        // Start new page with this item
        currentPageItems = [items[i]];
        measureTbody.innerHTML = buildItemRowsHTML(currentPageItems, startIdx);
      }
    }
  }

  if (currentPageItems.length > 0) {
    measureTotals.style.display = 'block';
    // Measure table and totals together
    const totalHeight = measureTable.offsetHeight + measureTotals.offsetHeight;
    
    if (totalHeight > MAX_HEIGHT - 2) {
      // Totals don't fit on this page, push to next
      pages.push({ items: [...currentPageItems], hasTotals: false, startIdx });
      pages.push({ items: [], hasTotals: true, startIdx: startIdx + currentPageItems.length });
    } else {
      pages.push({ items: [...currentPageItems], hasTotals: true, startIdx });
    }
  }

  document.body.removeChild(measureDiv);
  return pages;
}

function buildPagedInvoiceHTML(data, totals) {
  const colHeaders = buildColumnHeadersHTML();
  const totalsHTML = buildTotalsHTML(data, totals);

  const pages = paginateItemsDOM(data, totals, lineItems);
  const totalPages = pages.length;

  const copyNames = ['Original', 'Duplicate', 'Transporter Copy', 'Office Copy'];

  return copyNames.map(copyName => {
    const headerHTML = buildPageHeaderHTML(data, copyName);

    return pages.map((page, i) => {
      const footerHTML = buildPageFooterHTML(data, i + 1, totalPages);
      const itemRows = buildItemRowsHTML(page.items, page.startIdx);

      // The filler row absorbs the remaining vertical space of the table
      // It gives us continuous borders all the way down to the totals/footer.
      const fillerRow = `
        <tr style="height:100%;">
          <td style="border-left:1px solid #000; border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td style="border-left:1px solid #000; border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td style="border-left:1px solid #000; border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td style="border-left:1px solid #000; border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td style="border-left:1px solid #000; border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td style="border-left:1px solid #000; border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td style="border-left:1px solid #000; border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td style="border-left:1px solid #000; border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td style="border-left:1px solid #000; border-right:1px solid #000; border-bottom:1px solid #000;"></td>
          <td style="border-left:1px solid #000; border-right:1px solid #000; border-bottom:1px solid #000;"></td>
        </tr>
      `;

      return `
        <div class="preview-page">
          <div class="preview-header">${headerHTML}</div>
          <div class="preview-body">
            <table class="print-items-table" style="width:100%;border-collapse:collapse;font-size:12px;font-family:'Times New Roman',Times,serif;flex-grow:1;">
              <thead>${colHeaders}</thead>
              <tbody>
                ${itemRows}
                ${fillerRow}
              </tbody>
            </table>
            ${page.hasTotals ? `<div class="print-totals" style="font-family:'Times New Roman',Times,serif;flex-shrink:0;">${totalsHTML}</div>` : ''}
          </div>
          <div class="preview-footer">${footerHTML}</div>
        </div>
      `;
    }).join('');
  }).join('');
}

function updatePreview() {
  const data = getFormData();
  const totals = calculateTotals();
  const html = buildPagedInvoiceHTML(data, totals);
  document.getElementById('invoicePreview').innerHTML = html;
}

// ===== PRINT =====
function printInvoice() {
  const data = getFormData();
  const totals = calculateTotals();
  const html = buildPagedInvoiceHTML(data, totals);
  document.getElementById('printArea').innerHTML = html;

  setTimeout(() => window.print(), 200);
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
