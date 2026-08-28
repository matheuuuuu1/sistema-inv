// === Capa de datos dual ===
// Deteccion automatica:
//  - Si la app se sirve desde server.py (/api/db responde), usa backend compartido.
//  - Si no, usa localStorage del navegador.
let USE_SERVER = false;
let serverReady = false;

const LS_KEYS = ['orders', 'customers', 'categories', 'rate', 'rateDate', 'rateMode', 'customRate', 'userRole'];

async function detectServer() {
  try {
    const res = await fetch('./api/db', { method: 'GET' });
    if (res.ok) {
      USE_SERVER = true;
      serverReady = true;
    }
  } catch {
    USE_SERVER = false;
  }
}

// Carga todos los datos desde backend o localStorage
async function loadAll() {
  if (!USE_SERVER) {
    return {
      orders: JSON.parse(localStorage.getItem('orders') || '[]'),
      customers: JSON.parse(localStorage.getItem('customers') || '{}'),
      categories: JSON.parse(localStorage.getItem('categories')) || null,
      rate: localStorage.getItem('rate'),
      rateDate: localStorage.getItem('rateDate'),
      rateMode: localStorage.getItem('rateMode') || 'bcv',
      customRate: localStorage.getItem('customRate'),
      userRole: localStorage.getItem('userRole'),
    };
  }

  try {
    const res = await fetch('./api/db');
    const data = await res.json();
    serverReady = true;
    return {
      orders: data.orders || [],
      customers: data.customers || {},
      categories: data.categories || null,
      rate: data.rate,
      rateDate: data.rateDate,
      rateMode: data.rateMode || 'bcv',
      customRate: data.customRate,
      userRole: null,  // login queda local al navegador
    };
  } catch {
    return null;  // servidor cayo -> el caller decide (guardar en local)
  }
}

// Guarda los datos. En modo server envia lo que cambio.
async function persist(partial) {
  const store = (k, v) => {
    if (v === null || v === undefined) {
      localStorage.removeItem(k);
    } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      localStorage.setItem(k, String(v));
    } else {
      localStorage.setItem(k, JSON.stringify(v));
    }
  };

  if (USE_SERVER) {
    try {
      await fetch('./api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
    } catch {
      // server caido: cae a local silenciosamente
      for (const k of Object.keys(partial)) {
        store(k, partial[k]);
      }
    }
    return;
  }
  for (const k of Object.keys(partial)) {
    store(k, partial[k]);
  }
}
