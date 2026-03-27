import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /** If true, post is omitted from /blog/ but still built at /blog/<slug>/ */
    unlisted: z.boolean().optional(),
  }),
});

export const collections = { blog };
