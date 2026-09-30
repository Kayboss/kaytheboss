// Design tokens are extracted verbatim from the Google Stitch export
// (project 4656867139519223244, screen index_accessible_kinetic_3d_wcag_2_1_aa)
// so the compiled stylesheet matches the generated designs exactly.
import extracted from "./tailwind.config.json" with { type: "json" };

export default {
  content: ["./src/**/*.{html,js}", "./build.mjs"],
  ...extracted,
  theme: {
    ...extracted.theme,
    extend: {
      ...extracted.theme.extend,
      fontFamily: {
        ...extracted.theme.extend.fontFamily,
        display: ["Syne", "sans-serif"],
        sans: ["Hanken Grotesk", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
    },
  },
};
