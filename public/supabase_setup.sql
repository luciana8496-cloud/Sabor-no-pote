-- ==============================================================================
-- PROJETO: SABOR NO POTE — CONFIGURAÇÃO DO BACKEND SUPABASE
-- SCRIPT DE ESTRUTURAÇÃO DO BANCO DE DADOS POSTGRESQL COM ROW LEVEL SECURITY (RLS)
-- VERSÃO CORRIGIDA DE SEGURANÇA (ETAPA 2)
-- ==============================================================================
-- Execute este script no SQL Editor do painel do seu projeto Supabase:
-- (https://app.supabase.com/project/_/sql)
--
-- PRINCIPAIS CORREÇÕES DE SEGURANÇA APLICADAS:
-- 1. Autorização exclusiva para a proprietária: bloqueio total de auto-promoção ou elevação de privilégios.
-- 2. Função is_admin() corrigida com search_path seguro (SET search_path = public, pg_temp),
--    execução restrita apenas para authenticated e revogada de PUBLIC.
-- 3. Pedidos anônimos seguros via RPC 'submit_order' com SECURITY DEFINER e search_path seguro:
--    - Eliminação da política irrestrita WITH CHECK (true).
--    - Validação de produtos e adicionais diretamente no banco.
--    - Cálculo de preços e subtotais no servidor com base nos preços oficiais do banco.
--    - Prevenção contra adulteração de valores e associação indevida a pedidos de terceiros.
--    - Rate limiting / anti-spam contra pedidos abusivos por telefone.
-- 4. RLS restrito em todas as tabelas: apenas a proprietária autenticada pode criar/editar/excluir
--    categorias, produtos, configurações e pedidos.
-- ==============================================================================

-- 1. Habilitar extensões necessárias para UUID e criptografia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- ==============================================================================
-- 3. FUNÇÃO DE SEGURANÇA IS_ADMIN() — COM SEARCH_PATH PROTEGIDO
-- ==============================================================================
-- Revoga versão anterior para garantir assinatura e permissões limpas
DROP FUNCTION IF EXISTS public.is_admin();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Retorna falso imediatamente se não houver usuário autenticado
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.admins a
        WHERE a.user_id = auth.uid()
          AND a.is_active = TRUE
    ) INTO v_is_admin;

    RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

-- Restringe a execução estritamente a usuários autenticados
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ==============================================================================
-- 4. CONFIGURAÇÕES PÚBLICAS E PRIVADAS DA EMPRESA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT NOT NULL DEFAULT 'SABOR NO POTE',
    whatsapp_number TEXT,
    instagram_handle TEXT,
    address TEXT,
    opening_hours TEXT,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 5.00 CHECK (delivery_fee >= 0),
    is_delivery_available BOOLEAN NOT NULL DEFAULT true,
    is_pickup_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT single_store_settings CHECK (id = 'default')
);

-- Inserir configuração padrão inicial se não existir
INSERT INTO public.store_settings (id, store_name, delivery_fee)
VALUES ('default', 'SABOR NO POTE', 5.00)
ON CONFLICT (id) DO NOTHING;

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
-- 6. PRODUTOS DO CARDÁPIO, VARIAÇÕES E ADICIONAIS
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

-- Variações de Tamanho
CREATE TABLE IF NOT EXISTS public.product_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    description TEXT
);

-- Adicionais e Complementos
CREATE TABLE IF NOT EXISTS public.product_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    available BOOLEAN NOT NULL DEFAULT true,
    max_quantity INTEGER NOT NULL DEFAULT 5 CHECK (max_quantity >= 1)
);

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
-- 8. ESTOQUE E GESTÃO FINANCEIRA (ACESSO EXCLUSIVO)
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
-- 9. FUNÇÃO SEGURA RPC PARA PEDIDOS ANÔNIMOS (SUBMIT_ORDER)
-- ==============================================================================
-- Esta função substitui a política irrestrita WITH CHECK (true).
-- Os valores são calculados exclusivamente no servidor utilizando os preços oficiais.
CREATE OR REPLACE FUNCTION public.submit_order(
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_delivery_type TEXT,
    p_address_data JSONB DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'pix',
    p_needs_cash_change BOOLEAN DEFAULT FALSE,
    p_cash_change_for NUMERIC DEFAULT NULL,
    p_order_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_phone TEXT;
    v_recent_orders_count INTEGER;
    v_store_delivery_fee NUMERIC(10, 2) := 0.00;
    v_is_delivery_avail BOOLEAN := TRUE;
    v_is_pickup_avail BOOLEAN := TRUE;
    v_subtotal NUMERIC(10, 2) := 0.00;
    v_final_delivery_fee NUMERIC(10, 2) := 0.00;
    v_total_price NUMERIC(10, 2) := 0.00;
    v_order_id UUID;
    v_item RECORD;
    v_item_idx INTEGER;
    v_items_count INTEGER;
    
    -- Validação de produto
    v_prod_id UUID;
    v_prod_name TEXT;
    v_prod_base_price NUMERIC(10, 2);
    v_prod_available BOOLEAN;
    
    -- Variações e adicionais
    v_size_name TEXT;
    v_size_price NUMERIC(10, 2);
    v_flavor_name TEXT;
    v_extras JSONB;
    v_extra RECORD;
    v_extra_name TEXT;
    v_extra_qty INTEGER;
    v_extra_price NUMERIC(10, 2);
    v_extra_db_max_qty INTEGER;
    v_extra_db_avail BOOLEAN;
    v_item_unit_price NUMERIC(10, 2);
    v_item_total_price NUMERIC(10, 2);
    v_item_qty INTEGER;
    v_item_notes TEXT;
    v_extra_total_per_item NUMERIC(10, 2);
    v_formatted_extras JSONB;
BEGIN
    -- 1. Validação do cliente
    IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 THEN
        RAISE EXCEPTION 'Por favor, informe um nome válido com no mínimo 2 caracteres.';
    END IF;

    -- Limpar telefone deixando apenas dígitos para validação
    v_clean_phone := regexp_replace(p_customer_phone, '\D', '', 'g');
    IF length(v_clean_phone) < 8 THEN
        RAISE EXCEPTION 'Por favor, informe um telefone de contato válido com DDD.';
    END IF;

    IF p_delivery_type NOT IN ('delivery', 'pickup') THEN
        RAISE EXCEPTION 'Tipo de entrega inválido. Opções válidas: delivery ou pickup.';
    END IF;

    IF p_payment_method NOT IN ('pix', 'money', 'debit', 'credit') THEN
        RAISE EXCEPTION 'Forma de pagamento inválida.';
    END IF;

    -- 2. Anti-spam e Rate Limiting no Servidor
    -- Máximo de 5 pedidos a cada 10 minutos para o mesmo número de telefone
    SELECT COUNT(*)
    INTO v_recent_orders_count
    FROM public.orders
    WHERE regexp_replace(customer_phone, '\D', '', 'g') = v_clean_phone
      AND created_at > (now() - INTERVAL '10 minutes');

    IF v_recent_orders_count >= 5 THEN
        RAISE EXCEPTION 'Limite temporário de pedidos excedido para este número. Por favor, aguarde alguns minutos antes de tentar novamente.';
    END IF;

    -- 3. Validação dos itens
    v_items_count := jsonb_array_length(p_items);
    IF v_items_count IS NULL OR v_items_count = 0 THEN
        RAISE EXCEPTION 'O pedido deve conter ao menos 1 item.';
    END IF;

    IF v_items_count > 50 THEN
        RAISE EXCEPTION 'Quantidade excessiva de itens por pedido.';
    END IF;

    -- 4. Carregar configurações oficiais da loja
    SELECT delivery_fee, is_delivery_available, is_pickup_available
    INTO v_store_delivery_fee, v_is_delivery_avail, v_is_pickup_avail
    FROM public.store_settings
    WHERE id = 'default';

    IF NOT FOUND THEN
        v_store_delivery_fee := 5.00;
        v_is_delivery_avail := TRUE;
        v_is_pickup_avail := TRUE;
    END IF;

    IF p_delivery_type = 'delivery' THEN
        IF NOT v_is_delivery_avail THEN
            RAISE EXCEPTION 'A modalidade de entrega (delivery) não está disponível no momento.';
        END IF;
        IF p_address_data IS NULL OR jsonb_typeof(p_address_data) != 'object' THEN
            RAISE EXCEPTION 'Endereço de entrega é obrigatório para pedidos via delivery.';
        END IF;
        v_final_delivery_fee := COALESCE(v_store_delivery_fee, 0.00);
    ELSE
        IF NOT v_is_pickup_avail THEN
            RAISE EXCEPTION 'A modalidade de retirada não está disponível no momento.';
        END IF;
        v_final_delivery_fee := 0.00;
    END IF;

    -- 5. Inserir pedido inicial
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
        0.00,
        v_final_delivery_fee,
        0.00,
        'pending',
        p_order_notes
    ) RETURNING id INTO v_order_id;

    -- 6. Calcular preços oficiais no servidor a partir do catálogo oficial
    v_subtotal := 0.00;

    FOR v_item_idx IN 0..(v_items_count - 1) LOOP
        DECLARE
            v_curr_item JSONB := p_items->v_item_idx;
            v_item_prod_id_txt TEXT := v_curr_item->>'product_id';
        BEGIN
            v_item_qty := COALESCE((v_curr_item->>'quantity')::INTEGER, 1);
            IF v_item_qty < 1 OR v_item_qty > 20 THEN
                RAISE EXCEPTION 'Quantidade de item inválida.';
            END IF;

            v_size_name := trim(COALESCE(v_curr_item->>'size_name', ''));
            v_flavor_name := trim(COALESCE(v_curr_item->>'flavor_name', ''));
            v_extras := COALESCE(v_curr_item->'extras', '[]'::JSONB);
            v_item_notes := v_curr_item->>'notes';

            -- Localizar produto no banco
            IF v_item_prod_id_txt IS NOT NULL AND v_item_prod_id_txt ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                SELECT id, name, base_price, available
                INTO v_prod_id, v_prod_name, v_prod_base_price, v_prod_available
                FROM public.products
                WHERE id = v_item_prod_id_txt::UUID;
            ELSE
                SELECT id, name, base_price, available
                INTO v_prod_id, v_prod_name, v_prod_base_price, v_prod_available
                FROM public.products
                WHERE lower(trim(name)) = lower(trim(COALESCE(v_curr_item->>'product_name', '')))
                LIMIT 1;
            END IF;

            IF v_prod_id IS NULL THEN
                RAISE EXCEPTION 'Produto não cadastrado ou inválido: %', COALESCE(v_curr_item->>'product_name', 'Item');
            END IF;

            IF NOT v_prod_available THEN
                RAISE EXCEPTION 'O produto "%" está indisponível no momento.', v_prod_name;
            END IF;

            -- Preço base do banco de dados
            v_item_unit_price := v_prod_base_price;

            -- Verificar se há variação de tamanho oficial para este produto
            IF v_size_name <> '' THEN
                SELECT price
                INTO v_size_price
                FROM public.product_variations
                WHERE product_id = v_prod_id
                  AND lower(trim(name)) = lower(v_size_name)
                LIMIT 1;

                IF FOUND AND v_size_price > 0 THEN
                    v_item_unit_price := v_size_price;
                END IF;
            END IF;

            -- Calcular adicionais oficiais cadastrados
            v_extra_total_per_item := 0.00;
            v_formatted_extras := '[]'::JSONB;

            IF jsonb_array_length(v_extras) > 0 THEN
                FOR v_extra IN SELECT * FROM jsonb_to_recordset(v_extras) AS x(name TEXT, quantity INTEGER) LOOP
                    v_extra_name := trim(COALESCE(v_extra.name, ''));
                    v_extra_qty := COALESCE(v_extra.quantity, 1);

                    IF v_extra_name <> '' AND v_extra_qty > 0 THEN
                        SELECT price, max_quantity, available
                        INTO v_extra_price, v_extra_db_max_qty, v_extra_db_avail
                        FROM public.product_extras
                        WHERE product_id = v_prod_id
                          AND lower(trim(name)) = lower(v_extra_name)
                        LIMIT 1;

                        IF FOUND THEN
                            IF NOT v_extra_db_avail THEN
                                RAISE EXCEPTION 'O adicional "%" para o produto "%" está indisponível.', v_extra_name, v_prod_name;
                            END IF;
                            IF v_extra_qty > v_extra_db_max_qty THEN
                                RAISE EXCEPTION 'Quantidade do adicional "%" excede o limite permitido.', v_extra_name;
                            END IF;

                            v_extra_total_per_item := v_extra_total_per_item + (v_extra_price * v_extra_qty);
                            v_formatted_extras := v_formatted_extras || jsonb_build_object(
                                'name', v_extra_name,
                                'quantity', v_extra_qty,
                                'unit_price', v_extra_price
                            );
                        END IF;
                    END IF;
                END LOOP;
            END IF;

            v_item_unit_price := v_item_unit_price + v_extra_total_per_item;
            v_item_total_price := v_item_unit_price * v_item_qty;
            v_subtotal := v_subtotal + v_item_total_price;

            -- Inserir item associado exclusivamente a este pedido
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
                v_prod_id,
                v_prod_name,
                v_item_qty,
                v_item_unit_price,
                v_item_total_price,
                jsonb_build_object(
                    'size', NULLIF(v_size_name, ''),
                    'flavor', NULLIF(v_flavor_name, ''),
                    'extras', v_formatted_extras,
                    'notes', NULLIF(trim(COALESCE(v_item_notes, '')), '')
                )
            );
        END;
    END LOOP;

    -- 7. Calcular total oficial no servidor
    v_total_price := v_subtotal + v_final_delivery_fee;

    -- 8. Atualizar pedido com os totais calculados
    UPDATE public.orders
    SET subtotal = v_subtotal,
        delivery_fee = v_final_delivery_fee,
        total_price = v_total_price,
        updated_at = now()
    WHERE id = v_order_id;

    -- 9. Retornar resposta
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

-- Restringir permissões e conceder execução da função pública
REVOKE ALL ON FUNCTION public.submit_order(TEXT, TEXT, TEXT, JSONB, TEXT, BOOLEAN, NUMERIC, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_order(TEXT, TEXT, TEXT, JSONB, TEXT, BOOLEAN, NUMERIC, TEXT, JSONB) TO anon, authenticated;

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) — REGRAS RESTRITAS
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

-- Limpar políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Admins podem visualizar administradores" ON public.admins;
DROP POLICY IF EXISTS "Apenas owners podem cadastrar novos admins" ON public.admins;
DROP POLICY IF EXISTS "Admin pode consultar administradores" ON public.admins;
DROP POLICY IF EXISTS "Bloquear modificacao de administradores via cliente" ON public.admins;
DROP POLICY IF EXISTS "Bloquear update de administradores via cliente" ON public.admins;
DROP POLICY IF EXISTS "Bloquear delete de administradores via cliente" ON public.admins;

DROP POLICY IF EXISTS "Público pode ler configurações da loja" ON public.store_settings;
DROP POLICY IF EXISTS "Admins podem alterar configurações" ON public.store_settings;

DROP POLICY IF EXISTS "Público pode visualizar categorias ativas" ON public.categories;
DROP POLICY IF EXISTS "Admins podem gerenciar categorias" ON public.categories;

DROP POLICY IF EXISTS "Público pode visualizar produtos disponíveis" ON public.products;
DROP POLICY IF EXISTS "Admins podem gerenciar produtos" ON public.products;

DROP POLICY IF EXISTS "Público pode ver variações de produtos" ON public.product_variations;
DROP POLICY IF EXISTS "Admins podem gerenciar variações" ON public.product_variations;

DROP POLICY IF EXISTS "Público pode ver adicionais de produtos" ON public.product_extras;
DROP POLICY IF EXISTS "Admins podem gerenciar adicionais" ON public.product_extras;

DROP POLICY IF EXISTS "Clientes podem criar pedidos" ON public.orders;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os pedidos" ON public.orders;
DROP POLICY IF EXISTS "Bloquear insercao direta anonima em orders" ON public.orders;
DROP POLICY IF EXISTS "Apenas admin pode visualizar e gerenciar pedidos" ON public.orders;

DROP POLICY IF EXISTS "Clientes podem criar itens do pedido" ON public.order_items;
DROP POLICY IF EXISTS "Admins podem gerenciar todos os itens do pedido" ON public.order_items;
DROP POLICY IF EXISTS "Bloquear insercao direta em order_items" ON public.order_items;
DROP POLICY IF EXISTS "Apenas admin pode gerenciar itens de pedidos" ON public.order_items;

DROP POLICY IF EXISTS "Acesso exclusivo de administradores ao estoque" ON public.inventory_items;
DROP POLICY IF EXISTS "Acesso exclusivo de administradores ao financeiro" ON public.financial_transactions;

-- 10.1 POLÍTICAS PARA ADMINS
-- Usuário autenticado só pode consultar se for ele próprio ou se já for admin confirmado
CREATE POLICY "Admin pode consultar administradores"
    ON public.admins FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- Bloqueio absoluto de mutação via cliente (impede qualquer elevação de privilégios)
CREATE POLICY "Bloquear insert em admins via cliente"
    ON public.admins FOR INSERT
    TO authenticated
    WITH CHECK (false);

CREATE POLICY "Bloquear update em admins via cliente"
    ON public.admins FOR UPDATE
    TO authenticated
    USING (false);

CREATE POLICY "Bloquear delete em admins via cliente"
    ON public.admins FOR DELETE
    TO authenticated
    USING (false);

-- 10.2 POLÍTICAS PARA STORE_SETTINGS
CREATE POLICY "Público pode ler configurações da loja"
    ON public.store_settings FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Apenas admin pode alterar configurações"
    ON public.store_settings FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 10.3 POLÍTICAS PARA CATEGORIES
CREATE POLICY "Público pode visualizar categorias ativas"
    ON public.categories FOR SELECT
    TO anon, authenticated
    USING (active = true OR public.is_admin());

CREATE POLICY "Apenas admin pode gerenciar categorias"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 10.4 POLÍTICAS PARA PRODUCTS
CREATE POLICY "Público pode visualizar produtos disponíveis"
    ON public.products FOR SELECT
    TO anon, authenticated
    USING (available = true OR public.is_admin());

CREATE POLICY "Apenas admin pode gerenciar produtos"
    ON public.products FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 10.5 POLÍTICAS PARA VARIAÇÕES E ADICIONAIS
CREATE POLICY "Público pode ver variações de produtos"
    ON public.product_variations FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Apenas admin pode gerenciar variações"
    ON public.product_variations FOR ALL
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

-- 10.6 POLÍTICAS PARA ORDERS (SEM WITH CHECK TRUE IRRESTRITO)
-- Bloquear inserções diretas do cliente — todo pedido passa pelo cálculo oficial da RPC submit_order
CREATE POLICY "Bloquear insercao direta de pedidos"
    ON public.orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

-- Apenas a proprietária/administradora autenticada pode ler e gerenciar pedidos
CREATE POLICY "Apenas admin pode visualizar e gerenciar pedidos"
    ON public.orders FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 10.7 POLÍTICAS PARA ORDER_ITEMS
CREATE POLICY "Bloquear insercao direta de itens"
    ON public.order_items FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

CREATE POLICY "Apenas admin pode visualizar e gerenciar itens"
    ON public.order_items FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 10.8 POLÍTICAS PARA ESTOQUE E FINANCEIRO
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

-- ==============================================================================
-- 11. PROCEDIMENTO SEGURO DE ATIVAÇÃO DA PROPRIETÁRIA
-- ==============================================================================
-- Função de ativação inicial executável com privilégios de banco.
-- Permite cadastrar a proprietária única vez, validando o usuário no Supabase Auth.
CREATE OR REPLACE FUNCTION public.register_initial_owner(
    p_email TEXT,
    p_name TEXT DEFAULT 'Proprietária Sabor no Pote'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_existing_admins INTEGER;
    v_clean_email TEXT;
BEGIN
    v_clean_email := lower(trim(p_email));

    -- 1. Verificar se já existe algum administrador cadastrado
    SELECT COUNT(*) INTO v_existing_admins FROM public.admins;
    IF v_existing_admins > 0 THEN
        RAISE EXCEPTION 'A proprietária já foi inicializada no sistema. Para segurança, alterações devem ser realizadas no SQL Editor do Supabase.';
    END IF;

    -- 2. Localizar o UID do usuário criado no Supabase Auth
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = v_clean_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário com o e-mail "%" não foi encontrado no Supabase Authentication. Crie o usuário primeiro no menu "Authentication > Users".', v_clean_email;
    END IF;

    -- 3. Inserir como proprietária exclusiva
    INSERT INTO public.admins (user_id, email, name, role, is_active)
    VALUES (v_user_id, v_clean_email, trim(p_name), 'owner', TRUE);

    RETURN 'Sucesso: Proprietária vinculada com sucesso para o e-mail: ' || v_clean_email || ' (UID: ' || v_user_id || ')';
END;
$$;

-- Apenas funções de sistema ou DBA no SQL Editor podem invocar esta função
REVOKE ALL ON FUNCTION public.register_initial_owner(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_initial_owner(TEXT, TEXT) TO postgres, service_role;

-- ==============================================================================
-- GUIA DE EXECUÇÃO PARA A PROPRIETÁRIA:
-- ==============================================================================
-- PASSO 1: No menu "Authentication > Users" do Supabase, clique em "Add user" -> "Create user",
--          insira o seu e-mail e uma senha forte.
--
-- PASSO 2: Abra o "SQL Editor" no menu lateral do Supabase, cole e execute este script completo.
--
-- PASSO 3: Para conceder a autorização exclusiva de proprietária à sua conta, execute uma das opções:
--
--   OPÇÃO A (Via função segura):
--     SELECT public.register_initial_owner('seu_email@exemplo.com', 'Nome da Proprietária');
--
--   OPÇÃO B (Inserção direta via SQL):
--     INSERT INTO public.admins (user_id, email, name, role, is_active)
--     SELECT id, email, 'Proprietária Sabor no Pote', 'owner', true
--     FROM auth.users
--     WHERE email = 'seu_email@exemplo.com'
--     ON CONFLICT (user_id) DO NOTHING;
-- ==============================================================================
