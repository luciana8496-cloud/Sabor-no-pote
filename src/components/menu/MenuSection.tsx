import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Utensils } from 'lucide-react';
import { Product, Category } from '../../types/store';
import { getProducts, getCategories } from '../../services/storeService';
import { ProductDetailModal } from './ProductDetailModal';

export const MenuSection: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [categories, setCategories] = useState<Category[]>(() => getCategories());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setProducts(getProducts());
      setCategories(getCategories());
    };
    window.addEventListener('store_data_updated', handleUpdate);
    return () => window.removeEventListener('store_data_updated', handleUpdate);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategoryId === 'all' || product.categoryId === selectedCategoryId;
      const matchesSearch =
        searchQuery.trim() === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  return (
    <section id="cardapio" className="scroll-mt-20 md:scroll-mt-24 py-16 md:py-24 bg-[#FFFCF7] border-b border-[#F0EBE1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#FF981B]">
              Cardápio Digital
            </span>
            <span className="h-0.5 w-6 bg-[#FF981B]/80 rounded-full" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#171717] font-display tracking-tight">
            Nosso Cardápio
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#555555]">
            Confira nossas opções artesanais preparadas com carinho e ingredientes selecionados.
          </p>
        </div>

        {/* Dynamic Category Tabs & Search Bar (Rendered when products exist) */}
        {products.length > 0 && (
          <div className="mb-10 space-y-5">
            {/* Search Input */}
            <div className="max-w-md mx-auto relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar delícias no cardápio..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-[#E8E2D5] text-[#171717] placeholder-neutral-400 text-sm focus:outline-none focus:border-[#FF981B] shadow-2xs transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-[#171717]"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Categories Segmented Control */}
            {categories.length > 0 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('all')}
                  className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    selectedCategoryId === 'all'
                      ? 'bg-[#FFBF32] text-[#171717] shadow-xs'
                      : 'bg-white text-[#555555] hover:text-[#171717] border border-[#E8E2D5]'
                  }`}
                >
                  Todos
                </button>
                {categories
                  .filter((cat) => cat.active)
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        selectedCategoryId === cat.id
                          ? 'bg-[#FFBF32] text-[#171717] shadow-xs'
                          : 'bg-white text-[#555555] hover:text-[#171717] border border-[#E8E2D5]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ESTADO VAZIO OBRIGATÓRIO (Cardápio Inicia Vazio por Especificação) */}
        {products.length === 0 ? (
          <div className="max-w-xl mx-auto my-6 p-8 sm:p-12 rounded-3xl bg-white border border-[#EFE9DD] text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#FFF7E9] border border-[#FFBF32]/40 text-[#FF981B] flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl" role="img" aria-label="Pote gastronômico">
                🍲
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-[#171717] font-display mb-3">
              Estamos preparando nosso cardápio! 🍲
            </h3>

            <p className="text-sm sm:text-base text-[#555555] leading-relaxed max-w-md mx-auto">
              Em breve, você poderá conferir todas as delícias do Sabor no Pote.
            </p>
          </div>
        ) : (
          /* LISTAGEM DE PRODUTOS DINÂMICA (Quando cadastrados pela administradora) */
          <div>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-[#555555]">
                <p>Nenhum produto encontrado para os filtros selecionados.</p>
                <button
                  onClick={() => {
                    setSelectedCategoryId('all');
                    setSearchQuery('');
                  }}
                  className="mt-3 text-xs text-[#FF981B] font-semibold hover:underline"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`rounded-2xl bg-white border transition-all duration-300 flex flex-col overflow-hidden group shadow-2xs hover:shadow-md hover:-translate-y-1 ${
                      product.available
                        ? 'border-[#EAE3D2] hover:border-[#FFBF32]'
                        : 'border-[#EAE3D2] opacity-60'
                    }`}
                  >
                    {/* Imagem do Produto */}
                    <div className="relative aspect-[4/3] w-full bg-[#FAF6EE] overflow-hidden flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center">
                          <div className="w-12 h-12 rounded-full bg-[#FFF7E9] border border-[#FFBF32]/40 flex items-center justify-center text-[#FF981B] mb-2">
                            <Utensils className="w-6 h-6" />
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF981B]">
                            Sabor no Pote
                          </span>
                        </div>
                      )}

                      {/* Tag de Disponibilidade */}
                      {!product.available && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#555555] bg-[#FFF7E9] border border-[#EAE3D2] px-3 py-1 rounded-full">
                            Indisponível
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Informações do Produto */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {product.tags && product.tags.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-[#FF981B] font-semibold mb-1">
                            {product.tags.map((tag, idx) => (
                              <React.Fragment key={tag}>
                                <span>{tag}</span>
                                {idx < product.tags!.length - 1 && <span>•</span>}
                              </React.Fragment>
                            ))}
                          </div>
                        )}

                        <h3 className="text-base font-bold text-[#171717] font-display group-hover:text-[#FF981B] transition-colors">
                          {product.name}
                        </h3>

                        <p className="mt-1.5 text-xs sm:text-sm text-[#555555] line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>

                      {/* Preço em Laranja e Botão Amarelo */}
                      <div className="mt-5 pt-4 border-t border-[#F5EFE4] flex items-center justify-between gap-3">
                        <div>
                          <span className="block text-[10px] text-[#777777] uppercase tracking-wider">
                            A partir de
                          </span>
                          <span className="text-base font-extrabold text-[#FF981B] tabular-nums">
                            R$ {product.basePrice.toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={!product.available}
                          onClick={() => setActiveModalProduct(product)}
                          className="px-4 py-2 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs hover:shadow-xs active:scale-95"
                          aria-label={`Ver opções e adicionar ${product.name}`}
                        >
                          <Plus className="w-3.5 h-3.5 text-[#171717]" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalhes e Personalização do Produto */}
      {activeModalProduct && (
        <ProductDetailModal
          product={activeModalProduct}
          onClose={() => setActiveModalProduct(null)}
        />
      )}
    </section>
  );
};
