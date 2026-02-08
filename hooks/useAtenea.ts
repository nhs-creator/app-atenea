import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Sale, Expense, InventoryItem, Voucher, Client,
  MultiSaleData, ExpenseFormData, InventoryFormData 
} from '../types';

export function useAtenea(session: any) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const [sRes, iRes, eRes, vRes, cRes] = await Promise.all([
        supabase.from('sales').select('*').order('date', { ascending: false }).order('client_number', { ascending: false }).limit(1000),
        supabase.from('inventory').select('*').order('name'),
        supabase.from('expenses').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('vouchers').select('*').eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('name')
      ]);
      
      if (sRes.data) setSales(sRes.data as any);
      if (iRes.data) setInventory(iRes.data as any);
      if (eRes.data) setExpenses(eRes.data as any);
      if (vRes.data) setVouchers(vRes.data as any);
      if (cRes.data) setClients(cRes.data as any);
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
      // 1. Manejo de Cliente (Crear si es nuevo)
      let finalClientId = data.clientId;
      if (data.clientDraft && !finalClientId) {
        const { data: newClient, error: clientErr } = await (supabase.from('clients') as any)
          .insert({
            user_id: session.user.id,
            name: data.clientDraft.name.toUpperCase(),
            last_name: data.clientDraft.lastName.toUpperCase(),
            phone: data.clientDraft.phone,
            email: data.clientDraft.email?.toLowerCase() || null
          })
          .select()
          .single();
        
        if (clientErr) throw clientErr;
        if (newClient) finalClientId = newClient.id;
      }

      // 2. Cálculos y Ajustes de Venta
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
      
      // 3. Generación de Vale si el saldo es negativo
      let generatedVoucher = null;
      if (totalPaid < 0 || (cartTotal + roundingDiff) < 0) {
        const code = `VALE-${data.date.replace(/-/g, '').slice(2)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        await (supabase.from('vouchers') as any).insert({ 
          user_id: session.user.id, 
          code, 
          initial_amount: Math.abs(totalPaid), 
          current_amount: Math.abs(totalPaid), 
          status: 'active' 
        });
        generatedVoucher = { 
          code, 
          amount: Math.abs(totalPaid), 
          expires_at: new Date(Date.now() + 90*24*60*60*1000).toISOString() 
        };
      }

      // 4. Marcar vales usados
      for (const p of data.payments) {
        if (p.method === 'Vale' && p.voucherCode) {
          await (supabase.from('vouchers') as any).update({ status: 'used' }).eq('code', p.voucherCode);
        }
      }

      // 5. Generación de ID Semántico (CORREGIDO para evitar saltos)
      let semanticId = data.originalClientNumber;
      if (!data.isEdit) {
        const prefix = data.items.some(i => i.isReturn) ? 'C' : (isPending ? 'S' : 'V');
        const datePart = data.date.replace(/-/g, '').slice(2);
        
        // Obtenemos cuántas VENTAS ÚNICAS hubo hoy
        const todaySales = sales.filter(s => s.date === data.date);
        const uniqueGroups = new Set(todaySales.map(s => s.client_number));
        const nextNum = uniqueGroups.size + 1;
        
        semanticId = `${prefix}${datePart}-${nextNum.toString().padStart(3, '0')}`;
      }

      // 6. Guardado de Items de Venta
      if (data.isEdit) {
        await (supabase.from('sales') as any).delete().eq('client_number', data.originalClientNumber);
      }
      
      const { error: saveErr } = await (supabase.from('sales') as any).insert(finalItemsToSave.map(item => ({
        date: data.date, 
        client_number: semanticId, 
        product_name: item.isReturn ? `(DEVOLUCIÓN) ${item.product}` : item.product,
        quantity: item.quantity, 
        price: item.finalPrice, 
        list_price: item.listPrice, 
        cost_price: item.cost_price,
        payment_method: data.payments[0]?.method || 'Efectivo', 
        payment_details: data.payments,
        status: isPending ? 'pending' : 'completed', 
        expires_at: isPending ? new Date(Date.now() + 90*24*60*60*1000).toISOString() : null,
        size: item.size, 
        inventory_id: item.inventory_id, 
        client_id: finalClientId, // Vínculo con la nueva tabla
        user_id: session.user.id
      })));

      if (saveErr) throw saveErr;

      // 7. Actualización de Stock
      for (const item of data.items) {
        if (item.inventory_id && item.size) {
          const invItem = inventory.find(i => i.id === item.inventory_id);
          if (invItem) {
            const currentStock = invItem.sizes[item.size] || 0;
            const newQty = item.isReturn ? currentStock + item.quantity : currentStock - item.quantity;
            await (supabase.from('inventory') as any).update({ 
              sizes: { ...invItem.sizes, [item.size]: newQty } 
            }).eq('id', invItem.id);
          }
        }
      }
      
      await fetchData();
      return { success: true, voucher: generatedVoucher, client_number: semanticId };
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
              await (supabase.from('inventory') as any).update({ 
                sizes: { ...invItem.sizes, [item.size]: currentStock + delta } 
              }).eq('id', invItem.id);
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
        type: formData.type,
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
        name: data.name.trim().toUpperCase(),
        category: (data.category || '').toUpperCase(),
        subcategory: data.subcategory ? data.subcategory.toUpperCase() : null,
        material: data.material ? data.material.toUpperCase() : null,
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
        name: item.name ? item.name.toUpperCase() : undefined,
        category: item.category ? item.category.toUpperCase() : undefined,
        subcategory: item.subcategory ? item.subcategory.toUpperCase() : null,
        material: item.material ? item.material.toUpperCase() : null,
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

  const saveClient = async (client: Partial<Client>) => {
    if (!session || !supabase) return;
    setIsSyncing(true);
    try {
      const payload = {
        user_id: session.user.id,
        name: client.name?.toUpperCase(),
        last_name: client.last_name?.toUpperCase(),
        phone: client.phone,
        email: client.email?.toLowerCase() || null,
      };

      if (client.id) {
        await (supabase.from('clients') as any).update(payload).eq('id', client.id);
      } else {
        await (supabase.from('clients') as any).insert(payload);
      }
      await fetchData();
      return { success: true };
    } catch (error) {
      console.error('Error saving client:', error);
      return { success: false, error };
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteClient = async (id: string) => {
    if (!supabase || !window.confirm('¿Borrar esta clienta?')) return;
    setIsSyncing(true);
    try {
      await (supabase.from('clients') as any).delete().eq('id', id);
      await fetchData();
      return { success: true };
    } catch (error) {
      console.error('Error deleting client:', error);
      return { success: false, error };
    } finally {
      setIsSyncing(false);
    }
  };

  return { 
    sales, 
    expenses, 
    inventory, 
    vouchers, 
    clients, 
    isSyncing, 
    saveMultiSale, 
    deleteTransaction, 
    saveExpense, 
    deleteExpense, 
    fetchData, 
    addInventory, 
    updateInventory, 
    deleteInventory,
    saveClient,
    deleteClient
  };
}