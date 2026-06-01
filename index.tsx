import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import App from './App';
import './index.css';

const convex = new ConvexReactClient((import.meta as any).env.VITE_CONVEX_URL as string);

// Limpieza de Service Worker: el SW "network-first" anterior re-descargaba toda
// la app desde Netlify en cada apertura y disparó el consumo de bandwidth.
// Desregistramos cualquier SW que haya quedado y borramos sus cachés.
// NO volvemos a registrar nada (si registráramos, el kill-switch entraría en
// un loop de recargas).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => registrations.forEach((r) => r.unregister()))
    .catch(() => {});
  if ('caches' in window) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {});
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <ConvexAuthProvider client={convex}>
        <App />
      </ConvexAuthProvider>
    </ConvexProvider>
  </React.StrictMode>
);