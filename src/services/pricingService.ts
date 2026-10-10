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

// ==========================================
// 1. INGREDIENTS & PACKAGING
// ==========================================

export const getIngredients = async (): Promise<Ingredient[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('ingredients').select('*').order('name');
      if (!error && data) {
        const mapped: Ingredient[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          purchaseQuantity: Number(item.purchase_quantity),
          purchaseUnit: item.purchase_unit,
          purchasePrice: Number(item.purchase_price),
          unitCost: Number(item.unit_cost || item.purchase_price / (item.purchase_quantity || 1)),
          supplier: item.supplier,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
        localStorage.setItem(PRICING_STORAGE_KEYS.INGREDIENTS, JSON.stringify(mapped));
        return mapped;
      }
    } catch (err) {
      console.warn('Erro ao carregar insumos do Supabase, usando cache local:', err);
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
  // Calculate unit cost locally for fallback / instant response
  const unitCost = item.purchaseQuantity > 0 ? item.purchasePrice / item.purchaseQuantity : 0;
  const itemWithCost = { ...item, unitCost };

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

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('ingredients').upsert({
        id: itemWithCost.id,
        name: itemWithCost.name,
        category: itemWithCost.category,
        purchase_quantity: itemWithCost.purchaseQuantity,
        purchase_unit: itemWithCost.purchaseUnit,
        purchase_price: itemWithCost.purchasePrice,
        supplier: itemWithCost.supplier,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Erro ao salvar insumo no Supabase:', err);
    }
  }

  return updated;
};

export const deleteIngredient = async (id: string): Promise<Ingredient[]> => {
  const current = await getIngredients();
  const updated = current.filter((i) => i.id !== id);
  localStorage.setItem(PRICING_STORAGE_KEYS.INGREDIENTS, JSON.stringify(updated));

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('ingredients').delete().eq('id', id);
    } catch (err) {
      console.warn('Erro ao excluir insumo no Supabase:', err);
    }
  }

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
      if (!error && data) {
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
            unitCost: Number(item.ingredients.unit_cost || item.ingredients.purchase_price / (item.ingredients.purchase_quantity || 1)),
            supplier: item.ingredients.supplier,
          } : undefined,
        }));
        return mapped;
      }
    } catch (err) {
      console.warn('Erro ao carregar receitas do Supabase:', err);
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

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('product_recipes').upsert({
        id: recipe.id || crypto.randomUUID(),
        product_id: recipe.productId,
        variation_id: recipe.variationId || null,
        ingredient_id: recipe.ingredientId,
        quantity_used: recipe.quantityUsed,
        unit: recipe.unit,
        waste_percentage: recipe.wastePercentage,
      });
    } catch (err) {
      console.warn('Erro ao salvar receita no Supabase:', err);
    }
  }

  return updated;
};

export const deleteProductRecipe = async (id: string): Promise<ProductRecipeItem[]> => {
  const current = await getProductRecipes();
  const updated = current.filter((r) => r.id !== id);
  localStorage.setItem(PRICING_STORAGE_KEYS.RECIPES, JSON.stringify(updated));

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('product_recipes').delete().eq('id', id);
    } catch (err) {
      console.warn('Erro ao excluir receita no Supabase:', err);
    }
  }

  return updated;
};

// ==========================================
// 3. PRODUCTION EXPENSES (DESPESAS)
// ==========================================

export const getProductionExpenses = async (): Promise<ProductionExpense[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('production_expenses').select('*').order('name');
      if (!error && data) {
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
    } catch (err) {
      console.warn('Erro ao carregar despesas do Supabase:', err);
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

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('production_expenses').upsert({
        id: expense.id || crypto.randomUUID(),
        name: expense.name,
        type: expense.type,
        amount: expense.amount,
        allocation_basis: expense.allocationBasis,
      });
    } catch (err) {
      console.warn('Erro ao salvar despesa no Supabase:', err);
    }
  }

  return updated;
};

export const deleteProductionExpense = async (id: string): Promise<ProductionExpense[]> => {
  const current = await getProductionExpenses();
  const updated = current.filter((e) => e.id !== id);
  localStorage.setItem(PRICING_STORAGE_KEYS.EXPENSES, JSON.stringify(updated));

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('production_expenses').delete().eq('id', id);
    } catch (err) {
      console.warn('Erro ao excluir despesa no Supabase:', err);
    }
  }

  return updated;
};

// ==========================================
// 4. PRODUCT PRICING CONFIGS
// ==========================================

export const getProductPricingConfigs = async (): Promise<ProductPricingConfig[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('product_pricing_config').select('*');
      if (!error && data) {
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
    } catch (err) {
      console.warn('Erro ao carregar configurações de preço do Supabase:', err);
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

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('product_pricing_config').upsert({
        id: config.id || crypto.randomUUID(),
        product_id: config.productId,
        variation_id: config.variationId || null,
        packaging_cost: config.packagingCost,
        desired_margin: config.desiredMargin,
        pricing_method: config.pricingMethod,
        card_fee_percentage: config.cardFeePercentage,
        suggested_price: config.suggestedPrice,
        current_catalog_price: config.currentCatalogPrice,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'product_id,variation_id' });
    } catch (err) {
      console.warn('Erro ao salvar configuração de preço no Supabase:', err);
    }
  }

  return updated;
};
