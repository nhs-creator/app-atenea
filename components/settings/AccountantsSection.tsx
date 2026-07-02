import React, { useState } from 'react';
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Plus, X } from 'lucide-react';

const AccountantsSection: React.FC = () => {
  const accountants = useQuery(api.queries.profiles.getMyAccountants) ?? [];
  const createAccountantAction = useAction(api.actions.createAccountant.createAccountant);
  const removeAccountant = useMutation(api.mutations.profiles.removeAccountant);
  const [accountantEmail, setAccountantEmail] = useState('');
  const [accountantPassword, setAccountantPassword] = useState('');
  const [accountantError, setAccountantError] = useState('');
  const [accountantLoading, setAccountantLoading] = useState(false);

  const handleAddAccountant = async () => {
    if (!accountantEmail.trim() || !accountantPassword.trim()) return;
    if (accountantPassword.length < 6) {
      setAccountantError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setAccountantError('');
    setAccountantLoading(true);
    try {
      await createAccountantAction({ email: accountantEmail.trim(), password: accountantPassword });
      setAccountantEmail('');
      setAccountantPassword('');
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('already exists') || msg.includes('already been used')) {
        setAccountantError('Ya existe una cuenta con ese email');
      } else {
        setAccountantError(msg || 'Error al crear cuenta');
      }
    } finally {
      setAccountantLoading(false);
    }
  };

  const handleRemoveAccountant = async (profileId: Id<"profiles">) => {
    if (!window.confirm('¿Quitar esta contadora?')) return;
    try {
      await removeAccountant({ accountantProfileId: profileId });
    } catch (e: any) {
      setAccountantError(e.message || 'Error al quitar contadora');
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="space-y-2">
        <input
          type="email"
          value={accountantEmail}
          onChange={(e) => setAccountantEmail(e.target.value)}
          placeholder="Email de la contadora..."
          className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
          disabled={accountantLoading}
        />
        <div className="flex gap-2">
          <input
            type="password"
            value={accountantPassword}
            onChange={(e) => setAccountantPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddAccountant()}
            placeholder="Contraseña..."
            className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold"
            disabled={accountantLoading}
          />
          <button
            onClick={handleAddAccountant}
            disabled={accountantLoading || !accountantEmail.trim() || !accountantPassword.trim()}
            className="bg-indigo-600 text-white px-4 h-10 rounded-lg flex items-center justify-center gap-1.5 active:scale-90 disabled:opacity-50 text-xs font-bold"
          >
            {accountantLoading ? '...' : <><Plus className="w-4 h-4" /> Crear</>}
          </button>
        </div>
      </div>
      {accountantError && (
        <p className="text-xs text-red-500 font-semibold">{accountantError}</p>
      )}
      {accountants.length > 0 ? (
        <div className="space-y-2">
          {accountants.map((a) => (
            <div key={a.profileId} className="flex items-center justify-between bg-indigo-50 px-3 py-2.5 rounded-xl border border-indigo-100">
              <div>
                <span className="text-xs font-bold text-indigo-700">{a.email}</span>
                <span className="ml-2 text-[9px] font-black bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded uppercase">Contadora</span>
              </div>
              <button
                onClick={() => handleRemoveAccountant(a.profileId)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Quitar contadora"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 text-center py-2">No hay contadoras asignadas</p>
      )}
    </div>
  );
};

export default AccountantsSection;
