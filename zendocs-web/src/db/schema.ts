import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const vaults = pgTable("vaults", {
    id: varchar("id", { length: 100 }).primaryKey(),
    userId: varchar("user_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    color: varchar("color", { length: 30 }).default("blue"),
    icon: varchar("icon", { length: 20 }).default("📁"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
    id: varchar("id", { length: 100 }).primaryKey(),
    userId: varchar("user_id", { length: 100 }).notNull(),
    vaultId: varchar("vault_id", { length: 100 }),   // null = sin bóveda
    name: varchar("name", { length: 255 }).notNull(),
    content: text("content"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
