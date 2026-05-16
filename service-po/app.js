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

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('poDate').value = today;

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

// ===== LINE ITEMS =====
function addLineItem() {
  const id = ++itemIdCounter;
  lineItems.push({ id, description: '', hsn: '', qty: 1, unit: 'EA', rate: 0, gst: 18 });
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
    if (['qty', 'rate', 'gst'].includes(field)) {
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
      <td><input type="text" value="${item.description}" onchange="updateLineItem(${item.id},'description',this.value)" style="width: 100%;"></td>
      <td><input type="text" value="${item.hsn}" onchange="updateLineItem(${item.id},'hsn',this.value)" style="width:60px"></td>
      <td><input type="number" value="${item.qty}" onchange="updateLineItem(${item.id},'qty',this.value)" style="width:60px"></td>
      <td><input type="text" value="${item.unit}" onchange="updateLineItem(${item.id},'unit',this.value)" style="width:60px"></td>
      <td><input type="number" value="${item.rate}" onchange="updateLineItem(${item.id},'rate',this.value)" style="width:80px"></td>
      <td><input type="number" value="${item.gst}" onchange="updateLineItem(${item.id},'gst',this.value)" style="width:50px"></td>
      <td><button class="btn-remove" onclick="removeLineItem(${item.id})">X</button></td>
    </tr>
  `).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function numberToWords(num) {
  if (num === 0) return 'Zero';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only ' : 'Only';
  return str.trim();
}

// ===== PREVIEW GENERATION =====
function getFormData() {
  const g = id => document.getElementById(id) ? document.getElementById(id).value : '';
  return {
    seller: {
      name: g('sellerName'), address: g('sellerAddress'), phone: g('sellerPhone'),
      email: g('sellerEmail'), website: g('sellerWebsite'), gstin: g('sellerGstin'),
      msme: g('sellerMsme')
    },
    po: {
      no: g('poNo'), date: g('poDate'), vendorCode: g('vendorCode'),
      kindAttn: g('kindAttn'), refNo: g('refNo'), payTerms: g('payTerms'),
      transport: g('transport')
    },
    buyer: {
      name: g('buyerName'), address: g('buyerAddress'), phone: g('buyerPhone'), email: g('buyerEmail'), gstin: g('buyerGstin')
    },
    notes: {
      note1: g('note1'), note2: g('note2'), note3: g('note3')
    },
    tc: {
      taxes: g('tcTaxes'), supplyInst: g('tcSupplyInst'), delivery: g('tcDelivery'),
      packing: g('tcPacking'), warranty: g('tcWarranty'),
      noteA: g('tcNoteA'), noteB: g('tcNoteB'), noteC: g('tcNoteC')
    }
  };
}

// ===== PAGED PO RENDERING =====

function buildPageHeaderHTML(data) {
  const { seller, po, buyer } = data;
  return `
    <div style="text-align:center;font-weight:bold;font-size:20px;margin-bottom:10px;text-decoration:underline;">
      PURCHASE ORDER
    </div>
    
    <div style="text-align:center;border:1px solid #000;padding:5px 6px;">
      <div style="font-size:20px;font-weight:bold;letter-spacing:1px;">${seller.name}</div>
      <div style="font-size:11px;">${seller.address}</div>
      <div style="font-size:11px;">Mob: ${seller.phone} | Email: ${seller.email} | Website: ${seller.website}</div>
    </div>

    <div style="display:flex;justify-content:space-between;border:1px solid #000;border-top:none;padding:3px 6px;font-size:11px;">
      <span><strong>GSTIN:</strong> ${seller.gstin}</span>
      <span><strong>W.E.F:</strong> 04/03/2026</span>
      <span><strong>State Code:</strong> 27 (Maharashtra)</span>
    </div>
    <div style="display:flex;justify-content:space-between;border:1px solid #000;border-top:none;padding:3px 6px;font-size:11px;">
      <span><strong>PAN:</strong> BGYPS3448H</span>
      <span><strong>MSME No:</strong> ${seller.msme}</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;border-top:none;font-size:11px;">
      <div style="padding:3px 6px;">
        <div style="text-decoration:underline;font-weight:bold;margin-bottom:4px;">TO:</div>
        <div style="font-size:13px;font-weight:bold;margin-bottom:2px;">${buyer.name}</div>
        <div style="white-space: pre-wrap;margin-bottom:2px;">${buyer.address}</div>
        <div>${buyer.phone ? 'Phone: ' + buyer.phone : ''}</div>
        <div>${buyer.email ? 'Email: ' + buyer.email : ''}</div>
        <div style="margin-top:4px;"><strong>GSTIN:</strong> ${buyer.gstin || ''}</div>
      </div>
      <div style="padding:3px 6px;border-left:1px solid #000;">
        <div style="display:grid;grid-template-columns:90px 1fr;gap:2px;">
           <strong>P.O. No:</strong> <span>${po.no}</span>
           <strong>Date:</strong> <span>${formatDate(po.date)}</span>
           <strong>Vendor Code:</strong> <span>${po.vendorCode}</span>
           <strong>Ref. No:</strong> <span>${po.refNo}</span>
           <strong>Kind Attn:</strong> <span>${po.kindAttn}</span>
           <strong>Pay. Terms:</strong> <span>${po.payTerms}</span>
           <strong>Transport:</strong> <span>${po.transport}</span>
        </div>
      </div>
    </div>
  `;
}

function buildPageFooterHTML(data, pageNum, totalPages, isLastPage, totals) {
  let totalsHtml = '';
  if (isLastPage) {
     const cgst = totals.tax / 2;
     const sgst = totals.tax / 2;
     const roundedTotal = Math.round(totals.grandTotal);
     const roundOff = (roundedTotal - totals.grandTotal).toFixed(2);
     totalsHtml = `
       <div style="border:1px solid #000;border-top:none;padding:6px 8px;font-size:12px;text-align:right;">
          <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
            <span style="width:150px;text-align:left;">Sub Total:</span>
            <span style="width:100px;">${totals.subTotal.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
            <span style="width:150px;text-align:left;">C-GST:</span>
            <span style="width:100px;">${cgst.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
            <span style="width:150px;text-align:left;">S-GST:</span>
            <span style="width:100px;">${sgst.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
            <span style="width:150px;text-align:left;">Rounding:</span>
            <span style="width:100px;">${roundOff}</span>
          </div>
          <div style="display:flex;justify-content:flex-end;font-weight:bold;font-size:14px;border-top:1px dashed #000;padding-top:4px;">
            <span style="width:150px;text-align:left;">Grand Total:</span>
            <span style="width:100px;">${roundedTotal.toFixed(2)}</span>
          </div>
          <div style="text-align:left;font-weight:bold;margin-top:6px;border-top:1px solid #ddd;padding-top:4px;">
            Amount in words: Rupees ${numberToWords(roundedTotal)}
          </div>
       </div>
        <div style="border:1px solid #000;border-top:none;padding:6px 8px;font-size:11px;">
         <div style="font-weight:bold;text-decoration:underline;margin-bottom:4px;">Terms & Conditions :</div>
         <table style="width:100%;font-size:11px;">
           <tr><td style="width:20px;">1</td><td style="width:150px;">Taxes</td><td>${data.tc.taxes || '18% Extra As Applicable'}</td></tr>
           <tr><td>2</td><td>Payment</td><td>${data.po.payTerms || 'As Per Project PO Term'}</td></tr>
           <tr><td>3</td><td>Supply & Installation</td><td>${data.tc.supplyInst || 'As Per Project PO'}</td></tr>
           <tr><td>4</td><td>Delivery</td><td>${data.tc.delivery || 'AS PER TENDER TIME LINE GIVEN.'}</td></tr>
           <tr><td>5</td><td>Packing-Forwarding</td><td>${data.tc.packing || 'ALL INCLUDED'}</td></tr>
           <tr><td>6</td><td>Transport</td><td>${data.po.transport || 'FREE DOOR DELIVERY @ SITE'}</td></tr>
           <tr><td>7</td><td>Warranty</td><td>${data.tc.warranty || '12 MONTHS AS PER STANDARD WARRANTY GIVEN BY OEM'}</td></tr>
         </table>
         <div style="margin-top:8px;font-size:10px;">
           ${data.tc.noteA ? `<strong>Note A:</strong> ${data.tc.noteA}<br>` : ''}
           ${data.tc.noteB ? `<strong>Note B:</strong> ${data.tc.noteB}<br>` : ''}
           ${data.tc.noteC ? `<strong>Note C:</strong> ${data.tc.noteC}` : ''}
         </div>
         ${data.notes && data.notes.note1 ? `<div style="margin-top:4px;font-size:11px;"><strong>Note 1:</strong> ${data.notes.note1}</div>` : ''}
         ${data.notes && data.notes.note2 ? `<div style="margin-top:4px;font-size:11px;"><strong>Note 2:</strong> ${data.notes.note2}</div>` : ''}
         ${data.notes && data.notes.note3 ? `<div style="margin-top:4px;font-size:11px;"><strong>Note 3:</strong> ${data.notes.note3}</div>` : ''}
       </div>
     `;
  }

  return `
    ${totalsHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;border-top:none;font-size:12px;min-height:25mm;">
      <div style="padding:8px 12px;border-right:1px solid #000;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="font-weight:bold;">Prepared by:</div>
        <div style="font-weight:bold;">Checked by:</div>
      </div>
      <div style="padding:8px 12px;display:flex;flex-direction:column;justify-content:space-between;text-align:right;">
        <div style="font-weight:bold;margin-bottom:30px;">
          For ${data.seller.name}
        </div>
        <div style="font-weight:bold;">
          Authorised Signatory
        </div>
      </div>
    </div>
    <div style="text-align:right;font-size:10px;margin-top:4px;">
      Page ${pageNum} of ${totalPages}
    </div>
  `;
}

function buildColumnHeadersHTML() {
  const css = 'border:1px solid #000;padding:6px;background:#f5f5f5;font-weight:bold;font-size:12px;text-align:center;';
  return `
    <tr>
      <th style="${css}width:6%;">Sn.</th>
      <th style="${css}width:34%;text-align:left;">Description</th>
      <th style="${css}width:10%;">HSN/SAC</th>
      <th style="${css}width:8%;">QTY</th>
      <th style="${css}width:8%;">UNIT</th>
      <th style="${css}width:10%;">Rate</th>
      <th style="${css}width:8%;">GST%</th>
      <th style="${css}width:16%;text-align:right;">Amount</th>
    </tr>
  `;
}

function buildItemRowsHTML(items, startIdx) {
  return items.map((item, i) => {
    const amount = item.qty * item.rate;
    return `<tr>
      <td class="print-cell" style="text-align:center;width:6%;border:1px solid #000;padding:6px;">${startIdx + i + 1}</td>
      <td class="print-cell" style="text-align:left;width:34%;border:1px solid #000;padding:6px;">${item.description}</td>
      <td class="print-cell" style="text-align:center;width:10%;border:1px solid #000;padding:6px;">${item.hsn}</td>
      <td class="print-cell" style="text-align:center;width:8%;border:1px solid #000;padding:6px;">${item.qty}</td>
      <td class="print-cell" style="text-align:center;width:8%;border:1px solid #000;padding:6px;">${item.unit}</td>
      <td class="print-cell" style="text-align:center;width:10%;border:1px solid #000;padding:6px;">${item.rate.toFixed(2)}</td>
      <td class="print-cell" style="text-align:center;width:8%;border:1px solid #000;padding:6px;">${item.gst}</td>
      <td class="print-cell" style="text-align:right;width:16%;border:1px solid #000;padding:6px;">${amount.toFixed(2)}</td>
    </tr>`;
  }).join('');
}

function calculateTotals(items) {
  let subTotal = 0;
  let tax = 0;
  items.forEach(item => {
    const amt = item.qty * item.rate;
    subTotal += amt;
    tax += amt * (item.gst / 100);
  });
  return { subTotal, tax, grandTotal: subTotal + tax };
}

function paginateItemsDOM(data, items) {
  const measureDiv = document.createElement('div');
  measureDiv.style.position = 'absolute';
  measureDiv.style.visibility = 'hidden';
  measureDiv.style.top = '-9999px';
  measureDiv.style.left = '-9999px';
  
  const totals = calculateTotals(items);
  
  measureDiv.innerHTML = `
    <div class="preview-page" style="width:210mm;height:297mm;display:flex;flex-direction:column;padding:20mm;box-sizing:border-box;">
      <div class="preview-header" style="flex-shrink:0;">${buildPageHeaderHTML(data)}</div>
      <div class="preview-body" id="measureBody" style="flex-grow:1;display:flex;flex-direction:column;overflow:hidden;">
        <table class="print-items-table" id="measureTable" style="width:100%;border-collapse:collapse;font-size:12px;font-family:'Times New Roman',Times,serif;">
          <thead>${buildColumnHeadersHTML()}</thead>
          <tbody id="measureTbody"></tbody>
        </table>
      </div>
      <div class="preview-footer" id="measureFooter" style="flex-shrink:0;"></div>
    </div>
  `;
  document.body.appendChild(measureDiv);

  const measureBody = document.getElementById('measureBody');
  const measureTable = document.getElementById('measureTable');
  const measureTbody = document.getElementById('measureTbody');
  const measureFooter = document.getElementById('measureFooter');
  
  const MAX_HEIGHT = measureBody.clientHeight; 

  const pages = [];
  let currentPageItems = [];
  let startIdx = 0;
  
  if (items.length === 0) {
    pages.push({ items: [], startIdx: 0 });
    document.body.removeChild(measureDiv);
    return pages;
  }

  for (let i = 0; i < items.length; i++) {
    currentPageItems.push(items[i]);
    measureTbody.innerHTML = buildItemRowsHTML(currentPageItems, startIdx);
    
    // Also test with footer if it's potentially the last page
    const isLastItem = (i === items.length - 1);
    if (isLastItem) {
        measureFooter.innerHTML = buildPageFooterHTML(data, 1, 1, true, totals);
    } else {
        measureFooter.innerHTML = buildPageFooterHTML(data, 1, 1, false, totals);
    }
    
    const bodyHeightWithFooter = measureBody.clientHeight;
    
    if (measureTable.offsetHeight > bodyHeightWithFooter - 2) {
      if (currentPageItems.length === 1) {
        pages.push({ items: [...currentPageItems], startIdx });
        startIdx += currentPageItems.length;
        currentPageItems = [];
      } else {
        currentPageItems.pop();
        pages.push({ items: [...currentPageItems], startIdx });
        startIdx += currentPageItems.length;
        
        currentPageItems = [items[i]];
        measureTbody.innerHTML = buildItemRowsHTML(currentPageItems, startIdx);
      }
    }
  }

  if (currentPageItems.length > 0) {
    pages.push({ items: [...currentPageItems], startIdx });
  }

  document.body.removeChild(measureDiv);
  return pages;
}

function buildPagedInvoiceHTML(data) {
  const colHeaders = buildColumnHeadersHTML();
  const pages = paginateItemsDOM(data, lineItems);
  const totalPages = pages.length;
  const totals = calculateTotals(lineItems);

  const headerHTML = buildPageHeaderHTML(data);

  return pages.map((page, i) => {
    const isLastPage = (i === totalPages - 1);
    const footerHTML = buildPageFooterHTML(data, i + 1, totalPages, isLastPage, totals);
    const itemRows = buildItemRowsHTML(page.items, page.startIdx);

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
      </tr>
    `;

    return `
      <div class="preview-page">
        <div class="preview-header">${headerHTML}</div>
        <div class="preview-body">
          <table class="print-items-table" style="width:100%;border-collapse:collapse;font-size:12px;font-family:'Times New Roman',Times,serif;flex-grow:1;border:1px solid #000;">
            <thead>${colHeaders}</thead>
            <tbody>
              ${itemRows}
              ${fillerRow}
            </tbody>
          </table>
        </div>
        <div class="preview-footer">${footerHTML}</div>
      </div>
    `;
  }).join('');
}

function updatePreview() {
  const data = getFormData();
  const html = buildPagedInvoiceHTML(data);
  document.getElementById('invoicePreview').innerHTML = html;
}

// ===== PRINT =====
function printInvoice() {
  const data = getFormData();
  const html = buildPagedInvoiceHTML(data);
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
