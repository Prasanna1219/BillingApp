import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import type { SelectOption } from '../../components/CustomSelect/CustomSelect';
import './Inventory.css';

const unitOptions: SelectOption[] = [
  {
    value: 'kg',
    label: 'Kilograms (kg)',
    description: 'Weight measurement (1 kg = 1000 g)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3" />
      </svg>
    )
  },
  {
    value: 'g',
    label: 'Grams (g)',
    description: 'Precision weight measurement (1 g)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
      </svg>
    )
  },
  {
    value: 'L',
    label: 'Liters (L)',
    description: 'Liquid volume measurement (1 L = 1000 ml)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
      </svg>
    )
  },
  {
    value: 'ml',
    label: 'Milliliters (ml)',
    description: 'Precision liquid volume measurement (1 ml)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.372A2.25 2.25 0 004.5 16v2.25C4.5 19.493 5.507 20.5 6.75 20.5h10.5c1.243 0 2.25-1.007 2.25-2.25V16c0-.597-.237-1.169-.659-1.591l-4.091-4.063a2.25 2.25 0 01-.659-1.591V3.104" />
      </svg>
    )
  },
  {
    value: 'pcs',
    label: 'Pieces (pcs)',
    description: 'Count per individual unit (items, eggs, buns, etc.)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    )
  },
  {
    value: 'pack',
    label: 'Packs / Boxes (pack)',
    description: 'Pre-packaged boxes, bundles, or packets',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    )
  }
];

interface Item {
  id: number;
  business_id: number;
  category_id: number | null;
  name: string;
  image_url: string | null;
  sales_price: number;
  tax_percentage: number;
  price_includes_tax: boolean;
  current_stock: number;
  is_favorite: boolean;
}

interface Ingredient {
  id: number;
  business_id: number;
  name: string;
  unit: string;
  purchase_cost: number;
  quantity_purchased: number;
  remaining_quantity: number;
  yield_percentage?: number;
  purchase_date: string;
  days_lasted: number | null;
}

interface StockAdjustment {
  id: number;
  business_id: number;
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  quantity_deducted: number;
  reason: string;
  notes?: string;
  created_at: string;
}

interface Recipe {
  id: number;
  item_id: number;
  ingredient_id: number;
  quantity_needed: number;
  item_name: string;
  ingredient_name: string;
  unit: string;
}

interface BusinessSession {
  id: number;
  owner_id: number;
  business_name: string;
  business_type: string;
  phone_number: string;
  outlet_address: string;
}

type TabType = 'products' | 'ingredients' | 'recipes';

const Inventory = () => {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessSession | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [items, setItems] = useState<Item[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Reusable Custom Alert popup modal state
  const [customAlert, setCustomAlert] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'confirm';
    onConfirm?: () => void;
  } | null>(null);

  // Helper alerts
  const showAlert = (message: string, type: 'success' | 'error' = 'error', title: string = 'Notification') => {
    setCustomAlert({
      show: true,
      title,
      message,
      type
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, title: string = 'Confirm Action') => {
    setCustomAlert({
      show: true,
      title,
      message,
      type: 'confirm',
      onConfirm
    });
  };

  // Product Modal State
  const [productModal, setProductModal] = useState<{
    show: boolean;
    mode: 'add' | 'edit';
    item?: Item;
  }>({ show: false, mode: 'add' });
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pTax, setPTax] = useState('5.00');
  const [pStock, setPStock] = useState('0');
  const [pModalError, setPModalError] = useState('');
  const [pModalLoading, setPModalLoading] = useState(false);

  // Ingredient Modal State
  const [ingModal, setIngModal] = useState<{
    show: boolean;
    mode: 'add' | 'edit' | 'restock';
    ingredient?: Ingredient;
  }>({ show: false, mode: 'add' });
  const [ingName, setIngName] = useState('');
  const [ingUnit, setIngUnit] = useState<string>('kg');
  const [ingCost, setIngCost] = useState('');
  const [ingQty, setIngQty] = useState('');
  const [ingYield, setIngYield] = useState('100');
  const [ingDate, setIngDate] = useState(new Date().toISOString().split('T')[0]);
  const [ingModalError, setIngModalError] = useState('');
  const [ingModalLoading, setIngModalLoading] = useState(false);

  // Search & Stock Filter Toolbar State
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'depleted' | 'adjustments'>('all');
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);

  // Products Search & Filter State
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productTaxFilter, setProductTaxFilter] = useState<'all' | '0' | '5' | '12' | '18' | '28'>('all');

  // Log Waste & Batch Usage Modal State
  const [wasteModal, setWasteModal] = useState<{
    show: boolean;
    ingredient?: Ingredient;
  }>({ show: false });
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState('Batch/Fryer Filling');
  const [wasteNotes, setWasteNotes] = useState('');
  const [wasteLoading, setWasteLoading] = useState(false);

  // Recipe Selection and Mapping State
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [recipeIngId, setRecipeIngId] = useState('');
  const [recipeQty, setRecipeQty] = useState('');
  const [recipeUnit, setRecipeUnit] = useState('g');
  const [recipeError, setRecipeError] = useState('');
  const [recipeLoading, setRecipeLoading] = useState(false);

  // Authenticate and load session
  useEffect(() => {
    const user = localStorage.getItem('session_user');
    const bizStr = localStorage.getItem('session_business');

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!bizStr) {
      navigate('/onboarding', { replace: true });
      return;
    }

    const parsedBiz = JSON.parse(bizStr);
    setBusiness(parsedBiz);
    fetchData(parsedBiz.id);
  }, [navigate]);

  const fetchData = async (businessId: number) => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        fetchItems(businessId),
        fetchIngredients(businessId),
        fetchRecipes(businessId),
        fetchAdjustments(businessId)
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (businessId: number) => {
    const res = await fetch(`/api/items/${businessId}`);
    const data = await res.json();
    if (!res.ok || data.status === 'error') throw new Error(data.message);
    setItems(data.items || []);
  };

  const fetchIngredients = async (businessId: number) => {
    const res = await fetch(`/api/ingredients/${businessId}`);
    const data = await res.json();
    if (!res.ok || data.status === 'error') throw new Error(data.message);
    setIngredients(data.ingredients || []);
  };

  const fetchAdjustments = async (businessId: number) => {
    try {
      const res = await fetch(`/api/stock-adjustments/${businessId}`);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setAdjustments(data.adjustments || []);
      }
    } catch (err) {
      console.error('Failed to fetch stock adjustments:', err);
    }
  };

  const fetchRecipes = async (businessId: number) => {
    const res = await fetch(`/api/recipes/${businessId}`);
    const data = await res.json();
    if (!res.ok || data.status === 'error') throw new Error(data.message);
    setRecipes(data.recipes || []);
  };

  // Products CRUD
  const handleOpenProductModal = (mode: 'add' | 'edit', item?: Item) => {
    setPModalError('');
    if (mode === 'edit' && item) {
      setProductModal({ show: true, mode: 'edit', item });
      setPName(item.name);
      setPPrice(String(item.sales_price));
      setPTax(parseFloat(String(item.tax_percentage)).toFixed(2));
      setPStock(String(item.current_stock));
    } else {
      setProductModal({ show: true, mode: 'add' });
      setPName('');
      setPPrice('');
      setPTax('5.00');
      setPStock('0');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    if (!pName.trim()) {
      setPModalError('Product Name is required.');
      return;
    }
    const priceNum = parseFloat(pPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setPModalError('Please enter a valid sales price.');
      return;
    }

    setPModalLoading(true);
    setPModalError('');

    try {
      const isEdit = productModal.mode === 'edit';
      const url = isEdit ? `/api/items/${productModal.item?.id}` : '/api/items';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          name: pName.trim(),
          sales_price: priceNum,
          tax_percentage: parseFloat(pTax),
          price_includes_tax: false,
          current_stock: parseInt(pStock) || 0
        })
      });

      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to save product.');
      }

      setProductModal({ show: false, mode: 'add' });
      fetchItems(business.id);
    } catch (err: any) {
      setPModalError(err.message || 'Something went wrong.');
    } finally {
      setPModalLoading(false);
    }
  };

  const handleDeleteProduct = (itemId: number) => {
    showConfirm('Are you sure you want to delete this product?', async () => {
      try {
        const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || data.status === 'error') throw new Error(data.message);
        if (business) fetchItems(business.id);
      } catch (err: any) {
        showAlert(err.message || 'Failed to delete product.');
      }
    });
  };

  // Ingredients CRUD
  const handleOpenIngModal = (mode: 'add' | 'edit' | 'restock', ingredient?: Ingredient) => {
    setIngModalError('');
    if (mode === 'edit' && ingredient) {
      setIngModal({ show: true, mode: 'edit', ingredient });
      setIngName(ingredient.name);
      setIngUnit(ingredient.unit);
      setIngCost(String(ingredient.purchase_cost));
      setIngQty(String(ingredient.quantity_purchased));
      setIngDate(ingredient.purchase_date.split('T')[0]);
    } else if (mode === 'restock' && ingredient) {
      setIngModal({ show: true, mode: 'restock', ingredient });
      setIngName(ingredient.name);
      setIngUnit(ingredient.unit);
      setIngCost('');
      setIngQty('');
      setIngDate(new Date().toISOString().split('T')[0]);
    } else {
      setIngModal({ show: true, mode: 'add' });
      setIngName('');
      setIngUnit('kg');
      setIngCost('');
      setIngQty('');
      setIngDate(new Date().toISOString().split('T')[0]);
    }
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    if (!ingName.trim()) {
      setIngModalError('Ingredient name is required.');
      return;
    }
    const costNum = parseFloat(ingCost);
    const qtyNum = parseFloat(ingQty);
    if (isNaN(costNum) || costNum < 0) {
      setIngModalError('Enter a valid purchase cost.');
      return;
    }
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setIngModalError('Enter a valid quantity.');
      return;
    }

    setIngModalLoading(true);
    setIngModalError('');

    try {
      const isEdit = ingModal.mode === 'edit';
      const url = isEdit ? `/api/ingredients/${ingModal.ingredient?.id}` : '/api/ingredients';
      const method = isEdit ? 'PUT' : 'POST';

      const bodyData: any = {
        business_id: business.id,
        name: ingName.trim(),
        unit: ingUnit,
        purchase_cost: costNum,
        quantity_purchased: qtyNum,
        yield_percentage: parseFloat(ingYield) || 100,
        purchase_date: ingDate
      };

      if (isEdit && ingModal.ingredient) {
        const diff = qtyNum - ingModal.ingredient.quantity_purchased;
        bodyData.remaining_quantity = Math.max(0, ingModal.ingredient.remaining_quantity + diff);
      } else {
        bodyData.remaining_quantity = qtyNum;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (!res.ok || data.status === 'error') throw new Error(data.message);

      setIngModal({ show: false, mode: 'add' });
      setIngName('');
      setIngCost('');
      setIngQty('');
      setIngYield('100');
      fetchIngredients(business.id);
    } catch (err: any) {
      setIngModalError(err.message || 'Failed to save ingredient log.');
    } finally {
      setIngModalLoading(false);
    }
  };

  const handleDeleteIngredient = (id: number) => {
    showConfirm('Are you sure you want to delete this ingredient batch? This will break recipes linked to this batch.', async () => {
      try {
        const res = await fetch(`/api/ingredients/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || data.status === 'error') throw new Error(data.message);
        if (business) {
          fetchIngredients(business.id);
          fetchRecipes(business.id);
        }
      } catch (err: any) {
        showAlert(err.message || 'Failed to delete ingredient.');
      }
    });
  };

  // Handle Log Waste / Batch Usage Submission
  const handleSaveWasteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !wasteModal.ingredient) return;

    const deductNum = parseFloat(wasteQty);
    if (isNaN(deductNum) || deductNum <= 0) {
      showAlert('Enter a valid quantity to deduct.');
      return;
    }

    setWasteLoading(true);
    try {
      const res = await fetch('/api/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          ingredient_id: wasteModal.ingredient.id,
          quantity_deducted: deductNum,
          reason: wasteReason,
          notes: wasteNotes
        })
      });

      const data = await res.json();
      if (!res.ok || data.status === 'error') throw new Error(data.message);

      showAlert('Stock deduction logged successfully!', 'success', 'Deduction Logged');
      setWasteModal({ show: false });
      setWasteQty('');
      setWasteNotes('');
      fetchIngredients(business.id);
      fetchAdjustments(business.id);
    } catch (err: any) {
      showAlert(err.message || 'Failed to log stock deduction.');
    } finally {
      setWasteLoading(false);
    }
  };

  // Recipe Config CRUD & Unit Conversions
  const getCompatibleUnits = (rawUnit: string): SelectOption[] => {
    const normalized = (rawUnit || '').toLowerCase();
    if (normalized === 'kg' || normalized === 'g') {
      return [
        { value: 'g', label: 'Grams (g)', description: '1000 g = 1 kg' },
        { value: 'kg', label: 'Kilograms (kg)', description: '1 kg = 1000 g' }
      ];
    }
    if (normalized === 'l' || normalized === 'ml') {
      return [
        { value: 'ml', label: 'Milliliters (ml)', description: '1000 ml = 1 L' },
        { value: 'l', label: 'Liters (L)', description: '1 L = 1000 ml' }
      ];
    }
    return [
      { value: rawUnit, label: rawUnit, description: `Base unit (${rawUnit})` }
    ];
  };

  const convertToBaseQuantity = (enteredQty: number, enteredUnit: string, rawUnit: string): number => {
    const eUnit = (enteredUnit || '').toLowerCase();
    const rUnit = (rawUnit || '').toLowerCase();

    if (rUnit === 'kg' && eUnit === 'g') return enteredQty / 1000.0;
    if (rUnit === 'g' && eUnit === 'kg') return enteredQty * 1000.0;
    if (rUnit === 'l' && eUnit === 'ml') return enteredQty / 1000.0;
    if (rUnit === 'ml' && eUnit === 'l') return enteredQty * 1000.0;

    return enteredQty;
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !recipeIngId) return;

    const qtyNum = parseFloat(recipeQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setRecipeError('Please enter a valid quantity.');
      return;
    }

    const selectedIng = ingredients.find(i => String(i.id) === recipeIngId);
    if (!selectedIng) {
      setRecipeError('Selected ingredient not found.');
      return;
    }

    const baseQtyNeeded = convertToBaseQuantity(qtyNum, recipeUnit, selectedIng.unit);

    setRecipeLoading(true);
    setRecipeError('');

    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: selectedProductId,
          ingredient_id: parseInt(recipeIngId),
          quantity_needed: baseQtyNeeded
        })
      });

      const data = await res.json();
      if (!res.ok || data.status === 'error') throw new Error(data.message);

      setRecipeQty('');
      setRecipeIngId('');
      if (business) fetchRecipes(business.id);
      showAlert('Ingredient linked to dish successfully!', 'success');
    } catch (err: any) {
      setRecipeError(err.message || 'Failed to save recipe mapping.');
    } finally {
      setRecipeLoading(false);
    }
  };

  const handleDeleteRecipe = (recipeId: number) => {
    showConfirm('Delete this ingredient mapping from recipe?', async () => {
      try {
        const res = await fetch(`/api/recipes/${recipeId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || data.status === 'error') throw new Error(data.message);
        if (business) fetchRecipes(business.id);
      } catch (err: any) {
        showAlert(err.message || 'Failed to delete recipe mapping.');
      }
    });
  };

  // Get distinct ingredients list (by name) for dropdown selections
  const uniqueIngOptions = Array.from(new Set(ingredients.map(i => i.name))).map(name => {
    return ingredients.find(i => i.name === name);
  }).filter(Boolean) as Ingredient[];

  return (
    <div className="inventory-page">
      <div className="inventory-container">
        
        {/* Header */}
        <div className="inventory-header">
          <div>
            <h1>Inventory</h1>
            <span className="business-name-badge">{business?.business_name}</span>
          </div>
          {activeTab === 'products' && (
            <button onClick={() => handleOpenProductModal('add')} className="add-btn">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Product
            </button>
          )}
          {activeTab === 'ingredients' && (
            <button onClick={() => handleOpenIngModal('add')} className="add-btn">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Log Purchase
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="inventory-tabs">
          <button 
            className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products
          </button>
          <button 
            className={`tab-btn ${activeTab === 'ingredients' ? 'active' : ''}`}
            onClick={() => setActiveTab('ingredients')}
          >
            Ingredients
          </button>
          <button 
            className={`tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            Recipes
          </button>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="loading-spinner">Loading inventory catalog...</div>
        ) : error ? (
          <div className="error-message-panel">{error}</div>
        ) : (
          <div className="tab-content-container">
            
            {/* TAB 1: PRODUCTS */}
            {activeTab === 'products' && (
              <div className="products-view">
                
                {/* 1. Products Summary Metrics Strip */}
                <div className="metrics-strip">
                  <div className="metric-card">
                    <div className="metric-icon purple">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="metric-info">
                      <span className="metric-value">{items.length}</span>
                      <span className="metric-label">Total Products</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon green">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-6h6m4.5 0a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
                      </svg>
                    </div>
                    <div className="metric-info">
                      <span className="metric-value">
                        ₹{(items.reduce((acc, curr) => acc + parseFloat(String(curr.sales_price)), 0) / (items.length || 1)).toFixed(2)}
                      </span>
                      <span className="metric-label">Avg Price</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon amber">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
                      </svg>
                    </div>
                    <div className="metric-info">
                      <span className="metric-value">
                        {items.reduce((acc, curr) => acc + (curr.current_stock || 0), 0)}
                      </span>
                      <span className="metric-label">In Stock</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon rose">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      </svg>
                    </div>
                    <div className="metric-info">
                      <span className="metric-value">{Array.from(new Set(items.map(i => i.tax_percentage))).length}</span>
                      <span className="metric-label">Tax Slabs</span>
                    </div>
                  </div>
                </div>

                {/* 2. Products Search & Filter Toolbar */}
                <div className="inventory-toolbar">
                  <div className="search-input-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      placeholder="Search products by name..."
                      className="search-input-field"
                    />
                  </div>

                  <div className="filter-pills-row">
                    <button
                      className={`filter-pill ${productTaxFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setProductTaxFilter('all')}
                    >
                      All ({items.length})
                    </button>
                    <button
                      className={`filter-pill ${productTaxFilter === '0' ? 'active' : ''}`}
                      onClick={() => setProductTaxFilter('0')}
                    >
                      Exempt (0%)
                    </button>
                    <button
                      className={`filter-pill ${productTaxFilter === '5' ? 'active' : ''}`}
                      onClick={() => setProductTaxFilter('5')}
                    >
                      GST 5%
                    </button>
                    <button
                      className={`filter-pill ${productTaxFilter === '12' ? 'active' : ''}`}
                      onClick={() => setProductTaxFilter('12')}
                    >
                      GST 12%
                    </button>
                    <button
                      className={`filter-pill ${productTaxFilter === '18' ? 'active' : ''}`}
                      onClick={() => setProductTaxFilter('18')}
                    >
                      GST 18%
                    </button>
                    <button
                      className={`filter-pill ${productTaxFilter === '28' ? 'active' : ''}`}
                      onClick={() => setProductTaxFilter('28')}
                    >
                      GST 28%
                    </button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon-circle">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="empty-svg">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h3>No items listed</h3>
                    <p>Create products like Vadai or Dosa to start selling them on your billing screen.</p>
                    <button onClick={() => handleOpenProductModal('add')} className="start-btn">
                      Add Your First Item
                    </button>
                  </div>
                ) : (
                  <div className="items-list">
                    {items
                      .filter((item) => {
                        const matchesSearch = item.name.toLowerCase().includes(productSearchQuery.toLowerCase());
                        if (!matchesSearch) return false;
                        if (productTaxFilter === 'all') return true;
                        const taxVal = parseFloat(String(item.tax_percentage)).toFixed(0);
                        return taxVal === productTaxFilter;
                      })
                      .map((item) => (
                        <div key={item.id} className="item-card flex-col-card">
                          
                          {/* Top Row: Name, Price */}
                          <div className="item-card-row-top">
                            <span className="item-name">{item.name}</span>
                            <span className="item-price">₹{parseFloat(String(item.sales_price)).toFixed(2)}</span>
                          </div>

                          {/* Bottom Row: Badges & Actions */}
                          <div className="item-card-row-bottom">
                            <div className="item-card-meta-left">
                              <span className="tax-badge">GST {parseFloat(String(item.tax_percentage))}%</span>
                              <span className="stock-label">Stock: {item.current_stock}</span>
                            </div>
                            
                            <div className="item-card-actions-right">
                              <button onClick={() => handleOpenProductModal('edit', item)} className="item-card-btn edit" title="Edit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                </svg>
                              </button>
                              <button onClick={() => handleDeleteProduct(item.id)} className="item-card-btn delete" title="Delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" />
                                </svg>
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                  </div>
                )}

              </div>
            )}

            {/* TAB 2: INGREDIENTS */}
            {activeTab === 'ingredients' && (
              <div className="ingredients-view">
                
                {/* 1. Summary Metrics Strip */}
                <div className="metrics-strip">
                  <div className="metric-card">
                    <div className="metric-icon purple">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </div>
                    <div className="metric-info">
                      <span className="metric-value">{ingredients.length}</span>
                      <span className="metric-label">Total Items</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon green">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-6h6m4.5 0a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
                      </svg>
                    </div>
                    <div className="metric-info">
                      <span className="metric-value">
                        ₹{ingredients.reduce((acc, curr) => {
                          const rem = parseFloat(String(curr.remaining_quantity)) || 0;
                          const cost = parseFloat(String(curr.purchase_cost)) || 0;
                          const purchased = parseFloat(String(curr.quantity_purchased)) || 1;
                          return acc + (rem * (cost / purchased));
                        }, 0).toFixed(2)}
                      </span>
                      <span className="metric-label">Stock Value</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon amber">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    <div className="metric-info">
                      <span className="metric-value">
                        {ingredients.filter(ing => {
                          const rem = parseFloat(String(ing.remaining_quantity)) || 0;
                          const pur = parseFloat(String(ing.quantity_purchased)) || 1;
                          return (rem / pur) <= 0.2 && rem > 0;
                        }).length}
                      </span>
                      <span className="metric-label">Low Stock</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon rose">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" />
                      </svg>
                    </div>
                    <div className="metric-info">
                      <span className="metric-value">{adjustments.length}</span>
                      <span className="metric-label">Waste Logs</span>
                    </div>
                  </div>
                </div>

                {/* 2. Search & Stock Filter Toolbar */}
                <div className="inventory-toolbar">
                  <div className="search-input-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ingredients by name..."
                      className="search-input-field"
                    />
                  </div>

                  <div className="filter-pills-row">
                    <button
                      className={`filter-pill ${stockFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setStockFilter('all')}
                    >
                      All Items ({ingredients.length})
                    </button>
                    <button
                      className={`filter-pill ${stockFilter === 'in_stock' ? 'active' : ''}`}
                      onClick={() => setStockFilter('in_stock')}
                    >
                      <span className="status-dot green"></span> In Stock
                    </button>
                    <button
                      className={`filter-pill ${stockFilter === 'low_stock' ? 'active' : ''}`}
                      onClick={() => setStockFilter('low_stock')}
                    >
                      <span className="status-dot amber"></span> Low Stock
                    </button>
                    <button
                      className={`filter-pill ${stockFilter === 'depleted' ? 'active' : ''}`}
                      onClick={() => setStockFilter('depleted')}
                    >
                      <span className="status-dot rose"></span> Depleted
                    </button>
                    <button
                      className={`filter-pill ${stockFilter === 'adjustments' ? 'active' : ''}`}
                      onClick={() => setStockFilter('adjustments')}
                    >
                      Trash Logs ({adjustments.length})
                    </button>
                  </div>
                </div>

                {/* 3. Items List or Adjustment Logs View */}
                {stockFilter === 'adjustments' ? (
                  adjustments.length === 0 ? (
                    <p className="no-data-sub" style={{ textAlign: 'center', padding: '30px' }}>
                      No manual waste or stock adjustments logged yet.
                    </p>
                  ) : (
                    <div className="adjustments-list">
                      {adjustments.map((adj) => (
                        <div key={adj.id} className="adjustment-item-card">
                          <div className="adjustment-top-row">
                            <span className="adjustment-ing-name">{adj.ingredient_name}</span>
                            <span className="adjustment-reason-badge">{adj.reason}</span>
                          </div>
                          <div className="adjustment-details">
                            <span>Deducted: <span className="adjustment-qty">-{adj.quantity_deducted} {adj.unit}</span></span>
                            <span>{new Date(adj.created_at).toLocaleDateString()}</span>
                          </div>
                          {adj.notes && <div className="adjustment-notes">"{adj.notes}"</div>}
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  ingredients.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon-circle">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="empty-svg">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                        </svg>
                      </div>
                      <h3>No raw materials logged</h3>
                      <p>Log your purchases of raw ingredients (e.g. Cooking Oil, Flour) to track usage and cost.</p>
                      <button onClick={() => handleOpenIngModal('add')} className="start-btn">
                        Log Ingredient Purchase
                      </button>
                    </div>
                  ) : (
                    <div className="items-list">
                      {ingredients
                        .filter((ing) => {
                          const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
                          if (!matchesSearch) return false;
                          const rem = parseFloat(String(ing.remaining_quantity)) || 0;
                          const pur = parseFloat(String(ing.quantity_purchased)) || 1;
                          const ratio = rem / pur;
                          if (stockFilter === 'in_stock') return ratio > 0.2;
                          if (stockFilter === 'low_stock') return ratio <= 0.2 && rem > 0;
                          if (stockFilter === 'depleted') return rem <= 0;
                          return true;
                        })
                        .map((ing) => {
                          const rem = parseFloat(String(ing.remaining_quantity)) || 0;
                          const pur = parseFloat(String(ing.quantity_purchased)) || 1;
                          const ratio = rem / pur;
                          const isDepleted = rem <= 0;
                          const isLow = ratio <= 0.2 && rem > 0;
                          const unitPrice = (parseFloat(String(ing.purchase_cost)) / pur).toFixed(2);
                          const yieldPct = ing.yield_percentage ? parseFloat(String(ing.yield_percentage)) : 100;

                          return (
                            <div key={ing.id} className="item-card flex-col-card">
                              {/* Top Row: Name (left), Status Badge (right) */}
                              <div className="item-card-row-top">
                                <span className="item-name">{ing.name}</span>
                                {isDepleted ? (
                                  <span className="stock-status-badge rose">
                                    <span className="status-dot rose"></span> Depleted
                                  </span>
                                ) : isLow ? (
                                  <span className="stock-status-badge amber">
                                    <span className="status-dot amber"></span> Low Stock
                                  </span>
                                ) : (
                                  <span className="stock-status-badge green">
                                    <span className="status-dot green"></span> In Stock
                                  </span>
                                )}
                              </div>

                              {/* Middle Row: Stock Badges & Yield */}
                              <div className="item-card-row-middle">
                                <span className="stock-badge">Remaining {ing.remaining_quantity} {ing.unit}</span>
                                <span className="purchase-badge">Unit: ₹{unitPrice}/{ing.unit}</span>
                                {yieldPct < 100 && (
                                  <span className="yield-badge">Yield: {yieldPct}%</span>
                                )}
                              </div>

                              {/* Bottom Row: Dates & Actions */}
                              <div className="item-card-row-bottom">
                                <div className="ingredient-dates flex-col-meta">
                                  <span className="date-text">Purchased: {ing.purchase_date.split('T')[0]}</span>
                                  {ing.days_lasted !== null ? (
                                    <span className="duration-tag">Lasted: {ing.days_lasted} days</span>
                                  ) : (
                                    <span className="duration-tag active">Active Batch</span>
                                  )}
                                </div>

                                <div className="item-card-actions-right">
                                  <button
                                    onClick={() => handleOpenIngModal('restock', ing)}
                                    className="item-card-btn restock-btn"
                                    title="Restock Batch"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setWasteModal({ show: true, ingredient: ing });
                                      setWasteQty('');
                                      setWasteNotes('');
                                    }}
                                    className="item-card-btn waste-action-btn"
                                    title="Log Waste / Fryer Batch Usage"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={() => handleOpenIngModal('edit', ing)}
                                    className="item-card-btn edit"
                                    title="Edit Log"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteIngredient(ing.id)}
                                    className="item-card-btn delete"
                                    title="Delete"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )
                )}

              </div>
            )}

            {/* TAB 3: RECIPE MAPPING */}
            {activeTab === 'recipes' && (
              <div className="recipe-mapping-view">
                {items.length === 0 ? (
                  <p className="no-data-alert">Please add products first before configuring recipes.</p>
                ) : (
                  <>
                    {/* Mobile Dish Selector Pills (Shown on mobile screens only) */}
                    <div className="mobile-dish-selector-pills">
                      {items.map(item => (
                        <button
                          key={item.id}
                          className={`filter-pill ${selectedProductId === item.id ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedProductId(item.id);
                            setRecipeError('');
                          }}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>

                    <div className="recipe-grid">
                      {/* Left Column: Product selector (PC / Desktop View) */}
                      <div className="product-selector-list">
                        <h4>Select Dish</h4>
                        {items.map(item => (
                          <button 
                            key={item.id} 
                            className={`product-select-btn ${selectedProductId === item.id ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedProductId(item.id);
                              setRecipeError('');
                            }}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>

                    {/* Right Column: Recipe details */}
                    <div className="recipe-configurator">
                      {selectedProductId ? (
                        <>
                          <h4>Ingredients in recipe</h4>
                          <div className="mapped-ingredients-list">
                            {recipes.filter(r => r.item_id === selectedProductId).length === 0 ? (
                              <p className="no-data-sub">No ingredients mapped to this dish yet.</p>
                            ) : (
                              recipes.filter(r => r.item_id === selectedProductId).map(recipe => {
                                const qtyVal = parseFloat(String(recipe.quantity_needed));
                                const rUnit = (recipe.unit || '').toLowerCase();
                                const isGramConv = rUnit === 'kg' && qtyVal < 1;
                                const isMlConv = rUnit === 'l' && qtyVal < 1;
                                const displayQtyText = isGramConv
                                  ? `${(qtyVal * 1000).toFixed(0)} g (${qtyVal} kg)`
                                  : isMlConv
                                  ? `${(qtyVal * 1000).toFixed(0)} ml (${qtyVal} L)`
                                  : `${qtyVal} ${recipe.unit}`;

                                return (
                                  <div key={recipe.id} className="recipe-item-row">
                                    <span>{recipe.ingredient_name}</span>
                                    <span className="qty-tag">{displayQtyText}</span>
                                    <button onClick={() => handleDeleteRecipe(recipe.id)} className="remove-recipe-btn" title="Remove Link">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Add mapping form */}
                          <form onSubmit={handleSaveRecipe} className="recipe-mapping-form">
                            <h5>Link Ingredient to Dish</h5>
                            
                            <div className="form-group">
                              <label>Select Ingredient</label>
                              <CustomSelect
                                options={uniqueIngOptions.map(opt => ({
                                  value: String(opt.id),
                                  label: `${opt.name} (${opt.unit})`,
                                  description: `Purchased Unit: ₹${(parseFloat(String(opt.purchase_cost)) / parseFloat(String(opt.quantity_purchased))).toFixed(2)} / ${opt.unit}`,
                                  icon: (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                    </svg>
                                  )
                                }))}
                                value={recipeIngId}
                                onChange={(val) => {
                                  setRecipeIngId(val);
                                  const sel = ingredients.find(i => String(i.id) === val);
                                  if (sel) {
                                    const opts = getCompatibleUnits(sel.unit);
                                    setRecipeUnit(opts[0].value);
                                  }
                                }}
                                placeholder="Choose ingredient to link..."
                              />
                            </div>

                            {/* Quantity Needed & Unit Selection Row */}
                            {recipeIngId && (() => {
                              const selIng = ingredients.find(i => String(i.id) === recipeIngId);
                              if (!selIng) return null;
                              const unitOpts = getCompatibleUnits(selIng.unit);
                              const parsedQty = parseFloat(recipeQty);
                              const hasQty = !isNaN(parsedQty) && parsedQty > 0;
                              const baseConverted = hasQty ? convertToBaseQuantity(parsedQty, recipeUnit, selIng.unit) : 0;

                              return (
                                <>
                                  <div className="recipe-qty-unit-row" style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
                                    <div className="form-group">
                                      <label>Quantity Needed per Order</label>
                                      <input 
                                        type="number" 
                                        step="0.001" 
                                        min="0" 
                                        placeholder={`e.g. 50`}
                                        value={recipeQty} 
                                        onChange={(e) => setRecipeQty(e.target.value)}
                                        className="input-field"
                                      />
                                    </div>

                                    <div className="form-group">
                                      <label>Recipe Unit</label>
                                      <CustomSelect
                                        options={unitOpts}
                                        value={recipeUnit}
                                        onChange={(val) => setRecipeUnit(val)}
                                        placeholder="Unit"
                                      />
                                    </div>
                                  </div>

                                  {hasQty && (
                                    <div className="unit-cost-preview-badge" style={{ marginBottom: '14px' }}>
                                      <span className="unit-cost-label">Inventory Deduction:</span>
                                      <span className="unit-cost-value">
                                        {parsedQty} {recipeUnit} ({baseConverted.toFixed(3)} {selIng.unit}) / order
                                      </span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}

                            {recipeError && <span className="error-text">{recipeError}</span>}
                            <button type="submit" className="primary-button add-mapping-btn" disabled={recipeLoading || !recipeIngId}>
                              {recipeLoading ? 'Saving...' : 'Link to Dish'}
                            </button>
                          </form>
                        </>
                      ) : (
                        <div className="recipe-select-prompt">
                          👉 Select a dish on the left to configure its ingredients and cost structure.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          </div>
        )}

        {/* MODAL: ADD / EDIT PRODUCT */}
        {productModal.show && (
          <div className="modal-backdrop" onClick={() => setProductModal({ show: false, mode: 'add' })}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{productModal.mode === 'edit' ? 'Edit Product' : 'Add New Product'}</h3>
                <button onClick={() => setProductModal({ show: false, mode: 'add' })} className="close-btn" disabled={pModalLoading}>✕</button>
              </div>

              <form onSubmit={handleSaveProduct}>
                <div className="form-group">
                  <label>Product Name</label>
                  <input
                    type="text"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="e.g. Vadai, Cauliflower Fries"
                    className="input-field"
                    disabled={pModalLoading}
                  />
                </div>
                <div className="form-group">
                  <label>Sales Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    placeholder="0.00"
                    className="input-field"
                    disabled={pModalLoading}
                  />
                </div>
                <div className="form-group">
                  <label>Tax Slab (GST)</label>
                  <select value={pTax} onChange={(e) => setPTax(e.target.value)} className="input-field" disabled={pModalLoading}>
                    <option value="0.00">Exempt (0%)</option>
                    <option value="5.00">GST 5%</option>
                    <option value="12.00">GST 12%</option>
                    <option value="18.00">GST 18%</option>
                    <option value="28.00">GST 28%</option>
                  </select>
                </div>
                {productModal.mode === 'edit' && (
                  <div className="form-group">
                    <label>Current Stock</label>
                    <input
                      type="number"
                      value={pStock}
                      onChange={(e) => setPStock(e.target.value)}
                      placeholder="0"
                      className="input-field"
                      disabled={pModalLoading}
                    />
                  </div>
                )}
                {pModalError && <span className="error-text">{pModalError}</span>}
                <button type="submit" className="primary-button" disabled={pModalLoading}>
                  {pModalLoading ? 'Saving...' : 'Save Product'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT INGREDIENT */}
        {ingModal.show && (
          <div className="modal-backdrop" onClick={() => setIngModal({ show: false, mode: 'add' })}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{ingModal.mode === 'edit' ? 'Edit Ingredient Log' : ingModal.mode === 'restock' ? 'Restock Ingredient' : 'Log Raw Ingredient Purchase'}</h3>
                <button onClick={() => setIngModal({ show: false, mode: 'add' })} className="close-btn" disabled={ingModalLoading}>✕</button>
              </div>

              <form onSubmit={handleSaveIngredient}>
                <div className="form-group">
                  <label>Ingredient Name</label>
                  <input
                    type="text"
                    value={ingName}
                    onChange={(e) => setIngName(e.target.value)}
                    placeholder="e.g. Cooking Oil, Batter, Cauliflower"
                    className="input-field"
                    disabled={ingModalLoading || ingModal.mode === 'restock'}
                  />
                </div>
                <div className="form-group">
                  <label>Measurement Unit</label>
                  <CustomSelect
                    options={unitOptions}
                    value={ingUnit}
                    onChange={(val) => setIngUnit(val)}
                    placeholder="Select measurement unit"
                  />
                </div>
                <div className="form-group">
                  <label>Total Purchased Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={ingCost}
                    onChange={(e) => setIngCost(e.target.value)}
                    placeholder="0.00"
                    className="input-field"
                    disabled={ingModalLoading}
                  />
                </div>
                <div className="form-group">
                  <label>Quantity Purchased</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={ingQty}
                    onChange={(e) => setIngQty(e.target.value)}
                    placeholder="e.g. 5 for 5 Liters/kg"
                    className="input-field"
                    disabled={ingModalLoading}
                  />
                </div>

                {/* Auto-calculated Unit Cost Live Preview */}
                {(() => {
                  const costNum = parseFloat(ingCost);
                  const qtyNum = parseFloat(ingQty);
                  if (!isNaN(costNum) && !isNaN(qtyNum) && qtyNum > 0) {
                    const unitPrice = (costNum / qtyNum).toFixed(2);
                    return (
                      <div className="unit-cost-preview-badge">
                        <span className="unit-cost-label">Calculated Unit Cost:</span>
                        <span className="unit-cost-value">₹{unitPrice} / {ingUnit}</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="form-group">
                  <label>Usable Yield Percentage (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={ingYield}
                    onChange={(e) => setIngYield(e.target.value)}
                    placeholder="100"
                    className="input-field"
                    disabled={ingModalLoading}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
                    e.g. Set to 70% if 30% is lost to stems, peels, or trimming.
                  </small>
                </div>

                <div className="form-group">
                  <label>Purchase Date <small style={{ color: '#6366f1', fontWeight: 500 }}>(Defaults to Today)</small></label>
                  <input
                    type="date"
                    value={ingDate}
                    onChange={(e) => setIngDate(e.target.value)}
                    className="input-field"
                    disabled={ingModalLoading}
                  />
                </div>
                {ingModalError && <span className="error-text">{ingModalError}</span>}
                <button type="submit" className="primary-button" disabled={ingModalLoading}>
                  {ingModalLoading ? 'Saving...' : 'Save Ingredient'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: LOG WASTE & BATCH USAGE */}
        {wasteModal.show && wasteModal.ingredient && (
          <div className="modal-backdrop" onClick={() => setWasteModal({ show: false })}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Log Stock Deduction & Waste</h3>
                <button onClick={() => setWasteModal({ show: false })} className="close-btn" disabled={wasteLoading}>✕</button>
              </div>

              <form onSubmit={handleSaveWasteAdjustment}>
                <div className="form-group">
                  <label>Ingredient</label>
                  <input
                    type="text"
                    value={`${wasteModal.ingredient.name} (Remaining: ${wasteModal.ingredient.remaining_quantity} ${wasteModal.ingredient.unit})`}
                    className="input-field"
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label>Quantity to Deduct ({wasteModal.ingredient.unit})</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max={wasteModal.ingredient.remaining_quantity}
                    value={wasteQty}
                    onChange={(e) => setWasteQty(e.target.value)}
                    placeholder={`e.g. 2.5 ${wasteModal.ingredient.unit}`}
                    className="input-field"
                    disabled={wasteLoading}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Deduction Reason</label>
                  <CustomSelect
                    options={[
                      {
                        value: 'Batch/Fryer Filling',
                        label: 'Batch / Fryer Filling',
                        description: 'Bulk operational usage (e.g. filling deep fryer)',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.372A2.25 2.25 0 004.5 16v2.25C4.5 19.493 5.507 20.5 6.75 20.5h10.5c1.243 0 2.25-1.007 2.25-2.25V16c0-.597-.237-1.169-.659-1.591l-4.091-4.063a2.25 2.25 0 01-.659-1.591V3.104" />
                          </svg>
                        )
                      },
                      {
                        value: 'Spoilage/Expired',
                        label: 'Spoilage / Expired',
                        description: 'Spoiled, stale, moldy, or expired inventory',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                          </svg>
                        )
                      },
                      {
                        value: 'Spill/Damage',
                        label: 'Spill / Damage',
                        description: 'Dropped, broken, or spilled inventory',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 21v-2.25m-6.364-.386l1.591-1.591M3 12h2.25m.386-6.364l1.591 1.591" />
                          </svg>
                        )
                      },
                      {
                        value: 'Trimming Loss',
                        label: 'Trimming / Yield Loss',
                        description: 'Stems, skins, bones, or prep trimming discarded',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887m-1.536-.887A4.248 4.248 0 004.5 12a4.248 4.248 0 004.248 4.248c1.378 0 2.6-.656 3.376-1.68m0 0l2.584 1.492m-2.584-1.492L7.848 8.25m0 0a4.248 4.248 0 014.248-4.248c1.378 0 2.6.656 3.376 1.68m0 0l2.584-1.492" />
                          </svg>
                        )
                      },
                      {
                        value: 'Manual Correction',
                        label: 'Manual Correction',
                        description: 'Inventory audit or stock correction',
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        )
                      }
                    ]}
                    value={wasteReason}
                    onChange={(val) => setWasteReason(val)}
                    placeholder="Select deduction reason"
                  />
                </div>

                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <input
                    type="text"
                    value={wasteNotes}
                    onChange={(e) => setWasteNotes(e.target.value)}
                    placeholder="e.g. Filled deep fryer for weekend rush"
                    className="input-field"
                    disabled={wasteLoading}
                  />
                </div>

                <button type="submit" className="primary-button waste-action-btn" disabled={wasteLoading}>
                  {wasteLoading ? 'Logging...' : 'Confirm Stock Deduction'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Reusable Custom Alert / Confirm Modal */}
      {customAlert && customAlert.show && (
        <div className="modal-backdrop alert-backdrop">
          <div className="modal-container alert-modal-container">
            <div className="alert-modal-header">
              <div className={`alert-icon-circle ${customAlert.type}`}>
                {customAlert.type === 'success' && <span>✓</span>}
                {customAlert.type === 'error' && <span>✕</span>}
                {customAlert.type === 'confirm' && <span>?</span>}
              </div>
              <h3>{customAlert.title}</h3>
            </div>
            <div className="alert-modal-body">
              <p>{customAlert.message}</p>
            </div>
            <div className="alert-modal-actions">
              {customAlert.type === 'confirm' ? (
                <>
                  <button 
                    onClick={() => {
                      if (customAlert.onConfirm) customAlert.onConfirm();
                      setCustomAlert(null);
                    }} 
                    className="primary-button alert-confirm-btn"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => setCustomAlert(null)} 
                    className="secondary-button alert-cancel-btn"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setCustomAlert(null)} 
                  className="primary-button alert-ok-btn"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
