import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, desc, and, like, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { utrs, bankAccounts } from "../db/schema";

export const utrRoutes = new Elysia({ prefix: "/utr" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "fastpay-secret-change-me",
      exp: "7d",
    })
  )

  // Create UTR
  .post(
    "/create",
    async ({ body, headers, jwt }) => {
      const token = headers.authorization?.replace("Bearer ", "");
      if (!token) return { success: false, message: "Unauthorized" };

      const payload = await jwt.verify(token);
      if (!payload) return { success: false, message: "Unauthorized" };

      const [utr] = await db
        .insert(utrs)
        .values({
          userId: payload.id as string,
          bankAccountId: body.bankAccountId || null,
          utrNumber: body.utrNumber,
          amount: body.amount,
        })
        .returning();

      return { success: true, utr };
    },
    {
      body: t.Object({
        bankAccountId: t.Optional(t.String()),
        utrNumber: t.String({ minLength: 1 }),
        amount: t.String({ minLength: 1 }),
      }),
    }
  )

  // List UTRs with filters
  .get("/list", async ({ headers, jwt, query }) => {
    const token = headers.authorization?.replace("Bearer ", "");
    if (!token) return { success: false, message: "Unauthorized" };

    const payload = await jwt.verify(token);
    if (!payload) return { success: false, message: "Unauthorized" };

    const conditions = [eq(utrs.userId, payload.id as string)];

    if (query.status && query.status !== "all") {
      conditions.push(eq(utrs.status, query.status as "pending" | "approved" | "rejected"));
    }

    if (query.search) {
      conditions.push(like(utrs.utrNumber, `%${query.search}%`));
    }

    if (query.from) {
      conditions.push(gte(utrs.createdAt, new Date(query.from)));
    }

    if (query.to) {
      conditions.push(lte(utrs.createdAt, new Date(query.to)));
    }

    const results = await db
      .select({
        id: utrs.id,
        utrNumber: utrs.utrNumber,
        amount: utrs.amount,
        status: utrs.status,
        bankAccountId: utrs.bankAccountId,
        bankName: bankAccounts.bankName,
        createdAt: utrs.createdAt,
      })
      .from(utrs)
      .leftJoin(bankAccounts, eq(utrs.bankAccountId, bankAccounts.id))
      .where(and(...conditions))
      .orderBy(desc(utrs.createdAt));

    return { success: true, utrs: results };
  });
