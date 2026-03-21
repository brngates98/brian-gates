/**
 * Relative URLs work for both:
 * - GitHub Pages project site: https://user.github.io/repo/
 * - Custom domain (same files at domain root): https://briangates.tech/
 *
 * Avoid hardcoding /repo/ — the browser resolves relative to the current document URL.
 */

/** True when the current page is the About section (not the home page). */
export function isAboutPage(pathname: string): boolean {
  return pathname.includes("/about/") || pathname.endsWith("/about");
}

/** Home link: up one level from About, current dir on home. */
export function hrefHome(pathname: string): string {
  return isAboutPage(pathname) ? "../" : "./";
}

/** About link: sibling folder from home, current dir when already on About. */
export function hrefAbout(pathname: string): string {
  return isAboutPage(pathname) ? "./" : "about/";
}

/** Static assets co-located with index.html at site root. */
export function hrefFavicon(pathname: string): string {
  return isAboutPage(pathname) ? "../favicon.svg" : "favicon.svg";
}

export function hrefFont(pathname: string, file: "atkinson-regular.woff" | "atkinson-bold.woff"): string {
  const prefix = isAboutPage(pathname) ? "../" : "";
  return `${prefix}fonts/${file}`;
}
