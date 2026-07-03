import React from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { LogOut } from 'lucide-react';

const LogoutButton: React.FC = () => {
  const { signOut } = useAuthActions();

  const handleClick = () => {
    if (window.confirm('¿Cerrar sesión?')) {
      void signOut();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-rose-100 text-rose-500 font-black text-xs uppercase active:scale-[0.98] transition-all"
    >
      <LogOut className="w-4 h-4" /> Cerrar sesión
    </button>
  );
};

export default LogoutButton;
