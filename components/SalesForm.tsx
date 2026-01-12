import React, { useMemo, useEffect } from 'react';
import { MultiSaleData, CartItem, InventoryItem, Voucher, ProductDraft } from '../types';

// Subcomponentes modulares
import SalesHeader from './sales/SalesHeader';
import ProductEntry from './sales/ProductEntry';
import CartDisplay from './sales/CartDisplay';
import PaymentManager from './sales/PaymentManager';
import FinalTicket from './sales/FinalTicket';

interface SalesFormProps {
  onSubmit: (data: MultiSaleData) => void;
  inventory: InventoryItem[];
  vouchers: Voucher[];
  initialData: MultiSaleData;
  onChange: (data: MultiSaleData) => void;
  onCancelEdit: () => void;
  nextSaleNumber: number;
}

const SalesForm: React.FC<SalesFormProps> = ({ 
  onSubmit, inventory, vouchers, initialData, onChange, onCancelEdit 
}) => {

  // Helper central para notificar cambios al saleDraft de App.tsx
  const notifyChange = (updates: Partial<MultiSaleData>) => {
    onChange({ ...initialData, ...updates });
  };

  // CÁLCULOS DE TOTALES, DESCUENTOS Y REDONDEO
  const totals = useMemo(() => {
    let subtotalLista = 0;
    let theoreticalTotal = 0; // El total real bonificado pero SIN redondeo de caja
    const itemFinalPrices: Record<string, number> = {};
    
    // 1. Calculamos subtotal base con el 10% off por ítem seleccionado
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
    
    // El "Total Neto" de la venta se adapta si tu mamá eligió un redondeo manual
    const hasRounding = initialData.payments.some(p => p.method === 'Efectivo' && p.roundingBase);
    const totalNetoCalculado = hasRounding ? paid : theoreticalTotal;

    const remaining = totalNetoCalculado - paid;
    const ahorroTotal = subtotalLista - totalNetoCalculado;

    return { 
      subtotalLista, 
      totalConDescuentos: totalNetoCalculado, 
      theoreticalTotal, // Este valor es la "memoria" para el redondeo
      ahorro: ahorroTotal, 
      paid, 
      remaining, 
      itemFinalPrices 
    };
  }, [initialData.items, initialData.payments]);

  // Balanceo Automático de Pagos (Solo si no hay redondeo manual activo)
  useEffect(() => {
    if (initialData.payments.length === 0) return;
    
    const hasManualRounding = initialData.payments.some(p => p.roundingBase);
    if (hasManualRounding) return;

    if (initialData.payments.length === 1) {
      if (initialData.payments[0].amount !== totals.totalConDescuentos) {
        const newPayments = [{ ...initialData.payments[0], amount: Math.max(0, totals.totalConDescuentos) }];
        notifyChange({ payments: newPayments });
      }
    } else if (initialData.payments.length === 2) {
      const totalActual = initialData.payments[0].amount + initialData.payments[1].amount;
      if (totalActual !== totals.totalConDescuentos) {
        const newPayments = [...initialData.payments];
        newPayments[1].amount = Math.max(0, totals.totalConDescuentos - newPayments[0].amount);
        notifyChange({ payments: newPayments });
      }
    }
  }, [totals.totalConDescuentos]);

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
        onClear={() => notifyChange({ items: [], payments: [] })}
        isEdit={initialData.isEdit}
        originalClientNumber={initialData.originalClientNumber}
        onCancelEdit={onCancelEdit}
      />

      <ProductEntry 
        inventory={inventory}
        current={initialData.productDraft || { name: '', price: '', quantity: '1', size: 'U', inventoryId: '' }}
        onCurrentChange={(updates) => notifyChange({ 
          productDraft: { ...(initialData.productDraft || { name: '', price: '', quantity: '1', size: 'U', inventoryId: '' }), ...updates } 
        })}
        onAdd={(item) => notifyChange({ 
          items: [...initialData.items, item],
          productDraft: { name: '', price: '', quantity: '1', size: 'U', inventoryId: '' }
        })}
      />

      <CartDisplay 
        items={initialData.items}
        itemFinalPrices={totals.itemFinalPrices}
        onRemove={(id) => notifyChange({ items: initialData.items.filter(i => i.id !== id) })}
        onEdit={handleEditItem}
      />

      <PaymentManager 
        payments={initialData.payments}
        onPaymentsChange={(payments) => notifyChange({ payments })}
        vouchers={vouchers}
        totalNeto={totals.theoreticalTotal} // PASAMOS EL TEÓRICO COMO BASE DE REDONDEO
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
        onSubmit={() => onSubmit({ 
          ...initialData, 
          items: initialData.items.map(i => ({ ...i, finalPrice: totals.itemFinalPrices[i.id] })) 
        })}
      />
    </div>
  );
};

export default SalesForm;