// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import faroUploader from "@grafana/faro-rollup-plugin";

// Grafana Cloud Frontend Observability — private source map uploads (build-time only).
// https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/configure/sourcemap-uploads/
// Set in CI (GitHub Actions secrets); omit locally if you do not upload maps.
const faroSourceMapUploadEnabled = Boolean(
	process.env.FARO_API_KEY &&
		process.env.FARO_SOURCEMAP_ENDPOINT &&
		process.env.FARO_APP_ID &&
		process.env.FARO_STACK_ID,
);

// No `base` — internal links use relative URLs so the same build works for:
// - GitHub Pages project site: https://<user>.github.io/<repo>/
// - Custom domain https://briangates.tech/ (same artifact; paths resolve per host)
export default defineConfig({
	site: "https://briangates.tech",
	trailingSlash: "always",
	integrations: [sitemap()],
	build: {
		// Source maps are generated only when uploading (plugin strips them from `dist/` by default).
		sourcemap: faroSourceMapUploadEnabled,
	},
	vite: {
		plugins: faroSourceMapUploadEnabled
			? [
					faroUploader({
						appName: "briangates.tech",
						endpoint: process.env.FARO_SOURCEMAP_ENDPOINT,
						apiKey: process.env.FARO_API_KEY,
						appId: process.env.FARO_APP_ID,
						stackId: process.env.FARO_STACK_ID,
						gzipContents: true,
						verbose: process.env.FARO_UPLOAD_VERBOSE === "1",
					}),
				]
			: [],
	},
});
