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

      const isUpi = body.type === "upi";

      const [bank] = await db
        .insert(bankAccounts)
        .values({
          userId: payload.id as string,
          type: isUpi ? "upi" : "bank",
          accountNo: isUpi ? "-" : body.accountNo,
          upiId: body.upiId || null,
          qrCodeUrl: body.qrCodeUrl || null,
          accountHolderName: isUpi ? (body.accountHolderName || "-") : body.accountHolderName,
          ifscCode: isUpi ? "-" : body.ifscCode,
          bankName: isUpi ? "UPI" : body.bankName,
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
        type: t.Optional(t.String()),
        accountNo: t.Optional(t.String()),
        upiId: t.Optional(t.String()),
        qrCodeUrl: t.Optional(t.String()),
        accountHolderName: t.Optional(t.String()),
        ifscCode: t.Optional(t.String()),
        bankName: t.Optional(t.String()),
        bankBranch: t.Optional(t.String()),
        bankAddress: t.Optional(t.String()),
        maxWithdrawalAmount: t.Optional(t.String()),
        phone: t.Optional(t.String()),
      }),
    }
  );
