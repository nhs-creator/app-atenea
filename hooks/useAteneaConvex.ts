import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
  Sale, Expense, InventoryItem, Voucher, Client, Invoice,
  MultiSaleData, ExpenseFormData, InventoryFormData
} from '../types';
import {
  generateInventoryLabel as buildInventoryLabelPng,
  inventoryLabelFilename,
  shareOrDownloadInventoryLabel,
  printInventoryLabelCanvas,
  canvasToBlob,
} from '../lib/generateInventoryLabel';
import { printLabel, printLabelUSB, isWebBluetoothSupported } from '../lib/niimbotPrint';
import { composeInventoryLabelCode } from '../lib/inventoryLabelCode';

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
  const rawInvoices = useQuery(api.queries.invoices.listInvoices);
  const afipConfig = useQuery(api.queries.afipConfig.getConfig);

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
    labelsPrinted: i.labelsPrinted,
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

  const invoices: Invoice[] = (rawInvoices ?? []).map((inv) => ({
    id: inv._id,
    client_number: inv.clientNumber,
    doc_tipo: inv.docTipo,
    doc_nro: inv.docNro,
    condicion_iva_receptor: inv.condicionIvaReceptor,
    importe_total: inv.importeTotal,
    afip_cae: inv.afipCae,
    afip_cae_expiration: inv.afipCaeExpiration,
    afip_cbte_tipo: inv.afipCbteTipo,
    afip_fiscal_number: inv.afipFiscalNumber,
    afip_qr_data: inv.afipQrData,
    credit_note_for: inv.creditNoteFor,
    created_at: new Date(inv._creationTime).toISOString(),
    year_month: inv.yearMonth,
  }));

  // --- Mutations ---
  const saveMultiSaleMutation = useMutation(api.mutations.sales.saveMultiSale);
  const deleteTransactionMutation = useMutation(api.mutations.sales.deleteTransaction);
  const saveExpenseMutation = useMutation(api.mutations.expenses.saveExpense);
  const deleteExpenseMutation = useMutation(api.mutations.expenses.deleteExpense);
  const addInventoryMutation = useMutation(api.mutations.inventory.addInventory);
  const updateInventoryMutation = useMutation(api.mutations.inventory.updateInventory);
  const deleteInventoryMutation = useMutation(api.mutations.inventory.deleteInventory);
  const ensureInventoryBarcodeMutation = useMutation(api.mutations.inventory.ensureInventoryBarcode);
  const markInventoryLabelPrintedMutation = useMutation(api.mutations.inventory.markInventoryLabelPrinted);
  const saveClientMutation = useMutation(api.mutations.clients.saveClient);
  const deleteClientMutation = useMutation(api.mutations.clients.deleteClient);
  const emitirFacturaAction = useAction(api.actions.afip.emitirFactura);
  const emitirNotaCreditoAction = useAction(api.actions.afip.emitirNotaCredito);

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
    } catch (error: any) {
      alert(error.message || 'No se pudo borrar la venta');
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
      const newId = await addInventoryMutation({
        name: data.name.trim().toUpperCase(),
        category: (data.category || '').toUpperCase(),
        subcategory: data.subcategory ? data.subcategory.toUpperCase() : undefined,
        material: data.material ? data.material.toUpperCase() : undefined,
        costPrice: parseFloat(data.costPrice) || 0,
        sellingPrice: parseFloat(data.sellingPrice) || 0,
        sizes: sizesNum,
        sku: data.sku || undefined,
        barcode: data.barcode || undefined,
        detalle: data.detalle || undefined,
      });
      return { success: true, id: newId as string };
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
        detalle: item.detalle !== undefined ? item.detalle || '' : undefined,
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

  const generateInventoryLabel = async (item: InventoryItem) => {
    try {
      const code = item.barcode || await ensureInventoryBarcodeMutation({ id: item.id as Id<"inventory"> });
      const blob = await buildInventoryLabelPng({ code, productName: item.name, price: item.selling_price });
      await shareOrDownloadInventoryLabel(blob, inventoryLabelFilename(code));
      return { success: true as const };
    } catch (error: any) {
      console.error('Error generating inventory label:', error);
      return { success: false as const, error: error.message || 'Error al generar la etiqueta' };
    }
  };

  /**
   * Marca el talle como "etiqueta emitida" — no debe hacer fallar el resultado
   * del print/compartir si la mutation falla (la etiqueta física ya salió).
   */
  const markLabelPrintedSafe = async (item: InventoryItem, size?: string) => {
    if (!size) return;
    try {
      await markInventoryLabelPrintedMutation({ id: item.id as Id<"inventory">, size });
    } catch (error) {
      console.error('Error marcando etiqueta como impresa:', error);
    }
  };

  /**
   * Arma el canvas de la etiqueta (asegurando el código de barras si todavía
   * no existe) — compartido entre imprimir y previsualizar. El QR codifica
   * código de producto + talle (si hay), para que escanearlo en Ingresos
   * autoseleccione el talle.
   */
  const buildInventoryLabelCanvas = async (item: InventoryItem, size?: string) => {
    const rawCode = item.barcode || await ensureInventoryBarcodeMutation({ id: item.id as Id<"inventory"> });
    const code = composeInventoryLabelCode(rawCode, size);
    const canvas = await printInventoryLabelCanvas({ code, productName: item.name, price: item.selling_price, size });
    return { canvas, code };
  };

  /** Devuelve el canvas ya armado para mostrarlo antes de imprimir, sin conectar con nada. */
  const previewInventoryLabel = async (item: InventoryItem, size?: string) => (await buildInventoryLabelCanvas(item, size)).canvas;

  const printInventoryLabel = async (item: InventoryItem, size?: string, quantity = 1) => {
    try {
      const { canvas, code } = await buildInventoryLabelCanvas(item, size);

      // iPhone/iPad (cualquier navegador, por la restricción de WebKit) no
      // soporta Bluetooth desde la web — ahí no tiene sentido ni intentar
      // conectar. En vez de mostrar un error de Bluetooth, mandamos la
      // etiqueta ya armada al tamaño real del rollo (12x40mm) por el share
      // sheet, para que la importe en la app oficial de Niimbot. El share
      // sheet comparte un solo archivo, así que la cantidad no aplica ahí
      // (ella la reimprime desde la app de Niimbot si quiere varias copias).
      if (!isWebBluetoothSupported()) {
        const blob = await canvasToBlob(canvas);
        await shareOrDownloadInventoryLabel(blob, inventoryLabelFilename(code));
        await markLabelPrintedSafe(item, size);
        return { success: true as const };
      }

      await printLabel(canvas, quantity);
      await markLabelPrintedSafe(item, size);
      return { success: true as const };
    } catch (error: any) {
      console.error('Error printing inventory label:', error);
      return { success: false as const, error: error.message || 'Error al imprimir la etiqueta' };
    }
  };

  /** Solo para testing en desarrollo: imprime por USB/Serial en vez de Bluetooth. No marca la etiqueta como impresa (es solo para probar el hardware). */
  const printInventoryLabelUSB = async (item: InventoryItem, size?: string, quantity = 1) => {
    try {
      const { canvas } = await buildInventoryLabelCanvas(item, size);
      await printLabelUSB(canvas, quantity);
      return { success: true as const };
    } catch (error: any) {
      console.error('Error printing inventory label (USB):', error);
      return { success: false as const, error: error.message || 'Error al imprimir la etiqueta' };
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

  const emitirFactura = async (args: { clientNumber: string; docTipo: number; docNro: number; condicionIvaReceptor: number }) => {
    try {
      const result = await emitirFacturaAction(args);
      return { success: true as const, ...result };
    } catch (error: any) {
      return { success: false as const, error: error.message || 'Error al emitir la factura' };
    }
  };

  const emitirNotaCredito = async (args: { invoiceId: string; motivo: string }) => {
    try {
      const result = await emitirNotaCreditoAction({ invoiceId: args.invoiceId as Id<"invoices">, motivo: args.motivo });
      return { success: true as const, ...result };
    } catch (error: any) {
      return { success: false as const, error: error.message || 'Error al emitir la nota de crédito' };
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
    invoices,
    afipConfig,
    isSyncing,
    saveMultiSale,
    deleteTransaction,
    saveExpense,
    deleteExpense,
    fetchData,
    addInventory,
    updateInventory,
    deleteInventory,
    generateInventoryLabel,
    previewInventoryLabel,
    printInventoryLabel,
    printInventoryLabelUSB,
    saveClient,
    deleteClient,
    emitirFactura,
    emitirNotaCredito,
  };
}
