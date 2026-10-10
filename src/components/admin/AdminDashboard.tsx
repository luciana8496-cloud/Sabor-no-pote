import React, { useState, useEffect } from 'react';
import { Logo } from '../brand/Logo';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Settings,
  Database,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  DollarSign,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Search,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Copy,
  Check,
  Tag,
  Truck,
  Store,
  Eye,
  EyeOff,
  Flame,
} from 'lucide-react';
import {
  getProducts,
  saveProduct,
  deleteProduct,
  getCategories,
  saveCategory,
  deleteCategory,
  getStoreSettings,
  saveStoreSettings,
  getOrders,
  updateOrderStatus,
  fetchOrdersFromSupabase,
  syncCatalogFromSupabase,
  loadSampleProductsForDemo,
  resetCatalogToEmpty,
} from '../../services/storeService';
import {
  Product,
  Category,
  StoreSettings as StoreSettingsType,
  OrderRecord,
  OrderStatus,
  ProductVariation,
  ProductExtra,
  ProductFlavor,
} from '../../types/store';
import { runFullSupabaseDiagnostics, FullDiagnosticReport } from '../../lib/supabase';

type AdminTab = 'overview' | 'orders' | 'menu' | 'settings' | 'supabase';

interface AdminDashboardProps {
  onBackToPublic: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToPublic }) => {
  const { adminProfile, user, signOut, isConfigured } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Store data state
  const [settings, setSettings] = useState<StoreSettingsType>(() => getStoreSettings());
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [categories, setCategories] = useState<Category[]>(() => getCategories());
  const [orders, setOrders] = useState<OrderRecord[]>(() => getOrders());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Orders Tab filter & search
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');

  // Diagnostics state
  const [diagnosticsReport, setDiagnosticsReport] = useState<FullDiagnosticReport | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState<boolean>(false);
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<StoreSettingsType>(() => getStoreSettings());
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState<boolean>(false);

  // Menu management modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<{
    name: string;
    categoryId: string;
    description: string;
    basePrice: string;
    imageUrl: string;
    available: boolean;
    tags: string;
    sizes: ProductVariation[];
    extras: ProductExtra[];
    flavors: ProductFlavor[];
  }>({
    name: '',
    categoryId: '',
    description: '',
    basePrice: '',
    imageUrl: '',
    available: true,
    tags: '',
    sizes: [],
    extras: [],
    flavors: [],
  });

  // Category management modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Initial load & data reload listener
  const reloadData = async () => {
    setIsRefreshing(true);
    try {
      setSettings(getStoreSettings());
      setSettingsForm(getStoreSettings());
      setCategories(getCategories());
      setProducts(getProducts());
      setOrders(getOrders());

      // If Supabase configured, attempt remote pull
      if (isConfigured) {
        await Promise.allSettled([
          syncCatalogFromSupabase().then((res) => {
            setCategories(res.categories);
            setProducts(res.products);
          }),
          fetchOrdersFromSupabase().then((res) => {
            setOrders(res);
          }),
        ]);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    reloadData();
    runDiagnostics();

    const handleDataUpdate = () => {
      setProducts(getProducts());
      setCategories(getCategories());
    };
    const handleSettingsUpdate = () => {
      setSettings(getStoreSettings());
      setSettingsForm(getStoreSettings());
    };
    const handleOrdersUpdate = () => {
      setOrders(getOrders());
    };

    window.addEventListener('store_data_updated', handleDataUpdate);
    window.addEventListener('store_settings_updated', handleSettingsUpdate);
    window.addEventListener('orders_updated', handleOrdersUpdate);

    return () => {
      window.removeEventListener('store_data_updated', handleDataUpdate);
      window.removeEventListener('store_settings_updated', handleSettingsUpdate);
      window.removeEventListener('orders_updated', handleOrdersUpdate);
    };
  }, [isConfigured]);

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const report = await runFullSupabaseDiagnostics();
      setDiagnosticsReport(report);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  // Metrics calculation
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  const averageTicket =
    orders.length > 0 ? totalRevenue / (orders.filter((o) => o.status !== 'cancelled').length || 1) : 0;

  // Status badge styling helper
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendente', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'confirmed':
        return { label: 'Confirmado', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'preparing':
        return { label: 'Em Preparo', bg: 'bg-orange-100 text-orange-800 border-orange-300' };
      case 'ready':
        return { label: 'Pronto', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'delivered':
        return { label: 'Entregue', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'cancelled':
        return { label: 'Cancelado', bg: 'bg-neutral-100 text-neutral-600 border-neutral-300' };
      default:
        return { label: status, bg: 'bg-neutral-100 text-neutral-700 border-neutral-200' };
    }
  };

  // Status change handler
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    await updateOrderStatus(orderId, newStatus);
    setOrders(getOrders());
  };

  // Open WhatsApp with customer
  const handleOpenCustomerWhatsApp = (order: OrderRecord) => {
    const cleanPhone = order.customerPhone.replace(/\D/g, '');
    if (!cleanPhone) return;

    let messageText = `Olá, ${order.customerName}! Aqui é do *Sabor no Pote* sobre seu pedido (#${order.id.slice(-6).toUpperCase()}).\n`;
    if (order.status === 'confirmed') {
      messageText += `Seu pedido foi confirmado e logo entrará em preparo!`;
    } else if (order.status === 'preparing') {
      messageText += `Seu pedido já está sendo preparado com muito carinho!`;
    } else if (order.status === 'ready') {
      messageText += order.deliveryType === 'delivery'
        ? `Seu pedido está pronto e saiu para entrega!`
        : `Seu pedido já está prontinho para retirada no local!`;
    } else {
      messageText += `Estamos atualizando seu pedido. Qualquer dúvida, estamos à disposição!`;
    }

    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveStoreSettings(settingsForm);
    setSettingsSavedSuccess(true);
    setTimeout(() => setSettingsSavedSuccess(false), 3000);
  };

  // Open product modal for new or editing
  const handleOpenProductModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setProductForm({
        name: prod.name,
        categoryId: prod.categoryId,
        description: prod.description,
        basePrice: prod.basePrice.toString(),
        imageUrl: prod.imageUrl || '',
        available: prod.available,
        tags: prod.tags?.join(', ') || '',
        sizes: prod.sizes ? [...prod.sizes] : [],
        extras: prod.extras ? [...prod.extras] : [],
        flavors: prod.flavors ? [...prod.flavors] : [],
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        categoryId: categories.length > 0 ? categories[0].id : '',
        description: '',
        basePrice: '',
        imageUrl: '',
        available: true,
        tags: 'Artesanal, Mais Vendido',
        sizes: [
          { id: `sz-${Date.now()}-1`, name: 'Pote 250ml (Individual)', price: 0 },
          { id: `sz-${Date.now()}-2`, name: 'Pote 350ml (Médio)', price: 4.0 },
        ],
        extras: [
          { id: `ex-${Date.now()}-1`, name: 'Calda Extra de Chocolate', price: 3.0, available: true, maxQuantity: 2 },
        ],
        flavors: [],
      });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.basePrice) return;

    const basePriceNum = parseFloat(productForm.basePrice.replace(',', '.'));
    if (isNaN(basePriceNum)) return;

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      categoryId: productForm.categoryId || (categories[0]?.id ?? ''),
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      basePrice: basePriceNum,
      imageUrl: productForm.imageUrl.trim() || undefined,
      available: productForm.available,
      tags: productForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      sizes: productForm.sizes,
      extras: productForm.extras,
      flavors: productForm.flavors,
    };

    await saveProduct(newProd);
    setProducts(getProducts());
    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto do cardápio?')) {
      await deleteProduct(id);
      setProducts(getProducts());
    }
  };

  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      description: newCategoryDesc.trim() || undefined,
      displayOrder: categories.length + 1,
      active: true,
    };

    await saveCategory(newCat);
    setCategories(getCategories());
    setNewCategoryName('');
    setNewCategoryDesc('');
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Deseja excluir esta categoria?')) {
      await deleteCategory(id);
      setCategories(getCategories());
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const matchesSearch =
      orderSearch === '' ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerPhone.includes(orderSearch) ||
      o.id.toLowerCase().includes(orderSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#171717] flex flex-col font-sans select-none">
      {/* ============================================================== */}
      {/* TOP BAR / ADMIN HEADER */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#EAE3D2] px-4 sm:px-6 lg:px-8 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Area Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToPublic}
              className="p-2 -ml-2 rounded-xl text-neutral-500 hover:text-[#171717] hover:bg-neutral-100 transition-colors"
              title="Voltar ao Site Público"
            >
              <ArrowLeft className="w-5 h-5 text-[#FF981B]" />
            </button>
            <div className="flex items-center gap-2.5">
              <Logo variant="icon" size="sm" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-extrabold tracking-tight text-[#171717] font-display">
                    Sabor no Pote
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFF2D6] text-[#D97706] border border-[#FFBF32]/40">
                    Administração
                  </span>
                </div>
                <p className="text-[11px] text-[#777777] hidden sm:block">
                  Central de Gestão e Controle Operacional
                </p>
              </div>
            </div>
          </div>

          {/* User info & Backend Status badge */}
          <div className="flex items-center gap-3">
            {/* Supabase Status Pill */}
            <div
              onClick={() => setActiveTab('supabase')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                isConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isConfigured ? 'Supabase Conectado' : 'Supabase em Configuração'}</span>
            </div>

            {/* Admin Profile */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-[#171717]">
                {adminProfile?.name || 'Proprietária'}
              </span>
              <span className="text-[10px] text-neutral-500">{user?.email || 'admin@sabornopote'}</span>
            </div>

            {/* Logout Button */}
            <button
              onClick={async () => {
                await signOut();
                onBackToPublic();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
              title="Encerrar Sessão Segura"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* NAVIGATION TABS */}
      {/* ============================================================== */}
      <nav className="bg-white border-b border-[#F0EBE1] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-4 overflow-x-auto py-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#171717] text-white shadow-xs'
                : 'text-neutral-600 hover:text-[#171717] hover:bg-neutral-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative ${
              activeTab === 'orders'
                ? 'bg-[#171717] text-white shadow-xs'
                : 'text-neutral-600 hover:text-[#171717] hover:bg-neutral-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Gestão de Pedidos</span>
            {pendingOrdersCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#FF981B] text-white rounded-full text-[10px] font-bold">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'menu'
                ? 'bg-[#171717] text-white shadow-xs'
                : 'text-neutral-600 hover:text-[#171717] hover:bg-neutral-100'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Cardápio & Produtos</span>
            <span className="text-[10px] opacity-75 font-normal">({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-[#171717] text-white shadow-xs'
                : 'text-neutral-600 hover:text-[#171717] hover:bg-neutral-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações da Loja</span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'supabase'
                ? 'bg-[#171717] text-white shadow-xs'
                : 'text-neutral-600 hover:text-[#171717] hover:bg-neutral-100'
            }`}
          >
            <Database className="w-4 h-4 text-[#FF981B]" />
            <span>Diagnóstico Supabase (RLS)</span>
          </button>
        </div>
      </nav>

      {/* ============================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* ========================================================== */}
        {/* TAB 1: VISÃO GERAL (OVERVIEW) */}
        {/* ========================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-[#EAE3D2] shadow-xs">
                <div className="flex items-center justify-between text-neutral-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Faturamento Total</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    R$
                  </div>
                </div>
                <div className="text-2xl font-black text-[#171717] font-display">
                  R$ {totalRevenue.toFixed(2).replace('.', ',')}
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Soma de pedidos não cancelados</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#EAE3D2] shadow-xs">
                <div className="flex items-center justify-between text-neutral-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Total de Pedidos</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#171717] font-display">
                  {orders.length}
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Registrados no sistema</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#EAE3D2] shadow-xs">
                <div className="flex items-center justify-between text-neutral-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Pedidos Pendentes</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    !
                  </div>
                </div>
                <div className="text-2xl font-black text-[#FF981B] font-display">
                  {pendingOrdersCount}
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Aguardando confirmação</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#EAE3D2] shadow-xs">
                <div className="flex items-center justify-between text-neutral-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#171717] font-display">
                  R$ {averageTicket.toFixed(2).replace('.', ',')}
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Média por pedido</p>
              </div>
            </div>

            {/* Quick Status Banners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WhatsApp & Channel status */}
              <div className="p-5 rounded-2xl bg-white border border-[#EAE3D2] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717] flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#FF981B]" />
                    <span>Canal de Atendimento WhatsApp</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="text-xs text-[#FF981B] font-bold hover:underline"
                  >
                    Editar
                  </button>
                </div>
                {settings.whatsappNumber ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-900 block">Número Ativo</span>
                      <span className="text-emerald-700">{settings.whatsappNumber}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                      Pronto para receber pedidos
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-900 block">Número Não Configurado</span>
                      <span className="text-amber-700">Configure para liberar o envio direto pelo WhatsApp.</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="px-3 py-1 rounded-full bg-[#FFBF32] text-[#171717] font-bold text-[11px]"
                    >
                      Configurar
                    </button>
                  </div>
                )}
              </div>

              {/* Delivery & Fulfillment mode */}
              <div className="p-5 rounded-2xl bg-white border border-[#EAE3D2] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717] flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#FF981B]" />
                    <span>Modalidades de Entrega & Retirada</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="text-xs text-[#FF981B] font-bold hover:underline"
                  >
                    Gerenciar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2]">
                    <span className="text-neutral-500 block text-[11px]">Entrega (Delivery)</span>
                    <span className="font-bold text-[#171717]">
                      {settings.isDeliveryAvailable ? `Ativo (R$ ${settings.deliveryFee.toFixed(2).replace('.', ',')})` : 'Pausado'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2]">
                    <span className="text-neutral-500 block text-[11px]">Retirada no Local</span>
                    <span className="font-bold text-[#171717]">
                      {settings.isPickupAvailable ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders Preview */}
            <div className="p-6 rounded-2xl bg-white border border-[#EAE3D2] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#171717] font-display">
                    Últimos Pedidos Recebidos
                  </h3>
                  <p className="text-xs text-neutral-500">Histórico recente de pedidos dos clientes</p>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#FF981B] hover:underline"
                >
                  <span>Ver todos ({orders.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 text-center bg-[#FFFCF7] rounded-xl border border-dashed border-[#EAE3D2]">
                  <ShoppingBag className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-neutral-600">Nenhum pedido recebido ainda.</p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Os pedidos finalizados no site público aparecerão aqui em tempo real.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#F0EBE1] overflow-x-auto">
                  {orders.slice(0, 5).map((order) => {
                    const badge = getStatusBadge(order.status);
                    return (
                      <div
                        key={order.id}
                        className="py-3.5 flex items-center justify-between gap-4 text-xs hover:bg-[#FFFCF7] px-2 rounded-lg transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#171717]">{order.customerName}</span>
                            <span className="text-neutral-400 text-[11px]">
                              • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-neutral-500 text-[11px] mt-0.5">
                            {order.deliveryType === 'delivery' ? 'Entrega em domicílio' : 'Retirada no local'} • {order.items?.length || 0} item(ns)
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#171717]">
                            R$ {order.totalPrice.toFixed(2).replace('.', ',')}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: GESTÃO DE PEDIDOS (ORDERS) */}
        {/* ========================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#171717] font-display">
                  Gestão Operacional de Pedidos
                </h2>
                <p className="text-xs text-neutral-500">
                  Acompanhe e altere o status de cada pedido em tempo real
                </p>
              </div>

              <button
                onClick={reloadData}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#171717] bg-white border border-[#EAE3D2] hover:bg-neutral-50 transition-colors shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Atualizar Pedidos</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 rounded-2xl bg-white border border-[#EAE3D2] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Search */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, telefone..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B]"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'pending', label: 'Pendentes' },
                  { id: 'confirmed', label: 'Confirmados' },
                  { id: 'preparing', label: 'Em Preparo' },
                  { id: 'ready', label: 'Prontos' },
                  { id: 'delivered', label: 'Entregues' },
                  { id: 'cancelled', label: 'Cancelados' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setOrderStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      orderStatusFilter === tab.id
                        ? 'bg-[#171717] text-white'
                        : 'bg-[#FFFCF7] text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-[#EAE3D2] shadow-xs space-y-2">
                <ShoppingBag className="w-10 h-10 text-neutral-300 mx-auto" />
                <h3 className="text-sm font-bold text-[#171717]">Nenhum pedido encontrado</h3>
                <p className="text-xs text-neutral-500">
                  {orderSearch || orderStatusFilter !== 'all'
                    ? 'Tente ajustar os filtros ou o termo de busca.'
                    : 'Aguardando os primeiros pedidos dos clientes no site.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-[#EAE3D2] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
                    >
                      {/* Top Header of Card */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EBE1]">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-[#171717] block">
                              Pedido #{order.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              {new Date(order.createdAt).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Customer Direct WhatsApp Contact */}
                        <button
                          onClick={() => handleOpenCustomerWhatsApp(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp do Cliente</span>
                        </button>
                      </div>

                      {/* Customer Details & Fulfillment */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        {/* Customer */}
                        <div className="p-3.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2]">
                          <span className="font-bold text-neutral-400 uppercase text-[10px] block mb-1">
                            Cliente
                          </span>
                          <p className="font-bold text-[#171717] text-sm">{order.customerName}</p>
                          <p className="text-neutral-600 mt-0.5">{order.customerPhone}</p>
                        </div>

                        {/* Fulfillment & Address */}
                        <div className="p-3.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2]">
                          <span className="font-bold text-neutral-400 uppercase text-[10px] block mb-1">
                            Recebimento
                          </span>
                          <p className="font-bold text-[#171717]">
                            {order.deliveryType === 'delivery' ? 'Entrega em Domicílio' : 'Retirada no Local'}
                          </p>
                          {order.deliveryType === 'delivery' && order.addressData ? (
                            <p className="text-neutral-600 text-[11px] mt-0.5 leading-relaxed">
                              {order.addressData.street}, {order.addressData.number}
                              {order.addressData.complement ? ` (${order.addressData.complement})` : ''} - {order.addressData.neighborhood}
                              {order.addressData.cep ? ` • CEP: ${order.addressData.cep}` : ''}
                            </p>
                          ) : (
                            <p className="text-neutral-500 text-[11px] mt-0.5">
                              Retirada direta no estabelecimento
                            </p>
                          )}
                        </div>

                        {/* Payment & Total */}
                        <div className="p-3.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2]">
                          <span className="font-bold text-neutral-400 uppercase text-[10px] block mb-1">
                            Pagamento & Total
                          </span>
                          <p className="font-bold text-[#171717]">
                            {order.paymentMethod === 'pix' && 'PIX'}
                            {order.paymentMethod === 'money' &&
                              (order.needsCashChange && order.cashChangeFor
                                ? `Dinheiro (Troco para R$ ${order.cashChangeFor.toFixed(2)})`
                                : 'Dinheiro (Sem troco)')}
                            {order.paymentMethod === 'debit' && 'Cartão de Débito'}
                            {order.paymentMethod === 'credit' && 'Cartão de Crédito'}
                          </p>
                          <p className="text-base font-black text-[#171717] font-display mt-0.5">
                            Total: R$ {order.totalPrice.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      </div>

                      {/* Items Ordered */}
                      {order.items && order.items.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] space-y-2">
                          <span className="font-bold text-neutral-400 uppercase text-[10px] block">
                            Itens do Pedido ({order.items.length})
                          </span>
                          <div className="divide-y divide-[#EAE3D2] text-xs">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="py-2 flex items-start justify-between gap-4">
                                <div>
                                  <span className="font-bold text-[#171717]">
                                    {item.quantity}x {item.productName}
                                  </span>
                                  {item.configuration && (
                                    <div className="text-[11px] text-neutral-500 space-y-0.5 mt-0.5">
                                      {item.configuration.size && <div>• Tamanho: {item.configuration.size}</div>}
                                      {item.configuration.flavor && <div>• Sabor: {item.configuration.flavor}</div>}
                                      {item.configuration.extras && item.configuration.extras.length > 0 && (
                                        <div>• Extras: {item.configuration.extras.join(', ')}</div>
                                      )}
                                      {item.configuration.notes && (
                                        <div className="text-neutral-600 italic">
                                          • Obs: "{item.configuration.notes}"
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <span className="font-bold text-[#171717] whitespace-nowrap">
                                  R$ {item.totalPrice.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes if any */}
                      {order.orderNotes && (
                        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900">
                          <span className="font-bold block">Observações do Cliente:</span>
                          <p className="mt-0.5">{order.orderNotes}</p>
                        </div>
                      )}

                      {/* Action Status Buttons */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-neutral-500 mr-2">Alterar Status:</span>

                        <button
                          onClick={() => handleStatusChange(order.id, 'confirmed')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            order.status === 'confirmed'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          Confirmar
                        </button>

                        <button
                          onClick={() => handleStatusChange(order.id, 'preparing')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            order.status === 'preparing'
                              ? 'bg-orange-600 text-white shadow-xs'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          Em Preparo
                        </button>

                        <button
                          onClick={() => handleStatusChange(order.id, 'ready')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            order.status === 'ready'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          Pronto
                        </button>

                        <button
                          onClick={() => handleStatusChange(order.id, 'delivered')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            order.status === 'delivered'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          Entregue
                        </button>

                        <button
                          onClick={() => handleStatusChange(order.id, 'cancelled')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            order.status === 'cancelled'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: GESTÃO DO CARDÁPIO & PRODUTOS (MENU) */}
        {/* ========================================================== */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#171717] font-display">
                  Gestão do Cardápio Digital
                </h2>
                <p className="text-xs text-neutral-500">
                  Cadastre produtos reais, defina tamanhos, sabores, adicionais e controle a disponibilidade
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#171717] bg-white border border-[#EAE3D2] hover:bg-neutral-50 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Categoria</span>
                </button>

                <button
                  onClick={() => handleOpenProductModal()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#171717] bg-[#FFBF32] hover:bg-[#FFD447] transition-all shadow-md shadow-[#FFBF32]/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Produto</span>
                </button>
              </div>
            </div>

            {/* Categories Pills */}
            <div className="p-4 rounded-2xl bg-white border border-[#EAE3D2] shadow-xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
                Categorias Ativas ({categories.length})
              </span>
              {categories.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">
                  Nenhuma categoria cadastrada. Crie categorias para organizar seus potes gourmet.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFFCF7] border border-[#EAE3D2] text-xs font-medium text-[#171717]"
                    >
                      <span>{c.name}</span>
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="text-neutral-400 hover:text-red-500 transition-colors text-xs"
                        title="Excluir categoria"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Products Grid */}
            {products.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EAE3D2] shadow-xs space-y-4">
                <UtensilsCrossed className="w-12 h-12 text-[#FFBF32] mx-auto opacity-70" />
                <div>
                  <h3 className="text-base font-bold text-[#171717] font-display">
                    Cardápio Aguardando Produtos Reais
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
                    Conforme os requisitos da marca, o cardápio público inicia vazio. Clique no botão abaixo para cadastrar os produtos oficiais do Sabor no Pote.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => handleOpenProductModal()}
                    className="px-5 py-2.5 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
                  >
                    + Cadastrar Primeiro Produto
                  </button>
                  <button
                    onClick={() => {
                      loadSampleProductsForDemo();
                      reloadData();
                    }}
                    className="px-4 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition-colors"
                  >
                    Carregar Exemplos de Demonstração
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((prod) => {
                  const cat = categories.find((c) => c.id === prod.categoryId);
                  return (
                    <div
                      key={prod.id}
                      className="bg-white border border-[#EAE3D2] rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-[#FFBF32]/60 transition-all space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            {cat && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF981B] block mb-0.5">
                                {cat.name}
                              </span>
                            )}
                            <h3 className="text-sm font-bold text-[#171717] font-display">
                              {prod.name}
                            </h3>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              prod.available
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-neutral-100 text-neutral-500'
                            }`}
                          >
                            {prod.available ? 'Disponível' : 'Pausado'}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                          {prod.description}
                        </p>

                        <div className="text-base font-black text-[#171717] font-display">
                          R$ {prod.basePrice.toFixed(2).replace('.', ',')}
                        </div>

                        {/* Sizes & Extras Summary */}
                        <div className="text-[11px] text-neutral-500 space-y-1 pt-1 border-t border-[#F0EBE1]">
                          <div>
                            <span className="font-semibold text-neutral-700">Tamanhos: </span>
                            {prod.sizes && prod.sizes.length > 0
                              ? prod.sizes.map((s) => s.name).join(', ')
                              : 'Tamanho padrão'}
                          </div>
                          {prod.extras && prod.extras.length > 0 && (
                            <div>
                              <span className="font-semibold text-neutral-700">Adicionais: </span>
                              {prod.extras.map((e) => e.name).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-3 border-t border-[#F0EBE1] flex items-center justify-between">
                        <button
                          onClick={async () => {
                            await saveProduct({ ...prod, available: !prod.available });
                            setProducts(getProducts());
                          }}
                          className="text-xs font-bold text-neutral-600 hover:text-[#171717] flex items-center gap-1"
                        >
                          {prod.available ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{prod.available ? 'Pausar' : 'Ativar'}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenProductModal(prod)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-[#171717] hover:bg-neutral-100 transition-colors"
                            title="Editar produto"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir produto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Catalog Utilities */}
            <div className="pt-4 flex flex-wrap items-center justify-between text-xs text-neutral-500 gap-4 border-t border-[#EAE3D2]">
              <span>Controle total do catálogo com sincronização imediata com o site público.</span>
              <button
                onClick={() => {
                  if (confirm('Deseja limpar todo o catálogo e restaurar o estado vazio original?')) {
                    resetCatalogToEmpty();
                    reloadData();
                  }
                }}
                className="text-neutral-500 hover:text-red-600 underline cursor-pointer"
              >
                Limpar catálogo (restaurar vazio)
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: CONFIGURAÇÕES DA LOJA (SETTINGS) */}
        {/* ========================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#171717] font-display">
                Configurações Oficiais da Empresa
              </h2>
              <p className="text-xs text-neutral-500">
                Os dados configurados aqui são sincronizados no banco de dados e refletidos imediatamente no site público
              </p>
            </div>

            {settingsSavedSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Configurações salvas e sincronizadas com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="bg-white border border-[#EAE3D2] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
              {/* WhatsApp Oficial */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1.5">
                  WhatsApp Oficial para Pedidos (com DDD)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={settingsForm.whatsappNumber || ''}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })
                    }
                    placeholder="Ex: (11) 98765-4321 ou 11987654321"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-xs text-[#171717] focus:outline-none focus:border-[#FF981B]"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Os clientes enviarão a mensagem de finalização para este número.
                </p>
              </div>

              {/* Instagram */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1.5">
                  Instagram da Empresa
                </label>
                <input
                  type="text"
                  value={settingsForm.instagramHandle || ''}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, instagramHandle: e.target.value })
                  }
                  placeholder="@sabornopote.oficial"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-xs text-[#171717] focus:outline-none focus:border-[#FF981B]"
                />
              </div>

              {/* Horários */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1.5">
                  Horário de Funcionamento
                </label>
                <input
                  type="text"
                  value={settingsForm.openingHours || ''}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, openingHours: e.target.value })
                  }
                  placeholder="Ex: Terça a Domingo, das 13h às 21h"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-xs text-[#171717] focus:outline-none focus:border-[#FF981B]"
                />
              </div>

              {/* Endereço Retirada */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1.5">
                  Endereço Físico para Retirada
                </label>
                <input
                  type="text"
                  value={settingsForm.address || ''}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, address: e.target.value })
                  }
                  placeholder="Ex: Rua das Delícias, 123 - Centro"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-xs text-[#171717] focus:outline-none focus:border-[#FF981B]"
                />
              </div>

              {/* Taxa de Entrega */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1.5">
                  Taxa Padrão de Entrega (R$)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={settingsForm.deliveryFee}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      deliveryFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-xs text-[#171717] focus:outline-none focus:border-[#FF981B]"
                />
              </div>

              {/* Delivery and Pickup Toggles */}
              <div className="pt-2 border-t border-[#F0EBE1] space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.isDeliveryAvailable}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, isDeliveryAvailable: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#FF981B] focus:ring-[#FF981B]"
                  />
                  <span className="text-xs font-bold text-[#171717]">Habilitar Opção de Entrega (Delivery)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.isPickupAvailable}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, isPickupAvailable: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#FF981B] focus:ring-[#FF981B]"
                  />
                  <span className="text-xs font-bold text-[#171717]">Habilitar Opção de Retirada no Local</span>
                </label>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#FFBF32]/30 cursor-pointer"
                >
                  Salvar Configurações
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 5: DIAGNÓSTICO DO BACKEND SUPABASE (RLS) */}
        {/* ========================================================== */}
        {activeTab === 'supabase' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#171717] font-display flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#FF981B]" />
                  <span>Diagnóstico do Backend Supabase & Políticas RLS</span>
                </h2>
                <p className="text-xs text-neutral-500">
                  Verificador de conectividade, tabelas PostgreSQL e Row Level Security em tempo real
                </p>
              </div>

              <button
                onClick={runDiagnostics}
                disabled={isRunningDiagnostics}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#171717] bg-[#FFBF32] hover:bg-[#FFD447] transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
                <span>Executar Novo Teste de Diagnóstico</span>
              </button>
            </div>

            {/* Diagnostic Results Cards */}
            {diagnosticsReport && (
              <div className="p-6 rounded-3xl bg-white border border-[#EAE3D2] shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1]">
                  <div>
                    <h3 className="text-sm font-bold text-[#171717] font-display">
                      Resultado do Teste Automatizado
                    </h3>
                    <span className="text-[11px] text-neutral-400">
                      Executado em: {new Date(diagnosticsReport.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      diagnosticsReport.overallStatus === 'connected'
                        ? 'bg-emerald-100 text-emerald-800'
                        : diagnosticsReport.overallStatus === 'not_configured'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {diagnosticsReport.overallStatus === 'connected'
                      ? 'Todos os Serviços Operacionais'
                      : diagnosticsReport.overallStatus === 'not_configured'
                      ? 'Aguardando Credenciais do Supabase'
                      : 'Atenção Necessária'}
                  </span>
                </div>

                <div className="space-y-3">
                  {diagnosticsReport.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] flex items-start gap-3"
                    >
                      {item.status === 'success' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      {item.status === 'warning' && (
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      {item.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#171717]">{item.name}</span>
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              item.status === 'success'
                                ? 'text-emerald-700'
                                : item.status === 'warning'
                                ? 'text-amber-700'
                                : 'text-red-700'
                            }`}
                          >
                            {item.status === 'success' ? 'OK' : item.status === 'warning' ? 'AVISO' : 'PENDENTE'}
                          </span>
                        </div>
                        <p className="text-neutral-600 mt-0.5">{item.message}</p>
                        {item.details && (
                          <p className="text-[11px] text-neutral-400 mt-1 font-mono bg-white p-2 rounded-lg border border-[#EAE3D2]">
                            {item.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step-by-Step Setup Instructions */}
            <div className="bg-white border border-[#EAE3D2] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#FF981B]" />
                <h3 className="text-base font-bold text-[#171717] font-display">
                  Guia de Configuração Oficial do Supabase
                </h3>
              </div>

              <div className="space-y-4 text-xs text-neutral-600 leading-relaxed">
                <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#EAE3D2] space-y-2">
                  <span className="font-bold text-[#171717] block text-sm">
                    1. Executar o Script SQL das Tabelas e Políticas RLS
                  </span>
                  <p>
                    Acesse o console do seu projeto no Supabase, abra o <strong>SQL Editor</strong> e execute o script <code>supabase_setup.sql</code> completo. Ele cria automaticamente as tabelas <code>admins</code>, <code>store_settings</code>, <code>categories</code>, <code>products</code>, <code>orders</code> e define as regras restritas de Row Level Security (RLS).
                  </p>
                  <button
                    onClick={() => {
                      fetch('/supabase_setup.sql')
                        .then((res) => res.text())
                        .then((txt) => {
                          navigator.clipboard.writeText(txt);
                          setSqlCopied(true);
                          setTimeout(() => setSqlCopied(false), 2500);
                        })
                        .catch(() => {
                          setSqlCopied(true);
                          setTimeout(() => setSqlCopied(false), 2500);
                        });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFBF32] text-[#171717] font-bold text-xs hover:bg-[#FFD447] transition-colors cursor-pointer mt-2"
                  >
                    {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{sqlCopied ? 'Script SQL Copiado!' : 'Copiar Script supabase_setup.sql'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#EAE3D2] space-y-2">
                  <span className="font-bold text-[#171717] block text-sm">
                    2. Cadastrar a Proprietária no Supabase Auth
                  </span>
                  <p>
                    Para garantir que <strong>nenhum cadastro público de administradores seja permitido</strong>, a conta da proprietária deve ser criada no painel do Supabase:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 pl-1 text-neutral-700">
                    <li>Vá em <strong>Authentication &gt; Users &gt; Add User &gt; Create User</strong>.</li>
                    <li>Informe seu e-mail oficial e crie uma senha forte.</li>
                    <li>Copie o <strong>User UID</strong> gerado.</li>
                  </ol>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#EAE3D2] space-y-2">
                  <span className="font-bold text-[#171717] block text-sm">
                    3. Vincular a Proprietária na Tabela <code>public.admins</code>
                  </span>
                  <p>
                    Execute o seguinte comando no SQL Editor do Supabase substituindo o UID e seu e-mail:
                  </p>
                  <pre className="p-3 rounded-xl bg-[#171717] text-[#FFD447] font-mono text-[11px] overflow-x-auto">
{`INSERT INTO public.admins (user_id, email, name, role)
VALUES ('SEU_USER_UID_AQUI', 'contato@sabornopote.com.br', 'Proprietária Sabor no Pote', 'owner');`}
                  </pre>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#EAE3D2] space-y-2">
                  <span className="font-bold text-[#171717] block text-sm">
                    4. Configurar as Variáveis de Ambiente
                  </span>
                  <p>
                    Copie as chaves do seu projeto em <strong>Project Settings &gt; API</strong> e defina as variáveis no ambiente:
                  </p>
                  <pre className="p-3 rounded-xl bg-[#171717] text-white font-mono text-[11px] overflow-x-auto">
{`VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-anon-publica-aqui"`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: CADASTRAR / EDITAR PRODUTO */}
      {/* ============================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#EAE3D2] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1]">
              <h3 className="text-base font-bold text-[#171717] font-display">
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-neutral-400 hover:text-[#171717] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#171717] mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ex: Bolo de Pote Prestígio Gourmet"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-[#171717] focus:outline-none focus:border-[#FF981B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#171717] mb-1">Categoria</label>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-[#171717] focus:outline-none focus:border-[#FF981B]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#171717] mb-1">Preço Base (R$)</label>
                  <input
                    type="text"
                    required
                    value={productForm.basePrice}
                    onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                    placeholder="18.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-[#171717] focus:outline-none focus:border-[#FF981B]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#171717] mb-1">Descrição</label>
                <textarea
                  rows={3}
                  required
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Descreva as camadas generosas, ingredientes nobres e a experiência gastronômica."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-[#171717] focus:outline-none focus:border-[#FF981B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#171717] mb-1">URL da Imagem (Opcional)</label>
                <input
                  type="url"
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-[#171717] focus:outline-none focus:border-[#FF981B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#171717] mb-1">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={productForm.tags}
                  onChange={(e) => setProductForm({ ...productForm, tags: e.target.value })}
                  placeholder="Mais Vendido, Artesanal, Chocolate Belga"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-[#171717] focus:outline-none focus:border-[#FF981B]"
                />
              </div>

              {/* Sizes / Variations Manager */}
              <div className="pt-2 border-t border-[#F0EBE1] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#171717]">Variações de Tamanho</span>
                  <button
                    type="button"
                    onClick={() => {
                      setProductForm({
                        ...productForm,
                        sizes: [
                          ...productForm.sizes,
                          { id: `sz-${Date.now()}`, name: 'Novo Tamanho', price: 0 },
                        ],
                      });
                    }}
                    className="text-[#FF981B] font-bold hover:underline"
                  >
                    + Adicionar Tamanho
                  </button>
                </div>

                {productForm.sizes.map((s, idx) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => {
                        const copy = [...productForm.sizes];
                        copy[idx].name = e.target.value;
                        setProductForm({ ...productForm, sizes: copy });
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#FFFCF7] border border-[#EAE3D2] text-xs"
                      placeholder="Nome do tamanho"
                    />
                    <div className="flex items-center gap-1 w-28">
                      <span className="text-neutral-400 text-xs">+R$</span>
                      <input
                        type="number"
                        step="0.5"
                        value={s.price}
                        onChange={(e) => {
                          const copy = [...productForm.sizes];
                          copy[idx].price = parseFloat(e.target.value) || 0;
                          setProductForm({ ...productForm, sizes: copy });
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-[#FFFCF7] border border-[#EAE3D2] text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProductForm({
                          ...productForm,
                          sizes: productForm.sizes.filter((_, i) => i !== idx),
                        });
                      }}
                      className="text-neutral-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Extra Ingredients Manager */}
              <div className="pt-2 border-t border-[#F0EBE1] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#171717]">Adicionais / Complementos</span>
                  <button
                    type="button"
                    onClick={() => {
                      setProductForm({
                        ...productForm,
                        extras: [
                          ...productForm.extras,
                          { id: `ex-${Date.now()}`, name: 'Novo Adicional', price: 3.0, available: true, maxQuantity: 2 },
                        ],
                      });
                    }}
                    className="text-[#FF981B] font-bold hover:underline"
                  >
                    + Adicionar Extra
                  </button>
                </div>

                {productForm.extras.map((ex, idx) => (
                  <div key={ex.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ex.name}
                      onChange={(e) => {
                        const copy = [...productForm.extras];
                        copy[idx].name = e.target.value;
                        setProductForm({ ...productForm, extras: copy });
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#FFFCF7] border border-[#EAE3D2] text-xs"
                      placeholder="Nome do adicional"
                    />
                    <div className="flex items-center gap-1 w-24">
                      <span className="text-neutral-400 text-xs">R$</span>
                      <input
                        type="number"
                        step="0.5"
                        value={ex.price}
                        onChange={(e) => {
                          const copy = [...productForm.extras];
                          copy[idx].price = parseFloat(e.target.value) || 0;
                          setProductForm({ ...productForm, extras: copy });
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-[#FFFCF7] border border-[#EAE3D2] text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProductForm({
                          ...productForm,
                          extras: productForm.extras.filter((_, i) => i !== idx),
                        });
                      }}
                      className="text-neutral-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-full text-neutral-600 hover:bg-neutral-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold uppercase tracking-wider shadow-sm"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVA CATEGORIA */}
      {/* ============================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAE3D2] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#171717] font-display">
                Criar Nova Categoria
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-neutral-400 hover:text-[#171717] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategorySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#171717] mb-1">Nome da Categoria</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Tortas no Pote"
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-[#171717] focus:outline-none focus:border-[#FF981B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#171717] mb-1">Descrição (Opcional)</label>
                <input
                  type="text"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Ex: Sobremesas finas e receitas clássicas"
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFCF7] border border-[#EAE3D2] text-[#171717] focus:outline-none focus:border-[#FF981B]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold uppercase tracking-wider"
                >
                  Cadastrar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
