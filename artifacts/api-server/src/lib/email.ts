import { Resend } from "resend";
import { logger } from "./logger";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

const FROM_ADDRESS = "Fincava <noreply@fincava.com>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    logger.warn({ to: opts.to, subject: opts.subject }, "RESEND_API_KEY not set — email skipped");
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (error) {
      logger.error({ error, to: opts.to, subject: opts.subject }, "Failed to send email via Resend");
    } else {
      logger.info({ to: opts.to, subject: opts.subject }, "Email sent");
    }
  } catch (err) {
    logger.error({ err, to: opts.to, subject: opts.subject }, "Unexpected error sending email");
  }
}

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fincava</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f4; font-family: Georgia, 'Times New Roman', serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .header { background: #14532d; padding: 28px 32px; text-align: center; }
    .header h1 { margin: 0; color: #fff; font-size: 24px; letter-spacing: 0.02em; }
    .header p { margin: 4px 0 0; color: #bbf7d0; font-size: 13px; font-family: system-ui, sans-serif; }
    .body { padding: 32px; color: #1c1917; line-height: 1.6; font-size: 15px; }
    .body p { margin: 0 0 16px; }
    .btn { display: inline-block; background: #16a34a; color: #fff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-family: system-ui, sans-serif; font-weight: 600; font-size: 15px; margin: 8px 0 20px; }
    .note { color: #78716c; font-size: 13px; font-family: system-ui, sans-serif; border-top: 1px solid #e7e5e4; padding-top: 16px; margin-top: 8px; }
    .footer { background: #fafaf9; padding: 16px 32px; text-align: center; color: #a8a29e; font-size: 12px; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Fincava</h1>
      <p>Colombian Agricultural Marketplace</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">© ${new Date().getFullYear()} Fincava · Colombia's B2B Agricultural Marketplace</div>
  </div>
</body>
</html>`;
}

// ── Supplier lifecycle templates ──────────────────────────────────────────────

export function supplierApplicationConfirmationEmail(opts: {
  name: string;
  municipio: string;
  primaryProduct?: string | null;
}): { html: string; text: string } {
  const html = baseTemplate(`
    <p>Estimado/a ${opts.name},</p>
    <p>Hemos recibido su solicitud de registro en <strong>Fincava</strong>. Nuestro equipo revisará su información y se pondrá en contacto con usted a la brevedad posible.</p>
    <p><strong>Detalles de su solicitud:</strong></p>
    <ul style="padding-left:20px;margin:0 0 16px;">
      <li>Nombre: ${opts.name}</li>
      <li>Municipio: ${opts.municipio}</li>
      ${opts.primaryProduct ? `<li>Producto principal: ${opts.primaryProduct}</li>` : ""}
    </ul>
    <p>Mientras tanto, si tiene alguna pregunta, puede contactarnos en <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
    <p class="note">Gracias por confiar en Fincava para impulsar su negocio agrícola hacia los mercados internacionales.</p>
  `);
  const text = `Estimado/a ${opts.name},\n\nHemos recibido su solicitud de registro en Fincava.\n\nDetalles:\n- Nombre: ${opts.name}\n- Municipio: ${opts.municipio}${opts.primaryProduct ? `\n- Producto: ${opts.primaryProduct}` : ""}\n\nNuestro equipo revisará su información pronto. Para consultas: info@fincava.com\n\n— Equipo Fincava`;
  return { html, text };
}

export function supplierApplicationAdminAlertEmail(opts: {
  name: string;
  farmName?: string | null;
  phone: string;
  email?: string | null;
  municipio: string;
  department?: string | null;
  primaryProduct?: string | null;
  supplierId: number;
  adminUrl: string;
}): { html: string; text: string } {
  const displayName = opts.farmName && opts.farmName !== opts.name ? opts.farmName : null;
  const html = baseTemplate(`
    <p>A new supplier has submitted an onboarding application on Fincava.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-family:system-ui,sans-serif;font-size:14px;">
      <tr><td style="padding:6px 0;color:#78716c;width:140px;">Contact name</td><td style="padding:6px 0;font-weight:600;">${opts.name}</td></tr>
      ${displayName ? `<tr><td style="padding:6px 0;color:#78716c;">Farm / company</td><td style="padding:6px 0;font-weight:600;">${displayName}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#78716c;">Phone</td><td style="padding:6px 0;">${opts.phone}</td></tr>
      ${opts.email ? `<tr><td style="padding:6px 0;color:#78716c;">Email</td><td style="padding:6px 0;">${opts.email}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#78716c;">Location</td><td style="padding:6px 0;">${opts.municipio}${opts.department ? `, ${opts.department}` : ""}</td></tr>
      ${opts.primaryProduct ? `<tr><td style="padding:6px 0;color:#78716c;">Product</td><td style="padding:6px 0;">${opts.primaryProduct}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#78716c;">Supplier ID</td><td style="padding:6px 0;">#${opts.supplierId}</td></tr>
    </table>
    <p><a href="${opts.adminUrl}" class="btn">Review in admin panel</a></p>
  `);
  const text = `New supplier application on Fincava:\n\nContact: ${opts.name}${displayName ? `\nFarm/company: ${displayName}` : ""}\nPhone: ${opts.phone}${opts.email ? `\nEmail: ${opts.email}` : ""}\nLocation: ${opts.municipio}${opts.department ? `, ${opts.department}` : ""}${opts.primaryProduct ? `\nProduct: ${opts.primaryProduct}` : ""}\nSupplier ID: #${opts.supplierId}\n\nReview: ${opts.adminUrl}`;
  return { html, text };
}

// Status-change email supports ACTIVE (approved), INACTIVE_REJECTED, INACTIVE_SUSPENDED, PENDING
type StatusEmailKey = "ACTIVE" | "INACTIVE_REJECTED" | "INACTIVE_SUSPENDED" | "PENDING";

const STATUS_COPY: Record<StatusEmailKey, { subject: string; headline: string; body: string; nextSteps: string }> = {
  ACTIVE: {
    subject: "Your Fincava application has been approved",
    headline: "Your application has been approved ✓",
    body: "We are pleased to inform you that your supplier application has been <strong>approved</strong>. You are now an active supplier on the Fincava marketplace.",
    nextSteps: "Log in to your Fincava account to complete your profile and start connecting with international buyers.",
  },
  INACTIVE_REJECTED: {
    subject: "Update on your Fincava application",
    headline: "Application decision — not approved",
    body: "After carefully reviewing your application, we are unable to approve your supplier registration at this time. This may be due to missing information or eligibility requirements not being met.",
    nextSteps: "If you believe this decision is incorrect or would like to provide additional information, please contact us at <a href=\"mailto:info@fincava.com\" style=\"color:#16a34a;\">info@fincava.com</a> and we'll be happy to assist.",
  },
  INACTIVE_SUSPENDED: {
    subject: "Your Fincava account has been suspended",
    headline: "Account suspended",
    body: "Your Fincava supplier account has been <strong>temporarily suspended</strong>. This may be due to a compliance review or policy issue that requires attention.",
    nextSteps: "To understand the reason for suspension or to appeal, please contact our team at <a href=\"mailto:info@fincava.com\" style=\"color:#16a34a;\">info@fincava.com</a> as soon as possible.",
  },
  PENDING: {
    subject: "Your Fincava application is under review",
    headline: "Your application is under review",
    body: "Your supplier application is currently <strong>under review</strong> by our team. We carefully evaluate each application and will notify you as soon as a decision has been made.",
    nextSteps: "If you have questions in the meantime, please contact us at <a href=\"mailto:info@fincava.com\" style=\"color:#16a34a;\">info@fincava.com</a>.",
  },
};

export function supplierStatusChangeEmail(opts: {
  name: string;
  newStatus: string;
  reason?: "REJECTED" | "SUSPENDED" | null;
  appUrl: string;
}): { html: string; text: string; subject: string } | null {
  let key: StatusEmailKey | null = null;
  if (opts.newStatus === "ACTIVE") key = "ACTIVE";
  else if (opts.newStatus === "PENDING") key = "PENDING";
  else if (opts.newStatus === "INACTIVE") {
    key = opts.reason === "SUSPENDED" ? "INACTIVE_SUSPENDED" : "INACTIVE_REJECTED";
  }
  if (!key) return null;

  const copy = STATUS_COPY[key];
  const html = baseTemplate(`
    <p>Estimado/a ${opts.name},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">${copy.headline}</h2>
    <p>${copy.body}</p>
    <p>${copy.nextSteps}</p>
    ${opts.newStatus === "ACTIVE" ? `<p><a href="${opts.appUrl}/login" class="btn">Log in to my account</a></p>` : ""}
    <p class="note">If you have any questions, please reach out at <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
  `);
  const text = `${copy.headline}\n\nEstimado/a ${opts.name},\n\n${copy.body.replace(/<[^>]+>/g, "")}\n\n${copy.nextSteps.replace(/<[^>]+>/g, "")}\n\n— Equipo Fincava`;
  return { html, text, subject: copy.subject };
}

// ── Inquiry & RFQ notification templates ─────────────────────────────────────

export function newInquiryEmail(opts: {
  supplierName: string;
  buyerName: string;
  buyerCompany?: string | null;
  buyerCountry?: string | null;
  productName: string;
  messagePreview: string;
  quantityKg?: number | null;
  inquiriesUrl: string;
}): { html: string; text: string; subject: string } {
  const rawPreview = opts.messagePreview.length > 200
    ? `${opts.messagePreview.slice(0, 200)}…`
    : opts.messagePreview;
  const subject = `New inquiry from ${opts.buyerName}`;
  const html = baseTemplate(`
    <p>Hello ${esc(opts.supplierName)},</p>
    <p>A buyer has sent you a new inquiry on Fincava about <strong>${esc(opts.productName)}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-family:system-ui,sans-serif;font-size:14px;">
      <tr><td style="padding:6px 0;color:#78716c;width:120px;">From</td><td style="padding:6px 0;font-weight:600;">${esc(opts.buyerName)}${opts.buyerCompany ? ` · ${esc(opts.buyerCompany)}` : ""}</td></tr>
      ${opts.buyerCountry ? `<tr><td style="padding:6px 0;color:#78716c;">Country</td><td style="padding:6px 0;">${esc(opts.buyerCountry)}</td></tr>` : ""}
      ${opts.quantityKg ? `<tr><td style="padding:6px 0;color:#78716c;">Quantity</td><td style="padding:6px 0;">${opts.quantityKg.toLocaleString()} kg</td></tr>` : ""}
    </table>
    <p style="background:#f5f5f4;border-left:3px solid #16a34a;padding:12px 16px;margin:0 0 20px;font-size:14px;font-family:system-ui,sans-serif;color:#44403c;">${esc(rawPreview)}</p>
    <p><a href="${opts.inquiriesUrl}" class="btn">View inquiry &amp; reply</a></p>
    <p class="note">Log in to your Fincava supplier account to read the full message and respond directly to the buyer.</p>
  `);
  const text = `Hello ${opts.supplierName},\n\nYou have a new inquiry from ${opts.buyerName}${opts.buyerCompany ? ` (${opts.buyerCompany})` : ""}${opts.buyerCountry ? `, ${opts.buyerCountry}` : ""} about ${opts.productName}.\n\nMessage:\n${opts.messagePreview}\n\nView and reply: ${opts.inquiriesUrl}\n\n— Equipo Fincava`;
  return { html, text, subject };
}

export function rfqResponseEmail(opts: {
  buyerName: string;
  supplierName: string;
  rfqTitle: string;
  pricePerKgUSD: number;
  leadTimeDays: number;
  rfqUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = `${opts.supplierName} responded to your RFQ`;
  const html = baseTemplate(`
    <p>Hello ${esc(opts.buyerName)},</p>
    <p>A supplier has responded to your request for quotation on Fincava.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-family:system-ui,sans-serif;font-size:14px;">
      <tr><td style="padding:6px 0;color:#78716c;width:140px;">RFQ</td><td style="padding:6px 0;font-weight:600;">${esc(opts.rfqTitle)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Supplier</td><td style="padding:6px 0;font-weight:600;">${esc(opts.supplierName)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Quoted price</td><td style="padding:6px 0;">$${opts.pricePerKgUSD.toFixed(2)} / kg</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Lead time</td><td style="padding:6px 0;">${opts.leadTimeDays} days</td></tr>
    </table>
    <p><a href="${opts.rfqUrl}" class="btn">View full response</a></p>
    <p class="note">Log in to your Fincava account to compare all responses and award the RFQ.</p>
  `);
  const text = `Hello ${opts.buyerName},\n\n${opts.supplierName} has responded to your RFQ "${opts.rfqTitle}".\n\nQuoted price: $${opts.pricePerKgUSD.toFixed(2)} / kg\nLead time: ${opts.leadTimeDays} days\n\nView the full response: ${opts.rfqUrl}\n\n— Equipo Fincava`;
  return { html, text, subject };
}

export function passwordResetEmail(opts: { resetUrl: string; firstName: string }): { html: string; text: string } {
  const html = baseTemplate(`
    <p>Hello ${opts.firstName},</p>
    <p>We received a request to reset the password for your Fincava account. Click the button below to choose a new password:</p>
    <p><a href="${opts.resetUrl}" class="btn">Reset my password</a></p>
    <p class="note">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
    <p class="note">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${opts.resetUrl}" style="color:#16a34a;word-break:break-all;">${opts.resetUrl}</a></p>
  `);
  const text = `Hello ${opts.firstName},\n\nWe received a request to reset your Fincava password.\n\nReset your password here: ${opts.resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\n— Fincava`;
  return { html, text };
}
