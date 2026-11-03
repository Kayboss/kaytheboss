/* ------------------------------------------------------------------ */
/* Send a reply to a visitor, via Resend.                              */
/*                                                                     */
/* Needs RESEND_API_KEY (and a verified sending domain - otherwise     */
/* Resend rejects the send). Without a key nothing is sent, and the    */
/* admin shows "sending not set up" so you can use Reply by email.     */
/* ------------------------------------------------------------------ */

const API = "https://api.resend.com/emails";

const fromAddress = () =>
  process.env.ENQUIRY_FROM_EMAIL || "KAYTHEBOSS <onboarding@resend.dev>";

/* Where visitor replies should land when they hit "Reply" in their
   mail client. Defaults to the studio inbox. */
const replyToAddress = () =>
  process.env.ENQUIRY_TO_EMAIL || "commissions@kaytheboss.studio";

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEnquiryReply({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "no-resend-key" };
  if (!to) return { sent: false, reason: "no-recipient" };
  if (!text || !text.trim()) return { sent: false, reason: "empty-body" };

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        reply_to: replyToAddress(),
        subject,
        text,
      }),
    });
    if (!res.ok) {
      console.error("[reply] Resend failed:", res.status, await res.text());
      return { sent: false, reason: `resend-${res.status}` };
    }
    /* Resend returns { id } - stored with the outbound message so the
       thread view can show it even before the Sent folder is synced. */
    const data = await res.json().catch(() => ({}));
    return { sent: true, id: data?.id ?? null };
  } catch (err) {
    console.error("[reply] Resend error:", err.message);
    return { sent: false, reason: "resend-error" };
  }
}
