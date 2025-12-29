import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sale, Expense, InventoryItem, 
  SaleFormData, ExpenseFormData, InventoryFormData, 
  AppConfig, Tab, PaymentMethod 
} from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import type { Database } from './database.types';

// Componentes
import SalesForm from './components/SalesForm';
import SalesList from './components/SalesList';
import ExpensesView from './components/ExpensesView';
import InventoryView from './components/InventoryView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import LoginView from './components/LoginView';

// Iconos
import { PlusCircle, List, BarChart2, Settings, ShoppingBag, Receipt, Package, LogOut } from 'lucide-react';
import { DEFAULT_PRODUCT_CATEGORIES, DEFAULT_CATEGORY_MAP, DEFAULT_MATERIALS } from './constants';

const App: React.FC = () => {
  // --- Estados ---
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('form');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formDraft, setFormDraft] = useState({
    date: new Date().toISOString().split('T')[0],
    clientNumber: '',
    paymentMethod: 'Efectivo' as PaymentMethod
  });

  const [config, setConfig] = useState<AppConfig>({
    categories: DEFAULT_PRODUCT_CATEGORIES,
    subcategories: DEFAULT_CATEGORY_MAP,
    materials: DEFAULT_MATERIALS
  });

  // --- Auth ---
  useEffect(() => {
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase?.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    }) ?? { data: { subscription: null } };

    return () => subscription?.unsubscribe();
  }, []);

  // --- Carga de Datos ---
  const fetchData = useCallback(async () => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const [sRes, iRes, eRes] = await Promise.all([
        supabase.from('sales').select('*').order('date', { ascending: false }).limit(100),
        supabase.from('inventory').select('*').order('name'),
        supabase.from('expenses').select('*').order('date', { ascending: false })
      ]);
      if (sRes.data) setSales(sRes.data as any);
      if (iRes.data) setInventory(iRes.data as any);
      if (eRes.data) setExpenses(eRes.data as any);
    } catch (error) {
      showToast("Error al sincronizar datos");
    } finally {
      setIsSyncing(false);
    }
  }, [session]);

  useEffect(() => { if (session) fetchData(); }, [session, fetchData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- Handlers de Ventas ---
  const handleNewSale = async (formData: SaleFormData) => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const matchedItem = inventory.find(i => i.name === formData.product);
      
      const { error } = await supabase.from('sales').insert({
        date: formData.date,
        client_number: formData.clientNumber,
        product_name: formData.product,
        quantity: parseInt(formData.quantity) || 0,
        price: parseFloat(formData.price) || 0,
        payment_method: formData.paymentMethod,
        size: formData.size || null,
        notes: formData.notes || null,
        inventory_id: matchedItem?.id || null,
        user_id: session.user.id,
        cost_price: matchedItem?.cost_price || 0
      } as any);
      
      if (error) throw error;

      if (matchedItem && formData.size) {
        const newSizes = { 
          ...matchedItem.sizes, 
          [formData.size]: (matchedItem.sizes[formData.size] || 0) - (parseInt(formData.quantity) || 0) 
        };
        await (supabase.from('inventory') as any).update({ 
          sizes: newSizes, 
          last_updated: new Date().toISOString() 
        }).eq('id', matchedItem.id);
      }
      
      showToast('¡Venta registrada!');
      setFormDraft(prev => ({ ...prev, clientNumber: formData.clientNumber, paymentMethod: formData.paymentMethod }));
      fetchData();
      setActiveTab('list');
    } catch (err) { 
      showToast('Error al registrar venta'); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const saleToDelete = sales.find(s => s.id === id);
      if (saleToDelete?.inventory_id && saleToDelete.size) {
        const item = inventory.find(i => i.id === saleToDelete.inventory_id);
        if (item) {
          const newSizes = { ...item.sizes, [saleToDelete.size]: (item.sizes[saleToDelete.size] || 0) + saleToDelete.quantity };
          await (supabase.from('inventory') as any).update({ 
            sizes: newSizes,
            last_updated: new Date().toISOString()
          }).eq('id', item.id);
        }
      }
      await supabase.from('sales').delete().eq('id', id);
      showToast("Venta eliminada y stock reintegrado");
      fetchData();
    } finally { setIsSyncing(false); }
  };

  // --- Handlers de Gastos ---
  const handleNewExpense = async (formData: ExpenseFormData) => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        date: formData.date,
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        category: formData.category,
        has_invoice_a: formData.hasInvoiceA,
        invoice_percentage: parseInt(formData.invoicePercentage) || 0,
        user_id: session.user.id
      } as any);
      
      if (error) throw error;
      showToast('¡Gasto guardado!');
      fetchData();
    } catch (err) { 
      showToast('Error al guardar gasto'); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) { showToast("Gasto eliminado"); fetchData(); }
  };

  // --- Handlers de Inventario ---
  const handleAddInventory = async (formData: InventoryFormData) => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const sizesNum: Record<string, number> = {};
      Object.entries(formData.sizes).forEach(([s, q]) => sizesNum[s] = parseInt(q) || 0);
      
      const { error } = await supabase.from('inventory').insert({
        name: formData.name,
        category: formData.category,
        subcategory: formData.subcategory,
        material: formData.material,
        sizes: sizesNum as any,
        cost_price: parseFloat(formData.costPrice) || 0,
        selling_price: parseFloat(formData.sellingPrice) || 0,
        user_id: session.user.id
      } as any);
      
      if (error) throw error;

      fetchData();
      showToast("Producto agregado");
    } catch (err) {
      showToast("Error al agregar producto");
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleUpdateInventory = async (item: InventoryItem) => {
    if (!supabase) return;
    await (supabase.from('inventory') as any).update({
      sizes: item.sizes,
      name: item.name,
      selling_price: item.selling_price,
      last_updated: new Date().toISOString()
    }).eq('id', item.id);
    fetchData();
  };

  const handleDeleteInventory = async (id: string) => {
    if (!supabase) return;
    await supabase.from('inventory').delete().eq('id', id);
    showToast("Producto eliminado");
    fetchData();
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-black text-primary animate-pulse uppercase text-xs tracking-widest">Cargando Atenea...</div>;
  if (!session) return <LoginView onLogin={() => {}} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-800">
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg"><ShoppingBag className="w-4 h-4 text-white" /></div>
          <h1 className="font-bold text-lg">Atenea <span className="text-primary">Finanzas</span></h1>
        </div>
        <div className="flex items-center gap-2">
          {isSyncing && <span className="text-[9px] font-black text-primary animate-pulse mr-2">SYNCING</span>}
          <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg ${activeTab === 'settings' ? 'bg-slate-100 text-primary' : 'text-slate-400'}`}><Settings className="w-5 h-5" /></button>
          <button onClick={() => supabase.auth.signOut()} className="p-2 text-rose-400"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {activeTab === 'form' && <SalesForm onSubmit={handleNewSale} onQuickCreate={handleAddInventory} nextSaleNumber={sales.length + 1} recentProducts={Array.from(new Set(sales.map(s => s.product_name)))} inventory={inventory} sales={sales} initialDraft={formDraft} onDraftChange={setFormDraft} />}
        {activeTab === 'list' && <SalesList sales={sales} onDelete={handleDeleteSale} onRetrySync={() => {}} />}
        {activeTab === 'inventory' && <InventoryView inventory={inventory} config={config} onAdd={handleAddInventory} onUpdate={handleUpdateInventory} onDelete={handleDeleteInventory} />}
        {activeTab === 'expenses' && <ExpensesView expenses={expenses} onSubmit={handleNewExpense} onDelete={handleDeleteExpense} onRetrySync={() => {}} />}
        {activeTab === 'stats' && <StatsView sales={sales} expenses={expenses} inventory={inventory} />}
        {activeTab === 'settings' && <SettingsView config={config} onSaveConfig={setConfig} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe pt-2 px-4 shadow-lg z-50">
        <div className="max-w-md mx-auto flex justify-between items-center mb-2">
          <button onClick={() => setActiveTab('form')} className={`flex flex-col items-center gap-1 w-14 ${activeTab === 'form' ? 'text-primary' : 'text-slate-400'}`}><PlusCircle className="w-5 h-5" /><span className="text-[9px] font-bold">Ingresar</span></button>
          <button onClick={() => setActiveTab('list')} className={`flex flex-col items-center gap-1 w-14 ${activeTab === 'list' ? 'text-primary' : 'text-slate-400'}`}><List className="w-5 h-5" /><span className="text-[9px] font-bold">Ventas</span></button>
          <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 w-14 ${activeTab === 'inventory' ? 'text-indigo-600' : 'text-slate-400'}`}><Package className="w-5 h-5" /><span className="text-[9px] font-bold">Stock</span></button>
          <button onClick={() => setActiveTab('expenses')} className={`flex flex-col items-center gap-1 w-14 ${activeTab === 'expenses' ? 'text-rose-500' : 'text-slate-400'}`}><Receipt className="w-5 h-5" /><span className="text-[9px] font-bold">Gastos</span></button>
          <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 w-14 ${activeTab === 'stats' ? 'text-primary' : 'text-slate-400'}`}><BarChart2 className="w-5 h-5" /><span className="text-[9px] font-bold">Reporte</span></button>
        </div>
      </nav>

      {toastMessage && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl z-[60] text-sm font-bold">{toastMessage}</div>}
    </div>
  );
};

export default App;