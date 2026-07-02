import React, { useMemo, useState, useEffect } from 'react';
import { Sale, Invoice } from '../types';
import {
  Calendar, Package, Trash2, Edit3,
  RefreshCcw, CheckCircle2, AlertCircle, Search,
  ChevronLeft, ChevronRight, X, Percent, Coins, FileText, Ban, Share2
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import FacturarModal from './FacturarModal';
import { generateFacturaPdf, facturaPdfFilename, shareOrDownloadFacturaPdf } from '../lib/generateFacturaPdf';

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

const getMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const parseMonthKey = (key: string) => {
  if (!key || !key.includes('-')) return new Date();
  const [y, m] = key.split('-').map(Number);
  if (isNaN(y) || isNaN(m)) return new Date();
  return new Date(y, m - 1, 1);
};

interface SalesListProps {
  sales: Sale[];
  onDelete: (clientNumber: string) => void;
  onEdit: (sale: Sale) => void;
  onReturn: (sale: Sale) => void;
  invoices?: Invoice[];
  afipConfig?: { razonSocial: string; cuit: number; domicilioComercial: string; condicionIva: number } | null;
  onFacturar?: (args: { clientNumber: string; docTipo: number; docNro: number; condicionIvaReceptor: number }) => Promise<EmitirFacturaResult>;
  onAnular?: (args: { invoiceId: string; motivo: string }) => Promise<EmitirNotaCreditoResult>;
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

const SalesList: React.FC<SalesListProps> = ({ sales, onDelete, onEdit, onReturn, invoices, afipConfig, onFacturar, onAnular }) => {
  const [searchTerm, setSearchTerm] = useLocalStorage('atenea_sales_list_search', '');
  const [monthKey, setMonthKey] = useLocalStorage('atenea_sales_list_month', getMonthKey(new Date()));
  const selectedMonthDate = useMemo(() => parseMonthKey(monthKey), [monthKey]);
  const [currentPage, setCurrentPage] = useState(1);
  const [facturarTarget, setFacturarTarget] = useState<{
    clientNumber: string; total: number;
    items: { product_name: string; quantity: number; price: number; size?: string }[];
    clientName?: string;
  } | null>(null);
  const [ncTarget, setNcTarget] = useState<Invoice | null>(null);
  const [ncMotivo, setNcMotivo] = useState('');
  const [ncLoading, setNcLoading] = useState(false);
  const [ncError, setNcError] = useState('');
  const [sharingInvoiceId, setSharingInvoiceId] = useState<string | null>(null);

  const handleShareFacturaPdf = async (
    factura: Invoice,
    items: Sale[],
    totalVenta: number,
    clientName?: string,
  ) => {
    if (!afipConfig) return;
    setSharingInvoiceId(factura.id);
    try {
      const doc = await generateFacturaPdf({
        fiscalNumber: factura.afip_fiscal_number,
        cae: factura.afip_cae,
        caeExpiration: factura.afip_cae_expiration,
        qrData: factura.afip_qr_data,
        importeTotal: factura.importe_total,
        fecha: factura.created_at.slice(0, 10),
        totalVenta,
        items: items
          .filter(i => i.product_name !== '💰 AJUSTE POR REDONDEO')
          .map(i => ({ product_name: i.product_name, quantity: i.quantity, price: Number(i.price), size: i.size })),
        docTipo: factura.doc_tipo,
        docNro: factura.doc_nro,
        condicionIvaReceptor: factura.condicion_iva_receptor,
        clientName,
        afipConfig: {
          razonSocial: afipConfig.razonSocial,
          cuit: afipConfig.cuit,
          domicilioComercial: afipConfig.domicilioComercial,
          condicionIva: afipConfig.condicionIva,
        },
      });
      await shareOrDownloadFacturaPdf(doc, facturaPdfFilename(factura.afip_fiscal_number));
    } catch (e) {
      console.error(e);
    } finally {
      setSharingInvoiceId(null);
    }
  };

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

  const handleAnular = async () => {
    if (!ncTarget || !onAnular) return;
    if (!ncMotivo.trim()) {
      setNcError('Ingresá un motivo');
      return;
    }
    setNcError('');
    setNcLoading(true);
    const res = await onAnular({ invoiceId: ncTarget.id, motivo: ncMotivo.trim() });
    setNcLoading(false);
    if (res.success) {
      setNcTarget(null);
      setNcMotivo('');
    } else {
      setNcError(res.error || 'Error al emitir la nota de crédito');
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [monthKey, searchTerm]);

  // --- Navegación de Meses ---
  const handlePrevMonth = () => {
    const d = parseMonthKey(monthKey);
    d.setMonth(d.getMonth() - 1);
    setMonthKey(getMonthKey(d));
  };

  const handleNextMonth = () => {
    const d = parseMonthKey(monthKey);
    d.setMonth(d.getMonth() + 1);
    setMonthKey(getMonthKey(d));
  };

  // --- Lógica de Filtrado ---
  const filteredSales = useMemo(() => {
    const startOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1);
    const endOfMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    return sales.filter(sale => {
      const saleDate = new Date(sale.date + 'T12:00:00');
      const isInMonth = saleDate >= startOfMonth && saleDate <= endOfMonth;
      if (!isInMonth) return false;

      const matchesSearch = 
        sale.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.client_number.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [sales, selectedMonthDate, searchTerm]);

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
      {/* 1. SELECTOR DE MES (PAGINACIÓN TEMPORAL) */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border-2 border-slate-100 shadow-sm sticky top-0 z-30">
        <button onClick={handlePrevMonth} className="p-3 text-slate-400 active:scale-75 transition-all"><ChevronLeft className="w-6 h-6" /></button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-primary uppercase tracking-tighter">Historial de</span>
          <span className="text-sm font-black text-slate-700 uppercase tracking-tight">
            {selectedMonthDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <button onClick={handleNextMonth} className="p-3 text-slate-400 active:scale-75 transition-all"><ChevronRight className="w-6 h-6" /></button>
      </div>

      {/* 2. BUSCADOR */}
      <div className="px-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        <input 
          type="text" 
          placeholder="Buscar venta..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white border-2 border-slate-100 shadow-sm font-bold text-sm outline-none focus:border-primary transition-all uppercase tracking-tighter" 
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full text-slate-400"><X className="w-3 h-3" /></button>
        )}
      </div>

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
            // El efectivo no se factura — el importe a facturar es solo transferencia+débito+crédito.
            const totalFacturable = (firstSale.payment_details || [])
              .filter(p => p.method === 'Transferencia' || p.method === 'Débito' || p.method === 'Crédito')
              .reduce((sum, p) => sum + p.amount, 0);

            let totalDescuento10 = 0;
            realProducts.forEach(p => {
              const unitPrice = Number(p.price);
              const unitListPrice = Number(p.list_price) || unitPrice;
              if (unitListPrice > unitPrice) totalDescuento10 += (unitListPrice - unitPrice) * p.quantity;
            });

            return (
              <div key={clientNumber} className={`${status.bg} rounded-[2rem] shadow-md border-2 ${status.border} overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500`}>
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

                {/* FACTURACIÓN AFIP */}
                {(() => {
                  const factura = facturaByClientNumber[clientNumber];
                  const nc = factura ? ncByInvoiceId[factura.id] : undefined;

                  if (factura) {
                    return (
                      <div className="px-4 py-2.5 flex items-center justify-between bg-indigo-50/60 border-t border-indigo-100">
                        <div>
                          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">
                            {nc ? 'Anulada por NC' : 'Factura emitida'}
                          </p>
                          <p className={`text-xs font-black tracking-tighter ${nc ? 'text-slate-400 line-through' : 'text-indigo-700'}`}>
                            {factura.afip_fiscal_number}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleShareFacturaPdf(factura, items, totalCobrado, firstSale.client_name)}
                            disabled={!afipConfig || sharingInvoiceId === factura.id}
                            aria-label="Compartir PDF"
                            className="h-9 w-9 bg-white text-indigo-500 rounded-xl flex items-center justify-center border-2 border-indigo-100 active:scale-90 transition-all disabled:opacity-50"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          {!nc && onAnular && (
                            <button
                              onClick={() => { setNcTarget(factura); setNcMotivo(''); setNcError(''); }}
                              className="h-9 px-3 bg-white text-rose-500 rounded-xl flex items-center gap-1.5 border-2 border-rose-100 active:scale-90 transition-all"
                            >
                              <Ban className="w-3.5 h-3.5" /><span className="text-[9px] font-black uppercase">Anular (NC)</span>
                            </button>
                          )}
                        </div>
                      </div>
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
                    <div className={`p-2 grid gap-2 bg-white/60 ${showFacturar ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      <button onClick={() => { if(window.confirm('¿BORRAR VENTA?')) onDelete(clientNumber); }} className="h-11 bg-white text-rose-500 rounded-2xl flex items-center justify-center gap-2 border-2 border-rose-100 shadow-sm active:scale-90 transition-all"><Trash2 className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Borrar</span></button>
                      <button onClick={() => onEdit(firstSale)} className="h-11 bg-white text-slate-600 rounded-2xl flex items-center justify-center gap-2 border-2 border-slate-100 shadow-sm active:scale-90 transition-all"><Edit3 className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Corregir</span></button>
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
                          })}
                          title={totalFacturable < totalCobrado ? `Factura $${totalFacturable.toLocaleString('es-AR')} sin efectivo` : undefined}
                          className="h-11 bg-white hover:bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center gap-2 border-2 border-indigo-100 shadow-sm active:scale-90 transition-all"
                        >
                          <FileText className="w-4 h-4" /><span className="text-[9px] font-black uppercase">Facturar</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
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
          afipConfig={afipConfig}
          onClose={() => setFacturarTarget(null)}
          onEmitir={onFacturar}
        />
      )}

      {ncTarget && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm sm:m-4 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800">Anular {ncTarget.afip_fiscal_number}</h3>
              <button onClick={() => setNcTarget(null)} className="p-2 text-slate-400 hover:text-slate-600" aria-label="Cerrar"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Motivo</label>
              <input
                type="text"
                value={ncMotivo}
                onChange={(e) => setNcMotivo(e.target.value)}
                placeholder="Ej: devolución de mercadería"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
                autoFocus
              />
            </div>
            {ncError && <p className="text-xs text-red-500 font-semibold">{ncError}</p>}
            <button
              onClick={handleAnular}
              disabled={ncLoading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all"
            >
              {ncLoading ? 'Emitiendo...' : 'Emitir Nota de Crédito'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesList;