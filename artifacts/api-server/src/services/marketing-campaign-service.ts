import { db, buyerProfilesTable, usersTable, marketingCampaignsTable, campaignLogsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { logInteraction } from "../lib/interaction-logger";

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : typeof err === "string" ? err : "Unexpected error";

export async function processCampaign(campaignId: number): Promise<void> {
  try {
    await _runCampaign(campaignId);
  } catch (err: unknown) {
    logger.error({ err, campaignId }, "processCampaign: fatal error — marking campaign failed");
    try {
      await db
        .update(marketingCampaignsTable)
        .set({ status: "failed", completedAt: new Date() })
        .where(eq(marketingCampaignsTable.id, campaignId));
    } catch (dbErr: unknown) {
      logger.error({ dbErr, campaignId }, "processCampaign: could not update campaign to failed status");
    }
  }
}

async function _runCampaign(campaignId: number): Promise<void> {
  const [campaign] = await db
    .select()
    .from(marketingCampaignsTable)
    .where(eq(marketingCampaignsTable.id, campaignId));

  if (!campaign) {
    logger.error({ campaignId }, "processCampaign: campaign not found");
    return;
  }

  await db
    .update(marketingCampaignsTable)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(marketingCampaignsTable.id, campaignId));

  const conditions = [eq(buyerProfilesTable.marketingOptIn, true)];
  if (campaign.country) conditions.push(eq(buyerProfilesTable.country, campaign.country));
  if (campaign.stateFilter) conditions.push(eq(buyerProfilesTable.state, campaign.stateFilter));
  if (campaign.topic) {
    conditions.push(sql`${campaign.topic} = ANY(${buyerProfilesTable.marketingTopics})`);
  }

  const recipients = await db
    .select({
      profileId: buyerProfilesTable.id,
      email: usersTable.email,
    })
    .from(buyerProfilesTable)
    .innerJoin(usersTable, eq(usersTable.id, buyerProfilesTable.userId))
    .where(and(...conditions));

  await db
    .update(marketingCampaignsTable)
    .set({ totalRecipients: recipients.length })
    .where(eq(marketingCampaignsTable.id, campaignId));

  const textBody = campaign.textBody ?? campaign.html.replace(/<[^>]+>/g, "");
  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    try {
      const result = await sendEmail({
        to: r.email,
        subject: campaign.subject,
        html: campaign.html,
        text: textBody,
      });

      if (result.ok) {
        sent += 1;
        await db.insert(campaignLogsTable).values({
          campaignId,
          profileId: r.profileId,
          email: r.email,
          status: "sent",
        });
      } else {
        failed += 1;
        const errMsg =
          "detail" in result && result.detail
            ? `${result.reason}: ${result.detail}`
            : result.reason;
        await db.insert(campaignLogsTable).values({
          campaignId,
          profileId: r.profileId,
          email: r.email,
          status: "failed",
          error: errMsg,
        });
        logger.warn(
          { reason: result.reason, email: r.email, profileId: r.profileId, campaignId },
          "Marketing campaign: per-recipient send failure",
        );
      }
    } catch (err: unknown) {
      failed += 1;
      await db.insert(campaignLogsTable).values({
        campaignId,
        profileId: r.profileId,
        email: r.email,
        status: "failed",
        error: errorMessage(err),
      });
      logger.warn(
        { err, email: r.email, profileId: r.profileId, campaignId },
        "Marketing campaign: per-recipient exception",
      );
    }

    await db
      .update(marketingCampaignsTable)
      .set({ sent, failed })
      .where(eq(marketingCampaignsTable.id, campaignId));
  }

  await db
    .update(marketingCampaignsTable)
    .set({ status: "done", sent, failed, completedAt: new Date() })
    .where(eq(marketingCampaignsTable.id, campaignId));

  logInteraction({
    eventType: "buyer_marketing_send",
    actorType: "admin",
    referenceId: campaign.adminId,
    referenceType: "user",
    payload: {
      campaignId,
      adminId: campaign.adminId,
      subject: campaign.subject,
      topic: campaign.topic ?? null,
      country: campaign.country ?? null,
      state: campaign.stateFilter ?? null,
      attempted: recipients.length,
      sent,
      failed,
    },
  });

  logger.info(
    { campaignId, adminId: campaign.adminId, subject: campaign.subject, attempted: recipients.length, sent, failed },
    "Marketing campaign complete",
  );
}
