import { query } from "../_generated/server";
import { getAuthUserId } from "../lib/auth";

export const getMyProfile = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

/** Lista las contadoras asignadas al owner actual. */
export const getMyAccountants = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const myProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!myProfile || myProfile.role !== "owner") return [];

    const assignments = await ctx.db
      .query("accountantAssignments")
      .withIndex("by_owner", (q) => q.eq("ownerId", myProfile._id))
      .take(20);

    const result = [];
    for (const a of assignments) {
      const profile = await ctx.db.get(a.accountantId);
      if (!profile) continue;

      // Extraer el auth user ID del stableUserId para buscar email
      const authUserIdStr = profile.userId.split("|")[1];
      let email: string | undefined;
      if (authUserIdStr) {
        const allUsers = await ctx.db.query("users").take(100);
        const authUser = allUsers.find((u) => String(u._id) === authUserIdStr);
        email = authUser?.email as string | undefined;
      }

      result.push({
        profileId: profile._id,
        email: email ?? "Sin email",
      });
    }

    return result;
  },
});
