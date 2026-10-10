-- ==============================================================================
-- PROJETO: SABOR NO POTE — CONFIGURAÇÃO DO BACKEND SUPABASE
-- SCRIPT DE ESTRUTURAÇÃO DO BANCO DE DADOS POSTGRESQL COM ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Execute este script no SQL Editor do painel do seu projeto Supabase
-- (https://app.supabase.com/project/_/sql)

-- 1. Habilitar extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABELA DE ADMINISTRADORES (RBAC / CONTROLE DE ACESSO EXCLUSIVO)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Função de segurança executada no Postgres para verificar se o usuário autenticado é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admins
        WHERE user_id = auth.uid()
    );
$$;

-- ==============================================================================
-- 3. CONFIGURAÇÕES PÚBLICAS E PRIVADAS DA EMPRESA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT NOT NULL DEFAULT 'SABOR NO POTE',
    whatsapp_number TEXT,
    instagram_handle TEXT,
    address TEXT,
    opening_hours TEXT,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    is_delivery_available BOOLEAN NOT NULL DEFAULT true,
    is_pickup_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configuração padrão inicial se não existir
INSERT INTO public.store_settings (id, store_name, delivery_fee)
VALUES ('default', 'SABOR NO POTE', 5.00)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 4. CATEGORIAS DE PRODUTOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. PRODUTOS DO CARDÁPIO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    available BOOLEAN NOT NULL DEFAULT true,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Variações de Tamanho
CREATE TABLE IF NOT EXISTS public.product_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    description TEXT
);

-- Adicionais e Complementos
CREATE TABLE IF NOT EXISTS public.product_extras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    available BOOLEAN NOT NULL DEFAULT true,
    max_quantity INTEGER NOT NULL DEFAULT 5
);

-- ==============================================================================
-- 6. PEDIDOS E ITENS (HISTÓRICO OPERACIONAL)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_type TEXT NOT NULL CHECK (delivery_type IN ('delivery', 'pickup')),
    address_data JSONB,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'money', 'debit', 'credit')),
    needs_cash_change BOOLEAN DEFAULT false,
    cash_change_for NUMERIC(10, 2),
    subtotal NUMERIC(10, 2) NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
    order_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    configuration JSONB
);

-- ==============================================================================
-- 7. ESTOQUE E GESTÃO FINANCEIRA (PRÉ-ESTRUTURADOS PARA ETAPAS SUBSEQUENTES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT,
    quantity NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    unit TEXT NOT NULL DEFAULT 'un',
    min_quantity NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    supplier_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) — SEGURANÇA AVANÇADA
-- ==============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- 8.1 Políticas para ADMINS
-- Usuários autenticados podem consultar se são admins
CREATE POLICY "Admins podem visualizar administradores"
    ON public.admins FOR SELECT
    TO authenticated
    USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "Apenas owners podem cadastrar novos admins"
    ON public.admins FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 8.2 Políticas para STORE_SETTINGS
-- Público pode ler as configurações para exibir no site
CREATE POLICY "Público pode ler configurações da loja"
    ON public.store_settings FOR SELECT
    TO anon, authenticated
    USING (true);

-- Apenas admins podem alterar configurações
CREATE POLICY "Admins podem alterar configurações"
    ON public.store_settings FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 8.3 Políticas para CATEGORIES
CREATE POLICY "Público pode visualizar categorias ativas"
    ON public.categories FOR SELECT
    TO anon, authenticated
    USING (active = true OR public.is_admin());

CREATE POLICY "Admins podem gerenciar categorias"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 8.4 Políticas para PRODUCTS
CREATE POLICY "Público pode visualizar produtos disponíveis"
    ON public.products FOR SELECT
    TO anon, authenticated
    USING (available = true OR public.is_admin());

CREATE POLICY "Admins podem gerenciar produtos"
    ON public.products FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 8.5 Políticas para VARIAÇÕES E ADICIONAIS
CREATE POLICY "Público pode ver variações de produtos"
    ON public.product_variations FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Admins podem gerenciar variações"
    ON public.product_variations FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Público pode ver adicionais de produtos"
    ON public.product_extras FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Admins podem gerenciar adicionais"
    ON public.product_extras FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 8.6 Políticas para ORDERS
-- Clientes podem criar pedidos sem login
CREATE POLICY "Clientes podem criar pedidos"
    ON public.orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Apenas administradores autorizados podem listar, ler e alterar pedidos
CREATE POLICY "Admins podem gerenciar todos os pedidos"
    ON public.orders FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Clientes podem criar itens do pedido"
    ON public.order_items FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Admins podem gerenciar todos os itens do pedido"
    ON public.order_items FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 8.7 Políticas para ESTOQUE E FINANCEIRO (ZERO ACESSO PÚBLICO)
CREATE POLICY "Acesso exclusivo de administradores ao estoque"
    ON public.inventory_items FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Acesso exclusivo de administradores ao financeiro"
    ON public.financial_transactions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==============================================================================
-- 9. INSTRUÇÃO PARA CADASTRAR O PRIMEIRO ADMINISTRADOR (PROPRIETÁRIA):
-- ==============================================================================
-- 1. Crie o usuário no Supabase Auth (Authentication -> Users -> Add User)
-- 2. Copie o UID gerado para o usuário
-- 3. Execute o comando abaixo substituindo o 'UID_DO_USUARIO' e o e-mail:
--
-- INSERT INTO public.admins (user_id, email, name, role)
-- VALUES ('SEU_UID_DO_AUTH_AQUI', 'contato@sabornopote.com.br', 'Proprietária Sabor no Pote', 'owner');
