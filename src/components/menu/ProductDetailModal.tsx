import React, { useState, useMemo } from 'react';
import { X, Plus, Minus, Check, ShoppingBag, Utensils } from 'lucide-react';
import { Product, ProductVariation, ProductFlavor, ProductExtra, SelectedExtra } from '../../types/store';
import { useCart } from '../../context/CartContext';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addItem } = useCart();

  if (!product) return null;

  const [selectedSize, setSelectedSize] = useState<ProductVariation | undefined>(
    product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined
  );

  const [selectedFlavor, setSelectedFlavor] = useState<ProductFlavor | undefined>(
    product.flavors && product.flavors.length > 0
      ? product.flavors.find((f) => f.available) || product.flavors[0]
      : undefined
  );

  const [extraCounts, setExtraCounts] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const handleExtraCountChange = (extra: ProductExtra, delta: number) => {
    setExtraCounts((prev) => {
      const current = prev[extra.id] || 0;
      const max = extra.maxQuantity || 5;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [extra.id]: next };
    });
  };

  const calculatedUnitPrice = useMemo(() => {
    let price = product.basePrice;
    if (selectedSize) {
      price += selectedSize.price;
    }
    if (product.extras) {
      for (const extra of product.extras) {
        const count = extraCounts[extra.id] || 0;
        price += extra.price * count;
      }
    }
    return price;
  }, [product, selectedSize, extraCounts]);

  const calculatedTotal = calculatedUnitPrice * quantity;

  const selectedExtrasList: SelectedExtra[] = useMemo(() => {
    if (!product.extras) return [];
    return product.extras
      .filter((extra) => (extraCounts[extra.id] || 0) > 0)
      .map((extra) => ({
        extra,
        quantity: extraCounts[extra.id],
      }));
  }, [product.extras, extraCounts]);

  const handleAddToCart = () => {
    addItem(product, selectedSize, selectedFlavor, selectedExtrasList, notes, quantity);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white border border-[#EAE3D2] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header Close Button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/90 hover:bg-white text-[#171717] border border-[#EAE3D2] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF981B]"
            aria-label="Fechar detalhes do produto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Product Banner */}
          {product.imageUrl ? (
            <div className="relative w-full h-52 sm:h-64 rounded-2xl overflow-hidden bg-[#FAF6EE]">
              <img
                src={product.imageUrl}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-36 sm:h-44 rounded-2xl bg-gradient-to-br from-[#FFF7E9] via-[#FFFCF7] to-[#FAF6EE] border border-[#EFE9DD] flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-full bg-white border border-[#FFBF32]/50 flex items-center justify-center text-[#FF981B] mb-2 shadow-xs">
                <Utensils className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF981B]">
                Sabor no Pote
              </span>
              <span className="text-xs text-[#555555] mt-0.5">Preparo Artesanal Exclusivo</span>
            </div>
          )}

          {/* Title & Price */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2
                id="product-modal-title"
                className="text-xl sm:text-2xl font-bold text-[#171717] font-display"
              >
                {product.name}
              </h2>
              <span className="text-xl font-extrabold text-[#FF981B] tabular-nums whitespace-nowrap">
                R$ {product.basePrice.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#555555] leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* 1. SELEÇÃO DE TAMANHOS */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="pt-4 border-t border-[#F5EFE4]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-3">
                Escolha o Tamanho
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {product.sizes.map((size) => {
                  const isSelected = selectedSize?.id === size.id;
                  return (
                    <button
                      type="button"
                      key={size.id}
                      onClick={() => setSelectedSize(size)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#FFF7E9] border-[#FF981B] text-[#171717] shadow-xs'
                          : 'bg-white border-[#E8E2D5] text-[#555555] hover:border-[#FFBF32]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-[#FF981B] bg-[#FF981B]' : 'border-neutral-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                        <span className="text-xs font-semibold text-[#171717]">{size.name}</span>
                      </div>
                      <span className="text-xs font-bold text-[#FF981B] tabular-nums">
                        {size.price > 0
                          ? `+ R$ ${size.price.toFixed(2).replace('.', ',')}`
                          : 'Padrão'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. SELEÇÃO DE SABORES */}
          {product.flavors && product.flavors.length > 0 && (
            <div className="pt-4 border-t border-[#F5EFE4]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-3">
                Escolha o Sabor / Variação
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {product.flavors.map((flavor) => {
                  const isSelected = selectedFlavor?.id === flavor.id;
                  return (
                    <button
                      type="button"
                      key={flavor.id}
                      disabled={!flavor.available}
                      onClick={() => setSelectedFlavor(flavor)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        !flavor.available
                          ? 'opacity-40 cursor-not-allowed bg-neutral-100 border-neutral-200'
                          : isSelected
                          ? 'bg-[#FFF7E9] border-[#FF981B] text-[#171717] shadow-xs'
                          : 'bg-white border-[#E8E2D5] text-[#555555] hover:border-[#FFBF32]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-[#FF981B] bg-[#FF981B]' : 'border-neutral-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                        <span className="text-xs font-semibold text-[#171717]">{flavor.name}</span>
                      </div>
                      {!flavor.available && (
                        <span className="text-[10px] text-neutral-400 uppercase">Esgotado</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. ADICIONAIS */}
          {product.extras && product.extras.length > 0 && (
            <div className="pt-4 border-t border-[#F5EFE4]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-3">
                Adicionais & Complementos (Opcional)
              </label>
              <div className="space-y-2">
                {product.extras.map((extra) => {
                  const currentCount = extraCounts[extra.id] || 0;
                  return (
                    <div
                      key={extra.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#FAF6EE] border border-[#EAE3D2]"
                    >
                      <div>
                        <span className="block text-xs font-semibold text-[#171717]">{extra.name}</span>
                        <span className="block text-[11px] text-[#FF981B] font-bold tabular-nums mt-0.5">
                          + R$ {extra.price.toFixed(2).replace('.', ',')} cada
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleExtraCountChange(extra, -1)}
                          disabled={currentCount === 0}
                          className="w-7 h-7 rounded-full bg-white hover:bg-neutral-100 border border-[#E8E2D5] disabled:opacity-30 text-[#171717] flex items-center justify-center transition-colors shadow-2xs"
                          aria-label={`Diminuir ${extra.name}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-[#171717] tabular-nums">
                          {currentCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleExtraCountChange(extra, 1)}
                          disabled={!extra.available || currentCount >= (extra.maxQuantity || 5)}
                          className="w-7 h-7 rounded-full bg-white hover:bg-neutral-100 border border-[#E8E2D5] disabled:opacity-30 text-[#171717] flex items-center justify-center transition-colors shadow-2xs"
                          aria-label={`Aumentar ${extra.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. OBSERVAÇÕES */}
          <div className="pt-4 border-t border-[#F5EFE4]">
            <label
              htmlFor="product-notes"
              className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-2"
            >
              Observações do Produto (Opcional)
            </label>
            <textarea
              id="product-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem calda extra, embalagem para presente..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-[#E8E2D5] rounded-xl text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B] resize-none"
            />
          </div>
        </div>

        {/* Footer with Stepper & Add Button */}
        <div className="p-4 sm:p-6 bg-[#FFFCF7] border-t border-[#F0EBE1] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <span className="text-xs uppercase tracking-wider text-[#555555] font-semibold sm:hidden">
              Quantidade:
            </span>
            <div className="flex items-center gap-3 bg-white border border-[#E8E2D5] rounded-full px-3 py-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="p-1 rounded-full text-neutral-400 hover:text-[#171717] disabled:opacity-30 transition-colors"
                aria-label="Diminuir quantidade"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center text-sm font-bold text-[#171717] tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="p-1 rounded-full text-neutral-400 hover:text-[#171717] transition-colors"
                aria-label="Aumentar quantidade"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full sm:w-auto flex-1 max-w-sm px-6 py-3.5 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold text-xs tracking-wider uppercase transition-all duration-200 shadow-sm hover:shadow active:scale-98 flex items-center justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF981B]"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#171717]" />
              <span>Adicionar ao Carrinho</span>
            </span>
            <span className="tabular-nums font-extrabold text-sm">
              R$ {calculatedTotal.toFixed(2).replace('.', ',')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
