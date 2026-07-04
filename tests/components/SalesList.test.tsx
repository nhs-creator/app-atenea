import { describe, it, expect, vi, beforeEach } from "bun:test";
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesList from '../../components/SalesList';
import { Sale } from '../../types';

// Mock useLocalStorage para controlar búsqueda y filtros (el día ahora es un prop controlado por el padre)
vi.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage: vi.fn((key: string, initial: string) => {
    if (key.includes('search')) return ['', vi.fn()];
    return [initial, vi.fn()];
  }),
}));

function createSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 'id-1',
    user_id: 'user-1',
    date: '2025-02-28',
    client_number: 'V250228-001',
    product_name: 'Remera',
    quantity: 1,
    price: 5000,
    cost_price: 0,
    payment_method: 'Efectivo',
    payment_details: [{ method: 'Efectivo', amount: 5000 }],
    status: 'completed',
    created_at: '2025-02-28T12:00:00Z',
    updated_at: '2025-02-28T12:00:00Z',
    ...overrides,
  };
}

describe('SalesList - flujo de carga de ventas', () => {
  const noop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('agrupamiento por client_number', () => {
    it('cada client_number único se muestra en una card separada', () => {
      const sales: Sale[] = [
        createSale({ id: '1', client_number: 'V250228-001', product_name: 'Remera' }),
        createSale({ id: '2', client_number: 'V250228-001', product_name: 'Pantalón' }),
        createSale({ id: '3', client_number: 'V250228-002', product_name: 'Camisa' }),
      ];

      render(<SalesList sales={sales} date="2025-02-28" onDelete={noop} onEdit={noop} onReturn={noop} />);

      const cards = screen.getAllByRole('heading', { level: 3 });
      expect(cards).toHaveLength(2);

      expect(cards[0]).toHaveTextContent('V250228-002');
      expect(cards[1]).toHaveTextContent('V250228-001');
    });

    it('una venta con múltiples productos aparece en una sola card', () => {
      const sales: Sale[] = [
        createSale({ id: '1', client_number: 'V250228-001', product_name: 'Remera' }),
        createSale({ id: '2', client_number: 'V250228-001', product_name: 'Pantalón' }),
      ];

      render(<SalesList sales={sales} date="2025-02-28" onDelete={noop} onEdit={noop} onReturn={noop} />);

      const cards = screen.getAllByRole('heading', { level: 3 });
      expect(cards).toHaveLength(1);
      expect(cards[0]).toHaveTextContent('V250228-001');

      expect(screen.getByText(/Remera/i)).toBeInTheDocument();
      expect(screen.getByText(/Pantalón/i)).toBeInTheDocument();
    });

    it('ventas con mismo client_number (bug) se amontonan en una card', () => {
      const sales: Sale[] = [
        createSale({ id: '1', client_number: 'V250228-001', product_name: 'Venta A - Item 1' }),
        createSale({ id: '2', client_number: 'V250228-001', product_name: 'Venta B - Item 1' }),
        createSale({ id: '3', client_number: 'V250228-001', product_name: 'Venta C - Item 1' }),
      ];

      render(<SalesList sales={sales} date="2025-02-28" onDelete={noop} onEdit={noop} onReturn={noop} />);

      const cards = screen.getAllByRole('heading', { level: 3 });
      expect(cards).toHaveLength(1);
      expect(screen.getByText(/Venta A - Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Venta B - Item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Venta C - Item 1/i)).toBeInTheDocument();
    });
  });

  describe('filtrado por día', () => {
    it('solo muestra ventas del día seleccionado', () => {
      const sales: Sale[] = [
        createSale({ date: '2025-02-15', client_number: 'V250215-001' }),
        createSale({ date: '2025-02-16', client_number: 'V250216-001' }),
      ];

      render(<SalesList sales={sales} date="2025-02-15" onDelete={noop} onEdit={noop} onReturn={noop} />);

      expect(screen.getByText('V250215-001')).toBeInTheDocument();
      expect(screen.queryByText('V250216-001')).not.toBeInTheDocument();
    });
  });

  describe('estado vacío', () => {
    it('muestra "Sin movimientos" cuando no hay ventas', () => {
      render(<SalesList sales={[]} date="2025-02-28" onDelete={noop} onEdit={noop} onReturn={noop} />);
      expect(screen.getByText(/Sin movimientos/i)).toBeInTheDocument();
    });

    it('muestra "Sin movimientos" cuando el día no tiene ventas', () => {
      const sales = [createSale({ date: '2025-01-15' })];
      render(<SalesList sales={sales} date="2025-02-28" onDelete={noop} onEdit={noop} onReturn={noop} />);
      expect(screen.getByText(/Sin movimientos/i)).toBeInTheDocument();
    });
  });
});
