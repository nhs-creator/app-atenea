import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Sale, Expense, InventoryItem, Voucher, 
  MultiSaleData, ExpenseFormData, InventoryFormData 
} from '../types';

export function useAtenea(session: any) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const [sRes, iRes, eRes, vRes] = await Promise.all([
        supabase.from('sales').select('*').order('date', { ascending: false }).order('client_number', { ascending: false }).limit(1000),
        supabase.from('inventory').select('*').order('name'),
        supabase.from('expenses').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('vouchers').select('*').eq('status', 'active').order('created_at', { ascending: false })
      ]);
      if (sRes.data) setSales(sRes.data as any);
      if (iRes.data) setInventory(iRes.data as any);
      if (eRes.data) setExpenses(eRes.data as any);
      if (vRes.data) setVouchers(vRes.data as any);
    } catch (error) {
      console.error("Error syncing:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [session]);

  useEffect(() => { if (session) fetchData(); }, [session, fetchData]);

  const saveMultiSale = async (data: MultiSaleData) => {
    if (!session || !supabase) return null;
    setIsSyncing(true);
    try {
      const cartTotal = data.items.reduce((sum, i) => sum + (i.finalPrice * i.quantity), 0);
      const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);
      
      const roundingDiff = totalPaid - cartTotal;
      const finalItemsToSave = [...data.items];

      if (Math.abs(roundingDiff) > 0 && Math.abs(roundingDiff) < 1000) {
        finalItemsToSave.push({
          id: 'rounding-adjustment',
          product: '💰 AJUSTE POR REDONDEO',
          quantity: 1,
          listPrice: 0,
          finalPrice: roundingDiff,
          size: 'U',
          cost_price: 0
        });
      }

      const isPending = (totalPaid < (cartTotal + roundingDiff)) && !data.forceCompleted;
      
      let generatedVoucher = null;
      if (totalPaid < 0 || (cartTotal + roundingDiff) < 0) {
        const code = `VALE-${data.date.replace(/-/g, '').slice(2)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        await (supabase.from('vouchers') as any).insert({ user_id: session.user.id, code, initial_amount: Math.abs(totalPaid), current_amount: Math.abs(totalPaid), status: 'active' });
        generatedVoucher = { code, amount: Math.abs(totalPaid), expires_at: new Date(Date.now() + 90*24*60*60*1000).toISOString() };
      }

      for (const p of data.payments) {
        if (p.method === 'Vale' && p.voucherCode) await (supabase.from('vouchers') as any).update({ status: 'used' }).eq('code', p.voucherCode);
      }

      const semanticId = data.isEdit ? data.originalClientNumber : 
        `${data.items.some(i => i.isReturn) ? 'C' : (isPending ? 'S' : 'V')}${data.date.replace(/-/g, '').slice(2)}-${(sales.filter(s => s.date === data.date).length + 1).toString().padStart(3, '0')}`;

      if (data.isEdit) await (supabase.from('sales') as any).delete().eq('client_number', data.originalClientNumber);
      
      await (supabase.from('sales') as any).insert(finalItemsToSave.map(item => ({
        date: data.date, client_number: semanticId, 
        product_name: item.isReturn ? `(DEVOLUCIÓN) ${item.product}` : item.product,
        quantity: item.quantity, price: item.finalPrice, list_price: item.listPrice, cost_price: item.cost_price,
        payment_method: data.payments[0]?.method || 'Efectivo', payment_details: data.payments,
        status: isPending ? 'pending' : 'completed', 
        expires_at: isPending ? new Date(Date.now() + 90*24*60*60*1000).toISOString() : null,
        size: item.size, inventory_id: item.inventory_id, user_id: session.user.id
      })));

      for (const item of data.items) {
        if (item.inventory_id && item.size) {
          const invItem = inventory.find(i => i.id === item.inventory_id);
          if (invItem) {
            await (supabase.from('inventory') as any).update({ 
              sizes: { ...invItem.sizes, [item.size]: (invItem.sizes[item.size] || 0) + (item.isReturn ? item.quantity : -item.quantity) } 
            }).eq('id', invItem.id);
          }
        }
      }
      
      await fetchData();
      return { success: true, voucher: generatedVoucher };
    } catch (error) {
      console.error(error);
      return { success: false, error };
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteTransaction = async (clientNumber: string) => {
    if (!supabase) return;
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
      await fetchData();
    } finally { setIsSyncing(false); }
  };

  const saveExpense = async (formData: ExpenseFormData) => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const payload: any = {
        date: formData.date, 
        description: formData.description, 
        amount: parseFloat(formData.amount) || 0, 
        category: formData.category,
        type: formData.type, // 'business' | 'personal'
        has_invoice_a: formData.hasInvoiceA, 
        invoice_amount: formData.hasInvoiceA ? (parseFloat(formData.invoiceAmount) || 0) : 0, 
      };

      if (formData.isEdit && formData.id) {
        await (supabase.from('expenses') as any).update(payload).eq('id', formData.id);
      } else {
        payload.user_id = session.user.id;
        await (supabase.from('expenses') as any).insert(payload);
      }
      
      await fetchData();
      return { success: true };
    } catch (error) { 
      console.error("Error saving expense:", error);
      return { success: false, error }; 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const deleteExpense = async (id: string) => {
    if (!supabase || !window.confirm('¿Borrar este gasto?')) return;
    setIsSyncing(true);
    try { 
      await (supabase.from('expenses') as any).delete().eq('id', id); 
      await fetchData(); 
      return { success: true }; 
    } catch (error) { 
      return { success: false, error }; 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const addInventory = async (data: InventoryFormData) => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const sizesNum: Record<string, number> = {};
      Object.entries(data.sizes || {}).forEach(([s, q]) => {
        sizesNum[s] = typeof q === 'string' ? parseInt(q, 10) || 0 : (q || 0);
      });
      const payload = {
        user_id: session.user.id,
        name: data.name.trim(),
        category: data.category,
        subcategory: data.subcategory || null,
        material: data.material || null,
        cost_price: parseFloat(data.costPrice) || 0,
        selling_price: parseFloat(data.sellingPrice) || 0,
        sizes: sizesNum,
      };
      await (supabase.from('inventory') as any).insert(payload);
      await fetchData();
      return { success: true };
    } catch (error) {
      console.error('Error adding inventory:', error);
      return { success: false, error };
    } finally {
      setIsSyncing(false);
    }
  };

  const updateInventory = async (item: Partial<InventoryItem> & { id: string }) => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const payload: Record<string, unknown> = {
        name: item.name,
        category: item.category,
        subcategory: item.subcategory || null,
        material: item.material || null,
        cost_price: item.cost_price,
        selling_price: item.selling_price,
        sizes: item.sizes,
        last_updated: new Date().toISOString(),
      };
      await (supabase.from('inventory') as any).update(payload).eq('id', item.id).eq('user_id', session.user.id);
      await fetchData();
      return { success: true };
    } catch (error) {
      console.error('Error updating inventory:', error);
      return { success: false, error };
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteInventory = async (id: string) => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      await (supabase.from('inventory') as any).delete().eq('id', id);
      await fetchData();
      return { success: true };
    } catch (error) {
      console.error('Error deleting inventory:', error);
      return { success: false, error };
    } finally {
      setIsSyncing(false);
    }
  };

  return { sales, expenses, inventory, vouchers, isSyncing, saveMultiSale, deleteTransaction, saveExpense, deleteExpense, fetchData, addInventory, updateInventory, deleteInventory };
}