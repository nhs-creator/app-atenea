import React, { useState } from 'react';
import { Lock, ShoppingBag, ArrowRight, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginViewProps {
  onLogin: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onLogin();
    } catch (err: any) {
      setError('Credenciales inválidas o acceso denegado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[100] flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-primary rounded-3xl shadow-xl shadow-teal-100 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Atenea <span className="text-primary">Finanzas</span></h1>
            <p className="text-slate-500 font-medium text-sm text-center">Panel de Administración Privado</p>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email de administrador"
                className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-primary transition-all"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-primary transition-all"
                required
              />
            </div>
          </div>
          
          {error && (
            <p className="text-center text-red-500 text-xs font-bold animate-shake">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Acceder al Sistema'} 
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-200 pt-4">
            Solo personal autorizado
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;