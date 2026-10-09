import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const CartDrawer: React.FC = () => {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    isCartOpen,
    setIsCartOpen,
    setIsCheckoutOpen,
  } = useCart();

  if (!isCartOpen) return null;

  const handleCheckoutClick = () => {
    if (items.length === 0) return;
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Carrinho de Compras"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#EAE3D2] shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-[#F0EBE1] flex items-center justify-between bg-[#FFFCF7]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFF7E9] border border-[#FFBF32]/40 flex items-center justify-center text-[#171717]">
                <ShoppingCart className="w-5 h-5 text-[#171717] stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#171717] font-display">Seu Carrinho</h2>
                <span className="text-xs text-[#555555]">
                  {items.length === 0
                    ? 'Carrinho vazio'
                    : `${items.reduce((s, i) => s + i.quantity, 0)} ${
                        items.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'itens'
                      }`}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-full bg-white text-neutral-400 hover:text-[#171717] hover:bg-neutral-100 border border-[#E8E2D5] transition-colors"
              aria-label="Fechar carrinho"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body: Items List or Empty State */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-white">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#FFF7E9] border border-[#FFBF32]/40 flex items-center justify-center text-[#FF981B] mb-4">
                  <UtensilsCrossed className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#171717] font-display">
                  Seu carrinho está vazio
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#555555] max-w-xs leading-relaxed">
                  Adicione delícias artesanais do nosso cardápio para fazer seu pedido.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-6 px-6 py-2.5 rounded-full bg-[#FFBF32] text-[#171717] font-bold text-xs uppercase tracking-wider hover:bg-[#FFD447] transition-colors cursor-pointer shadow-xs"
                >
                  Explorar Cardápio
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#EAE3D2] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-[#171717] font-display">
                        {item.productName}
                      </h4>
                      <div className="mt-1 space-y-0.5 text-xs text-[#555555]">
                        {item.selectedSize && (
                          <div>
                            <span className="text-neutral-400">Tamanho: </span>
                            <span className="text-[#171717] font-medium">{item.selectedSize.name}</span>
                          </div>
                        )}
                        {item.selectedFlavor && (
                          <div>
                            <span className="text-neutral-400">Sabor: </span>
                            <span className="text-[#171717] font-medium">{item.selectedFlavor.name}</span>
                          </div>
                        )}
                        {item.selectedExtras.length > 0 && (
                          <div>
                            <span className="text-neutral-400">Adicionais: </span>
                            <span className="text-[#171717] font-medium">
                              {item.selectedExtras
                                .map((e) => `${e.extra.name} (${e.quantity}x)`)
                                .join(', ')}
                            </span>
                          </div>
                        )}
                        {item.notes && (
                          <div className="italic text-[#555555] bg-white px-2 py-1 rounded-lg mt-1 border border-[#E8E2D5] text-[11px]">
                            "{item.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition-colors"
                      aria-label={`Remover ${item.productName}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity and Price Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#F0EBE1]">
                    <div className="flex items-center gap-2 bg-white border border-[#E8E2D5] rounded-full px-2 py-0.5 shadow-2xs">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-0.5 text-neutral-400 hover:text-[#171717]"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-[#171717] tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-0.5 text-neutral-400 hover:text-[#171717]"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="block text-xs font-extrabold text-[#FF981B] tabular-nums">
                        R$ {item.totalPrice.toFixed(2).replace('.', ',')}
                      </span>
                      {item.quantity > 1 && (
                        <span className="block text-[10px] text-neutral-400 tabular-nums">
                          R$ {item.unitPrice.toFixed(2).replace('.', ',')} cada
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-5 sm:p-6 bg-[#FFFCF7] border-t border-[#F0EBE1] space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#555555]">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-[#171717] tabular-nums">
                    R$ {subtotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Taxa de entrega:</span>
                  <span>Calculada no checkout</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#171717] pt-2 border-t border-[#F0EBE1]">
                  <span>Subtotal atual:</span>
                  <span className="text-[#FF981B] font-extrabold text-base tabular-nums">
                    R$ {subtotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  className="w-full py-3.5 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF981B]"
                >
                  <span>Finalizar Pedido</span>
                  <ArrowRight className="w-4 h-4 text-[#171717]" />
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="text-xs text-[#555555] hover:text-[#171717] transition-colors"
                  >
                    Continuar comprando
                  </button>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    Limpar carrinho
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
