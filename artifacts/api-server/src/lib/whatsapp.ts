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
    const sid = process.env["TWILIO_ACCOUNT_SID"];
    const token = process.env["TWILIO_AUTH_TOKEN"];
    if (!sid || !token) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set to send WhatsApp messages");
    }
    _client = twilio(sid, token);
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
