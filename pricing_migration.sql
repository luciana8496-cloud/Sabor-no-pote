-- ==============================================================================
-- MIGRAÇÃO: MÓDULO DE PRECIFICAÇÃO E FICHA TÉCNICA
-- Projeto: Sabor no Pote
-- ==============================================================================

BEGIN;

-- 0. GARANTIR CHAVE ÚNICA COMPOSTA EM PRODUCT_VARIATIONS

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.product_variations'::regclass
          AND conname = 'uq_product_variation_id_product'
    ) THEN
        ALTER TABLE public.product_variations
        ADD CONSTRAINT uq_product_variation_id_product
        UNIQUE (id, product_id);
    END IF;
END $$;


-- 1. TABELA DE INGREDIENTES E EMBALAGENS

CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,
    category TEXT,

    purchase_quantity NUMERIC(12, 3) NOT NULL
        CHECK (purchase_quantity > 0),

    purchase_unit TEXT NOT NULL
        CHECK (purchase_unit IN ('kg', 'g', 'L', 'ml', 'un')),

    purchase_price NUMERIC(10, 2) NOT NULL
        CHECK (purchase_price >= 0),

    unit_cost NUMERIC(18, 6) GENERATED ALWAYS AS (
        purchase_price / NULLIF(
            CASE
                WHEN purchase_unit = 'kg'
                    THEN purchase_quantity * 1000
                WHEN purchase_unit = 'L'
                    THEN purchase_quantity * 1000
                ELSE purchase_quantity
            END,
            0
        )
    ) STORED,

    supplier TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 2. TABELA DE FICHAS TÉCNICAS

CREATE TABLE IF NOT EXISTS public.product_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL
        REFERENCES public.products(id)
        ON DELETE CASCADE,

    variation_id UUID
        REFERENCES public.product_variations(id)
        ON DELETE RESTRICT,

    ingredient_id UUID NOT NULL
        REFERENCES public.ingredients(id)
        ON DELETE CASCADE,

    quantity_used NUMERIC(12, 4) NOT NULL
        CHECK (quantity_used > 0),

    unit TEXT NOT NULL
        CHECK (unit IN ('g', 'ml', 'un')),

    waste_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00
        CHECK (waste_percentage >= 0 AND waste_percentage < 100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_recipe_variation_product
        FOREIGN KEY (variation_id, product_id)
        REFERENCES public.product_variations(id, product_id)
        ON DELETE RESTRICT
);


-- 3. TABELA DE DESPESAS DE PRODUÇÃO

CREATE TABLE IF NOT EXISTS public.production_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    type TEXT NOT NULL
        CHECK (
            type IN (
                'fixed_monthly',
                'variable_batch',
                'percentage'
            )
        ),

    amount NUMERIC(10, 2) NOT NULL
        CHECK (amount >= 0),

    allocation_basis TEXT NOT NULL DEFAULT 'per_unit'
        CHECK (
            allocation_basis IN (
                'per_unit',
                'percentage_sale',
                'fixed'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 4. TABELA DE CONFIGURAÇÃO DE PRECIFICAÇÃO

CREATE TABLE IF NOT EXISTS public.product_pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    product_id UUID NOT NULL
        REFERENCES public.products(id)
        ON DELETE CASCADE,

    variation_id UUID
        REFERENCES public.product_variations(id)
        ON DELETE RESTRICT,

    packaging_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00
        CHECK (packaging_cost >= 0),

    desired_margin NUMERIC(5, 2) NOT NULL DEFAULT 30.00
        CHECK (desired_margin >= 0 AND desired_margin < 100),

    pricing_method TEXT NOT NULL DEFAULT 'margin'
        CHECK (pricing_method IN ('margin', 'markup')),

    card_fee_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00
        CHECK (card_fee_percentage >= 0),

    suggested_price NUMERIC(10, 2) DEFAULT 0.00,

    current_catalog_price NUMERIC(10, 2) DEFAULT 0.00,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_pricing_variation_product
        FOREIGN KEY (variation_id, product_id)
        REFERENCES public.product_variations(id, product_id)
        ON DELETE RESTRICT
);


-- 5. ÍNDICES PARA EVITAR CONFIGURAÇÕES DUPLICADAS

CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_config_base
    ON public.product_pricing_config (product_id)
    WHERE variation_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_config_variation
    ON public.product_pricing_config (product_id, variation_id)
    WHERE variation_id IS NOT NULL;


-- 6. HABILITAR SEGURANÇA RLS

ALTER TABLE public.ingredients
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_recipes
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.production_expenses
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_pricing_config
    ENABLE ROW LEVEL SECURITY;


-- 7. REMOVER POLÍTICAS ANTERIORES COM OS MESMOS NOMES

DROP POLICY IF EXISTS
    "Acesso exclusivo aos insumos para admin"
    ON public.ingredients;

DROP POLICY IF EXISTS
    "Acesso exclusivo às receitas para admin"
    ON public.product_recipes;

DROP POLICY IF EXISTS
    "Acesso exclusivo às despesas para admin"
    ON public.production_expenses;

DROP POLICY IF EXISTS
    "Acesso exclusivo à precificação para admin"
    ON public.product_pricing_config;


-- 8. CRIAR POLÍTICAS DE ACESSO EXCLUSIVO À ADMINISTRADORA

CREATE POLICY "Acesso exclusivo aos insumos para admin"
    ON public.ingredients
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


CREATE POLICY "Acesso exclusivo às receitas para admin"
    ON public.product_recipes
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


CREATE POLICY "Acesso exclusivo às despesas para admin"
    ON public.production_expenses
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


CREATE POLICY "Acesso exclusivo à precificação para admin"
    ON public.product_pricing_config
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


COMMIT;

-- ==============================================================================
-- FIM DA MIGRAÇÃO
-- ==============================================================================