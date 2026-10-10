import {
  Category,
  Product,
  ProductVariation,
  ProductFlavor,
  ProductExtra,
  StoreSettings,
  OrderRecord,
  OrderStatus,
  OrderCheckout,
  CartItem,
} from '../types/store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEYS = {
  CATEGORIES: 'sabor_no_pote_categories_v1',
  PRODUCTS: 'sabor_no_pote_products_v1',
  SETTINGS: 'sabor_no_pote_settings_v1',
  ORDERS: 'sabor_no_pote_orders_v1',
};

// Initial state must be strictly empty per requirement:
// "O cardápio deverá iniciar completamente vazio. NÃO CADASTRE PRODUTOS FICTÍCIOS."
const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'SABOR NO POTE',
  whatsappNumber: null, // Unconfigured initially per requirement
  instagramHandle: '@sabornopoteoficialdf', // Instagram oficial do Sabor no Pote
  openingHours: null,
  address: null,
  deliveryFee: 0.0,
  isDeliveryAvailable: false, // Entrega não disponibilizada inicialmente até a proprietária configurar
  isPickupAvailable: true,
};

// ==========================================
// 1. STORE SETTINGS
// ==========================================

export const getStoreSettings = (): StoreSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      instagramHandle: parsed.instagramHandle || DEFAULT_SETTINGS.instagramHandle,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveStoreSettings = async (
  settings: Partial<StoreSettings>
): Promise<StoreSettings> => {
  const current = getStoreSettings();
  const updated: StoreSettings = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  window.dispatchEvent(new Event('store_settings_updated'));

  // If Supabase is configured, sync to PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('store_settings').upsert({
        id: 'default',
        store_name: updated.storeName,
        whatsapp_number: updated.whatsappNumber,
        instagram_handle: updated.instagramHandle,
        opening_hours: updated.openingHours,
        address: updated.address,
        delivery_fee: updated.deliveryFee,
        is_delivery_available: updated.isDeliveryAvailable,
        is_pickup_available: updated.isPickupAvailable,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Falha ao persistir configurações no Supabase:', err);
    }
  }

  return updated;
};

export const syncStoreSettingsFromSupabase = async (): Promise<StoreSettings> => {
  if (!isSupabaseConfigured()) return getStoreSettings();

  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error || !data) return getStoreSettings();

    const remoteSettings: StoreSettings = {
      storeName: data.store_name || 'SABOR NO POTE',
      whatsappNumber: data.whatsapp_number,
      instagramHandle: data.instagram_handle || '@sabornopoteoficialdf',
      openingHours: data.opening_hours,
      address: data.address,
      deliveryFee:
        typeof data.delivery_fee === 'number'
          ? data.delivery_fee
          : data.delivery_fee !== null && data.delivery_fee !== undefined
          ? Number(data.delivery_fee)
          : 0.0,
      isDeliveryAvailable: data.is_delivery_available ?? false,
      isPickupAvailable: data.is_pickup_available ?? true,
    };

    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(remoteSettings));
    window.dispatchEvent(new Event('store_settings_updated'));
    return remoteSettings;
  } catch {
    return getStoreSettings();
  }
};

// ==========================================
// 2. CATEGORIES
// ==========================================

export const getCategories = (): Category[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveCategory = async (category: Category): Promise<Category[]> => {
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

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('categories').upsert({
        id: category.id.startsWith('cat-') ? undefined : category.id,
        name: category.name,
        description: category.description || null,
        display_order: category.displayOrder,
        active: category.active,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Falha ao persistir categoria no Supabase:', err);
    }
  }

  return updated;
};

export const deleteCategory = async (categoryId: string): Promise<Category[]> => {
  const categories = getCategories().filter((c) => c.id !== categoryId);
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  window.dispatchEvent(new Event('store_data_updated'));

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('categories').delete().eq('id', categoryId);
    } catch (err) {
      console.warn('Falha ao excluir categoria no Supabase:', err);
    }
  }

  return categories;
};

// ==========================================
// 3. PRODUCTS & VARIATIONS
// ==========================================

export const getProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveProduct = async (product: Product): Promise<Product[]> => {
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

  if (isSupabaseConfigured()) {
    try {
      const isCustomUuid = !product.id.startsWith('prod-');
      const { data: insertedProduct, error: prodErr } = await supabase
        .from('products')
        .upsert({
          ...(isCustomUuid ? { id: product.id } : {}),
          category_id: product.categoryId.startsWith('cat-') ? null : product.categoryId,
          name: product.name,
          description: product.description,
          base_price: product.basePrice,
          image_url: product.imageUrl || null,
          available: product.available,
          tags: product.tags || [],
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!prodErr && insertedProduct && product.sizes && product.sizes.length > 0) {
        // Upsert variations
        await supabase.from('product_variations').delete().eq('product_id', insertedProduct.id);
        const variationsPayload = product.sizes.map((s) => ({
          product_id: insertedProduct.id,
          name: s.name,
          price: s.price,
          description: s.description || null,
        }));
        await supabase.from('product_variations').insert(variationsPayload);
      }

      if (!prodErr && insertedProduct && product.extras && product.extras.length > 0) {
        // Upsert extras
        await supabase.from('product_extras').delete().eq('product_id', insertedProduct.id);
        const extrasPayload = product.extras.map((e) => ({
          product_id: insertedProduct.id,
          name: e.name,
          price: e.price,
          available: e.available,
          max_quantity: e.maxQuantity || 5,
        }));
        await supabase.from('product_extras').insert(extrasPayload);
      }

      if (!prodErr && insertedProduct && product.flavors && product.flavors.length > 0) {
        // Upsert flavors
        await supabase.from('product_flavors').delete().eq('product_id', insertedProduct.id);
        const flavorsPayload = product.flavors.map((f) => ({
          product_id: insertedProduct.id,
          name: f.name,
          available: f.available,
        }));
        await supabase.from('product_flavors').insert(flavorsPayload);
      }
    } catch (err) {
      console.warn('Falha ao persistir produto no Supabase:', err);
    }
  }

  return updated;
};

export const deleteProduct = async (productId: string): Promise<Product[]> => {
  const products = getProducts().filter((p) => p.id !== productId);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  window.dispatchEvent(new Event('store_data_updated'));

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('products').delete().eq('id', productId);
    } catch (err) {
      console.warn('Falha ao excluir produto no Supabase:', err);
    }
  }

  return products;
};

export const resetCatalogToEmpty = (): void => {
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
  localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
  window.dispatchEvent(new Event('store_data_updated'));
};

// Sync whole catalog from Supabase PostgreSQL
export const syncCatalogFromSupabase = async (): Promise<{
  categories: Category[];
  products: Product[];
}> => {
  if (!isSupabaseConfigured()) {
    return { categories: getCategories(), products: getProducts() };
  }

  try {
    // 1. Fetch categories
    const { data: catData, error: catErr } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    let categories: Category[] = getCategories();
    if (!catErr && catData && catData.length > 0) {
      categories = catData.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description || undefined,
        displayOrder: c.display_order,
        active: c.active,
      }));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    }

    // 2. Fetch products with variations, flavors and extras
    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .select('*, product_variations(*), product_flavors(*), product_extras(*)')
      .order('name', { ascending: true });

    let products: Product[] = getProducts();
    if (!prodErr && prodData && prodData.length > 0) {
      products = prodData.map((p) => {
        const sizes: ProductVariation[] = (p.product_variations || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          price: Number(v.price),
          description: v.description || undefined,
        }));

        const flavors: ProductFlavor[] = (p.product_flavors || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          available: f.available,
        }));

        const extras: ProductExtra[] = (p.product_extras || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          price: Number(e.price),
          available: e.available,
          maxQuantity: e.max_quantity,
        }));

        return {
          id: p.id,
          categoryId: p.category_id || '',
          name: p.name,
          description: p.description,
          basePrice: Number(p.base_price),
          imageUrl: p.image_url || undefined,
          available: p.available,
          tags: p.tags || [],
          sizes,
          flavors,
          extras,
        };
      });
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }

    window.dispatchEvent(new Event('store_data_updated'));
    return { categories, products };
  } catch (err) {
    console.warn('Erro ao sincronizar catálogo do Supabase:', err);
    return { categories: getCategories(), products: getProducts() };
  }
};

// ==========================================
// 4. ORDERS & CHECKOUT INTEGRATION
// ==========================================

export const getOrders = (): OrderRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveOrder = async (
  checkout: OrderCheckout,
  items: CartItem[],
  subtotal: number,
  deliveryFee: number,
  totalPrice: number
): Promise<{ success: boolean; orderId: string }> => {
  const localOrderId = `ped-${Date.now()}`;
  const now = new Date().toISOString();

  const formattedItems = items.map((i) => ({
    productName: i.productName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    totalPrice: i.totalPrice,
    configuration: {
      size: i.selectedSize?.name,
      flavor: i.selectedFlavor?.name,
      extras: i.selectedExtras?.map((e) => `${e.extra.name} (${e.quantity}x)`),
      notes: i.notes,
    },
  }));

  const orderRecord: OrderRecord = {
    id: localOrderId,
    customerName: checkout.customer.name,
    customerPhone: checkout.customer.phone,
    deliveryType: checkout.deliveryType,
    addressData: checkout.address || null,
    paymentMethod: checkout.paymentMethod,
    needsCashChange: checkout.needsCashChange,
    cashChangeFor: checkout.cashChangeFor ? parseFloat(checkout.cashChangeFor) : null,
    subtotal,
    deliveryFee,
    totalPrice,
    status: 'pending',
    orderNotes: checkout.orderNotes || null,
    createdAt: now,
    updatedAt: now,
    items: formattedItems,
  };

  // 1. Cache locally
  const currentOrders = getOrders();
  const updatedOrders = [orderRecord, ...currentOrders];
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
  window.dispatchEvent(new Event('orders_updated'));

  // 2. Persistir no Supabase via RPC segura com validação e cálculo no servidor
  if (isSupabaseConfigured()) {
    try {
      const itemsPayload = items.map((i) => ({
        product_id: i.productId.startsWith('prod-') ? null : i.productId,
        product_name: i.productName,
        size_name: i.selectedSize?.name || null,
        flavor_name: i.selectedFlavor?.name || null,
        extras: (i.selectedExtras || []).map((e) => ({
          name: e.extra.name,
          quantity: e.quantity,
        })),
        quantity: i.quantity,
        notes: i.notes || null,
      }));

      // Obter ou gerar token único de cliente no localStorage para proteção contra spam/abuso
      let clientToken = localStorage.getItem('sabor_no_pote_client_token');
      if (!clientToken) {
        clientToken = 'cli_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('sabor_no_pote_client_token', clientToken);
      }

      const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_order', {
        p_customer_name: checkout.customer.name,
        p_customer_phone: checkout.customer.phone,
        p_delivery_type: checkout.deliveryType,
        p_address_data: checkout.deliveryType === 'delivery' ? (checkout.address || null) : null,
        p_payment_method: checkout.paymentMethod,
        p_needs_cash_change: checkout.needsCashChange || false,
        p_cash_change_for: checkout.cashChangeFor ? parseFloat(checkout.cashChangeFor) : null,
        p_order_notes: checkout.orderNotes || null,
        p_items: itemsPayload,
        p_client_token: clientToken,
      });

      if (!rpcErr && rpcData && rpcData.order_id) {
        orderRecord.id = rpcData.order_id;
        if (typeof rpcData.subtotal === 'number') orderRecord.subtotal = rpcData.subtotal;
        if (typeof rpcData.delivery_fee === 'number') orderRecord.deliveryFee = rpcData.delivery_fee;
        if (typeof rpcData.total_price === 'number') orderRecord.totalPrice = rpcData.total_price;
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([orderRecord, ...currentOrders]));
        return { success: true, orderId: rpcData.order_id };
      }

      if (rpcErr) {
        console.warn('Aviso ao submeter pedido via RPC do Supabase:', rpcErr.message || rpcErr);
      }
    } catch (err) {
      console.warn('Erro ao processar pedido no Supabase:', err);
    }
  }

  return { success: true, orderId: localOrderId };
};

export const fetchOrdersFromSupabase = async (): Promise<OrderRecord[]> => {
  if (!isSupabaseConfigured()) {
    return getOrders();
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return getOrders();
    }

    const orders: OrderRecord[] = data.map((o) => ({
      id: o.id,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      deliveryType: o.delivery_type,
      addressData: o.address_data,
      paymentMethod: o.payment_method,
      needsCashChange: o.needs_cash_change,
      cashChangeFor: o.cash_change_for,
      subtotal: Number(o.subtotal),
      deliveryFee: Number(o.delivery_fee),
      totalPrice: Number(o.total_price),
      status: o.status as OrderStatus,
      orderNotes: o.order_notes,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      items: (o.order_items || []).map((item: any) => ({
        id: item.id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price),
        configuration: item.configuration,
      })),
    }));

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new Event('orders_updated'));
    return orders;
  } catch (err) {
    console.warn('Erro ao carregar pedidos do Supabase:', err);
    return getOrders();
  }
};

export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus
): Promise<OrderRecord[]> => {
  const orders = getOrders();
  const updated = orders.map((o) =>
    o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o
  );
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));
  window.dispatchEvent(new Event('orders_updated'));

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
    } catch (err) {
      console.warn('Erro ao atualizar status do pedido no Supabase:', err);
    }
  }

  return updated;
};

// ==========================================
// 5. SAMPLE TEST DATA (DEMO)
// ==========================================
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
      description:
        'Camadas generosas de bolo fofinho umedecido, recheio aveludado de Leite Ninho e pura Nutella original.',
      basePrice: 16.0,
      available: true,
      sizes: [
        { id: 'sz-250', name: 'Pote 250ml (Individual)', price: 0 },
        { id: 'sz-350', name: 'Pote 350ml (Médio)', price: 4.0 },
        { id: 'sz-500', name: 'Pote 500ml (Gourmet)', price: 9.0 },
      ],
      flavors: [
        { id: 'fl-tradicional', name: 'Receita Tradicional', available: true },
        { id: 'fl-extra-cacau', name: 'Massa Cacau 50%', available: true },
      ],
      extras: [
        { id: 'ex-morango', name: 'Morangos frescos picados', price: 3.5, available: true, maxQuantity: 2 },
        { id: 'ex-kinder', name: 'Pedaços de Kinder Bueno', price: 4.5, available: true, maxQuantity: 2 },
        { id: 'ex-calda', name: 'Calda extra de Nutella', price: 3.0, available: true, maxQuantity: 1 },
      ],
      tags: ['Mais Vendido', 'Artesanal'],
    },
    {
      id: 'prod-banoffee',
      categoryId: 'cat-tortas',
      name: 'Banoffee no Pote Especial',
      description:
        'Farofinha crocante de biscoito amanteigado, doce de leite artesanal argentino, bananas frescas e chantilly suave.',
      basePrice: 18.0,
      available: true,
      sizes: [
        { id: 'sz-b250', name: 'Pote 250ml', price: 0 },
        { id: 'sz-b350', name: 'Pote 350ml', price: 5.0 },
      ],
      extras: [
        { id: 'ex-canela', name: 'Toque extra de canela e raspas de chocolate', price: 2.0, available: true },
      ],
    },
    {
      id: 'prod-escondidinho',
      categoryId: 'cat-salgados',
      name: 'Escondidinho de Carne Seca no Pote',
      description:
        'Purê cremoso de mandioca temperado na manteiga de garrafa com recheio desfiado de carne seca e queijo coalho gratinado.',
      basePrice: 22.0,
      available: true,
      sizes: [
        { id: 'sz-salg-300', name: 'Pote 300ml', price: 0 },
        { id: 'sz-salg-500', name: 'Pote 500ml', price: 8.0 },
      ],
      extras: [
        { id: 'ex-bacon', name: 'Crispy de bacon artesanal', price: 3.5, available: true },
        { id: 'ex-queijo', name: 'Queijo coalho em dobro', price: 4.0, available: true },
      ],
    },
  ];

  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(demoCategories));
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(demoProducts));
  window.dispatchEvent(new Event('store_data_updated'));
};
