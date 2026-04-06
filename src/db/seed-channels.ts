import { db } from "./index";
import { depositChannels, adminSettings } from "./schema";

async function seed() {
  console.log("Seeding deposit channels and settings...");

  // Deposit channels
  await db.insert(depositChannels).values([
    {
      name: "Channel 1",
      type: "upi",
      minAmount: 10000,
      maxAmount: 200000,
      upiId: "fastpayz@upi",
      sortOrder: 0,
    },
    {
      name: "Channel 6",
      type: "upi",
      minAmount: 500,
      maxAmount: 200000,
      upiId: "fastpayz2@upi",
      sortOrder: 1,
    },
    {
      name: "Channel 4",
      type: "bank",
      minAmount: 10000,
      maxAmount: 100000,
      bankAccountNo: "1234567890123",
      bankIfsc: "SBIN0001234",
      bankName: "State Bank of India",
      bankHolderName: "AbcPay Pvt Ltd",
      sortOrder: 2,
    },
    {
      name: "Channel 3",
      type: "crypto",
      minAmount: 100,
      maxAmount: 10000,
      walletAddress: "TRC20address_placeholder",
      sortOrder: 3,
    },
  ]).onConflictDoNothing();

  // Admin settings
  await db.insert(adminSettings).values([
    { key: "crypto_exchange_rate", value: "102.00" },
    { key: "blocked_withdrawal_info", value: "20% of the processed deposit amount will be temporarily held for 75 minutes and released automatically thereafter. Withdrawals will be available once the holding period concludes." },
  ]).onConflictDoNothing();

  console.log("Done!");
  process.exit(0);
}

seed().catch(console.error);
