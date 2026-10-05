/* ------------------------------------------------------------------ */
/* Save an enquiry to Sanity as an `enquiry` document, via the HTTP    */
/* mutations API (no SDK needed, so the serverless function has zero   */
/* npm dependencies). Fails soft: never throws, logs and continues.    */
/* ------------------------------------------------------------------ */

export async function saveEnquiry(enquiry) {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET || "production";
  const token = process.env.SANITY_API_TOKEN;

  if (!projectId || !token) {
    console.warn("[enquiry] Sanity env missing - enquiry not saved to Studio.");
    return null;
  }

  const doc = {
    _type: "enquiry",
    name: enquiry.name || "unknown",
    email: enquiry.email || "",
    company: enquiry.company || "",
    discipline: enquiry.discipline || "",
    budget: enquiry.budget || "",
    timeline: enquiry.timeline || "",
    nda: Boolean(enquiry.nda),
    brief: enquiry.brief || "",
    draftReply: enquiry.draftReply || "",
    status: "new",
  };

  try {
    const res = await fetch(
      `https://${projectId}.api.sanity.io/v2023-08-01/data/mutate/${dataset}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mutations: [{ create: doc }] }),
      }
    );
    if (!res.ok) {
      console.error("[enquiry] Sanity save failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data?.document?._id || null;
  } catch (err) {
    console.error("[enquiry] Sanity save error:", err.message);
    return null;
  }
}