import React, { useState } from 'react';
import { X, Save, Settings, Phone, Instagram, MapPin, Clock, DollarSign, RotateCcw } from 'lucide-react';
import { getStoreSettings, saveStoreSettings } from '../../services/storeService';
import { StoreSettings } from '../../types/store';

interface StoreSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreSettingsModal: React.FC<StoreSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<StoreSettings>(() => getStoreSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoreSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    const defaultSettings: StoreSettings = {
      storeName: 'SABOR NO POTE',
      whatsappNumber: null,
      instagramHandle: null,
      openingHours: null,
      address: null,
      deliveryFee: 5.00,
      isDeliveryAvailable: true,
      isPickupAvailable: true,
    };
    setSettings(defaultSettings);
    saveStoreSettings(defaultSettings);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="relative w-full max-w-lg bg-white border border-[#EAE3D2] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#F0EBE1] flex items-center justify-between bg-[#FFFCF7]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FFF7E9] border border-[#FFBF32]/40 flex items-center justify-center text-[#FF981B]">
              <Settings className="w-4 h-4 text-[#FF981B]" />
            </div>
            <div>
              <h2 id="settings-title" className="text-base font-bold text-[#171717] font-display">
                Configurações da Empresa
              </h2>
              <span className="text-[11px] text-[#555555]">
                Dados oficiais para contato, entrega e WhatsApp
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-[#171717] hover:bg-neutral-100 transition-colors"
            aria-label="Fechar configurações"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-white">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold text-center">
              ✓ Configurações salvas com sucesso!
            </div>
          )}

          {/* WhatsApp Oficial */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#FF981B]" />
              <span>WhatsApp Oficial para Recebimento de Pedidos</span>
            </label>
            <input
              type="text"
              value={settings.whatsappNumber || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  whatsappNumber: e.target.value.trim() ? e.target.value : null,
                })
              }
              placeholder="Ex: 5511999999999 (somente números com DDI + DDD)"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B]"
            />
            <p className="text-[11px] text-[#777777] mt-1">
              Deixe em branco para manter desconfigurado conforme o início do projeto.
            </p>
          </div>

          {/* Instagram */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1 flex items-center gap-1.5">
              <Instagram className="w-3.5 h-3.5 text-[#FF981B]" />
              <span>Instagram Oficial (Opcional)</span>
            </label>
            <input
              type="text"
              value={settings.instagramHandle || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  instagramHandle: e.target.value.trim() ? e.target.value : null,
                })
              }
              placeholder="Ex: @sabornopoteoficialdf"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B]"
            />
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#FF981B]" />
              <span>Endereço para Retirada (Opcional)</span>
            </label>
            <input
              type="text"
              value={settings.address || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  address: e.target.value.trim() ? e.target.value : null,
                })
              }
              placeholder="Ex: Rua Gourmet, 120 - Centro"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B]"
            />
          </div>

          {/* Horário */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FF981B]" />
              <span>Horário de Funcionamento (Opcional)</span>
            </label>
            <input
              type="text"
              value={settings.openingHours || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  openingHours: e.target.value.trim() ? e.target.value : null,
                })
              }
              placeholder="Ex: Terça a Domingo, das 13h às 21h"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B]"
            />
          </div>

          {/* Taxa de Entrega */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#FF981B]" />
              <span>Taxa de Entrega Padrão (R$)</span>
            </label>
            <input
              type="number"
              step="0.50"
              min="0"
              value={settings.deliveryFee}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  deliveryFee: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B]"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#F0EBE1] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-[#555555] hover:text-[#171717] text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Redefinir</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold text-xs uppercase tracking-wider transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
