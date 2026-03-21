/**
 * Prefix internal paths with import.meta.env.BASE_URL (GitHub Pages project site = /brian-gates/).
 * Hash links and absolute external URLs are unchanged.
 */
export function sitePath(path: string): string {
  if (path.startsWith("#")) return path;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) {
    return path;
  }
  const base = import.meta.env.BASE_URL;
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return base + normalized;
}
