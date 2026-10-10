export type PurchaseUnit = 'kg' | 'g' | 'L' | 'ml' | 'un';
export type RecipeUnit = 'g' | 'ml' | 'un';
export type ExpenseType = 'fixed_monthly' | 'variable_batch' | 'percentage';
export type AllocationBasis = 'per_unit' | 'percentage_sale' | 'fixed';
export type PricingMethod = 'margin' | 'markup';

export interface Ingredient {
  id: string;
  name: string;
  category?: string;
  purchaseQuantity: number;
  purchaseUnit: PurchaseUnit;
  purchasePrice: number;
  unitCost: number; // calculated cost per base unit (g, ml, un)
  supplier?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductRecipeItem {
  id: string;
  productId: string;
  variationId?: string | null;
  ingredientId: string;
  quantityUsed: number;
  unit: RecipeUnit;
  wastePercentage: number;
  ingredient?: Ingredient; // joined for UI convenience
}

export interface ProductionExpense {
  id: string;
  name: string;
  type: ExpenseType;
  amount: number;
  allocationBasis: AllocationBasis;
  createdAt?: string;
}

export interface ProductPricingConfig {
  id: string;
  productId: string;
  variationId?: string | null;
  packagingCost: number;
  desiredMargin: number;
  pricingMethod: PricingMethod;
  cardFeePercentage: number;
  suggestedPrice: number;
  currentCatalogPrice: number;
  updatedAt?: string;
}
