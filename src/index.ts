import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { asc } from "drizzle-orm";
import { authRoutes } from "./routes/auth";
import { bankRoutes } from "./routes/bank";
import { utrRoutes } from "./routes/utr";
import { depositRoutes } from "./routes/deposit";
import { withdrawalRoutes } from "./routes/withdrawal";
import { historyRoutes } from "./routes/history";
import { adminAuthRoutes } from "./routes/admin-auth";
import { adminRoutes } from "./routes/admin";
import { superadminRoutes } from "./routes/superadmin";
import { uploadRoutes } from "./routes/upload";
import { db } from "./db";
import { tiers } from "./db/schema";

const app = new Elysia()
  .use(cors())
  .use(authRoutes)
  .use(bankRoutes)
  .use(utrRoutes)
  .use(depositRoutes)
  .use(withdrawalRoutes)
  .use(historyRoutes)
  .use(adminAuthRoutes)
  .use(adminRoutes)
  .use(superadminRoutes)
  .use(uploadRoutes)
  .get("/", () => ({ message: "AbcPay API is running" }))
  .get("/health", () => ({ status: "ok" }))
  .get("/tiers", async () => {
    const allTiers = await db.select().from(tiers).orderBy(asc(tiers.sortOrder));
    return { success: true, tiers: allTiers };
  })
  .listen(process.env.PORT || 4000);

console.log(
  `AbcPay API is running at ${app.server?.hostname}:${app.server?.port}`
);
