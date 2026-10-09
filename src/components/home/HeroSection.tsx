import React from 'react';
import {
  UtensilsCrossed,
  MessageCircle,
  ArrowRight,
  Heart,
  Sparkles,
  Star,
  Leaf,
} from 'lucide-react';
import heroCasserole from '../../assets/hero-casserole.jpg';

export const HeroSection: React.FC = () => {
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
    <section
      id="inicio"
      className="scroll-mt-20 md:scroll-mt-24 relative overflow-hidden bg-[#FFFCF7] pt-8 pb-16 md:pt-14 md:pb-24 border-b border-[#F0EBE1]"
    >
      {/* Elementos Decorativos de Fundo: Curvas suaves em creme e contorno do chapéu de chef */}
      <div
        className="absolute top-0 -left-24 w-96 h-96 bg-[#FFF7E9] rounded-full blur-2xl opacity-70 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#FFF7E9]/50 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Marca d'água sutil de chapéu de chef no fundo */}
      <svg
        className="absolute -bottom-8 left-4 w-40 h-40 text-[#FFD447]/15 pointer-events-none stroke-current fill-none stroke-[1.2]"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <path d="M25 65 C15 55 20 40 32 40 C35 25 55 22 64 35 C75 30 85 45 78 60 C80 65 75 70 70 70 L30 70 C25 70 20 68 25 65 Z" />
        <path d="M28 70 L72 70 L70 78 L30 78 Z" />
      </svg>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Layout Desktop Dividido em Duas Áreas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* LADO ESQUERDO: Textos, Slogan, Botões e Benefícios (7 colunas) */}
          <div className="lg:col-span-7 flex flex-col items-start text-left z-10">
            {/* Texto Superior: GASTRONOMIA ARTESANAL NO POTE com traço laranja */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.24em] text-[#FF981B]">
                Gastronomia Artesanal no Pote
              </span>
              <span className="h-0.5 w-8 bg-[#FF981B]/80 rounded-full" />
            </div>

            {/* TÍTULO PRINCIPAL com três traços amarelos e "cada pote!" em destaque */}
            <div className="relative">
              {/* Traços decorativos amarelos no topo */}
              <div
                className="absolute -top-4 right-6 sm:-top-5 sm:right-16 flex gap-1 pointer-events-none"
                aria-hidden="true"
              >
                <span className="w-1.5 h-4 bg-[#FFBF32] rounded-full rotate-12" />
                <span className="w-1.5 h-5 bg-[#FFBF32] rounded-full rotate-25" />
                <span className="w-1.5 h-4 bg-[#FFBF32] rounded-full rotate-45" />
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-extrabold text-[#171717] font-display leading-[1.12] tracking-tight">
                Sabor que conquista <br />
                <span className="inline-block mt-1">em </span>{' '}
                <span className="relative inline-block text-[#FF981B] font-script text-4xl sm:text-5xl md:text-6xl font-bold ml-1.5 transform -rotate-1">
                  cada pote!
                  {/* Linha curva suave abaixo de "cada pote!" */}
                  <svg
                    className="absolute -bottom-2.5 left-0 w-full h-3 text-[#FFBF32]"
                    viewBox="0 0 100 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 7 C30 1 70 1 98 8"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
            </div>

            {/* SUBTÍTULO */}
            <p className="mt-5 text-base sm:text-lg text-[#555555] max-w-xl font-normal leading-relaxed">
              Preparado com carinho, servido com sabor e feito para surpreender você.
            </p>

            {/* BOTÕES DE AÇÃO */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
              {/* BOTÃO 1: VER CARDÁPIO (Fundo amarelo dourado, texto preto) */}
              <button
                onClick={scrollToMenu}
                className="px-7 py-3.5 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF981B]"
              >
                <UtensilsCrossed className="w-4 h-4 text-[#171717]" />
                <span>Ver Cardápio</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#171717]" />
              </button>

              {/* BOTÃO 2: FAZER PEDIDO (Fundo branco, borda fina laranja) */}
              <button
                onClick={scrollToMenu}
                className="px-7 py-3.5 rounded-full bg-white hover:bg-[#FFF7E9] border border-[#FF981B] text-[#171717] font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-xs hover:shadow-sm active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF981B]"
              >
                <MessageCircle className="w-4 h-4 text-[#171717]" />
                <span>Fazer Pedido</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#FF981B]" />
              </button>
            </div>

            {/* BENEFÍCIOS DA MARCA (Abaixo dos botões principais: 4 destaques) */}
            <div className="mt-10 pt-6 border-t border-[#F0EBE1] w-full grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
              {/* 1. Ingredientes selecionados */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#FFF7E9] border border-[#FFBF32]/40 flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4 text-[#FF981B]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
                    <line x1="6" y1="17" x2="18" y2="17" />
                  </svg>
                </div>
                <div className="leading-tight">
                  <span className="block text-xs font-semibold text-[#171717]">
                    Ingredientes
                  </span>
                  <span className="block text-[11px] text-[#555555]">selecionados</span>
                </div>
              </div>

              {/* 2. Preparado com carinho */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#FFF7E9] border border-[#FFBF32]/40 flex items-center justify-center shrink-0">
                  <Leaf className="w-4 h-4 text-[#FF981B]" />
                </div>
                <div className="leading-tight">
                  <span className="block text-xs font-semibold text-[#171717]">
                    Preparado
                  </span>
                  <span className="block text-[11px] text-[#555555]">com carinho</span>
                </div>
              </div>

              {/* 3. Qualidade em cada pote */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#FFF7E9] border border-[#FFBF32]/40 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-[#FF981B] fill-[#FF981B]" />
                </div>
                <div className="leading-tight">
                  <span className="block text-xs font-semibold text-[#171717]">
                    Qualidade
                  </span>
                  <span className="block text-[11px] text-[#555555]">em cada pote</span>
                </div>
              </div>

              {/* 4. Sabor que surpreende */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#FFF7E9] border border-[#FFBF32]/40 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 text-[#FF981B]" />
                </div>
                <div className="leading-tight">
                  <span className="block text-xs font-semibold text-[#171717]">
                    Sabor que
                  </span>
                  <span className="block text-[11px] text-[#555555]">surpreende</span>
                </div>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: Imagem Gastronômica em Destaque (5 colunas) */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Fundo decorativo quente e suave */}
            <div
              className="absolute -inset-4 bg-gradient-to-tr from-[#FFBF32]/10 via-[#FFF7E9] to-transparent rounded-3xl -z-10 blur-xl"
              aria-hidden="true"
            />

            {/* Moldura da imagem gastronômica */}
            <div className="relative w-full max-w-md lg:max-w-none rounded-2xl overflow-hidden shadow-xl shadow-black/8 border border-[#F0EBE1] bg-white group">
              <img
                src={heroCasserole}
                alt="Prato gastronômico artesanal - Sabor no Pote"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-cover aspect-[4/3] transform transition-transform duration-700 group-hover:scale-103"
                loading="eager"
              />

              {/* Selo gastronômico discreto no canto */}
              <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm border border-[#FFBF32]/50 shadow-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF981B]" />
                <span className="text-[11px] font-bold text-[#171717]">Receita Artesanal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
