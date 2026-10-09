import React, { useState, useEffect } from 'react';
import { ShoppingCart, Menu as MenuIcon, X } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { useCart } from '../../context/CartContext';

interface HeaderProps {
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { totalCount, setIsCartOpen } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);

      // If user reaches the bottom of the page, keep como-pedir highlighted
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 90) {
        setActiveSection('como-pedir');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // IntersectionObserver for tracking sections dynamically during scroll
    const sectionIds = ['inicio', 'cardapio', 'como-pedir', 'contato'];
    const observerOptions = {
      root: null,
      rootMargin: '-15% 0px -50% 0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      // Find the most visible intersecting section
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length > 0) {
        // Sort by bounding top
        visible.sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        const targetId = visible[0].target.id;
        if (targetId) {
          // If viewing 'contato' (footer area), keep 'como-pedir' highlighted
          if (targetId === 'contato') {
            setActiveSection('como-pedir');
          } else {
            setActiveSection(targetId);
          }
        }
      }
    }, observerOptions);

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const navLinks = [
    { id: 'inicio', label: 'Início', href: '#inicio' },
    { id: 'cardapio', label: 'Cardápio', href: '#cardapio' },
    { id: 'como-pedir', label: 'Como pedir', href: '#como-pedir' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, id: string) => {
    e.preventDefault();
    setActiveSection(id);
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      const header = document.querySelector('header');
      const headerOffset = header ? header.offsetHeight : 80;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: Math.max(0, elementPosition - headerOffset),
        behavior: 'smooth',
      });
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 bg-white transition-all duration-200 ${
        isScrolled
          ? 'shadow-xs border-b border-neutral-100 py-2 sm:py-2.5'
          : 'border-b border-neutral-100 py-2.5 sm:py-3'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6">
          {/* LADO ESQUERDO: Logomarca original do Sabor no Pote */}
          <div className="flex items-center">
            <a
              href="#inicio"
              onClick={(e) => handleNavClick(e, '#inicio', 'inicio')}
              className="flex items-center gap-3 transition-opacity hover:opacity-95"
              aria-label="Sabor no Pote - Início"
            >
              <Logo variant="icon" size="md" />
            </a>
          </div>

          {/* AO CENTRO: Menu de Navegação (Desktop) */}
          <nav
            className="hidden md:flex items-center justify-center gap-8 lg:gap-10 text-sm font-medium"
            aria-label="Navegação principal"
          >
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href, link.id)}
                  className={`relative py-1.5 whitespace-nowrap transition-colors duration-150 ${
                    isActive
                      ? 'text-[#FF981B] font-semibold'
                      : 'text-[#171717] hover:text-[#FF981B]'
                  }`}
                >
                  {link.label}
                  {/* Linha discreta abaixo do item selecionado */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF981B] rounded-full animate-in fade-in" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* À DIREITA: Botão do Carrinho */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-semibold text-xs tracking-wider transition-all duration-200 shadow-sm hover:shadow active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF981B]"
              aria-label={`Carrinho de compras com ${totalCount} itens`}
            >
              <ShoppingCart className="w-4 h-4 text-[#171717] stroke-[2.2]" />
              <span className="font-bold">Carrinho</span>
              <span className="min-w-[20px] h-5 px-1 bg-[#171717] text-white font-bold text-xs rounded-full flex items-center justify-center">
                {totalCount}
              </span>
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-neutral-100 text-[#171717] hover:bg-neutral-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF981B]"
              aria-expanded={mobileMenuOpen}
              aria-label="Abrir menu de navegação"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-100 bg-white px-4 pt-3 pb-6 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href, link.id)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[#FF981B] bg-[#FFF7E9] font-bold'
                      : 'text-[#171717] hover:bg-neutral-50'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>Sabor no Pote • Gastronomia Artesanal</span>
            {onOpenSettings && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSettings();
                }}
                className="text-[#FF981B] font-medium hover:underline"
              >
                Configurações da Loja
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
