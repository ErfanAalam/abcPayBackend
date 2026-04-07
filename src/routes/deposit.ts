import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, and, asc } from "drizzle-orm";
import { db } from "../db";
import { depositChannels, adminSettings, securityDeposits } from "../db/schema";

export const depositRoutes = new Elysia({ prefix: "/deposit" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "fastpay-secret-change-me",
      exp: "7d",
    })
  )

  // Get channels by type
  .get("/channels", async ({ query }) => {
    const type = query.type || "upi";
    const channels = await db
      .select()
      .from(depositChannels)
      .where(and(eq(depositChannels.type, type as "upi" | "bank" | "crypto"), eq(depositChannels.active, true)))
      .orderBy(asc(depositChannels.sortOrder));
    return { success: true, channels };
  })

  // Get crypto wallet settings (bep20 / trc20)
  .get("/crypto-wallets", async () => {
    const allSettings = await db.select().from(adminSettings);
    const map: Record<string, string> = {};
    for (const s of allSettings) map[s.key] = s.value;
    return {
      success: true,
      wallets: {
        bep20: {
          address: map["crypto_bep20_wallet"] || "",
          qrUrl: map["crypto_bep20_qr"] || "",
        },
        trc20: {
          address: map["crypto_trc20_wallet"] || "",
          qrUrl: map["crypto_trc20_qr"] || "",
        },
      },
    };
  })

  // Get exchange rate
  .get("/exchange-rate", async () => {
    const [setting] = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.key, "crypto_exchange_rate"))
      .limit(1);
    return { success: true, rate: setting?.value || "100.00" };
  })

  // Create deposit
  .post(
    "/create",
    async ({ body, headers, jwt }) => {
      const token = headers.authorization?.replace("Bearer ", "");
      if (!token) return { success: false, message: "Unauthorized" };
      const payload = await jwt.verify(token);
      if (!payload) return { success: false, message: "Unauthorized" };

      const [deposit] = await db
        .insert(securityDeposits)
        .values({
          userId: payload.id as string,
          type: body.type,
          amount: body.amount,
          channelId: body.channelId || null,
          paymentMethod: body.paymentMethod || null,
          utrNumber: body.utrNumber || null,
        })
        .returning();

      return { success: true, deposit };
    },
    {
      body: t.Object({
        type: t.String(),
        amount: t.String(),
        channelId: t.Optional(t.String()),
        paymentMethod: t.Optional(t.String()),
        utrNumber: t.Optional(t.String()),
      }),
    }
  );
