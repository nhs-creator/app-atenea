import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
  Sale, Expense, InventoryItem, Voucher, Client,
  MultiSaleData, ExpenseFormData, InventoryFormData
} from '../types';

/**
 * Hook adaptador que provee la misma interfaz que useAtenea
 * pero usando Convex como backend.
 *
 * Diferencias clave vs Supabase:
 * - Queries son reactivas: no hay fetchData, los datos se actualizan solos
 * - Mutations son atómicas: no hay pasos intermedios que puedan fallar
 * - Auth se obtiene automáticamente del contexto Convex
 */
export function useAteneaConvex() {
  // Ventana de 24 meses
  const cutoffDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 24);
    return d.toISOString().slice(0, 10);
  })();

  // --- Queries reactivas (se actualizan automáticamente) ---
  const rawSales = useQuery(api.queries.sales.listSales, { cutoffDate });
  const rawExpenses = useQuery(api.queries.expenses.listExpenses, { cutoffDate });
  const rawInventory = useQuery(api.queries.inventory.listInventory);
  const rawVouchers = useQuery(api.queries.vouchers.listActiveVouchers);
  const rawClients = useQuery(api.queries.clients.listClients);

  // Mapear documentos Convex a la interfaz frontend existente
  const sales: Sale[] = (rawSales ?? []).map((s) => ({
    id: s._id,
    user_id: s.userId,
    date: s.date,
    client_number: s.clientNumber,
    product_name: s.productName,
    quantity: s.quantity,
    price: s.price,
    list_price: s.listPrice,
    cost_price: s.costPrice ?? 0,
    payment_method: s.paymentMethod,
    payment_details: s.paymentDetails as any,
    status: s.status,
    size: s.size,
    inventory_id: s.inventoryId,
    client_id: s.clientId,
    created_at: new Date(s._creationTime).toISOString(),
    updated_at: new Date(s._creationTime).toISOString(),
    expires_at: s.expiresAt,
  }));

  const expenses: Expense[] = (rawExpenses ?? []).map((e) => ({
    id: e._id,
    user_id: e.userId,
    date: e.date,
    description: e.description,
    amount: e.amount,
    category: e.category,
    type: e.type,
    has_invoice_a: e.hasInvoiceA,
    invoice_amount: e.invoiceAmount,
    created_at: new Date(e._creationTime).toISOString(),
    updated_at: new Date(e._creationTime).toISOString(),
  }));

  const inventory: InventoryItem[] = (rawInventory ?? []).map((i) => ({
    id: i._id,
    user_id: i.userId,
    name: i.name,
    category: i.category,
    subcategory: i.subcategory ?? '',
    material: i.material ?? '',
    cost_price: i.costPrice,
    selling_price: i.sellingPrice,
    sizes: i.sizes,
    stock_total: i.stockTotal,
    min_stock: i.minStock,
    sku: i.sku,
    barcode: i.barcode,
    created_at: new Date(i._creationTime).toISOString(),
    updated_at: new Date(i._creationTime).toISOString(),
  }));

  const vouchers: Voucher[] = (rawVouchers ?? []).map((v) => ({
    id: v._id,
    user_id: v.userId,
    code: v.code,
    initial_amount: v.initialAmount,
    current_amount: v.currentAmount,
    status: v.status,
    expires_at: v.expiresAt,
    created_at: new Date(v._creationTime).toISOString(),
  }));

  const clients: Client[] = (rawClients ?? []).map((c) => ({
    id: c._id,
    user_id: c.userId,
    name: c.name,
    last_name: c.lastName ?? '',
    phone: c.phone,
    email: c.email,
    created_at: new Date(c._creationTime).toISOString(),
    updated_at: new Date(c._creationTime).toISOString(),
  }));

  // --- Mutations ---
  const saveMultiSaleMutation = useMutation(api.mutations.sales.saveMultiSale);
  const deleteTransactionMutation = useMutation(api.mutations.sales.deleteTransaction);
  const saveExpenseMutation = useMutation(api.mutations.expenses.saveExpense);
  const deleteExpenseMutation = useMutation(api.mutations.expenses.deleteExpense);
  const addInventoryMutation = useMutation(api.mutations.inventory.addInventory);
  const updateInventoryMutation = useMutation(api.mutations.inventory.updateInventory);
  const deleteInventoryMutation = useMutation(api.mutations.inventory.deleteInventory);
  const saveClientMutation = useMutation(api.mutations.clients.saveClient);
  const deleteClientMutation = useMutation(api.mutations.clients.deleteClient);

  // --- Adaptadores que mantienen la interfaz existente ---

  const saveMultiSale = async (data: MultiSaleData) => {
    try {
      const result = await saveMultiSaleMutation({
        date: data.date,
        items: data.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          listPrice: item.listPrice,
          finalPrice: item.finalPrice,
          size: item.size,
          inventoryId: item.inventory_id || undefined,
          costPrice: item.cost_price,
          isReturn: item.isReturn || false,
        })),
        payments: data.payments as any,
        clientId: data.clientId || undefined,
        clientDraft: data.clientDraft ? {
          name: data.clientDraft.name,
          lastName: data.clientDraft.lastName,
          phone: data.clientDraft.phone,
          email: data.clientDraft.email,
        } : undefined,
        isEdit: data.isEdit || false,
        originalClientNumber: data.originalClientNumber,
        forceCompleted: data.forceCompleted || false,
      });
      return { success: true, voucher: result.voucher, client_number: result.clientNumber };
    } catch (error) {
      console.error(error);
      return { success: false, error };
    }
  };

  const deleteTransaction = async (clientNumber: string) => {
    try {
      await deleteTransactionMutation({ clientNumber });
    } catch (error) {
      console.error(error);
    }
  };

  const saveExpense = async (formData: ExpenseFormData) => {
    try {
      const parsedAmount = parseFloat(formData.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return { success: false, error: new Error('Monto inválido') };
      }
      await saveExpenseMutation({
        id: formData.isEdit && formData.id ? (formData.id as Id<"expenses">) : undefined,
        date: formData.date,
        description: formData.description,
        amount: parsedAmount,
        category: formData.category,
        type: formData.type as "business" | "personal",
        hasInvoiceA: formData.hasInvoiceA,
        invoiceAmount: formData.hasInvoiceA ? (parseFloat(formData.invoiceAmount) || 0) : 0,
      });
      return { success: true };
    } catch (error) {
      console.error("Error saving expense:", error);
      return { success: false, error };
    }
  };

  const deleteExpense = async (id: string) => {
    if (!window.confirm('¿Borrar este gasto?')) return;
    try {
      await deleteExpenseMutation({ id: id as Id<"expenses"> });
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const addInventory = async (data: InventoryFormData) => {
    try {
      const sizesNum: Record<string, number> = {};
      Object.entries(data.sizes || {}).forEach(([s, q]) => {
        sizesNum[s] = typeof q === 'string' ? parseInt(q, 10) || 0 : (q || 0);
      });
      await addInventoryMutation({
        name: data.name.trim().toUpperCase(),
        category: (data.category || '').toUpperCase(),
        subcategory: data.subcategory ? data.subcategory.toUpperCase() : undefined,
        material: data.material ? data.material.toUpperCase() : undefined,
        costPrice: parseFloat(data.costPrice) || 0,
        sellingPrice: parseFloat(data.sellingPrice) || 0,
        sizes: sizesNum,
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
      });
      return { success: true };
    } catch (error) {
      console.error('Error adding inventory:', error);
      return { success: false, error };
    }
  };

  const updateInventory = async (item: Partial<InventoryItem> & { id: string }) => {
    try {
      await updateInventoryMutation({
        id: item.id as Id<"inventory">,
        name: item.name?.toUpperCase(),
        category: item.category?.toUpperCase(),
        subcategory: item.subcategory ? item.subcategory.toUpperCase() : undefined,
        material: item.material ? item.material.toUpperCase() : undefined,
        costPrice: item.cost_price,
        sellingPrice: item.selling_price,
        sizes: item.sizes,
        sku: item.sku || undefined,
        barcode: item.barcode || undefined,
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating inventory:', error);
      return { success: false, error };
    }
  };

  const deleteInventory = async (id: string) => {
    try {
      await deleteInventoryMutation({ id: id as Id<"inventory"> });
      return { success: true };
    } catch (error) {
      console.error('Error deleting inventory:', error);
      return { success: false, error };
    }
  };

  const saveClient = async (client: Partial<Client>) => {
    try {
      await saveClientMutation({
        id: client.id ? (client.id as Id<"clients">) : undefined,
        name: client.name || '',
        lastName: client.last_name,
        phone: client.phone || '',
        email: client.email,
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving client:', error);
      return { success: false, error };
    }
  };

  const deleteClient = async (id: string) => {
    if (!window.confirm('¿Borrar esta clienta?')) return;
    try {
      await deleteClientMutation({ id: id as Id<"clients"> });
      return { success: true };
    } catch (error) {
      console.error('Error deleting client:', error);
      return { success: false, error };
    }
  };

  // fetchData es no-op — Convex es reactivo
  const fetchData = () => {};

  const isSyncing = rawSales === undefined || rawInventory === undefined;

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
    deleteClient,
  };
}
