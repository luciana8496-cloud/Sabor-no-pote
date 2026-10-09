import React from 'react';
import { Search, SlidersHorizontal, MessageCircle } from 'lucide-react';

export const HowToOrderSection: React.FC = () => {
  const steps = [
    {
      number: '1',
      title: 'ESCOLHA',
      description: 'Explore nosso cardápio e selecione seus produtos favoritos.',
      icon: Search,
    },
    {
      number: '2',
      title: 'PERSONALIZE',
      description: 'Escolha suas opções e adicione tudo ao carrinho.',
      icon: SlidersHorizontal,
    },
    {
      number: '3',
      title: 'PEÇA',
      description: 'Envie seu pedido pelo WhatsApp e aguarde nossa confirmação.',
      icon: MessageCircle,
    },
  ];

  return (
    <section id="como-pedir" className="py-16 md:py-24 bg-[#080808] border-b border-[#1c1c1c] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FFBF32] block mb-2">
            Passo a Passo
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-display">
            Como fazer seu pedido?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-neutral-400">
            Três passos simples para receber o melhor da nossa gastronomia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Subtle connecting line on desktop */}
          <div
            className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-[#2b2b2b] to-transparent -translate-y-8 pointer-events-none"
            aria-hidden="true"
          />

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative flex flex-col items-center text-center p-8 rounded-xl bg-[#121212] border border-[#222222] hover:border-[#FFBF32]/50 transition-all duration-300 group"
              >
                {/* Step indicator with icon */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2e2e2e] group-hover:border-[#FFBF32] flex items-center justify-center text-[#FFBF32] transition-colors duration-300 shadow-md">
                    <Icon className="w-7 h-7 text-[#FFBF32] group-hover:scale-110 transition-transform duration-200" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#FF921C] text-[#080808] font-bold text-xs flex items-center justify-center font-display shadow-sm">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white tracking-wider font-display mb-3">
                  {step.title}
                </h3>

                <p className="text-sm text-neutral-300 leading-relaxed text-balance">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
