import twilio from "twilio";

function normalizePhone(raw: string): string {
  const stripped = raw.replace(/[^\d+]/g, "");
  if (stripped.startsWith("+")) return stripped;
  if (stripped.startsWith("57") && stripped.length >= 11) return `+${stripped}`;
  return `+57${stripped}`;
}

let _client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!_client) {
    _client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }
  return _client;
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<string> {
  const normalized = normalizePhone(to);
  const msg = await getClient().messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    to: `whatsapp:${normalized}`,
    body,
  });
  return msg.sid;
}
