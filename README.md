# Brian Gates — personal site

Static portfolio built with [Astro](https://astro.build): home with featured GitHub projects, a short About page, and contact details. Built output is plain HTML/CSS in `dist/`, suitable for [GitHub Pages](https://docs.github.com/en/pages).

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:4321`. Production build:

```bash
npm run build
npm run preview
```

## GitHub Pages

1. Push this repo to GitHub (default branch `main`).
2. **Settings → Pages → Build and deployment**: set **Source** to **GitHub Actions** (not “Deploy from a branch”).
3. The workflow `.github/workflows/deploy-pages.yml` builds on every push to `main` and publishes `dist/`.
4. After the first successful run, **Settings → Pages** can show your Pages URL; with a custom domain it will serve `https://briangates.tech` once DNS is correct.

This repo is a **project site** (not `username.github.io`), so GitHub serves it at **`https://brngates98.github.io/brian-gates/`** — not at `https://brngates98.github.io/`. Astro uses `base: '/brian-gates/'` so links like About resolve to **`…/brian-gates/about/`** instead of **`…/about/`** (which 404s). Prefer your **custom domain** `https://briangates.tech` for sharing when it is configured.

## Custom domain (briangates.tech on Cloudflare)

- In the repo: `public/CNAME` contains `briangates.tech` so GitHub Pages keeps the domain after each deploy.
- In **GitHub**: **Settings → Pages → Custom domain** → add `briangates.tech`, enable **Enforce HTTPS** after DNS is verified.
- In **Cloudflare DNS** for `briangates.tech`:
  - **A** `@` → `185.199.108.151` (and often the same for `185.199.109.151`, `185.199.110.151`, `185.199.111.151` — GitHub Pages uses these; one A record is enough for simple setups, or use all four for redundancy).
  - **CNAME** `www` → `briangates.github.io` (or your `username.github.io` org/user site hostname if different).
- In Cloudflare, set the site to **DNS only** (grey cloud) for the apex if GitHub’s docs require it for verification; many setups work with proxy on — follow [GitHub’s custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) if something fails.

Edit site copy, `GITHUB_USERNAME`, `FEATURED_PROJECTS`, and `CONTACT` in `src/consts.ts`. Canonical URL and sitemap use `https://briangates.tech` from `astro.config.mjs`.

## Credits

Layout and typography are inspired by [Bear Blog](https://github.com/HermanMartinus/bearblog/).
