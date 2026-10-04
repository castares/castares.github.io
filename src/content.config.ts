import { basename } from "node:path";
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { slugify, toList } from "./lib/vault";

// Obsidian writes empty list properties as `null` and single values as strings.
const list = z.unknown().optional().transform(toList);

const notes = defineCollection({
  loader: glob({
    base: "./garden",
    // Render at page-build time, not at content sync: a Note's HTML depends on which
    // other Notes exist (Unplanted Links), which the content cache cannot see.
    deferRender: true,
    pattern: ["**/*.md", "!attachments/**", "!**/_*/**", "!**/_*.md"],
    generateId: ({ entry }) => slugify(basename(entry, ".md")),
  }),
  schema: z.object({
    maturity: z.enum(["seedling", "budding", "evergreen"]).default("seedling"),
    tags: list.transform((tags) => tags.map((tag) => tag.replace(/^#/, ""))),
    aliases: list,
    description: z.string().optional(),
    draft: z.boolean().default(false),
    // Overrides for the dates otherwise read from git history.
    planted: z.coerce.date().optional(),
    tended: z.coerce.date().optional(),
  }),
});

export const collections = { notes };
