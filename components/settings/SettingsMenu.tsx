import React from 'react';
import { ChevronRight, Store, UserPlus, FileBarChart, ShieldCheck, List, Ruler, LucideIcon } from 'lucide-react';

export type SettingsSectionKey = 'hours' | 'accountants' | 'monotributo' | 'afip' | 'catalog' | 'sizes';

interface SectionMeta {
  key: SettingsSectionKey;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
}

export const SETTINGS_SECTIONS: SectionMeta[] = [
  { key: 'hours', title: 'Días que abre el local', description: 'Define qué días se muestran en el gráfico de tendencia de Reportes', icon: Store, iconColor: 'text-emerald-500' },
  { key: 'accountants', title: 'Contadoras', description: 'Creá una cuenta para tu contadora con email y contraseña', icon: UserPlus, iconColor: 'text-indigo-500' },
  { key: 'monotributo', title: 'Monotributo', description: 'Escala AFIP de categorías y categoría actual', icon: FileBarChart, iconColor: 'text-emerald-500' },
  { key: 'afip', title: 'Configuración AFIP', description: 'CUIT, punto de venta y credenciales para Factura C', icon: ShieldCheck, iconColor: 'text-indigo-500' },
  { key: 'catalog', title: 'Gestión de Catálogo', description: 'Categorías, subcategorías y materiales', icon: List, iconColor: 'text-indigo-500' },
  { key: 'sizes', title: 'Gestión de Talles', description: 'Sistemas de talles y qué categoría usa cada uno', icon: Ruler, iconColor: 'text-amber-500' },
];

interface SettingsMenuProps {
  onSelect: (key: SettingsSectionKey) => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onSelect }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
      {SETTINGS_SECTIONS.map(({ key, title, description, icon: Icon, iconColor }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className="w-full flex items-center gap-3 p-4 text-left active:bg-slate-50 transition-colors"
        >
          <div className={`w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-700 text-sm">{title}</p>
            <p className="text-xs text-slate-500 truncate">{description}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
        </button>
      ))}
    </div>
  );
};

export default SettingsMenu;
