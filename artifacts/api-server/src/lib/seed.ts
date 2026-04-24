import { db, usersTable, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { logger } from "./logger";

interface AdminAccount {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

const ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    email: "irfan@fincava.com",
    firstName: "Syed",
    lastName: "Irfan",
    password: process.env["ADMIN_DEFAULT_PASSWORD"] ?? "Admin@Fincava2026!",
  },
  {
    email: "info@fincava.com",
    firstName: "Fincava",
    lastName: "Admin",
    password: process.env["ADMIN_DEFAULT_PASSWORD"] ?? "Admin@Fincava2026!",
  },
];

export async function seedAdminAccounts(): Promise<void> {
  for (const account of ADMIN_ACCOUNTS) {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, account.email));

    if (existing) {
      logger.debug({ email: account.email }, "Admin account already exists, skipping seed");
      continue;
    }

    const [user] = await db
      .insert(usersTable)
      .values({
        email: account.email,
        passwordHash: await hashPassword(account.password),
        role: "ADMIN",
      })
      .returning();

    await db.insert(profilesTable).values({
      userId: user.id,
      firstName: account.firstName,
      lastName: account.lastName,
      language: "en",
    });

    logger.info({ email: account.email }, "Admin account seeded");
  }
}
