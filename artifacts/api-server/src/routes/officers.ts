import { Router } from "express";
import { pool } from "@workspace/db";
import { OfficerRegistrationBody } from "../schemas";

const router = Router();

router.post("/officers/register", async (req, res) => {
  const parsed = OfficerRegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
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

  try {
    await pool.query(
      `INSERT INTO officer_applications
        (full_name, email, phone, department, municipio, languages,
         experience_years, has_motorcycle, available_days, motivation, referral_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        full_name,
        email ?? null,
        phone,
        department,
        municipio,
        JSON.stringify(languages),
        experience_years ?? null,
        has_motorcycle ?? null,
        available_days ?? null,
        motivation ?? null,
        referral_code ?? null,
      ]
    );

    return res.status(201).json({ success: true, message: "Officer application received" });
  } catch (err: any) {
    throw err;
  }
});

export default router;
