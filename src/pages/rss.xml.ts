import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getNotes } from "../lib/garden";
import { profile } from "../profile";

// Announces newly Planted Notes only: tending a Note does not re-notify subscribers.
export async function GET(context: APIContext) {
  const notes = (await getNotes()).toSorted((a, b) => b.planted.getTime() - a.planted.getTime());
  return rss({
    title: `${profile.name} · Garden`,
    description: "Newly planted notes on data, AI and engineering.",
    site: context.site!,
    trailingSlash: true,
    items: notes.map((note) => ({
      title: note.title,
      link: `/garden/${note.slug}/`,
      pubDate: note.planted,
      description: note.description,
      categories: note.tags,
    })),
  });
}
