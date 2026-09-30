import { defineType, defineField } from "sanity";

export default defineType({
  name: "workProject",
  title: "Work Project",
  type: "document",
  groups: [
    { name: "overview", title: "Overview", default: true },
    { name: "story", title: "Story" },
    { name: "details", title: "Details" },
  ],
  fields: [
    defineField({
      name: "slug",
      title: "URL slug",
      description: "Used in the URL: /work/<slug>.html",
      type: "slug",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "index",
      title: "Display index",
      description: "e.g. 01, 02 — shown on cards as PROJECT: 01",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "year",
      title: "Year",
      type: "string",
    }),
    defineField({
      name: "discipline",
      title: "Discipline",
      type: "string",
    }),
    defineField({
      name: "series",
      title: "Series (optional)",
      type: "string",
    }),
    defineField({
      name: "size",
      title: "Card size",
      type: "string",
      options: { list: ["wide", "tall", "narrow"] },
    }),
    defineField({
      name: "image",
      title: "Cover image",
      type: "image",
      options: { hotspot: true },
      group: "overview",
    }),
    defineField({
      name: "alt",
      title: "Image alt text",
      type: "string",
    }),
    defineField({
      name: "summary",
      title: "One-line summary",
      description: "Shown on cards and in the page description.",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "client",
      title: "Client",
      type: "string",
      group: "details",
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "array",
      of: [{ type: "string" }],
      group: "details",
    }),
    defineField({
      name: "stack",
      title: "Stack / medium",
      type: "array",
      of: [{ type: "string" }],
      group: "details",
    }),
    defineField({
      name: "tldr",
      title: "TL;DR",
      type: "text",
      rows: 3,
      group: "story",
    }),
    defineField({
      name: "challenge",
      title: "Challenge",
      type: "text",
      rows: 5,
      group: "story",
    }),
    defineField({
      name: "approach",
      title: "Approach (bullets)",
      type: "array",
      of: [{ type: "string" }],
      group: "story",
    }),
    defineField({
      name: "outcome",
      title: "Outcomes",
      description: "e.g. value + label pairs",
      type: "array",
      group: "story",
      of: [
        {
          type: "object",
          fields: [
            { name: "value", title: "Value", type: "string" },
            { name: "label", title: "Label", type: "string" },
          ],
        },
      ],
    }),
    defineField({
      name: "pullQuote",
      title: "Pull quote",
      type: "text",
      rows: 3,
      group: "story",
    }),
    defineField({
      name: "quoteBy",
      title: "Quote attribution",
      type: "string",
      group: "story",
    }),
    defineField({
      name: "next",
      title: "Next project slug",
      description: "Controls the Next case study link. Leave empty to auto-rotate.",
      type: "string",
      group: "details",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "discipline" },
  },
});