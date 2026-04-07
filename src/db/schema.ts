import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "superadmin"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "withdrawal"]);
export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "approved",
  "rejected",
]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email", { length: 255 }),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailOtp: varchar("email_otp", { length: 6 }),
  emailOtpExpiry: timestamp("email_otp_expiry"),
  role: userRoleEnum("role").default("user").notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  referralCode: varchar("referral_code", { length: 20 }).notNull().unique(),
  referredBy: varchar("referred_by", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Transactions table (deposits & withdrawals)
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  remarks: text("remarks"),
  processedBy: uuid("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// UTR table
export const utrStatusEnum = pgEnum("utr_status", ["pending", "approved", "rejected"]);

export const utrs = pgTable("utrs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  bankAccountId: uuid("bank_account_id")
    .references(() => bankAccounts.id),
  utrNumber: varchar("utr_number", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: utrStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bank accounts table
export const bankStatusEnum = pgEnum("bank_status", ["pending", "active", "inactive"]);

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  type: varchar("type", { length: 10 }).default("bank").notNull(), // "bank" or "upi"
  accountNo: varchar("account_no", { length: 30 }).notNull(),
  upiId: varchar("upi_id", { length: 100 }),
  qrCodeUrl: text("qr_code_url"),
  accountHolderName: varchar("account_holder_name", { length: 255 }).notNull(),
  ifscCode: varchar("ifsc_code", { length: 20 }).notNull(),
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  bankBranch: varchar("bank_branch", { length: 255 }),
  bankAddress: varchar("bank_address", { length: 500 }),
  maxWithdrawalAmount: integer("max_withdrawal_amount"),
  phone: varchar("phone", { length: 20 }),
  status: bankStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Deposit channels (managed by superadmin)
export const channelTypeEnum = pgEnum("channel_type", ["upi", "bank", "crypto"]);

export const depositChannels = pgTable("deposit_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: channelTypeEnum("type").notNull(),
  minAmount: integer("min_amount").notNull().default(500),
  maxAmount: integer("max_amount").notNull().default(200000),
  // For UPI: qr code image url
  upiId: varchar("upi_id", { length: 100 }),
  qrCodeUrl: text("qr_code_url"),
  // For Bank: details
  bankAccountNo: varchar("bank_account_no", { length: 30 }),
  bankIfsc: varchar("bank_ifsc", { length: 20 }),
  bankName: varchar("bank_name", { length: 255 }),
  bankHolderName: varchar("bank_holder_name", { length: 255 }),
  // For Crypto
  walletAddress: text("wallet_address"),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin emails (whitelist for admin/superadmin login)
export const adminEmails = pgTable("admin_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: userRoleEnum("role").notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin settings (key-value store for superadmin config)
export const adminSettings = pgTable("admin_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Security deposits
export const securityDeposits = pgTable("security_deposits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // normal or crypto
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  channelId: uuid("channel_id").references(() => depositChannels.id),
  paymentMethod: varchar("payment_method", { length: 20 }), // upi, bank, bep20, trc20
  utrNumber: varchar("utr_number", { length: 100 }), // UTR for UPI/Bank, TxnID for crypto
  status: transactionStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Security withdrawals
export const securityWithdrawals = pgTable("security_withdrawals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // normal or crypto
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  walletAddress: text("wallet_address"),
  status: transactionStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tiers table
export const tiers = pgTable("tiers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  label: varchar("label", { length: 50 }).notNull(),
  color: varchar("color", { length: 20 }).notNull(),
  stars: integer("stars").notNull().default(2),
  subtitle: varchar("subtitle", { length: 100 }).notNull(),
  depositTurnover: integer("deposit_turnover").notNull().default(0),
  withdrawalTurnover: integer("withdrawal_turnover").notNull().default(0),
  eligibility: text("eligibility").notNull(),
  dailyWithdrawalLimit: integer("daily_withdrawal_limit").notNull(),
  withdrawalHoldTime: varchar("withdrawal_hold_time", { length: 50 }).notNull(),
  withdrawalCommission: decimal("withdrawal_commission", { precision: 5, scale: 2 }).notNull(),
  depositCommission: decimal("deposit_commission", { precision: 5, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
