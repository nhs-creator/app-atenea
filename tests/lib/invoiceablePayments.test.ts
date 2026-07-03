import { describe, it, expect } from "bun:test";
import { filterInvoiceablePayments, sumInvoiceablePayments } from '../../lib/invoiceablePayments';

const payments = [
  { method: 'Efectivo', amount: 10000 },
  { method: 'Transferencia', amount: 20000 },
  { method: 'Débito', amount: 5000 },
  { method: 'Crédito', amount: 3000 },
  { method: 'Vale', amount: 1000 },
];

describe('filterInvoiceablePayments', () => {
  it('excluye efectivo y vale por default (facturarEfectivo = false)', () => {
    const result = filterInvoiceablePayments(payments, false);
    expect(result.map(p => p.method)).toEqual(['Transferencia', 'Débito', 'Crédito']);
  });

  it('incluye efectivo cuando facturarEfectivo = true, pero sigue excluyendo vale', () => {
    const result = filterInvoiceablePayments(payments, true);
    expect(result.map(p => p.method)).toEqual(['Efectivo', 'Transferencia', 'Débito', 'Crédito']);
  });
});

describe('sumInvoiceablePayments', () => {
  it('suma solo lo facturable por default', () => {
    expect(sumInvoiceablePayments(payments, false)).toBe(28000);
  });

  it('suma todo incluido efectivo cuando facturarEfectivo = true', () => {
    expect(sumInvoiceablePayments(payments, true)).toBe(38000);
  });

  it('nunca cuenta vale, ni con facturarEfectivo activado', () => {
    expect(sumInvoiceablePayments([{ method: 'Vale', amount: 999 }], true)).toBe(0);
  });
});
