import { Router } from "express";
import { db, officerApplicationsTable } from "@workspace/db";
import { OfficerRegistrationBody } from "../schemas";
import { sendError } from "../lib/response";
import { logger } from "../lib/logger";

const router = Router();

router.post("/officers/register", async (req, res) => {
  const parsed = OfficerRegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.message);
    return;
  }

  const {
    full_name,
    email,
    phone,
    department,
    municipio,
    languages,
    experience_years,
    has_motorcycle,
    available_days,
    motivation,
    referral_code,
  } = parsed.data;

  await db.insert(officerApplicationsTable).values({
    fullName: full_name,
    email: email ?? null,
    phone,
    department,
    municipio,
    languages: languages && languages.length > 0 ? JSON.stringify(languages) : null,
    experienceYears: experience_years ?? null,
    hasMotorcycle: has_motorcycle ?? null,
    availableDays: available_days ?? null,
    motivation: motivation ?? null,
    referralCode: referral_code ?? null,
  });

  logger.info({ email, department, municipio }, "officer application received");
  res.status(201).json({ success: true, message: "Officer application received" });
});

export default router;
