import {
  Ingredient,
  ProductRecipeItem,
  ProductionExpense,
  ProductPricingConfig,
} from '../types/pricing';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Local storage fallback keys
const PRICING_STORAGE_KEYS = {
  INGREDIENTS: 'sabor_no_pote_ingredients_v1',
  RECIPES: 'sabor_no_pote_recipes_v1',
  EXPENSES: 'sabor_no_pote_expenses_v1',
  PRICING_CONFIG: 'sabor_no_pote_pricing_config_v1',
};

/**
 * Helper to calculate normalized unit cost (per gram, per ml, or per unit)
 */
export const calculateUnitCost = (purchasePrice: number, purchaseQuantity: number, purchaseUnit: string): number => {
  if (!purchaseQuantity || purchaseQuantity <= 0) return 0;
  let baseQuantity = purchaseQuantity;
  if (purchaseUnit === 'kg' || purchaseUnit === 'L') {
    baseQuantity = purchaseQuantity * 1000;
  }
  return purchasePrice / baseQuantity;
};

// ==========================================
// 1. INGREDIENTS & PACKAGING
// ==========================================

export const getIngredients = async (): Promise<Ingredient[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('ingredients').select('*').order('name');
      if (error) throw error;
      if (data) {
        const mapped: Ingredient[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          purchaseQuantity: Number(item.purchase_quantity),
          purchaseUnit: item.purchase_unit,
          purchasePrice: Number(item.purchase_price),
          unitCost: Number(item.unit_cost || calculateUnitCost(Number(item.purchase_price), Number(item.purchase_quantity), item.purchase_unit)),
          supplier: item.supplier,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
        localStorage.setItem(PRICING_STORAGE_KEYS.INGREDIENTS, JSON.stringify(mapped));
        return mapped;
      }
    } catch (err: any) {
      console.error('Erro ao carregar insumos do Supabase:', err);
      throw new Error(`Falha ao carregar insumos do banco de dados: ${err.message || err}`);
    }
  }

  try {
    const raw = localStorage.getItem(PRICING_STORAGE_KEYS.INGREDIENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveIngredient = async (item: Ingredient): Promise<Ingredient[]> => {
  const unitCost = calculateUnitCost(item.purchasePrice, item.purchaseQuantity, item.purchaseUnit);
  const itemWithCost = { ...item, unitCost };

  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('ingredients').upsert({
      id: itemWithCost.id,
      name: itemWithCost.name,
      category: itemWithCost.category,
      purchase_quantity: itemWithCost.purchaseQuantity,
      purchase_unit: itemWithCost.purchaseUnit,
      purchase_price: itemWithCost.purchasePrice,
      supplier: itemWithCost.supplier,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      throw new Error(`Erro ao salvar insumo no Supabase: ${error.message}`);
    }
    return await getIngredients();
  }

  // Local fallback if Supabase not configured
  const current = await getIngredients();
  const index = current.findIndex((i) => i.id === item.id);
  let updated: Ingredient[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = itemWithCost;
  } else {
    updated = [...current, { ...itemWithCost, id: item.id || crypto.randomUUID() }];
  }
  localStorage.setItem(PRICING_STORAGE_KEYS.INGREDIENTS, JSON.stringify(updated));
  return updated;
};

export const deleteIngredient = async (id: string): Promise<Ingredient[]> => {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) {
      throw new Error(`Erro ao excluir insumo no Supabase: ${error.message}`);
    }
    return await getIngredients();
  }

  const current = await getIngredients();
  const updated = current.filter((i) => i.id !== id);
  localStorage.setItem(PRICING_STORAGE_KEYS.INGREDIENTS, JSON.stringify(updated));
  return updated;
};

// ==========================================
// 2. PRODUCT RECIPES (FICHAS TÉCNICAS)
// ==========================================

export const getProductRecipes = async (productId?: string): Promise<ProductRecipeItem[]> => {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('product_recipes').select('*, ingredients(*)');
      if (productId) {
        query = query.eq('product_id', productId);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        const mapped: ProductRecipeItem[] = data.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          variationId: item.variation_id,
          ingredientId: item.ingredient_id,
          quantityUsed: Number(item.quantity_used),
          unit: item.unit,
          wastePercentage: Number(item.waste_percentage || 0),
          ingredient: item.ingredients ? {
            id: item.ingredients.id,
            name: item.ingredients.name,
            category: item.ingredients.category,
            purchaseQuantity: Number(item.ingredients.purchase_quantity),
            purchaseUnit: item.ingredients.purchase_unit,
            purchasePrice: Number(item.ingredients.purchase_price),
            unitCost: Number(item.ingredients.unit_cost || calculateUnitCost(Number(item.ingredients.purchase_price), Number(item.ingredients.purchase_quantity), item.ingredients.purchase_unit)),
            supplier: item.ingredients.supplier,
          } : undefined,
        }));
        return mapped;
      }
    } catch (err: any) {
      console.error('Erro ao carregar receitas do Supabase:', err);
      throw new Error(`Falha ao carregar fichas técnicas do banco de dados: ${err.message || err}`);
    }
  }

  try {
    const raw = localStorage.getItem(PRICING_STORAGE_KEYS.RECIPES);
    const parsed: ProductRecipeItem[] = raw ? JSON.parse(raw) : [];
    return productId ? parsed.filter((r) => r.productId === productId) : parsed;
  } catch {
    return [];
  }
};

export const saveProductRecipe = async (recipe: ProductRecipeItem): Promise<ProductRecipeItem[]> => {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('product_recipes').upsert({
      id: recipe.id || crypto.randomUUID(),
      product_id: recipe.productId,
      variation_id: recipe.variationId || null,
      ingredient_id: recipe.ingredientId,
      quantity_used: recipe.quantityUsed,
      unit: recipe.unit,
      waste_percentage: recipe.wastePercentage,
    });
    if (error) {
      throw new Error(`Erro ao salvar ficha técnica no Supabase: ${error.message}`);
    }
    return await getProductRecipes(recipe.productId);
  }

  const current = await getProductRecipes();
  const index = current.findIndex((r) => r.id === recipe.id);
  let updated: ProductRecipeItem[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = recipe;
  } else {
    updated = [...current, { ...recipe, id: recipe.id || crypto.randomUUID() }];
  }
  localStorage.setItem(PRICING_STORAGE_KEYS.RECIPES, JSON.stringify(updated));
  return updated;
};

export const deleteProductRecipe = async (id: string, productId?: string): Promise<ProductRecipeItem[]> => {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('product_recipes').delete().eq('id', id);
    if (error) {
      throw new Error(`Erro ao excluir item da ficha técnica no Supabase: ${error.message}`);
    }
    return await getProductRecipes(productId);
  }

  const current = await getProductRecipes();
  const updated = current.filter((r) => r.id !== id);
  localStorage.setItem(PRICING_STORAGE_KEYS.RECIPES, JSON.stringify(updated));
  return updated;
};

// ==========================================
// 3. PRODUCTION EXPENSES (DESPESAS)
// ==========================================

export const getProductionExpenses = async (): Promise<ProductionExpense[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('production_expenses').select('*').order('name');
      if (error) throw error;
      if (data) {
        const mapped: ProductionExpense[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          amount: Number(item.amount),
          allocationBasis: item.allocation_basis,
          createdAt: item.created_at,
        }));
        localStorage.setItem(PRICING_STORAGE_KEYS.EXPENSES, JSON.stringify(mapped));
        return mapped;
      }
    } catch (err: any) {
      console.error('Erro ao carregar despesas do Supabase:', err);
      throw new Error(`Falha ao carregar despesas do banco de dados: ${err.message || err}`);
    }
  }

  try {
    const raw = localStorage.getItem(PRICING_STORAGE_KEYS.EXPENSES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveProductionExpense = async (expense: ProductionExpense): Promise<ProductionExpense[]> => {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('production_expenses').upsert({
      id: expense.id || crypto.randomUUID(),
      name: expense.name,
      type: expense.type,
      amount: expense.amount,
      allocation_basis: expense.allocationBasis,
    });
    if (error) {
      throw new Error(`Erro ao salvar despesa no Supabase: ${error.message}`);
    }
    return await getProductionExpenses();
  }

  const current = await getProductionExpenses();
  const index = current.findIndex((e) => e.id === expense.id);
  let updated: ProductionExpense[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = expense;
  } else {
    updated = [...current, { ...expense, id: expense.id || crypto.randomUUID() }];
  }
  localStorage.setItem(PRICING_STORAGE_KEYS.EXPENSES, JSON.stringify(updated));
  return updated;
};

export const deleteProductionExpense = async (id: string): Promise<ProductionExpense[]> => {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('production_expenses').delete().eq('id', id);
    if (error) {
      throw new Error(`Erro ao excluir despesa no Supabase: ${error.message}`);
    }
    return await getProductionExpenses();
  }

  const current = await getProductionExpenses();
  const updated = current.filter((e) => e.id !== id);
  localStorage.setItem(PRICING_STORAGE_KEYS.EXPENSES, JSON.stringify(updated));
  return updated;
};

// ==========================================
// 4. PRODUCT PRICING CONFIGS
// ==========================================

export const getProductPricingConfigs = async (): Promise<ProductPricingConfig[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('product_pricing_config').select('*');
      if (error) throw error;
      if (data) {
        const mapped: ProductPricingConfig[] = data.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          variationId: item.variation_id,
          packagingCost: Number(item.packaging_cost || 0),
          desiredMargin: Number(item.desired_margin || 30),
          pricingMethod: item.pricing_method || 'margin',
          cardFeePercentage: Number(item.card_fee_percentage || 0),
          suggestedPrice: Number(item.suggested_price || 0),
          currentCatalogPrice: Number(item.current_catalog_price || 0),
          updatedAt: item.updated_at,
        }));
        localStorage.setItem(PRICING_STORAGE_KEYS.PRICING_CONFIG, JSON.stringify(mapped));
        return mapped;
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações de preço do Supabase:', err);
      throw new Error(`Falha ao carregar configurações de preço do banco de dados: ${err.message || err}`);
    }
  }

  try {
    const raw = localStorage.getItem(PRICING_STORAGE_KEYS.PRICING_CONFIG);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveProductPricingConfig = async (config: ProductPricingConfig): Promise<ProductPricingConfig[]> => {
  if (isSupabaseConfigured()) {
    const payload: any = {
      product_id: config.productId,
      variation_id: config.variationId || null,
      packaging_cost: config.packagingCost,
      desired_margin: config.desiredMargin,
      pricing_method: config.pricingMethod,
      card_fee_percentage: config.cardFeePercentage,
      suggested_price: config.suggestedPrice,
      current_catalog_price: config.currentCatalogPrice,
      updated_at: new Date().toISOString(),
    };

    // Check if configuration already exists for this product and variation
    let query = supabase.from('product_pricing_config').select('id').eq('product_id', config.productId);
    if (config.variationId) {
      query = query.eq('variation_id', config.variationId);
    } else {
      query = query.is('variation_id', null);
    }

    const { data: existing, error: findError } = await query.maybeSingle();
    if (findError) {
      throw new Error(`Erro ao verificar configuração de preço existente no Supabase: ${findError.message}`);
    }

    let error;
    if (existing && existing.id) {
      const { error: updateError } = await supabase
        .from('product_pricing_config')
        .update(payload)
        .eq('id', existing.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('product_pricing_config')
        .insert({
          id: config.id || crypto.randomUUID(),
          ...payload,
        });
      error = insertError;
    }

    if (error) {
      throw new Error(`Erro ao salvar configuração de preço no Supabase: ${error.message}`);
    }
    return await getProductPricingConfigs();
  }

  const current = await getProductPricingConfigs();
  const index = current.findIndex(
    (c) => c.productId === config.productId && (c.variationId || null) === (config.variationId || null)
  );
  let updated: ProductPricingConfig[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = config;
  } else {
    updated = [...current, { ...config, id: config.id || crypto.randomUUID() }];
  }
  localStorage.setItem(PRICING_STORAGE_KEYS.PRICING_CONFIG, JSON.stringify(updated));
  return updated;
};

