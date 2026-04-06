import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  tiers,
  depositChannels,
  adminSettings,
  adminEmails,
  bankAccounts,
  utrs,
} from "../db/schema";

async function verifySuperadmin(headers: any, jwt: any) {
  const token = headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  const payload = await jwt.verify(token);
  if (!payload || payload.role !== "superadmin") return null;
  return payload;
}

export const superadminRoutes = new Elysia({ prefix: "/superadmin" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "fastpay-secret-change-me",
      exp: "7d",
    })
  )

  // ── Users list ──
  .get("/users", async ({ headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };

    const result = await db.select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      email: users.email,
      emailVerified: users.emailVerified,
      role: users.role,
      balance: users.balance,
      referralCode: users.referralCode,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));

    return { success: true, data: result };
  })

  // ── Tiers CRUD ──
  .get("/tiers", async ({ headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };
    const result = await db.select().from(tiers).orderBy(asc(tiers.sortOrder));
    return { success: true, data: result };
  })

  .post("/tiers/update", async ({ body, headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };

    await db.update(tiers).set({
      ...body,
      updatedAt: new Date(),
    }).where(eq(tiers.id, body.id));

    return { success: true, message: "Tier updated" };
  }, { body: t.Any() })

  // ── Deposit Channels CRUD ──
  .get("/channels", async ({ headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };
    const result = await db.select().from(depositChannels).orderBy(asc(depositChannels.sortOrder));
    return { success: true, data: result };
  })

  .post("/channels/create", async ({ body, headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };

    const [ch] = await db.insert(depositChannels).values(body).returning();
    return { success: true, channel: ch };
  }, { body: t.Any() })

  .post("/channels/update", async ({ body, headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };

    const { id, ...data } = body;
    await db.update(depositChannels).set(data).where(eq(depositChannels.id, id));
    return { success: true, message: "Channel updated" };
  }, { body: t.Any() })

  .post("/channels/delete", async ({ body, headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };

    await db.delete(depositChannels).where(eq(depositChannels.id, body.id));
    return { success: true, message: "Channel deleted" };
  }, { body: t.Object({ id: t.String() }) })

  // ── Settings ──
  .get("/settings", async ({ headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };

    const result = await db.select().from(adminSettings);
    return { success: true, data: result };
  })

  .post("/settings/update", async ({ body, headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };

    await db.update(adminSettings).set({
      value: body.value,
      updatedAt: new Date(),
    }).where(eq(adminSettings.key, body.key));

    return { success: true, message: "Setting updated" };
  }, {
    body: t.Object({
      key: t.String(),
      value: t.String(),
    }),
  })

  // ── Admin Emails ──
  .get("/admin-emails", async ({ headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };

    const result = await db.select().from(adminEmails);
    return { success: true, data: result };
  })

  .post("/admin-emails/add", async ({ body, headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };

    const [entry] = await db.insert(adminEmails).values({
      email: body.email.toLowerCase(),
      role: body.role,
      name: body.name || null,
    }).returning();

    return { success: true, entry };
  }, {
    body: t.Object({
      email: t.String(),
      role: t.String(),
      name: t.Optional(t.String()),
    }),
  })

  .post("/admin-emails/delete", async ({ body, headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };

    await db.delete(adminEmails).where(eq(adminEmails.id, body.id));
    return { success: true, message: "Admin email removed" };
  }, { body: t.Object({ id: t.String() }) })

  // ── Bank Accounts ──
  .get("/bank-accounts", async ({ headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };

    const result = await db
      .select({
        id: bankAccounts.id,
        accountNo: bankAccounts.accountNo,
        upiId: bankAccounts.upiId,
        accountHolderName: bankAccounts.accountHolderName,
        ifscCode: bankAccounts.ifscCode,
        bankName: bankAccounts.bankName,
        bankBranch: bankAccounts.bankBranch,
        maxWithdrawalAmount: bankAccounts.maxWithdrawalAmount,
        phone: bankAccounts.phone,
        status: bankAccounts.status,
        createdAt: bankAccounts.createdAt,
        userPhone: users.phone,
      })
      .from(bankAccounts)
      .leftJoin(users, eq(bankAccounts.userId, users.id))
      .orderBy(desc(bankAccounts.createdAt));

    return { success: true, data: result };
  })

  // ── UTRs ──
  .get("/utrs", async ({ headers, jwt }) => {
    const sa = await verifySuperadmin(headers, jwt);
    if (!sa) return { success: false, message: "Unauthorized" };

    const result = await db
      .select({
        id: utrs.id,
        utrNumber: utrs.utrNumber,
        amount: utrs.amount,
        status: utrs.status,
        createdAt: utrs.createdAt,
        userPhone: users.phone,
        bankName: bankAccounts.bankName,
      })
      .from(utrs)
      .leftJoin(users, eq(utrs.userId, users.id))
      .leftJoin(bankAccounts, eq(utrs.bankAccountId, bankAccounts.id))
      .orderBy(desc(utrs.createdAt));

    return { success: true, data: result };
  });
