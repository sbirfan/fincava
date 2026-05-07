import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, profilesTable, companiesTable } from "@workspace/db";
import { UpdateUserProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { sendError } from "../lib/response";

const router: IRouter = Router();

router.patch("/users/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;

  const parsed = UpdateUserProfileBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.message);
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.userId, userId));

  const updateData: any = {};
  if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) updateData.lastName = parsed.data.lastName;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.country !== undefined) updateData.country = parsed.data.country;
  if (parsed.data.language !== undefined) updateData.language = parsed.data.language;
  if (parsed.data.avatarUrl !== undefined) updateData.avatarUrl = parsed.data.avatarUrl;

  let updatedProfile = profile;
  if (Object.keys(updateData).length > 0) {
    if (profile) {
      [updatedProfile] = await db.update(profilesTable).set(updateData)
        .where(eq(profilesTable.userId, userId)).returning();
    } else {
      [updatedProfile] = await db.insert(profilesTable).values({
        userId,
        firstName: updateData.firstName ?? "",
        lastName: updateData.lastName ?? "",
        country: updateData.country ?? null,
        language: updateData.language ?? "en",
        avatarUrl: updateData.avatarUrl ?? null,
      }).returning();
    }
  }

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt instanceof Date
      ? user.emailVerifiedAt.toISOString()
      : (user.emailVerifiedAt ?? null),
    firstName: updatedProfile?.firstName ?? "",
    lastName: updatedProfile?.lastName ?? "",
    country: updatedProfile?.country ?? null,
    language: updatedProfile?.language ?? "en",
    avatarUrl: updatedProfile?.avatarUrl ?? null,
    companyId: company?.id ?? null,
    companyName: company?.name ?? null,
    companyVerified: company?.verified ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
