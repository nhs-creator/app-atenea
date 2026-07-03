import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Save } from 'lucide-react';

const AfipSection: React.FC = () => {
  const afipConfigData = useQuery(api.queries.afipConfig.getConfig);
  const upsertAfipConfig = useMutation(api.mutations.afipConfig.upsertConfig);
  const testAfipConnection = useAction(api.actions.afip.testConnection);

  const [afipCuit, setAfipCuit] = useState('');
  const [afipPuntoVenta, setAfipPuntoVenta] = useState('');
  const [afipRazonSocial, setAfipRazonSocial] = useState('');
  const [afipNombreFantasia, setAfipNombreFantasia] = useState('');
  const [afipDomicilio, setAfipDomicilio] = useState('');
  const [afipCondicionIva, setAfipCondicionIva] = useState('6');
  const [afipInicioActividades, setAfipInicioActividades] = useState('');
  const [afipIibb, setAfipIibb] = useState('');
  const [afipIsProduction, setAfipIsProduction] = useState(false);
  const [afipFacturarEfectivo, setAfipFacturarEfectivo] = useState(false);
  const [afipCertExpiration, setAfipCertExpiration] = useState('');
  const [afipLoaded, setAfipLoaded] = useState(false);
  const [afipSaving, setAfipSaving] = useState(false);
  const [afipError, setAfipError] = useState('');
  const [afipTesting, setAfipTesting] = useState(false);
  const [afipTestResult, setAfipTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (afipConfigData && !afipLoaded) {
      setAfipCuit(String(afipConfigData.cuit));
      setAfipPuntoVenta(String(afipConfigData.puntoVenta));
      setAfipRazonSocial(afipConfigData.razonSocial);
      setAfipNombreFantasia(afipConfigData.nombreFantasia ?? '');
      setAfipDomicilio(afipConfigData.domicilioComercial);
      setAfipCondicionIva(String(afipConfigData.condicionIva));
      setAfipInicioActividades(afipConfigData.inicioActividades);
      setAfipIibb(afipConfigData.iibb ?? '');
      setAfipIsProduction(afipConfigData.isProduction);
      setAfipFacturarEfectivo(afipConfigData.facturarEfectivo ?? false);
      setAfipCertExpiration(afipConfigData.certExpiration ?? '');
      setAfipLoaded(true);
    }
  }, [afipConfigData, afipLoaded]);

  const handleSaveAfipConfig = async () => {
    setAfipError('');
    setAfipSaving(true);
    try {
      await upsertAfipConfig({
        cuit: parseInt(afipCuit.replace(/\D/g, ''), 10),
        puntoVenta: parseInt(afipPuntoVenta, 10),
        razonSocial: afipRazonSocial.trim(),
        nombreFantasia: afipNombreFantasia.trim() || undefined,
        domicilioComercial: afipDomicilio.trim(),
        condicionIva: parseInt(afipCondicionIva, 10),
        inicioActividades: afipInicioActividades,
        iibb: afipIibb.trim() || undefined,
        isProduction: afipIsProduction,
        certExpiration: afipCertExpiration || undefined,
        facturarEfectivo: afipFacturarEfectivo,
      });
      alert('Configuración ARCA guardada correctamente.');
    } catch (e: any) {
      setAfipError(e.message || 'Error al guardar la configuración ARCA');
    } finally {
      setAfipSaving(false);
    }
  };

  const handleTestAfipConnection = async () => {
    setAfipTestResult(null);
    setAfipTesting(true);
    try {
      const res = await testAfipConnection({});
      setAfipTestResult({
        ok: true,
        message: `Conectado. Punto de venta ${res.puntoVenta}, último comprobante: ${res.lastVoucher}`,
      });
    } catch (e: any) {
      setAfipTestResult({ ok: false, message: e.message || 'No se pudo conectar con ARCA' });
    } finally {
      setAfipTesting(false);
    }
  };

  const certExpirationBadge = (() => {
    if (!afipCertExpiration) return null;
    const days = Math.ceil((new Date(afipCertExpiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const color = days <= 30 ? 'text-red-600 bg-red-50 border-red-200' : days <= 90 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200';
    return (
      <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${color}`}>
        {days >= 0 ? `Vence en ${days} días` : 'Certificado vencido'}
      </span>
    );
  })();

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">CUIT</label>
          <input type="text" value={afipCuit} onChange={(e) => setAfipCuit(e.target.value)} placeholder="20123456789" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Punto de venta</label>
          <input type="number" value={afipPuntoVenta} onChange={(e) => setAfipPuntoVenta(e.target.value)} placeholder="2" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nombre de fantasía (opcional)</label>
        <input type="text" value={afipNombreFantasia} onChange={(e) => setAfipNombreFantasia(e.target.value)} placeholder="Atenea Moda y Accesorios" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" />
        <p className="text-[10px] text-slate-500 mt-1">Aparece arriba del nombre legal en la factura. ARCA exige que la razón social igual figure.</p>
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Razón social</label>
        <input type="text" value={afipRazonSocial} onChange={(e) => setAfipRazonSocial(e.target.value)} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" />
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Domicilio comercial</label>
        <input type="text" value={afipDomicilio} onChange={(e) => setAfipDomicilio(e.target.value)} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Condición IVA</label>
          <select value={afipCondicionIva} onChange={(e) => setAfipCondicionIva(e.target.value)} className="w-full h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold">
            <option value="6">Responsable Monotributo</option>
            <option value="1">Responsable Inscripto</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Inicio de actividades</label>
          <input type="date" value={afipInicioActividades} onChange={(e) => setAfipInicioActividades(e.target.value)} className="w-full h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ingresos Brutos (opcional)</label>
        <input type="text" value={afipIibb} onChange={(e) => setAfipIibb(e.target.value)} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold" />
      </div>
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
        <div>
          <p className="text-xs font-bold text-slate-700">Entorno de producción</p>
          <p className="text-[10px] text-slate-500">Apagado = testing/homologación (no emite comprobantes reales)</p>
        </div>
        <button
          type="button"
          onClick={() => setAfipIsProduction(!afipIsProduction)}
          className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${afipIsProduction ? 'bg-red-500' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${afipIsProduction ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
        <div>
          <p className="text-xs font-bold text-slate-700">Facturar efectivo</p>
          <p className="text-[10px] text-slate-500">Apagado (default) = el efectivo nunca se factura, solo transferencia/débito/crédito</p>
        </div>
        <button
          type="button"
          onClick={() => setAfipFacturarEfectivo(!afipFacturarEfectivo)}
          className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${afipFacturarEfectivo ? 'bg-indigo-500' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${afipFacturarEfectivo ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Vencimiento del certificado (opcional)</label>
        <div className="flex items-center gap-2">
          <input type="date" value={afipCertExpiration} onChange={(e) => setAfipCertExpiration(e.target.value)} className="flex-1 h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
          {certExpirationBadge}
        </div>
      </div>

      {afipError && <p className="text-xs text-red-500 font-semibold">{afipError}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSaveAfipConfig}
          disabled={afipSaving}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
        >
          {afipSaving ? '...' : <><Save className="w-3.5 h-3.5" /> Guardar</>}
        </button>
        <button
          onClick={handleTestAfipConnection}
          disabled={afipTesting || !afipLoaded}
          className="flex-1 bg-white border-2 border-indigo-200 hover:border-indigo-400 text-indigo-600 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
        >
          {afipTesting ? '...' : 'Probar conexión'}
        </button>
      </div>
      {afipTestResult && (
        <p className={`text-xs font-semibold ${afipTestResult.ok ? 'text-emerald-600' : 'text-red-500'}`}>
          {afipTestResult.message}
        </p>
      )}
    </div>
  );
};

export default AfipSection;
