import { useState, useCallback, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  Sale, Expense, InventoryItem, Voucher, Client,
  MultiSaleData, ExpenseFormData, InventoryFormData
} from '../types';

export function useAtenea(session: Session | null) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setIsSyncing(true);
    try {
      // Ventana de 24 meses: cubre todo el historial navegable sin cargar datos muy antiguos
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 24);
      const cutoffStr = cutoffDate.toISOString().slice(0, 10);

      const [sRes, iRes, eRes, vRes, cRes] = await Promise.all([
        supabase.from('sales').select('*').gte('date', cutoffStr).order('date', { ascending: false }).order('client_number', { ascending: false }),
        supabase.from('inventory').select('*').order('name'),
        supabase.from('expenses').select('*').gte('date', cutoffStr).order('date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('vouchers').select('*').eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('name')
      ]);
      
      const errors: string[] = [];
      if (sRes.error) errors.push(`Sales: ${sRes.error.message}`);
      if (iRes.error) errors.push(`Inventory: ${iRes.error.message}`);
      if (eRes.error) errors.push(`Expenses: ${eRes.error.message}`);
      if (vRes.error) errors.push(`Vouchers: ${vRes.error.message}`);
      if (cRes.error) errors.push(`Clients: ${cRes.error.message}`);
      if (errors.length > 0) console.error("Fetch errors:", errors);

      if (sRes.data && !sRes.error) setSales(sRes.data as any);
      if (iRes.data && !iRes.error) setInventory(iRes.data as any);
      if (eRes.data && !eRes.error) setExpenses(eRes.data as any);
      if (vRes.data && !vRes.error) setVouchers(vRes.data as any);
      if (cRes.data && !cRes.error) setClients(cRes.data as any);
    } catch (error) {
      console.error("Error syncing:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [session]);

  useEffect(() => { if (session) fetchData(); }, [session, fetchData]);

  const saveMultiSale = async (data: MultiSaleData) => {
    if (!session) return null;
    setIsSyncing(true);
    try {
      const rpcPayload = {
        p_date: data.date,
        p_items: data.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          listPrice: item.listPrice,
          finalPrice: item.finalPrice,
          size: item.size,
          inventory_id: item.inventory_id || null,
          cost_price: item.cost_price,
          isReturn: item.isReturn || false,
        })),
        p_payments: data.payments,
        p_client_id: data.clientId || null,
        p_client_draft: data.clientDraft ? {
          name: data.clientDraft.name,
          lastName: data.clientDraft.lastName,
          phone: data.clientDraft.phone,
          email: data.clientDraft.email || null,
        } : null,
        p_is_edit: data.isEdit || false,
        p_original_client_number: data.originalClientNumber || null,
        p_force_completed: data.forceCompleted || false,
      };

      const { data: result, error } = await (supabase.rpc as any)('save_multi_sale', rpcPayload);

      if (error) {
        if (error.message?.includes('Insufficient stock')) {
          throw new Error('No hay suficiente stock disponible para completar esta venta. Por favor verifica el inventario.');
        }
        throw error;
      }

      const rpcResult = result as { success: boolean; client_number: string; voucher: any } | null;
      await fetchData();
      return {
        success: true,
        voucher: rpcResult?.voucher || null,
        client_number: rpcResult?.client_number,
      };
    } catch (error) {
      console.error(error);
      return { success: false, error };
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteTransaction = async (clientNumber: string) => {
    if (!session) return;
    setIsSyncing(true);
    try {
      // Stock se restaura AUTOMÁTICAMENTE cuando actualizamos el status a 'cancelled'
      // Primero actualizamos a 'cancelled' para que el trigger restaure el stock
      await (supabase.from('sales') as any)
        .update({ status: 'cancelled' })
        .eq('client_number', clientNumber)
        .eq('user_id', session.user.id);

      // Ahora eliminamos (el stock ya fue restaurado por el trigger)
      await (supabase.from('sales') as any).delete().eq('client_number', clientNumber).eq('user_id', session.user.id);
      await fetchData();
    } finally { setIsSyncing(false); }
  };

  const saveExpense = async (formData: ExpenseFormData) => {
    if (!session) return;
    setIsSyncing(true);
    try {
      const parsedAmount = parseFloat(formData.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return { success: false, error: new Error('Monto inválido') };
      }

      const payload: any = {
        date: formData.date,
        description: formData.description,
        amount: parsedAmount,
        category: formData.category,
        type: formData.type,
        has_invoice_a: formData.hasInvoiceA,
        invoice_amount: formData.hasInvoiceA ? (parseFloat(formData.invoiceAmount) || 0) : 0,
      };

      if (formData.isEdit && formData.id) {
        const { error } = await (supabase.from('expenses') as any).update(payload).eq('id', formData.id).eq('user_id', session.user.id);
        if (error) throw error;
      } else {
        payload.user_id = session.user.id;
        const { error } = await (supabase.from('expenses') as any).insert(payload);
        if (error) throw error;
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
    if (!session || !window.confirm('¿Borrar este gasto?')) return;
    setIsSyncing(true);
    try {
      await (supabase.from('expenses') as any).delete().eq('id', id).eq('user_id', session.user.id);
      await fetchData(); 
      return { success: true }; 
    } catch (error) { 
      return { success: false, error }; 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const addInventory = async (data: InventoryFormData) => {
    if (!session) return;
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
      const { error: insertErr } = await (supabase.from('inventory') as any).insert(payload);
      if (insertErr) throw insertErr;
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
    if (!session) return;
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
        sku: item.sku || undefined,
        barcode: item.barcode || undefined,
        // updated_at se actualiza automáticamente via trigger
      };
      const { error: updateErr } = await (supabase.from('inventory') as any).update(payload).eq('id', item.id).eq('user_id', session.user.id);
      if (updateErr) throw updateErr;
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
    if (!session) return;
    setIsSyncing(true);
    try {
      await (supabase.from('inventory') as any).delete().eq('id', id).eq('user_id', session.user.id);
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
    if (!session) return;
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
        const { error } = await (supabase.from('clients') as any).update(payload).eq('id', client.id).eq('user_id', session.user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('clients') as any).insert(payload);
        if (error) throw error;
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
    if (!session || !window.confirm('¿Borrar esta clienta?')) return;
    setIsSyncing(true);
    try {
      await (supabase.from('clients') as any).delete().eq('id', id).eq('user_id', session.user.id);
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