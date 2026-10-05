import { defineType, defineField } from "sanity";

export default defineType({
  name: "enquiry",
  title: "Enquiry",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({ name: "company", title: "Company", type: "string" }),
    defineField({
      name: "discipline",
      title: "What they need",
      type: "string",
      options: {
        list: [
          { title: "Packaging or label design", value: "packaging" },
          { title: "Logo or branding", value: "identity" },
          { title: "Website or app design", value: "web" },
          { title: "Poster or print design", value: "print" },
          { title: "Something else", value: "other" },
        ],
      },
    }),
    defineField({
      name: "budget",
      title: "Budget",
      type: "string",
      options: {
        list: [
          { title: "Under $10,000", value: "under-10k" },
          { title: "$10,000 - $25,000", value: "10k-25k" },
          { title: "$25,000 - $60,000", value: "25k-60k" },
          { title: "More than $60,000", value: "60k-plus" },
          { title: "Not sure yet", value: "unsure" },
        ],
      },
    }),
    defineField({ name: "timeline", title: "Timeline", type: "string" }),
    defineField({
      name: "nda",
      title: "Needs an NDA first",
      type: "boolean",
    }),
    defineField({
      name: "brief",
      title: "Their brief",
      description: "What the client wrote in the project enquiry form.",
      type: "text",
      rows: 6,
    }),
    defineField({
      name: "draftReply",
      title: "AI draft reply",
      description:
        "A suggested response in the studio voice. Edit before sending - never send automatically.",
      type: "text",
      rows: 10,
      readOnly: true,
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "New", value: "new" },
          { title: "Replied", value: "replied" },
          { title: "Won", value: "won" },
          { title: "Lost", value: "lost" },
          { title: "Spam", value: "spam" },
        ],
        layout: "radio",
      },
      initialValue: "new",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "email" },
    prepare({ title, subtitle }) {
      return { title: title || "Unknown", subtitle };
    },
  },
  orderings: [
    {
      title: "Newest first",
      name: "receivedDesc",
      by: [{ field: "_createdAt", direction: "desc" }],
    },
  ],
});