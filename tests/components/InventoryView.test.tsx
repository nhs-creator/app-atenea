import { describe, it, expect } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InventoryView from "../../components/InventoryView";
import { InventoryItem, AppConfig } from "../../types";

const mockConfig: AppConfig = {
  categories: ["PRENDAS SUPERIORES", "PRENDAS INFERIORES"],
  subcategories: {
    "PRENDAS SUPERIORES": ["REMERAS", "CAMISAS"],
    "PRENDAS INFERIORES": ["PANTALONES", "SHORTS"],
  },
  materials: ["ALGODÓN", "POLIÉSTER"],
  sizeSystems: {
    LETRAS: ["S", "M", "L", "XL"],
    UNICO: ["U"],
  },
  categorySizeMap: {
    "PRENDAS SUPERIORES": "LETRAS",
    "PRENDAS INFERIORES": "LETRAS",
  },
};

function createItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: "id-1",
    user_id: "user-1",
    name: "REMERA ALGODÓN",
    category: "PRENDAS SUPERIORES",
    subcategory: "REMERAS",
    material: "ALGODÓN",
    cost_price: 1000,
    selling_price: 2500,
    sizes: { S: 2, M: 3, L: 1 },
    stock_total: 6,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("InventoryView - flujo de inventario", () => {
  const noop = () => {};

  describe("visualización de productos", () => {
    it("muestra una card por cada producto del inventario", () => {
      const inventory: InventoryItem[] = [
        createItem({ id: "1", name: "REMERA A" }),
        createItem({ id: "2", name: "REMERA B" }),
        createItem({ id: "3", name: "PANTALÓN" }),
      ];

      render(
        <InventoryView
          inventory={inventory}
          config={mockConfig}
          onAdd={noop}
          onUpdate={noop}
          onDelete={noop}
        />
      );

      expect(screen.getByText("REMERA A")).toBeInTheDocument();
      expect(screen.getByText("REMERA B")).toBeInTheDocument();
      expect(screen.getByText("PANTALÓN")).toBeInTheDocument();
    });

    it("muestra stock total por producto (calculado desde sizes)", () => {
      const inventory: InventoryItem[] = [
        createItem({
          name: "PRODUCTO X",
          stock_total: 15,
          sizes: { S: 5, M: 10 },
        }),
      ];

      render(
        <InventoryView
          inventory={inventory}
          config={mockConfig}
          onAdd={noop}
          onUpdate={noop}
          onDelete={noop}
        />
      );

      expect(screen.getByText("PRODUCTO X")).toBeInTheDocument();
      expect(screen.getByText("15")).toBeInTheDocument();
    });

    it("muestra 'Sin existencias' cuando stock es 0", () => {
      const inventory: InventoryItem[] = [
        createItem({ name: "SIN STOCK", stock_total: 0, sizes: {} }),
      ];

      render(
        <InventoryView
          inventory={inventory}
          config={mockConfig}
          onAdd={noop}
          onUpdate={noop}
          onDelete={noop}
        />
      );

      expect(screen.getByText(/Sin existencias/i)).toBeInTheDocument();
    });
  });

  describe("filtrado por búsqueda", () => {
    it("el buscador filtra productos por nombre", async () => {
      const inventory: InventoryItem[] = [
        createItem({ id: "1", name: "REMERA AZUL" }),
        createItem({ id: "2", name: "PANTALÓN NEGRO" }),
      ];

      render(
        <InventoryView
          inventory={inventory}
          config={mockConfig}
          onAdd={noop}
          onUpdate={noop}
          onDelete={noop}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
      await userEvent.type(searchInput, "azul");

      await waitFor(
        () => {
          expect(screen.getByText("REMERA AZUL")).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });

  describe("filtrado por nivel de stock", () => {
    it("filtra 'Sin Stock' cuando se selecciona", async () => {
      const inventory: InventoryItem[] = [
        createItem({ id: "1", name: "CON STOCK", stock_total: 5 }),
        createItem({ id: "2", name: "SIN STOCK", stock_total: 0 }),
      ];

      render(
        <InventoryView
          inventory={inventory}
          config={mockConfig}
          onAdd={noop}
          onUpdate={noop}
          onDelete={noop}
        />
      );

      const filterToggle = screen.getByRole("button", { name: /Filtros avanzados/i });
      await userEvent.click(filterToggle);

      const sinStockBtn = screen.getByRole("button", { name: /Sin Stock/i });
      await userEvent.click(sinStockBtn);

      expect(screen.getByText("SIN STOCK")).toBeInTheDocument();
      expect(screen.queryByText("CON STOCK")).not.toBeInTheDocument();
    });

    it("filtra 'Bajo (≤5)' correctamente", async () => {
      const inventory: InventoryItem[] = [
        createItem({ id: "1", name: "BAJO", stock_total: 3 }),
        createItem({ id: "2", name: "ALTO", stock_total: 25 }),
      ];

      render(
        <InventoryView
          inventory={inventory}
          config={mockConfig}
          onAdd={noop}
          onUpdate={noop}
          onDelete={noop}
        />
      );

      const filterToggle = screen.getByRole("button", { name: /Filtros avanzados/i });
      await userEvent.click(filterToggle);

      const bajoBtn = screen.getByRole("button", { name: /Bajo/i });
      await userEvent.click(bajoBtn);

      expect(screen.getByText("BAJO")).toBeInTheDocument();
      expect(screen.queryByText("ALTO")).not.toBeInTheDocument();
    });
  });

  describe("estado vacío", () => {
    it("muestra mensaje cuando no hay productos", () => {
      render(
        <InventoryView
          inventory={[]}
          config={mockConfig}
          onAdd={noop}
          onUpdate={noop}
          onDelete={noop}
        />
      );

      expect(screen.getByText(/No hay productos/i)).toBeInTheDocument();
    });
  });

  describe("tabs", () => {
    it("muestra tabs de Stock y Reporte", () => {
      render(
        <InventoryView
          inventory={[]}
          config={mockConfig}
          onAdd={noop}
          onUpdate={noop}
          onDelete={noop}
        />
      );

      const buttons = screen.getAllByRole("button");
      const stockTab = buttons.find((b) => b.textContent?.includes("STOCK"));
      const reporteTab = buttons.find((b) => b.textContent?.includes("REPORTE"));

      expect(stockTab).toBeDefined();
      expect(reporteTab).toBeDefined();
    });
  });
});
