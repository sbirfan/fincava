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
