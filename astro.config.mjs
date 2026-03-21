// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Static site for GitHub Pages — see .github/workflows/deploy-pages.yml
// trailingSlash helps GitHub Pages resolve /about/ consistently (directory index).
export default defineConfig({
  site: "https://briangates.tech",
  trailingSlash: "always",
  integrations: [sitemap()],
});
