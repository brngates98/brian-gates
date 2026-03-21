/**
 * Relative URLs work for both:
 * - GitHub Pages project site: https://user.github.io/repo/
 * - Custom domain (same files at domain root): https://briangates.tech/
 *
 * Avoid hardcoding /repo/ — the browser resolves relative to the current document URL.
 */

export function isAboutPage(pathname: string): boolean {
  return pathname.includes("/about/") || pathname.endsWith("/about");
}

export function isServicesPage(pathname: string): boolean {
  return pathname.includes("/services/") || pathname.endsWith("/services");
}

export function isContactPage(pathname: string): boolean {
  return pathname.includes("/contact/") || pathname.endsWith("/contact");
}

/** e.g. /blog/welcome/ — two levels below site root for static assets. */
export function isBlogPostPage(pathname: string): boolean {
  return /\/blog\/[^/]+\//.test(pathname);
}

export function isBlogSection(pathname: string): boolean {
  return pathname.includes("/blog/");
}

/** /blog/ listing only (not a post). */
export function isBlogIndexPage(pathname: string): boolean {
  return isBlogSection(pathname) && !isBlogPostPage(pathname);
}

/** One level below site root: about, services, contact, blog index. */
export function inSiteSubpage(pathname: string): boolean {
  return (
    isAboutPage(pathname) ||
    isServicesPage(pathname) ||
    isContactPage(pathname) ||
    isBlogIndexPage(pathname)
  );
}

export function hrefHome(pathname: string): string {
  if (isBlogPostPage(pathname)) return "../../";
  return inSiteSubpage(pathname) ? "../" : "./";
}

export function hrefAbout(pathname: string): string {
  if (isAboutPage(pathname)) return "./";
  if (isBlogPostPage(pathname)) return "../../about/";
  if (inSiteSubpage(pathname)) return "../about/";
  return "about/";
}

export function hrefServices(pathname: string): string {
  if (isServicesPage(pathname)) return "./";
  if (isBlogPostPage(pathname)) return "../../services/";
  if (inSiteSubpage(pathname)) return "../services/";
  return "services/";
}

export function hrefBlog(pathname: string): string {
  if (isBlogIndexPage(pathname)) return "./";
  if (isBlogPostPage(pathname)) return "../";
  if (inSiteSubpage(pathname)) return "../blog/";
  return "blog/";
}

export function hrefContact(pathname: string): string {
  if (isContactPage(pathname)) return "./";
  if (isBlogPostPage(pathname)) return "../../contact/";
  if (inSiteSubpage(pathname)) return "../contact/";
  return "contact/";
}

export function hrefFavicon(pathname: string): string {
  if (isBlogPostPage(pathname)) return "../../favicon.svg";
  return inSiteSubpage(pathname) ? "../favicon.svg" : "favicon.svg";
}

export function hrefFont(pathname: string, file: "atkinson-regular.woff" | "atkinson-bold.woff"): string {
  const prefix = isBlogPostPage(pathname) ? "../../" : inSiteSubpage(pathname) ? "../" : "";
  return `${prefix}fonts/${file}`;
}
