/* ------------------------------------------------------------------ */
/* Draft-reply generator.                                              */
/* Uses whichever LLM key is present: ANTHROPIC_API_KEY or            */
/* OPENAI_API_KEY. If neither, returns a plain acknowledgement so the  */
/* enquiry is still delivered - it just has no AI draft.               */
/* ------------------------------------------------------------------ */

import { STUDIO } from "./studio.js";

const SYSTEM = [
  `You are the studio assistant for ${STUDIO.name}, ${STUDIO.tagline}`,
  "",
  "You write the FIRST DRAFT of a reply to a new project enquiry. Zac (the studio owner) will review, edit and send it himself. The client never sees your text directly.",
  "",
  "WHAT THE STUDIO OFFERS (offer ONLY these - never invent others):",
  ...STUDIO.services.map((s) => `- ${s}`),
  "",
  "COMMERCIAL CONTEXT:",
  `- Projects below about $${STUDIO.commercial.budgetFloorUsd.toLocaleString()} are usually not worth taking; say so kindly and suggest what would fit.`,
  `- Typical ranges: branding ${STUDIO.commercial.typicalRanges.branding}; packaging ${STUDIO.commercial.typicalRanges.packaging}; web ${STUDIO.commercial.typicalRanges.web}; print ${STUDIO.commercial.typicalRanges.print}.`,
  `- Typical lead time: ${STUDIO.commercial.typicalLeadTime}.`,
  "",
  "VOICE:",
  ...STUDIO.voice.map((v) => `- ${v}`),
  "",
  "OUTPUT RULES:",
  "- Write the reply body only. No subject line, no 'Draft:' prefix, no sign-off block explaining this is AI.",
  "- 120-200 words. Structure it as: one line acknowledging their specific project, 1-3 lines of genuinely useful response or question, a clear soft next step (usually 'a short call'), then sign off 'Zac' + 'KaytheBoss'.",
  "- Reference something concrete from their brief so it does not read as a template.",
  "- If they asked for an NDA, acknowledge it and say it can be arranged before any detailed discussion.",
].join("\n");

function userPrompt(e) {
  return [
    "Here is a new project enquiry. Write the draft reply.",
    "",
    `Name: ${e.name || "unknown"}`,
    `Email: ${e.email || "unknown"}`,
    `Company: ${e.company || "not given"}`,
    `What they need: ${e.discipline || "not chosen"}`,
    `Budget band: ${e.budget || "not chosen"}`,
    `Timeline: ${e.timeline || "not given"}`,
    `Needs an NDA first: ${e.nda ? "yes" : "no"}`,
    "",
    "Their brief:",
    e.brief || "(they did not write one)",
  ].join("\n");
}

async function callAnthropic(enquiry, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ENQUIRY_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: 700,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt(enquiry) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content || []).map((b) => b.text || "").join("").trim();
}

async function callOpenAI(enquiry, apiKey) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.ENQUIRY_MODEL || "gpt-4o-mini",
      max_tokens: 700,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt(enquiry) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

export async function draftReply(enquiry) {
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const openai = process.env.OPENAI_API_KEY;

  if (anthropic) return callAnthropic(enquiry, anthropic);
  if (openai) return callOpenAI(enquiry, openai);

  const first = (enquiry.name || "there").split(" ")[0];
  return `Hi ${first}, thanks for reaching out about your ${enquiry.discipline || "project"}. I've got your brief and I'll come back to you properly within ${STUDIO.replyWithin}. If it's easier to talk it through first, just reply here and suggest a time. - Zac, KaytheBoss`;
}