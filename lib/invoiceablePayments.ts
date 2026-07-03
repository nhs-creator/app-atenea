export interface PaymentLike {
  method: string;
  amount: number;
}

/**
 * Medios de pago facturables. Por default el efectivo no se factura (regla
 * de negocio original de Atenea — ventas en efectivo no se declaran), pero es
 * configurable por comercio vía `afipConfig.facturarEfectivo` (Ajustes → AFIP)
 * para otros negocios que sí necesiten facturar todo. "Vale" nunca cuenta —
 * no es un cobro real, es saldo a favor previo.
 */
export function filterInvoiceablePayments<T extends PaymentLike>(payments: T[], facturarEfectivo: boolean): T[] {
  return payments.filter((p) =>
    p.method === 'Transferencia' || p.method === 'Débito' || p.method === 'Crédito' || (facturarEfectivo && p.method === 'Efectivo')
  );
}

export function sumInvoiceablePayments(payments: PaymentLike[], facturarEfectivo: boolean): number {
  return filterInvoiceablePayments(payments, facturarEfectivo).reduce((sum, p) => sum + p.amount, 0);
}
