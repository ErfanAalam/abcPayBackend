import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { adminEmails } from "../db/schema";

export const adminAuthRoutes = new Elysia({ prefix: "/admin-auth" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "fastpay-secret-change-me",
      exp: "7d",
    })
  )

  // Google login - verify the Google token and check whitelist
  .post(
    "/google-login",
    async ({ body, jwt }) => {
      const { credential } = body;

      // Decode Google JWT token (ID token from Google Sign-In)
      // Google ID tokens are base64 JWTs - decode the payload
      let email: string;
      let name: string;
      let picture: string;

      try {
        const parts = credential.split(".");
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64").toString("utf-8")
        );
        email = payload.email;
        name = payload.name || payload.email;
        picture = payload.picture || "";

        if (!payload.email_verified) {
          return { success: false, message: "Email not verified with Google" };
        }
      } catch {
        return { success: false, message: "Invalid Google token" };
      }

      // Check if email is in whitelist
      const [adminEntry] = await db
        .select()
        .from(adminEmails)
        .where(eq(adminEmails.email, email.toLowerCase()))
        .limit(1);

      if (!adminEntry) {
        return { success: false, message: "Unauthorized. This email is not allowed." };
      }

      // Generate JWT
      const token = await jwt.sign({
        email: adminEntry.email,
        role: adminEntry.role,
        name: name,
      });

      return {
        success: true,
        token,
        admin: {
          email: adminEntry.email,
          role: adminEntry.role,
          name: adminEntry.name || name,
          picture,
        },
      };
    },
    {
      body: t.Object({
        credential: t.String(),
      }),
    }
  )

  // Verify admin token
  .get("/me", async ({ headers, jwt }) => {
    const token = headers.authorization?.replace("Bearer ", "");
    if (!token) return { success: false, message: "Unauthorized" };

    const payload = await jwt.verify(token);
    if (!payload) return { success: false, message: "Unauthorized" };

    return {
      success: true,
      admin: {
        email: payload.email,
        role: payload.role,
        name: payload.name,
      },
    };
  });
