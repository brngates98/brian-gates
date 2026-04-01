// @ts-check
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import faroUploader from "@grafana/faro-rollup-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Slugs with `unlisted: true` in frontmatter — omit from sitemap (still built). */
function getUnlistedBlogSlugs() {
	const dir = path.join(__dirname, "src/content/blog");
	const unlisted = [];
	for (const f of fs.readdirSync(dir)) {
		if (!f.endsWith(".md")) continue;
		const raw = fs.readFileSync(path.join(dir, f), "utf8");
		const m = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
		if (m && /^\s*unlisted:\s*true\s*$/m.test(m[1])) {
			unlisted.push(f.replace(/\.md$/, ""));
		}
	}
	return unlisted;
}

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
	integrations: [
		sitemap({
			filter: (page) => {
				if (page.endsWith("/paul/")) return false;
				const unlisted = getUnlistedBlogSlugs();
				return !unlisted.some((slug) =>
					page.endsWith(`/blog/${slug}/`),
				);
			},
		}),
	],
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
