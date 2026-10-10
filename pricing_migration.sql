-- ==============================================================================
-- MIGRAÇÃO EXCLUSIVA: MÓDULO DE PRECIFICAÇÃO E FICHA TÉCNICA
-- Projeto: Sabor no Pote
-- Descrição: Cria as tabelas de insumos, receitas, despesas de produção e 
--            configurações de precificação, ativando RLS com acesso restrito à proprietária.
-- IMPORTANTE: Este script utiliza IF NOT EXISTS e não afeta tabelas ou dados existentes.
-- ==============================================================================

-- 1. CRIAR TABELA DE INSUMOS E EMBALAGENS
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    purchase_quantity NUMERIC(12, 3) NOT NULL CHECK (purchase_quantity > 0),
    purchase_unit TEXT NOT NULL CHECK (purchase_unit IN ('kg', 'g', 'L', 'ml', 'un')),
    purchase_price NUMERIC(10, 2) NOT NULL CHECK (purchase_price >= 0),
    unit_cost NUMERIC(12, 4) GENERATED ALWAYS AS (purchase_price / NULLIF(purchase_quantity, 0)) STORED,
    supplier TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CRIAR TABELA DE FICHAS TÉCNICAS (RECEITAS)
CREATE TABLE IF NOT EXISTS public.product_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    variation_id UUID REFERENCES public.product_variations(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE NOT NULL,
    quantity_used NUMERIC(12, 4) NOT NULL CHECK (quantity_used > 0),
    unit TEXT NOT NULL CHECK (unit IN ('g', 'ml', 'un')),
    waste_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (waste_percentage >= 0 AND waste_percentage < 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CRIAR TABELA DE DESPESAS DE PRODUÇÃO
CREATE TABLE IF NOT EXISTS public.production_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('fixed_monthly', 'variable_batch', 'percentage')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    allocation_basis TEXT NOT NULL DEFAULT 'per_unit' CHECK (allocation_basis IN ('per_unit', 'percentage_sale', 'fixed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CRIAR TABELA DE CONFIGURAÇÃO DE PRECIFICAÇÃO DOS PRODUTOS
CREATE TABLE IF NOT EXISTS public.product_pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    variation_id UUID REFERENCES public.product_variations(id) ON DELETE CASCADE,
    packaging_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (packaging_cost >= 0),
    desired_margin NUMERIC(5, 2) NOT NULL DEFAULT 30.00 CHECK (desired_margin >= 0 AND desired_margin < 100),
    pricing_method TEXT NOT NULL DEFAULT 'margin' CHECK (pricing_method IN ('margin', 'markup')),
    card_fee_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (card_fee_percentage >= 0),
    suggested_price NUMERIC(10, 2) DEFAULT 0.00,
    current_catalog_price NUMERIC(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, variation_id)
);

-- 5. HABILITAR ROW LEVEL SECURITY (RLS) NAS NOVAS TABELAS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pricing_config ENABLE ROW LEVEL SECURITY;

-- 6. REMOVER POLÍTICAS ANTIGAS CASO EXISTAM (EVITAR CONFLITOS)
DROP POLICY IF EXISTS "Acesso exclusivo aos insumos para admin" ON public.ingredients;
DROP POLICY IF EXISTS "Acesso exclusivo às receitas para admin" ON public.product_recipes;
DROP POLICY IF EXISTS "Acesso exclusivo às despesas para admin" ON public.production_expenses;
DROP POLICY IF EXISTS "Acesso exclusivo à precificação para admin" ON public.product_pricing_config;

-- 7. CRIAR POLÍTICAS RLS RESTRITAS À PROPRIETÁRIA (PUBLIC.IS_ADMIN())
CREATE POLICY "Acesso exclusivo aos insumos para admin"
    ON public.ingredients FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Acesso exclusivo às receitas para admin"
    ON public.product_recipes FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Acesso exclusivo às despesas para admin"
    ON public.production_expenses FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Acesso exclusivo à precificação para admin"
    ON public.product_pricing_config FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==============================================================================
-- FIM DA MIGRAÇÃO DO MÓDULO DE PRECIFICAÇÃO
-- ==============================================================================
