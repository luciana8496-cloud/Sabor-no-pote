import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.trim() !== '' &&
    supabaseAnonKey.trim() !== '' &&
    !supabaseUrl.includes('seu-projeto') &&
    !supabaseAnonKey.includes('sua-chave')
  );
};

// Create the Supabase client safely
export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export interface DiagnosticItem {
  name: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
  details?: string;
}

export interface FullDiagnosticReport {
  timestamp: string;
  isConfigured: boolean;
  overallStatus: 'connected' | 'not_configured' | 'partial_error' | 'connection_failed';
  items: DiagnosticItem[];
}

// Diagnostic test helper to verify backend connectivity, table existence, and RLS policies
export const runFullSupabaseDiagnostics = async (): Promise<FullDiagnosticReport> => {
  const timestamp = new Date().toISOString();
  const items: DiagnosticItem[] = [];

  // Check 1: Environment Variables
  const envConfigured = isSupabaseConfigured();
  if (!envConfigured) {
    items.push({
      name: 'Variáveis de Ambiente',
      status: 'error',
      message: 'VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas.',
      details: 'Defina as variáveis no arquivo .env ou no painel do ambiente com as credenciais do seu projeto Supabase.',
    });
    return {
      timestamp,
      isConfigured: false,
      overallStatus: 'not_configured',
      items,
    };
  }

  items.push({
    name: 'Variáveis de Ambiente',
    status: 'success',
    message: 'Variáveis de ambiente detectadas corretamente.',
    details: `URL: ${supabaseUrl?.replace(/(https:\/\/)(.{6}).*(\.supabase\.co)/, '$1$2***$3')}`,
  });

  // Check 2: Conexão REST e Configurações (store_settings)
  try {
    const { data: settingsData, error: settingsError } = await supabase
      .from('store_settings')
      .select('store_name, delivery_fee')
      .limit(1);

    if (settingsError) {
      items.push({
        name: 'Tabela store_settings',
        status: 'error',
        message: `Falha na tabela store_settings: ${settingsError.message}`,
        details: settingsError.code === '42P01' ? 'A tabela não existe. Execute o script supabase_setup.sql.' : settingsError.hint || settingsError.message,
      });
    } else {
      items.push({
        name: 'Tabela store_settings & RLS Público',
        status: 'success',
        message: 'Tabela acessível com sucesso pelo cliente anônimo.',
        details: settingsData && settingsData.length > 0 ? `Loja: "${settingsData[0].store_name}"` : 'Tabela vazia ou aguardando configuração.',
      });
    }
  } catch (err) {
    items.push({
      name: 'Conexão Supabase',
      status: 'error',
      message: err instanceof Error ? err.message : 'Falha na conexão de rede com o Supabase.',
    });
  }

  // Check 3: Categorias (categories)
  try {
    const { error: catError } = await supabase
      .from('categories')
      .select('id, name')
      .limit(1);

    if (catError) {
      items.push({
        name: 'Tabela categories',
        status: 'error',
        message: `Erro ao acessar categories: ${catError.message}`,
        details: catError.code === '42P01' ? 'Tabela inexistente. Execute o script supabase_setup.sql.' : undefined,
      });
    } else {
      items.push({
        name: 'Tabela categories',
        status: 'success',
        message: 'Tabela de categorias conectada e validada.',
      });
    }
  } catch (err) {
    items.push({
      name: 'Tabela categories',
      status: 'error',
      message: err instanceof Error ? err.message : 'Erro ao consultar categorias.',
    });
  }

  // Check 4: Produtos e Variações (products)
  try {
    const { error: prodError } = await supabase
      .from('products')
      .select('id, name, base_price')
      .limit(1);

    if (prodError) {
      items.push({
        name: 'Tabela products',
        status: 'error',
        message: `Erro ao acessar products: ${prodError.message}`,
        details: prodError.code === '42P01' ? 'Tabela inexistente. Execute o script supabase_setup.sql.' : undefined,
      });
    } else {
      items.push({
        name: 'Tabela products',
        status: 'success',
        message: 'Tabela de produtos conectada e validada.',
      });
    }
  } catch (err) {
    items.push({
      name: 'Tabela products',
      status: 'error',
      message: err instanceof Error ? err.message : 'Erro ao consultar produtos.',
    });
  }

  // Check 5: Tabela de Pedidos (orders)
  try {
    const { error: ordersError } = await supabase
      .from('orders')
      .select('id, status')
      .limit(1);

    if (ordersError) {
      items.push({
        name: 'Tabela orders & RLS',
        status: 'warning',
        message: `Aviso na tabela orders: ${ordersError.message}`,
        details: 'Acesso restrito por RLS. Leitura e gestão exclusivas da administradora autenticada. Criação pública segura via função RPC submit_order com cálculo no servidor.',
      });
    } else {
      items.push({
        name: 'Tabela orders',
        status: 'success',
        message: 'Tabela de pedidos conectada.',
      });
    }
  } catch (err) {
    items.push({
      name: 'Tabela orders',
      status: 'error',
      message: err instanceof Error ? err.message : 'Erro ao consultar pedidos.',
    });
  }

  // Check 6: Tabela de Administradores (admins)
  try {
    const { error: adminsError } = await supabase
      .from('admins')
      .select('id, email, role')
      .limit(1);

    if (adminsError) {
      items.push({
        name: 'Tabela admins & RLS',
        status: 'warning',
        message: 'Acesso restrito por RLS à tabela de administradores.',
        details: 'Somente a administradora autenticada pode ler seu registro de permissão.',
      });
    } else {
      items.push({
        name: 'Tabela admins',
        status: 'success',
        message: 'Tabela de administradores acessível pela sessão autenticada.',
      });
    }
  } catch (err) {
    items.push({
      name: 'Tabela admins',
      status: 'error',
      message: err instanceof Error ? err.message : 'Erro ao consultar tabela de administradores.',
    });
  }

  const hasErrors = items.some((i) => i.status === 'error');
  const overallStatus = hasErrors ? 'partial_error' : 'connected';

  return {
    timestamp,
    isConfigured: true,
    overallStatus,
    items,
  };
};
