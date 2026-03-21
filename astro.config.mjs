// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Static site for GitHub Pages — see .github/workflows/deploy-pages.yml
// Project site URL: https://<user>.github.io/<repo>/ — base must match repo name.
// Custom domain briangates.tech maps to the same deployment (paths work at domain root).
export default defineConfig({
  site: "https://briangates.tech",
  base: "/brian-gates/",
  trailingSlash: "always",
  integrations: [sitemap()],
});
