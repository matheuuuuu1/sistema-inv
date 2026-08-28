const CATEGORIES = [
  {
    id: 'panes',
    name: 'Panes',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11c0-3 2-7 9-7s9 4 9 7c0 2-1 3-2 3H5c-1 0-2-1-2-3z"/><path d="M7 14v3M12 14v3M17 14v3"/></svg>',
    items: [
      { id: 'pan-frances', name: 'Pan Frances', priceUsd: 0.15 },
      { id: 'pan-de-jamon', name: 'Pan de Jamon', priceUsd: 0.50 },
      { id: 'cachito', name: 'Cachito', priceUsd: 0.20 },
      { id: 'medianoche', name: 'Medianoche', priceUsd: 0.25 },
      { id: 'croissant', name: 'Croissant', priceUsd: 0.30 },
    ]
  },
  {
    id: 'refrescos',
    name: 'Refrescos',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7z"/><path d="M8 7l2-3h4l2 3"/></svg>',
    items: [
      { id: 'coca-cola', name: 'Coca-Cola 500ml', priceUsd: 0.75 },
      { id: 'pepsi', name: 'Pepsi 500ml', priceUsd: 0.70 },
      { id: 'agua', name: 'Agua 500ml', priceUsd: 0.40 },
      { id: 'jugo-natural', name: 'Jugo Natural', priceUsd: 0.60 },
      { id: 'malta', name: 'Malta', priceUsd: 0.50 },
    ]
  },
  {
    id: 'charcuteria',
    name: 'Charcuteria',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.5a5.5 5.5 0 0 1 5.5 5.5c0 4.2-5.3 10.1-10.2 11.3l-2.4.6 1.1-2.1c1.5-3 .7-8.4-2.2-12.2-.8-1 2-2.4 4.5-.9 1.8 1.1 3.7 1.1 3.7-1.8z"/></svg>',
    items: [
      { id: 'jamon', name: 'Jamón', priceUsd: 2.50 },
      { id: 'queso', name: 'Queso', priceUsd: 2.00 },
      { id: 'mortadela', name: 'Mortadela', priceUsd: 1.80 },
      { id: 'salchicha', name: 'Salchicha', priceUsd: 1.50 },
    ]
  },
  {
    id: 'dulces',
    name: 'Dulces',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V11h14v10M5 11l2-5h10l2 5M12 6V3"/><path d="M7 14h10M7 17h10"/></svg>',
    items: [
      { id: 'ensaimada', name: 'Ensaimada', priceUsd: 0.35 },
      { id: 'pastelito', name: 'Pastelito', priceUsd: 0.25 },
      { id: 'torta', name: 'Torta', priceUsd: 1.00 },
      { id: 'galette', name: 'Galette', priceUsd: 0.40 },
      { id: 'beignet', name: 'Beignet', priceUsd: 0.30 },
    ]
  }
];

// === Datos de Pago Movil (editar aqui) ===
const PAGO_MOVIL = {
  name: 'Juan Perez',
  cedula: 'V-12345678',
  phone: '0412-1234567',
  bank: 'Banco Nacional de Crédito',
};

// === Contraseña del dueño (editar aqui) ===
const OWNER_PASSWORD = '1234';
