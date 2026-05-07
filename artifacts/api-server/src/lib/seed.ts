import { randomBytes } from "crypto";
import { db, usersTable, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { logger } from "./logger";

interface AdminAccount {
  email: string;
  firstName: string;
  lastName: string;
}

const ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    email: "irfan@fincava.com",
    firstName: "Syed",
    lastName: "Irfan",
  },
  {
    email: "info@fincava.com",
    firstName: "Fincava",
    lastName: "Admin",
  },
];

export async function seedAdminAccounts(): Promise<void> {
  // Guard: refuse to run without ADMIN_DEFAULT_PASSWORD set.
  // The value itself is no longer used as the actual password —
  // each admin receives a unique random credential logged below.
  if (!process.env["ADMIN_DEFAULT_PASSWORD"]) {
    throw new Error(
      "ADMIN_DEFAULT_PASSWORD environment variable is required. " +
      "Refusing to seed admin accounts without it — set this variable before starting the server.",
    );
  }

  for (const account of ADMIN_ACCOUNTS) {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, account.email));

    if (existing) {
      logger.debug({ email: account.email }, "Admin account already exists, skipping seed");
      continue;
    }

    // Generate a unique random initial password for each admin account.
    // This ensures one leaked credential cannot compromise other admins.
    const tempPassword = randomBytes(16).toString("hex");

    const [user] = await db
      .insert(usersTable)
      .values({
        email: account.email,
        passwordHash: await hashPassword(tempPassword),
        role: "ADMIN",
        mustResetPassword: true,
      })
      .returning();

    await db.insert(profilesTable).values({
      userId: user.id,
      firstName: account.firstName,
      lastName: account.lastName,
      language: "en",
    });

    logger.info({ email: account.email }, "Admin seeded — retrieve temp password from secure channel");
    process.stdout.write(`[SEED] ${account.email} temp password: ${tempPassword}\n`);
  }
}
