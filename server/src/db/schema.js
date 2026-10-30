import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
} from "drizzle-orm/sqlite-core";

const now = () => Date.now();

/* ---------------------------------------------------------------- */
/* Work (case studies)                                               */
/* ---------------------------------------------------------------- */

export const work = sqliteTable(
  "work",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    index: text("index").notNull().default(""),
    title: text("title").notNull().default(""),
    year: text("year").notNull().default(""),
    discipline: text("discipline").notNull().default(""),
    series: text("series").notNull().default(""),
    size: text("size").notNull().default("wide"),
    image: text("image").notNull().default(""),
    alt: text("alt").notNull().default(""),
    summary: text("summary").notNull().default(""),
    client: text("client").notNull().default(""),
    tldr: text("tldr").notNull().default(""),
    challenge: text("challenge").notNull().default(""),
    pullQuote: text("pull_quote").notNull().default(""),
    quoteBy: text("quote_by").notNull().default(""),
    next: text("next"),
    /* JSON columns */
    role: text("role", { mode: "json" }).default(sql`'[]'`),
    stack: text("stack", { mode: "json" }).default(sql`'[]'`),
    approach: text("approach", { mode: "json" }).default(sql`'[]'`),
    outcome: text("outcome", { mode: "json" }).default(sql`'[]'`),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
  },
  (t) => ({
    sortIdx: index("work_sort_idx").on(t.sortOrder),
  })
);

/* ---------------------------------------------------------------- */
/* Journal posts                                                     */
/* ---------------------------------------------------------------- */

export const journal = sqliteTable("journal", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull().default(""),
  date: text("date").notNull().default(""),
  category: text("category").notNull().default(""),
  readingTime: text("reading_time").notNull().default(""),
  excerpt: text("excerpt").notNull().default(""),
  body: text("body").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

/* ---------------------------------------------------------------- */
/* Site settings (single row)                                        */
/* ---------------------------------------------------------------- */

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }),
});

/* ---------------------------------------------------------------- */
/* Auth: users + sessions                                            */
/* ---------------------------------------------------------------- */

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // random token
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

/* ---------------------------------------------------------------- */
/* Enquiries (project leads emailed from the commission form)        */
/* ---------------------------------------------------------------- */

export const enquiries = sqliteTable("enquiries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default(""),
  email: text("email").notNull().default(""),
  company: text("company").notNull().default(""),
  discipline: text("discipline").notNull().default(""),
  budget: text("budget").notNull().default(""),
  timeline: text("timeline").notNull().default(""),
  nda: integer("nda").notNull().default(0),
  brief: text("brief").notNull().default(""),
  draftReply: text("draft_reply").notNull().default(""),
  status: text("status").notNull().default("new"), // new|replied|won|lost|spam
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});
