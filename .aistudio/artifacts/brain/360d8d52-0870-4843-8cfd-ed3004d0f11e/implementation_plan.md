# Planejamento Técnico — Módulo de Precificação e Ficha Técnica (Sabor no Pote)

Este documento descreve o planejamento técnico completo para a implementação do novo módulo de **Precificação & Ficha Técnica** no painel administrativo do Sabor no Pote, atendendo a todos os requisitos de gestão de insumos, fichas técnicas, despesas de produção, formação de preços, simulador e segurança com Supabase.

---

## 1. Arquitetura do Banco de Dados (Supabase & RLS)

Para armazenar todas as informações com segurança e persistência no Supabase (utilizando políticas RLS restritas exclusivamente à proprietária via `public.is_admin()`), criaremos as seguintes novas tabelas e estruturas:

### A. Tabela `ingredients` (Insumos e Embalagens)
Armazena a matéria-prima, ingredientes e embalagens compradas.
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `category` (TEXT) -- Ex: Laticínios, Embalagens, Confeitaria, Frutas
- `purchase_quantity` (NUMERIC, NOT NULL) -- Ex: 1000 (g), 1 (L), 100 (un)
- `purchase_unit` (TEXT, NOT NULL) -- 'kg', 'g', 'L', 'ml', 'un'
- `purchase_price` (NUMERIC(10,2), NOT NULL) -- Valor total pago na compra
- `unit_cost` (NUMERIC(12,4), GENERATED or calculated) -- Custo unitário base (por grama, ml ou unidade)
- `supplier` (TEXT)
- `updated_at` (TIMESTAMPTZ)

### B. Tabela `product_recipes` (Fichas Técnicas / Ingredientes da Receita)
Relaciona os produtos do cardápio (ou variações de tamanho) aos insumos utilizados.
- `id` (UUID, PK)
- `product_id` (UUID, FK -> `products.id`, CASCADE)
- `variation_id` (UUID, FK -> `product_variations.id`, nullable, CASCADE) -- Para receitas específicas por tamanho
- `ingredient_id` (UUID, FK -> `ingredients.id`, CASCADE)
- `quantity_used` (NUMERIC(12,4), NOT NULL) -- Quantidade utilizada na receita (em g, ml ou unidades)
- `unit` (TEXT, NOT NULL) -- 'g', 'ml', 'un'
- `waste_percentage` (NUMERIC(5,2) DEFAULT 0.00) -- Percentual de perda/desperdício
- `created_at` (TIMESTAMPTZ)

### C. Tabela `production_expenses` (Despesas Operacionais e Rateio)
Armazena custos fixos e variáveis (água, luz, gás, mão de obra, taxas).
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL) -- Ex: Gás de Cozinha, Energia Elétrica, Embalagem Padrão, Taxa de Máquininha (%)
- `type` (TEXT, NOT NULL) -- 'fixed_monthly' (despesa fixa mensal), 'variable_batch' (por lote/receita), 'percentage' (% sobre venda)
- `amount` (NUMERIC(10,2), NOT NULL) -- Valor da despesa
- `allocation_basis` (TEXT) -- 'per_unit', 'percentage_sale', 'fixed'
- `created_at` (TIMESTAMPTZ)

### D. Tabela `product_pricing_config` (Configurações de Margem e Preço)
Armazena parâmetros de precificação por produto/variação.
- `id` (UUID, PK)
- `product_id` (UUID, FK -> `products.id`, CASCADE)
- `variation_id` (UUID, FK -> `product_variations.id`, nullable, CASCADE)
- `packaging_cost` (NUMERIC(10,2) DEFAULT 0.00)
- `desired_margin` (NUMERIC(5,2) DEFAULT 30.00) -- Margem de lucro desejada (%)
- `pricing_method` (TEXT DEFAULT 'margin') -- 'margin' (% sobre preço de venda) ou 'markup' (% sobre custo)
- `card_fee_percentage` (NUMERIC(5,2) DEFAULT 0.00)
- `suggested_price` (NUMERIC(10,2))
- `current_catalog_price` (NUMERIC(10,2)) -- Preço atualmente publicado no cardápio
- `updated_at` (TIMESTAMPTZ)

### Políticas de Segurança RLS
Para todas as novas tabelas (`ingredients`, `product_recipes`, `production_expenses`, `product_pricing_config`), aplicaremos a seguinte política de segurança no Supabase:
```sql
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on ingredients" ON public.ingredients
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
```
(Repetido para as demais tabelas, garantindo acesso exclusivo à proprietária).

---

## 2. Alterações na Interface (Painel Administrativo)

Adicionaremos uma nova aba no `AdminDashboard.tsx` chamada **"Precificação & Ficha Técnica"** com sub-abas interativas:

1. **Insumos & Embalagens**:
   - Tabela de cadastro com nome, categoria, quantidade comprada, unidade, valor total e cálculo automático do custo unitário (ex: R$ 0,02 / g).
   - Modal para cadastrar/editar insumos com validação e histórico de atualização de preços.

2. **Fichas Técnicas**:
   - Seleção de produto e variação de tamanho.
   - Adição dinâmica de ingredientes com quantidade utilizada, unidade e margem de perda/desperdício (%).
   - Cálculo automático do custo dos ingredientes por unidade produzida.

3. **Despesas & Custos Operacionais**:
   - Cadastro de despesas fixas (gás, energia, água) e percentuais (taxas de cartão, impostos).
   - Configuração de rateio por unidade ou lote.

4. **Formação de Preços & Simulador**:
   - Visão consolidada por produto mostrando: Custo de Insumos + Custo de Embalagem + Rateio de Despesas = **Custo Total**.
   - Simulação interativa ajustando a **Margem de Lucro (%)** ou **Markup (%)**, exibindo o **Preço Sugerido de Venda**, Lucro Estimado em R$ e alerta visual caso o preço atual esteja abaixo do custo.
   - Botão para **"Atualizar Preço no Cardápio"** (exibe confirmação explícita antes de aplicar no cardápio público).

---

## 3. Plano de Execução por Etapas

1. **Etapa 1**: Execução do script SQL no Supabase para criar as tabelas e políticas RLS de precificação.
2. **Etapa 2**: Implementação dos serviços de banco de dados (`src/services/pricingService.ts`) para comunicação tipada com o Supabase.
3. **Etapa 3**: Criação dos componentes React para a nova aba no painel administrativo.
4. **Etapa 4**: Testes de compilação, validação de regras de segurança e verificação de integridade com o restante do sistema.

Aguardamos sua autorização para iniciar a implementação técnica.
