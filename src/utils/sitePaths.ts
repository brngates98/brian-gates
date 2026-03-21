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

/** About, Services, or Contact (one level below site root). */
export function inSiteSubpage(pathname: string): boolean {
  return isAboutPage(pathname) || isServicesPage(pathname) || isContactPage(pathname);
}

export function hrefHome(pathname: string): string {
  return inSiteSubpage(pathname) ? "../" : "./";
}

export function hrefAbout(pathname: string): string {
  if (isAboutPage(pathname)) return "./";
  if (isServicesPage(pathname) || isContactPage(pathname)) return "../about/";
  return "about/";
}

export function hrefServices(pathname: string): string {
  if (isServicesPage(pathname)) return "./";
  if (isAboutPage(pathname) || isContactPage(pathname)) return "../services/";
  return "services/";
}

export function hrefContact(pathname: string): string {
  if (isContactPage(pathname)) return "./";
  if (isAboutPage(pathname) || isServicesPage(pathname)) return "../contact/";
  return "contact/";
}

export function hrefFavicon(pathname: string): string {
  return inSiteSubpage(pathname) ? "../favicon.svg" : "favicon.svg";
}

export function hrefFont(pathname: string, file: "atkinson-regular.woff" | "atkinson-bold.woff"): string {
  const prefix = inSiteSubpage(pathname) ? "../" : "";
  return `${prefix}fonts/${file}`;
}
