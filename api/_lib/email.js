/* ------------------------------------------------------------------ */
/* Email the studio owner the enquiry + the AI draft, via Resend.      */
/* Without a RESEND_API_KEY it logs the draft instead so nothing is   */
/* lost during local testing.                                          */
/* ------------------------------------------------------------------ */

import { TO_EMAIL, FROM_EMAIL } from "./studio.js";

const DISCIPLINE = {
  packaging: "Packaging or label design",
  identity: "Logo or branding",
  web: "Website or app design",
  print: "Poster or print design",
  other: "Something else",
};

const BUDGET = {
  "under-10k": "Under $10,000",
  "10k-25k": "$10,000 - $25,000",
  "25k-60k": "$25,000 - $60,000",
  "60k-plus": "More than $60,000",
  unsure: "Not sure yet",
};

export async function emailEnquiry(e) {
  const key = process.env.RESEND_API_KEY;
  const subject = `New enquiry - ${e.name || "someone"} - ${DISCIPLINE[e.discipline] || "project"}`;

  const details = [
    `Name: ${e.name || "-"}`,
    `Email: ${e.email || "-"}`,
    `Company: ${e.company || "-"}`,
    `Needs: ${DISCIPLINE[e.discipline] || e.discipline || "-"}`,
    `Budget: ${BUDGET[e.budget] || e.budget || "-"}`,
    `Timeline: ${e.timeline || "-"}`,
    `NDA first: ${e.nda ? "yes" : "no"}`,
    "",
    "BRIEF",
    e.brief || "(none)",
    "",
    "----- AI DRAFT REPLY (review, edit, then send) -----",
    e.draftReply || "(no draft)",
  ].join("\n");

  if (!key) {
    console.log("[enquiry] RESEND_API_KEY missing. Would have emailed:", TO_EMAIL);
    console.log("[enquiry] " + details.replace(/\n/g, "\n    "));
    return { sent: false, reason: "no-resend-key" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject,
        text: details,
      }),
    });
    if (!res.ok) {
      console.error("[enquiry] Resend failed:", res.status, await res.text());
      return { sent: false, reason: `resend-${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[enquiry] Resend error:", err.message);
    return { sent: false, reason: "resend-error" };
  }
}