/** Optional per-page overrides passed to BaseHead / layouts. */
export type SeoOptions = {
	ogType?: 'website' | 'article';
	headline?: string;
	publishedTime?: string;
	modifiedTime?: string;
	noindex?: boolean;
};
