import React, { useState } from 'react';
import { Logo } from '../brand/Logo';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle2, ArrowLeft, Database, Key, Copy, Check } from 'lucide-react';

interface AdminLoginProps {
  onBackToPublic: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onBackToPublic }) => {
  const { signIn, resetPassword, isConfigured, authError, clearAuthError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await signIn(email, password);
      if (res.success) {
        // Redirection is handled reactively by AdminRouter
        window.history.pushState({}, '', '/admin/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setResetError(null);
    const res = await resetPassword(resetEmail);
    if (res.success) {
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        setResetModalOpen(false);
        setResetEmail('');
      }, 2500);
    } else {
      setResetError(res.error || 'Falha ao enviar e-mail de recuperação.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFCF7] flex flex-col justify-center items-center p-4 sm:p-6 relative select-none">
      {/* Back to Public Store link */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={onBackToPublic}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#555555] hover:text-[#171717] px-3.5 py-2 rounded-full bg-white border border-[#E8E2D5] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#FF981B]" />
          <span>Voltar ao Site Público</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-white border border-[#EAE3D2] rounded-3xl shadow-xl p-8 sm:p-10 relative">
        {/* Header / Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4">
            <Logo variant="icon" size="lg" />
          </div>

          <h1 className="text-2xl font-extrabold text-[#171717] font-display tracking-tight">
            Painel Administrativo
          </h1>
          <p className="mt-1 text-xs text-[#555555]">
            Acesse sua central de gerenciamento.
          </p>
        </div>

        {/* Supabase Environment Notice (when credentials are not yet configured) */}
        {!isConfigured && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FFF7E9] border border-[#FFBF32]/60 text-xs text-[#171717] space-y-2">
            <div className="flex items-start gap-2.5">
              <Database className="w-4 h-4 text-[#FF981B] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-[#171717]">
                  Backend Supabase em Configuração
                </span>
                <p className="text-[11px] text-[#555555] mt-0.5 leading-relaxed">
                  As credenciais <code className="bg-white px-1 py-0.5 rounded text-[#171717] border border-[#EAE3D2]">VITE_SUPABASE_URL</code> e{' '}
                  <code className="bg-white px-1 py-0.5 rounded text-[#171717] border border-[#EAE3D2]">VITE_SUPABASE_ANON_KEY</code> ainda não foram configuradas no ambiente.
                </p>
                <p className="text-[11px] text-[#FF981B] font-semibold mt-1.5">
                  Execute o script <span className="underline">supabase_setup.sql</span> no seu projeto Supabase para criar as tabelas e políticas RLS.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      fetch('/supabase_setup.sql')
                        .then((r) => r.text())
                        .then((txt) => {
                          navigator.clipboard.writeText(txt);
                          setSqlCopied(true);
                          setTimeout(() => setSqlCopied(false), 2500);
                        })
                        .catch(() => {
                          setSqlCopied(true);
                          setTimeout(() => setSqlCopied(false), 2500);
                        });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#FFBF32] text-[#171717] font-bold text-[11px] hover:bg-[#FFF2D6] transition-colors cursor-pointer"
                  >
                    {sqlCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-[#FF981B]" />}
                    <span>{sqlCopied ? 'Script SQL Copiado!' : 'Copiar Script SQL'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auth Error Banner */}
        {authError && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1">
              <span>{authError}</span>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* E-mail */}
          <div>
            <label className="block text-xs font-bold text-[#171717] mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (authError) clearAuthError();
                }}
                placeholder="administradora@sabornopote.com.br"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#E8E2D5] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B] transition-colors"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#171717]">
                Senha
              </label>
              <button
                type="button"
                onClick={() => setResetModalOpen(true)}
                className="text-[11px] text-[#FF981B] font-semibold hover:underline cursor-pointer"
              >
                Esqueceu sua senha?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (authError) clearAuthError();
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#FFFCF7] border border-[#E8E2D5] text-xs text-[#171717] placeholder-neutral-400 focus:outline-none focus:border-[#FF981B] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#171717] transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-md shadow-[#FFBF32]/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF981B]"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </div>
        </form>

        {/* Security Footer Notice */}
        <div className="mt-8 pt-5 border-t border-[#F0EBE1] text-center">
          <p className="text-[11px] text-[#777777] leading-relaxed">
            Área de acesso restrito com proteção por Row Level Security (RLS) no PostgreSQL.
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAE3D2] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#171717] font-display">
                Recuperação de Senha
              </h3>
              <button
                onClick={() => setResetModalOpen(false)}
                className="text-neutral-400 hover:text-[#171717] text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#555555] leading-relaxed">
              Informe seu e-mail cadastrado para receber o link seguro de redefinição de senha via Supabase Auth.
            </p>

            {resetSuccess ? (
              <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>Link de recuperação enviado com sucesso para o e-mail!</span>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-3">
                {resetError && (
                  <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-xs">
                    {resetError}
                  </div>
                )}
                <div>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu-email@dominio.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#FFFCF7] border border-[#E8E2D5] text-xs text-[#171717] focus:outline-none focus:border-[#FF981B]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-[#FFBF32] hover:bg-[#FFD447] text-[#171717] font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Enviar Link de Recuperação
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
