import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const publicStoriesTable = pgTable(
  "public_stories",
  {
    id:        serial("id").primaryKey(),
    storyKey:  text("story_key").notNull(),
    page:      text("page").notNull().default("impact"),
    section:   text("section").notNull().default("farmer_voices"),
    name:      text("name").notNull(),
    region:    text("region"),
    product:   text("product"),
    quote:     text("quote"),
    photoUrl:  text("photo_url"),
    isVisible: boolean("is_visible").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_public_stories_key").on(t.storyKey),
    index("idx_public_stories_page_section").on(t.page, t.section),
    index("idx_public_stories_visible").on(t.isVisible),
  ],
);

export type PublicStory = typeof publicStoriesTable.$inferSelect;
export type InsertPublicStory = typeof publicStoriesTable.$inferInsert;
