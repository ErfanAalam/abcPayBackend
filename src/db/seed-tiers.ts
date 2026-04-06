import { db } from "./index";
import { tiers } from "./schema";

const tierData = [
  {
    name: "Blue",
    label: "BLUE",
    color: "cyan",
    stars: 2,
    subtitle: "STARTER TIER",
    depositTurnover: 0,
    withdrawalTurnover: 0,
    eligibility: "Default Tier For All New Or Inactive Agents.",
    dailyWithdrawalLimit: 40000,
    withdrawalHoldTime: "10 Hours",
    withdrawalCommission: "2.00",
    depositCommission: "3.00",
    sortOrder: 0,
  },
  {
    name: "Silver",
    label: "SILVER",
    color: "gray",
    stars: 3,
    subtitle: "CONSISTENT PERFORMER",
    depositTurnover: 1000000,
    withdrawalTurnover: 800000,
    eligibility:
      "Minimum \u20B910 Lakhs Processed Deposit And \u20B98 Lakhs Processed Withdrawal In The Last 30 Days.",
    dailyWithdrawalLimit: 300000,
    withdrawalHoldTime: "1.5 Hours",
    withdrawalCommission: "2.25",
    depositCommission: "3.00",
    sortOrder: 1,
  },
  {
    name: "Gold",
    label: "GOLD",
    color: "yellow",
    stars: 4,
    subtitle: "TRUSTED PARTNER",
    depositTurnover: 2000000,
    withdrawalTurnover: 1600000,
    eligibility:
      "Minimum \u20B920 Lakhs Processed Deposit And \u20B916 Lakhs Processed Withdrawal In The Last 30 Days.",
    dailyWithdrawalLimit: 1500000,
    withdrawalHoldTime: "1 Hours",
    withdrawalCommission: "2.25",
    depositCommission: "3.00",
    sortOrder: 2,
  },
  {
    name: "Platinum",
    label: "PLATINUM",
    color: "platinum",
    stars: 5,
    subtitle: "ELITE PERFORMER",
    depositTurnover: 5000000,
    withdrawalTurnover: 2500000,
    eligibility:
      "Minimum \u20B950 Lakhs Processed Deposit And \u20B925 Lakhs Processed Withdrawal In The Last 30 Days.",
    dailyWithdrawalLimit: 2500000,
    withdrawalHoldTime: "40 Mins",
    withdrawalCommission: "2.40",
    depositCommission: "3.15",
    sortOrder: 3,
  },
];

async function seed() {
  console.log("Seeding tiers...");
  for (const tier of tierData) {
    await db.insert(tiers).values(tier).onConflictDoNothing();
  }
  console.log("Tiers seeded successfully!");
  process.exit(0);
}

seed().catch(console.error);
