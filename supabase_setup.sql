-- ==============================================================================
-- PROJETO: SABOR NO POTE — CONFIGURAÇÃO DO BACKEND SUPABASE
-- SCRIPT DE ESTRUTURAÇÃO DO BANCO DE DADOS POSTGRESQL COM ROW LEVEL SECURITY (RLS)
-- REVISÃO FINAL DE SEGURANÇA E PROTEÇÃO CONTRA ADULTERAÇÃO
-- ==============================================================================
-- Execute este script no SQL Editor do painel do seu projeto Supabase:
-- (https://app.supabase.com/project/_/sql)
--
-- PRINCIPAIS DIRETRIZES DE SEGURANÇA IMPLEMENTADAS:
-- 1. ADMINISTRADORA EXCLUSIVA:
--    - Remoção total da função pública register_initial_owner().
--    - Cadastro da proprietária exclusivamente pelo SQL Editor do Supabase.
--    - Bloqueio irrestrito no RLS impedindo que qualquer usuário autenticado ou
--      visitante insira, altere ou remova registros na tabela public.admins.
--
-- 2. FUNÇÃO IS_ADMIN() BLINDADA:
--    - SECURITY DEFINER com search_path seguro fixado em (pg_catalog, public, pg_temp).
--    - Referência explícita e qualificada a public.admins com checagem de role='owner' e is_active=true.
--    - Permissões de execução revogadas de PUBLIC e anon; concedida apenas a authenticated.
--
-- 3. PROCESSAMENTO E CÁLCULO SEGURO DE PEDIDOS (RPC SUBMIT_ORDER):
--    - Sem permissão de INSERT direto do cliente nas tabelas orders e order_items.
--    - Validação rígida de integridade:
--      * Categoria do produto deve existir e estar ativa (active = true).
--      * Tamanho (variação) obrigatório e validado quando cadastrado; rejeição explícita se inexistente.
--      * Sabores validados obrigatoriamente quando o produto possuir sabores cadastrados.
--      * Adicionais validados rigorosamente: rejeição imediata se inexistente, indisponível ou acima do limite.
--    - Cálculo de todos os preços, adicionais, subtotais e taxas exclusivamente no servidor.
--    - Execução atômica: se qualquer validação falhar, a transação inteira é abortada sem registros parciais.
--
-- 4. PROTEÇÃO MULTICAMADAS CONTRA ABUSOS E SPAM:
--    - Rate limiting no servidor por número de telefone (máx. 3 pedidos em 10 minutos).
--    - Rate limiting no servidor por token de dispositivo/sessão (máx. 3 pedidos em 15 minutos).
--    - Rate limiting global por janela de 1 minuto contra floods automatizados/DDoS.
--    - Tabela de auditoria e controle de tentativas (order_submission_logs) protegida por RLS.
--
-- 5. TAXA DE ENTREGA INICIAL ZERADA (R$ 0,00) E ENTREGA INICIALMENTE DESABILITADA:
--    - delivery_fee inicial configurada como R$ 0,00 (sem valores fictícios).
--    - is_delivery_available inicial definida como FALSE.
--    - A entrega não é aceita no banco até a proprietária habilitar e configurar as condições.
-- ==============================================================================

-- 1. Habilitar extensões necessárias para UUID e criptografia no schema extensions do Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ==============================================================================
-- 2. TABELA DE ADMINISTRADORES (RBAC / CONTROLE EXCLUSIVO DA PROPRIETÁRIA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

-- ==============================================================================
-- 3. FUNÇÃO DE SEGURANÇA IS_ADMIN() — COM SEARCH_PATH BLINDADO
-- ==============================================================================
DROP FUNCTION IF EXISTS public.is_admin();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
STABLE
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Retorna falso imediatamente se não houver contexto de usuário autenticado
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Consulta qualificada e explícita à tabela public.admins
    SELECT EXISTS (
        SELECT 1
        FROM public.admins a
        WHERE a.user_id = auth.uid()
          AND a.is_active = TRUE
          AND a.role = 'owner'
    ) INTO v_is_admin;

    RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

-- Restringe estritamente a execução: revoga de PUBLIC e anon; concede apenas a authenticated
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ==============================================================================
-- 4. CONFIGURAÇÕES PÚBLICAS E PRIVADAS DA EMPRESA
-- ==============================================================================
-- Taxa de entrega inicial zerada (R$ 0,00) e entrega desabilitada até a proprietária configurar
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT NOT NULL DEFAULT 'SABOR NO POTE',
    whatsapp_number TEXT,
    instagram_handle TEXT DEFAULT '@sabornopoteoficialdf',
    address TEXT,
    opening_hours TEXT,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
    is_delivery_available BOOLEAN NOT NULL DEFAULT false,
    is_pickup_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT single_store_settings CHECK (id = 'default')
);

-- Inserir configuração padrão inicial segura (taxa zero, entrega pausada aguardando configuração)
INSERT INTO public.store_settings (
    id,
    store_name,
    instagram_handle,
    delivery_fee,
    is_delivery_available,
    is_pickup_available
)
VALUES (
    'default',
    'SABOR NO POTE',
    '@sabornopoteoficialdf',
    0.00,
    false,
    true
)
ON CONFLICT (id) DO UPDATE
SET instagram_handle = COALESCE(public.store_settings.instagram_handle, '@sabornopoteoficialdf');

-- ==============================================================================
-- 5. CATEGORIAS DE PRODUTOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. PRODUTOS DO CARDÁPIO, VARIAÇÕES, SABORES E ADICIONAIS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    image_url TEXT,
    available BOOLEAN NOT NULL DEFAULT true,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Variações de Tamanho (preço fixo da porção)
CREATE TABLE IF NOT EXISTS public.product_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_product_variations_prod ON public.product_variations(product_id);

-- Sabores Oficiais do Produto
CREATE TABLE IF NOT EXISTS public.product_flavors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    available BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_product_flavors_prod ON public.product_flavors(product_id);

-- Adicionais e Complementos Oficiais
CREATE TABLE IF NOT EXISTS public.product_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    available BOOLEAN NOT NULL DEFAULT true,
    max_quantity INTEGER NOT NULL DEFAULT 5 CHECK (max_quantity >= 1)
);

CREATE INDEX IF NOT EXISTS idx_product_extras_prod ON public.product_extras(product_id);

-- ==============================================================================
-- 7. PEDIDOS E ITENS (HISTÓRICO OPERACIONAL PROTEGIDO)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_type TEXT NOT NULL CHECK (delivery_type IN ('delivery', 'pickup')),
    address_data JSONB,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'money', 'debit', 'credit')),
    needs_cash_change BOOLEAN DEFAULT false,
    cash_change_for NUMERIC(10, 2),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
    order_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    configuration JSONB
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ==============================================================================
-- 8. TABELA DE AUDITORIA E RATE LIMITING DE SUBMISSÕES (ANTI-ABUSO)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.order_submission_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_identifier TEXT,
    phone_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_submission_logs_time ON public.order_submission_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_submission_logs_client ON public.order_submission_logs(client_identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_submission_logs_phone ON public.order_submission_logs(phone_hash, created_at DESC);

-- ==============================================================================
-- 9. ESTOQUE E GESTÃO FINANCEIRA (ACESSO EXCLUSIVO DA PROPRIETÁRIA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- 9.1 MÓDULO DE PRECIFICAÇÃO E FICHA TÉCNICA (INSUMOS, RECEITAS, DESPESAS E CONFIGURAÇÕES)
-- ==============================================================================
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

CREATE TABLE IF NOT EXISTS public.production_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('fixed_monthly', 'variable_batch', 'percentage')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    allocation_basis TEXT NOT NULL DEFAULT 'per_unit' CHECK (allocation_basis IN ('per_unit', 'percentage_sale', 'fixed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- ==============================================================================
-- 10. FUNÇÃO SEGURA RPC PARA PEDIDOS ANÔNIMOS (SUBMIT_ORDER)
-- ==============================================================================
-- Esta função substitui qualquer inserção direta não controlada via cliente.
-- Todas as validações ocorrem no servidor de forma atômica. Se qualquer validação
-- falhar, nenhuma alteração é persistida no banco de dados.
DROP FUNCTION IF EXISTS public.submit_order(TEXT, TEXT, TEXT, JSONB, TEXT, BOOLEAN, NUMERIC, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.submit_order(TEXT, TEXT, TEXT, JSONB, TEXT, BOOLEAN, NUMERIC, TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.submit_order(
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_delivery_type TEXT,
    p_address_data JSONB DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'pix',
    p_needs_cash_change BOOLEAN DEFAULT FALSE,
    p_cash_change_for NUMERIC DEFAULT NULL,
    p_order_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::JSONB,
    p_client_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, pg_temp
AS $$
DECLARE
    -- Variáveis de validação e rate limit
    v_clean_phone TEXT;
    v_phone_hash TEXT;
    v_recent_orders_phone INTEGER;
    v_recent_orders_token INTEGER;
    v_global_recent_orders INTEGER;
    v_store_delivery_fee NUMERIC(10, 2) := 0.00;
    v_is_delivery_avail BOOLEAN := FALSE;
    v_is_pickup_avail BOOLEAN := TRUE;
    v_subtotal NUMERIC(10, 2) := 0.00;
    v_final_delivery_fee NUMERIC(10, 2) := 0.00;
    v_total_price NUMERIC(10, 2) := 0.00;
    v_order_id UUID;
    v_items_count INTEGER;
    v_item_idx INTEGER;
    
    -- Validação do produto e categoria
    v_prod_id UUID;
    v_prod_name TEXT;
    v_prod_category_id UUID;
    v_prod_base_price NUMERIC(10, 2);
    v_prod_available BOOLEAN;
    v_cat_active BOOLEAN;
    v_cat_name TEXT;
    
    -- Variações (Tamanhos)
    v_size_name TEXT;
    v_size_price NUMERIC(10, 2);
    v_variations_count INTEGER;
    
    -- Sabores
    v_flavor_name TEXT;
    v_flavors_count INTEGER;
    v_flavor_available BOOLEAN;
    
    -- Adicionais
    v_extras JSONB;
    v_extra RECORD;
    v_extra_name TEXT;
    v_extra_qty INTEGER;
    v_extra_price NUMERIC(10, 2);
    v_extra_db_max_qty INTEGER;
    v_extra_db_avail BOOLEAN;
    v_extra_total_per_item NUMERIC(10, 2);
    v_formatted_extras JSONB;
    
    -- Totais de cada item
    v_item_unit_price NUMERIC(10, 2);
    v_item_total_price NUMERIC(10, 2);
    v_item_qty INTEGER;
    v_item_notes TEXT;
    
    -- Estrutura temporária para validação prévia de todos os itens antes de gravar
    v_validated_items JSONB := '[]'::JSONB;
BEGIN
    -- -------------------------------------------------------------------------
    -- 1. VALIDAÇÃO DOS DADOS BÁSICOS DO CLIENTE
    -- -------------------------------------------------------------------------
    IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 THEN
        RAISE EXCEPTION 'Por favor, informe seu nome completo (mínimo de 2 caracteres).';
    END IF;

    -- Deixar apenas dígitos no telefone
    v_clean_phone := regexp_replace(COALESCE(p_customer_phone, ''), '\D', '', 'g');
    IF length(v_clean_phone) < 10 THEN
        RAISE EXCEPTION 'Por favor, informe um telefone de contato válido com DDD (mínimo 10 dígitos).';
    END IF;

    IF p_delivery_type NOT IN ('delivery', 'pickup') THEN
        RAISE EXCEPTION 'Tipo de entrega inválido. Opções aceitas: delivery ou pickup.';
    END IF;

    IF p_payment_method NOT IN ('pix', 'money', 'debit', 'credit') THEN
        RAISE EXCEPTION 'Forma de pagamento inválida.';
    END IF;

    -- -------------------------------------------------------------------------
    -- 2. PROTEÇÃO CONTRA ABUSOS, FLOOD E RATE LIMITING NO SERVIDOR
    -- -------------------------------------------------------------------------
    -- 2.1 Proteção contra flood global (máximo de 15 pedidos em 1 minuto no sistema todo)
    SELECT COUNT(*)
    INTO v_global_recent_orders
    FROM public.orders
    WHERE created_at > (now() - INTERVAL '1 minute');

    IF v_global_recent_orders >= 15 THEN
        RAISE EXCEPTION 'O sistema está processando um alto volume de pedidos no momento. Por favor, aguarde um minuto antes de reenviar.';
    END IF;

    -- 2.2 Rate limit por número de telefone informado (máximo 3 pedidos em 10 minutos)
    SELECT COUNT(*)
    INTO v_recent_orders_phone
    FROM public.orders
    WHERE regexp_replace(customer_phone, '\D', '', 'g') = v_clean_phone
      AND created_at > (now() - INTERVAL '10 minutes');

    IF v_recent_orders_phone >= 3 THEN
        RAISE EXCEPTION 'Limite de pedidos temporariamente excedido para este número de telefone. Por favor, aguarde alguns minutos.';
    END IF;

    -- 2.3 Rate limit independente por token de cliente/dispositivo (máximo 3 em 15 minutos)
    IF p_client_token IS NOT NULL AND length(trim(p_client_token)) >= 8 THEN
        SELECT COUNT(*)
        INTO v_recent_orders_token
        FROM public.order_submission_logs
        WHERE client_identifier = trim(p_client_token)
          AND created_at > (now() - INTERVAL '15 minutes');

        IF v_recent_orders_token >= 3 THEN
            RAISE EXCEPTION 'Limite de tentativas de envio excedido para este dispositivo. Por favor, aguarde alguns minutos.';
        END IF;
    END IF;

    -- -------------------------------------------------------------------------
    -- 3. VALIDAÇÃO DA QUANTIDADE GERAL DE ITENS
    -- -------------------------------------------------------------------------
    v_items_count := jsonb_array_length(p_items);
    IF v_items_count IS NULL OR v_items_count = 0 THEN
        RAISE EXCEPTION 'O pedido deve conter ao menos 1 item.';
    END IF;

    IF v_items_count > 30 THEN
        RAISE EXCEPTION 'Quantidade excessiva de itens por pedido (máximo 30 itens permitidos).';
    END IF;

    -- -------------------------------------------------------------------------
    -- 4. CONSULTA E VALIDAÇÃO DAS CONFIGURAÇÕES OFICIAIS DA LOJA
    -- -------------------------------------------------------------------------
    SELECT delivery_fee, is_delivery_available, is_pickup_available
    INTO v_store_delivery_fee, v_is_delivery_avail, v_is_pickup_avail
    FROM public.store_settings
    WHERE id = 'default';

    IF NOT FOUND THEN
        -- Valores padrão estritos: entrega desabilitada até configuração
        v_store_delivery_fee := 0.00;
        v_is_delivery_avail := FALSE;
        v_is_pickup_avail := TRUE;
    END IF;

    -- Validação da modalidade de entrega solicitada
    IF p_delivery_type = 'delivery' THEN
        -- REGRA: A entrega NÃO deve ser oferecida se não estiver configurada
        IF NOT v_is_delivery_avail THEN
            RAISE EXCEPTION 'A entrega em domicílio (delivery) ainda não está disponível ou não foi configurada pela administração. Por favor, selecione retirada no local.';
        END IF;

        IF p_address_data IS NULL OR jsonb_typeof(p_address_data) != 'object' THEN
            RAISE EXCEPTION 'Endereço completo de entrega é obrigatório para pedidos via delivery.';
        END IF;

        IF NULLIF(trim(COALESCE(p_address_data->>'street', '')), '') IS NULL OR
           NULLIF(trim(COALESCE(p_address_data->>'neighborhood', '')), '') IS NULL THEN
            RAISE EXCEPTION 'Logradouro e bairro são obrigatórios para entrega em domicílio.';
        END IF;

        v_final_delivery_fee := COALESCE(v_store_delivery_fee, 0.00);
    ELSE
        -- Modalidade Retirada
        IF NOT v_is_pickup_avail THEN
            RAISE EXCEPTION 'A modalidade de retirada no local não está disponível no momento.';
        END IF;
        v_final_delivery_fee := 0.00;
    END IF;

    -- -------------------------------------------------------------------------
    -- 5. VALIDAÇÃO COMPLETA DE TODOS OS ITENS ANTES DE QUALQUER INSERÇÃO
    --    Garante que pedidos com dados inválidos sejam rejeitados integralmente
    -- -------------------------------------------------------------------------
    v_subtotal := 0.00;

    FOR v_item_idx IN 0..(v_items_count - 1) LOOP
        DECLARE
            v_curr_item JSONB := p_items->v_item_idx;
            v_item_prod_id_txt TEXT := v_curr_item->>'product_id';
        BEGIN
            v_item_qty := COALESCE((v_curr_item->>'quantity')::INTEGER, 1);
            IF v_item_qty < 1 OR v_item_qty > 20 THEN
                RAISE EXCEPTION 'Quantidade inválida para o item % (deve ser entre 1 e 20 unidades).', (v_item_idx + 1);
            END IF;

            v_size_name := trim(COALESCE(v_curr_item->>'size_name', ''));
            v_flavor_name := trim(COALESCE(v_curr_item->>'flavor_name', ''));
            v_extras := COALESCE(v_curr_item->'extras', '[]'::JSONB);
            v_item_notes := trim(COALESCE(v_curr_item->>'notes', ''));

            -- 5.1 Localizar o produto oficial no banco de dados
            IF v_item_prod_id_txt IS NOT NULL AND v_item_prod_id_txt ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                SELECT id, name, category_id, base_price, available
                INTO v_prod_id, v_prod_name, v_prod_category_id, v_prod_base_price, v_prod_available
                FROM public.products
                WHERE id = v_item_prod_id_txt::UUID;
            ELSE
                SELECT id, name, category_id, base_price, available
                INTO v_prod_id, v_prod_name, v_prod_category_id, v_prod_base_price, v_prod_available
                FROM public.products
                WHERE lower(trim(name)) = lower(trim(COALESCE(v_curr_item->>'product_name', '')))
                LIMIT 1;
            END IF;

            IF v_prod_id IS NULL THEN
                RAISE EXCEPTION 'Produto não encontrado ou não cadastrado no catálogo: "%".', COALESCE(v_curr_item->>'product_name', 'Item');
            END IF;

            IF NOT v_prod_available THEN
                RAISE EXCEPTION 'O produto "%" está indisponível no momento.', v_prod_name;
            END IF;

            -- 5.2 Validação da categoria do produto (deve estar ativa)
            IF v_prod_category_id IS NOT NULL THEN
                SELECT active, name
                INTO v_cat_active, v_cat_name
                FROM public.categories
                WHERE id = v_prod_category_id;

                IF v_cat_active IS NOT NULL AND NOT v_cat_active THEN
                    RAISE EXCEPTION 'A categoria "%" do produto "%" está inativa no momento.', COALESCE(v_cat_name, 'do cardápio'), v_prod_name;
                END IF;
            END IF;

            -- Preço inicial do produto a partir da tabela oficial
            v_item_unit_price := v_prod_base_price;

            -- 5.3 Validação de tamanho / variação
            SELECT COUNT(*)
            INTO v_variations_count
            FROM public.product_variations
            WHERE product_id = v_prod_id;

            IF v_variations_count > 0 THEN
                IF v_size_name = '' THEN
                    RAISE EXCEPTION 'É obrigatório selecionar uma opção de tamanho para o produto "%".', v_prod_name;
                END IF;

                SELECT price
                INTO v_size_price
                FROM public.product_variations
                WHERE product_id = v_prod_id
                  AND lower(trim(name)) = lower(v_size_name)
                LIMIT 1;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'O tamanho "%" não existe para o produto "%".', v_size_name, v_prod_name;
                END IF;

                v_item_unit_price := v_size_price;
            ELSE
                IF v_size_name <> '' THEN
                    RAISE EXCEPTION 'O produto "%" não possui opções de tamanho.', v_prod_name;
                END IF;
            END IF;

            -- 5.4 Validação de sabores cadastrados
            SELECT COUNT(*)
            INTO v_flavors_count
            FROM public.product_flavors
            WHERE product_id = v_prod_id;

            IF v_flavors_count > 0 THEN
                IF v_flavor_name = '' THEN
                    RAISE EXCEPTION 'É obrigatório selecionar um sabor para o produto "%".', v_prod_name;
                END IF;

                SELECT available
                INTO v_flavor_available
                FROM public.product_flavors
                WHERE product_id = v_prod_id
                  AND lower(trim(name)) = lower(v_flavor_name)
                LIMIT 1;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'O sabor "%" não existe para o produto "%".', v_flavor_name, v_prod_name;
                END IF;

                IF NOT v_flavor_available THEN
                    RAISE EXCEPTION 'O sabor "%" para o produto "%" está indisponível no momento.', v_flavor_name, v_prod_name;
                END IF;
            ELSE
                -- Se não há sabores cadastrados, mas o cliente enviou um sabor arbitrário não validado
                IF v_flavor_name <> '' THEN
                    RAISE EXCEPTION 'O produto "%" não possui opções de sabores cadastradas.', v_prod_name;
                END IF;
            END IF;

            -- 5.5 Validação estrita de adicionais cadastrados
            v_extra_total_per_item := 0.00;
            v_formatted_extras := '[]'::JSONB;

            IF jsonb_array_length(v_extras) > 0 THEN
                FOR v_extra IN SELECT * FROM jsonb_to_recordset(v_extras) AS x(name TEXT, quantity INTEGER) LOOP
                    v_extra_name := trim(COALESCE(v_extra.name, ''));
                    v_extra_qty := COALESCE(v_extra.quantity, 1);

                    IF v_extra_name = '' THEN
                        RAISE EXCEPTION 'Nome do adicional inválido no produto "%".', v_prod_name;
                    END IF;

                    IF v_extra_qty < 1 THEN
                        RAISE EXCEPTION 'Quantidade inválida para o adicional "%" no produto "%".', v_extra_name, v_prod_name;
                    END IF;

                    SELECT price, max_quantity, available
                    INTO v_extra_price, v_extra_db_max_qty, v_extra_db_avail
                    FROM public.product_extras
                    WHERE product_id = v_prod_id
                      AND lower(trim(name)) = lower(v_extra_name)
                    LIMIT 1;

                    -- Se o adicional solicitado não existir no banco, rejeitar expressamente
                    IF NOT FOUND THEN
                        RAISE EXCEPTION 'O adicional "%" não existe para o produto "%".', v_extra_name, v_prod_name;
                    END IF;

                    -- Se o adicional estiver indisponível, rejeitar expressamente
                    IF NOT v_extra_db_avail THEN
                        RAISE EXCEPTION 'O adicional "%" para o produto "%" está indisponível no momento.', v_extra_name, v_prod_name;
                    END IF;

                    -- Se exceder a quantidade máxima permitida
                    IF v_extra_qty > v_extra_db_max_qty THEN
                        RAISE EXCEPTION 'A quantidade solicitada para o adicional "%" (%) excede o limite permitido (%) no produto "%".', v_extra_name, v_extra_qty, v_extra_db_max_qty, v_prod_name;
                    END IF;

                    -- Acumular valor oficial do adicional
                    v_extra_total_per_item := v_extra_total_per_item + (v_extra_price * v_extra_qty);
                    v_formatted_extras := v_formatted_extras || jsonb_build_object(
                        'name', v_extra_name,
                        'quantity', v_extra_qty,
                        'unit_price', v_extra_price
                    );
                END LOOP;
            END IF;

            -- Calcular preço unitário oficial (base/variação + adicionais oficiais)
            v_item_unit_price := v_item_unit_price + v_extra_total_per_item;
            v_item_total_price := v_item_unit_price * v_item_qty;
            v_subtotal := v_subtotal + v_item_total_price;

            -- Guardar item pré-validado na lista em memória
            v_validated_items := v_validated_items || jsonb_build_object(
                'product_id', v_prod_id,
                'product_name', v_prod_name,
                'quantity', v_item_qty,
                'unit_price', v_item_unit_price,
                'total_price', v_item_total_price,
                'configuration', jsonb_build_object(
                    'size', NULLIF(v_size_name, ''),
                    'flavor', NULLIF(v_flavor_name, ''),
                    'extras', v_formatted_extras,
                    'notes', NULLIF(v_item_notes, '')
                )
            );
        END;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 6. CÁLCULO FINAL DE TOTAIS NO SERVIDOR
    -- -------------------------------------------------------------------------
    v_total_price := v_subtotal + v_final_delivery_fee;

    -- Validar troco se pagamento for dinheiro
    IF p_payment_method = 'money' AND p_needs_cash_change THEN
        IF p_cash_change_for IS NULL OR p_cash_change_for <= v_total_price THEN
            RAISE EXCEPTION 'O valor informado para troco (R$ %) deve ser maior que o total do pedido (R$ %).',
                COALESCE(p_cash_change_for, 0), v_total_price;
        END IF;
    END IF;

    -- -------------------------------------------------------------------------
    -- 7. INSERÇÃO ATÔMICA DO PEDIDO OFICIAL
    -- -------------------------------------------------------------------------
    INSERT INTO public.orders (
        customer_name,
        customer_phone,
        delivery_type,
        address_data,
        payment_method,
        needs_cash_change,
        cash_change_for,
        subtotal,
        delivery_fee,
        total_price,
        status,
        order_notes
    ) VALUES (
        trim(p_customer_name),
        p_customer_phone,
        p_delivery_type,
        p_address_data,
        p_payment_method,
        COALESCE(p_needs_cash_change, FALSE),
        p_cash_change_for,
        v_subtotal,
        v_final_delivery_fee,
        v_total_price,
        'pending',
        NULLIF(trim(COALESCE(p_order_notes, '')), '')
    ) RETURNING id INTO v_order_id;

    -- -------------------------------------------------------------------------
    -- 8. INSERÇÃO ATÔMICA DOS ITENS VINCULADOS
    -- -------------------------------------------------------------------------
    FOR v_item_idx IN 0..(jsonb_array_length(v_validated_items) - 1) LOOP
        DECLARE
            v_val_item JSONB := v_validated_items->v_item_idx;
        BEGIN
            INSERT INTO public.order_items (
                order_id,
                product_id,
                product_name,
                quantity,
                unit_price,
                total_price,
                configuration
            ) VALUES (
                v_order_id,
                (v_val_item->>'product_id')::UUID,
                v_val_item->>'product_name',
                (v_val_item->>'quantity')::INTEGER,
                (v_val_item->>'unit_price')::NUMERIC,
                (v_val_item->>'total_price')::NUMERIC,
                v_val_item->'configuration'
            );
        END;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 9. REGISTRO NO LOG DE AUDITORIA CONTRA ABUSOS
    -- -------------------------------------------------------------------------
    v_phone_hash := encode(extensions.digest(v_clean_phone, 'sha256'), 'hex');
    INSERT INTO public.order_submission_logs (client_identifier, phone_hash, created_at)
    VALUES (NULLIF(trim(COALESCE(p_client_token, '')), ''), v_phone_hash, now());

    -- Limpeza suave de logs com mais de 7 dias
    DELETE FROM public.order_submission_logs
    WHERE created_at < (now() - INTERVAL '7 days');

    -- -------------------------------------------------------------------------
    -- 10. RETORNO DOS DADOS OFICIAIS CALCULADOS
    -- -------------------------------------------------------------------------
    RETURN jsonb_build_object(
        'success', TRUE,
        'order_id', v_order_id,
        'subtotal', v_subtotal,
        'delivery_fee', v_final_delivery_fee,
        'total_price', v_total_price,
        'created_at', now()
    );
END;
$$;

-- Restringir permissões e conceder execução da função pública controlada
REVOKE ALL ON FUNCTION public.submit_order(TEXT, TEXT, TEXT, JSONB, TEXT, BOOLEAN, NUMERIC, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_order(TEXT, TEXT, TEXT, JSONB, TEXT, BOOLEAN, NUMERIC, TEXT, JSONB, TEXT) TO anon, authenticated;

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) — POLÍTICAS RESTRITAS
-- ==============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_submission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pricing_config ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas para evitar conflitos de nomenclatura
DROP POLICY IF EXISTS "Admins podem visualizar administradores" ON public.admins;
DROP POLICY IF EXISTS "Apenas owners podem cadastrar novos admins" ON public.admins;
DROP POLICY IF EXISTS "Admin pode consultar administradores" ON public.admins;
DROP POLICY IF EXISTS "Bloquear insert em admins via cliente" ON public.admins;
DROP POLICY IF EXISTS "Bloquear update em admins via cliente" ON public.admins;
DROP POLICY IF EXISTS "Bloquear delete em admins via cliente" ON public.admins;

DROP POLICY IF EXISTS "Público pode ler configurações da loja" ON public.store_settings;
DROP POLICY IF EXISTS "Admins podem alterar configurações" ON public.store_settings;
DROP POLICY IF EXISTS "Apenas admin pode alterar configurações" ON public.store_settings;

DROP POLICY IF EXISTS "Público pode visualizar categorias ativas" ON public.categories;
DROP POLICY IF EXISTS "Admins podem gerenciar categorias" ON public.categories;
DROP POLICY IF EXISTS "Apenas admin pode gerenciar categorias" ON public.categories;

DROP POLICY IF EXISTS "Público pode visualizar produtos disponíveis" ON public.products;
DROP POLICY IF EXISTS "Admins podem gerenciar produtos" ON public.products;
DROP POLICY IF EXISTS "Apenas admin pode gerenciar produtos" ON public.products;

DROP POLICY IF EXISTS "Público pode ver variações de produtos" ON public.product_variations;
DROP POLICY IF EXISTS "Admins podem gerenciar variações" ON public.product_variations;
DROP POLICY IF EXISTS "Apenas admin pode gerenciar variações" ON public.product_variations;

DROP POLICY IF EXISTS "Público pode ver sabores de produtos" ON public.product_flavors;
DROP POLICY IF EXISTS "Admins podem gerenciar sabores" ON public.product_flavors;
DROP POLICY IF EXISTS "Apenas admin pode gerenciar sabores" ON public.product_flavors;

DROP POLICY IF EXISTS "Público pode ver adicionais de produtos" ON public.product_extras;
DROP POLICY IF EXISTS "Admins podem gerenciar adicionais" ON public.product_extras;
DROP POLICY IF EXISTS "Apenas admin pode gerenciar adicionais" ON public.product_extras;

DROP POLICY IF EXISTS "Clientes podem criar pedidos" ON public.orders;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os pedidos" ON public.orders;
DROP POLICY IF EXISTS "Bloquear insercao direta anonima em orders" ON public.orders;
DROP POLICY IF EXISTS "Bloquear insercao direta de pedidos" ON public.orders;
DROP POLICY IF EXISTS "Bloquear leitura direta de pedidos" ON public.orders;
DROP POLICY IF EXISTS "Bloquear atualizacao direta de pedidos" ON public.orders;
DROP POLICY IF EXISTS "Bloquear exclusao direta de pedidos" ON public.orders;
DROP POLICY IF EXISTS "Apenas admin pode visualizar e gerenciar pedidos" ON public.orders;
DROP POLICY IF EXISTS "Admin pode consultar pedidos" ON public.orders;
DROP POLICY IF EXISTS "Admin pode inserir pedidos" ON public.orders;
DROP POLICY IF EXISTS "Admin pode atualizar pedidos" ON public.orders;
DROP POLICY IF EXISTS "Admin pode excluir pedidos" ON public.orders;

DROP POLICY IF EXISTS "Clientes podem criar itens do pedido" ON public.order_items;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os itens do pedido" ON public.order_items;
DROP POLICY IF EXISTS "Bloquear insercao direta em order_items" ON public.order_items;
DROP POLICY IF EXISTS "Bloquear insercao direta de itens" ON public.order_items;
DROP POLICY IF EXISTS "Bloquear leitura direta de itens" ON public.order_items;
DROP POLICY IF EXISTS "Bloquear atualizacao direta de itens" ON public.order_items;
DROP POLICY IF EXISTS "Bloquear exclusao direta de itens" ON public.order_items;
DROP POLICY IF EXISTS "Apenas admin pode visualizar e gerenciar itens" ON public.order_items;
DROP POLICY IF EXISTS "Admin pode consultar itens do pedido" ON public.order_items;
DROP POLICY IF EXISTS "Admin pode inserir itens do pedido" ON public.order_items;
DROP POLICY IF EXISTS "Admin pode atualizar itens do pedido" ON public.order_items;
DROP POLICY IF EXISTS "Admin pode excluir itens do pedido" ON public.order_items;

DROP POLICY IF EXISTS "Acesso exclusivo aos logs para admin" ON public.order_submission_logs;
DROP POLICY IF EXISTS "Acesso exclusivo de administradores ao estoque" ON public.inventory_items;
DROP POLICY IF EXISTS "Acesso exclusivo de administradores ao financeiro" ON public.financial_transactions;
DROP POLICY IF EXISTS "Acesso exclusivo ao estoque para admin" ON public.inventory_items;
DROP POLICY IF EXISTS "Acesso exclusivo ao financeiro para admin" ON public.financial_transactions;

-- -----------------------------------------------------------------------------
-- 11.1 POLÍTICAS PARA ADMINS
-- -----------------------------------------------------------------------------
-- Consulta restrita: apenas o próprio usuário autenticado ou administrador verificado
CREATE POLICY "Admin pode consultar administradores"
    ON public.admins FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- Bloqueio absoluto contra INSERT, UPDATE e DELETE de clientes (authenticated e anon)
-- Garante que nenhum usuário comum ou invasor consiga elevar privilégios ou cadastrar admins
CREATE POLICY "Bloquear insert em admins via cliente"
    ON public.admins FOR INSERT
    TO authenticated, anon
    WITH CHECK (false);

CREATE POLICY "Bloquear update em admins via cliente"
    ON public.admins FOR UPDATE
    TO authenticated, anon
    USING (false);

CREATE POLICY "Bloquear delete em admins via cliente"
    ON public.admins FOR DELETE
    TO authenticated, anon
    USING (false);

-- -----------------------------------------------------------------------------
-- 11.2 POLÍTICAS PARA STORE_SETTINGS
-- -----------------------------------------------------------------------------
CREATE POLICY "Público pode ler configurações da loja"
    ON public.store_settings FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Apenas admin pode alterar configurações"
    ON public.store_settings FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 11.3 POLÍTICAS PARA CATEGORIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Público pode visualizar categorias ativas"
    ON public.categories FOR SELECT
    TO anon, authenticated
    USING (active = true OR public.is_admin());

CREATE POLICY "Apenas admin pode gerenciar categorias"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 11.4 POLÍTICAS PARA PRODUCTS
-- -----------------------------------------------------------------------------
CREATE POLICY "Público pode visualizar produtos disponíveis"
    ON public.products FOR SELECT
    TO anon, authenticated
    USING (available = true OR public.is_admin());

CREATE POLICY "Apenas admin pode gerenciar produtos"
    ON public.products FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 11.5 POLÍTICAS PARA VARIAÇÕES, SABORES E ADICIONAIS
-- -----------------------------------------------------------------------------
CREATE POLICY "Público pode ver variações de produtos"
    ON public.product_variations FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Apenas admin pode gerenciar variações"
    ON public.product_variations FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Público pode ver sabores de produtos"
    ON public.product_flavors FOR SELECT
    TO anon, authenticated
    USING (available = true OR public.is_admin());

CREATE POLICY "Apenas admin pode gerenciar sabores"
    ON public.product_flavors FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Público pode ver adicionais de produtos"
    ON public.product_extras FOR SELECT
    TO anon, authenticated
    USING (available = true OR public.is_admin());

CREATE POLICY "Apenas admin pode gerenciar adicionais"
    ON public.product_extras FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 11.6 POLÍTICAS PARA ORDERS (EXPLICITAS E SEGURAS)
-- -----------------------------------------------------------------------------
-- Bloquear inserção, leitura, atualização e exclusão direta por anon e authenticated comuns
CREATE POLICY "Bloquear insercao direta de pedidos"
    ON public.orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

CREATE POLICY "Bloquear leitura direta de pedidos"
    ON public.orders FOR SELECT
    TO anon, authenticated
    USING (false);

CREATE POLICY "Bloquear atualizacao direta de pedidos"
    ON public.orders FOR UPDATE
    TO anon, authenticated
    USING (false);

CREATE POLICY "Bloquear exclusao direta de pedidos"
    ON public.orders FOR DELETE
    TO anon, authenticated
    USING (false);

-- Políticas explícitas para a proprietária / administradores em orders
CREATE POLICY "Admin pode consultar pedidos"
    ON public.orders FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admin pode inserir pedidos"
    ON public.orders FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode atualizar pedidos"
    ON public.orders FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode excluir pedidos"
    ON public.orders FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 11.7 POLÍTICAS PARA ORDER_ITEMS (EXPLICITAS E SEGURAS)
-- -----------------------------------------------------------------------------
-- Bloquear inserção, leitura, atualização e exclusão direta por anon e authenticated comuns
CREATE POLICY "Bloquear insercao direta de itens"
    ON public.order_items FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

CREATE POLICY "Bloquear leitura direta de itens"
    ON public.order_items FOR SELECT
    TO anon, authenticated
    USING (false);

CREATE POLICY "Bloquear atualizacao direta de itens"
    ON public.order_items FOR UPDATE
    TO anon, authenticated
    USING (false);

CREATE POLICY "Bloquear exclusao direta de itens"
    ON public.order_items FOR DELETE
    TO anon, authenticated
    USING (false);

-- Políticas explícitas para a proprietária / administradores em order_items
CREATE POLICY "Admin pode consultar itens do pedido"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admin pode inserir itens do pedido"
    ON public.order_items FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode atualizar itens do pedido"
    ON public.order_items FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode excluir itens do pedido"
    ON public.order_items FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 11.8 POLÍTICAS PARA LOGS DE SUBMISSÃO, ESTOQUE E FINANCEIRO
-- -----------------------------------------------------------------------------
CREATE POLICY "Acesso exclusivo aos logs para admin"
    ON public.order_submission_logs FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Acesso exclusivo ao estoque para admin"
    ON public.inventory_items FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Acesso exclusivo ao financeiro para admin"
    ON public.financial_transactions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

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
-- 12. REMOÇÃO DA FUNÇÃO REGISTER_INITIAL_OWNER() E CADASTRO SEGURO DA PROPRIETÁRIA
-- ==============================================================================
-- Remoção obrigatória da função pública register_initial_owner para impedir criação indevida
DROP FUNCTION IF EXISTS public.register_initial_owner(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.register_initial_owner(TEXT);

-- ==============================================================================
-- GUIA DE CADASTRO DA PROPRIETÁRIA (EXECUTAR NO SQL EDITOR DO SUPABASE):
-- ==============================================================================
-- PASSO 1: No menu "Authentication > Users" do Supabase, clique em "Add user" -> "Create user",
--          insira o seu e-mail e uma senha segura.
--
-- PASSO 2: Abra o "SQL Editor" no menu lateral do Supabase, cole e execute este script completo.
--
-- PASSO 3: Para autorizar sua conta como a proprietária exclusiva do sistema, execute o comando
--          abaixo no SQL Editor substituindo o e-mail pelo seu e-mail cadastrado no Passo 1:
--
-- INSERT INTO public.admins (user_id, email, name, role, is_active)
-- SELECT id, email, 'Proprietária Sabor no Pote', 'owner', true
-- FROM auth.users
-- WHERE email = 'contato@sabornopote.com.br'
-- ON CONFLICT (user_id) DO NOTHING;
-- ==============================================================================
