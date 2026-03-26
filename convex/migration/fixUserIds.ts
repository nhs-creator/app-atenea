"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

export const run = action({
  args: {
    oldUserId: v.string(),
    newUserId: v.string(),
  },
  handler: async (ctx, { oldUserId, newUserId }) => {
    const tables = ["clients", "inventory", "expenses", "vouchers", "sales", "inventoryMovements"] as const;

    for (const table of tables) {
      const count: number = await ctx.runMutation(internal.migration.fixUserIdsMutation.updateTable, {
        table,
        oldUserId,
        newUserId,
      });
      console.log(`[FIX] ${table}: updated ${count} docs`);
    }

    return "done";
  },
});
