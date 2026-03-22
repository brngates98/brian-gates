/** Optional per-page overrides passed to BaseHead / layouts. */
export type SeoOptions = {
	ogType?: 'website' | 'article';
	headline?: string;
	publishedTime?: string;
	modifiedTime?: string;
	noindex?: boolean;
	/** Absolute URL or site-root path (e.g. `/og-default.png`). Omit to use the default OG image. */
	ogImage?: string;
	/** With a custom `ogImage`, set dimensions when known (recommended for social previews). */
	ogImageWidth?: number;
	ogImageHeight?: number;
};
