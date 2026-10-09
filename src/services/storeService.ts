import { Category, Product, StoreSettings } from '../types/store';

const STORAGE_KEYS = {
  CATEGORIES: 'sabor_no_pote_categories_v1',
  PRODUCTS: 'sabor_no_pote_products_v1',
  SETTINGS: 'sabor_no_pote_settings_v1',
};

// Initial state must be strictly empty per requirement:
// "O cardápio deverá iniciar completamente vazio. NÃO CADASTRE PRODUTOS FICTÍCIOS."
const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'SABOR NO POTE',
  whatsappNumber: null, // Unconfigured initially per requirement
  instagramHandle: null, // Unconfigured initially
  openingHours: null,
  address: null,
  deliveryFee: 5.00,
  isDeliveryAvailable: true,
  isPickupAvailable: true,
};

export const getStoreSettings = (): StoreSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveStoreSettings = (settings: Partial<StoreSettings>): StoreSettings => {
  try {
    const current = getStoreSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    window.dispatchEvent(new Event('store_settings_updated'));
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const getCategories = (): Category[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveCategory = (category: Category): Category[] => {
  const categories = getCategories();
  const existingIdx = categories.findIndex((c) => c.id === category.id);
  let updated: Category[];
  if (existingIdx >= 0) {
    updated = [...categories];
    updated[existingIdx] = category;
  } else {
    updated = [...categories, category];
  }
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
  window.dispatchEvent(new Event('store_data_updated'));
  return updated;
};

export const getProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveProduct = (product: Product): Product[] => {
  const products = getProducts();
  const existingIdx = products.findIndex((p) => p.id === product.id);
  let updated: Product[];
  if (existingIdx >= 0) {
    updated = [...products];
    updated[existingIdx] = product;
  } else {
    updated = [...products, product];
  }
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
  window.dispatchEvent(new Event('store_data_updated'));
  return updated;
};

export const deleteProduct = (productId: string): Product[] => {
  const products = getProducts().filter((p) => p.id !== productId);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  window.dispatchEvent(new Event('store_data_updated'));
  return products;
};

export const resetCatalogToEmpty = (): void => {
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
  localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
  window.dispatchEvent(new Event('store_data_updated'));
};

// Optional sample products for client demo testing of sizes, flavors, extras, and cart
export const loadSampleProductsForDemo = (): void => {
  const demoCategories: Category[] = [
    { id: 'cat-doces', name: 'Doces no Pote', displayOrder: 1, active: true },
    { id: 'cat-tortas', name: 'Tortas & Sobremesas', displayOrder: 2, active: true },
    { id: 'cat-salgados', name: 'Salgados no Pote', displayOrder: 3, active: true },
  ];

  const demoProducts: Product[] = [
    {
      id: 'prod-bolo-ninho',
      categoryId: 'cat-doces',
      name: 'Bolo de Pote Ninho com Nutella',
      description: 'Camadas generosas de bolo fofinho umedecido, recheio aveludado de Leite Ninho e pura Nutella original.',
      basePrice: 16.00,
      available: true,
      sizes: [
        { id: 'sz-250', name: 'Pote 250ml (Individual)', price: 0 },
        { id: 'sz-350', name: 'Pote 350ml (Médio)', price: 4.00 },
        { id: 'sz-500', name: 'Pote 500ml (Gourmet)', price: 9.00 },
      ],
      flavors: [
        { id: 'fl-tradicional', name: 'Receita Tradicional', available: true },
        { id: 'fl-extra-cacau', name: 'Massa Cacau 50%', available: true },
      ],
      extras: [
        { id: 'ex-morango', name: 'Morangos frescos picados', price: 3.50, available: true, maxQuantity: 2 },
        { id: 'ex-kinder', name: 'Pedaços de Kinder Bueno', price: 4.50, available: true, maxQuantity: 2 },
        { id: 'ex-calda', name: 'Calda extra de Nutella', price: 3.00, available: true, maxQuantity: 1 },
      ],
      tags: ['Mais Vendido', 'Artesanal'],
    },
    {
      id: 'prod-banoffee',
      categoryId: 'cat-tortas',
      name: 'Banoffee no Pote Especial',
      description: 'Farofinha crocante de biscoito amanteigado, doce de leite artesanal argentino, bananas frescas e chantilly suave.',
      basePrice: 18.00,
      available: true,
      sizes: [
        { id: 'sz-b250', name: 'Pote 250ml', price: 0 },
        { id: 'sz-b350', name: 'Pote 350ml', price: 5.00 },
      ],
      extras: [
        { id: 'ex-canela', name: 'Toque extra de canela e raspas de chocolate', price: 2.00, available: true },
      ],
    },
    {
      id: 'prod-escondidinho',
      categoryId: 'cat-salgados',
      name: 'Escondidinho de Carne Seca no Pote',
      description: 'Purê cremoso de mandioca temperado na manteiga de garrafa com recheio desfiado de carne seca e queijo coalho gratinado.',
      basePrice: 22.00,
      available: true,
      sizes: [
        { id: 'sz-salg-300', name: 'Pote 300ml', price: 0 },
        { id: 'sz-salg-500', name: 'Pote 500ml', price: 8.00 },
      ],
      extras: [
        { id: 'ex-bacon', name: 'Crispy de bacon artesanal', price: 3.50, available: true },
        { id: 'ex-queijo', name: 'Queijo coalho em dobro', price: 4.00, available: true },
      ],
    },
  ];

  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(demoCategories));
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(demoProducts));
  window.dispatchEvent(new Event('store_data_updated'));
};
