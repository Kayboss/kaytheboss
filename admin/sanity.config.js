import { defineConfig } from "sanity";
import { deskTool } from "sanity/desk";
import { schemaTypes } from "./schemas";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || "your-project-id";
const dataset = process.env.SANITY_STUDIO_DATASET || "production";

export default defineConfig({
  name: "kaytheboss",
  title: "KaytheBoss Studio",
  projectId,
  dataset,
  plugins: [deskTool()],
  schema: { types: schemaTypes },
  document: {
    actions: (prev) => prev, // keep default publish/discard/delete
  },
});