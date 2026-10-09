import React from 'react';
import { ShoppingCart, SlidersHorizontal, MessageCircle, ArrowRight } from 'lucide-react';

export const AboutAndHowToOrderSection: React.FC = () => {
  const scrollToMenu = () => {
    const menuElement = document.getElementById('cardapio');
    if (menuElement) {
      const header = document.querySelector('header');
      const headerOffset = header ? header.offsetHeight : 80;
      const elementPosition = menuElement.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: Math.max(0, elementPosition - headerOffset),
        behavior: 'smooth',
      });
    }
  };

  return (
    <section id="como-pedir" className="scroll-mt-20 md:scroll-mt-24 bg-white py-14 md:py-20 border-b border-[#F0EBE1] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          {/* LADO ESQUERDO: CONHEÇA O SABOR NO POTE (5 colunas) */}
          <div id="conheca" className="lg:col-span-5 relative flex flex-col items-start pr-0 lg:pr-8">
            {/* Traços decorativos e título */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#FF981B]">
                Conheça o
              </span>
              <span className="h-0.5 w-8 bg-[#FF981B]/80 rounded-full" />
            </div>

            {/* Três pequenos traços amarelos ao lado do título */}
            <div className="relative mb-4">
              <div
                className="absolute -top-3.5 right-[-32px] flex gap-1 pointer-events-none"
                aria-hidden="true"
              >
                <span className="w-1.5 h-3.5 bg-[#FFBF32] rounded-full rotate-12" />
                <span className="w-1.5 h-4.5 bg-[#FFBF32] rounded-full rotate-25" />
                <span className="w-1.5 h-3.5 bg-[#FFBF32] rounded-full rotate-45" />
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#171717] font-display tracking-tight">
                Sabor no Pote
              </h2>
            </div>

            {/* Texto oficial */}
            <p className="text-sm sm:text-base text-[#555555] leading-relaxed mb-6">
              No Sabor no Pote, acreditamos que uma boa comida transforma qualquer momento em uma
              experiência especial. Nosso compromisso é oferecer sabor, qualidade e carinho em cada
              preparo.
            </p>

            {/* Botão Saiba Mais / Ver Cardápio */}
            <button
              onClick={scrollToMenu}
              className="px-6 py-3 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-xs hover:shadow active:scale-98 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF981B]"
            >
              <span>Saiba Mais</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#171717]" />
            </button>

            {/* Marca d'água sutil de chapéu de chef no canto inferior */}
            <svg
              className="absolute -bottom-6 right-0 w-32 h-32 text-[#FFD447]/15 pointer-events-none stroke-current fill-none stroke-[1.2]"
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <path d="M25 65 C15 55 20 40 32 40 C35 25 55 22 64 35 C75 30 85 45 78 60 C80 65 75 70 70 70 L30 70 C25 70 20 68 25 65 Z" />
              <path d="M28 70 L72 70 L70 78 L30 78 Z" />
            </svg>
          </div>

          {/* DIVISÓRIA VERTICAL SUAVE NO DESKTOP */}
          <div className="hidden lg:block lg:col-span-1 self-stretch flex justify-center">
            <div className="w-px h-full bg-[#F0EBE1]" />
          </div>

          {/* LADO DIREITO: COMO FAZER SEU PEDIDO? (6 colunas) */}
          <div className="lg:col-span-6 relative flex flex-col items-start pl-0 lg:pl-2">
            {/* Título com destaque em laranja */}
            <div className="flex items-center gap-2 mb-6">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#171717]">
                Como Fazer <span className="text-[#FF981B]">Seu Pedido?</span>
              </h3>
              <span className="h-0.5 w-8 bg-[#FF981B]/80 rounded-full" />
            </div>

            {/* Três Etapas: Horizontal no Desktop, Vertical no Mobile */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 relative">
              {/* ETAPA 1 — ESCOLHA */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left relative group">
                {/* Ícone com número em destaque */}
                <div className="relative mb-3.5">
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#FFBF32] text-[#171717] font-extrabold text-[11px] flex items-center justify-center shadow-xs">
                    1
                  </span>
                  <div className="w-14 h-14 rounded-full bg-[#FFF7E9] border border-[#FFBF32]/30 flex items-center justify-center text-[#171717] group-hover:scale-105 transition-transform">
                    <ShoppingCart className="w-6 h-6 text-[#171717] stroke-[2]" />
                  </div>
                </div>

                <h4 className="text-xs font-bold text-[#171717] tracking-wider uppercase mb-1">
                  Escolha
                </h4>
                <p className="text-xs text-[#555555] leading-relaxed">
                  Explore nosso cardápio e selecione seus produtos favoritos.
                </p>

                {/* Seta Amarela Fina (Desktop) */}
                <div className="hidden sm:block absolute top-7 -right-3 text-[#FFBF32]">
                  <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>

              {/* ETAPA 2 — PERSONALIZE */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left relative group">
                <div className="relative mb-3.5">
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#FFBF32] text-[#171717] font-extrabold text-[11px] flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <div className="w-14 h-14 rounded-full bg-[#FFF7E9] border border-[#FFBF32]/30 flex items-center justify-center text-[#171717] group-hover:scale-105 transition-transform">
                    <SlidersHorizontal className="w-6 h-6 text-[#171717] stroke-[2]" />
                  </div>
                </div>

                <h4 className="text-xs font-bold text-[#171717] tracking-wider uppercase mb-1">
                  Personalize
                </h4>
                <p className="text-xs text-[#555555] leading-relaxed">
                  Escolha suas opções e adicione tudo ao carrinho.
                </p>

                {/* Seta Amarela Fina (Desktop) */}
                <div className="hidden sm:block absolute top-7 -right-3 text-[#FFBF32]">
                  <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>

              {/* ETAPA 3 — PEÇA */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left relative group">
                <div className="relative mb-3.5">
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#FFBF32] text-[#171717] font-extrabold text-[11px] flex items-center justify-center shadow-xs">
                    3
                  </span>
                  <div className="w-14 h-14 rounded-full bg-[#FFF7E9] border border-[#FFBF32]/30 flex items-center justify-center text-[#171717] group-hover:scale-105 transition-transform">
                    <MessageCircle className="w-6 h-6 text-[#171717] stroke-[2]" />
                  </div>
                </div>

                <h4 className="text-xs font-bold text-[#171717] tracking-wider uppercase mb-1">
                  Peça
                </h4>
                <p className="text-xs text-[#555555] leading-relaxed">
                  Envie seu pedido pelo WhatsApp e aguarde nossa confirmação.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
