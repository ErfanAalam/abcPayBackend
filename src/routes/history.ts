import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { transactions, securityDeposits, securityWithdrawals } from "../db/schema";

export const historyRoutes = new Elysia({ prefix: "/history" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "fastpay-secret-change-me",
      exp: "7d",
    })
  )

  // Deposit requests (transactions with type=deposit)
  .get("/deposit-requests", async ({ headers, jwt, query }) => {
    const token = headers.authorization?.replace("Bearer ", "");
    if (!token) return { success: false, message: "Unauthorized" };
    const payload = await jwt.verify(token);
    if (!payload) return { success: false, message: "Unauthorized" };

    const conditions: any[] = [
      eq(transactions.userId, payload.id as string),
      eq(transactions.type, "deposit"),
    ];
    if (query.status && query.status !== "all")
      conditions.push(eq(transactions.status, query.status as any));
    if (query.from) conditions.push(gte(transactions.createdAt, new Date(query.from)));
    if (query.to) conditions.push(lte(transactions.createdAt, new Date(query.to)));

    const results = await db.select().from(transactions)
      .where(and(...conditions)).orderBy(desc(transactions.createdAt));
    return { success: true, data: results };
  })

  // Withdrawal requests (transactions with type=withdrawal)
  .get("/withdrawal-requests", async ({ headers, jwt, query }) => {
    const token = headers.authorization?.replace("Bearer ", "");
    if (!token) return { success: false, message: "Unauthorized" };
    const payload = await jwt.verify(token);
    if (!payload) return { success: false, message: "Unauthorized" };

    const conditions: any[] = [
      eq(transactions.userId, payload.id as string),
      eq(transactions.type, "withdrawal"),
    ];
    if (query.status && query.status !== "all")
      conditions.push(eq(transactions.status, query.status as any));
    if (query.from) conditions.push(gte(transactions.createdAt, new Date(query.from)));
    if (query.to) conditions.push(lte(transactions.createdAt, new Date(query.to)));

    const results = await db.select().from(transactions)
      .where(and(...conditions)).orderBy(desc(transactions.createdAt));
    return { success: true, data: results };
  })

  // Security deposits
  .get("/security-deposits", async ({ headers, jwt, query }) => {
    const token = headers.authorization?.replace("Bearer ", "");
    if (!token) return { success: false, message: "Unauthorized" };
    const payload = await jwt.verify(token);
    if (!payload) return { success: false, message: "Unauthorized" };

    const conditions: any[] = [eq(securityDeposits.userId, payload.id as string)];
    if (query.status && query.status !== "all")
      conditions.push(eq(securityDeposits.status, query.status as any));
    if (query.from) conditions.push(gte(securityDeposits.createdAt, new Date(query.from)));
    if (query.to) conditions.push(lte(securityDeposits.createdAt, new Date(query.to)));

    const results = await db.select().from(securityDeposits)
      .where(and(...conditions)).orderBy(desc(securityDeposits.createdAt));
    return { success: true, data: results };
  })

  // Security withdrawals
  .get("/security-withdrawals", async ({ headers, jwt, query }) => {
    const token = headers.authorization?.replace("Bearer ", "");
    if (!token) return { success: false, message: "Unauthorized" };
    const payload = await jwt.verify(token);
    if (!payload) return { success: false, message: "Unauthorized" };

    const conditions: any[] = [eq(securityWithdrawals.userId, payload.id as string)];
    if (query.status && query.status !== "all")
      conditions.push(eq(securityWithdrawals.status, query.status as any));
    if (query.from) conditions.push(gte(securityWithdrawals.createdAt, new Date(query.from)));
    if (query.to) conditions.push(lte(securityWithdrawals.createdAt, new Date(query.to)));

    const results = await db.select().from(securityWithdrawals)
      .where(and(...conditions)).orderBy(desc(securityWithdrawals.createdAt));
    return { success: true, data: results };
  });
