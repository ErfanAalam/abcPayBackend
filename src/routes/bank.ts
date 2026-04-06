import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { bankAccounts } from "../db/schema";

export const bankRoutes = new Elysia({ prefix: "/bank" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "fastpay-secret-change-me",
      exp: "7d",
    })
  )

  // List user's bank accounts
  .get("/list", async ({ headers, jwt }) => {
    const token = headers.authorization?.replace("Bearer ", "");
    if (!token) return { success: false, message: "Unauthorized" };

    const payload = await jwt.verify(token);
    if (!payload) return { success: false, message: "Unauthorized" };

    const banks = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, payload.id as string))
      .orderBy(desc(bankAccounts.createdAt));

    return { success: true, banks };
  })

  // Add bank account
  .post(
    "/add",
    async ({ body, headers, jwt }) => {
      const token = headers.authorization?.replace("Bearer ", "");
      if (!token) return { success: false, message: "Unauthorized" };

      const payload = await jwt.verify(token);
      if (!payload) return { success: false, message: "Unauthorized" };

      const [bank] = await db
        .insert(bankAccounts)
        .values({
          userId: payload.id as string,
          accountNo: body.accountNo,
          upiId: body.upiId || null,
          accountHolderName: body.accountHolderName,
          ifscCode: body.ifscCode,
          bankName: body.bankName,
          bankBranch: body.bankBranch || null,
          bankAddress: body.bankAddress || null,
          maxWithdrawalAmount: body.maxWithdrawalAmount
            ? parseInt(body.maxWithdrawalAmount)
            : null,
          phone: body.phone || null,
        })
        .returning();

      return { success: true, bank };
    },
    {
      body: t.Object({
        accountNo: t.String({ minLength: 1 }),
        upiId: t.Optional(t.String()),
        accountHolderName: t.String({ minLength: 1 }),
        ifscCode: t.String({ minLength: 1 }),
        bankName: t.String({ minLength: 1 }),
        bankBranch: t.Optional(t.String()),
        bankAddress: t.Optional(t.String()),
        maxWithdrawalAmount: t.Optional(t.String()),
        phone: t.Optional(t.String()),
      }),
    }
  );
