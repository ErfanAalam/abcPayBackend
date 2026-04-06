import { db } from "./index";
import { adminEmails } from "./schema";

async function seed() {
  console.log("Seeding admin emails...");

  // Add your Google emails here
  await db.insert(adminEmails).values([
    {
      email: "erfankhansiwani@gmail.com",
      role: "superadmin",
      name: "Super Admin",
    },
  ]).onConflictDoNothing();

  console.log("Done! Update the emails in admin_emails table via superadmin panel.");
  process.exit(0);
}

seed().catch(console.error);
