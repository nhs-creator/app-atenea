import React, { useMemo, useState } from 'react';
import { X, FileDown, Share2, UserCheck, UserPlus, Ban, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { Invoice, Sale, Client } from '../../types';
import { generateFacturaPdf, facturaPdfFilename, shareOrDownloadFacturaPdf } from '../../lib/generateFacturaPdf';
import { buildWhatsAppChatUrl } from '../../lib/whatsappLink';
import ClientSearchInput from '../ui/ClientSearchInput';

interface InvoiceDetailModalProps {
  factura: Invoice;
  items: Sale[];
  totalVenta: number;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  isAnulada: boolean;
  afipConfig: { razonSocial: string; nombreFantasia?: string; cuit: number; domicilioComercial: string; condicionIva: number };
  clients: Client[];
  onLinkClient: (clientNumber: string, clientId?: string, clientDraft?: { name: string; lastName: string; phone: string; email?: string }) => Promise<{ success: boolean; error?: string }>;
  onAnular?: (args: { invoiceId: string; motivo: string }) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

type View = 'main' | 'pdf' | 'nuevaClienta' | 'anular';

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  factura, items, totalVenta, clientId, clientName, clientPhone, isAnulada, afipConfig, clients,
  onLinkClient, onAnular, onClose,
}) => {
  const [view, setView] = useState<View>('main');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientDraft, setClientDraft] = useState<{ name: string; lastName: string; phone: string; email: string } | null>(null);
  const [linking, setLinking] = useState(false);

  const [ncMotivo, setNcMotivo] = useState('');
  const [ncLoading, setNcLoading] = useState(false);

  const filteredClients = useMemo(() => {
    if (clientSearchTerm.length < 2) return [];
    const term = clientSearchTerm.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(term) || c.last_name.toLowerCase().includes(term) || c.phone.includes(term)).slice(0, 5);
  }, [clients, clientSearchTerm]);

  const buildPdf = async () => generateFacturaPdf({
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
    afipConfig,
  });

  const handleViewPdf = async () => {
    setError('');
    setPdfLoading(true);
    try {
      const doc = await buildPdf();
      const url = URL.createObjectURL(doc.output('blob'));
      setPdfUrl(url);
      setView('pdf');
    } catch (e: any) {
      setError(e.message || 'No se pudo generar el PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  /** Abre el chat de WhatsApp de esa clienta y deja el PDF listo para adjuntar a mano ahí. */
  const shareToPhone = async (phone: string) => {
    setError('');
    setSharing(true);
    try {
      window.open(buildWhatsAppChatUrl(phone), '_blank');
      const doc = await buildPdf();
      await shareOrDownloadFacturaPdf(doc, facturaPdfFilename(factura.afip_fiscal_number));
    } catch (e: any) {
      setError(e.message || 'No se pudo compartir la factura');
    } finally {
      setSharing(false);
    }
  };

  const handleShareToClient = () => {
    if (!clientPhone) return;
    void shareToPhone(clientPhone);
  };

  const handleSelectExistingClient = async (c: Client) => {
    setError('');
    setLinking(true);
    const res = await onLinkClient(factura.client_number, c.id);
    setLinking(false);
    if (!res.success) { setError(res.error || 'No se pudo vincular la clienta'); return; }
    await shareToPhone(c.phone);
  };

  const handleCreateAndLinkClient = async () => {
    if (!clientDraft || !clientDraft.name.trim() || !clientDraft.phone.trim()) return;
    setError('');
    setLinking(true);
    const res = await onLinkClient(factura.client_number, undefined, {
      name: clientDraft.name.trim(),
      lastName: clientDraft.lastName.trim(),
      phone: clientDraft.phone.trim(),
      email: clientDraft.email.trim() || undefined,
    });
    setLinking(false);
    if (!res.success) { setError(res.error || 'No se pudo vincular la clienta'); return; }
    await shareToPhone(clientDraft.phone.trim());
  };

  const handleAnular = async () => {
    if (!onAnular) return;
    if (!ncMotivo.trim()) { setError('Ingresá un motivo'); return; }
    setError('');
    setNcLoading(true);
    const res = await onAnular({ invoiceId: factura.id, motivo: ncMotivo.trim() });
    setNcLoading(false);
    if (res.success) onClose();
    else setError(res.error || 'Error al emitir la nota de crédito');
  };

  const goBack = () => { setError(''); setView('main'); };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm sm:m-4 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {view !== 'main' && (
              <button onClick={goBack} className="p-1 -ml-1 text-slate-400 hover:text-slate-600" aria-label="Volver">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="font-black text-slate-800">{factura.afip_fiscal_number}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600" aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </div>

        {view === 'main' && (
          <>
            <div className="bg-indigo-50 rounded-2xl p-4 space-y-1">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{isAnulada ? 'Anulada por NC' : 'Factura emitida'}</p>
              <p className="text-xl font-black text-indigo-700">${Math.round(factura.importe_total).toLocaleString('es-AR')}</p>
              <p className="text-[10px] font-bold text-indigo-400">CAE {factura.afip_cae} · {factura.created_at.slice(0, 10)}</p>
            </div>

            <button onClick={handleViewPdf} disabled={pdfLoading} className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-xs uppercase active:scale-[0.98] disabled:opacity-50">
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Ver PDF adentro de la app
            </button>

            {clientId && clientPhone && (
              <button onClick={handleShareToClient} disabled={sharing} className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-emerald-100 text-emerald-600 font-black text-xs uppercase active:scale-[0.98] disabled:opacity-50">
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Compartir a {clientName || 'clienta'}
              </button>
            )}

            <button onClick={() => setView('nuevaClienta')} className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-indigo-100 text-indigo-600 font-black text-xs uppercase active:scale-[0.98]">
              <UserPlus className="w-4 h-4" /> Compartir a nueva clienta
            </button>

            {error && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /><p className="text-xs font-bold text-amber-700">{error}</p>
              </div>
            )}

            {!isAnulada && onAnular && (
              <button onClick={() => setView('anular')} className="w-full text-[10px] font-bold text-rose-400 uppercase tracking-widest pt-2 flex items-center justify-center gap-1.5">
                <Ban className="w-3 h-3" /> Anular factura
              </button>
            )}
          </>
        )}

        {view === 'pdf' && pdfUrl && (
          <iframe src={pdfUrl} title="Factura PDF" className="w-full h-[70vh] rounded-2xl border border-slate-200" />
        )}

        {view === 'nuevaClienta' && (
          <div className="space-y-3">
            {clientDraft ? (
              <div className="bg-indigo-50 border-2 border-indigo-100 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Nueva clienta</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="NOMBRE" value={clientDraft.name} onChange={(e) => setClientDraft({ ...clientDraft, name: e.target.value.toUpperCase() })} className="bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-bold outline-none uppercase" />
                  <input type="text" placeholder="APELLIDO" value={clientDraft.lastName} onChange={(e) => setClientDraft({ ...clientDraft, lastName: e.target.value.toUpperCase() })} className="bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-bold outline-none uppercase" />
                </div>
                <input type="tel" placeholder="TELÉFONO (Ej: 1122334455)" value={clientDraft.phone} onChange={(e) => setClientDraft({ ...clientDraft, phone: e.target.value })} className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-bold outline-none" />
                <button onClick={handleCreateAndLinkClient} disabled={linking || !clientDraft.name.trim() || !clientDraft.phone.trim()} className="w-full h-11 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase disabled:opacity-50 flex items-center justify-center gap-2">
                  {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />} Guardar y compartir
                </button>
              </div>
            ) : (
              <div className="relative">
                <ClientSearchInput value={clientSearchTerm} onChange={setClientSearchTerm} autoFocus />
                {clientSearchTerm.length >= 2 && (
                  <div className="mt-2 bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    {filteredClients.map(c => (
                      <button key={c.id} onClick={() => handleSelectExistingClient(c)} disabled={linking} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-none flex justify-between items-center disabled:opacity-50">
                        <div>
                          <p className="font-bold text-slate-700 text-xs uppercase">{c.name} {c.last_name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{c.phone}</p>
                        </div>
                        <UserCheck className="w-4 h-4 text-primary opacity-50" />
                      </button>
                    ))}
                    <button onClick={() => setClientDraft({ name: '', lastName: '', phone: '', email: '' })} className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-[10px] uppercase flex items-center gap-2">
                      <UserPlus className="w-4 h-4" /> Crear nueva clienta: "{clientSearchTerm.toUpperCase()}"
                    </button>
                  </div>
                )}
              </div>
            )}
            {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
          </div>
        )}

        {view === 'anular' && (
          <div className="space-y-4">
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
            {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
            <button
              onClick={handleAnular}
              disabled={ncLoading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all"
            >
              {ncLoading ? 'Emitiendo...' : 'Emitir Nota de Crédito'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
