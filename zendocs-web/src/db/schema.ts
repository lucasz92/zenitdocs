import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
    id: varchar("id", { length: 100 }).primaryKey(),
    userId: varchar("user_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    content: text("content"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
