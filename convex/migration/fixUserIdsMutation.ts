import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const updateTable = internalMutation({
  args: {
    table: v.string(),
    oldUserId: v.string(),
    newUserId: v.string(),
  },
  handler: async (ctx, { table, oldUserId, newUserId }) => {
    const docs = await ctx.db.query(table as any).collect();
    let count = 0;
    for (const doc of docs) {
      if ((doc as any).userId === oldUserId) {
        await ctx.db.patch(doc._id, { userId: newUserId } as any);
        count++;
      }
    }
    return count;
  },
});
