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
  document.getElementById('challanDate').value = today;

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
  lineItems.push({ id, description: '', qty: 1, unit: 'EA' });
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
    if (field === 'qty') {
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
      <td><input type="number" value="${item.qty}" onchange="updateLineItem(${item.id},'qty',this.value)" style="width:60px"></td>
      <td><input type="text" value="${item.unit}" onchange="updateLineItem(${item.id},'unit',this.value)" style="width:60px"></td>
      <td><button class="btn-remove" onclick="removeLineItem(${item.id})">X</button></td>
    </tr>
  `).join('');
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
      msme: g('sellerMsme')
    },
    challan: {
      no: g('challanNo'), date: g('challanDate'), vendorCode: g('vendorCode'),
      poNo: g('poNo'), poDate: g('poDate')
    },
    buyer: {
      name: g('buyerName'), address: g('buyerAddress'), phone: g('buyerPhone'), email: g('buyerEmail')
    }
  };
}

// ===== PAGED CHALLAN RENDERING =====

function buildPageHeaderHTML(data, copyName) {
  const { seller, challan, buyer } = data;
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;font-size:11px;">
      <span>${copyName}</span>
    </div>
    
    <div style="text-align:center;font-weight:bold;font-size:18px;margin-bottom:10px;text-decoration:underline;">
      BILLABLE DELIVERY CHALLAN
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;font-size:12px;">
      <div style="padding:6px 8px;">
        <div style="text-decoration:underline;font-weight:bold;margin-bottom:4px;">FROM:</div>
        <div style="font-size:16px;font-weight:bold;margin-bottom:4px;">${seller.name}</div>
        <div>${seller.address}</div>
        <div style="margin-top:4px;">Mob: ${seller.phone}</div>
        <div>Email: ${seller.email}</div>
        <div style="margin-top:4px;"><strong>GSTIN:</strong> ${seller.gstin}</div>
        <div><strong>MSME No:</strong> ${seller.msme}</div>
      </div>
      <div style="padding:6px 8px;border-left:1px solid #000;">
        <div style="text-decoration:underline;font-weight:bold;margin-bottom:4px;">TO:</div>
        <div style="font-size:14px;font-weight:bold;margin-bottom:4px;">${buyer.name}</div>
        <div style="white-space: pre-wrap;">${buyer.address}</div>
        <div style="margin-top:4px;">${buyer.phone ? 'Phone: ' + buyer.phone : ''}</div>
        <div>${buyer.email ? 'Email: ' + buyer.email : ''}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;border-top:none;font-size:12px;">
      <div style="padding:6px 8px;">
        <strong>Date:</strong> ${formatDate(challan.date)}
      </div>
      <div style="padding:6px 8px;border-left:1px solid #000;">
        <strong>Delivery Challan No:</strong> ${challan.no}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;border-top:none;font-size:12px;border-bottom:none;">
      <div style="padding:6px 8px;">
        <strong>Vendor Code:</strong> ${challan.vendorCode}
      </div>
      <div style="padding:6px 8px;border-left:1px solid #000;">
        <div><strong>P.O. No:</strong> ${challan.poNo}</div>
        <div style="margin-top:4px;"><strong>P.O. Date:</strong> ${formatDate(challan.poDate)}</div>
      </div>
    </div>
  `;
}

function buildPageFooterHTML(data, pageNum, totalPages) {
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;border-top:none;font-size:12px;min-height:35mm;">
      <div style="padding:8px 12px;border-right:1px solid #000;display:flex;flex-direction:column;justify-content:flex-end;">
        <div style="border-top:1px dashed #000;padding-top:4px;text-align:center;width:80%;margin:0 auto;">
          RECEIVER NAME, SIGNATURE<br>and CONTACT NO.
        </div>
      </div>
      <div style="padding:8px 12px;display:flex;flex-direction:column;justify-content:space-between;text-align:right;">
        <div style="text-align:left;">
          <p style="margin:0 0 15px 0;">Regards,</p>
          <p style="margin:0;font-weight:bold;">Vijay Shahane</p>
          <p style="margin:0;">Mob No. 8308810784</p>
          <p style="margin:0;">Business Development Head</p>
          <p style="margin:0;">Electrical Engineering</p>
        </div>
        <div style="font-weight:bold;margin-top:10px;">
          FOR ASPA AI LABS
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
      <th style="${css}width:8%;">Sr. No.</th>
      <th style="${css}width:62%;text-align:left;">Description</th>
      <th style="${css}width:15%;">QTY</th>
      <th style="${css}width:15%;">UNIT</th>
    </tr>
  `;
}

function buildItemRowsHTML(items, startIdx) {
  return items.map((item, i) => {
    return `<tr>
      <td class="print-cell" style="text-align:center;width:8%;border:1px solid #000;padding:6px;">${startIdx + i + 1}</td>
      <td class="print-cell" style="text-align:left;width:62%;border:1px solid #000;padding:6px;">${item.description}</td>
      <td class="print-cell" style="text-align:center;width:15%;border:1px solid #000;padding:6px;">${item.qty}</td>
      <td class="print-cell" style="text-align:center;width:15%;border:1px solid #000;padding:6px;">${item.unit}</td>
    </tr>`;
  }).join('');
}

function paginateItemsDOM(data, items) {
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
      </div>
      <div class="preview-footer" style="flex-shrink:0;">${buildPageFooterHTML(data, 1, 1)}</div>
    </div>
  `;
  document.body.appendChild(measureDiv);

  const measureBody = document.getElementById('measureBody');
  const measureTable = document.getElementById('measureTable');
  const measureTbody = document.getElementById('measureTbody');
  
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
    
    if (measureTable.offsetHeight > MAX_HEIGHT - 2) {
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

  const copyNames = ['Original', 'Duplicate', 'Office Copy'];

  return copyNames.map(copyName => {
    const headerHTML = buildPageHeaderHTML(data, copyName);

    return pages.map((page, i) => {
      const footerHTML = buildPageFooterHTML(data, i + 1, totalPages);
      const itemRows = buildItemRowsHTML(page.items, page.startIdx);

      const fillerRow = `
        <tr style="height:100%;">
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
