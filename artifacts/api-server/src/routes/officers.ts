import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

router.post("/api/officers/register", async (req, res) => {
  try {
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
    } = req.body;

    if (!full_name || !phone || !department || !municipio) {
      return res.status(400).json({
        error: "Missing required fields: full_name, phone, department, municipio",
      });
    }

    await pool.query(
      `INSERT INTO officer_applications
        (full_name, email, phone, department, municipio, languages,
         experience_years, has_motorcycle, available_days, motivation, referral_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        full_name,
        email || null,
        phone,
        department,
        municipio,
        JSON.stringify(languages || []),
        experience_years || null,
        has_motorcycle ?? null,
        available_days || null,
        motivation || null,
        referral_code || null,
      ]
    );

    return res.status(201).json({ success: true, message: "Officer application received" });
  } catch (err: any) {
    console.error("Officer registration error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;