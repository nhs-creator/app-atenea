import React, { useMemo, useState, useEffect } from 'react';
import { Sale, Invoice, Client } from '../types';
import {
  Calendar, Package, Trash2, Edit3,
  RefreshCcw, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, Percent, Coins, FileText
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import FacturarModal from './FacturarModal';
import InvoiceDetailModal from './sales/InvoiceDetailModal';
import SearchBar from './ui/SearchBar';
import FilterButton from './ui/FilterButton';
import ListCard from './ui/ListCard';
import { sumInvoiceablePayments, filterInvoiceablePayments } from '../lib/invoiceablePayments';

interface EmitirFacturaResult {
  success: boolean;
  cae?: string;
  caeExpiration?: string;
  fiscalNumber?: string;
  qrData?: string;
  importeTotal?: number;
  fecha?: string;
  error?: string;
}

interface EmitirNotaCreditoResult {
  success: boolean;
  fiscalNumber?: string;
  error?: string;
}

interface SalesListProps {
  sales: Sale[];
  date: string;
  onDelete: (clientNumber: string) => void;
  onEdit: (sale: Sale) => void;
  onReturn: (sale: Sale) => void;
  invoices?: Invoice[];
  afipConfig?: { razonSocial: string; nombreFantasia?: string; cuit: number; domicilioComercial: string; condicionIva: number; facturarEfectivo?: boolean } | null;
  onFacturar?: (args: { clientNumber: string; docTipo: number; docNro: number; condicionIvaReceptor: number }) => Promise<EmitirFacturaResult>;
  onAnular?: (args: { invoiceId: string; motivo: string }) => Promise<EmitirNotaCreditoResult>;
  clients?: Client[];
  onLinkClient?: (clientNumber: string, clientId?: string, clientDraft?: { name: string; lastName: string; phone: string; email?: string }) => Promise<{ success: boolean; error?: string }>;
}

const ITEMS_PER_PAGE = 15;

const PAYMENT_COLORS: Record<string, string> = {
  'Efectivo': 'bg-emerald-500',
  'Transferencia': 'bg-blue-600',
  'Débito': 'bg-amber-500',
  'Crédito': 'bg-rose-600',
  'Vale': 'bg-orange-600'
};

const STATUS_CONFIG = {
  saldado: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, label: 'Saldado' },
  sena: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertCircle, label: 'Seña' },
  cambio: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: RefreshCcw, label: 'Cambio' }
};

type StatusFilter = 'todos' | 'saldado' | 'sena' | 'cambio';
type InvoiceFilter = 'todos' | 'facturado' | 'no_facturado' | 'anulado';
type PaymentFilter = 'todos' | 'Efectivo' | 'Transferencia' | 'Débito' | 'Crédito' | 'Vale';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'saldado', label: 'Saldado' },
  { key: 'sena', label: 'Seña' },
  { key: 'cambio', label: 'Cambio' },
];

const INVOICE_FILTERS: { key: InvoiceFilter; label: string }[] = [
  { key: 'todos', label: 'Todas' },
  { key: 'facturado', label: 'Facturado' },
  { key: 'no_facturado', label: 'No facturado' },
  { key: 'anulado', label: 'Anulada' },
];

const PAYMENT_FILTERS: { key: PaymentFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'Efectivo', label: 'Efectivo' },
  { key: 'Transferencia', label: 'Transferencia' },
  { key: 'Débito', label: 'Débito' },
  { key: 'Crédito', label: 'Crédito' },
  { key: 'Vale', label: 'Vale' },
];

const FilterRow = <T extends string>({ label, options, value, onChange }: {
  label: string; options: { key: T; label: string }[]; value: T; onChange: (v: T) => void;
}) => (
  <div>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter border-2 transition-all active:scale-95 ${value === opt.key ? 'bg-primary border-primary text-white' : 'bg-white border-slate-100 text-slate-500'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const SalesList: React.FC<SalesListProps> = ({ sales, date, onDelete, onEdit, onReturn, invoices, afipConfig, onFacturar, onAnular, clients, onLinkClient }) => {
  const [searchTerm, setSearchTerm] = useLocalStorage('atenea_sales_list_search', '');
  const [statusFilter, setStatusFilter] = useLocalStorage<StatusFilter>('atenea_sales_list_status_filter', 'todos');
  const [invoiceFilter, setInvoiceFilter] = useLocalStorage<InvoiceFilter>('atenea_sales_list_invoice_filter', 'todos');
  const [paymentFilter, setPaymentFilter] = useLocalStorage<PaymentFilter>('atenea_sales_list_payment_filter', 'todos');
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [statusFilter, invoiceFilter, paymentFilter].filter(f => f !== 'todos').length;
  const [currentPage, setCurrentPage] = useState(1);
  const [facturarTarget, setFacturarTarget] = useState<{
    clientNumber: string; total: number;
    items: { product_name: string; quantity: number; price: number; size?: string }[];
    clientName?: string;
    paymentMethods: { method: string; amount: number }[];
  } | null>(null);
  const [detailTarget, setDetailTarget] = useState<{ factura: Invoice; items: Sale[]; totalVenta: number; firstSale: Sale; isAnulada: boolean } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // --- Facturas: solo la Factura C (tipo 11) indexa por clientNumber; las NC comparten el mismo client_number ---
  const facturaByClientNumber = useMemo(() => {
    const map: Record<string, Invoice> = {};
    (invoices ?? []).forEach(inv => {
      if (inv.afip_cbte_tipo === 11) map[inv.client_number] = inv;
    });
    return map;
  }, [invoices]);

  const ncByInvoiceId = useMemo(() => {
    const map: Record<string, Invoice> = {};
    (invoices ?? []).forEach(inv => {
      if (inv.credit_note_for) map[inv.credit_note_for] = inv;
    });
    return map;
  }, [invoices]);

  useEffect(() => {
    setCurrentPage(1);
  }, [date, searchTerm, statusFilter, invoiceFilter, paymentFilter]);

  // --- Lógica de Filtrado ---
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      if (sale.date !== date) return false;

      const matchesSearch =
        sale.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.client_number.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const isReturnTransaction = sale.client_number.startsWith('C');
      const matchesStatus = statusFilter === 'todos' ? true
        : statusFilter === 'cambio' ? isReturnTransaction
        : isReturnTransaction ? false
        : statusFilter === 'sena' ? sale.status === 'pending'
        : sale.status !== 'pending';
      if (!matchesStatus) return false;

      if (invoiceFilter !== 'todos') {
        const factura = facturaByClientNumber[sale.client_number];
        const nc = factura ? ncByInvoiceId[factura.id] : undefined;
        const matchesInvoice = invoiceFilter === 'facturado' ? (!!factura && !nc)
          : invoiceFilter === 'no_facturado' ? !factura
          : (!!factura && !!nc);
        if (!matchesInvoice) return false;
      }

      if (paymentFilter !== 'todos') {
        const matchesPayment = (sale.payment_details || []).some(p => p.method === paymentFilter);
        if (!matchesPayment) return false;
      }

      return true;
    });
  }, [sales, date, searchTerm, statusFilter, invoiceFilter, paymentFilter, facturaByClientNumber, ncByInvoiceId]);

  // --- Agrupamiento y Paginación ---
  const groupedSales = useMemo(() => {
    const groups: Record<string, Sale[]> = {};
    filteredSales.forEach(sale => {
      if (!groups[sale.client_number]) groups[sale.client_number] = [];
      groups[sale.client_number].push(sale);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredSales]);

  const totalPages = Math.ceil(groupedSales.length / ITEMS_PER_PAGE);
  const paginatedGroups = groupedSales.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-4 pb-24">
      {/* BUSCADOR + FILTROS */}
      <div className="px-1 flex items-center gap-2">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar venta..." />
        <FilterButton active={showFilters} activeCount={activeFilterCount} onClick={() => setShowFilters(v => !v)} />
      </div>

      {/* PANEL DE FILTROS */}
      {showFilters && (
        <div className="px-1 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-3 space-y-3">
            <FilterRow label="Estado" options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
            <FilterRow label="Facturación" options={INVOICE_FILTERS} value={invoiceFilter} onChange={setInvoiceFilter} />
            <FilterRow label="Medio de pago" options={PAYMENT_FILTERS} value={paymentFilter} onChange={setPaymentFilter} />
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setStatusFilter('todos'); setInvoiceFilter('todos'); setPaymentFilter('todos'); }}
                className="w-full h-9 rounded-xl bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-tighter active:scale-95 transition-all"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. LISTADO DE VENTAS */}
      {paginatedGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 bg-white rounded-3xl border-2 border-dashed border-slate-50">
          <Package className="w-12 h-12 mb-2 opacity-20" />
          <p className="font-black text-[10px] uppercase tracking-[0.2em]">Sin movimientos</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedGroups.map(([clientNumber, items]) => {
            const firstSale = items[0];
            const isPending = firstSale.status === 'pending';
            const isReturnTransaction = clientNumber.startsWith('C');
            const status = isReturnTransaction ? STATUS_CONFIG.cambio : isPending ? STATUS_CONFIG.sena : STATUS_CONFIG.saldado;

            // Lógica de Desglose
            const realProducts = items.filter(i => i.product_name !== '💰 AJUSTE POR REDONDEO');
            const roundingAdjustment = items.find(i => i.product_name === '💰 AJUSTE POR REDONDEO');
            
            const totalCobrado = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
            // Si el efectivo se factura o no es configurable (Ajustes → ARCA).
            const totalFacturable = sumInvoiceablePayments(firstSale.payment_details || [], afipConfig?.facturarEfectivo ?? false);

            let totalDescuento10 = 0;
            realProducts.forEach(p => {
              const unitPrice = Number(p.price);
              const unitListPrice = Number(p.list_price) || unitPrice;
              if (unitListPrice > unitPrice) totalDescuento10 += (unitListPrice - unitPrice) * p.quantity;
            });

            return (
              <ListCard key={clientNumber} variant={status}>
                {/* CABECERA (Colores y Estados) */}
                <div className="p-4 flex justify-between items-center bg-white/40 border-b border-white/60">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl shadow-sm bg-white ${status.text}`}><status.icon className="w-5 h-5" /></div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-400 leading-tight uppercase tracking-widest">{clientNumber}</h3>
                      <div className="flex items-center gap-1.5 text-base font-black text-slate-700 mt-0.5">
                        <Calendar className="w-4 h-4 text-primary" />
                        {new Date(firstSale.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black leading-none tracking-tighter ${totalCobrado < 0 ? 'text-indigo-600' : 'text-slate-900'}`}>
                      ${Math.abs(totalCobrado).toLocaleString('es-AR')}
                    </p>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase mt-1 inline-block bg-white border ${status.border} ${status.text}`}>{status.label}</span>
                  </div>
                </div>

                {/* LISTA DE ARTÍCULOS */}
                <div className="px-4 py-3 space-y-2">
                  {realProducts.map(item => {
                    const unitPrice = Number(item.price);
                    const unitListPrice = Number(item.list_price) || unitPrice;
                    const has10 = unitListPrice > unitPrice;
                    const lineTotal = unitPrice * item.quantity;
                    const lineListTotal = unitListPrice * item.quantity;

                    return (
                      <div key={item.id} className="flex justify-between items-center text-xs font-bold text-slate-600">
                        <span className="truncate uppercase pr-4">
                          {item.quantity > 1 && <span className="text-primary mr-1">{item.quantity}x</span>}
                          {item.product_name} <span className="text-[9px] text-slate-400 font-black ml-1">({item.size || 'U'})</span>
                        </span>
                        <div className="text-right flex flex-col items-end">
                          {has10 && <span className="text-[9px] text-slate-300 line-through">${lineListTotal.toLocaleString()}</span>}
                          <span className={`font-black ${has10 ? 'text-emerald-500' : 'text-slate-800'}`}>${Math.abs(lineTotal).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* DESCUENTOS Y REDONDEO (JERARQUÍA RESTAURADA) */}
                  {(totalDescuento10 > 0 || roundingAdjustment) && (
                    <div className="mt-3 pt-3 border-t border-dashed border-white/60 space-y-1.5">
                      {totalDescuento10 > 0 && (
                        <div className="flex justify-between items-center text-[10px] font-black text-emerald-600 uppercase tracking-tighter italic">
                          <div className="flex items-center gap-1"><Percent className="w-3 h-3" /> Descuento 10%</div>
                          <span>-${totalDescuento10.toLocaleString()}</span>
                        </div>
                      )}
                      {roundingAdjustment && (
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">
                          <div className="flex items-center gap-1"><Coins className="w-3 h-3" /> Redondeo</div>
                          <span>-${Math.abs(Number(roundingAdjustment.price)).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* MEDIOS DE PAGO (COLORES RESTAURADOS) */}
                {firstSale.payment_details && firstSale.payment_details.length > 0 && (
                  <div className="px-4 py-3 flex flex-wrap gap-2 bg-white/20 border-t border-white/40">
                    {firstSale.payment_details.map((p, i) => (
                      <div key={i} className={`${PAYMENT_COLORS[p.method] || 'bg-slate-400'} px-2.5 py-1 rounded-lg flex items-center gap-2 shadow-sm`}>
                        <span className="text-[8px] font-black text-white uppercase tracking-tighter">{p.method}</span>
                        <span className="text-[10px] font-black text-white">${p.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* FACTURACIÓN ARCA */}
                {(() => {
                  const factura = facturaByClientNumber[clientNumber];
                  const nc = factura ? ncByInvoiceId[factura.id] : undefined;

                  if (factura) {
                    return (
                      <button
                        onClick={() => setDetailTarget({ factura, items, totalVenta: totalCobrado, firstSale, isAnulada: !!nc })}
                        className="w-full px-4 py-2.5 flex items-center justify-between bg-indigo-50/60 border-t border-indigo-100 active:bg-indigo-100/60 transition-colors"
                      >
                        <div className="text-left">
                          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">
                            {nc ? 'Anulada por NC' : 'Factura emitida'}
                          </p>
                          <p className={`text-xs font-black tracking-tighter ${nc ? 'text-slate-400 line-through' : 'text-indigo-700'}`}>
                            {factura.afip_fiscal_number}
                          </p>
                        </div>
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Ver detalle</span>
                      </button>
                    );
                  }

                  return null;
                })()}

                {/* BOTONES DE ACCIÓN */}
                {(() => {
                  // Sin importe no-efectivo no hay nada para facturar (el efectivo no se factura).
                  const showFacturar = !facturaByClientNumber[clientNumber] && onFacturar
                    && firstSale.status === 'completed' && !isReturnTransaction && totalFacturable > 0;
                  return (
                    <div className={`p-2 grid gap-2 bg-white/60 ${showFacturar ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === clientNumber ? null : clientNumber)}
                          className="w-full h-11 bg-white text-slate-600 rounded-2xl flex items-center justify-center gap-2 border-2 border-slate-100 shadow-sm active:scale-90 transition-all"
                        >
                          <Edit3 className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Editar</span>
                        </button>
                        {openMenuId === clientNumber && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute left-0 bottom-14 z-50 bg-white rounded-2xl border border-slate-100 shadow-xl p-1.5 w-40 animate-in zoom-in-95 duration-150">
                              <button
                                onClick={() => { setOpenMenuId(null); onEdit(firstSale); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black uppercase text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all"
                              >
                                <Edit3 className="w-4 h-4" /> Editar
                              </button>
                              <button
                                onClick={() => { setOpenMenuId(null); if (window.confirm('¿BORRAR VENTA?')) onDelete(clientNumber); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black uppercase text-red-500 hover:bg-red-50 active:scale-[0.98] transition-all"
                              >
                                <Trash2 className="w-4 h-4" /> Borrar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <button onClick={() => onReturn(firstSale)} className="h-11 bg-white hover:bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center gap-2 border-2 border-indigo-100 shadow-sm active:scale-90 transition-all"><RefreshCcw className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Cambio</span></button>
                      {showFacturar && (
                        <button
                          onClick={() => setFacturarTarget({
                            clientNumber,
                            total: totalFacturable,
                            items: realProducts.map(i => ({
                              product_name: i.product_name,
                              quantity: i.quantity,
                              price: Number(i.price),
                              size: i.size,
                            })),
                            clientName: firstSale.client_name,
                            paymentMethods: filterInvoiceablePayments(firstSale.payment_details || [], afipConfig?.facturarEfectivo ?? false)
                              .map(p => ({ method: p.method, amount: p.amount })),
                          })}
                          title={totalFacturable < totalCobrado ? `Factura $${totalFacturable.toLocaleString('es-AR')}${afipConfig?.facturarEfectivo ? '' : ' sin efectivo'}` : undefined}
                          className="h-11 bg-white hover:bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center gap-2 border-2 border-indigo-100 shadow-sm active:scale-90 transition-all"
                        >
                          <FileText className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Facturar</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </ListCard>
            );
          })}

          {/* BOTONERA DE PÁGINAS */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-3 pt-6 pb-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button disabled={currentPage === 1} onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border-2 border-slate-100 text-slate-400 disabled:opacity-30 active:scale-90"><ChevronLeft className="w-5 h-5" /></button>
                <span className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black text-slate-500 uppercase">Página {currentPage} de {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border-2 border-slate-100 text-slate-400 disabled:opacity-30 active:scale-90"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {facturarTarget && onFacturar && (
        <FacturarModal
          clientNumber={facturarTarget.clientNumber}
          total={facturarTarget.total}
          items={facturarTarget.items}
          clientName={facturarTarget.clientName}
          paymentMethods={facturarTarget.paymentMethods}
          afipConfig={afipConfig}
          onClose={() => setFacturarTarget(null)}
          onEmitir={onFacturar}
        />
      )}

      {detailTarget && afipConfig && (
        <InvoiceDetailModal
          factura={detailTarget.factura}
          items={detailTarget.items}
          totalVenta={detailTarget.totalVenta}
          clientId={detailTarget.firstSale.client_id}
          clientName={detailTarget.firstSale.client_name}
          clientPhone={detailTarget.firstSale.client_phone}
          isAnulada={detailTarget.isAnulada}
          afipConfig={afipConfig}
          clients={clients ?? []}
          onLinkClient={onLinkClient ?? (async () => ({ success: false, error: 'No disponible' }))}
          onAnular={onAnular}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
};

export default SalesList;