// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Static site for GitHub Pages — see .github/workflows/deploy-pages.yml
// https://docs.astro.build/en/guides/deploy/github/
export default defineConfig({
  site: "https://briangates.tech",
  integrations: [sitemap()],
});
