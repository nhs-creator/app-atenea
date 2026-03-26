import { describe, it, expect, vi, beforeEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useAtenea } from "../../hooks/useAtenea";

let insertPayload: any = null;
let updatePayload: any = null;
let deleteId: string | null = null;

const emptyPromise = Promise.resolve({ data: [], error: null });

function createChain(promise: Promise<any> = emptyPromise) {
  const chain: any = Object.assign(promise, {
    insert: (data: any) => {
      insertPayload = { data };
      return createChain(Promise.resolve({ error: null }));
    },
    update: (data: any) => {
      updatePayload = { data };
      return createChain(promise);
    },
    delete: () => {
      deleteId = "called";
      return createChain(promise);
    },
    select: () => createChain(emptyPromise),
    eq: () => createChain(promise),
    order: () => createChain(promise),
    limit: () => createChain(promise),
  });
  return chain;
}

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: () => createChain(),
  },
}));

const mockSession = { user: { id: "user-123" } } as any;

describe("useAtenea - inventario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertPayload = null;
    updatePayload = null;
    deleteId = null;
  });

  describe("addInventory", () => {
    it("inserta con nombre y categoría en mayúsculas", async () => {
      const { result } = renderHook(() => useAtenea(mockSession));

      let res: Awaited<ReturnType<typeof result.current.addInventory>>;
      await act(async () => {
        res = await result.current.addInventory({
          name: "remera algodón",
          category: "PRENDAS SUPERIORES",
          subcategory: "REMERAS",
          material: "ALGODÓN",
          costPrice: "1000",
          sellingPrice: "2500",
          sizes: { S: 2, M: 3, L: 1 },
        });
      });

      expect(res?.success).toBe(true);
      expect(insertPayload?.data?.name).toBe("REMERA ALGODÓN");
      expect(insertPayload?.data?.category).toBe("PRENDAS SUPERIORES");
      expect(insertPayload?.data?.material).toBe("ALGODÓN");
      expect(insertPayload?.data?.cost_price).toBe(1000);
      expect(insertPayload?.data?.selling_price).toBe(2500);
      expect(insertPayload?.data?.sizes).toEqual({ S: 2, M: 3, L: 1 });
    });

    it("convierte sizes string a number", async () => {
      const { result } = renderHook(() => useAtenea(mockSession));

      await act(async () => {
        await result.current.addInventory({
          name: "TEST",
          category: "OTROS",
          subcategory: "",
          material: "",
          costPrice: "500",
          sellingPrice: "1000",
          sizes: { U: 5 } as any,
        });
      });

      expect(insertPayload?.data?.sizes?.U).toBe(5);
    });
  });

  describe("updateInventory", () => {
    it("actualiza con payload correcto", async () => {
      const { result } = renderHook(() => useAtenea(mockSession));

      await act(async () => {
        await result.current.updateInventory({
          id: "inv-123",
          name: "REMERA EDITADA",
          category: "PRENDAS SUPERIORES",
          subcategory: "REMERAS",
          material: "ALGODÓN",
          cost_price: 1200,
          selling_price: 2800,
          sizes: { S: 1, M: 4, L: 2 },
        });
      });

      expect(updatePayload?.data?.name).toBe("REMERA EDITADA");
      expect(updatePayload?.data?.cost_price).toBe(1200);
      expect(updatePayload?.data?.sizes).toEqual({ S: 1, M: 4, L: 2 });
    });
  });

  describe("deleteInventory", () => {
    it("elimina por id", async () => {
      const { result } = renderHook(() => useAtenea(mockSession));

      await act(async () => {
        await result.current.deleteInventory("inv-to-delete");
      });

      expect(deleteId).toBe("called");
    });
  });
});
