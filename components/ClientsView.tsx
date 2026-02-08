import React, { useState, useMemo } from 'react';
import { 
  UserPlus, Search, Phone, Mail, Trash2, 
  Edit3, User, ChevronLeft, X 
} from 'lucide-react';
import { Client } from '../types';

interface ClientsViewProps {
  clients: Client[];
  onAdd: (client: Omit<Client, 'id' | 'created_at' | 'user_id'>) => Promise<any>;
  onUpdate: (client: Partial<Client> & { id: string }) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

const ClientsView: React.FC<ClientsViewProps> = ({ clients, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      (c.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm)
    ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [clients, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    if (editingId) {
      await onUpdate({ id: editingId, ...formData });
    } else {
      await onAdd(formData);
    }

    setFormData({ name: '', phone: '', email: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (client: Client) => {
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || ''
    });
    setEditingId(client.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      {/* Header y Buscador */}
      {!showForm && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Mis Clientes</h2>
            <button 
              onClick={() => setShowForm(true)}
              className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20 active:scale-90 transition-all flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase">Nuevo</span>
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o celular..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 pl-11 pr-10 rounded-2xl bg-white border-2 border-slate-100 shadow-sm font-bold text-sm outline-none focus:border-primary transition-all uppercase tracking-tighter" 
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full text-slate-400"><X className="w-3 h-3" /></button>
            )}
          </div>
        </div>
      )}

      {/* Formulario de Alta/Edición */}
      {showForm && (
        <div className="bg-white rounded-[2.5rem] p-6 border-2 border-slate-100 shadow-xl animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-2 text-slate-400"><ChevronLeft /></button>
            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre Completo</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-primary"
                placeholder="EJ: MARÍA PÉREZ"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Celular (WhatsApp)</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-primary"
                placeholder="EJ: 1122334455"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email (Opcional)</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-primary"
                placeholder="EJ: maria@gmail.com"
              />
            </div>

            <button 
              type="submit"
              className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-widest text-sm"
            >
              {editingId ? 'Guardar Cambios' : 'Registrar Cliente'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de Clientes */}
      {!showForm && (
        <div className="grid gap-3">
          {filteredClients.map(client => (
            <div key={client.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-primary border border-slate-100">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm uppercase tracking-tighter">{client.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <Phone className="w-3 h-3" /> {client.phone}
                    </span>
                    {client.email && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Mail className="w-3 h-3" /> {client.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-1">
                <button 
                  onClick={() => handleEdit(client)}
                  className="p-3 text-slate-400 hover:text-primary active:scale-90 transition-all"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => { if(window.confirm('¿Borrar cliente?')) onDelete(client.id); }}
                  className="p-3 text-rose-300 hover:text-rose-500 active:scale-90 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="text-center py-20 opacity-20">
              <User className="w-16 h-16 mx-auto mb-2" />
              <p className="font-black uppercase text-xs tracking-[0.2em]">Sin clientes encontrados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientsView;