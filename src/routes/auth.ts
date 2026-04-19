import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq, and, gte, asc, sql } from "drizzle-orm";
import { db } from "../db";
import { users, securityDeposits, securityWithdrawals, tiers } from "../db/schema";
import { generateReferralCode } from "../lib/referral";
import { sendOtpEmail } from "../lib/email";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "fastpay-secret-change-me",
      exp: "7d",
    })
  )

  // Signup
  .post(
    "/signup",
    async ({ body, jwt }) => {
      const { phone, password, referralCode } = body;

      // Check if user already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .limit(1);

      if (existing.length > 0) {
        return { success: false, message: "Phone number already registered" };
      }

      // Validate referral code if provided
      if (referralCode) {
        const referrer = await db
          .select()
          .from(users)
          .where(eq(users.referralCode, referralCode))
          .limit(1);

        if (referrer.length === 0) {
          return { success: false, message: "Invalid referral code" };
        }
      }

      // Hash password
      const hashedPassword = await Bun.password.hash(password);

      // Generate unique referral code for new user
      let newReferralCode = generateReferralCode();
      let codeExists = true;
      while (codeExists) {
        const check = await db
          .select()
          .from(users)
          .where(eq(users.referralCode, newReferralCode))
          .limit(1);
        if (check.length === 0) codeExists = false;
        else newReferralCode = generateReferralCode();
      }

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          phone,
          password: hashedPassword,
          referralCode: newReferralCode,
          referredBy: referralCode || null,
        })
        .returning();

      const token = await jwt.sign({
        id: newUser.id,
        phone: newUser.phone,
        role: newUser.role,
      });

      return {
        success: true,
        token,
        user: {
          id: newUser.id,
          phone: newUser.phone,
          email: newUser.email,
          emailVerified: newUser.emailVerified,
          role: newUser.role,
          balance: newUser.balance,
          referralCode: newUser.referralCode,
        },
      };
    },
    {
      body: t.Object({
        phone: t.String({ minLength: 10 }),
        password: t.String({ minLength: 6 }),
        referralCode: t.Optional(t.String()),
      }),
    }
  )

  // Login
  .post(
    "/login",
    async ({ body, jwt }) => {
      const { phone, password } = body;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .limit(1);

      if (!user) {
        return { success: false, message: "Invalid phone number or password" };
      }

      const validPassword = await Bun.password.verify(password, user.password);
      if (!validPassword) {
        return { success: false, message: "Invalid phone number or password" };
      }

      const token = await jwt.sign({
        id: user.id,
        phone: user.phone,
        role: user.role,
      });

      return {
        success: true,
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          role: user.role,
          balance: user.balance,
          referralCode: user.referralCode,
        },
      };
    },
    {
      body: t.Object({
        phone: t.String({ minLength: 10 }),
        password: t.String({ minLength: 6 }),
      }),
    }
  )

  // Send email verification OTP
  .post(
    "/send-email-otp",
    async ({ body, headers, jwt }) => {
      const token = headers.authorization?.replace("Bearer ", "");
      if (!token) return { success: false, message: "Unauthorized" };

      const payload = await jwt.verify(token);
      if (!payload) return { success: false, message: "Unauthorized" };

      const { email } = body;
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db
        .update(users)
        .set({ email, emailOtp: otp, emailOtpExpiry: expiry })
        .where(eq(users.id, payload.id as string));

      await sendOtpEmail(email, otp);

      return { success: true, message: "OTP sent to your email" };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
    }
  )

  // Verify email OTP
  .post(
    "/verify-email",
    async ({ body, headers, jwt }) => {
      const token = headers.authorization?.replace("Bearer ", "");
      if (!token) return { success: false, message: "Unauthorized" };

      const payload = await jwt.verify(token);
      if (!payload) return { success: false, message: "Unauthorized" };

      const { otp } = body;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.id as string))
        .limit(1);

      if (!user || user.emailOtp !== otp) {
        return { success: false, message: "Invalid OTP" };
      }

      if (user.emailOtpExpiry && new Date() > user.emailOtpExpiry) {
        return { success: false, message: "OTP expired" };
      }

      await db
        .update(users)
        .set({
          emailVerified: true,
          emailOtp: null,
          emailOtpExpiry: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, payload.id as string));

      return { success: true, message: "Email verified successfully" };
    },
    {
      body: t.Object({
        otp: t.String({ minLength: 6, maxLength: 6 }),
      }),
    }
  )

  // Change password
  .post(
    "/change-password",
    async ({ body, headers, jwt }) => {
      const token = headers.authorization?.replace("Bearer ", "");
      if (!token) return { success: false, message: "Unauthorized" };

      const payload = await jwt.verify(token);
      if (!payload) return { success: false, message: "Unauthorized" };

      const { currentPassword, newPassword } = body;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.id as string))
        .limit(1);

      if (!user) return { success: false, message: "User not found" };

      const valid = await Bun.password.verify(currentPassword, user.password);
      if (!valid) return { success: false, message: "Current password is incorrect" };

      const hashed = await Bun.password.hash(newPassword);
      await db
        .update(users)
        .set({ password: hashed, updatedAt: new Date() })
        .where(eq(users.id, payload.id as string));

      return { success: true, message: "Password changed successfully" };
    },
    {
      body: t.Object({
        currentPassword: t.String({ minLength: 6 }),
        newPassword: t.String({ minLength: 6 }),
      }),
    }
  )

  // Tier progress — based on approved security deposits/withdrawals in last 30 days
  .get("/tier-progress", async ({ headers, jwt }) => {
    const token = headers.authorization?.replace("Bearer ", "");
    if (!token) return { success: false, message: "Unauthorized" };

    const payload = await jwt.verify(token);
    if (!payload) return { success: false, message: "Unauthorized" };

    const userId = payload.id as string;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [depositAgg] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${securityDeposits.amount}), 0)`,
      })
      .from(securityDeposits)
      .where(
        and(
          eq(securityDeposits.userId, userId),
          eq(securityDeposits.status, "approved"),
          gte(securityDeposits.createdAt, since)
        )
      );

    const [withdrawalAgg] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${securityWithdrawals.amount}), 0)`,
      })
      .from(securityWithdrawals)
      .where(
        and(
          eq(securityWithdrawals.userId, userId),
          eq(securityWithdrawals.status, "approved"),
          gte(securityWithdrawals.createdAt, since)
        )
      );

    const depositTurnover = parseFloat(depositAgg?.total ?? "0");
    const withdrawalTurnover = parseFloat(withdrawalAgg?.total ?? "0");

    const allTiers = await db.select().from(tiers).orderBy(asc(tiers.sortOrder));

    // Current tier: highest tier whose thresholds are met on BOTH metrics
    let current = allTiers[0] ?? null;
    for (const tier of allTiers) {
      if (
        depositTurnover >= tier.depositTurnover &&
        withdrawalTurnover >= tier.withdrawalTurnover
      ) {
        current = tier;
      }
    }

    const currentIndex = current ? allTiers.findIndex((t) => t.id === current!.id) : -1;
    const next = currentIndex >= 0 && currentIndex < allTiers.length - 1
      ? allTiers[currentIndex + 1]
      : null;

    return {
      success: true,
      depositTurnover,
      withdrawalTurnover,
      currentTier: current,
      nextTier: next,
    };
  })

  // Get current user
  .get("/me", async ({ headers, jwt }) => {
    const token = headers.authorization?.replace("Bearer ", "");
    if (!token) return { success: false, message: "Unauthorized" };

    const payload = await jwt.verify(token);
    if (!payload) return { success: false, message: "Unauthorized" };

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.id as string))
      .limit(1);

    if (!user) return { success: false, message: "User not found" };

    return {
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        balance: user.balance,
        referralCode: user.referralCode,
      },
    };
  });
