import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  Tab, MultiSaleData, ExpenseFormData, EntryMode, Sale, Expense, ProductDraft 
} from './types';

// Hooks
import { useLocalStorage } from './hooks/useLocalStorage';
import { useAtenea } from './hooks/useAtenea';

// Componentes
import SalesForm from './components/SalesForm';
import SalesList from './components/SalesList';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import InventoryView from './components/InventoryView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import LoginView from './components/LoginView';

// Iconos
import { 
  PlusCircle, List, BarChart2, ShoppingBag, LogOut, 
  ArrowUpCircle, ArrowDownCircle, Share2, CheckCircle2 
} from 'lucide-react';
import { DEFAULT_PRODUCT_CATEGORIES, DEFAULT_CATEGORY_MAP, DEFAULT_MATERIALS } from './constants';

const getTodayAR = () => {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
};

const initialProductDraft: ProductDraft = {
  name: '', price: '', quantity: '1', size: 'U', inventoryId: ''
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('form');
  const [entryMode, setEntryMode] = useState<EntryMode>('sale');
  const [historyMode, setHistoryMode] = useState<EntryMode>('sale');
  const [toastMessage, setToastMessage] = useState<{msg: string, voucher?: any} | null>(null);

  // Persistencia Global
  const [saleDraft, setSaleDraft] = useLocalStorage<MultiSaleData>('atenea_sale_draft', {
    date: getTodayAR(), 
    items: [], 
    payments: [],
    productDraft: initialProductDraft
  });

  const [expenseDraft, setExpenseDraft] = useLocalStorage<ExpenseFormData>('atenea_expense_draft', {
    date: getTodayAR(), description: '', amount: '', category: 'Mercadería', hasInvoiceA: false, invoiceAmount: ''
  });

  const [config, setConfig] = useLocalStorage('atenea_config', {
    categories: DEFAULT_PRODUCT_CATEGORIES, subcategories: DEFAULT_CATEGORY_MAP, materials: DEFAULT_MATERIALS
  });

  const atenea = useAtenea(session);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase?.auth.onAuthStateChange((_event, session) => setSession(session)) ?? { data: { subscription: null } };
    return () => subscription?.unsubscribe();
  }, []);

  const showToast = (msg: string, voucher?: any) => {
    setToastMessage({ msg, voucher });
    if (!voucher) setTimeout(() => setToastMessage(null), 1000);
  };

  // MEJORA: Al confirmar, mantenemos la fecha (data.date) para la siguiente carga
  const handleNewSale = async (data: MultiSaleData) => {
    const res = await atenea.saveMultiSale(data);
    if (res?.success) {
      showToast(data.isEdit ? "¡Actualizado!" : "¡Venta registrada!", res.voucher);
      
      setSaleDraft({ 
        date: data.date, // Mantenemos la fecha usada
        items: [], 
        payments: [],
        productDraft: initialProductDraft 
      });

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const handleNewExpense = async (data: ExpenseFormData) => {
    const res = await atenea.saveExpense(data);
    if (res?.success) {
      showToast(data.isEdit ? "¡Gasto actualizado!" : "¡Gasto registrado!");
      
      setExpenseDraft({ 
        date: data.date, // Mantenemos la fecha usada
        description: '', 
        amount: '', 
        category: 'Mercadería', 
        hasInvoiceA: false, 
        invoiceAmount: '' 
      });
      
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
  };

  const handleEditSale = (sale: Sale) => {
    const related = atenea.sales.filter(s => s.client_number === sale.client_number);
    setSaleDraft({
      date: sale.date,
      items: related.map(s => ({
        id: s.id, product: s.product_name.replace('(DEVOLUCIÓN) ', ''),
        quantity: s.quantity, listPrice: Number(s.list_price) || Number(s.price), finalPrice: Number(s.price),
        size: s.size || 'U', inventory_id: s.inventory_id, cost_price: Number(s.cost_price), isReturn: Number(s.price) < 0
      })),
      payments: sale.payment_details || [], 
      isEdit: true, 
      originalClientNumber: sale.client_number,
      productDraft: initialProductDraft 
    });
    setEntryMode('sale');
    setActiveTab('form');
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseDraft({
      id: expense.id, date: expense.date, description: expense.description, amount: expense.amount.toString(),
      category: expense.category, hasInvoiceA: expense.has_invoice_a, invoiceAmount: (expense.invoice_amount || 0).toString(), isEdit: true
    });
    setEntryMode('expense');
    setActiveTab('form');
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-black text-primary animate-pulse text-xs tracking-widest uppercase">Atenea...</div>;
  if (!session) return <LoginView onLogin={() => {}} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-800">
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20"><ShoppingBag className="w-4 h-4 text-white" /></div>
          <h1 className="font-bold text-lg italic">Atenea <span className="text-primary">Finanzas</span></h1>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="p-2 text-rose-400 active:scale-90 transition-all"><LogOut className="w-5 h-5" /></button>
      </header>

      <main className="max-w-md mx-auto p-4">
        {activeTab === 'form' && (
          <div className="flex flex-col space-y-3">
            <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
              <button onClick={() => setEntryMode('sale')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all ${entryMode === 'sale' ? 'bg-white text-primary shadow-md scale-[1.02]' : 'text-slate-500'}`}><ArrowUpCircle className="w-4 h-4" /> INGRESO</button>
              <button onClick={() => setEntryMode('expense')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all ${entryMode === 'expense' ? 'bg-white text-rose-600 shadow-md scale-[1.02]' : 'text-slate-500'}`}><ArrowDownCircle className="w-4 h-4" /> EGRESO</button>
            </div>
            
            {entryMode === 'sale' ? (
              <SalesForm 
                onSubmit={handleNewSale} 
                inventory={atenea.inventory} 
                vouchers={atenea.vouchers} 
                initialData={saleDraft} 
                onChange={setSaleDraft} 
                onCancelEdit={() => setSaleDraft({ date: getTodayAR(), items: [], payments: [], productDraft: initialProductDraft })} 
                nextSaleNumber={atenea.sales.length + 1} 
              />
            ) : (
              <ExpenseForm 
                formData={expenseDraft} 
                onChange={setExpenseDraft} 
                onSubmit={handleNewExpense} 
                onCancelEdit={() => setExpenseDraft({ date: getTodayAR(), description: '', amount: '', category: 'Mercadería', hasInvoiceA: false, invoiceAmount: '', isEdit: false })} 
              />
            )}
          </div>
        )}

        {activeTab === 'list' && (
          <div className="flex flex-col space-y-4">
            <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
              <button onClick={() => setHistoryMode('sale')} className={`flex-1 py-2.5 rounded-xl font-black text-[10px] transition-all uppercase ${historyMode === 'sale' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>Ingresos</button>
              <button onClick={() => setHistoryMode('expense')} className={`flex-1 py-2.5 rounded-xl font-black text-[10px] transition-all uppercase ${historyMode === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500'}`}>Egresos</button>
            </div>
            {historyMode === 'sale' ? (
              <SalesList sales={atenea.sales} onDelete={atenea.deleteTransaction} onEdit={handleEditSale} onReturn={() => {}} />
            ) : (
              <ExpenseList expenses={atenea.expenses} onDelete={atenea.deleteExpense} onEdit={handleEditExpense} />
            )}
          </div>
        )}

        {activeTab === 'inventory' && <InventoryView inventory={atenea.inventory} config={config} onAdd={atenea.fetchData} onUpdate={atenea.fetchData} onDelete={atenea.fetchData} />}
        {activeTab === 'stats' && <StatsView sales={atenea.sales} expenses={atenea.expenses} inventory={atenea.inventory} />}
        {activeTab === 'settings' && <SettingsView config={config} onSaveConfig={setConfig} />}
      </main>

      {/* Nav y Toasts (Sin cambios) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 pb-safe pt-2 px-4 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center mb-2">
          <button onClick={() => setActiveTab('form')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'form' ? 'text-primary scale-110' : 'text-slate-400'}`}><PlusCircle /><span className="text-[9px] font-bold uppercase tracking-tighter">Ingresar</span></button>
          <button onClick={() => setActiveTab('list')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'list' ? 'text-primary scale-110' : 'text-slate-400'}`}><List /><span className="text-[9px] font-bold uppercase tracking-tighter">Movimientos</span></button>
          <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'inventory' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}><ShoppingBag /><span className="text-[9px] font-bold uppercase tracking-tighter">Stock</span></button>
          <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'stats' ? 'text-primary scale-110' : 'text-slate-400'}`}><BarChart2 /><span className="text-[9px] font-bold uppercase tracking-tighter">Reporte</span></button>
        </div>
      </nav>

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur-md text-white p-4 rounded-3xl shadow-2xl z-[60] text-xs font-black animate-in slide-in-from-bottom-5 min-w-[280px] border border-white/10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="uppercase tracking-widest">{toastMessage.msg}</span></div>
          {toastMessage.voucher && (
            <div className="w-full space-y-3 pt-3 border-t border-white/10">
              <div className="bg-slate-900/50 p-3 rounded-2xl text-center font-mono text-primary text-lg border border-primary/20">{toastMessage.voucher.code}</div>
              <input id="wa-phone" type="text" placeholder="Celular (ej: 1112345678)" className="w-full bg-slate-700 rounded-2xl px-4 py-3 outline-none text-white placeholder:text-slate-500 text-xs" />
              <button onClick={() => { 
                const phone = (document.getElementById('wa-phone') as HTMLInputElement).value;
                const message = encodeURIComponent(`¡Hola! Tenés un vale en Atenea por $${toastMessage.voucher.amount.toLocaleString()}. Código: ${toastMessage.voucher.code}`);
                window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
              }} className="w-full bg-green-600 py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"><Share2 className="w-4 h-4" /> ENVIAR POR WHATSAPP</button>
              <button onClick={() => setToastMessage(null)} className="text-slate-500 text-[9px] uppercase font-black tracking-widest">Cerrar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;