import { Router, type IRouter } from "express";
import { z } from "zod";
import { sendEmail } from "../lib/email";
import { sendError } from "../lib/response";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  userType: z.enum(["BUYER", "SUPPLIER", "OTHER"]).optional(),
  message: z.string().min(10),
});

router.post("/contact", async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.message);
    return;
  }

  const { name, email, phone, company, userType, message } = parsed.data;
  const adminEmail = process.env["ADMIN_EMAIL"] ?? "info@fincava.com";

  const userTypeLabel = userType ?? "Not specified";
  const phoneDisplay = phone ?? "Not provided";
  const companyDisplay = company ?? "Not provided";

  const html = `
    <h2>New Contact Form Submission</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
      <tr><td><strong>Name</strong></td><td>${name}</td></tr>
      <tr><td><strong>Email</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td><strong>Phone</strong></td><td>${phoneDisplay}</td></tr>
      <tr><td><strong>Company</strong></td><td>${companyDisplay}</td></tr>
      <tr><td><strong>Type</strong></td><td>${userTypeLabel}</td></tr>
    </table>
    <h3>Message</h3>
    <p style="white-space:pre-wrap;">${message}</p>
  `;

  const text = `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nPhone: ${phoneDisplay}\nCompany: ${companyDisplay}\nType: ${userTypeLabel}\n\nMessage:\n${message}`;

  const result = await sendEmail({
    to: adminEmail,
    subject: `[FINCAVA] Contact from ${name}${company ? ` (${company})` : ""}`,
    html,
    text,
  });

  if (!result.ok) {
    logger.error({ detail: result.reason }, "contact form email failed");
    sendError(res, 502, "Failed to send message. Please try again.");
    return;
  }

  res.json({ ok: true });
});

export default router;
