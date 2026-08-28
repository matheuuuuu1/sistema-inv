const CATEGORIES = [
  {
    id: 'panes',
    name: 'Panes',
    icon: '🍞',
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
    icon: '🥤',
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
    icon: '🧀',
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
    icon: '🍩',
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
