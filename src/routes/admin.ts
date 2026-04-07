import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, desc, sql, and, ne } from "drizzle-orm";
import { db } from "../db";
import {
  transactions,
  securityDeposits,
  securityWithdrawals,
  users,
  adminEmails,
  adminSettings,
  utrs,
  bankAccounts,
} from "../db/schema";

// Middleware to verify admin/superadmin
async function verifyAdmin(headers: any, jwt: any, requiredRole?: string) {
  const token = headers.authorization?.replace("Bearer ", "");
  if (!token) return null;

  const payload = await jwt.verify(token);
  if (!payload) return null;

  if (requiredRole && payload.role !== requiredRole) return null;
  if (payload.role !== "admin" && payload.role !== "superadmin") return null;

  return payload;
}

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "fastpay-secret-change-me",
      exp: "7d",
    })
  )

  // ── Deposit requests (pending) ──
  .get("/deposit-requests", async ({ headers, jwt, query }) => {
    const admin = await verifyAdmin(headers, jwt);
    if (!admin) return { success: false, message: "Unauthorized" };

    const status = (query.status as string) || "pending";
    const results = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        amount: transactions.amount,
        status: transactions.status,
        remarks: transactions.remarks,
        createdAt: transactions.createdAt,
        userName: users.name,
        userPhone: users.phone,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(eq(transactions.status, status as any))
      .orderBy(desc(transactions.createdAt));

    return {
      success: true,
      data: results.filter((r) => true), // all deposit type handled by frontend filter
    };
  })

  // ── Withdrawal requests (pending) ──
  .get("/withdrawal-requests", async ({ headers, jwt, query }) => {
    const admin = await verifyAdmin(headers, jwt);
    if (!admin) return { success: false, message: "Unauthorized" };

    const status = (query.status as string) || "pending";
    const results = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        amount: transactions.amount,
        status: transactions.status,
        remarks: transactions.remarks,
        createdAt: transactions.createdAt,
        userName: users.name,
        userPhone: users.phone,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(eq(transactions.status, status as any))
      .orderBy(desc(transactions.createdAt));

    return { success: true, data: results };
  })

  // ── Security deposits list ──
  .get("/security-deposits", async ({ headers, jwt, query }) => {
    const admin = await verifyAdmin(headers, jwt);
    if (!admin) return { success: false, message: "Unauthorized" };

    const status = (query.status as string) || "pending";
    const results = await db
      .select({
        id: securityDeposits.id,
        userId: securityDeposits.userId,
        type: securityDeposits.type,
        amount: securityDeposits.amount,
        status: securityDeposits.status,
        paymentMethod: securityDeposits.paymentMethod,
        utrNumber: securityDeposits.utrNumber,
        createdAt: securityDeposits.createdAt,
        userName: users.name,
        userPhone: users.phone,
      })
      .from(securityDeposits)
      .leftJoin(users, eq(securityDeposits.userId, users.id))
      .where(eq(securityDeposits.status, status as any))
      .orderBy(desc(securityDeposits.createdAt));

    return { success: true, data: results };
  })

  // ── Security withdrawals list ──
  .get("/security-withdrawals", async ({ headers, jwt, query }) => {
    const admin = await verifyAdmin(headers, jwt);
    if (!admin) return { success: false, message: "Unauthorized" };

    const status = (query.status as string) || "pending";
    const results = await db
      .select({
        id: securityWithdrawals.id,
        userId: securityWithdrawals.userId,
        type: securityWithdrawals.type,
        amount: securityWithdrawals.amount,
        status: securityWithdrawals.status,
        createdAt: securityWithdrawals.createdAt,
        userName: users.name,
        userPhone: users.phone,
      })
      .from(securityWithdrawals)
      .leftJoin(users, eq(securityWithdrawals.userId, users.id))
      .where(eq(securityWithdrawals.status, status as any))
      .orderBy(desc(securityWithdrawals.createdAt));

    return { success: true, data: results };
  })

  // ── Approve/Reject transaction ──
  .post(
    "/update-transaction",
    async ({ body, headers, jwt }) => {
      const admin = await verifyAdmin(headers, jwt);
      if (!admin) return { success: false, message: "Unauthorized" };

      await db
        .update(transactions)
        .set({ status: body.status as any, updatedAt: new Date() })
        .where(eq(transactions.id, body.id));

      return { success: true, message: `Transaction ${body.status}` };
    },
    {
      body: t.Object({
        id: t.String(),
        status: t.String(),
      }),
    }
  )

  // ── Approve/Reject security deposit ──
  .post(
    "/update-security-deposit",
    async ({ body, headers, jwt }) => {
      const admin = await verifyAdmin(headers, jwt);
      if (!admin) return { success: false, message: "Unauthorized" };

      await db
        .update(securityDeposits)
        .set({ status: body.status as any, updatedAt: new Date() })
        .where(eq(securityDeposits.id, body.id));

      // Add balance to user on approval + referral commission
      if (body.status === "approved") {
        const [deposit] = await db
          .select()
          .from(securityDeposits)
          .where(eq(securityDeposits.id, body.id))
          .limit(1);
        if (deposit) {
          // Add deposit amount to user balance
          await db
            .update(users)
            .set({
              balance: sql`${users.balance} + ${deposit.amount}`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, deposit.userId));

          // Referral commission on first deposit
          const previousApproved = await db
            .select({ id: securityDeposits.id })
            .from(securityDeposits)
            .where(
              and(
                eq(securityDeposits.userId, deposit.userId),
                eq(securityDeposits.status, "approved"),
                ne(securityDeposits.id, deposit.id)
              )
            )
            .limit(1);

          if (previousApproved.length === 0) {
            // This is the user's first approved deposit — pay referral commission
            const [depositUser] = await db
              .select({ referredBy: users.referredBy })
              .from(users)
              .where(eq(users.id, deposit.userId))
              .limit(1);

            if (depositUser?.referredBy) {
              // Find the referrer by their referral code
              const [referrer] = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.referralCode, depositUser.referredBy))
                .limit(1);

              if (referrer) {
                // Get commission rate from settings
                const [commSetting] = await db
                  .select()
                  .from(adminSettings)
                  .where(eq(adminSettings.key, "referral_commission"))
                  .limit(1);

                const commissionPercent = parseFloat(commSetting?.value || "0");
                if (commissionPercent > 0) {
                  const commissionAmount = (parseFloat(deposit.amount) * commissionPercent / 100).toFixed(2);
                  await db
                    .update(users)
                    .set({
                      balance: sql`${users.balance} + ${commissionAmount}`,
                      updatedAt: new Date(),
                    })
                    .where(eq(users.id, referrer.id));
                }
              }
            }
          }
        }
      }

      return { success: true, message: `Security deposit ${body.status}` };
    },
    {
      body: t.Object({
        id: t.String(),
        status: t.String(),
      }),
    }
  )

  // ── Approve/Reject security withdrawal ──
  .post(
    "/update-security-withdrawal",
    async ({ body, headers, jwt }) => {
      const admin = await verifyAdmin(headers, jwt);
      if (!admin) return { success: false, message: "Unauthorized" };

      await db
        .update(securityWithdrawals)
        .set({ status: body.status as any, updatedAt: new Date() })
        .where(eq(securityWithdrawals.id, body.id));

      return { success: true, message: `Security withdrawal ${body.status}` };
    },
    {
      body: t.Object({
        id: t.String(),
        status: t.String(),
      }),
    }
  )

  // ── UTR list ──
  .get("/utrs", async ({ headers, jwt, query }) => {
    const admin = await verifyAdmin(headers, jwt);
    if (!admin) return { success: false, message: "Unauthorized" };

    const status = (query.status as string) || "pending";
    const results = await db
      .select({
        id: utrs.id,
        userId: utrs.userId,
        utrNumber: utrs.utrNumber,
        amount: utrs.amount,
        status: utrs.status,
        createdAt: utrs.createdAt,
        userName: users.name,
        userPhone: users.phone,
        bankName: bankAccounts.bankName,
      })
      .from(utrs)
      .leftJoin(users, eq(utrs.userId, users.id))
      .leftJoin(bankAccounts, eq(utrs.bankAccountId, bankAccounts.id))
      .where(eq(utrs.status, status as any))
      .orderBy(desc(utrs.createdAt));

    return { success: true, data: results };
  })

  // ── Approve/Reject UTR ──
  .post(
    "/update-utr",
    async ({ body, headers, jwt }) => {
      const admin = await verifyAdmin(headers, jwt);
      if (!admin) return { success: false, message: "Unauthorized" };

      await db
        .update(utrs)
        .set({ status: body.status as any, updatedAt: new Date() })
        .where(eq(utrs.id, body.id));

      return { success: true, message: `UTR ${body.status}` };
    },
    {
      body: t.Object({
        id: t.String(),
        status: t.String(),
      }),
    }
  );
