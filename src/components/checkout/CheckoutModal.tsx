import React, { useState } from 'react';
import {
  X,
  MapPin,
  Store,
  CreditCard,
  Banknote,
  QrCode,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  ArrowLeft,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import {
  DeliveryType,
  PaymentMethod,
  DeliveryAddress,
  CustomerData,
} from '../../types/store';
import { getStoreSettings, saveOrder } from '../../services/storeService';

interface CheckoutModalProps {
  onOpenSettings: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ onOpenSettings }) => {
  const {
    items,
    subtotal,
    deliveryFee,
    total,
    clearCart,
    isCheckoutOpen,
    setIsCheckoutOpen,
    setIsCartOpen,
  } = useCart();

  const [customer, setCustomer] = useState<CustomerData>({ name: '', phone: '' });
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [address, setAddress] = useState<DeliveryAddress>({
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    referencePoint: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [needsCashChange, setNeedsCashChange] = useState<boolean>(false);
  const [cashChangeFor, setCashChangeFor] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');

  const [isLoadingCep, setIsLoadingCep] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showOrderSubmittedModal, setShowOrderSubmittedModal] = useState<boolean>(false);
  const [lastGeneratedWhatsAppUrl, setLastGeneratedWhatsAppUrl] = useState<string | null>(null);

  if (!isCheckoutOpen) return null;

  const storeSettings = getStoreSettings();
  const currentTotal = total(deliveryType);

  const handleCepBlur = async () => {
    const cleanCep = address.cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setAddress((prev) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
          }));
          setFormErrors((prev) => {
            const copy = { ...prev };
            delete copy.cep;
            return copy;
          });
        }
      } catch {
        // Fallback silently
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!customer.name.trim()) {
      errors.name = 'Por favor, informe seu nome completo.';
    }

    const cleanPhone = customer.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.phone = 'Informe um telefone válido com DDD (mínimo 10 dígitos).';
    }

    if (deliveryType === 'delivery') {
      if (!address.street.trim()) {
        errors.street = 'Informe o logradouro / endereço.';
      }
      if (!address.number.trim()) {
        errors.number = 'Informe o número.';
      }
      if (!address.neighborhood.trim()) {
        errors.neighborhood = 'Informe o bairro.';
      }
    }

    if (paymentMethod === 'money' && needsCashChange) {
      const changeVal = parseFloat(cashChangeFor.replace(',', '.'));
      if (isNaN(changeVal) || changeVal <= currentTotal) {
        errors.cashChangeFor = `O valor para troco deve ser maior que o total (R$ ${currentTotal.toFixed(2).replace('.', ',')}).`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateWhatsAppMessage = () => {
    let msg = `*SABOR NO POTE*\n*NOVO PEDIDO*\n\n`;
    msg += `*Nome do cliente:* ${customer.name.trim()}\n`;
    msg += `*Telefone:* ${customer.phone.trim()}\n\n`;

    msg += `*PRODUTOS:*\n`;
    items.forEach((item, index) => {
      msg += `\n${index + 1}. *${item.productName}*\n`;
      msg += `   Quantidade: ${item.quantity}\n`;
      if (item.selectedSize) {
        msg += `   Tamanho: ${item.selectedSize.name}\n`;
      }
      if (item.selectedFlavor) {
        msg += `   Sabor: ${item.selectedFlavor.name}\n`;
      }
      if (item.selectedExtras.length > 0) {
        const extrasStr = item.selectedExtras
          .map((e) => `${e.extra.name} (${e.quantity}x)`)
          .join(', ');
        msg += `   Adicionais: ${extrasStr}\n`;
      }
      if (item.notes) {
        msg += `   Observações: ${item.notes}\n`;
      }
      msg += `   Valor: R$ ${item.totalPrice.toFixed(2).replace('.', ',')}\n`;
    });

    msg += `\n*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    if (deliveryType === 'delivery') {
      msg += `*Taxa de entrega:* R$ ${deliveryFee.toFixed(2).replace('.', ',')}\n`;
    } else {
      msg += `*Taxa de entrega:* R$ 0,00 (Retirada)\n`;
    }
    msg += `*Total:* R$ ${currentTotal.toFixed(2).replace('.', ',')}\n\n`;

    msg += `*FORMA DE RECEBIMENTO:*\n`;
    if (deliveryType === 'delivery') {
      msg += `Entrega\n\n`;
      msg += `*ENDEREÇO:*\n`;
      msg += `${address.street}, Nº ${address.number}\n`;
      if (address.complement?.trim()) {
        msg += `Complemento: ${address.complement.trim()}\n`;
      }
      msg += `Bairro: ${address.neighborhood}\n`;
      if (address.cep.trim()) {
        msg += `CEP: ${address.cep.trim()}\n`;
      }
      if (address.referencePoint?.trim()) {
        msg += `Ponto de referência: ${address.referencePoint.trim()}\n`;
      }
    } else {
      msg += `Retirada no local\n`;
      if (storeSettings.address) {
        msg += `Estabelecimento: ${storeSettings.address}\n`;
      }
    }

    msg += `\n*FORMA DE PAGAMENTO:*\n`;
    if (paymentMethod === 'pix') {
      msg += `PIX\n`;
    } else if (paymentMethod === 'money') {
      if (needsCashChange && cashChangeFor.trim()) {
        msg += `Dinheiro (Troco para R$ ${cashChangeFor.trim()})\n`;
      } else {
        msg += `Dinheiro (Sem troco)\n`;
      }
    } else if (paymentMethod === 'debit') {
      msg += `Cartão de Débito (levar maquininha)\n`;
    } else if (paymentMethod === 'credit') {
      msg += `Cartão de Crédito (levar maquininha)\n`;
    }

    if (orderNotes.trim()) {
      msg += `\n*OBSERVAÇÕES:*\n${orderNotes.trim()}\n`;
    }

    msg += `\n_Atenção: O envio desta mensagem representa uma solicitação de pedido e aguarda confirmação da nossa equipe._`;

    return msg;
  };

  const handleFinalizeOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      setFormErrors((prev) => ({ ...prev, cart: 'Seu carrinho está vazio.' }));
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (!storeSettings.whatsappNumber || storeSettings.whatsappNumber.trim() === '') {
      setFormErrors((prev) => ({
        ...prev,
        whatsapp:
          'A finalização pelo WhatsApp ainda não está disponível porque o número oficial da empresa ainda não foi configurado.',
      }));
      return;
    }

    // Persist order with configuration and items to Supabase / database
    saveOrder(
      {
        customer,
        deliveryType,
        address: deliveryType === 'delivery' ? address : undefined,
        paymentMethod,
        needsCashChange,
        cashChangeFor,
        orderNotes,
      },
      items,
      subtotal,
      deliveryType === 'delivery' ? deliveryFee : 0,
      currentTotal
    ).catch((err) => console.warn('Erro ao registrar pedido:', err));

    const cleanNumber = storeSettings.whatsappNumber.replace(/\D/g, '');
    const message = generateWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodedMessage}`;

    setLastGeneratedWhatsAppUrl(whatsappUrl);
    setShowOrderSubmittedModal(true);
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs p-4 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
    >
      <div className="relative w-full max-w-3xl bg-white border border-[#EAE3D2] rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-[#F0EBE1] flex items-center justify-between bg-[#FFFCF7]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsCheckoutOpen(false);
                setIsCartOpen(true);
              }}
              className="p-1.5 rounded-full text-neutral-500 hover:text-[#171717] hover:bg-neutral-100 transition-colors"
              aria-label="Voltar para o carrinho"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 id="checkout-title" className="text-lg sm:text-xl font-bold text-[#171717] font-display">
                Finalização do Pedido
              </h2>
              <span className="text-xs text-[#555555]">
                Sem necessidade de criar conta • Solicitação rápida via WhatsApp
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="p-2 rounded-full text-neutral-400 hover:text-[#171717] hover:bg-neutral-100 transition-colors"
            aria-label="Fechar checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFinalizeOrder} className="p-5 sm:p-8 space-y-7 max-h-[80vh] overflow-y-auto bg-white">
          {/* AVISO DO WHATSAPP NÃO CONFIGURADO */}
          {(!storeSettings.whatsappNumber || storeSettings.whatsappNumber.trim() === '') && (
            <div className="p-4 rounded-2xl bg-[#FFF7E9] border border-[#FFBF32]/70 text-[#171717] space-y-2">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#FF981B] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
                    Aviso: WhatsApp Oficial em Configuração
                  </h3>
                  <p className="text-xs text-[#555555] mt-1 leading-relaxed">
                    A finalização pelo WhatsApp ainda não está disponível porque o número oficial da empresa ainda não foi configurado.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="mt-2 text-xs font-bold text-[#FF981B] hover:underline cursor-pointer"
                  >
                    Abrir Configuração do WhatsApp da Empresa para Testes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 1. DADOS DO CLIENTE */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF981B] mb-3">
              1. Seus Dados
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Seu nome"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs text-[#171717] placeholder-neutral-400 focus:outline-none transition-colors ${
                    formErrors.name ? 'border-red-500' : 'border-[#E8E2D5] focus:border-[#FF981B]'
                  }`}
                />
                {formErrors.name && (
                  <span className="text-xs text-red-500 mt-1 block">{formErrors.name}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Telefone / WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  required
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs text-[#171717] placeholder-neutral-400 focus:outline-none transition-colors ${
                    formErrors.phone ? 'border-red-500' : 'border-[#E8E2D5] focus:border-[#FF981B]'
                  }`}
                />
                {formErrors.phone && (
                  <span className="text-xs text-red-500 mt-1 block">{formErrors.phone}</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. FORMA DE RECEBIMENTO */}
          <div className="pt-6 border-t border-[#F0EBE1]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF981B] mb-3">
              2. Forma de Recebimento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                  deliveryType === 'delivery'
                    ? 'bg-[#FFF7E9] border-[#FF981B] text-[#171717] shadow-xs'
                    : 'bg-white border-[#E8E2D5] text-[#555555] hover:border-[#FFBF32]'
                }`}
              >
                <MapPin className="w-5 h-5 text-[#FF981B] shrink-0" />
                <div>
                  <span className="block text-xs font-bold text-[#171717]">Entrega em Domicílio</span>
                  <span className="block text-[11px] text-[#555555] mt-0.5">
                    Taxa: R$ {deliveryFee.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                  deliveryType === 'pickup'
                    ? 'bg-[#FFF7E9] border-[#FF981B] text-[#171717] shadow-xs'
                    : 'bg-white border-[#E8E2D5] text-[#555555] hover:border-[#FFBF32]'
                }`}
              >
                <Store className="w-5 h-5 text-[#FF981B] shrink-0" />
                <div>
                  <span className="block text-xs font-bold text-[#171717]">Retirada no Local</span>
                  <span className="block text-[11px] text-[#FF981B] font-semibold mt-0.5">Sem taxa de entrega</span>
                </div>
              </button>
            </div>

            {/* SE ENTREGA */}
            {deliveryType === 'delivery' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFCF7] border border-[#EAE3D2] space-y-3.5">
                <span className="block text-xs font-bold text-[#171717]">
                  Endereço para Entrega
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#555555] mb-1">CEP (Opcional)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={address.cep}
                        onChange={(e) => setAddress({ ...address, cep: e.target.value })}
                        onBlur={handleCepBlur}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B]"
                      />
                      {isLoadingCep && (
                        <span className="absolute right-3 top-2 text-xs text-[#FF981B]">...</span>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-[#555555] mb-1">Rua / Logradouro *</label>
                    <input
                      type="text"
                      required
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                      placeholder="Ex: Rua das Flores"
                      className={`w-full px-3 py-2 rounded-xl bg-white border text-xs text-[#171717] placeholder-neutral-400 focus:outline-none ${
                        formErrors.street ? 'border-red-500' : 'border-[#E8E2D5] focus:border-[#FF981B]'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#555555] mb-1">Número *</label>
                    <input
                      type="text"
                      required
                      value={address.number}
                      onChange={(e) => setAddress({ ...address, number: e.target.value })}
                      placeholder="Ex: 123"
                      className={`w-full px-3 py-2 rounded-xl bg-white border text-xs text-[#171717] placeholder-neutral-400 focus:outline-none ${
                        formErrors.number ? 'border-red-500' : 'border-[#E8E2D5] focus:border-[#FF981B]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#555555] mb-1">Complemento</label>
                    <input
                      type="text"
                      value={address.complement || ''}
                      onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                      placeholder="Apto 42"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#555555] mb-1">Bairro *</label>
                    <input
                      type="text"
                      required
                      value={address.neighborhood}
                      onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                      placeholder="Ex: Centro"
                      className={`w-full px-3 py-2 rounded-xl bg-white border text-xs text-[#171717] placeholder-neutral-400 focus:outline-none ${
                        formErrors.neighborhood ? 'border-red-500' : 'border-[#E8E2D5] focus:border-[#FF981B]'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#555555] mb-1">
                    Ponto de Referência (Opcional)
                  </label>
                  <input
                    type="text"
                    value={address.referencePoint || ''}
                    onChange={(e) => setAddress({ ...address, referencePoint: e.target.value })}
                    placeholder="Ex: Próximo à praça principal"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B]"
                  />
                </div>
              </div>
            )}

            {/* SE RETIRADA */}
            {deliveryType === 'pickup' && (
              <div className="p-4 rounded-2xl bg-[#FFF7E9] border border-[#FFBF32]/50 text-[#171717] text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-[#FF981B] font-bold">
                  <Store className="w-4 h-4" />
                  <span>Instruções de Retirada</span>
                </div>
                <p className="text-[#555555] leading-relaxed">
                  {storeSettings.address
                    ? `Retirada no endereço: ${storeSettings.address}`
                    : 'A retirada é realizada diretamente no estabelecimento. O endereço exato será confirmado após o envio da solicitação no WhatsApp.'}
                </p>
              </div>
            )}
          </div>

          {/* 3. FORMA DE PAGAMENTO */}
          <div className="pt-6 border-t border-[#F0EBE1]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF981B] mb-3">
              3. Forma de Pagamento
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  paymentMethod === 'pix'
                    ? 'bg-[#FFF7E9] border-[#FF981B] text-[#171717] shadow-xs'
                    : 'bg-white border-[#E8E2D5] text-[#555555] hover:border-[#FFBF32]'
                }`}
              >
                <QrCode className="w-5 h-5 text-[#FF981B] mb-1" />
                <span className="text-xs font-bold">PIX</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('money')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  paymentMethod === 'money'
                    ? 'bg-[#FFF7E9] border-[#FF981B] text-[#171717] shadow-xs'
                    : 'bg-white border-[#E8E2D5] text-[#555555] hover:border-[#FFBF32]'
                }`}
              >
                <Banknote className="w-5 h-5 text-[#FF981B] mb-1" />
                <span className="text-xs font-bold">Dinheiro</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('debit')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  paymentMethod === 'debit'
                    ? 'bg-[#FFF7E9] border-[#FF981B] text-[#171717] shadow-xs'
                    : 'bg-white border-[#E8E2D5] text-[#555555] hover:border-[#FFBF32]'
                }`}
              >
                <CreditCard className="w-5 h-5 text-[#FF981B] mb-1" />
                <span className="text-xs font-bold">Débito</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  paymentMethod === 'credit'
                    ? 'bg-[#FFF7E9] border-[#FF981B] text-[#171717] shadow-xs'
                    : 'bg-white border-[#E8E2D5] text-[#555555] hover:border-[#FFBF32]'
                }`}
              >
                <CreditCard className="w-5 h-5 text-[#FF981B] mb-1" />
                <span className="text-xs font-bold">Crédito</span>
              </button>
            </div>

            {/* SE DINHEIRO */}
            {paymentMethod === 'money' && (
              <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#EAE3D2] space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="needs-change"
                    checked={needsCashChange}
                    onChange={(e) => setNeedsCashChange(e.target.checked)}
                    className="w-4 h-4 rounded text-[#FF981B] border-neutral-300 focus:ring-[#FF981B]"
                  />
                  <label htmlFor="needs-change" className="text-xs font-medium text-[#171717]">
                    Precisa de troco?
                  </label>
                </div>

                {needsCashChange && (
                  <div>
                    <label className="block text-[11px] text-[#555555] mb-1">
                      Troco para quanto? (R$)
                    </label>
                    <input
                      type="text"
                      value={cashChangeFor}
                      onChange={(e) => setCashChangeFor(e.target.value)}
                      placeholder="Ex: 50,00"
                      className="w-full sm:w-48 px-3 py-1.5 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B]"
                    />
                    {formErrors.cashChangeFor && (
                      <span className="text-xs text-red-500 mt-1 block">
                        {formErrors.cashChangeFor}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. OBSERVAÇÕES */}
          <div className="pt-6 border-t border-[#F0EBE1]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF981B] mb-2">
              4. Observações do Pedido (Opcional)
            </h3>
            <textarea
              rows={2}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Instruções de entrega, recados para o pedido..."
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B] resize-none"
            />
          </div>

          {/* 5. RESUMO COMPLETO */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFCF7] border border-[#EAE3D2] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
              Resumo do Pedido
            </h3>

            <div className="divide-y divide-[#F0EBE1] text-xs">
              {items.map((item) => (
                <div key={item.id} className="py-2 flex justify-between gap-2">
                  <div className="text-[#555555]">
                    <span className="font-semibold text-[#171717]">
                      {item.quantity}x {item.productName}
                    </span>
                    {item.selectedSize && ` (${item.selectedSize.name})`}
                    {item.selectedFlavor && ` • ${item.selectedFlavor.name}`}
                  </div>
                  <span className="text-[#171717] font-semibold tabular-nums shrink-0">
                    R$ {item.totalPrice.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#F0EBE1] space-y-1 text-xs">
              <div className="flex justify-between text-[#555555]">
                <span>Subtotal:</span>
                <span className="tabular-nums">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-[#555555]">
                <span>Taxa de Entrega:</span>
                <span className="tabular-nums">
                  {deliveryType === 'delivery'
                    ? `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`
                    : 'Grátis (Retirada)'}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#171717] pt-2 border-t border-[#F0EBE1]">
                <span>Total a Pagar:</span>
                <span className="text-[#FF981B] text-base tabular-nums font-extrabold">
                  R$ {currentTotal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="space-y-3">
            <button
              type="submit"
              className="w-full py-4 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-md shadow-[#FFBF32]/30 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF981B]"
            >
              <MessageCircle className="w-5 h-5 text-[#171717]" />
              <span>Enviar Pedido pelo WhatsApp</span>
            </button>

            <p className="text-[11px] text-[#777777] text-center leading-relaxed">
              * O envio pelo WhatsApp representa uma solicitação de pedido e aguarda confirmação da equipe.
            </p>
          </div>
        </form>
      </div>

      {/* CONFIRMATION MODAL */}
      {showOrderSubmittedModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAE3D2] rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-[#FFF7E9] border border-[#FFBF32] flex items-center justify-center mx-auto text-[#FF981B]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-[#171717] font-display">
              Solicitação Enviada com Sucesso!
            </h3>

            <p className="text-xs text-[#555555] leading-relaxed">
              Sua mensagem com todos os detalhes foi encaminhada para o WhatsApp oficial do Sabor no Pote.
            </p>

            <div className="p-3.5 rounded-2xl bg-[#FFFCF7] border border-[#EAE3D2] text-[11px] text-[#555555] text-left">
              <span className="font-bold text-[#FF981B] block mb-1">Lembrete importante:</span>
              O envio pelo WhatsApp representa uma solicitação de pedido. Aguarde a mensagem de confirmação da nossa equipe para validação do pedido e pagamento.
            </div>

            <div className="space-y-2 pt-2">
              {lastGeneratedWhatsAppUrl && (
                <a
                  href={lastGeneratedWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Reabrir Conversa no WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowOrderSubmittedModal(false);
                  clearCart();
                  setIsCheckoutOpen(false);
                }}
                className="w-full py-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-[#171717] font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Concluir e Voltar à Loja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
