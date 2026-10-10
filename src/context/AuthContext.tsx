import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AdminProfile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: 'owner' | 'manager' | 'admin';
}

interface AuthContextType {
  user: User | null;
  adminProfile: AdminProfile | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();

  // Verify if a user is an authorized administrator in public.admins
  const checkAdminPrivileges = async (userId: string): Promise<AdminProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }
      return data as AdminProfile;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    // Check existing active session on boot
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        setUser(currentSession.user);
        const profile = await checkAdminPrivileges(currentSession.user.id);
        if (profile) {
          setAdminProfile(profile);
        } else {
          // User exists in auth but has no record in admins table
          setAdminProfile(null);
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
        }
      }
      setIsLoading(false);
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          setUser(newSession.user);
          const profile = await checkAdminPrivileges(newSession.user.id);
          if (profile) {
            setAdminProfile(profile);
            setAuthError(null);
          } else {
            // Reject unauthorized user
            setAdminProfile(null);
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setAuthError('Acesso restrito. Este usuário não possui privilégios de administrador.');
          }
        } else {
          setUser(null);
          setAdminProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    if (!isConfigured) {
      const msg = 'Supabase não está configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        let friendlyMessage = 'E-mail ou senha incorretos.';
        if (error.message.includes('Invalid login credentials')) {
          friendlyMessage = 'Credenciais inválidas. Verifique seu e-mail e senha.';
        } else if (error.message.includes('Email not confirmed')) {
          friendlyMessage = 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
        } else if (error.message.includes('Too many requests')) {
          friendlyMessage = 'Muitas tentativas sem sucesso. Aguarde alguns instantes.';
        }
        setAuthError(friendlyMessage);
        return { success: false, error: friendlyMessage };
      }

      if (!data.user) {
        setAuthError('Não foi possível identificar o usuário.');
        return { success: false, error: 'Falha na autenticação.' };
      }

      // Validate administrator permissions via PostgreSQL RLS
      const profile = await checkAdminPrivileges(data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        const unauthorizedMsg = 'Acesso negado. Apenas a administradora autorizada pode acessar este painel.';
        setAuthError(unauthorizedMsg);
        return { success: false, error: unauthorizedMsg };
      }

      setAdminProfile(profile);
      return { success: true };
    } catch (err) {
      const genericMsg = err instanceof Error ? err.message : 'Erro ao realizar login.';
      setAuthError(genericMsg);
      return { success: false, error: genericMsg };
    }
  };

  const signOut = async () => {
    try {
      if (isConfigured) {
        await supabase.auth.signOut();
      }
    } finally {
      setUser(null);
      setSession(null);
      setAdminProfile(null);
      setAuthError(null);
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    if (!isConfigured) {
      const msg = 'Supabase não configurado no ambiente.';
      return { success: false, error: msg };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao solicitar recuperação de senha.',
      };
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        adminProfile,
        session,
        isAdmin: Boolean(adminProfile),
        isLoading,
        isConfigured,
        authError,
        signIn,
        signOut,
        resetPassword,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
