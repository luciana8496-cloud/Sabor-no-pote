import React, { useState, useEffect } from 'react';
import { Logo } from '../brand/Logo';
import { getStoreSettings } from '../../services/storeService';
import { StoreSettings } from '../../types/store';
import { Phone, Instagram, Clock, MapPin, Settings } from 'lucide-react';

interface FooterProps {
  onOpenSettings: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSettings }) => {
  const [settings, setSettings] = useState<StoreSettings>(() => getStoreSettings());

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(getStoreSettings());
    };
    window.addEventListener('store_settings_updated', handleUpdate);
    return () => window.removeEventListener('store_settings_updated', handleUpdate);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <footer id="contato" className="scroll-mt-20 md:scroll-mt-24 bg-[#FFFCF7] border-t border-[#F0EBE1] text-[#555555]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Column 1: Brand & Logo */}
          <div className="md:col-span-1 space-y-3">
            <Logo variant="horizontal" size="md" />
            <p className="text-xs text-[#555555] leading-relaxed mt-3">
              Gastronomia artesanal no pote. Sabor que conquista em cada pote!
            </p>
          </div>

          {/* Column 2: Links de Navegação */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF981B] mb-4">
              Navegação
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a
                  href="#inicio"
                  onClick={(e) => handleNavClick(e, '#inicio')}
                  className="hover:text-[#FF981B] transition-colors"
                >
                  Início
                </a>
              </li>
              <li>
                <a
                  href="#cardapio"
                  onClick={(e) => handleNavClick(e, '#cardapio')}
                  className="hover:text-[#FF981B] transition-colors"
                >
                  Cardápio
                </a>
              </li>
              <li>
                <a
                  href="#como-pedir"
                  onClick={(e) => handleNavClick(e, '#como-pedir')}
                  className="hover:text-[#FF981B] transition-colors"
                >
                  Como pedir
                </a>
              </li>
              <li>
                <a
                  href="#contato"
                  onClick={(e) => handleNavClick(e, '#contato')}
                  className="hover:text-[#FF981B] transition-colors"
                >
                  Contato
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Informações de Atendimento (Configuráveis) */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#FF981B]">
                Informações de Atendimento
              </h3>
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1 text-[11px] text-[#FF981B] hover:text-[#e08310] transition-colors font-medium"
                title="Configurar dados oficiais de contato"
              >
                <Settings className="w-3 h-3" />
                <span>Configurar Dados</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* WhatsApp */}
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#FF981B] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-[#171717]">WhatsApp Oficial:</span>
                  {settings.whatsappNumber ? (
                    <a
                      href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FF981B] font-medium hover:underline"
                    >
                      {settings.whatsappNumber}
                    </a>
                  ) : (
                    <span className="text-neutral-400 italic">
                      Número em fase de configuração oficial
                    </span>
                  )}
                </div>
              </div>

              {/* Instagram */}
              <div className="flex items-start gap-2.5">
                <Instagram className="w-4 h-4 text-[#FF981B] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-[#171717]">Instagram:</span>
                  {settings.instagramHandle ? (
                    <a
                      href={`https://instagram.com/${settings.instagramHandle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FF981B] font-medium hover:underline"
                    >
                      {settings.instagramHandle}
                    </a>
                  ) : (
                    <span className="text-neutral-400 italic">Em breve nas redes sociais</span>
                  )}
                </div>
              </div>

              {/* Horário */}
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#FF981B] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-[#171717]">
                    Horário de Funcionamento:
                  </span>
                  {settings.openingHours ? (
                    <span className="text-[#171717]">{settings.openingHours}</span>
                  ) : (
                    <span className="text-neutral-400 italic">Consulte nossos horários no WhatsApp</span>
                  )}
                </div>
              </div>

              {/* Endereço */}
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#FF981B] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-[#171717]">Endereço para Retirada:</span>
                  {settings.address ? (
                    <span className="text-[#171717]">{settings.address}</span>
                  ) : (
                    <span className="text-neutral-400 italic">
                      Disponibilizado na confirmação do pedido
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Linha Divisória e Copyright Obrigatório */}
        <div className="mt-12 pt-6 border-t border-[#F0EBE1] flex flex-col sm:flex-row items-center justify-between text-xs text-[#777777] gap-3">
          <p>© Sabor no Pote — Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
