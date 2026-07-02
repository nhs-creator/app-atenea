import React, { useState } from 'react';
import { X, FileText, AlertTriangle, CheckCircle2, Share2 } from 'lucide-react';
import { generateFacturaPdf, facturaPdfFilename, shareOrDownloadFacturaPdf, FacturaPdfItem } from '../lib/generateFacturaPdf';

const DOC_TIPO_OPTIONS = [
  { value: 80, label: 'CUIT' },
  { value: 86, label: 'CUIL' },
  { value: 96, label: 'DNI' },
  { value: 99, label: 'Consumidor Final' },
];

const CONDICION_IVA_OPTIONS = [
  { value: 1, label: 'IVA Responsable Inscripto' },
  { value: 4, label: 'IVA Sujeto Exento' },
  { value: 5, label: 'Consumidor Final' },
  { value: 6, label: 'Responsable Monotributo' },
];

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

interface FacturarModalProps {
  clientNumber: string;
  total: number;
  items: FacturaPdfItem[];
  clientName?: string;
  afipConfig?: { razonSocial: string; cuit: number; domicilioComercial: string; condicionIva: number } | null;
  onClose: () => void;
  onEmitir: (args: { clientNumber: string; docTipo: number; docNro: number; condicionIvaReceptor: number }) => Promise<EmitirFacturaResult>;
}

const FacturarModal: React.FC<FacturarModalProps> = ({ clientNumber, total, items, clientName, afipConfig, onClose, onEmitir }) => {
  const [docTipo, setDocTipo] = useState(99);
  const [docNro, setDocNro] = useState('');
  const [condicionIva, setCondicionIva] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [result, setResult] = useState<{
    fiscalNumber: string; cae: string; caeExpiration: string;
    qrData: string; importeTotal: number; fecha: string;
  } | null>(null);

  const handleEmitir = async () => {
    setError('');
    setLoading(true);
    const res = await onEmitir({
      clientNumber,
      docTipo,
      docNro: docTipo === 99 ? 0 : parseInt(docNro, 10) || 0,
      condicionIvaReceptor: condicionIva,
    });
    setLoading(false);
    if (res.success && res.fiscalNumber && res.cae && res.caeExpiration && res.qrData && res.importeTotal != null && res.fecha) {
      setResult({
        fiscalNumber: res.fiscalNumber, cae: res.cae, caeExpiration: res.caeExpiration,
        qrData: res.qrData, importeTotal: res.importeTotal, fecha: res.fecha,
      });
    } else {
      setError(res.error || 'Error al emitir la factura');
    }
  };

  const handleCompartirPdf = async () => {
    if (!result || !afipConfig) return;
    setSharing(true);
    try {
      const doc = await generateFacturaPdf({
        fiscalNumber: result.fiscalNumber,
        cae: result.cae,
        caeExpiration: result.caeExpiration,
        qrData: result.qrData,
        importeTotal: result.importeTotal,
        fecha: result.fecha,
        totalVenta: total,
        items,
        docTipo,
        docNro: docTipo === 99 ? 0 : parseInt(docNro, 10) || 0,
        condicionIvaReceptor: condicionIva,
        clientName,
        afipConfig: {
          razonSocial: afipConfig.razonSocial,
          cuit: afipConfig.cuit,
          domicilioComercial: afipConfig.domicilioComercial,
          condicionIva: afipConfig.condicionIva,
        },
      });

      await shareOrDownloadFacturaPdf(doc, facturaPdfFilename(result.fiscalNumber));
    } catch (e) {
      console.error(e);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md sm:m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" /> Facturar {clientNumber}
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {result ? (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-black text-emerald-700 text-lg">{result.fiscalNumber}</p>
              <p className="text-xs text-emerald-600">CAE: {result.cae}</p>
              <p className="text-xs text-emerald-600">Vence: {result.caeExpiration}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCompartirPdf}
                  disabled={sharing || !afipConfig}
                  className="flex-1 bg-white border-2 border-emerald-300 text-emerald-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5" /> {sharing ? 'Generando...' : 'Compartir PDF'}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs active:scale-95 transition-all"
                >
                  Listo
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Total a facturar</span>
                <span className="text-lg font-black text-slate-800">${total.toLocaleString('es-AR')}</span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Tipo de documento
                </label>
                <select
                  value={docTipo}
                  onChange={(e) => setDocTipo(parseInt(e.target.value, 10))}
                  className="w-full h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  {DOC_TIPO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {docTipo !== 99 && (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Número de documento
                  </label>
                  <input
                    type="text"
                    value={docNro}
                    onChange={(e) => setDocNro(e.target.value.replace(/\D/g, ''))}
                    placeholder="Sin guiones"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Condición IVA del cliente
                </label>
                <select
                  value={condicionIva}
                  onChange={(e) => setCondicionIva(parseInt(e.target.value, 10))}
                  className="w-full h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  {CONDICION_IVA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-700">
                  Una vez emitida, la Factura C no se puede anular ni corregir — solo se puede compensar con una Nota de Crédito.
                </p>
              </div>

              {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

              <button
                onClick={handleEmitir}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all"
              >
                {loading ? 'Emitiendo...' : 'Emitir Factura C'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacturarModal;
