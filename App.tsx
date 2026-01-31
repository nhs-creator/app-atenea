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
  ArrowUpCircle, ArrowDownCircle, Share2, CheckCircle2, Package
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
  const [userRole, setUserRole] = useState<'owner' | 'accountant' | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('form');
  const [entryMode, setEntryMode] = useState<EntryMode>('sale');
  const [historyMode, setHistoryMode] = useState<EntryMode>('sale');
  const [toastMessage, setToastMessage] = useState<{msg: string, voucher?: any} | null>(null);

  // 1. Persistencia Global
  const [saleDraft, setSaleDraft] = useLocalStorage<MultiSaleData>('atenea_sale_draft', {
    date: getTodayAR(), items: [], payments: [], productDraft: initialProductDraft
  });
  const [expenseDraft, setExpenseDraft] = useLocalStorage<ExpenseFormData>('atenea_expense_draft', {
    date: getTodayAR(), description: '', amount: '', category: 'Mercadería', hasInvoiceA: false, invoiceAmount: ''
  });
  const [config, setConfig] = useLocalStorage('atenea_config', {
    categories: DEFAULT_PRODUCT_CATEGORIES, subcategories: DEFAULT_CATEGORY_MAP, materials: DEFAULT_MATERIALS
  });

  // 2. Cerebro de la App
  const atenea = useAtenea(session);

  // 3. Manejo de Sesión Reactivo
  useEffect(() => {
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    const loadProfile = async (userId: string) => {
      try {
        const { data: profile, error } = await (supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single() as any);
        
        if (profile && !error) {
          const role = profile.role as 'owner' | 'accountant';
          setUserRole(role);
          if (role === 'accountant') {
            setActiveTab('stats');
            setHistoryMode('expense');
          }
        }
      } catch (err) {
        setUserRole('owner');
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      clearTimeout(safetyTimer);
      setLoading(false);

      if (currentSession) {
        loadProfile(currentSession.user.id);
      } else {
        setUserRole(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) {
        setSession(s);
        setLoading(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const showToast = (msg: string, voucher?: any) => {
    setToastMessage({ msg, voucher });
    if (!voucher) setTimeout(() => setToastMessage(null), 1000);
  };

  const sendVoucherByWA = (voucher: any, phone: string = '') => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone && !cleanPhone.startsWith('54')) cleanPhone = '549' + cleanPhone.replace(/^0/, '').replace(/^15/, '');
    const message = encodeURIComponent(`¡Hola! Tenés un vale de crédito en *Atenea Finanzas* por *$${voucher.amount.toLocaleString()}*.\n🎫 Código: *${voucher.code}*\n📅 Vence el: ${new Date(voucher.expires_at).toLocaleDateString('es-AR')}`);
    window.open(cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`, '_blank');
    setToastMessage(null);
  };

  const handleNewSale = async (data: MultiSaleData) => {
    if (userRole !== 'owner') return;
    const res = await atenea.saveMultiSale(data);
    if (res?.success) {
      showToast(data.isEdit ? "¡Actualizado!" : "¡Venta registrada!", res.voucher);
      setSaleDraft({ date: getTodayAR(), items: [], payments: [], productDraft: initialProductDraft });
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
  };

  const handleNewExpense = async (data: ExpenseFormData) => {
    const res = await atenea.saveExpense(data);
    if (res?.success) {
      showToast(data.isEdit ? "¡Gasto actualizado!" : "¡Gasto registrado!");
      setExpenseDraft({ date: getTodayAR(), description: '', amount: '', category: 'Mercadería', hasInvoiceA: false, invoiceAmount: '' });
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
  };

  const handleEditSale = (sale: Sale) => {
    if (userRole !== 'owner') return;
    const related = atenea.sales.filter((s: Sale) => s.client_number === sale.client_number);
    setSaleDraft({
      date: sale.date,
      items: related.map((s: Sale) => ({
        id: s.id, product: s.product_name.replace('(DEVOLUCIÓN) ', ''),
        quantity: s.quantity, listPrice: Number(s.list_price) || Number(s.price), finalPrice: Number(s.price),
        size: s.size || 'U', inventory_id: s.inventory_id, cost_price: Number(s.cost_price), isReturn: Number(s.price) < 0
      })),
      payments: sale.payment_details || [], isEdit: true, originalClientNumber: sale.client_number,
      productDraft: initialProductDraft 
    });
    setEntryMode('sale');
    setActiveTab('form');
  };

  const handleEditExpense = (expense: Expense) => {
    if (userRole !== 'owner') return; 
    setExpenseDraft({
      id: expense.id, date: expense.date, description: expense.description, amount: expense.amount.toString(),
      category: expense.category, hasInvoiceA: expense.has_invoice_a, invoiceAmount: (expense.invoice_amount || 0).toString(), isEdit: true
    });
    setEntryMode('expense');
    setActiveTab('form');
  };

  const renderRecentActivity = () => {
    const list = entryMode === 'sale' ? atenea.sales.slice(0, 3) : atenea.expenses.slice(0, 3);
    if (list.length === 0) return null;
    return (
      <div className="mt-4 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Últimos Movimientos</h3>
        {list.map((item: any) => (
          <div key={item.id} className="bg-white p-2.5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
            <div className="min-w-0">
              <p className="font-bold text-xs text-slate-700 truncate uppercase">{item.product_name || item.description}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase">{item.client_number || item.category}</p>
            </div>
            <p className={`font-black text-sm ml-2 ${entryMode === 'sale' ? (Number(item.price) < 0 ? 'text-indigo-600' : 'text-primary') : 'text-rose-500'}`}>
              {entryMode === 'sale' ? '' : '-'}${Math.abs(Number(item.price || item.amount)).toLocaleString('es-AR')}
            </p>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center bg-slate-50 gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <div className="font-black text-primary animate-pulse text-xs tracking-widest uppercase">ATENEA...</div>
    </div>
  );

  if (!session) return <LoginView onLogin={() => {}} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-800">
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20"><ShoppingBag className="w-4 h-4 text-white" /></div>
          <h1 className="font-bold text-lg italic">Atenea <span className="text-primary italic">Finanzas</span></h1>
        </div>
        <div className="flex items-center gap-3">
          {userRole === 'accountant' && <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg uppercase tracking-tighter">Contador</span>}
          <button onClick={() => supabase.auth.signOut()} className="p-2 text-rose-400 active:scale-90 transition-all"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {activeTab === 'form' && (
          <div className="flex flex-col space-y-3">
            <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
              {userRole === 'owner' && (
                <button onClick={() => setEntryMode('sale')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all ${entryMode === 'sale' ? 'bg-white text-primary shadow-md scale-[1.02]' : 'text-slate-500'}`}><ArrowUpCircle className="w-4 h-4" /> INGRESO</button>
              )}
              <button onClick={() => setEntryMode('expense')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all ${entryMode === 'expense' || userRole === 'accountant' ? 'bg-white text-rose-600 shadow-md scale-[1.02]' : 'text-slate-500'}`}><ArrowDownCircle className="w-4 h-4" /> EGRESO</button>
            </div>
            
            <div className="flex-1">
              {entryMode === 'sale' && userRole === 'owner' ? (
                <SalesForm onSubmit={handleNewSale} inventory={atenea.inventory} vouchers={atenea.vouchers} initialData={saleDraft} onChange={setSaleDraft} onCancelEdit={() => setSaleDraft({ date: getTodayAR(), items: [], payments: [], productDraft: initialProductDraft })} nextSaleNumber={atenea.sales.length + 1} />
              ) : (
                <ExpenseForm formData={expenseDraft} onChange={setExpenseDraft} onSubmit={handleNewExpense} onCancelEdit={() => setExpenseDraft({ date: getTodayAR(), description: '', amount: '', category: 'Mercadería', hasInvoiceA: false, invoiceAmount: '', isEdit: false })} />
              )}
            </div>
            {renderRecentActivity()}
          </div>
        )}

        {activeTab === 'list' && (
          <div className="flex flex-col space-y-4">
            <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
              <button onClick={() => setHistoryMode('sale')} className={`flex-1 py-2.5 rounded-xl font-black text-[10px] transition-all uppercase ${historyMode === 'sale' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>Ingresos</button>
              <button onClick={() => setHistoryMode('expense')} className={`flex-1 py-2.5 rounded-xl font-black text-[10px] transition-all uppercase ${historyMode === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500'}`}>Egresos</button>
            </div>
            {historyMode === 'sale' ? (
              <SalesList 
                sales={atenea.sales} 
                onDelete={userRole === 'owner' ? atenea.deleteTransaction : undefined} // BLOQUEADO PARA CONTADOR
                onEdit={userRole === 'owner' ? handleEditSale : undefined} // BLOQUEADO PARA CONTADOR
                onReturn={() => {}} 
              />
            ) : (
              <ExpenseList 
                expenses={atenea.expenses} 
                onDelete={userRole === 'owner' ? atenea.deleteExpense : undefined} // BLOQUEADO PARA CONTADOR
                onEdit={userRole === 'owner' ? handleEditExpense : undefined} // BLOQUEADO PARA CONTADOR
              />
            )}
          </div>
        )}

        {activeTab === 'inventory' && userRole === 'owner' && <InventoryView inventory={atenea.inventory} config={config} onAdd={atenea.fetchData} onUpdate={atenea.fetchData} onDelete={atenea.fetchData} />}
        
        {activeTab === 'stats' && <StatsView sales={atenea.sales} expenses={atenea.expenses} inventory={atenea.inventory} />}
        
        {activeTab === 'settings' && userRole === 'owner' && <SettingsView config={config} onSaveConfig={setConfig} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 pb-safe pt-2 px-4 z-50 shadow-lg">
        <div className="max-w-md mx-auto flex justify-between items-center mb-2">
          {userRole === 'owner' ? (
            <>
              <button onClick={() => setActiveTab('form')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'form' ? 'text-primary scale-110' : 'text-slate-400'}`}><PlusCircle /><span className="text-[9px] font-bold uppercase">Ingresar</span></button>
              <button onClick={() => setActiveTab('list')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'list' ? 'text-primary scale-110' : 'text-slate-400'}`}><List /><span className="text-[9px] font-bold uppercase">Ventas</span></button>
              <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'inventory' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}><Package /><span className="text-[9px] font-bold uppercase">Stock</span></button>
            </>
          ) : (
            <button onClick={() => setActiveTab('list')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'list' ? 'text-primary scale-110' : 'text-slate-400'}`}><List /><span className="text-[9px] font-bold uppercase tracking-tighter">Movimientos</span></button>
          )}
          
          <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'stats' ? 'text-primary scale-110' : 'text-slate-400'}`}><BarChart2 /><span className="text-[9px] font-bold uppercase">Reporte</span></button>
        </div>
      </nav>

      {/* Toasts... */}
    </div>
  );
};

export default App;