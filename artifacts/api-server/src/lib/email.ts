import { Resend } from "resend";
import { logger } from "./logger";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

const FROM_ADDRESS = "Fincava <noreply@fincava.com>";

export type EmailResult =
  | { ok: true }
  | { ok: false; reason: "no_api_key" | "resend_error" | "exception"; detail?: string };

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const resend = getResend();
  if (!resend) {
    logger.warn({ to: opts.to, subject: opts.subject }, "RESEND_API_KEY not set — email skipped");
    return { ok: false, reason: "no_api_key" };
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
      return { ok: false, reason: "resend_error", detail: (error as any).message ?? String(error) };
    }
    logger.info({ to: opts.to, subject: opts.subject }, "Email sent");
    return { ok: true };
  } catch (err: any) {
    logger.error({ err, to: opts.to, subject: opts.subject }, "Unexpected error sending email");
    return { ok: false, reason: "exception", detail: err?.message ?? String(err) };
  }
}

export async function getAdminEmails(): Promise<string[]> {
  const admins = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.role, "ADMIN"));
  return admins.map((a) => a.email);
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
  lang?: string;
}): { html: string; text: string } {
  const isEs = (opts.lang ?? "en") === "es";

  if (isEs) {
    const html = baseTemplate(`
      <p>Estimado/a ${esc(opts.name)},</p>
      <p>Hemos recibido su solicitud de registro en <strong>Fincava</strong>. Nuestro equipo revisará su información y se pondrá en contacto con usted a la brevedad posible.</p>
      <p><strong>Detalles de su solicitud:</strong></p>
      <ul style="padding-left:20px;margin:0 0 16px;">
        <li>Nombre: ${esc(opts.name)}</li>
        <li>Municipio: ${esc(opts.municipio)}</li>
        ${opts.primaryProduct ? `<li>Producto principal: ${esc(opts.primaryProduct)}</li>` : ""}
      </ul>
      <p>Mientras tanto, si tiene alguna pregunta, puede contactarnos en <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
      <p class="note">Gracias por confiar en Fincava para impulsar su negocio agrícola hacia los mercados internacionales.</p>
    `);
    const text = `Estimado/a ${opts.name},\n\nHemos recibido su solicitud de registro en Fincava.\n\nDetalles:\n- Nombre: ${opts.name}\n- Municipio: ${opts.municipio}${opts.primaryProduct ? `\n- Producto: ${opts.primaryProduct}` : ""}\n\nNuestro equipo revisará su información pronto. Para consultas: info@fincava.com\n\n— Equipo Fincava`;
    return { html, text };
  }

  // English template (default)
  const html = baseTemplate(`
    <p>Dear ${esc(opts.name)},</p>
    <p>We have received your registration request on <strong>Fincava</strong>. Our team will review your information and be in touch with you shortly.</p>
    <p><strong>Application details:</strong></p>
    <ul style="padding-left:20px;margin:0 0 16px;">
      <li>Name: ${esc(opts.name)}</li>
      <li>Municipio: ${esc(opts.municipio)}</li>
      ${opts.primaryProduct ? `<li>Primary product: ${esc(opts.primaryProduct)}</li>` : ""}
    </ul>
    <p>If you have any questions in the meantime, please contact us at <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
    <p class="note">Thank you for choosing Fincava to connect with international buyers.</p>
  `);
  const text = `Dear ${opts.name},\n\nWe have received your registration request on Fincava.\n\nApplication details:\n- Name: ${opts.name}\n- Municipio: ${opts.municipio}${opts.primaryProduct ? `\n- Primary product: ${opts.primaryProduct}` : ""}\n\nOur team will review your information shortly. Questions? Contact us at info@fincava.com\n\n— The Fincava Team`;
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
      <tr><td style="padding:6px 0;color:#78716c;width:140px;">Contact name</td><td style="padding:6px 0;font-weight:600;">${esc(opts.name)}</td></tr>
      ${displayName ? `<tr><td style="padding:6px 0;color:#78716c;">Farm / company</td><td style="padding:6px 0;font-weight:600;">${esc(displayName)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#78716c;">Phone</td><td style="padding:6px 0;">${esc(opts.phone)}</td></tr>
      ${opts.email ? `<tr><td style="padding:6px 0;color:#78716c;">Email</td><td style="padding:6px 0;">${esc(opts.email)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#78716c;">Location</td><td style="padding:6px 0;">${esc(opts.municipio)}${opts.department ? `, ${esc(opts.department)}` : ""}</td></tr>
      ${opts.primaryProduct ? `<tr><td style="padding:6px 0;color:#78716c;">Product</td><td style="padding:6px 0;">${esc(opts.primaryProduct)}</td></tr>` : ""}
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
    <p>Estimado/a ${esc(opts.name)},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">${copy.headline}</h2>
    <p>${copy.body}</p>
    <p>${copy.nextSteps}</p>
    ${opts.newStatus === "ACTIVE" ? `<p><a href="${opts.appUrl}/login" class="btn">Log in to my account</a></p>` : ""}
    <p class="note">If you have any questions, please reach out at <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
  `);
  const text = `${copy.headline}\n\nEstimado/a ${opts.name},\n\n${copy.body.replace(/<[^>]+>/g, "")}\n\n${copy.nextSteps.replace(/<[^>]+>/g, "")}\n\n— Equipo Fincava`;
  return { html, text, subject: copy.subject };
}

// ── Graduation notification templates ────────────────────────────────────────

export function supplierGraduationEmail(opts: {
  name: string;
  municipio: string;
  pathway?: string | null;
  appUrl: string;
  state: "SELLABLE" | "PUBLISHED";
}): { html: string; text: string; subject: string } {
  if (opts.state === "PUBLISHED") {
    const subject = "Your Fincava supplier profile is now live";
    const html = baseTemplate(`
      <p>Estimado/a ${esc(opts.name)},</p>
      <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">¡Su perfil ya está publicado en Fincava! 🎉</h2>
      <p>Su perfil de proveedor ha sido <strong>publicado</strong> en el marketplace de Fincava. Compradores internacionales ya pueden encontrar sus productos y ponerse en contacto con usted.</p>
      <p><strong>Municipio:</strong> ${esc(opts.municipio)}${opts.pathway ? `<br /><strong>Perfil de exportación:</strong> Camino ${esc(opts.pathway)}` : ""}</p>
      <p><a href="${opts.appUrl}/supplier-dashboard" class="btn">Ver mi perfil</a></p>
      <p class="note">Si tiene alguna pregunta, contáctenos en <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
    `);
    const text = `Estimado/a ${opts.name},\n\nSu perfil de proveedor ha sido publicado en Fincava. Compradores internacionales ya pueden encontrar sus productos.\n\nVer mi perfil: ${opts.appUrl}/supplier-dashboard\n\n— Equipo Fincava`;
    return { html, text, subject };
  }

  const subject = "¡Felicidades! Su perfil de Fincava está listo para compradores";

  const pathwayBody =
    opts.pathway === "B"
      ? "Hemos evaluado su información y su perfil ha alcanzado el nivel <strong>SELLABLE</strong>. Ha sido asignado al <strong>Plan de Preparación de 30 días</strong> — nuestro equipo le contactará para coordinar los pasos pendientes de documentación y exportación."
      : opts.pathway === "C"
        ? "Hemos evaluado su información y su perfil ha alcanzado el nivel <strong>SELLABLE</strong> con un plan de desarrollo extendido. Ha sido asignado al <strong>Plan de 90 días</strong> con apoyo de nuestro equipo de desarrollo de negocios (BD). Le contactaremos próximamente."
        : "Hemos evaluado su información y su perfil ha alcanzado el nivel <strong>SELLABLE</strong> — ya está listo para ser conectado con compradores internacionales a través de Fincava.";

  const html = baseTemplate(`
    <p>Estimado/a ${esc(opts.name)},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">¡Su perfil ha sido aprobado para el marketplace! ✓</h2>
    <p>${pathwayBody}</p>
    <p><strong>Municipio:</strong> ${esc(opts.municipio)}${opts.pathway ? `<br /><strong>Camino de exportación:</strong> Camino ${esc(opts.pathway)}` : ""}</p>
    <p>En los próximos días nuestro equipo revisará su perfil para publicarlo oficialmente en el marketplace. Le notificaremos en cuanto esté en línea.</p>
    <p><a href="${opts.appUrl}/supplier-dashboard" class="btn">Ver mi perfil</a></p>
    <p class="note">Si tiene alguna pregunta, contáctenos en <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
  `);
  const text = `Estimado/a ${opts.name},\n\nSu perfil ha sido aprobado para el marketplace de Fincava (SELLABLE). Nuestro equipo lo publicará pronto.\n\nVer mi perfil: ${opts.appUrl}/supplier-dashboard\n\n— Equipo Fincava`;
  return { html, text, subject };
}

export function supplierSuspensionEmail(opts: {
  name: string;
  justification?: string | null;
  appUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = "Su cuenta de Fincava ha sido suspendida temporalmente";
  const html = baseTemplate(`
    <p>Estimado/a ${esc(opts.name)},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#92400e;">Cuenta suspendida temporalmente</h2>
    <p>Su cuenta de proveedor en Fincava ha sido <strong>suspendida temporalmente</strong>. Esto puede deberse a una revisión de cumplimiento o a un asunto que requiere atención.</p>
    ${opts.justification ? `<div style="background:#fffbeb;border-left:4px solid #d97706;padding:14px 18px;margin:0 0 20px;border-radius:0 6px 6px 0;font-size:14px;color:#92400e;"><p style="margin:0;font-weight:600;">Motivo:</p><p style="margin:4px 0 0;">${esc(opts.justification)}</p></div>` : ""}
    <p>Para comprender el motivo de la suspensión o para apelar esta decisión, por favor contacte a nuestro equipo lo antes posible.</p>
    <p><a href="mailto:info@fincava.com" class="btn">Contactar soporte</a></p>
    <p class="note">Si cree que esto es un error, escríbanos a <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
  `);
  const text = `Estimado/a ${opts.name},\n\nSu cuenta de proveedor en Fincava ha sido suspendida temporalmente.${opts.justification ? `\n\nMotivo: ${opts.justification}` : ""}\n\nPara resolver esta situación, contacte a nuestro equipo: info@fincava.com\n\n— Equipo Fincava`;
  return { html, text, subject };
}

// ── Order & loan status templates ────────────────────────────────────────────

type OrderStatusKey =
  | "INQUIRY" | "SAMPLE_REQUESTED" | "QUOTED" | "CONFIRMED"
  | "IN_PRODUCTION" | "SHIPPED" | "DELIVERED" | "COMPLETED" | "CANCELLED";

const ORDER_STATUS_COPY: Record<OrderStatusKey, { subject: string; headline: string; body: string; nextSteps: string }> = {
  INQUIRY: {
    subject: "We received your order inquiry",
    headline: "Order inquiry received",
    body: "Your order inquiry has been received and is awaiting supplier review.",
    nextSteps: "We'll notify you as soon as the supplier responds.",
  },
  SAMPLE_REQUESTED: {
    subject: "Sample requested for your order",
    headline: "Sample requested",
    body: "A product sample has been requested for your order. The supplier will arrange shipment of a sample for your review.",
    nextSteps: "Once you approve the sample, your order will proceed to production.",
  },
  QUOTED: {
    subject: "A quote is ready for your order",
    headline: "Quote ready",
    body: "Your supplier has prepared a quote for your order. Please review the details in your account.",
    nextSteps: "Log in to view the quote and confirm your order.",
  },
  CONFIRMED: {
    subject: "Your order has been confirmed",
    headline: "Order confirmed ✓",
    body: "Great news — your order has been <strong>confirmed</strong> by the supplier and is now in our system.",
    nextSteps: "The supplier will begin production soon. We'll notify you when your order ships.",
  },
  IN_PRODUCTION: {
    subject: "Your order is now in production",
    headline: "Order in production",
    body: "Your order is currently <strong>in production</strong>. The supplier is preparing your goods.",
    nextSteps: "We'll notify you as soon as your order is ready to ship.",
  },
  SHIPPED: {
    subject: "Your order has been shipped",
    headline: "Order shipped 🚢",
    body: "Your order is on its way! The supplier has confirmed shipment of your goods.",
    nextSteps: "You can track your order status in your Fincava account.",
  },
  DELIVERED: {
    subject: "Your order has been delivered",
    headline: "Order delivered",
    body: "Your order has been marked as <strong>delivered</strong>. We hope everything arrived in perfect condition.",
    nextSteps: "If you have any issues with the shipment, please contact us at <a href=\"mailto:info@fincava.com\" style=\"color:#16a34a;\">info@fincava.com</a>.",
  },
  COMPLETED: {
    subject: "Your order is complete",
    headline: "Order complete ✓",
    body: "Your order has been successfully <strong>completed</strong>. Thank you for trading on Fincava.",
    nextSteps: "We'd love to have you back. Browse the marketplace to discover more Colombian agricultural products.",
  },
  CANCELLED: {
    subject: "Your order has been cancelled",
    headline: "Order cancelled",
    body: "Your order has been <strong>cancelled</strong>. We're sorry for the inconvenience.",
    nextSteps: "If you have questions or would like to place a new order, please contact us at <a href=\"mailto:info@fincava.com\" style=\"color:#16a34a;\">info@fincava.com</a>.",
  },
};

export function orderStatusEmail(opts: {
  buyerName: string;
  orderId: number;
  newStatus: string;
  totalUSD: number;
  incoterm?: string | null;
  destinationPort?: string | null;
  orderUrl: string;
}): { html: string; text: string; subject: string } | null {
  const copy = ORDER_STATUS_COPY[opts.newStatus as OrderStatusKey];
  if (!copy) return null;

  const orderRef = `ORD-${String(opts.orderId).padStart(4, "0")}`;
  const html = baseTemplate(`
    <p>Hello ${esc(opts.buyerName)},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">${copy.headline}</h2>
    <p>${copy.body}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-family:system-ui,sans-serif;font-size:14px;">
      <tr><td style="padding:6px 0;color:#78716c;width:140px;">Order</td><td style="padding:6px 0;font-weight:600;">${esc(orderRef)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Value</td><td style="padding:6px 0;">$${opts.totalUSD.toFixed(2)}</td></tr>
      ${opts.incoterm ? `<tr><td style="padding:6px 0;color:#78716c;">Incoterm</td><td style="padding:6px 0;">${esc(opts.incoterm)}</td></tr>` : ""}
      ${opts.destinationPort ? `<tr><td style="padding:6px 0;color:#78716c;">Destination</td><td style="padding:6px 0;">${esc(opts.destinationPort)}</td></tr>` : ""}
    </table>
    <p>${copy.nextSteps}</p>
    <p><a href="${opts.orderUrl}" class="btn">View order</a></p>
    <p class="note">Questions? Contact us at <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
  `);
  const text = `Hello ${opts.buyerName},\n\n${copy.headline}\n\n${copy.body.replace(/<[^>]+>/g, "")}\n\nOrder: ${orderRef}\nValue: $${opts.totalUSD.toFixed(2)}${opts.incoterm ? `\nIncoterm: ${opts.incoterm}` : ""}${opts.destinationPort ? `\nDestination: ${opts.destinationPort}` : ""}\n\n${copy.nextSteps.replace(/<[^>]+>/g, "")}\n\nView order: ${opts.orderUrl}\n\n— Equipo Fincava`;
  return { html, text, subject: `${copy.subject} (${orderRef})` };
}

type LoanStatusKey = "ACTIVE" | "REPAID" | "DEFAULTED" | "CANCELLED";

// Supplier-facing copy: buyer financing directly affects supplier payment guarantee
const LOAN_STATUS_COPY: Record<LoanStatusKey, { subject: string; headline: string; body: string; nextSteps: string }> = {
  ACTIVE: {
    subject: "Buyer financing approved — your order payment is secured",
    headline: "Order financing approved ✓",
    body: "The buyer's financing for your order has been <strong>approved and disbursed</strong>. Payment for your order is now guaranteed.",
    nextSteps: "Continue processing the order as agreed. Payment will be settled according to your agreed terms. View the order in your Fincava supplier account.",
  },
  REPAID: {
    subject: "Order financing fully repaid",
    headline: "Financing repaid",
    body: "The buyer financing associated with your order has been <strong>fully repaid</strong>. This completes the financing cycle for this order.",
    nextSteps: "No action is required. You can view the details in your Fincava supplier account.",
  },
  DEFAULTED: {
    subject: "Important: Buyer financing for your order has defaulted",
    headline: "Financing default — action may be required",
    body: "The buyer financing associated with your order has been marked as <strong>defaulted</strong>. Our team is reviewing the situation.",
    nextSteps: "Please contact us immediately at <a href=\"mailto:info@fincava.com\" style=\"color:#16a34a;\">info@fincava.com</a> if you have concerns about payment for your order.",
  },
  CANCELLED: {
    subject: "Order financing has been cancelled",
    headline: "Financing cancelled",
    body: "The buyer financing associated with your order has been <strong>cancelled</strong>. This may affect the order's payment timeline.",
    nextSteps: "Please contact us at <a href=\"mailto:info@fincava.com\" style=\"color:#16a34a;\">info@fincava.com</a> to discuss next steps for this order.",
  },
};

export function loanStatusEmail(opts: {
  supplierName: string;
  orderId: number;
  orderRef: string;
  newStatus: string;
  principalUSD: number;
  orderUrl: string;
}): { html: string; text: string; subject: string } | null {
  const copy = LOAN_STATUS_COPY[opts.newStatus as LoanStatusKey];
  if (!copy) return null;

  const html = baseTemplate(`
    <p>Hello ${esc(opts.supplierName)},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">${copy.headline}</h2>
    <p>${copy.body}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-family:system-ui,sans-serif;font-size:14px;">
      <tr><td style="padding:6px 0;color:#78716c;width:140px;">Order</td><td style="padding:6px 0;font-weight:600;">${esc(opts.orderRef)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Financed amount</td><td style="padding:6px 0;">$${opts.principalUSD.toFixed(2)}</td></tr>
    </table>
    <p>${copy.nextSteps}</p>
    <p><a href="${opts.orderUrl}" class="btn">View order</a></p>
    <p class="note">Questions? Contact us at <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
  `);
  const text = `Hello ${opts.supplierName},\n\n${copy.headline}\n\n${copy.body.replace(/<[^>]+>/g, "")}\n\nOrder: ${opts.orderRef}\nFinanced: $${opts.principalUSD.toFixed(2)}\n\n${copy.nextSteps.replace(/<[^>]+>/g, "")}\n\nView order: ${opts.orderUrl}\n\n— Equipo Fincava`;
  return { html, text, subject: copy.subject };
}

// ── Buyer profile approval templates ─────────────────────────────────────────

export function buyerRevisionRequestedEmail(opts: {
  buyerName: string;
  buyerEmail: string;
  revisionNote: string;
  profileUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = "Action needed: your Fincava sourcing profile needs updates";
  const html = baseTemplate(`
    <p>Hello ${esc(opts.buyerName)},</p>
    <p>Our team has reviewed your Fincava sourcing profile and needs a few updates before we can match you with suppliers.</p>
    <div style="background:#fffbeb;border-left:4px solid #d97706;padding:14px 18px;margin:0 0 20px;border-radius:0 6px 6px 0;font-family:system-ui,sans-serif;font-size:14px;color:#92400e;">
      <p style="margin:0 0 4px;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;">Updates requested</p>
      <p style="margin:0;line-height:1.6;">${esc(opts.revisionNote)}</p>
    </div>
    <p>Please log in and update the sections highlighted on your profile page.</p>
    <p><a href="${opts.profileUrl}" class="btn">Update My Profile</a></p>
    <p class="note">Once you've made the updates, our team will be notified automatically. If you have questions, contact us at <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
  `);
  const text = `Hello ${opts.buyerName},\n\nOur team has reviewed your Fincava sourcing profile and needs a few updates.\n\nUpdates requested:\n${opts.revisionNote}\n\nPlease update your profile: ${opts.profileUrl}\n\nIf you have questions, contact info@fincava.com\n\n— Equipo Fincava`;
  return { html, text, subject };
}

// ── Conversation escalation template ─────────────────────────────────────────

export function conversationEscalationEmail(opts: {
  requesterName: string;
  requesterRole: string;
  otherPartyName: string;
  note: string;
  messages: { senderName: string; content: string; createdAt: string }[];
  adminUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = `Clarification requested by ${esc(opts.requesterName)} — Fincava conversation`;
  const msgRows = opts.messages.slice(-8).map(m =>
    `<tr>
      <td style="padding:6px 10px;color:#78716c;font-size:12px;white-space:nowrap;vertical-align:top;">${esc(m.senderName)}</td>
      <td style="padding:6px 10px;font-size:13px;color:#1c1917;">${esc(m.content)}</td>
      <td style="padding:6px 10px;color:#a8a29e;font-size:11px;white-space:nowrap;vertical-align:top;">${new Date(m.createdAt).toLocaleString()}</td>
    </tr>`
  ).join("");

  const html = baseTemplate(`
    <p>Hello Fincava team,</p>
    <p><strong>${esc(opts.requesterName)}</strong> (${esc(opts.requesterRole)}) has requested clarification in their conversation with <strong>${esc(opts.otherPartyName)}</strong> and needs your assistance facilitating the discussion.</p>
    <div style="background:#fffbeb;border-left:4px solid #d97706;padding:14px 18px;margin:0 0 20px;border-radius:0 6px 6px 0;font-family:system-ui,sans-serif;font-size:14px;color:#92400e;">
      <p style="margin:0 0 4px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">User note</p>
      <p style="margin:0;line-height:1.6;">${esc(opts.note)}</p>
    </div>
    <p style="font-family:system-ui,sans-serif;font-size:13px;font-weight:600;color:#44403c;margin:0 0 8px;">Recent conversation (last 8 messages)</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-family:system-ui,sans-serif;background:#f9f9f8;border-radius:6px;overflow:hidden;">
      <thead><tr style="border-bottom:1px solid #e7e5e4;">
        <th style="padding:6px 10px;text-align:left;font-size:11px;color:#78716c;font-weight:600;">From</th>
        <th style="padding:6px 10px;text-align:left;font-size:11px;color:#78716c;font-weight:600;">Message</th>
        <th style="padding:6px 10px;text-align:left;font-size:11px;color:#78716c;font-weight:600;">Time</th>
      </tr></thead>
      <tbody>${msgRows}</tbody>
    </table>
    <p><a href="${opts.adminUrl}" class="btn">Open conversation in admin</a></p>
    <p class="note">Please reach out to both parties to facilitate the discussion. Reply to <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a> with any questions.</p>
  `);
  const textMsgs = opts.messages.slice(-8).map(m => `  [${m.senderName}]: ${m.content}`).join("\n");
  const text = `Hello Fincava team,\n\n${opts.requesterName} (${opts.requesterRole}) needs help with their conversation with ${opts.otherPartyName}.\n\nUser note:\n${opts.note}\n\nRecent messages:\n${textMsgs}\n\nAdmin panel: ${opts.adminUrl}\n\n— Fincava Platform`;
  return { html, text, subject };
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

// ── RFQ award notification (supplier-facing) ─────────────────────────────────

export function rfqAwardEmail(opts: {
  supplierName: string;
  rfqTitle: string;
  pricePerKgUSD: number;
  leadTimeDays: number;
  rfqUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = `Your bid has been awarded — ${opts.rfqTitle}`;
  const html = baseTemplate(`
    <p>Hello ${esc(opts.supplierName)},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">Your bid has been awarded ✓</h2>
    <p>Congratulations! The buyer has selected your response for the following RFQ on Fincava.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-family:system-ui,sans-serif;font-size:14px;">
      <tr><td style="padding:6px 0;color:#78716c;width:140px;">RFQ</td><td style="padding:6px 0;font-weight:600;">${esc(opts.rfqTitle)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Your quoted price</td><td style="padding:6px 0;">$${opts.pricePerKgUSD.toFixed(2)} / kg</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Lead time</td><td style="padding:6px 0;">${opts.leadTimeDays} days</td></tr>
    </table>
    <p>The buyer will be in touch to confirm the next steps. Log in to your Fincava account to view the full details.</p>
    <p><a href="${opts.rfqUrl}" class="btn">View RFQ</a></p>
    <p class="note">Questions? Contact us at <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
  `);
  const text = `Hello ${opts.supplierName},\n\nCongratulations! Your bid for RFQ "${opts.rfqTitle}" has been awarded.\n\nYour quoted price: $${opts.pricePerKgUSD.toFixed(2)} / kg\nLead time: ${opts.leadTimeDays} days\n\nThe buyer will be in touch to confirm next steps.\n\nView the RFQ: ${opts.rfqUrl}\n\n— Equipo Fincava`;
  return { html, text, subject };
}

// ── New inquiry — operator admin alert ───────────────────────────────────────

export function newInquiryAdminAlertEmail(opts: {
  buyerName: string;
  buyerEmail: string;
  buyerCompany?: string | null;
  buyerCountry?: string | null;
  productName: string;
  supplierName: string;
  messagePreview: string;
  quantityKg?: number | null;
  adminUrl: string;
}): { html: string; text: string; subject: string } {
  const rawPreview = opts.messagePreview.length > 300
    ? `${opts.messagePreview.slice(0, 300)}…`
    : opts.messagePreview;
  const subject = `[FINCAVA] New inquiry — ${opts.buyerName} → ${opts.supplierName}`;
  const html = baseTemplate(`
    <p>A buyer has submitted a new inquiry on Fincava.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-family:system-ui,sans-serif;font-size:14px;">
      <tr><td style="padding:6px 0;color:#78716c;width:140px;">Buyer</td><td style="padding:6px 0;font-weight:600;">${esc(opts.buyerName)}${opts.buyerCompany ? ` · ${esc(opts.buyerCompany)}` : ""}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Email</td><td style="padding:6px 0;">${esc(opts.buyerEmail)}</td></tr>
      ${opts.buyerCountry ? `<tr><td style="padding:6px 0;color:#78716c;">Country</td><td style="padding:6px 0;">${esc(opts.buyerCountry)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#78716c;">Product</td><td style="padding:6px 0;">${esc(opts.productName)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Supplier</td><td style="padding:6px 0;">${esc(opts.supplierName)}</td></tr>
      ${opts.quantityKg ? `<tr><td style="padding:6px 0;color:#78716c;">Quantity</td><td style="padding:6px 0;">${opts.quantityKg.toLocaleString()} kg</td></tr>` : ""}
    </table>
    <p style="background:#f5f5f4;border-left:3px solid #16a34a;padding:12px 16px;margin:0 0 20px;font-size:14px;font-family:system-ui,sans-serif;color:#44403c;">${esc(rawPreview)}</p>
    <p><a href="${opts.adminUrl}" class="btn">View in admin panel</a></p>
  `);
  const text = `New inquiry on Fincava\n\nBuyer: ${opts.buyerName}${opts.buyerCompany ? ` (${opts.buyerCompany})` : ""}${opts.buyerCountry ? `, ${opts.buyerCountry}` : ""}\nEmail: ${opts.buyerEmail}\nProduct: ${opts.productName}\nSupplier: ${opts.supplierName}${opts.quantityKg ? `\nQuantity: ${opts.quantityKg.toLocaleString()} kg` : ""}\n\nMessage:\n${rawPreview}\n\nAdmin panel: ${opts.adminUrl}`;
  return { html, text, subject };
}

// ── New RFQ — operator admin alert ───────────────────────────────────────────

export function newRfqAdminAlertEmail(opts: {
  buyerName: string;
  buyerEmail: string;
  rfqTitle: string;
  productCategory: string;
  quantityKg: number;
  destination: string;
  deadline: string;
  targetPriceUSD?: number | null;
  adminUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = `[FINCAVA] New RFQ — ${opts.buyerName} · ${opts.productCategory}`;
  const html = baseTemplate(`
    <p>A buyer has submitted a new RFQ on Fincava.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-family:system-ui,sans-serif;font-size:14px;">
      <tr><td style="padding:6px 0;color:#78716c;width:140px;">Buyer</td><td style="padding:6px 0;font-weight:600;">${esc(opts.buyerName)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Email</td><td style="padding:6px 0;">${esc(opts.buyerEmail)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Title</td><td style="padding:6px 0;font-weight:600;">${esc(opts.rfqTitle)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Category</td><td style="padding:6px 0;">${esc(opts.productCategory)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Volume</td><td style="padding:6px 0;">${opts.quantityKg.toLocaleString()} kg</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Destination</td><td style="padding:6px 0;">${esc(opts.destination)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Deadline</td><td style="padding:6px 0;">${esc(opts.deadline)}</td></tr>
      ${opts.targetPriceUSD ? `<tr><td style="padding:6px 0;color:#78716c;">Target price</td><td style="padding:6px 0;">$${opts.targetPriceUSD.toFixed(2)} / kg</td></tr>` : ""}
    </table>
    <p><a href="${opts.adminUrl}" class="btn">View in admin panel</a></p>
  `);
  const text = `New RFQ on Fincava\n\nBuyer: ${opts.buyerName}\nEmail: ${opts.buyerEmail}\nTitle: ${opts.rfqTitle}\nCategory: ${opts.productCategory}\nVolume: ${opts.quantityKg.toLocaleString()} kg\nDestination: ${opts.destination}\nDeadline: ${opts.deadline}${opts.targetPriceUSD ? `\nTarget price: $${opts.targetPriceUSD.toFixed(2)} / kg` : ""}\n\nAdmin panel: ${opts.adminUrl}`;
  return { html, text, subject };
}

// ── Loan repaid notification (buyer-facing) ───────────────────────────────────

export function loanRepaidBuyerEmail(opts: {
  buyerName: string;
  orderRef: string | null;
  principalUSD: number;
  newCreditScore: number;
  newCreditLimit: number;
  loansUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = "Your Fincava financing is fully repaid";
  const html = baseTemplate(`
    <p>Hello ${esc(opts.buyerName)},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">Financing fully repaid ✓</h2>
    <p>Great news — your financing has been <strong>fully repaid</strong>. Your credit history on Fincava has been updated to reflect this.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-family:system-ui,sans-serif;font-size:14px;">
      ${opts.orderRef ? `<tr><td style="padding:6px 0;color:#78716c;width:160px;">Order</td><td style="padding:6px 0;font-weight:600;">${esc(opts.orderRef)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#78716c;">Amount financed</td><td style="padding:6px 0;">$${opts.principalUSD.toFixed(2)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">New credit score</td><td style="padding:6px 0;font-weight:600;">${opts.newCreditScore}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">New credit limit</td><td style="padding:6px 0;font-weight:600;">$${opts.newCreditLimit.toLocaleString()}</td></tr>
    </table>
    <p>Your updated credit limit is now available for your next order on Fincava.</p>
    <p><a href="${opts.loansUrl}" class="btn">View my financing history</a></p>
    <p class="note">Questions? Contact us at <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
  `);
  const text = `Hello ${opts.buyerName},\n\nYour Fincava financing has been fully repaid.${opts.orderRef ? `\n\nOrder: ${opts.orderRef}` : ""}\nAmount financed: $${opts.principalUSD.toFixed(2)}\nNew credit score: ${opts.newCreditScore}\nNew credit limit: $${opts.newCreditLimit.toLocaleString()}\n\nView your financing history: ${opts.loansUrl}\n\n— Equipo Fincava`;
  return { html, text, subject };
}

// ── Buyer onboarding admin alert ─────────────────────────────────────────────

export function buyerOnboardAdminAlertEmail(opts: {
  buyerName: string;
  email: string;
  companyName?: string | null;
  country?: string | null;
  targetProducts?: string[];
  preferredIncoterm?: string | null;
  intendedVolumeMt?: number | null;
  importFrequency?: string | null;
  userId: number;
  adminUrl: string;
}): { html: string; text: string } {
  const products = opts.targetProducts && opts.targetProducts.length > 0
    ? opts.targetProducts.join(", ")
    : null;

  const html = baseTemplate(`
    <p>A new buyer has completed onboarding on Fincava.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-family:system-ui,sans-serif;font-size:14px;">
      <tr><td style="padding:6px 0;color:#78716c;width:150px;">Name</td><td style="padding:6px 0;font-weight:600;">${esc(opts.buyerName)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Email</td><td style="padding:6px 0;">${esc(opts.email)}</td></tr>
      ${opts.companyName ? `<tr><td style="padding:6px 0;color:#78716c;">Company</td><td style="padding:6px 0;">${esc(opts.companyName)}</td></tr>` : ""}
      ${opts.country ? `<tr><td style="padding:6px 0;color:#78716c;">Country</td><td style="padding:6px 0;">${esc(opts.country)}</td></tr>` : ""}
      ${products ? `<tr><td style="padding:6px 0;color:#78716c;">Products</td><td style="padding:6px 0;">${esc(products)}</td></tr>` : ""}
      ${opts.preferredIncoterm ? `<tr><td style="padding:6px 0;color:#78716c;">Incoterm</td><td style="padding:6px 0;">${esc(opts.preferredIncoterm)}</td></tr>` : ""}
      ${opts.intendedVolumeMt != null ? `<tr><td style="padding:6px 0;color:#78716c;">Volume (MT)</td><td style="padding:6px 0;">${opts.intendedVolumeMt.toLocaleString()}</td></tr>` : ""}
      ${opts.importFrequency ? `<tr><td style="padding:6px 0;color:#78716c;">Frequency</td><td style="padding:6px 0;">${esc(opts.importFrequency)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#78716c;">User ID</td><td style="padding:6px 0;">#${opts.userId}</td></tr>
    </table>
    <p><a href="${opts.adminUrl}" class="btn">View in admin panel</a></p>
  `);

  const text = [
    "New buyer onboarding on Fincava:",
    "",
    `Name: ${opts.buyerName}`,
    `Email: ${opts.email}`,
    opts.companyName ? `Company: ${opts.companyName}` : null,
    opts.country ? `Country: ${opts.country}` : null,
    products ? `Products: ${products}` : null,
    opts.preferredIncoterm ? `Incoterm: ${opts.preferredIncoterm}` : null,
    opts.intendedVolumeMt != null ? `Volume: ${opts.intendedVolumeMt} MT` : null,
    opts.importFrequency ? `Frequency: ${opts.importFrequency}` : null,
    `User ID: #${opts.userId}`,
    "",
    `Review: ${opts.adminUrl}`,
  ].filter(Boolean).join("\n");

  return { html, text };
}

// ── Buyer intent admin alert ──────────────────────────────────────────────────

export function buyerIntentAdminAlertEmail(opts: {
  buyerName: string;
  buyerEmail: string;
  supplierName: string;
  estimatedQuantityKg: number;
  notes?: string | null;
  intentId: number;
  adminUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `New Purchase Intent — ${esc(opts.supplierName)} — ${opts.estimatedQuantityKg.toLocaleString()} kg`;

  const html = baseTemplate(`
    <p>A buyer has confirmed purchase interest on Fincava.</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-family:system-ui,sans-serif;font-size:14px;">
      <tr><td style="padding:6px 0;color:#78716c;width:160px;">Buyer</td><td style="padding:6px 0;font-weight:600;">${esc(opts.buyerName)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Email</td><td style="padding:6px 0;">${esc(opts.buyerEmail)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Supplier</td><td style="padding:6px 0;">${esc(opts.supplierName)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">Est. Quantity</td><td style="padding:6px 0;">${opts.estimatedQuantityKg.toLocaleString()} kg</td></tr>
      ${opts.notes ? `<tr><td style="padding:6px 0;color:#78716c;">Notes</td><td style="padding:6px 0;">${esc(opts.notes)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#78716c;">Intent ID</td><td style="padding:6px 0;">#${opts.intentId}</td></tr>
    </table>
    <p><a href="${opts.adminUrl}" class="btn">View in admin panel</a></p>
  `);

  const text = [
    "New purchase intent on Fincava:",
    "",
    `Buyer: ${opts.buyerName} (${opts.buyerEmail})`,
    `Supplier: ${opts.supplierName}`,
    `Estimated quantity: ${opts.estimatedQuantityKg.toLocaleString()} kg`,
    opts.notes ? `Notes: ${opts.notes}` : null,
    `Intent ID: #${opts.intentId}`,
    "",
    `Review: ${opts.adminUrl}`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

// ── Admin role-change template ────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  BUYER: "Buyer",
  SUPPLIER: "Supplier",
  ADMIN: "Administrator",
};

export function adminRoleChangeEmail(opts: {
  name: string;
  oldRole: string;
  newRole: string;
  loginUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = "Your Fincava account role has been updated";
  const oldLabel = ROLE_LABELS[opts.oldRole] ?? opts.oldRole;
  const newLabel = ROLE_LABELS[opts.newRole] ?? opts.newRole;
  const html = baseTemplate(`
    <p>Hello ${esc(opts.name)},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">Your account role has been changed</h2>
    <p>An administrator has updated your account role on Fincava. Here are the details:</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-family:system-ui,sans-serif;font-size:14px;">
      <tr><td style="padding:6px 0;color:#78716c;width:140px;">Previous role</td><td style="padding:6px 0;">${esc(oldLabel)}</td></tr>
      <tr><td style="padding:6px 0;color:#78716c;">New role</td><td style="padding:6px 0;font-weight:600;">${esc(newLabel)}</td></tr>
    </table>
    <p>Your dashboard and permissions have been updated to reflect your new role. Please log in to access your account.</p>
    <p><a href="${opts.loginUrl}" class="btn">Log in to my account</a></p>
    <p class="note">If you did not expect this change or believe it was made in error, please contact us immediately at <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
  `);
  const text = `Hello ${esc(opts.name)},\n\nAn administrator has updated your Fincava account role.\n\nPrevious role: ${oldLabel}\nNew role: ${newLabel}\n\nYour dashboard and permissions have been updated. Log in here: ${opts.loginUrl}\n\nIf you did not expect this change, please contact us at info@fincava.com.\n\n— Equipo Fincava`;
  return { html, text, subject };
}

// ── Account lifecycle templates ───────────────────────────────────────────────

export function welcomeEmail(opts: {
  firstName: string;
  role: "BUYER" | "SUPPLIER" | string;
  loginUrl: string;
}): { html: string; text: string; subject: string } {
  const isBuyer = opts.role === "BUYER";
  const subject = "Welcome to Fincava!";
  const roleLine = isBuyer
    ? "As a buyer you can source premium Colombian agricultural products, request quotes from verified exporters, and access flexible trade financing."
    : "As a supplier you can list your agricultural products, respond to buyer inquiries and RFQs, and connect with international buyers through Fincava.";
  const html = baseTemplate(`
    <p>Hello ${esc(opts.firstName)},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">Welcome to Fincava 🌿</h2>
    <p>Your account is active and ready to use. ${roleLine}</p>
    <p><a href="${opts.loginUrl}" class="btn">Go to my account</a></p>
    <p class="note">If you have any questions, our team is here to help at <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
  `);
  const text = `Hello ${opts.firstName},\n\nWelcome to Fincava! Your account is active.\n\n${roleLine}\n\nLog in here: ${opts.loginUrl}\n\nQuestions? Email us at info@fincava.com\n\n— Equipo Fincava`;
  return { html, text, subject };
}

export function adminCreatedAccountEmail(opts: {
  firstName: string;
  email: string;
  forgotPasswordUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = "Your Fincava account has been created";
  const html = baseTemplate(`
    <p>Hello ${esc(opts.firstName)},</p>
    <p>An administrator has created a Fincava account for you using the email address <strong>${esc(opts.email)}</strong>.</p>
    <p>To set your own password and access your account, click the button below:</p>
    <p><a href="${opts.forgotPasswordUrl}" class="btn">Set my password</a></p>
    <p class="note">If you weren't expecting this email or don't recognise this account, please contact us at <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a>.</p>
  `);
  const text = `Hello ${opts.firstName},\n\nAn administrator has created a Fincava account for you (${opts.email}).\n\nVisit the link below to set your own password:\n${opts.forgotPasswordUrl}\n\nNot expecting this? Contact info@fincava.com\n\n— Equipo Fincava`;
  return { html, text, subject };
}

export function adminPasswordResetEmail(opts: {
  firstName: string;
  loginUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = "Your Fincava password has been changed";
  const html = baseTemplate(`
    <p>Hello ${esc(opts.firstName)},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">Security notice</h2>
    <p>An administrator has reset the password on your Fincava account. You can log in with your new password immediately.</p>
    <p><a href="${opts.loginUrl}" class="btn">Log in to my account</a></p>
    <p class="note">If you did not request this change, please contact us right away at <a href="mailto:info@fincava.com" style="color:#16a34a;">info@fincava.com</a> so we can secure your account.</p>
  `);
  const text = `Hello ${opts.firstName},\n\nAn administrator has reset the password on your Fincava account. Log in with your new credentials:\n${opts.loginUrl}\n\nIf you did not expect this, contact info@fincava.com immediately.\n\n— Equipo Fincava`;
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

// ── Buyer match-ready notification (Phase 3) ──────────────────────────────────

export function buyerMatchReadyEmail(opts: {
  firstName: string;
  matchCount: number;
  dashboardUrl: string;
}): { html: string; text: string; subject: string } {
  const subject =
    opts.matchCount > 0
      ? `Your Fincava matches are ready (${opts.matchCount} suppliers)`
      : "Your Fincava matching run is complete";
  const headline =
    opts.matchCount > 0
      ? "Your supplier matches are ready ✓"
      : "We finished a matching run for you";
  const body =
    opts.matchCount > 0
      ? `We've matched your sourcing requirements against verified Colombian suppliers and identified <strong>${opts.matchCount} candidate${opts.matchCount === 1 ? "" : "s"}</strong>. Open your dashboard to review each match, see why it scored well, and reach out.`
      : `Our matching engine ran against the current supplier catalog. We didn't find a strong match this time — completing the rest of your buyer profile typically unlocks more candidates.`;
  const html = baseTemplate(`
    <p>Hello ${esc(opts.firstName)},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">${headline}</h2>
    <p>${body}</p>
    <p><a href="${opts.dashboardUrl}" class="btn">View my matches</a></p>
    <p class="note">Each match includes a confidence score, a short rationale, and the profile fields you can fill to lift the score.</p>
  `);
  const text = `Hello ${opts.firstName},\n\n${headline}\n\n${body.replace(/<[^>]+>/g, "")}\n\nView your matches: ${opts.dashboardUrl}\n\n— Equipo Fincava`;
  return { html, text, subject };
}

// ── Concierge introduction email (FIN-006, Template B) ───────────────────────

export function introductionEmail(opts: {
  buyerName: string;
  buyerCompany: string | null;
  supplierName: string;
  supplierMunicipio: string | null;
  supplierDepartment: string | null;
  product: string;
  quantityKg: number | null;
  destination: string | null;
  deadline: string | null;
  supplierCertifications: string | null;
  note: string | null;
}): { html: string; text: string; subject: string } {
  const subject = `Introduction: ${opts.buyerCompany ?? opts.buyerName} ↔ ${opts.supplierName} | ${opts.product}`;
  const location = [opts.supplierMunicipio, opts.supplierDepartment].filter(Boolean).join(", ") || "Colombia";
  const volumeLine = opts.quantityKg ? `, approximately ${opts.quantityKg.toLocaleString()} kg` : "";
  const destLine = opts.destination ? ` for delivery to ${opts.destination}` : "";
  const deadlineLine = opts.deadline ? ` by ${opts.deadline}` : "";
  const certLine = opts.supplierCertifications ? `<p>Their products carry the following certifications/attributes: <strong>${esc(opts.supplierCertifications)}</strong>.</p>` : "";
  const notePara = opts.note ? `<p><em>Operator note: ${esc(opts.note)}</em></p>` : "";

  const html = baseTemplate(`
    <p>Hi ${esc(opts.buyerName)} and ${esc(opts.supplierName)},</p>
    <p>I'm pleased to introduce you both.</p>
    <p><strong>${esc(opts.buyerName)}</strong>${opts.buyerCompany ? ` at <strong>${esc(opts.buyerCompany)}</strong>` : ""} is sourcing <strong>${esc(opts.product)}</strong>${volumeLine}${destLine}${deadlineLine}.</p>
    <p><strong>${esc(opts.supplierName)}</strong> is a verified Fincava supplier based in <strong>${esc(location)}</strong>, producing ${esc(opts.product)}.</p>
    ${certLine}
    <p>I've verified ${esc(opts.supplierName)}'s profile on Fincava and believe this could be a strong fit.</p>
    ${notePara}
    <p>I'll leave you to connect directly from here. Please don't hesitate to copy me if you need any support — I'm happy to assist with questions, documentation, or translation.</p>
    <p>Best,<br/>Irfan<br/>Fincava — Verified Colombian Agricultural Sourcing</p>
  `);

  const textLines = [
    `Hi ${opts.buyerName} and ${opts.supplierName},`,
    "",
    "I'm pleased to introduce you both.",
    "",
    `${opts.buyerName}${opts.buyerCompany ? ` at ${opts.buyerCompany}` : ""} is sourcing ${opts.product}${volumeLine}${destLine}${deadlineLine}.`,
    "",
    `${opts.supplierName} is a verified Fincava supplier based in ${location}, producing ${opts.product}.`,
    opts.supplierCertifications ? `Certifications/attributes: ${opts.supplierCertifications}.` : "",
    "",
    `I've verified ${opts.supplierName}'s profile on Fincava and believe this could be a strong fit.`,
    opts.note ? `\nOperator note: ${opts.note}` : "",
    "",
    "I'll leave you to connect directly. Copy me if you need any support.",
    "",
    "Best,\nIrfan\nFincava — Verified Colombian Agricultural Sourcing",
  ].filter(l => l !== null);
  const text = textLines.join("\n");

  return { html, text, subject };
}

// ── Retail auth emails (Sprint 2) ─────────────────────────────────────────────

// T-B9: Magic link (ES + EN)
export function retailMagicLinkEmail(opts: {
  magicLinkUrl: string;
  lang?: "es" | "en";
}): { html: string; text: string; subject: string } {
  const es = opts.lang !== "en";
  const subject = es ? "Tu enlace de acceso a FINCAVA" : "Your FINCAVA access link";
  const heading = es ? "Accede a FINCAVA" : "Access FINCAVA";
  const body = es
    ? "Toca el botón para acceder. El enlace es válido por <strong>15 minutos</strong>."
    : "Tap the button below to sign in. This link is valid for <strong>15 minutes</strong>.";
  const btnLabel = es ? "Acceder a FINCAVA" : "Sign in to FINCAVA";
  const note = es
    ? "Si no solicitaste este enlace, ignora este correo."
    : "If you didn't request this link, you can safely ignore this email.";
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">${heading}</h2>
    <p>${body}</p>
    <p><a href="${esc(opts.magicLinkUrl)}" class="btn">${btnLabel}</a></p>
    <p class="note">${note}</p>
    <p class="note">Si el botón no funciona, copia este enlace:<br/><a href="${esc(opts.magicLinkUrl)}" style="color:#16a34a;word-break:break-all;">${esc(opts.magicLinkUrl)}</a></p>
  `);
  const text = es
    ? `Accede a FINCAVA usando este enlace (válido 15 min):\n${opts.magicLinkUrl}\n\n— Equipo Fincava`
    : `Sign in to FINCAVA using this link (valid 15 min):\n${opts.magicLinkUrl}\n\n— Equipo Fincava`;
  return { html, text, subject };
}

// T-B10: Email OTP — 6-digit code (ES + EN)
export function retailOtpEmail(opts: {
  otp: string;
  lang?: "es" | "en";
}): { html: string; text: string; subject: string } {
  const es = opts.lang !== "en";
  const subject = es ? `Tu código de FINCAVA: ${opts.otp}` : `Your FINCAVA code: ${opts.otp}`;
  const heading = es ? "Tu código de acceso" : "Your access code";
  const body = es
    ? `Ingresa este código para acceder a FINCAVA. Válido por <strong>15 minutos</strong>.`
    : `Enter this code to sign in to FINCAVA. Valid for <strong>15 minutes</strong>.`;
  const note = es
    ? "Si no solicitaste este código, ignora este correo."
    : "If you didn't request this code, you can safely ignore this email.";
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">${heading}</h2>
    <p>${body}</p>
    <div style="margin:24px 0;text-align:center;">
      <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#14532d;font-family:monospace;">${esc(opts.otp)}</span>
    </div>
    <p class="note">${note}</p>
  `);
  const text = es
    ? `Tu código de FINCAVA: ${opts.otp}\nVálido 15 minutos. No lo compartas.\n\n— Equipo Fincava`
    : `Your FINCAVA code: ${opts.otp}\nValid 15 minutes. Do not share.\n\n— Equipo Fincava`;
  return { html, text, subject };
}

export function verificationEmail(opts: { firstName: string; verifyUrl: string }): { html: string; text: string; subject: string } {
  const subject = "Confirm your email address — Fincava";
  const html = baseTemplate(`
    <p>Hello ${esc(opts.firstName)},</p>
    <h2 style="margin:0 0 16px;font-size:18px;color:#14532d;">Please confirm your email</h2>
    <p>Thank you for registering on Fincava. To activate your account and access all features, please verify your email address by clicking the button below:</p>
    <p><a href="${opts.verifyUrl}" class="btn">Confirm my email address</a></p>
    <p class="note">This link expires in <strong>24 hours</strong>. If you didn't create a Fincava account, you can safely ignore this email.</p>
    <p class="note">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${opts.verifyUrl}" style="color:#16a34a;word-break:break-all;">${opts.verifyUrl}</a></p>
  `);
  const text = `Hello ${opts.firstName},\n\nThank you for registering on Fincava. Please verify your email address by visiting the link below:\n\n${opts.verifyUrl}\n\nThis link expires in 24 hours. If you didn't register, please ignore this email.\n\n— Equipo Fincava`;
  return { html, text, subject };
}
