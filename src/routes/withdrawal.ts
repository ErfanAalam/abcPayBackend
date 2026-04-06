import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { securityWithdrawals, adminSettings, bankAccounts } from "../db/schema";

export const withdrawalRoutes = new Elysia({ prefix: "/withdrawal" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "fastpay-secret-change-me",
      exp: "7d",
    })
  )

  // Get blocked withdrawal info
  .get("/blocked-info", async () => {
    const [setting] = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.key, "blocked_withdrawal_info"))
      .limit(1);
    return { success: true, info: setting?.value || "" };
  })

  // Create withdrawal
  .post(
    "/create",
    async ({ body, headers, jwt }) => {
      const token = headers.authorization?.replace("Bearer ", "");
      if (!token) return { success: false, message: "Unauthorized" };
      const payload = await jwt.verify(token);
      if (!payload) return { success: false, message: "Unauthorized" };

      const [withdrawal] = await db
        .insert(securityWithdrawals)
        .values({
          userId: payload.id as string,
          type: body.type,
          amount: body.amount,
          bankAccountId: body.bankAccountId || null,
          walletAddress: body.walletAddress || null,
        })
        .returning();

      return { success: true, withdrawal };
    },
    {
      body: t.Object({
        type: t.String(),
        amount: t.String(),
        bankAccountId: t.Optional(t.String()),
        walletAddress: t.Optional(t.String()),
      }),
    }
  );
