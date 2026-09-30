import { defineType, defineField } from "sanity";

export default defineType({
  name: "journalPost",
  title: "Journal Post",
  type: "document",
  fields: [
    defineField({
      name: "slug",
      title: "URL slug",
      description: "Used in the URL: /journal/<slug>.html",
      type: "slug",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
    }),
    defineField({
      name: "readingTime",
      title: "Reading time",
      description: 'e.g. "5 min read"',
      type: "string",
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      description: "Short teaser shown on the journal listing.",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "image",
      title: "Cover image (optional)",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block" }],
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "date" },
  },
  orderings: [
    {
      title: "Newest first",
      name: "dateDesc",
      by: [{ field: "date", direction: "desc" }],
    },
  ],
});