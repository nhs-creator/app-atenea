import React, { useMemo, useEffect, useState } from 'react';
import { MultiSaleData, CartItem, InventoryItem, Voucher, ProductDraft, Client } from '../types';
import { UserPlus, Search, UserCheck, X } from 'lucide-react';

// Subcomponentes modulares
import SalesHeader from './sales/SalesHeader';
import ProductEntry from './sales/ProductEntry';
import CartDisplay from './sales/CartDisplay';
import PaymentManager from './sales/PaymentManager';
import FinalTicket from './sales/FinalTicket';

interface SalesFormProps {
  onSubmit: (data: MultiSaleData) => void;
  inventory: InventoryItem[];
  clients: Client[];
  vouchers: Voucher[];
  initialData: MultiSaleData;
  onChange: (data: MultiSaleData) => void;
  onCancelEdit: () => void;
  nextSaleNumber: number;
}

const SalesForm: React.FC<SalesFormProps> = ({ 
  onSubmit, inventory, clients, vouchers, initialData, onChange, onCancelEdit 
}) => {
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // Helper central para notificar cambios al saleDraft de App.tsx
  const notifyChange = (updates: Partial<MultiSaleData>) => {
    onChange({ ...initialData, ...updates });
  };

  // Filtrado de clientas para búsqueda con protección contra nulos
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm || clientSearchTerm.length < 2) return [];
    const term = clientSearchTerm.toLowerCase();
    return clients.filter(c => 
      (c.name?.toLowerCase() || '').includes(term) || 
      (c.last_name?.toLowerCase() || '').includes(term) ||
      (c.phone || '').includes(term)
    ).slice(0, 5);
  }, [clients, clientSearchTerm]);

  // Clienta seleccionada actualmente
  const selectedClient = useMemo(() => {
    if (!initialData.clientId) return null;
    return clients.find(c => c.id === initialData.clientId);
  }, [initialData.clientId, clients]);

  // CÁLCULOS DE TOTALES, DESCUENTOS Y REDONDEO
  const totals = useMemo(() => {
    let subtotalLista = 0;
    let theoreticalTotal = 0; 
    const itemFinalPrices: Record<string, number> = {};
    
    initialData.items.forEach(item => {
      subtotalLista += item.listPrice * item.quantity;
      let price = item.listPrice;
      
      const hasDiscount = initialData.payments.some(
        p => p.method === 'Efectivo' && p.appliedToItems?.includes(item.id)
      );
      
      if (hasDiscount) price = Math.round(price * 0.9);
      
      itemFinalPrices[item.id] = price;
      theoreticalTotal += price * item.quantity;
    });

    const paid = initialData.payments.reduce((sum, p) => sum + p.amount, 0);
    const hasRounding = initialData.payments.some(p => p.method === 'Efectivo' && p.roundingBase);
    const totalNetoCalculado = hasRounding ? paid : theoreticalTotal;

    const remaining = totalNetoCalculado - paid;
    const ahorroTotal = subtotalLista - totalNetoCalculado;

    return { 
      subtotalLista, 
      totalConDescuentos: totalNetoCalculado, 
      theoreticalTotal,
      ahorro: ahorroTotal, 
      paid, 
      remaining, 
      itemFinalPrices 
    };
  }, [initialData.items, initialData.payments]);

  const handleEditItem = (item: CartItem) => {
    notifyChange({ 
      items: initialData.items.filter(i => i.id !== item.id),
      productDraft: {
        name: item.product,
        price: item.listPrice.toString(),
        quantity: item.quantity.toString(),
        size: item.size,
        inventoryId: item.inventory_id || ''
      }
    });
  };

  return (
    <div className="space-y-4 pb-32 animate-in fade-in duration-300">
      <SalesHeader 
        date={initialData.date}
        onDateChange={(date) => notifyChange({ date })}
        hasItems={initialData.items.length > 0}
        onClear={() => notifyChange({ items: [], payments: [], clientId: undefined, clientDraft: undefined })}
        isEdit={initialData.isEdit}
        originalClientNumber={initialData.originalClientNumber}
        onCancelEdit={onCancelEdit}
      />

      <ProductEntry 
        inventory={inventory}
        current={initialData.productDraft || { name: '', price: '', quantity: '1', size: '', inventoryId: '' }}
        onCurrentChange={(updates) => notifyChange({ 
          productDraft: { ...(initialData.productDraft || { name: '', price: '', quantity: '1', size: '', inventoryId: '' }), ...updates } 
        })}
        onAdd={(item) => notifyChange({ 
          items: [...initialData.items, item],
          productDraft: { name: '', price: '', quantity: '1', size: '', inventoryId: '' }
        })}
        cartItems={initialData.items}
      />

      <CartDisplay 
        items={initialData.items}
        itemFinalPrices={totals.itemFinalPrices}
        onRemove={(id) => notifyChange({ items: initialData.items.filter(i => i.id !== id) })}
        onEdit={handleEditItem}
      />

      {/* SECCIÓN DE CLIENTA */}
      <div className="bg-white rounded-[2.5rem] shadow-xl p-6 border border-slate-100 space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Datos de la Clienta</h3>
          {initialData.clientId && (
            <button 
              onClick={() => notifyChange({ clientId: undefined, clientDraft: undefined })}
              className="text-rose-500 text-[10px] font-black uppercase flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Quitar
            </button>
          )}
        </div>

        {selectedClient ? (
          <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl flex items-center gap-4 animate-in zoom-in-95">
            <div className="bg-emerald-500 p-3 rounded-xl shadow-lg shadow-emerald-200">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-slate-800 uppercase text-sm leading-tight">{selectedClient.name} {selectedClient.last_name}</p>
              <p className="text-xs font-bold text-emerald-600">{selectedClient.phone}</p>
            </div>
          </div>
        ) : initialData.clientDraft ? (
          <div className="bg-indigo-50 border-2 border-indigo-100 p-4 rounded-2xl space-y-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500 p-2 rounded-lg shadow-md"><UserPlus className="w-4 h-4 text-white" /></div>
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Nueva Clienta</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="text" placeholder="NOMBRE" 
                value={initialData.clientDraft.name}
                onChange={(e) => notifyChange({ clientDraft: { ...initialData.clientDraft!, name: e.target.value.toUpperCase() }})}
                className="bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-300 uppercase"
              />
              <input 
                type="text" placeholder="APELLIDO" 
                value={initialData.clientDraft.lastName}
                onChange={(e) => notifyChange({ clientDraft: { ...initialData.clientDraft!, lastName: e.target.value.toUpperCase() }})}
                className="bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-300 uppercase"
              />
            </div>
            <input 
              type="tel" placeholder="TELÉFONO (Ej: 1122334455)" 
              value={initialData.clientDraft.phone}
              onChange={(e) => notifyChange({ clientDraft: { ...initialData.clientDraft!, phone: e.target.value }})}
              className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-300"
            />
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="text" 
              placeholder="BUSCAR POR NOMBRE O TEL..." 
              value={clientSearchTerm}
              onChange={(e) => setClientSearchTerm(e.target.value)}
              className="w-full h-14 pl-11 pr-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold text-xs outline-none focus:border-primary transition-all uppercase"
            />
            
            {clientSearchTerm.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                {filteredClients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      notifyChange({ clientId: c.id });
                      setClientSearchTerm('');
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-none flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-700 text-xs uppercase">{c.name} {c.last_name}</p>
                      <p className="text-[10px] font-bold text-slate-400">{c.phone}</p>
                    </div>
                    <UserCheck className="w-4 h-4 text-primary opacity-50" />
                  </button>
                ))}
                <button
                  onClick={() => {
                    notifyChange({ clientDraft: { name: '', lastName: '', phone: '', email: '' }});
                    setClientSearchTerm('');
                  }}
                  className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-[10px] uppercase flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Crear nueva clienta: "{clientSearchTerm.toUpperCase()}"
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <PaymentManager 
        payments={initialData.payments}
        onPaymentsChange={(payments) => notifyChange({ payments })}
        vouchers={vouchers}
        totalNeto={totals.theoreticalTotal}
        paidAmount={totals.paid}
        remainingAmount={totals.remaining}
        cartItems={initialData.items}
      />

      <FinalTicket 
        items={initialData.items}
        itemFinalPrices={totals.itemFinalPrices}
        subtotalLista={totals.subtotalLista}
        totalNeto={totals.totalConDescuentos}
        ahorro={totals.ahorro}
        remainingAmount={totals.remaining}
        isEdit={initialData.isEdit}
        clientId={initialData.clientId}
        clientDraft={initialData.clientDraft}
        sendWhatsApp={initialData.sendWhatsApp}
        onWhatsAppToggle={(val) => notifyChange({ sendWhatsApp: val })}
        onSubmit={() => onSubmit({ 
          ...initialData, 
          items: initialData.items.map(i => ({ ...i, finalPrice: totals.itemFinalPrices[i.id] })) 
        })}
      />
    </div>
  );
};

export default SalesForm;