import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sale, Expense, InventoryItem, 
  AppConfig, Tab, MultiSaleData, InventoryFormData, 
  ExpenseFormData, EntryMode, Voucher, CartItem
} from './types';
import { supabase } from './lib/supabase';

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
import { PlusCircle, List, BarChart2, ShoppingBag, LogOut, ArrowUpCircle, ArrowDownCircle, Share2 } from 'lucide-react';
import { DEFAULT_PRODUCT_CATEGORIES, DEFAULT_CATEGORY_MAP, DEFAULT_MATERIALS } from './constants';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('form');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{msg: string, voucher?: any} | null>(null);

  const [entryMode, setEntryMode] = useState<EntryMode>('sale');
  const [historyMode, setHistoryMode] = useState<EntryMode>('sale');
  
  // --- PERSISTENCIA: Inicialización de estados desde LocalStorage ---
  const [saleDraft, setSaleDraft] = useState<MultiSaleData>(() => {
    const saved = localStorage.getItem('atenea_sale_draft');
    return saved ? JSON.parse(saved) : {
      date: new Date().toISOString().split('T')[0],
      items: [],
      payments: []
    };
  });

  const [expenseDraft, setExpenseDraft] = useState<ExpenseFormData>(() => {
    const saved = localStorage.getItem('atenea_expense_draft');
    return saved ? JSON.parse(saved) : {
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      category: 'Mercadería',
      hasInvoiceA: false,
      invoiceAmount: ''
    };
  });

  // Guardar automáticamente cuando cambien los borradores
  useEffect(() => {
    localStorage.setItem('atenea_sale_draft', JSON.stringify(saleDraft));
  }, [saleDraft]);

  useEffect(() => {
    localStorage.setItem('atenea_expense_draft', JSON.stringify(expenseDraft));
  }, [expenseDraft]);

  const [config, setConfig] = useState<AppConfig>({
    categories: DEFAULT_PRODUCT_CATEGORIES,
    subcategories: DEFAULT_CATEGORY_MAP,
    materials: DEFAULT_MATERIALS
  });

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

  const fetchData = useCallback(async () => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const [sRes, iRes, eRes, vRes] = await Promise.all([
        supabase.from('sales').select('*').order('date', { ascending: false }).order('client_number', { ascending: false }).limit(250),
        supabase.from('inventory').select('*').order('name'),
        supabase.from('expenses').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('vouchers').select('*').eq('status', 'active').order('created_at', { ascending: false })
      ]);
      if (sRes.data) setSales(sRes.data as any);
      if (iRes.data) setInventory(iRes.data as any);
      if (eRes.data) setExpenses(eRes.data as any);
      if (vRes.data) setVouchers(vRes.data as any);
    } catch (error) {
      showToast("Error al sincronizar datos");
    } finally {
      setIsSyncing(false);
    }
  }, [session]);

  useEffect(() => { if (session) fetchData(); }, [session, fetchData]);

  const showToast = (msg: string, voucher?: any) => {
    setToastMessage({ msg, voucher });
    if (!voucher) setTimeout(() => setToastMessage(null), 4000);
  };

  const sendVoucherByWA = (voucher: any, phone: string = '') => {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone && !cleanPhone.startsWith('54')) cleanPhone = '549' + cleanPhone.replace(/^0/, '').replace(/^15/, '');
    const message = encodeURIComponent(`¡Hola! Tenés un vale de crédito en *Atenea Finanzas* por *$${voucher.amount.toLocaleString()}*.\n🎫 Código: *${voucher.code}*\n📅 Vence el: ${new Date(voucher.expires_at).toLocaleDateString('es-AR')}`);
    window.open(cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`, '_blank');
    setToastMessage(null);
  };

  // --- GESTIÓN DE VENTAS ---
  const handleEditSaleRequest = (sale: Sale) => {
    const relatedItems = sales.filter(s => s.client_number === sale.client_number);
    setSaleDraft({
      date: sale.date,
      items: relatedItems.map(s => ({
        id: s.id, product: s.product_name.replace('(DEVOLUCIÓN) ', ''),
        quantity: s.quantity, listPrice: Number(s.list_price) || Number(s.price), finalPrice: Number(s.price),
        size: s.size || 'U', inventory_id: s.inventory_id, cost_price: Number(s.cost_price), isReturn: Number(s.price) < 0
      })),
      payments: sale.payment_details || [],
      isEdit: true,
      originalClientNumber: sale.client_number
    });
    setEntryMode('sale');
    setActiveTab('form');
  };

  const handleDeleteTransaction = async (clientNumber: string) => {
    if (!supabase || !window.confirm(`⚠️ ¿BORRAR VENTA ${clientNumber}?`)) return;
    setIsSyncing(true);
    try {
      const { data: items } = await (supabase.from('sales').select('*').eq('client_number', clientNumber) as any);
      if (items) {
        for (const item of items) {
          if (item.inventory_id && item.size) {
            const invItem = inventory.find(i => i.id === item.inventory_id);
            if (invItem) {
              const currentStock = invItem.sizes[item.size] || 0;
              const delta = Number(item.price) < 0 ? -item.quantity : item.quantity;
              await (supabase.from('inventory') as any).update({ sizes: { ...invItem.sizes, [item.size]: currentStock + delta } }).eq('id', invItem.id);
            }
          }
        }
      }
      await (supabase.from('sales') as any).delete().eq('client_number', clientNumber);
      showToast("✓ Venta eliminada");
      await fetchData();
    } finally { setIsSyncing(false); }
  };

  const handleNewMultiSale = async (data: MultiSaleData) => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const cartTotal = data.items.reduce((sum, i) => sum + (i.finalPrice * i.quantity), 0);
      const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);
      const isPending = totalPaid < cartTotal;
      let generatedVoucher = null;

      if (cartTotal < 0) {
        const code = `VALE-${data.date.replace(/-/g, '').slice(2)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        await (supabase.from('vouchers') as any).insert({ user_id: session.user.id, code, initial_amount: Math.abs(cartTotal), current_amount: Math.abs(cartTotal), status: 'active' });
        generatedVoucher = { code, amount: Math.abs(cartTotal), expires_at: new Date(Date.now() + 90*24*60*60*1000).toISOString() };
      }

      for (const p of data.payments) {
        if (p.method === 'Vale' && p.voucherCode) await (supabase.from('vouchers') as any).update({ status: 'used' }).eq('code', p.voucherCode);
      }

      const semanticId = data.isEdit ? data.originalClientNumber : `${data.items.some(i => i.isReturn) ? 'C' : (isPending ? 'S' : 'V')}${data.date.replace(/-/g, '').slice(2)}-${(sales.filter(s => s.date === data.date).length + 1).toString().padStart(3, '0')}`;

      if (data.isEdit) await (supabase.from('sales') as any).delete().eq('client_number', data.originalClientNumber);
      
      await (supabase.from('sales') as any).insert(data.items.map(item => ({
        date: data.date, client_number: semanticId, product_name: item.isReturn ? `(DEVOLUCIÓN) ${item.product}` : item.product,
        quantity: item.quantity, price: item.finalPrice, list_price: item.listPrice, cost_price: item.cost_price,
        payment_method: data.payments[0]?.method || 'Efectivo', payment_details: data.payments,
        status: isPending ? 'pending' : 'completed', expires_at: isPending ? new Date(Date.now() + 90*24*60*60*1000).toISOString() : null,
        size: item.size, inventory_id: item.inventory_id, user_id: session.user.id
      })));

      for (const item of data.items) {
        if (item.inventory_id && item.size) {
          const invItem = inventory.find(i => i.id === item.inventory_id);
          if (invItem) await (supabase.from('inventory') as any).update({ sizes: { ...invItem.sizes, [item.size]: (invItem.sizes[item.size] || 0) + (item.isReturn ? item.quantity : -item.quantity) } }).eq('id', invItem.id);
        }
      }
      
      showToast(data.isEdit ? "¡Actualizado!" : "¡Venta registrada!", generatedVoucher);
      setSaleDraft({ date: new Date().toISOString().split('T')[0], items: [], payments: [] });
      await fetchData(); 
    } finally { setIsSyncing(false); }
  };

  // --- GESTIÓN DE GASTOS ---
  const handleEditExpenseRequest = (expense: Expense) => {
    setExpenseDraft({
      id: expense.id,
      date: expense.date,
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      hasInvoiceA: expense.has_invoice_a,
      invoiceAmount: expense.has_invoice_a ? (expense.invoice_amount || 0).toString() : '',
      isEdit: true
    });
    setEntryMode('expense');
    setActiveTab('form');
  };

  const handleNewExpense = async (formData: ExpenseFormData) => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const totalAmount = parseFloat(formData.amount) || 0;
      const invAmount = parseFloat(formData.invoiceAmount) || 0;
      const payload: any = {
        date: formData.date, description: formData.description, amount: totalAmount, category: formData.category,
        has_invoice_a: formData.hasInvoiceA, invoice_amount: formData.hasInvoiceA ? invAmount : 0, 
      };

      if (formData.isEdit && formData.id) {
        const { error } = await (supabase.from('expenses') as any).update(payload).eq('id', formData.id);
        if (error) throw error;
        showToast('¡Gasto actualizado!');
      } else {
        payload.user_id = session.user.id;
        const { error } = await (supabase.from('expenses') as any).insert(payload);
        if (error) throw error;
        showToast('¡Gasto registrado!');
      }

      setExpenseDraft({ date: new Date().toISOString().split('T')[0], description: '', amount: '', category: 'Mercadería', hasInvoiceA: false, invoiceAmount: '' });
      await fetchData();
    } catch (err: any) {
      showToast(`Error al guardar: ${err.message}`);
    } finally { setIsSyncing(false); }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!supabase || !window.confirm('¿Borrar este gasto?')) return;
    const { error } = await (supabase.from('expenses') as any).delete().eq('id', id);
    if (!error) {
      showToast('✓ Gasto eliminado');
      await fetchData();
    }
  };

  const renderRecentActivity = () => {
    const list = entryMode === 'sale' ? sales.slice(0, 3) : expenses.slice(0, 3);
    if (list.length === 0) return null;
    return (
      <div className="mt-1 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
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

  if (loading) return <div className="flex h-screen items-center justify-center font-black text-primary animate-pulse text-xs tracking-widest">ATENEA...</div>;
  if (!session) return <LoginView onLogin={() => {}} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-800">
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20"><ShoppingBag className="w-4 h-4 text-white" /></div>
          <h1 className="font-bold text-lg tracking-tight italic">Atenea <span className="text-primary italic">Finanzas</span></h1>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="p-2 text-rose-400 active:scale-90 transition-transform"><LogOut className="w-5 h-5" /></button>
      </header>

      <main className="max-w-md mx-auto p-4">
        {activeTab === 'form' && (
          <div className="flex flex-col space-y-3">
            <div className="flex bg-slate-200 p-1 rounded-2xl">
              <button onClick={() => setEntryMode('sale')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all ${entryMode === 'sale' ? 'bg-white text-primary shadow-md scale-[1.02]' : 'text-slate-500'}`}><ArrowUpCircle className="w-4 h-4" /> INGRESO</button>
              <button onClick={() => setEntryMode('expense')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all ${entryMode === 'expense' ? 'bg-white text-rose-600 shadow-md scale-[1.02]' : 'text-slate-500'}`}><ArrowDownCircle className="w-4 h-4" /> EGRESO</button>
            </div>
            <div className="flex-1">
              {entryMode === 'sale' ? (
                <SalesForm 
                  onSubmit={handleNewMultiSale} 
                  inventory={inventory} 
                  vouchers={vouchers} 
                  initialData={saleDraft} 
                  onChange={setSaleDraft} // <--- NUEVA PROP PARA PERSISTENCIA
                  onCancelEdit={() => setSaleDraft({ date: new Date().toISOString().split('T')[0], items: [], payments: [] })} 
                  nextSaleNumber={sales.length + 1} 
                />
              ) : (
                <ExpenseForm 
                  formData={expenseDraft} 
                  onChange={setExpenseDraft} 
                  onSubmit={handleNewExpense} 
                  onCancelEdit={() => setExpenseDraft({ date: new Date().toISOString().split('T')[0], description: '', amount: '', category: 'Mercadería', hasInvoiceA: false, invoiceAmount: '' })} 
                />
              )}
            </div>
            {renderRecentActivity()}
          </div>
        )}

        {activeTab === 'list' && (
          <div className="flex flex-col space-y-4">
            <div className="flex bg-slate-200 p-1 rounded-2xl">
              <button onClick={() => setHistoryMode('sale')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest ${historyMode === 'sale' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>Ingresos</button>
              <button onClick={() => setHistoryMode('expense')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest ${historyMode === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500'}`}>Egresos</button>
            </div>
            {historyMode === 'sale' ? (
              <SalesList sales={sales} onDelete={handleDeleteTransaction} onEdit={handleEditSaleRequest} onReturn={() => {}} />
            ) : (
              <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} onEdit={handleEditExpenseRequest} />
            )}
          </div>
        )}

        {activeTab === 'inventory' && <InventoryView inventory={inventory} config={config} onAdd={() => fetchData()} onUpdate={() => fetchData()} onDelete={() => fetchData()} />}
        {activeTab === 'stats' && <StatsView sales={sales} expenses={expenses} inventory={inventory} />}
        {activeTab === 'settings' && <SettingsView config={config} onSaveConfig={setConfig} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 pb-safe pt-2 px-4 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center mb-2">
          <button onClick={() => setActiveTab('form')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'form' ? 'text-primary scale-110' : 'text-slate-400'}`}><PlusCircle className="w-6 h-6" /><span className="text-[9px] font-bold tracking-tighter uppercase">Ingresar</span></button>
          <button onClick={() => setActiveTab('list')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'list' ? 'text-primary scale-110' : 'text-slate-400'}`}><List className="w-6 h-6" /><span className="text-[9px] font-bold tracking-tighter uppercase">Movimientos</span></button>
          <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'inventory' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}><ShoppingBag className="w-6 h-6" /><span className="text-[9px] font-bold tracking-tighter uppercase">Stock</span></button>
          <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'stats' ? 'text-primary scale-110' : 'text-slate-400'}`}><BarChart2 className="w-6 h-6" /><span className="text-[9px] font-bold tracking-tighter uppercase">Reporte</span></button>
        </div>
      </nav>

      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white p-5 rounded-3xl shadow-2xl z-[60] text-sm font-bold animate-in zoom-in min-w-[300px]">
          <p className="text-center mb-4">{toastMessage.msg}</p>
          {toastMessage.voucher && (
            <div className="space-y-3 pt-4 border-t border-slate-700">
              <div className="bg-slate-900/50 p-3 rounded-2xl text-center font-mono text-primary uppercase tracking-widest border border-primary/20 text-lg">{toastMessage.voucher.code}</div>
              <div className="flex flex-col gap-2">
                <input id="wa-phone" type="text" placeholder="Celular (ej: 1112345678)" className="bg-slate-700 border-none rounded-2xl text-xs px-4 py-3 outline-none focus:ring-2 ring-primary transition-all" />
                <button onClick={() => { const phone = (document.getElementById('wa-phone') as HTMLInputElement).value; sendVoucherByWA(toastMessage.voucher, phone); }} className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-lg"><Share2 className="w-5 h-5" /> ENVIAR POR WHATSAPP</button>
                <button onClick={() => setToastMessage(null)} className="text-slate-500 text-[10px] py-2 uppercase font-black tracking-widest">Cerrar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;