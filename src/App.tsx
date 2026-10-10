/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Header } from './components/layout/Header';
import { HeroSection } from './components/home/HeroSection';
import { MenuSection } from './components/menu/MenuSection';
import { AboutAndHowToOrderSection } from './components/home/AboutAndHowToOrderSection';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { CheckoutModal } from './components/checkout/CheckoutModal';
import { StoreSettingsModal } from './components/settings/StoreSettingsModal';
import { AdminRouter } from './components/admin/AdminRouter';
import { syncCatalogFromSupabase, syncStoreSettingsFromSupabase } from './services/storeService';

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    return (
      window.location.pathname.startsWith('/admin') ||
      window.location.hash.startsWith('#admin')
    );
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    // Sync store settings and catalog from Supabase on load
    syncStoreSettingsFromSupabase().catch(() => {});
    syncCatalogFromSupabase().catch(() => {});

    // Listen to routing changes (pathname and hash)
    const handleRouteChange = () => {
      const isAdmin =
        window.location.pathname.startsWith('/admin') ||
        window.location.hash.startsWith('#admin');
      setIsAdminRoute(isAdmin);
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  const handleBackToPublic = () => {
    if (window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
    if (window.location.hash.startsWith('#admin')) {
      window.location.hash = '';
    }
    setIsAdminRoute(false);
  };

  return (
    <AuthProvider>
      <CartProvider>
        {isAdminRoute ? (
          <AdminRouter onBackToPublic={handleBackToPublic} />
        ) : (
          <div className="min-h-screen bg-white text-[#171717] flex flex-col selection:bg-[#FFBF32] selection:text-[#171717]">
            {/* Cabeçalho Branco Fixo com Navegação Suave e Destaque Dinâmico */}
            <Header onOpenSettings={() => setIsSettingsOpen(true)} />

            {/* Conteúdo Principal Organizado na Ordem Estrita do Menu */}
            <main className="flex-1">
              {/* 1. SEÇÃO INÍCIO: Apresentação Principal, Logomarca, Slogan, Imagem e Botões */}
              <HeroSection />

              {/* 2. SEÇÃO CARDÁPIO: "Nosso Cardápio", Categorias e Produtos */}
              <MenuSection />

              {/* 3. SEÇÃO COMO PEDIR: "Conheça o Sabor no Pote" e 3 Etapas (Escolha, Personalize, Peça) */}
              <AboutAndHowToOrderSection />
            </main>

            {/* 4. SEÇÃO CONTATO: Informações de Atendimento, Contatos e Rodapé */}
            <Footer onOpenSettings={() => setIsSettingsOpen(true)} />

            {/* Carrinho Deslizante */}
            <CartDrawer />

            {/* Finalização do Pedido (Checkout) */}
            <CheckoutModal onOpenSettings={() => setIsSettingsOpen(true)} />

            {/* Modal de Configurações da Empresa (WhatsApp, Contato, etc.) */}
            <StoreSettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
            />
          </div>
        )}
      </CartProvider>
    </AuthProvider>
  );
}
