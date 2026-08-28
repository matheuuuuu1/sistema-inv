// === Login ===
function loginAs(role) {
  if (role === 'dueno') {
    const pw = prompt('Contraseña del dueño:');
    if (pw === null) return;
    if (pw !== OWNER_PASSWORD) return alert('Contraseña incorrecta');
  }
  userRole = role;
  localStorage.setItem('userRole', role);
  enterApp();
}

function logout() {
  userRole = null;
  localStorage.removeItem('userRole');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

function enterApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  maybeDailyBackup();
  initApp();
}

// === Estado ===
let currentRate = null;
let navStack = [];
let currentView = 'categories';
let cart = [];
let orders = [];
let customers = {};
let fiadoFilter = 'unpaid';
let currentData = null;
let rateMode = 'bcv';
let customRate = null;
let userRole = null;
let loadedRate = null;
let loadedRateDate = null;

// === DOM ===
const $main = document.getElementById('main');
const $title = document.getElementById('title');
const $back = document.getElementById('btn-back');
const $rate = document.getElementById('rate-display');
const $btnMenu = document.getElementById('btn-menu');

// === Util ===
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function formatBs(usd) {
  const rate = rateMode === 'custom' ? customRate : currentRate;
  if (!rate) return 'Bs --';
  return `Bs ${(usd * rate).toFixed(2)}`;
}

function formatBsNum(usd) {
  const rate = rateMode === 'custom' ? customRate : currentRate;
  return rate ? usd * rate : 0;
}

function save() {
  persist({ orders, customers });
}

function updateFAB() {
  const fab = document.getElementById('fab');
  const badge = document.getElementById('fab-badge');
  if (!fab) return;
  const total = cart.reduce((s, i) => s + i.qty, 0);
  fab.classList.toggle('hidden', total === 0);
  if (badge) badge.textContent = total > 0 ? total : '';
}

// === Tasa BCV (una vez al dia a las 12pm) ===
async function fetchRate() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const cached = loadedRate;
  const cachedDate = loadedRateDate;

  if (cached && cachedDate === today) {
    currentRate = parseFloat(cached);
    updateRateDisplay();
    return;
  }

  if (now.getHours() < 12 && cached) {
    currentRate = parseFloat(cached);
    updateRateDisplay();
    return;
  }

  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    const data = await res.json();
    currentRate = data.promedio || data.compra;
    loadedRate = currentRate.toString();
    loadedRateDate = today;
    persist({ rate: loadedRate, rateDate: today });
  } catch {
    if (cached) currentRate = parseFloat(cached);
  }
  updateRateDisplay();
}

function updateRateDisplay() {
  const rate = rateMode === 'custom' ? customRate : currentRate;
  const label = rateMode === 'custom' ? 'Personalizada' : 'BCV';
  $rate.textContent = rate
    ? `${label}: ${rate.toFixed(2)} Bs`
    : `${label}: sin datos`;
}

function showRateOptions() {
  navStack.push({ view: currentView, data: currentData });
  currentView = 'rateOptions';
  $title.textContent = 'Tasa de cambio';
  $back.classList.remove('hidden');

  $main.innerHTML = `
    <div class="rate-options">
      <div class="rate-option ${rateMode === 'bcv' ? 'active' : ''}" onclick="setRateMode('bcv')">
        <div class="rate-option-title">BCV (Tasa Oficial)</div>
        <div class="rate-option-desc">${currentRate ? currentRate.toFixed(2) + ' Bs' : 'Sin conexion'}</div>
      </div>
      <div class="rate-option ${rateMode === 'custom' ? 'active' : ''}" onclick="setRateMode('custom')">
        <div class="rate-option-title">Tasa personalizada</div>
        <div class="rate-option-desc">${customRate ? customRate.toFixed(2) + ' Bs' : 'Ingresar monto'}</div>
      </div>
    </div>
  `;
}

function setRateMode(mode) {
  if (mode === 'custom') {
    const input = prompt('Ingresa la tasa personalizada (Bs por $1):', customRate || '');
    if (input === null) return;
    const val = parseFloat(input.replace(',', '.'));
    if (isNaN(val) || val <= 0) return alert('Tasa invalida');
    customRate = val;
    persist({ customRate: customRate.toString() });
  }
  rateMode = mode;
  persist({ rateMode });
  updateRateDisplay();
  goBack();
}

// === Clientes frecuentes ===
function isFrequent(name) {
  const key = name.trim().toLowerCase();
  return customers[key] && customers[key].totalOrders >= 5;
}

function getFrequentCustomers() {
  return Object.entries(customers)
    .filter(([_, v]) => v.totalOrders >= 5)
    .map(([k, v]) => ({ name: v.displayName, key: k, orders: v.totalOrders, phone: v.phone || '' }))
    .sort((a, b) => b.orders - a.orders);
}

function incrementCustomer(name, phone) {
  const key = name.trim().toLowerCase();
  if (!customers[key]) {
    customers[key] = { displayName: name.trim(), totalOrders: 0, phone: '' };
  }
  customers[key].totalOrders++;
  if (phone) customers[key].phone = phone;
  save();
}

// === Navegacion ===
function navigate(view, data) {
  navStack.push({ view: currentView, data: currentData });
  currentView = view;
  currentData = data;
  render();
}

function goBack() {
  if (navStack.length === 0) return;
  const prev = navStack.pop();
  currentView = prev.view;
  currentData = prev.data;
  render();
}

function render() {
  $back.classList.toggle('hidden', navStack.length === 0);
  $btnMenu.classList.toggle('hidden', navStack.length > 0);
  switch (currentView) {
    case 'categories': renderCategories(); break;
    case 'category': renderCategory(currentData); break;
    case 'cart': renderCart(); break;
    case 'frecuentes': renderFrecuentes(); break;
    case 'fiados': renderFiados(); break;
    case 'records': renderRecords(); break;
    case 'edit': renderEdit(); break;
    case 'datos': renderDatos(); break;
    case 'rateOptions': break;
  }
  updateFAB();
}

// === Vista: Categorias ===
function renderCategories() {
  $title.textContent = 'Panaderia';
  const cats = getEditableCategories();
  $main.innerHTML = `
    <div class="cat-grid">
      ${cats.map(cat => `
        <div class="cat-card" onclick="navigate('category', '${cat.id}')">
          <div class="icon">${cat.icon}</div>
          <div class="name">${cat.name}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// === Vista: Productos de categoria ===
function renderCategory(catId) {
  const cats = getEditableCategories();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return navStack.pop(), currentView = 'categories', render();
  $title.textContent = cat.name;

  $main.innerHTML = cat.items.map(item => {
    const inCart = cart.find(c => c.id === item.id);
    return `
      <div class="prod-row" onclick="addToCart('${item.id}')">
        <div class="prod-info">
          <span class="prod-name">${item.name}</span>
          <span class="prod-price-usd">$${item.priceUsd.toFixed(2)}</span>
        </div>
        <div class="prod-right">
          <span class="prod-price">${formatBs(item.priceUsd)}</span>
          ${inCart
            ? `<span class="qty-badge">x${inCart.qty}</span>`
            : `<span class="add-icon">+</span>`
          }
        </div>
      </div>
    `;
  }).join('');
}

// === Carrito: agregar/quitar ===
function findProduct(id) {
  const cats = getEditableCategories();
  for (const cat of cats) {
    const item = cat.items.find(i => i.id === id);
    if (item) return item;
  }
  return null;
}

function addToCart(productId) {
  const item = findProduct(productId);
  if (!item) return;
  const existing = cart.find(c => c.id === productId);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id: item.id, name: item.name, priceUsd: item.priceUsd, qty: 1 });
  }
  updateFAB();
  if (currentView === 'category') renderCategory(currentData);
}

function changeQty(productId, delta) {
  const idx = cart.findIndex(c => c.id === productId);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  updateFAB();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(c => c.id !== productId);
  updateFAB();
  renderCart();
}

// === Vista: Carrito (formulario) ===
function renderCart() {
  $title.textContent = 'Carrito';

  if (cart.length === 0) {
    $main.innerHTML = `<div class="empty-state">El carrito esta vacio</div>`;
    return;
  }

  const totalBs = cart.reduce((s, i) => s + formatBsNum(i.priceUsd) * i.qty, 0);
  const totalUsd = cart.reduce((s, i) => s + i.priceUsd * i.qty, 0);

  $main.innerHTML = `
    <div class="cart-form">
      ${cart.map(item => `
        <div class="cart-product-card">
          <button class="remove-btn" onclick="removeFromCart('${item.id}')">✕</button>
          <div class="form-group">
            <label>Producto</label>
            <input type="text" value="${item.name}" readonly>
          </div>
          <div class="row-3">
            <div class="form-group">
              <label>Monto</label>
              <input type="text" value="${formatBs(item.priceUsd)}" readonly>
            </div>
            <div class="form-group">
              <label>Cantidad</label>
              <div class="qty-inline">
                <button class="qty-btn-sm" onclick="changeQty('${item.id}', -1)">−</button>
                <span class="qty-display">${item.qty}</span>
                <button class="qty-btn-sm" onclick="changeQty('${item.id}', 1)">+</button>
              </div>
            </div>
            <div class="form-group">
              <label>Total</label>
              <input type="text" value="${formatBs(item.priceUsd * item.qty)}" readonly>
            </div>
          </div>
        </div>
      `).join('')}

      <button class="frequent-btn" onclick="navigate('frecuentes')">
        ⭐ Frecuentes
      </button>

      <div class="row-2">
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="client-name" placeholder="Nombre" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Apellido</label>
          <input type="text" id="client-last" placeholder="Apellido" autocomplete="off">
        </div>
      </div>

      <div class="form-group">
        <label>Telefono (opcional)</label>
        <input type="tel" id="client-phone" placeholder="0412-1234567" autocomplete="off">
      </div>

      <div class="cart-total">Total Bs ${totalBs.toFixed(2)} <span class="total-usd">($${totalUsd.toFixed(2)})</span></div>

      <div class="buttons-row">
        <button class="btn" onclick="processPayment()">Procesar Pago</button>
        <button class="btn" onclick="goBack()">Agregar mas...</button>
      </div>
    </div>
  `;
}

// === Frecuentes ===
function renderFrecuentes(query) {
  $title.textContent = 'Frecuentes';
  const frequent = getFrequentCustomers();
  const q = (query || '').toLowerCase();

  if (frequent.length === 0) {
    $main.innerHTML = `
      <div class="empty-state">No hay clientes frecuentes aun</div>
      <div class="bottom-bar">
        <button class="bar-btn" onclick="goBack()">
          <span class="bar-icon">◀</span>
          <span>Volver</span>
        </button>
      </div>
    `;
    return;
  }

  const filtered = q ? frequent.filter(c => c.name.toLowerCase().includes(q)) : frequent;

  $main.innerHTML = `
    <input type="text" id="freq-search" class="freq-search" placeholder="Buscar cliente..." value="${q}" oninput="filterFrecuentes(this.value)">
    ${filtered.length === 0 ? '<div class="empty-state">No se encontraron clientes</div>' : ''}
    ${filtered.map(c => `
      <div class="freq-row" onclick="selectFrequent('${c.name.replace(/'/g, "\\'")}')">
        <div class="freq-info">
          <span class="freq-name">${c.name}</span>
          <span class="freq-orders">${c.orders} pedidos</span>
        </div>
        <span class="freq-arrow">▶</span>
      </div>
  `).join('')}
  `;

  $main.innerHTML += `
    <div class="bottom-bar">
      <button class="bar-btn" onclick="goBack()">
        <span class="bar-icon">◀</span>
        <span>Volver</span>
      </button>
    </div>
  `;
}

function filterFrecuentes(query) {
  renderFrecuentes(query);
  const input = document.getElementById('freq-search');
  if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
}

function selectFrequent(name) {
  const key = name.trim().toLowerCase();
  const customer = customers[key];
  goBack();
  const $name = document.getElementById('client-name');
  const $last = document.getElementById('client-last');
  const $phone = document.getElementById('client-phone');
  if ($name) $name.value = name.split(' ')[0] || '';
  if ($last) $last.value = name.split(' ').slice(1).join(' ') || '';
  if ($phone && customer && customer.phone) $phone.value = customer.phone;
}

// === Procesar Pago ===
function processPayment() {
  const name = document.getElementById('client-name')?.value.trim() || '';
  const last = document.getElementById('client-last')?.value.trim() || '';
  const phone = document.getElementById('client-phone')?.value.trim() || '';

  if (!name || !last) return alert('Nombre y Apellido son obligatorios');

  window._pendingClient = {
    name: name + (last ? ' ' + last : ''),
    phone: phone || null,
  };

  showPaymentScreen();
}

function showPaymentScreen(method) {
  method = method || 'punto';
  window._paymentMethod = method;
  $title.textContent = 'Procesar Pago';
  const totalBs = cart.reduce((s, i) => s + formatBsNum(i.priceUsd) * i.qty, 0);
  const totalUsd = cart.reduce((s, i) => s + i.priceUsd * i.qty, 0);

  $main.innerHTML = `
    <div class="payment-screen">
      <div class="payment-total">
        <span class="payment-total-label">Total a pagar</span>
        <span class="payment-total-bs">Bs ${totalBs.toFixed(2)}</span>
        <span class="payment-total-usd">$${totalUsd.toFixed(2)}</span>
      </div>

      <div class="payment-method-bar">
        <button class="payment-method-btn ${method === 'punto' ? 'active' : ''}" onclick="showPaymentScreen('punto')">Punto</button>
        <button class="payment-method-btn ${method === 'pmovil' ? 'active' : ''}" onclick="showPaymentScreen('pmovil')">Pago Movil</button>
      </div>

      ${method === 'pmovil' ? `
      <div class="pmovil-row-card">
        <div class="pmovil-card">
          <div class="pmovil-title">Pago Movil</div>
          <div class="pmovil-row"><span class="pmovil-label">Telefono</span><span class="pmovil-value">${PAGO_MOVIL.phone}</span></div>
          <div class="pmovil-row"><span class="pmovil-label">Cedula</span><span class="pmovil-value">${PAGO_MOVIL.cedula}</span></div>
          <div class="pmovil-row"><span class="pmovil-label">Banco</span><span class="pmovil-value">${PAGO_MOVIL.bank}</span></div>
          <div class="pmovil-row"><span class="pmovil-label">Nombre</span><span class="pmovil-value">${PAGO_MOVIL.name}</span></div>
        </div>

        <div class="qr-container">
          <img src="qr-pago.png" alt="QR Pago Movil" class="qr-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="qr-placeholder" style="display:none;">
            <span>Coloca tu QR aqui</span>
            <span class="qr-hint">Archivo: qr-pago.png</span>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="payment-buttons">
        <button class="btn btn-confirm" onclick="confirmPayment()">Confirmar Pago</button>
        <button class="btn btn-debt" onclick="markAsDebt()">Hoy no pago</button>
      </div>
    </div>
  `;
}

function confirmPayment() {
  const method = window._paymentMethod || 'punto';

  if (method === 'pmovil') {
    const ref = prompt('Ultimos 4 digitos de la referencia:');
    if (ref === null) return;
    if (ref.trim().length !== 4 || isNaN(ref.trim())) return alert('Ingresa exactamente 4 digitos');
    window._pendingRef = ref.trim();
  }

  const { name, phone } = window._pendingClient || {};
  const order = {
    id: uid(),
    items: [...cart],
    totalUsd: cart.reduce((s, i) => s + i.priceUsd * i.qty, 0),
    totalBs: cart.reduce((s, i) => s + formatBsNum(i.priceUsd) * i.qty, 0),
    client: name,
    phone: phone,
    method: method,
    reference: method === 'pmovil' ? window._pendingRef : 'PV',
    paid: true,
    date: new Date().toISOString(),
  };
  orders.push(order);
  if (name) incrementCustomer(name, phone);
  save();
  cart = [];
  updateFAB();
  showOrderConfirmation(order);
}

function markAsDebt() {
  const { name, phone } = window._pendingClient || {};
  const order = {
    id: uid(),
    items: [...cart],
    totalUsd: cart.reduce((s, i) => s + i.priceUsd * i.qty, 0),
    totalBs: cart.reduce((s, i) => s + formatBsNum(i.priceUsd) * i.qty, 0),
    client: name || 'Sin cliente',
    phone: phone,
    paid: false,
    date: new Date().toISOString(),
  };
  orders.push(order);
  if (name) incrementCustomer(name, phone);
  save();
  cart = [];
  updateFAB();
  showOrderConfirmation(order);
}

function showOrderConfirmation(order) {
  $title.textContent = 'Pedido Confirmado';
  navStack = [];
  currentView = 'categories';
  currentData = null;
  $main.innerHTML = `
    <div class="confirmation">
      <div class="confirm-icon">✓</div>
      <div class="confirm-text">Pedido registrado</div>
      <div class="confirm-detail">
        ${order.client ? `Cliente: ${order.client}<br>` : ''}
        Total: ${formatBs(order.totalUsd)}
      </div>
      <button class="btn confirm-btn" onclick="render()">Volver al menu</button>
    </div>
  `;
}

// === Fiados ===
function renderFiados() {
  $title.textContent = 'Fiados';
  let filtered = orders;
  if (fiadoFilter === 'unpaid') filtered = orders.filter(o => !o.paid);
  if (fiadoFilter === 'paid') filtered = orders.filter(o => o.paid);

  $main.innerHTML = `
    <div class="filter-bar">
      <button class="filter-btn ${fiadoFilter === 'unpaid' ? 'active' : ''}" onclick="setFilter('unpaid')">Deudores</button>
      <button class="filter-btn ${fiadoFilter === 'paid' ? 'active' : ''}" onclick="setFilter('paid')">Pagados</button>
    </div>
    <div class="fiado-list">
      ${filtered.length === 0 ? '<div class="empty-state">No hay pedidos</div>' : ''}
      ${filtered.map(o => `
        <div class="fiado-card ${o.paid ? 'paid' : 'unpaid'}">
          <div class="fiado-header">
            <span class="fiado-client">${o.client || 'Sin cliente'}</span>
            <span class="fiado-status">${o.paid ? '✓ Pagado' : '⚠ Pendiente'}</span>
          </div>
          <div class="fiado-detail">
            ${o.items.map(i => `${i.name} x${i.qty}`).join(', ')}
          </div>
          <div class="fiado-footer">
            <span class="fiado-total">${formatBs(o.totalUsd)}</span>
            <span class="fiado-date">${new Date(o.date).toLocaleDateString()}</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="bottom-bar">
      <button class="bar-btn" onclick="navStack = []; currentView = 'categories'; currentData = null; render()">
        <span class="bar-icon">◀</span>
        <span>Volver</span>
      </button>
    </div>
  `;
}

function setFilter(f) {
  fiadoFilter = f;
  renderFiados();
}

// === Sidebar ===
function toggleMenu() {
  const sidebar = document.getElementById('sidebar');
  const isOwner = userRole === 'dueno';
  sidebar.querySelectorAll('.sidebar-owner').forEach(el => {
    el.classList.toggle('hidden-owner', !isOwner);
  });
  sidebar.classList.toggle('hidden');
}

function sidebarGo(view) {
  toggleMenu();
  navStack = [];
  currentView = view;
  currentData = null;
  render();
}

// === Datos: Exportar / Importar ===
function downloadText(text, filename, type) {
  const blob = new Blob([text], { type: type || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderDatos() {
  $title.textContent = 'Datos';

  $main.innerHTML = `
    <div class="datos-card">
      <div class="datos-title">Exportar</div>
      <div class="datos-desc">Selecciona qué datos incluir:</div>
      <div class="datos-check-list">
        <label class="check-row">
          <input type="checkbox" id="ex-orders" checked>
          <span>Pedidos / Ventas</span>
          <span class="check-count">${orders.length}</span>
        </label>
        <label class="check-row">
          <input type="checkbox" id="ex-customers" checked>
          <span>Clientes frecuentes</span>
          <span class="check-count">${Object.keys(customers).length}</span>
        </label>
        <label class="check-row">
          <input type="checkbox" id="ex-categories">
          <span>Productos editados</span>
        </label>
        <label class="check-row">
          <input type="checkbox" id="ex-rate">
          <span>Tasa configurada</span>
        </label>
      </div>
      <button class="btn btn-export" onclick="doExport()">Exportar (JSON)</button>
    </div>

    <div class="datos-card">
      <div class="datos-title">Importar</div>
      <div class="datos-desc">Carga un archivo JSON exportado antes. Elige cómo aplicarlo:</div>
      <input type="file" id="import-file" accept="application/json,.json" hidden>
      <div class="import-modes" id="import-modes">
        <label class="mode-row">
          <input type="radio" name="import-mode" value="sum" checked>
          <span class="mode-name">Sumar</span>
          <span class="mode-desc">Agrega lo que no existe y suma los conteos</span>
        </label>
        <label class="mode-row">
          <input type="radio" name="import-mode" value="over">
          <span class="mode-name">Sobreponer</span>
          <span class="mode-desc">Une, y lo del archivo gana si hay coincidencia</span>
        </label>
        <label class="mode-row">
          <input type="radio" name="import-mode" value="replace">
          <span class="mode-name">Reemplazar</span>
          <span class="mode-desc">Borra lo actual y usa solo el archivo</span>
        </label>
      </div>
      <button class="btn btn-import" onclick="document.getElementById('import-file').click()">Elegir archivo</button>
      <button class="btn btn-import-confirm hidden" id="import-confirm" onclick="doImport()">Confirmar importacion</button>
    </div>
  `;

  const fileInput = document.getElementById('import-file');
  fileInput.onchange = () => {
    const btn = document.getElementById('import-confirm');
    btn.classList.toggle('hidden', !fileInput.files.length);
  };
}

function importMode() {
  const sel = document.querySelector('input[name="import-mode"]:checked');
  return sel ? sel.value : 'replace';
}

function doExport() {
  const data = { version: 1, exported: new Date().toISOString() };

  if (document.getElementById('ex-orders').checked) data.orders = orders;
  if (document.getElementById('ex-customers').checked) data.customers = customers;
  if (document.getElementById('ex-categories').checked) {
    data.categories = getEditableCategories();
  }
  if (document.getElementById('ex-rate').checked) {
    data.rateMode = rateMode;
    data.customRate = customRate;
    data.rate = loadedRate;
    data.rateDate = loadedRateDate;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  downloadText(JSON.stringify(data, null, 2), `panaderia_backup_${stamp}.json`, 'application/json');
  alert('Datos exportados');
}

function doImport() {
  const input = document.getElementById('import-file');
  if (!input.files.length) return;
  const file = input.files[0];
  const mode = importMode();
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      await applyImport(data, mode);
    } catch {
      alert('Archivo invalido (no es un JSON valido)');
    }
  };
  reader.readAsText(file);
}

function mergeOrders(cur, inc) {
  const byId = new Map(cur.map(o => [o.id, o]));
  for (const o of inc) {
    if (!byId.has(o.id)) byId.set(o.id, o);
  }
  return Array.from(byId.values());
}

function mergeCustomers(cur, inc) {
  const out = Object.assign({}, cur);
  for (const [k, v] of Object.entries(inc)) {
    const existing = out[k];
    if (!existing) {
      out[k] = Object.assign({}, v);
    } else {
      const hasNewPhone = !!(v.phone && v.phone !== '');
      const hasOldPhone = !!(existing.phone && existing.phone !== '');
      out[k] = {
        displayName: existing.displayName || v.displayName || k,
        phone: hasNewPhone && !hasOldPhone ? v.phone : existing.phone,
        totalOrders: (existing.totalOrders || 0) + (v.totalOrders || 0),
      };
    }
  }
  return out;
}

function mergeOrdersOver(cur, inc) {
  const byId = new Map(cur.map(o => [o.id, o]));
  for (const o of inc) byId.set(o.id, o);
  return Array.from(byId.values());
}

function mergeCustomersOver(cur, inc) {
  const out = Object.assign({}, cur);
  for (const [k, v] of Object.entries(inc)) out[k] = Object.assign({}, v);
  return out;
}

async function applyImport(data, mode) {
  mode = mode || 'replace';

  if (data.orders !== undefined) {
    if (mode === 'sum') orders = mergeOrders(orders, data.orders);
    else if (mode === 'over') orders = mergeOrdersOver(orders, data.orders);
    else orders = data.orders;
  }
  if (data.customers !== undefined) {
    if (mode === 'sum') customers = mergeCustomers(customers, data.customers);
    else if (mode === 'over') customers = mergeCustomersOver(customers, data.customers);
    else customers = data.customers;
  }
  if (data.categories !== undefined) loadedCategories = data.categories;
  if (data.rateMode !== undefined) {
    rateMode = data.rateMode;
    customRate = data.customRate ? parseFloat(data.customRate) : null;
    loadedRate = data.rate || null;
    loadedRateDate = data.rateDate || null;
  }

  const partial = {};
  if (data.orders !== undefined) partial.orders = orders;
  if (data.customers !== undefined) partial.customers = customers;
  if (data.categories !== undefined) partial.categories = loadedCategories;
  if (data.rateMode !== undefined) partial.rateMode = rateMode;
  if (data.customRate !== undefined) partial.customRate = customRate;
  if (data.rate !== undefined) partial.rate = loadedRate;
  if (data.rateDate !== undefined) partial.rateDate = loadedRateDate;
  await persist(partial);

  updateRateDisplay();
  const names = { sum: 'Sumados', over: 'Sobrepuestos', replace: 'Reemplazados' }[mode] || 'Importados';
  alert(`Datos ${names} correctamente`);
  renderDatos();
}

// === Modal ===
function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// === Registros / Ventas ===
function renderRecords() {
  $title.textContent = 'Registros';
  const sorted = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sorted.length === 0) {
    $main.innerHTML = `<div class="empty-state">No hay registros</div>`;
    return;
  }

  $main.innerHTML = sorted.map(o => `
    <div class="record-card ${o.paid ? 'paid' : 'unpaid'}">
      <div class="record-header">
        <span class="record-client">${o.client || 'Sin cliente'}</span>
        <span class="record-status">${o.paid ? '✓ Pagado' : '⚠ Sin pago'}</span>
      </div>
      <div class="record-detail">
        ${o.items.map(i => `${i.name} x${i.qty}`).join(', ')}
      </div>
      <div class="record-footer">
        <span class="record-total">${formatBs(o.totalUsd)}</span>
        <span class="record-date">${new Date(o.date).toLocaleDateString()}</span>
        <button class="record-products-btn" onclick="showOrderProducts('${o.id}')">Productos</button>
        ${o.paid && o.method === 'pmovil' ? `<span class="record-ref">Ref: ${o.reference || 'N/A'}</span>` : ''}
        ${o.paid && o.method === 'punto' ? '<span class="record-ref">Ref: PV</span>' : ''}
        ${o.paid && !o.method ? `<span class="record-ref">Ref: ${o.reference || 'N/A'}</span>` : ''}
        ${!o.paid ? '<span class="record-ref">Sin pago</span>' : ''}
      </div>
    </div>
  `).join('');
}

function showOrderProducts(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const itemsHtml = order.items.map(i => `
    <div class="modal-product-row">
      <span class="modal-product-name">${i.name}</span>
      <span class="modal-product-qty">x${i.qty}</span>
      <span class="modal-product-price">${formatBs(i.priceUsd * i.qty)}</span>
    </div>
  `).join('');

  openModal(`Pedido - ${order.client || 'Sin cliente'}`, `
    <div class="modal-products">
      ${itemsHtml}
      <div class="modal-products-total">Total: ${formatBs(order.totalUsd)}</div>
    </div>
  `);
}

// === Editar Productos ===
let loadedCategories = null;

function getEditableCategories() {
  return loadedCategories ? JSON.parse(JSON.stringify(loadedCategories)) : CATEGORIES;
}

function saveCategories(cats) {
  loadedCategories = cats;
  persist({ categories: cats });
}

function renderEdit() {
  $title.textContent = 'Editar';
  const cats = getEditableCategories();

  $main.innerHTML = cats.map(cat => `
    <div class="edit-cat-section">
      <div class="edit-cat-header">
        <span class="edit-cat-name">${cat.icon} ${cat.name}</span>
        <button class="edit-add-btn" onclick="addProduct('${cat.id}')">+ Producto</button>
      </div>
      ${cat.items.map(item => `
        <div class="edit-prod-row">
          <div class="edit-prod-info">
            <span class="edit-prod-name">${item.name}</span>
            <span class="edit-prod-price">$${item.priceUsd.toFixed(2)}</span>
          </div>
          <div class="edit-prod-actions">
            <button class="edit-action-btn" onclick="editProduct('${cat.id}', '${item.id}')">✏️</button>
            <button class="edit-action-btn edit-delete" onclick="deleteProduct('${cat.id}', '${item.id}')">🗑️</button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function addProduct(catId) {
  const name = prompt('Nombre del producto:');
  if (!name) return;
  const price = prompt('Precio en USD:');
  if (!price) return;
  const usd = parseFloat(price.replace(',', '.'));
  if (isNaN(usd) || usd <= 0) return alert('Precio invalido');

  const cats = getEditableCategories();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return;

  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);
  cat.items.push({ id, name, priceUsd: usd });
  saveCategories(cats);
  renderEdit();
}

function editProduct(catId, itemId) {
  const cats = getEditableCategories();
  const cat = cats.find(c => c.id === catId);
  const item = cat?.items.find(i => i.id === itemId);
  if (!item) return;

  const name = prompt('Nombre del producto:', item.name);
  if (!name) return;
  const price = prompt('Precio en USD:', item.priceUsd);
  if (!price) return;
  const usd = parseFloat(price.replace(',', '.'));
  if (isNaN(usd) || usd <= 0) return alert('Precio invalido');

  item.name = name;
  item.priceUsd = usd;
  saveCategories(cats);
  renderEdit();
}

function deleteProduct(catId, itemId) {
  if (!confirm('Eliminar este producto?')) return;
  const cats = getEditableCategories();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return;
  cat.items = cat.items.filter(i => i.id !== itemId);
  saveCategories(cats);
  renderEdit();
}

// === Init ===
let appStarted = false;
async function initApp() {
  await fetchRate();
  renderCategories();
  if (!appStarted) {
    appStarted = true;
    setInterval(fetchRate, 60 * 60 * 1000);
  }
}

async function boot() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');

  await detectServer();
  updateModeLabel();
  const data = await loadAll();
  if (data) {
    orders = data.orders || [];
    customers = data.customers || {};
    loadedCategories = data.categories || null;
    loadedRate = data.rate;
    loadedRateDate = data.rateDate;
    rateMode = data.rateMode || 'bcv';
    customRate = data.customRate ? parseFloat(data.customRate) : null;
  }

  userRole = localStorage.getItem('userRole') || null;
  if (userRole) {
    enterApp();
  }
}

function updateModeLabel() {
  const el = document.getElementById('login-mode');
  if (!el) return;
  el.textContent = USE_SERVER ? 'Modo: Compartido (server)' : 'Modo: Solo este dispositivo (local)';
}

// === Backup diario automatico ===
const BACKUP_KEY = 'lastBackupDate';

function collectBackupData() {
  return {
    version: 1,
    exported: new Date().toISOString(),
    orders: orders,
    customers: customers,
    categories: getEditableCategories(),
    rateMode: rateMode,
    customRate: customRate,
    rate: loadedRate,
    rateDate: loadedRateDate,
  };
}

function maybeDailyBackup() {
  const today = new Date().toISOString().slice(0, 10);
  const last = localStorage.getItem(BACKUP_KEY);
  if (last === today) return;

  // Backup al abrir (una vez por dia): descarga el .json automaticamente.
  try {
    downloadText(JSON.stringify(collectBackupData(), null, 2),
      `panaderia_backup_${today}.json`, 'application/json');
    localStorage.setItem(BACKUP_KEY, today);
  } catch {}
}

boot();
