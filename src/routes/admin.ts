import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import {
  transactions,
  securityDeposits,
  securityWithdrawals,
  users,
  adminEmails,
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
  );
