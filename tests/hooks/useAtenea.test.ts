import { describe, it, expect, vi, beforeEach } from "bun:test";
import { renderHook, act } from '@testing-library/react';
import { useAtenea } from '../../hooks/useAtenea';

// Mock de Supabase - la cadena debe ser awaitable (Promise-like)
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

function createChain(promise: Promise<any>) {
  const chain: any = Object.assign(promise, {
    select: (...args: any[]) => {
      mockSelect(args);
      return createChain(promise);
    },
    insert: (data: any) => {
      mockInsert(data);
      return createChain(promise);
    },
    delete: () => {
      mockDelete();
      return createChain(promise);
    },
    eq: () => createChain(promise),
    order: () => createChain(promise),
    limit: () => createChain(promise),
    single: () => createChain(promise),
  });
  return chain;
}

let selectResponse: { data: any[]; error: null } = { data: [], error: null };

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'sales') {
        return createChain(Promise.resolve(selectResponse));
      }
      return createChain(Promise.resolve({ data: [], error: null }));
    },
  },
}));

const mockSession = {
  user: { id: 'user-123' },
} as any;

const baseSaleData = {
  date: '2025-02-28',
  items: [
    {
      id: 'item-1',
      product: 'Remera',
      quantity: 1,
      listPrice: 5000,
      finalPrice: 5000,
      size: 'M',
      cost_price: 0,
      isReturn: false,
    },
  ],
  payments: [{ method: 'Efectivo', amount: 5000 }],
};

describe('useAtenea - flujo de carga de ventas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResponse = { data: [], error: null };
  });

  describe('saveMultiSale - generación de client_number', () => {
    it('primera venta del día recibe V250228-001', async () => {
      selectResponse = { data: [], error: null };

      const { result } = renderHook(() => useAtenea(mockSession));

      let res: Awaited<ReturnType<typeof result.current.saveMultiSale>>;
      await act(async () => {
        res = await result.current.saveMultiSale({
          ...baseSaleData,
          isEdit: false,
        });
      });

      expect(res?.success).toBe(true);
      expect(res?.client_number).toBe('V250228-001');
    });

    it('segunda venta del día recibe V250228-002 cuando la DB ya tiene 001', async () => {
      selectResponse = {
        data: [
          { client_number: 'V250228-001' },
          { client_number: 'V250228-001' },
        ],
        error: null,
      };

      const { result } = renderHook(() => useAtenea(mockSession));

      let res: Awaited<ReturnType<typeof result.current.saveMultiSale>>;
      await act(async () => {
        res = await result.current.saveMultiSale({
          ...baseSaleData,
          isEdit: false,
        });
      });

      expect(res?.success).toBe(true);
      expect(res?.client_number).toBe('V250228-002');
    });

    it('edit preserva originalClientNumber', async () => {
      selectResponse = { data: [], error: null };

      const { result } = renderHook(() => useAtenea(mockSession));

      let res: Awaited<ReturnType<typeof result.current.saveMultiSale>>;
      await act(async () => {
        res = await result.current.saveMultiSale({
          ...baseSaleData,
          isEdit: true,
          originalClientNumber: 'V250228-001',
        });
      });

      expect(res?.success).toBe(true);
      expect(res?.client_number).toBe('V250228-001');
    });
  });
});
