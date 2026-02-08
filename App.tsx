import React, { useState, useEffect, useMemo } from 'react';
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
import ClientsView from './components/ClientsView';
import LoginView from './components/LoginView';

// Iconos
import { 
  PlusCircle, List, BarChart2, ShoppingBag, LogOut, 
  ArrowUpCircle, ArrowDownCircle, Package, Receipt, Settings, Users
} from 'lucide-react';
import { 
  DEFAULT_PRODUCT_CATEGORIES, DEFAULT_CATEGORY_MAP, DEFAULT_MATERIALS,
  DEFAULT_SIZE_SYSTEMS, DEFAULT_CATEGORY_SIZE_MAP,
  BUSINESS_CATEGORIES, PERSONAL_CATEGORIES
} from './constants';

const getTodayAR = () => {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
};

const initialProductDraft: ProductDraft = {
  name: '', price: '', quantity: '1', size: '', inventoryId: ''
};

const initialSaleDraft: MultiSaleData = {
  date: getTodayAR(), 
  items: [], 
  payments: [], 
  productDraft: initialProductDraft,
  clientId: '',
  clientDraft: undefined,
  sendWhatsApp: true
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<'owner' | 'accountant' | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('form');
  const [historyMode, setHistoryMode] = useState<EntryMode>('sale');
  const [toastMessage, setToastMessage] = useState<{msg: string, voucher?: any} | null>(null);

  // 1. Persistencia Global
  const [saleDraft, setSaleDraft] = useLocalStorage<MultiSaleData>('atenea_sale_draft', initialSaleDraft);

  const [expenseDraft, setExpenseDraft] = useLocalStorage<ExpenseFormData>('atenea_expense_draft', {
    date: getTodayAR(), 
    description: '', 
    amount: '', 
    category: BUSINESS_CATEGORIES[0].id, 
    hasInvoiceA: false, 
    invoiceAmount: '',
    type: 'business'
  });

  const [config, setConfig] = useLocalStorage('atenea_config', {
    categories: DEFAULT_PRODUCT_CATEGORIES,
    subcategories: DEFAULT_CATEGORY_MAP,
    materials: DEFAULT_MATERIALS,
    sizeSystems: DEFAULT_SIZE_SYSTEMS,
    categorySizeMap: DEFAULT_CATEGORY_SIZE_MAP
  });

  // 2. Cerebro de la App
  const atenea = useAtenea(session);

  // --- LÓGICA DE CORRECCIÓN: Sincronizar pago con total al aplicar 10% ---
  useEffect(() => {
    if (saleDraft.items.length > 0 && saleDraft.payments.length === 1) {
      let currentTotal = 0;
      saleDraft.items.forEach(item => {
        let price = item.listPrice;
        const hasDiscount = saleDraft.payments[0].appliedToItems?.includes(item.id);
        if (hasDiscount && saleDraft.payments[0].method === 'Efectivo') {
          price = Math.round(price * 0.9);
        }
        currentTotal += price * item.quantity;
      });

      if (saleDraft.payments[0].amount !== currentTotal) {
        const newPayments = [{ ...saleDraft.payments[0], amount: currentTotal }];
        setSaleDraft({ ...saleDraft, payments: newPayments });
      }
    }
  }, [saleDraft.items, JSON.stringify(saleDraft.payments)]);

  // 3. Manejo de Sesión
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
    if (!voucher) setTimeout(() => setToastMessage(null), 1500);
  };

  const handleNewSale = async (data: MultiSaleData) => {
    if (userRole !== 'owner') return;
    const res = await atenea.saveMultiSale(data);
    if (res?.success) {
      if (data.sendWhatsApp) {
        const client = data.clientId 
          ? atenea.clients.find(c => c.id === data.clientId)
          : { name: data.clientDraft?.name, phone: data.clientDraft?.phone };

        if (client?.phone) {
          const subtotalLista = data.items.reduce((sum, i) => sum + (i.listPrice * i.quantity), 0);
          const total = data.items.reduce((sum, i) => sum + (i.finalPrice * i.quantity), 0);
          const ahorro = subtotalLista - total;

          // Unicode Escapes para Emojis (Bulletproof)
          const sparkles = "\u2728";
          const gift = "\uD83C\uDF81";
          const shoppingBag = "\uD83D\uDECD\uFE0F";

          let message = `*TICKET ATENEA - ${res.client_number}*\n\n`;
          message += `Hola ${client.name}! Gracias por tu compra. ${sparkles}\n\n`;
          message += `*Detalle de productos:*\n`;
          message += data.items.map(i => `- ${i.quantity}x ${i.product} (${i.size}): $${(i.finalPrice * i.quantity).toLocaleString('es-AR')}`).join('\n') + `\n\n`;
          
          if (ahorro > 0) {
            message += `${gift} *Ahorro aplicado:* -$${ahorro.toLocaleString('es-AR')}\n\n`;
          }
          
          message += `*TOTAL: $${total.toLocaleString('es-AR')}*\n\n`;
          
          if (data.payments.length > 0) {
            message += `*Medios de pago:*\n`;
            message += data.payments.map(p => `- ${p.method}: $${p.amount.toLocaleString('es-AR')}`).join('\n') + `\n\n`;
          }
          
          message += `¡Te esperamos pronto! ${shoppingBag}`;
          
          const waUrl = `https://api.whatsapp.com/send/?phone=${client.phone.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
          window.open(waUrl, '_blank');
        }
      }

      showToast(data.isEdit ? "¡Actualizado!" : "¡Venta registrada!", res.voucher);
      setSaleDraft(initialSaleDraft);
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
  };

  const handleNewExpense = async (data: ExpenseFormData) => {
    const res = await atenea.saveExpense(data);
    if (res?.success) {
      showToast(data.isEdit ? "¡Gasto actualizado!" : "¡Gasto registrado!");
      setExpenseDraft({ 
        date: getTodayAR(), 
        description: '', 
        amount: '', 
        category: data.type === 'business' ? BUSINESS_CATEGORIES[0].id : PERSONAL_CATEGORIES[0].id, 
        hasInvoiceA: false, 
        invoiceAmount: '',
        type: data.type
      });
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
      productDraft: initialProductDraft,
      clientId: sale.client_id || '',
      sendWhatsApp: false
    });
    setActiveTab('form');
  };

  const handleEditExpense = (expense: Expense) => {
    if (userRole !== 'owner') return; 
    setExpenseDraft({
      id: expense.id, 
      date: expense.date, 
      description: expense.description, 
      amount: expense.amount.toString(),
      category: expense.category, 
      hasInvoiceA: expense.has_invoice_a, 
      invoiceAmount: (expense.invoice_amount || 0).toString(), 
      type: expense.type || 'business',
      isEdit: true
    });
    setActiveTab('expenses');
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
        <div className="flex items-center gap-2">
          {userRole === 'accountant' && <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg uppercase tracking-tighter">Contador</span>}
          {userRole === 'owner' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setActiveTab('customers')} className={`p-2 rounded-lg transition-all ${activeTab === 'customers' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:text-emerald-600 active:scale-90'}`} aria-label="Clientas">
                <Users className="w-5 h-5" />
              </button>
              <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-primary active:scale-90'}`} aria-label="Configuración">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          )}
          <button onClick={() => supabase.auth.signOut()} className="p-2 text-rose-400 hover:text-rose-600 active:scale-90 transition-all"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {activeTab === 'form' && userRole === 'owner' && (
          <div className="animate-in fade-in duration-500">
            <SalesForm 
              onSubmit={handleNewSale} 
              inventory={atenea.inventory} 
              vouchers={atenea.vouchers}
              clients={atenea.clients}
              initialData={saleDraft} 
              onChange={setSaleDraft} 
              onCancelEdit={() => setSaleDraft(initialSaleDraft)} 
              nextSaleNumber={atenea.sales.length + 1} 
            />
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="flex flex-col space-y-4 animate-in fade-in duration-500">
            <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
              <button onClick={() => setExpenseDraft({...expenseDraft, type: 'business', category: BUSINESS_CATEGORIES[0].id})} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all ${expenseDraft.type === 'business' ? 'bg-white text-rose-600 shadow-md scale-[1.02]' : 'text-slate-500'}`}>
                <ShoppingBag className="w-4 h-4" /> NEGOCIO
              </button>
              <button onClick={() => setExpenseDraft({...expenseDraft, type: 'personal', category: PERSONAL_CATEGORIES[0].id})} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all ${expenseDraft.type === 'personal' ? 'bg-white text-pink-600 shadow-md scale-[1.02]' : 'text-slate-500'}`}>
                <PlusCircle className="w-4 h-4" /> PERSONAL
              </button>
            </div>
            <ExpenseForm formData={expenseDraft} onChange={setExpenseDraft} onSubmit={handleNewExpense} onCancelEdit={() => setExpenseDraft({ date: getTodayAR(), description: '', amount: '', category: expenseDraft.type === 'business' ? BUSINESS_CATEGORIES[0].id : PERSONAL_CATEGORIES[0].id, hasInvoiceA: false, invoiceAmount: '', type: expenseDraft.type, isEdit: false })} />
          </div>
        )}

        {activeTab === 'list' && (
          <div className="flex flex-col space-y-4 animate-in fade-in duration-500">
            <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
              <button onClick={() => setHistoryMode('sale')} className={`flex-1 py-2.5 rounded-xl font-black text-[10px] transition-all uppercase ${historyMode === 'sale' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>Ingresos</button>
              <button onClick={() => setHistoryMode('expense')} className={`flex-1 py-2.5 rounded-xl font-black text-[10px] transition-all uppercase ${historyMode === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500'}`}>Egresos</button>
            </div>
            {historyMode === 'sale' ? (
              <SalesList sales={atenea.sales} onDelete={userRole === 'owner' ? atenea.deleteTransaction : undefined} onEdit={userRole === 'owner' ? handleEditSale : undefined} onReturn={() => {}} />
            ) : (
              <ExpenseList expenses={atenea.expenses} onDelete={userRole === 'owner' ? atenea.deleteExpense : undefined} onEdit={userRole === 'owner' ? handleEditExpense : undefined} />
            )}
          </div>
        )}

        {activeTab === 'inventory' && userRole === 'owner' && <InventoryView inventory={atenea.inventory} config={config} onAdd={atenea.addInventory} onUpdate={atenea.updateInventory} onDelete={atenea.deleteInventory} />}
        {activeTab === 'customers' && userRole === 'owner' && <ClientsView clients={atenea.clients} onAdd={atenea.saveClient} onUpdate={atenea.saveClient} onDelete={atenea.deleteClient} />}
        {activeTab === 'stats' && <StatsView sales={atenea.sales} expenses={atenea.expenses} inventory={atenea.inventory} />}
        {activeTab === 'settings' && userRole === 'owner' && <SettingsView config={config} onSaveConfig={setConfig} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 pb-safe pt-2 px-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto flex justify-between items-center mb-2">
          {userRole === 'owner' ? (
            <>
              <button onClick={() => setActiveTab('form')} className={`flex flex-col items-center gap-1 w-16 transition-all ${activeTab === 'form' ? 'text-primary scale-110' : 'text-slate-400'}`}>
                <ArrowUpCircle className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Ingresos</span>
              </button>
              <button onClick={() => setActiveTab('expenses')} className={`flex flex-col items-center gap-1 w-16 transition-all ${activeTab === 'expenses' ? 'text-rose-500 scale-110' : 'text-slate-400'}`}>
                <ArrowDownCircle className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Gastos</span>
              </button>
              <button onClick={() => setActiveTab('list')} className={`flex flex-col items-center gap-1 w-16 transition-all ${activeTab === 'list' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
                <Receipt className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Historial</span>
              </button>
              <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 w-16 transition-all ${activeTab === 'inventory' ? 'text-orange-500 scale-110' : 'text-slate-400'}`}>
                <Package className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Stock</span>
              </button>
              <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 w-16 transition-all ${activeTab === 'stats' ? 'text-slate-800 scale-110' : 'text-slate-400'}`}>
                <BarChart2 className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Reporte</span>
              </button>
            </>
          ) : (
            <button onClick={() => setActiveTab('list')} className={`flex flex-col items-center gap-1 w-full transition-all ${activeTab === 'list' ? 'text-primary scale-110' : 'text-slate-400'}`}>
              <List />
              <span className="text-[10px] font-bold uppercase tracking-widest">Movimientos</span>
            </button>
          )}
        </div>
      </nav>

      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">{toastMessage.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;