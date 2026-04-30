import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const marketingCampaignsTable = pgTable(
  "marketing_campaigns",
  {
    id:               serial("id").primaryKey(),
    adminId:          integer("admin_id")
                        .notNull()
                        .references(() => usersTable.id, { onDelete: "restrict" }),
    subject:          text("subject").notNull(),
    html:             text("html").notNull(),
    textBody:         text("text_body"),
    topic:            varchar("topic", { length: 80 }),
    country:          varchar("country", { length: 80 }),
    stateFilter:      varchar("state_filter", { length: 40 }),
    status:           varchar("status", { length: 20 }).notNull().default("pending"),
    totalRecipients:  integer("total_recipients").notNull().default(0),
    sent:             integer("sent").notNull().default(0),
    failed:           integer("failed").notNull().default(0),
    startedAt:        timestamp("started_at", { withTimezone: true }),
    completedAt:      timestamp("completed_at", { withTimezone: true }),
    createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_marketing_campaigns_admin_id").on(t.adminId),
    index("idx_marketing_campaigns_status").on(t.status),
  ],
);

export const campaignLogsTable = pgTable(
  "campaign_logs",
  {
    id:          serial("id").primaryKey(),
    campaignId:  integer("campaign_id")
                   .notNull()
                   .references(() => marketingCampaignsTable.id, { onDelete: "cascade" }),
    profileId:   integer("profile_id"),
    email:       text("email").notNull(),
    status:      varchar("status", { length: 10 }).notNull(),
    error:       text("error"),
    createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_campaign_logs_campaign_id").on(t.campaignId),
  ],
);

export type MarketingCampaign = typeof marketingCampaignsTable.$inferSelect;
export type InsertMarketingCampaign = typeof marketingCampaignsTable.$inferInsert;
export type CampaignLog = typeof campaignLogsTable.$inferSelect;
export type InsertCampaignLog = typeof campaignLogsTable.$inferInsert;
