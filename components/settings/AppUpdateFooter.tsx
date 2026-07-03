import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Atenea no usa Service Worker (se sacó a propósito — ver index.tsx: uno
 * "network-first" viejo generó un consumo de bandwidth enorme en Netlify).
 * Por eso "buscar actualización" no tiene con quién hablar como en una PWA
 * típica — lo único que podemos hacer es forzar que el navegador pida todo
 * de nuevo, en vez de confiar en cualquier caché (el bug real que motivó
 * este botón: en iOS, la PWA instalada a veces no revalida sola aunque el
 * servidor ya tenga la versión nueva, y hay que cerrarla del todo a mano).
 */
const AppUpdateFooter: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // no hay nada que limpiar, seguimos igual
    }
    // Navegar a una URL con query param nuevo evita que quede pegado a
    // cualquier copia cacheada de esta URL exacta (recarga normal no alcanza
    // siempre en modo standalone de iOS).
    const url = new URL(window.location.href);
    url.searchParams.set('_refresh', String(Date.now()));
    window.location.href = url.toString();
  };

  return (
    <div className="flex items-center justify-between px-2 py-3">
      <span className="text-[11px] font-bold text-slate-400">Versión {__APP_VERSION__}</span>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="flex items-center gap-1.5 text-[11px] font-black uppercase text-indigo-600 hover:text-indigo-700 disabled:opacity-50 active:scale-95 transition-all"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'Actualizando…' : 'Buscar actualización'}
      </button>
    </div>
  );
};

export default AppUpdateFooter;
