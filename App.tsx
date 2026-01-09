import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sale, Expense, InventoryItem, 
  AppConfig, Tab, MultiSaleData, InventoryFormData, CartItem 
} from './types';
import { supabase } from './lib/supabase';

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
  
  // Borrador para el formulario (Edición o Cambio)
  const [formDataDraft, setFormDataDraft] = useState<MultiSaleData | null>(null);

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
        supabase.from('sales').select('*').order('date', { ascending: false }).limit(250),
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

  // --- GENERADOR DE ID SEMÁNTICO (V260109-001) ---
  const generateSemanticId = (type: 'V' | 'S' | 'C', dateStr: string) => {
    const cleanDate = dateStr.replace(/-/g, '').slice(2); 
    const todaySales = sales.filter(s => s.date === dateStr);
    
    const correlativos = todaySales.map(s => {
      const parts = (s.client_number || '').split('-');
      return parts.length > 1 ? parseInt(parts[1]) : 0;
    });
    
    const nextNum = (correlativos.length > 0 ? Math.max(...correlativos) : 0) + 1;
    const paddedNum = nextNum.toString().padStart(3, '0');
    
    return `${type}${cleanDate}-${paddedNum}`;
  };

  // --- HANDLER DE VENTAS (CARRITO + CAMBIOS + STOCK) ---
  const handleNewMultiSale = async (data: MultiSaleData) => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    
    try {
      // 1. Si es EDICIÓN, borramos los anteriores
      if (data.isEdit && data.originalClientNumber) {
        await supabase.from('sales').delete().eq('client_number', data.originalClientNumber);
      }

      // 2. Determinar Tipo
      const hasReturn = data.items.some(i => i.isReturn);
      const cartTotal = data.items.reduce((sum, i) => sum + (i.price * i.quantity * (i.isReturn ? -1 : 1)), 0);
      const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);
      const isComplete = totalPaid >= cartTotal;
      
      let prefix: 'V' | 'S' | 'C' = isComplete ? 'V' : 'S';
      if (hasReturn) prefix = 'C';

      const semanticId = (data.isEdit && data.originalClientNumber) 
        ? data.originalClientNumber 
        : generateSemanticId(prefix, data.date);
      
      // 3. Insertar
      const salesToInsert = data.items.map(item => ({
        date: data.date,
        client_number: semanticId,
        product_name: item.isReturn ? `(DEVOLUCIÓN) ${item.product}` : item.product,
        quantity: item.quantity,
        price: item.isReturn ? -item.price : item.price,
        cost_price: item.cost_price,
        payment_method: data.payments[0]?.method || 'Efectivo',
        size: item.size,
        inventory_id: item.inventory_id,
        user_id: session.user.id,
        notes: data.payments.length > 1 
          ? `DETALLE: ${data.payments.map(p => `${p.method} ($${p.amount})`).join(' + ')}` 
          : (data.isEdit ? `Editado el ${new Date().toLocaleDateString()}` : null)
      }));

      await (supabase.from('sales') as any).insert(salesToInsert);

      // 4. Actualizar stock
      for (const item of data.items) {
        if (item.inventory_id && item.size) {
          const invItem = inventory.find(i => i.id === item.inventory_id);
          if (invItem) {
            const currentStock = invItem.sizes[item.size] || 0;
            const delta = item.isReturn ? item.quantity : -item.quantity;
            const newSizes = { ...invItem.sizes, [item.size]: currentStock + delta };
            await (supabase.from('inventory') as any).update({ sizes: newSizes, last_updated: new Date().toISOString() }).eq('id', invItem.id);
          }
        }
      }
      
      showToast(data.isEdit ? '¡Cambios guardados!' : '¡Operación exitosa!');
      setFormDataDraft(null);
      fetchData(); 
    } catch (err) { 
      showToast('Error al guardar'); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleEditRequest = (sale: Sale) => {
    const relatedSales = sales.filter(s => s.client_number === sale.client_number);
    const cartItems = relatedSales.map(s => ({
      id: s.id,
      product: s.product_name.replace('(DEVOLUCIÓN) ', ''),
      quantity: s.quantity,
      price: Math.abs(s.price),
      size: s.size || 'U',
      inventory_id: s.inventory_id,
      cost_price: s.cost_price,
      isReturn: s.price < 0
    }));

    setFormDataDraft({
      date: sale.date,
      items: cartItems,
      payments: [{ method: sale.payment_method, amount: Math.max(0, relatedSales.reduce((sum, s) => sum + s.price, 0)) }],
      isEdit: true,
      originalClientNumber: sale.client_number
    });
    setActiveTab('form');
  };

  const handleReturnRequest = (sale: Sale) => {
    setFormDataDraft({
      date: new Date().toISOString().split('T')[0],
      items: [{
        id: `ret-${Date.now()}`,
        product: sale.product_name.replace('(DEVOLUCIÓN) ', ''),
        quantity: sale.quantity,
        price: Math.abs(sale.price),
        size: sale.size || 'U',
        inventory_id: sale.inventory_id,
        cost_price: sale.cost_price || 0,
        isReturn: true
      }],
      payments: [{ method: 'Efectivo', amount: 0 }],
      isEdit: false
    });
    setActiveTab('form');
    showToast('Prenda cargada para devolver');
  };

  const handleDeleteSale = async (id: string) => {
    if (!supabase) return;
    const confirmacion = window.confirm("⚠️ ¿BORRAR ESTA VENTA?\n\nEsta acción no se puede deshacer.");
    if (!confirmacion) return;

    setIsSyncing(true);
    try {
      await supabase.from('sales').delete().eq('id', id);
      showToast("✓ Venta eliminada");
      fetchData();
    } catch (err) {
      showToast("Error al eliminar");
    } finally {
      setIsSyncing(false);
    }
  };

  // --- OTROS HANDLERS ---
  const handleNewInventoryItem = async (formData: InventoryFormData) => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const sizesNum: Record<string, number> = {};
      Object.entries(formData.sizes).forEach(([s, q]) => { sizesNum[s] = parseInt(q) || 0; });
      await (supabase.from('inventory') as any).insert({ ...formData, sizes: sizesNum, user_id: session.user.id });
      showToast('¡Creado!');
      fetchData();
    } finally { setIsSyncing(false); }
  };

  const handleUpdateInventory = async (item: InventoryItem) => {
    if (!supabase) return;
    await (supabase.from('inventory') as any).update({ sizes: item.sizes, name: item.name, selling_price: item.selling_price, last_updated: new Date().toISOString() }).eq('id', item.id);
    fetchData();
  };

  const handleDeleteInventoryItem = async (id: string) => {
    if (!supabase || !window.confirm('¿Borrar producto?')) return;
    await supabase.from('inventory').delete().eq('id', id);
    fetchData();
  };

  const handleNewExpense = async (formData: any) => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      await (supabase.from('expenses') as any).insert({ ...formData, user_id: session.user.id });
      showToast('¡Gasto guardado!');
      fetchData();
    } finally { setIsSyncing(false); }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!supabase || !window.confirm('¿Borrar gasto?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchData();
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-black text-primary animate-pulse text-xs tracking-widest">ATENEA...</div>;
  if (!session) return <LoginView onLogin={() => {}} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-800">
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20"><ShoppingBag className="w-4 h-4 text-white" /></div>
          <h1 className="font-bold text-lg tracking-tight">Atenea <span className="text-primary">Finanzas</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg ${activeTab === 'settings' ? 'bg-slate-100 text-primary' : 'text-slate-400'}`}><Settings className="w-5 h-5" /></button>
          <button onClick={() => supabase.auth.signOut()} className="p-2 text-rose-400"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {activeTab === 'form' && <SalesForm onSubmit={handleNewMultiSale} inventory={inventory} initialData={formDataDraft} onCancelEdit={() => { setFormDataDraft(null); setActiveTab('list'); }} nextSaleNumber={sales.length + 1} />}
        {activeTab === 'list' && <SalesList sales={sales} onDelete={handleDeleteSale} onEdit={handleEditRequest} onReturn={handleReturnRequest} />}
        {activeTab === 'inventory' && <InventoryView inventory={inventory} config={config} onAdd={handleNewInventoryItem} onUpdate={handleUpdateInventory} onDelete={handleDeleteInventoryItem} />}
        {activeTab === 'expenses' && <ExpensesView expenses={expenses} onSubmit={handleNewExpense} onDelete={handleDeleteExpense} onRetrySync={() => {}} />}
        {activeTab === 'stats' && <StatsView sales={sales} expenses={expenses} inventory={inventory} />}
        {activeTab === 'settings' && <SettingsView config={config} onSaveConfig={setConfig} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 pb-safe pt-2 px-4 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center mb-2">
          <button onClick={() => setActiveTab('form')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'form' ? 'text-primary scale-110' : 'text-slate-400'}`}><PlusCircle className="w-6 h-6" /><span className="text-[9px] font-bold">Ingresar</span></button>
          <button onClick={() => setActiveTab('list')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'list' ? 'text-primary scale-110' : 'text-slate-400'}`}><List className="w-6 h-6" /><span className="text-[9px] font-bold">Ventas</span></button>
          <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'inventory' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}><Package className="w-6 h-6" /><span className="text-[9px] font-bold">Stock</span></button>
          <button onClick={() => setActiveTab('expenses')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'expenses' ? 'text-rose-500 scale-110' : 'text-slate-400'}`}><Receipt className="w-6 h-6" /><span className="text-[9px] font-bold">Gastos</span></button>
          <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'stats' ? 'text-primary scale-110' : 'text-slate-400'}`}><BarChart2 className="w-6 h-6" /><span className="text-[9px] font-bold">Reporte</span></button>
        </div>
      </nav>

      {toastMessage && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl z-[60] text-sm font-bold animate-in zoom-in">{toastMessage}</div>}
    </div>
  );
};

export default App;