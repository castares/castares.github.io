import { execFileSync } from "node:child_process";
import { basename } from "node:path";
import { statSync } from "node:fs";
import { getCollection, type CollectionEntry } from "astro:content";
import { loadVault, parseWikiLinks, resolveNote, slugify } from "./vault";

export type Maturity = CollectionEntry<"notes">["data"]["maturity"];

export interface Note {
  slug: string;
  title: string;
  maturity: Maturity;
  tags: string[];
  aliases: string[];
  description?: string;
  planted: Date;
  tended: Date;
  /** Slugs of the Notes this Note links to. */
  linksTo: Set<string>;
  entry: CollectionEntry<"notes">;
}

/** Commit dates touching a file, newest first; empty when it was never committed. */
function gitDates(file: string): Date[] {
  try {
    const out = execFileSync("git", ["log", "--follow", "--format=%cI", "--", file], { encoding: "utf8" });
    return out.split("\n").filter(Boolean).map((d) => new Date(d));
  } catch {
    return [];
  }
}

/** Drop fenced and inline code, where [[…]] is literal text rather than a link. */
function withoutCode(markdown: string): string {
  return markdown.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, "").replace(/(`+)[^`]*?\1/g, "");
}

function toNote(entry: CollectionEntry<"notes">): Note {
  const file = entry.filePath!;
  const history = gitDates(file);
  const fallback = statSync(file).mtime;
  const vault = loadVault();
  const linksTo = new Set(
    parseWikiLinks(withoutCode(entry.body ?? ""))
      .flatMap((part) => (typeof part === "string" || part.embed || !part.target ? [] : [part.target]))
      .flatMap((target) => resolveNote(vault, target)?.slug ?? []),
  );
  return {
    slug: entry.id,
    title: basename(file, ".md"),
    maturity: entry.data.maturity,
    tags: entry.data.tags,
    aliases: entry.data.aliases,
    description: entry.data.description,
    planted: entry.data.planted ?? history.at(-1) ?? fallback,
    tended: entry.data.tended ?? history.at(0) ?? fallback,
    linksTo,
    entry,
  };
}

let notes: Promise<Note[]> | undefined;

/** Every published Note, most recently Tended first. Cached for the build; fresh on each dev request. */
export function getNotes(): Promise<Note[]> {
  if (notes && import.meta.env.PROD) return notes;
  notes = getCollection("notes", (entry) => !entry.data.draft).then((entries) =>
    entries.map(toNote).sort((a, b) => b.tended.getTime() - a.tended.getTime()),
  );
  return notes;
}

export function backlinksTo(note: Note, all: Note[]): Note[] {
  return all.filter((other) => other.slug !== note.slug && other.linksTo.has(note.slug));
}

export function tagSlug(tag: string): string {
  return slugify(tag) || encodeURIComponent(tag.toLowerCase());
}

export interface Tag {
  slug: string;
  /** The first spelling seen; `AI` and `ai` are the same Tag. */
  label: string;
  notes: Note[];
}

/** Every Tag with its Notes, most used first. */
export function getTags(all: Note[]): Tag[] {
  const tags = new Map<string, Tag>();
  for (const note of all) {
    for (const slug of new Set(note.tags.map(tagSlug))) {
      const label = note.tags.find((tag) => tagSlug(tag) === slug)!;
      const tag = tags.get(slug) ?? tags.set(slug, { slug, label, notes: [] }).get(slug)!;
      tag.notes.push(note);
    }
  }
  return [...tags.values()].sort((a, b) => b.notes.length - a.notes.length || a.label.localeCompare(b.label));
}

export function wasTended(note: Note): boolean {
  return note.tended.toDateString() !== note.planted.toDateString();
}

export const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
