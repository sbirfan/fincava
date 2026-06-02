// SMS OTP wrapper — distinct from lib/whatsapp.ts (WhatsApp channel).
// Uses the same Twilio account (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)
// but a separate standard SMS sender number (TWILIO_SMS_FROM).
// Lazy-initialised: safe to import without env vars set at module load time.

import twilio from "twilio";
import { logger } from "./logger";

let _client: ReturnType<typeof twilio> | null = null;

function getClient(): ReturnType<typeof twilio> {
  if (!_client) {
    const sid = process.env["TWILIO_ACCOUNT_SID"];
    const token = process.env["TWILIO_AUTH_TOKEN"];
    if (!sid || !token) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set to send SMS");
    }
    _client = twilio(sid, token);
  }
  return _client;
}

/**
 * Send a plain-text SMS. Returns the Twilio message SID on success.
 * Throws if credentials are missing or Twilio rejects the request.
 *
 * `to` should be E.164 (e.g. +573001234567). Pass raw Colombian numbers —
 * they are normalised to +57 automatically.
 */
export async function sendSms(to: string, body: string): Promise<string> {
  const from = process.env["TWILIO_SMS_FROM"];
  if (!from) throw new Error("TWILIO_SMS_FROM must be set to send SMS");

  const normalized = normalizePhone(to);
  const msg = await getClient().messages.create({ to: normalized, from, body });
  logger.info({ to: normalized, sid: msg.sid }, "SMS sent");
  return msg.sid;
}

function normalizePhone(raw: string): string {
  const stripped = raw.replace(/[^\d+]/g, "");
  if (stripped.startsWith("+")) return stripped;
  if (stripped.startsWith("57") && stripped.length >= 11) return `+${stripped}`;
  return `+57${stripped}`;
}
