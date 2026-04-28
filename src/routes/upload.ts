import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { uploadToS3 } from "../lib/s3";

export const uploadRoutes = new Elysia({ prefix: "/upload" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "fastpay-secret-change-me",
      exp: "7d",
    })
  )

  // Upload QR code image
  .post(
    "/qr",
    async ({ body, headers, jwt }) => {
      const token = headers.authorization?.replace("Bearer ", "");
      if (!token) return { success: false, message: "Unauthorized" };

      const payload = await jwt.verify(token);
      if (!payload) return { success: false, message: "Unauthorized" };

      const file = body.file;
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "png";
      const key = `qr-codes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const url = await uploadToS3(buffer, key, file.type);

      return { success: true, url };
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    }
  );
