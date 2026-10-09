import React from 'react';
import { Heart, Sparkles, Award, ShieldCheck } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section className="py-16 md:py-24 bg-[#0d0d0d] border-b border-[#1c1c1c] relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Subtle golden eyebrow */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-px w-8 bg-[#FFBF32]/60" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FFBF32]">
              Nossa Essência
            </span>
            <span className="h-px w-8 bg-[#FFBF32]/60" />
          </div>

          {/* Seção de Apresentação: Título Obrigatório */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-display">
            Conheça o Sabor no Pote
          </h2>

          {/* Texto Oficial Obrigatório */}
          <p className="mt-6 text-base sm:text-lg md:text-xl text-neutral-300 font-normal leading-relaxed text-balance">
            “No Sabor no Pote, acreditamos que uma boa comida transforma qualquer momento em uma experiência especial. Nosso compromisso é oferecer sabor, qualidade e carinho em cada preparo.”
          </p>
        </div>

        {/* Pilares Gastronômicos Discretos */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-[#141414] border border-[#222222] hover:border-[#FFBF32]/40 transition-colors duration-200">
            <div className="w-12 h-12 rounded-lg bg-[#1c1c1c] border border-[#2b2b2b] flex items-center justify-center mb-4 text-[#FFBF32]">
              <Heart className="w-6 h-6 text-[#FF921C]" />
            </div>
            <h3 className="text-base font-bold text-white font-display">
              Carinho em Cada Preparo
            </h3>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
              Receitas elaboradas artesanalmente com dedicação a cada camada e detalhe.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#141414] border border-[#222222] hover:border-[#FFBF32]/40 transition-colors duration-200">
            <div className="w-12 h-12 rounded-lg bg-[#1c1c1c] border border-[#2b2b2b] flex items-center justify-center mb-4 text-[#FFBF32]">
              <Award className="w-6 h-6 text-[#FFD447]" />
            </div>
            <h3 className="text-base font-bold text-white font-display">
              Qualidade Gastronômica
            </h3>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
              Seleção criteriosa de matéria-prima para garantir sabor marcante e frescor inigualável.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#141414] border border-[#222222] hover:border-[#FFBF32]/40 transition-colors duration-200">
            <div className="w-12 h-12 rounded-lg bg-[#1c1c1c] border border-[#2b2b2b] flex items-center justify-center mb-4 text-[#FFBF32]">
              <ShieldCheck className="w-6 h-6 text-[#FFBF32]" />
            </div>
            <h3 className="text-base font-bold text-white font-display">
              Apresentação Premium
            </h3>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
              Embalagens no pote seguras, higiênicas e perfeitas para saborear ou presentear.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
