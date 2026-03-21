// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// No `base` — internal links use relative URLs so the same build works for:
// - GitHub Pages project site: https://<user>.github.io/<repo>/
// - Custom domain https://briangates.tech/ (same artifact; paths resolve per host)
export default defineConfig({
  site: "https://briangates.tech",
  trailingSlash: "always",
  integrations: [sitemap()],
});
