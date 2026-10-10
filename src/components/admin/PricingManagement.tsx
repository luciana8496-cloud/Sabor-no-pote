import React, { useState, useEffect } from 'react';
import {
  Ingredient,
  ProductRecipeItem,
  ProductionExpense,
  ProductPricingConfig,
  PurchaseUnit,
  RecipeUnit,
  ExpenseType,
  AllocationBasis,
  PricingMethod,
} from '../../types/pricing';
import { Product, Category } from '../../types/store';
import {
  getIngredients,
  saveIngredient,
  deleteIngredient,
  getProductRecipes,
  saveProductRecipe,
  deleteProductRecipe,
  getProductionExpenses,
  saveProductionExpense,
  deleteProductionExpense,
  getProductPricingConfigs,
  saveProductPricingConfig,
} from '../../services/pricingService';
import { saveProduct } from '../../services/storeService';
import {
  DollarSign,
  Plus,
  Trash2,
  Edit,
  Save,
  Package,
  FileText,
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Layers,
  Percent,
  Sliders,
  Check,
  X,
} from 'lucide-react';

interface PricingManagementProps {
  products: Product[];
  categories: Category[];
  onCatalogUpdated: () => void;
}

type PricingSubTab = 'ingredients' | 'recipes' | 'expenses' | 'simulator';

export const PricingManagement: React.FC<PricingManagementProps> = ({
  products,
  categories,
  onCatalogUpdated,
}) => {
  const [subTab, setSubTab] = useState<PricingSubTab>('ingredients');
  const [loading, setLoading] = useState<boolean>(false);

  // Data states
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<ProductRecipeItem[]>([]);
  const [expenses, setExpenses] = useState<ProductionExpense[]>([]);
  const [pricingConfigs, setPricingConfigs] = useState<ProductPricingConfig[]>([]);

  // Ingredient Modal & Form
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [ingredientForm, setIngredientForm] = useState<{
    name: string;
    category: string;
    purchaseQuantity: string;
    purchaseUnit: PurchaseUnit;
    purchasePrice: string;
    supplier: string;
  }>({
    name: '',
    category: '',
    purchaseQuantity: '',
    purchaseUnit: 'kg',
    purchasePrice: '',
    supplier: '',
  });

  // Recipe Modal & Form
  const [selectedProductIdForRecipe, setSelectedProductIdForRecipe] = useState<string>(
    products[0]?.id || ''
  );
  const [selectedVariationIdForRecipe, setSelectedVariationIdForRecipe] = useState<string>('');
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeForm, setRecipeForm] = useState<{
    ingredientId: string;
    quantityUsed: string;
    unit: RecipeUnit;
    wastePercentage: string;
  }>({
    ingredientId: '',
    quantityUsed: '',
    unit: 'g',
    wastePercentage: '0',
  });

  // Expense Modal & Form
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ProductionExpense | null>(null);
  const [expenseForm, setExpenseForm] = useState<{
    name: string;
    type: ExpenseType;
    amount: string;
    allocationBasis: AllocationBasis;
  }>({
    name: '',
    type: 'fixed_monthly',
    amount: '',
    allocationBasis: 'per_unit',
  });

  // Simulator / Pricing Config State
  const [simulatedConfigs, setSimulatedConfigs] = useState<Record<string, ProductPricingConfig>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load all data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ingRes, recRes, expRes, cfgRes] = await Promise.all([
        getIngredients(),
        getProductRecipes(),
        getProductionExpenses(),
        getProductPricingConfigs(),
      ]);
      setIngredients(ingRes);
      setRecipes(recRes);
      setExpenses(expRes);

      const cfgMap: Record<string, ProductPricingConfig> = {};
      cfgRes.forEach((cfg) => {
        const key = `${cfg.productId}_${cfg.variationId || 'base'}`;
        cfgMap[key] = cfg;
      });
      setPricingConfigs(cfgRes);
      setSimulatedConfigs(cfgMap);
    } catch (err) {
      console.error('Erro ao carregar dados de precificação:', err);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // INGREDIENTS ACTIONS
  // ----------------------------------------------------
  const handleOpenIngredientModal = (ing?: Ingredient) => {
    if (ing) {
      setEditingIngredient(ing);
      setIngredientForm({
        name: ing.name,
        category: ing.category || '',
        purchaseQuantity: ing.purchaseQuantity.toString(),
        purchaseUnit: ing.purchaseUnit,
        purchasePrice: ing.purchasePrice.toString(),
        supplier: ing.supplier || '',
      });
    } else {
      setEditingIngredient(null);
      setIngredientForm({
        name: '',
        category: '',
        purchaseQuantity: '',
        purchaseUnit: 'kg',
        purchasePrice: '',
        supplier: '',
      });
    }
    setIsIngredientModalOpen(true);
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(ingredientForm.purchaseQuantity);
    const price = parseFloat(ingredientForm.purchasePrice);
    if (!ingredientForm.name || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
      alert('Por favor, preencha o nome, quantidade comprada (>0) e valor da compra corretamente.');
      return;
    }

    const unitCost = price / qty;
    const newIng: Ingredient = {
      id: editingIngredient ? editingIngredient.id : crypto.randomUUID(),
      name: ingredientForm.name,
      category: ingredientForm.category || 'Geral',
      purchaseQuantity: qty,
      purchaseUnit: ingredientForm.purchaseUnit,
      purchasePrice: price,
      unitCost,
      supplier: ingredientForm.supplier,
    };

    const updated = await saveIngredient(newIng);
    setIngredients(updated);
    setIsIngredientModalOpen(false);
    showSuccess('Insumo salvo com sucesso!');
  };

  const handleDeleteIngredient = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este insumo? As receitas associadas serão afetadas.')) {
      const updated = await deleteIngredient(id);
      setIngredients(updated);
      showSuccess('Insumo excluído.');
    }
  };

  // ----------------------------------------------------
  // RECIPES ACTIONS
  // ----------------------------------------------------
  const handleSaveRecipeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(recipeForm.quantityUsed);
    const waste = parseFloat(recipeForm.wastePercentage) || 0;
    if (!selectedProductIdForRecipe || !recipeForm.ingredientId || isNaN(qty) || qty <= 0) {
      alert('Selecione o produto, o ingrediente e informe uma quantidade válida.');
      return;
    }

    const newRecipe: ProductRecipeItem = {
      id: crypto.randomUUID(),
      productId: selectedProductIdForRecipe,
      variationId: selectedVariationIdForRecipe || null,
      ingredientId: recipeForm.ingredientId,
      quantityUsed: qty,
      unit: recipeForm.unit,
      wastePercentage: waste,
    };

    const updated = await saveProductRecipe(newRecipe);
    setRecipes(updated);
    setIsRecipeModalOpen(false);
    setRecipeForm({ ingredientId: '', quantityUsed: '', unit: 'g', wastePercentage: '0' });
    showSuccess('Ingrediente adicionado à ficha técnica!');
  };

  const handleDeleteRecipeItem = async (id: string) => {
    const updated = await deleteProductRecipe(id);
    setRecipes(updated);
    showSuccess('Item removido da ficha técnica.');
  };

  // ----------------------------------------------------
  // EXPENSES ACTIONS
  // ----------------------------------------------------
  const handleOpenExpenseModal = (exp?: ProductionExpense) => {
    if (exp) {
      setEditingExpense(exp);
      setExpenseForm({
        name: exp.name,
        type: exp.type,
        amount: exp.amount.toString(),
        allocationBasis: exp.allocationBasis,
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        name: '',
        type: 'fixed_monthly',
        amount: '',
        allocationBasis: 'per_unit',
      });
    }
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseForm.amount);
    if (!expenseForm.name || isNaN(amt) || amt < 0) {
      alert('Informe o nome da despesa e um valor válido.');
      return;
    }

    const newExp: ProductionExpense = {
      id: editingExpense ? editingExpense.id : crypto.randomUUID(),
      name: expenseForm.name,
      type: expenseForm.type,
      amount: amt,
      allocationBasis: expenseForm.allocationBasis,
    };

    const updated = await saveProductionExpense(newExp);
    setExpenses(updated);
    setIsExpenseModalOpen(false);
    showSuccess('Despesa de produção salva com sucesso!');
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Deseja excluir esta despesa?')) {
      const updated = await deleteProductionExpense(id);
      setExpenses(updated);
      showSuccess('Despesa excluída.');
    }
  };

  // ----------------------------------------------------
  // CALCULATIONS & SIMULATOR HELPERS
  // ----------------------------------------------------
  const calculateProductCosts = (productId: string, variationId?: string | null) => {
    // 1. Ingredients Cost
    const productRecipes = recipes.filter(
      (r) => r.productId === productId && (r.variationId || null) === (variationId || null)
    );

    let ingredientCost = 0;
    productRecipes.forEach((rec) => {
      const ing = ingredients.find((i) => i.id === rec.ingredientId);
      if (ing) {
        // unitCost is cost per purchaseUnit (e.g. per kg, L, un).
        // Let's convert unit correctly:
        // If purchaseUnit is 'kg' and recipe unit is 'g': unitCost is per kg (1000g). So cost per g = ing.purchasePrice / ing.purchaseQuantity / 1000.
        // Wait, let's standardize: base unit cost in pricingService is per purchase unit.
        let costPerBase = ing.unitCost; // cost per purchaseUnit
        let multiplier = 1;
        const pUnit = ing.purchaseUnit as string;
        const rUnit = rec.unit as string;

        if (pUnit === 'kg' && rUnit === 'g') {
          multiplier = 1 / 1000;
        } else if (pUnit === 'L' && rUnit === 'ml') {
          multiplier = 1 / 1000;
        } else if (pUnit === 'g' && rUnit === 'kg') {
          multiplier = 1000;
        } else if (pUnit === 'ml' && rUnit === 'L') {
          multiplier = 1000;
        }

        const baseItemCost = costPerCostCalculation(ing, rec.quantityUsed, multiplier);
        const wasteMultiplier = 1 + (rec.wastePercentage || 0) / 100;
        ingredientCost += baseItemCost * wasteMultiplier;
      }
    });

    const configKey = `${productId}_${variationId || 'base'}`;
    const config = simulatedConfigs[configKey] || {
      id: '',
      productId,
      variationId: variationId || null,
      packagingCost: 0,
      desiredMargin: 30,
      pricingMethod: 'margin',
      cardFeePercentage: 0,
      suggestedPrice: 0,
      currentCatalogPrice: 0,
    };

    const packagingCost = config.packagingCost || 0;

    // 2. Expenses Allocation
    // Sum fixed and variable expenses allocated per unit or batch
    let overheadPerUnit = 0;
    expenses.forEach((exp) => {
      if (exp.allocationBasis === 'per_unit') {
        overheadPerUnit += exp.amount;
      }
    });

    const totalCost = ingredientCost + packagingCost + overheadPerUnit;
    const margin = config.desiredMargin || 30;
    const cardFee = config.cardFeePercentage || 0;

    let suggestedPrice = 0;
    if (config.pricingMethod === 'margin') {
      // Formula: Price = Total Cost / (1 - (Margin + CardFee) / 100)
      const denominator = 1 - (margin + cardFee) / 100;
      suggestedPrice = denominator > 0 ? totalCost / denominator : totalCost * 1.5;
    } else {
      // Markup: Price = Total Cost * (1 + Margin / 100)
      suggestedPrice = totalCost * (1 + margin / 100);
    }

    const profitReais = suggestedPrice - totalCost - (suggestedPrice * cardFee) / 100;
    const profitPercentage = suggestedPrice > 0 ? (profitReais / suggestedPrice) * 100 : 0;

    return {
      ingredientCost,
      packagingCost,
      overheadPerUnit,
      totalCost,
      suggestedPrice,
      profitReais,
      profitPercentage,
      config,
    };
  };

  const costPerCostCalculation = (ing: Ingredient, qtyUsed: number, multiplier: number) => {
    return ing.unitCost * qtyUsed * multiplier;
  };

  const handleUpdateConfigField = (
    productId: string,
    variationId: string | null,
    field: keyof ProductPricingConfig,
    value: any
  ) => {
    const configKey = `${productId}_${variationId || 'base'}`;
    const current = simulatedConfigs[configKey] || {
      id: crypto.randomUUID(),
      productId,
      variationId,
      packagingCost: 0,
      desiredMargin: 30,
      pricingMethod: 'margin',
      cardFeePercentage: 0,
      suggestedPrice: 0,
      currentCatalogPrice: 0,
    };

    const updatedConfig = { ...current, [field]: value };

    // Recalculate suggested price instantly
    const costs = calculateProductCostsForConfig(productId, variationId, updatedConfig);
    updatedConfig.suggestedPrice = Number(costs.suggestedPrice.toFixed(2));

    setSimulatedConfigs({
      ...simulatedConfigs,
      [configKey]: updatedConfig,
    });
  };

  const calculateProductCostsForConfig = (
    productId: string,
    variationId: string | null,
    config: ProductPricingConfig
  ) => {
    const productRecipes = recipes.filter(
      (r) => r.productId === productId && (r.variationId || null) === (variationId || null)
    );

    let ingredientCost = 0;
    productRecipes.forEach((rec) => {
      const ing = ingredients.find((i) => i.id === rec.ingredientId);
      if (ing) {
        let multiplier = 1;
        const pUnit = ing.purchaseUnit as string;
        const rUnit = rec.unit as string;
        if (pUnit === 'kg' && rUnit === 'g') multiplier = 1 / 1000;
        else if (pUnit === 'L' && rUnit === 'ml') multiplier = 1 / 1000;
        else if (pUnit === 'g' && rUnit === 'kg') multiplier = 1000;
        else if (pUnit === 'ml' && rUnit === 'L') multiplier = 1000;

        const baseItemCost = ing.unitCost * rec.quantityUsed * multiplier;
        const wasteMultiplier = 1 + (rec.wastePercentage || 0) / 100;
        ingredientCost += baseItemCost * wasteMultiplier;
      }
    });

    const packagingCost = config.packagingCost || 0;
    let overheadPerUnit = 0;
    expenses.forEach((exp) => {
      if (exp.allocationBasis === 'per_unit') {
        overheadPerUnit += exp.amount;
      }
    });

    const totalCost = ingredientCost + packagingCost + overheadPerUnit;
    const margin = config.desiredMargin || 30;
    const cardFee = config.cardFeePercentage || 0;

    let suggestedPrice = 0;
    if (config.pricingMethod === 'margin') {
      const denominator = 1 - (margin + cardFee) / 100;
      suggestedPrice = denominator > 0 ? totalCost / denominator : totalCost * 1.5;
    } else {
      suggestedPrice = totalCost * (1 + margin / 100);
    }

    return { suggestedPrice, totalCost };
  };

  const handleSaveConfigAndSync = async (productId: string, variationId: string | null) => {
    const configKey = `${productId}_${variationId || 'base'}`;
    const cfg = simulatedConfigs[configKey];
    if (!cfg) return;

    await saveProductPricingConfig(cfg);
    showSuccess('Configuração de precificação salva com sucesso!');
  };

  const handleApplySuggestedPriceToCatalog = async (
    product: Product,
    variationId: string | null,
    suggestedPrice: number
  ) => {
    if (
      !confirm(
        `Deseja atualizar o preço oficial do produto "${product.name}"${
          variationId ? ' (nesta variação)' : ''
        } no cardápio público para R$ ${suggestedPrice.toFixed(2)}?`
      )
    ) {
      return;
    }

    let updatedProduct = { ...product };
    if (variationId && updatedProduct.sizes) {
      updatedProduct.sizes = updatedProduct.sizes.map((sz) =>
        sz.id === variationId ? { ...sz, price: suggestedPrice } : sz
      );
    } else {
      updatedProduct.basePrice = suggestedPrice;
    }

    await saveProduct(updatedProduct);
    onCatalogUpdated();
    showSuccess('Preço atualizado no cardápio público com sucesso!');
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Sub-tabs header */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-4">
        <button
          onClick={() => setSubTab('ingredients')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            subTab === 'ingredients'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Package className="w-4 h-4" />
          Insumos & Embalagens ({ingredients.length})
        </button>
        <button
          onClick={() => setSubTab('recipes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            subTab === 'recipes'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Fichas Técnicas ({recipes.length})
        </button>
        <button
          onClick={() => setSubTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            subTab === 'expenses'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Despesas de Produção ({expenses.length})
        </button>
        <button
          onClick={() => setSubTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            subTab === 'simulator'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Formação de Preços & Simulador
        </button>
      </div>

      {/* ==================================================== */}
      {/* 1. INGREDIENTS & PACKAGING TAB */}
      {/* ==================================================== */}
      {subTab === 'ingredients' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-stone-800">Cadastro de Insumos e Embalagens</h3>
              <p className="text-sm text-stone-500">
                Cadastre a matéria-prima e embalagens para calcular automaticamente o custo unitário (g, ml, un).
              </p>
            </div>
            <button
              onClick={() => handleOpenIngredientModal()}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Novo Insumo / Embalagem
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Insumo / Embalagem</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Qtd. Comprada</th>
                    <th className="py-3 px-4">Valor Pago</th>
                    <th className="py-3 px-4">Custo Unitário Base</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {ingredients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400">
                        Nenhum insumo cadastrado ainda. Clique em "Novo Insumo / Embalagem" para começar.
                      </td>
                    </tr>
                  ) : (
                    ingredients.map((ing) => (
                      <tr key={ing.id} className="hover:bg-stone-50/80 transition">
                        <td className="py-3 px-4 font-medium text-stone-800">{ing.name}</td>
                        <td className="py-3 px-4">
                          <span className="inline-block bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            {ing.category || 'Geral'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-600">
                          {ing.purchaseQuantity} {ing.purchaseUnit}
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-800">
                          R$ {ing.purchasePrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-amber-700 font-bold">
                          R$ {(ing.unitCost || 0).toFixed(4)} /{' '}
                          {ing.purchaseUnit === 'kg'
                            ? 'g'
                            : ing.purchaseUnit === 'L'
                            ? 'ml'
                            : 'un'}
                        </td>
                        <td className="py-3 px-4 text-stone-500">{ing.supplier || '-'}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenIngredientModal(ing)}
                            className="p-1.5 text-stone-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteIngredient(ing.id)}
                            className="p-1.5 text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. RECIPES TAB */}
      {/* ==================================================== */}
      {subTab === 'recipes' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
            <div>
              <h3 className="text-lg font-bold text-stone-800">Fichas Técnicas dos Produtos</h3>
              <p className="text-sm text-stone-500">
                Vincule insumos e embalagens aos produtos do cardápio e suas variações de tamanho.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={selectedProductIdForRecipe}
                onChange={(e) => {
                  setSelectedProductIdForRecipe(e.target.value);
                  setSelectedVariationIdForRecipe('');
                }}
                className="bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none flex-1 md:w-64"
              >
                <option value="">Selecione um produto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!selectedProductIdForRecipe) {
                    alert('Selecione um produto primeiro.');
                    return;
                  }
                  if (ingredients.length === 0) {
                    alert('Cadastre insumos antes de criar fichas técnicas.');
                    return;
                  }
                  setIsRecipeModalOpen(true);
                }}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                Adicionar Ingrediente
              </button>
            </div>
          </div>

          {/* Selected Product Details & Recipe Table */}
          {selectedProductIdForRecipe ? (() => {
            const currentProd = products.find((p) => p.id === selectedProductIdForRecipe);
            const currentRecipes = recipes.filter(
              (r) =>
                r.productId === selectedProductIdForRecipe &&
                (r.variationId || null) === (selectedVariationIdForRecipe || null)
            );

            return (
              <div className="space-y-4">
                {/* Variation selector if product has sizes */}
                {currentProd?.sizes && currentProd.sizes.length > 0 && (
                  <div className="flex items-center gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <span className="text-sm font-medium text-stone-700">Tamanho / Variação:</span>
                    <button
                      onClick={() => setSelectedVariationIdForRecipe('')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        !selectedVariationIdForRecipe
                          ? 'bg-amber-600 text-white'
                          : 'bg-white text-stone-700 border border-stone-200'
                      }`}
                    >
                      Padrão / Base
                    </button>
                    {currentProd.sizes.map((sz) => (
                      <button
                        key={sz.id}
                        onClick={() => setSelectedVariationIdForRecipe(sz.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          selectedVariationIdForRecipe === sz.id
                            ? 'bg-amber-600 text-white'
                            : 'bg-white text-stone-700 border border-stone-200'
                        }`}
                      >
                        {sz.name} (R$ {sz.price.toFixed(2)})
                      </button>
                    ))}
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                  <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-stone-800">
                        {currentProd?.name}{' '}
                        {selectedVariationIdForRecipe &&
                          `- ${
                            currentProd?.sizes?.find((s) => s.id === selectedVariationIdForRecipe)?.name
                          }`}
                      </h4>
                      <p className="text-xs text-stone-500">
                        {currentRecipes.length} insumo(s) vinculado(s)
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50/50 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Insumo / Embalagem</th>
                          <th className="py-3 px-4">Qtd. Utilizada</th>
                          <th className="py-3 px-4">Perda / Desperdício (%)</th>
                          <th className="py-3 px-4">Custo Unitário Calculado</th>
                          <th className="py-3 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-sm">
                        {currentRecipes.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-stone-400">
                              Nenhum ingrediente nesta ficha técnica. Clique em "Adicionar Ingrediente".
                            </td>
                          </tr>
                        ) : (
                          currentRecipes.map((rec) => {
                            const ing = ingredients.find((i) => i.id === rec.ingredientId);
                            if (!ing) return null;

                            let multiplier = 1;
                            const pUnit = ing.purchaseUnit as string;
                            const rUnit = rec.unit as string;
                            if (pUnit === 'kg' && rUnit === 'g') multiplier = 1 / 1000;
                            else if (pUnit === 'L' && rUnit === 'ml')
                              multiplier = 1 / 1000;
                            else if (pUnit === 'g' && rUnit === 'kg')
                              multiplier = 1000;
                            else if (pUnit === 'ml' && rUnit === 'L')
                              multiplier = 1000;

                            const baseCost = ing.unitCost * rec.quantityUsed * multiplier;
                            const totalWithWaste = baseCost * (1 + rec.wastePercentage / 100);

                            return (
                              <tr key={rec.id} className="hover:bg-stone-50 transition">
                                <td className="py-3 px-4 font-medium text-stone-800">{ing.name}</td>
                                <td className="py-3 px-4 text-stone-600">
                                  {rec.quantityUsed} {rec.unit}
                                </td>
                                <td className="py-3 px-4 text-stone-600">
                                  {rec.wastePercentage}%
                                </td>
                                <td className="py-3 px-4 font-semibold text-amber-700">
                                  R$ {totalWithWaste.toFixed(4)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => handleDeleteRecipeItem(rec.id)}
                                    className="p-1.5 text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Remover"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="bg-white p-8 rounded-2xl text-center border border-stone-200 text-stone-500">
              Selecione um produto acima para visualizar ou editar sua ficha técnica.
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. EXPENSES TAB */}
      {/* ==================================================== */}
      {subTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-stone-800">Despesas de Produção & Custos Operacionais</h3>
              <p className="text-sm text-stone-500">
                Cadastre custos de gás, água, energia, mão de obra e taxas percentuais sobre vendas.
              </p>
            </div>
            <button
              onClick={() => handleOpenExpenseModal()}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Nova Despesa
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Nome da Despesa</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Critério de Rateio</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-stone-400">
                        Nenhuma despesa cadastrada ainda.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-stone-50 transition">
                        <td className="py-3 px-4 font-medium text-stone-800">{exp.name}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              exp.type === 'fixed_monthly'
                                ? 'bg-blue-100 text-blue-800'
                                : exp.type === 'variable_batch'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {exp.type === 'fixed_monthly'
                              ? 'Despesa Fixa Mensal'
                              : exp.type === 'variable_batch'
                              ? 'Variável por Lote'
                              : 'Percentual (%)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-800">
                          R$ {exp.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-stone-600">
                          {exp.allocationBasis === 'per_unit'
                            ? 'Rateio por Unidade'
                            : exp.allocationBasis === 'percentage_sale'
                            ? '% sobre Venda'
                            : 'Fixo'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenExpenseModal(exp)}
                            className="p-1.5 text-stone-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. PRICING SIMULATOR TAB */}
      {/* ==================================================== */}
      {subTab === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
            <h3 className="text-lg font-bold text-stone-800">Simulador & Formação de Preços</h3>
            <p className="text-sm text-stone-500">
              Visualize o custo total por unidade (Insumos + Embalagem + Despesas), ajuste margens e simule preços sugeridos de venda.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {products.map((prod) => {
              // Check if product has sizes/variations
              const variations = prod.sizes && prod.sizes.length > 0 ? prod.sizes : [null];

              return variations.map((sz, idx) => {
                const varId = sz ? sz.id : null;
                const configKey = `${prod.id}_${varId || 'base'}`;
                const costs = calculateProductCosts(prod.id, varId);
                const currentPrice = sz ? sz.price : prod.basePrice;
                const isBelowCost = currentPrice < costs.totalCost;

                return (
                  <div
                    key={`${prod.id}_${idx}`}
                    className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4 hover:border-amber-300 transition"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-stone-800">{prod.name}</h4>
                          {sz && (
                            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                              {sz.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500">{prod.description}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs text-stone-500 block">Preço Atual no Cardápio</span>
                          <span
                            className={`text-lg font-bold ${
                              isBelowCost ? 'text-red-600' : 'text-stone-800'
                            }`}
                          >
                            R$ {currentPrice.toFixed(2)}
                          </span>
                        </div>
                        {isBelowCost && (
                          <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-200 animate-pulse">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Abaixo do Custo!
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cost Breakdown & Simulation Controls */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-stone-50 p-4 rounded-xl">
                      <div>
                        <span className="text-xs text-stone-500 block">Custo de Insumos</span>
                        <span className="text-sm font-bold text-stone-800">
                          R$ {costs.ingredientCost.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-stone-500 block">Custo de Embalagem</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs">R$</span>
                          <input
                            type="number"
                            step="0.10"
                            min="0"
                            value={costs.config.packagingCost}
                            onChange={(e) =>
                              handleUpdateConfigField(
                                prod.id,
                                varId,
                                'packagingCost',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-stone-500 block">Despesas / Rateio</span>
                        <span className="text-sm font-bold text-stone-800">
                          R$ {costs.overheadPerUnit.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-stone-500 block">Custo Total Unitário</span>
                        <span className="text-sm font-extrabold text-stone-900">
                          R$ {costs.totalCost.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-stone-500 block">Preço Sugerido (Ideal)</span>
                        <span className="text-sm font-extrabold text-emerald-700">
                          R$ {costs.suggestedPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Margin & Markup Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-stone-700">Método:</span>
                          <select
                            value={costs.config.pricingMethod}
                            onChange={(e) =>
                              handleUpdateConfigField(
                                prod.id,
                                varId,
                                'pricingMethod',
                                e.target.value as PricingMethod
                              )
                            }
                            className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          >
                            <option value="margin">Margem sobre Venda (%)</option>
                            <option value="markup">Markup sobre Custo (%)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-stone-700">Margem Desejada:</span>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            max="99"
                            value={costs.config.desiredMargin}
                            onChange={(e) =>
                              handleUpdateConfigField(
                                prod.id,
                                varId,
                                'desiredMargin',
                                parseFloat(e.target.value) || 30
                              )
                            }
                            className="w-16 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-bold text-center focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          />
                          <span className="text-xs font-bold text-stone-600">%</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-stone-700">Taxa Cartão (%):</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={costs.config.cardFeePercentage}
                            onChange={(e) =>
                              handleUpdateConfigField(
                                prod.id,
                                varId,
                                'cardFeePercentage',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-16 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-bold text-center focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          />
                          <span className="text-xs font-bold text-stone-600">%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveConfigAndSync(prod.id, varId)}
                          className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3.5 py-2 rounded-xl text-xs font-medium transition"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Salvar Simulação
                        </button>
                        <button
                          onClick={() =>
                            handleApplySuggestedPriceToCatalog(prod, varId, costs.suggestedPrice)
                          }
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-medium shadow-sm transition"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          Atualizar no Cardápio
                        </button>
                      </div>
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* INGREDIENT MODAL */}
      {/* ==================================================== */}
      {isIngredientModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-800">
                {editingIngredient ? 'Editar Insumo / Embalagem' : 'Novo Insumo / Embalagem'}
              </h3>
              <button
                onClick={() => setIsIngredientModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Nome do Insumo / Embalagem *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Leite Condensado, Pote de Vidro 250ml..."
                  value={ingredientForm.name}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  placeholder="Ex: Laticínios, Embalagens, Confeitaria"
                  value={ingredientForm.category}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, category: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                    Qtd. Comprada *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    placeholder="Ex: 1000 (g) ou 1 (un)"
                    value={ingredientForm.purchaseQuantity}
                    onChange={(e) =>
                      setIngredientForm({ ...ingredientForm, purchaseQuantity: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                    Unidade de Medida *
                  </label>
                  <select
                    value={ingredientForm.purchaseUnit}
                    onChange={(e) =>
                      setIngredientForm({
                        ...ingredientForm,
                        purchaseUnit: e.target.value as PurchaseUnit,
                      })
                    }
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="kg">Quilograma (kg)</option>
                    <option value="g">Grama (g)</option>
                    <option value="L">Litro (L)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="un">Unidade (un)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Valor Total da Compra (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ex: 12.50"
                  value={ingredientForm.purchasePrice}
                  onChange={(e) =>
                    setIngredientForm({ ...ingredientForm, purchasePrice: e.target.value })
                  }
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Fornecedor (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mercado Atacadista"
                  value={ingredientForm.supplier}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, supplier: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsIngredientModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
                >
                  Salvar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* RECIPE ITEM MODAL */}
      {/* ==================================================== */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-800">Adicionar Insumo à Ficha Técnica</h3>
              <button
                onClick={() => setIsRecipeModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipeItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Insumo / Embalagem *
                </label>
                <select
                  required
                  value={recipeForm.ingredientId}
                  onChange={(e) => setRecipeForm({ ...recipeForm, ingredientId: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">Selecione o insumo...</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (R$ {ing.unitCost.toFixed(4)} / {ing.purchaseUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                    Quantidade Usada *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    placeholder="Ex: 150"
                    value={recipeForm.quantityUsed}
                    onChange={(e) =>
                      setRecipeForm({ ...recipeForm, quantityUsed: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                    Unidade *
                  </label>
                  <select
                    value={recipeForm.unit}
                    onChange={(e) =>
                      setRecipeForm({ ...recipeForm, unit: e.target.value as RecipeUnit })
                    }
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="g">Grama (g)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="un">Unidade (un)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Perda / Desperdício (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  value={recipeForm.wastePercentage}
                  onChange={(e) =>
                    setRecipeForm({ ...recipeForm, wastePercentage: e.target.value })
                  }
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
                >
                  Adicionar à Receita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EXPENSE MODAL */}
      {/* ==================================================== */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-stone-800">
                {editingExpense ? 'Editar Despesa' : 'Nova Despesa de Produção'}
              </h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Nome da Despesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gás de Cozinha, Energia, Mão de Obra"
                  value={expenseForm.name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Tipo de Despesa *
                </label>
                <select
                  value={expenseForm.type}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, type: e.target.value as ExpenseType })
                  }
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="fixed_monthly">Despesa Fixa Mensal</option>
                  <option value="variable_batch">Variável por Lote</option>
                  <option value="percentage">Percentual (%) sobre Venda</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Valor (R$ ou %) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ex: 150.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Critério de Rateio *
                </label>
                <select
                  value={expenseForm.allocationBasis}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      allocationBasis: e.target.value as AllocationBasis,
                    })
                  }
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="per_unit">Rateio por Unidade Produzida</option>
                  <option value="percentage_sale">Percentual sobre Preço de Venda</option>
                  <option value="fixed">Fixo (Sem Rateio Unitário)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
