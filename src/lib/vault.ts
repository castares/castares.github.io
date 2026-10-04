// A filesystem view of the Garden vault, independent of Astro's content layer
// so the Markdown pipeline can resolve [[wiki-links]] while rendering a Note.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, sep } from "node:path";
import { parse as parseYaml } from "yaml";

export const GARDEN_DIR = join(process.cwd(), "garden");
export const ATTACHMENTS_DIR = join(GARDEN_DIR, "attachments");

export interface VaultNote {
  /** The Note's title: its filename without extension. */
  name: string;
  slug: string;
  aliases: string[];
  path: string;
}

export interface Vault {
  /** Lower-cased Note name or alias → published Note. Drafts are absent. */
  byName: Map<string, VaultNote>;
  /** Lower-cased attachment filename → absolute path. */
  attachments: Map<string, string>;
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Hidden (`.obsidian`, `.trash`) and underscore (`_templates`) paths are never published. */
export function isIgnoredSegment(segment: string): boolean {
  return segment.startsWith(".") || segment.startsWith("_");
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (isIgnoredSegment(entry.name)) return [];
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

export function readFrontmatter(source: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!match) return {};
  return (parseYaml(match[1]) as Record<string, unknown> | null) ?? {};
}

/** Obsidian writes aliases as a list, a single string, or nothing. */
export function toList(value: unknown): string[] {
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value]).map(String).filter(Boolean);
}

/** Old URLs an alias should redirect from: distinct, non-empty, and not the Note's own. */
export function redirectSlugs(slug: string, aliases: string[]): string[] {
  return [...new Set(aliases.map(slugify))].filter((alias) => alias && alias !== slug);
}

let cached: { signature: string; vault: Vault } | undefined;

export function loadVault(): Vault {
  const files = walk(GARDEN_DIR);
  const signature = files.map((f) => `${f}:${statSync(f).mtimeMs}`).join("|");
  if (cached?.signature === signature) return cached.vault;

  const vault: Vault = { byName: new Map(), attachments: new Map() };
  const bySlug = new Map<string, string>();
  const claim = (slug: string, owner: string) => {
    const existing = bySlug.get(slug);
    if (existing && existing !== owner) {
      const [a, b] = [owner, existing].map((path) => relative(GARDEN_DIR, path));
      throw new Error(`Garden: "${a}" and "${b}" both publish at /garden/${slug}/`);
    }
    bySlug.set(slug, owner);
  };

  for (const file of files) {
    if (file.startsWith(ATTACHMENTS_DIR + sep)) {
      vault.attachments.set(basename(file).toLowerCase(), file);
      continue;
    }
    if (extname(file) !== ".md") continue;

    // Drafts still claim their slug: the content collection keys every Note by it.
    const frontmatter = readFrontmatter(readFileSync(file, "utf8"));
    const name = basename(file, ".md");
    const note: VaultNote = { name, slug: slugify(name), aliases: toList(frontmatter.aliases), path: file };
    claim(note.slug, file);
    if (frontmatter.draft === true) continue;

    vault.byName.set(name.toLowerCase(), note);
    for (const alias of note.aliases) vault.byName.set(alias.toLowerCase(), note);
    for (const slug of redirectSlugs(note.slug, note.aliases)) claim(slug, file);
  }

  cached = { signature, vault };
  return vault;
}

/** Resolve a wiki-link target (`Note`, `folder/Note`, `Note.md`) to a published Note. */
export function resolveNote(vault: Vault, target: string): VaultNote | undefined {
  const name = basename(target.trim()).replace(/\.md$/i, "");
  return vault.byName.get(name.toLowerCase());
}

const WIKI_LINK = /(!?)\[\[([^[\]]+?)\]\]/g;

export interface WikiLink {
  raw: string;
  embed: boolean;
  /** The linked Note or file, without heading. Empty for same-Note heading links. */
  target: string;
  heading?: string;
  label?: string;
}

export function parseWikiLinks(text: string): (string | WikiLink)[] {
  const parts: (string | WikiLink)[] = [];
  let last = 0;
  for (const match of text.matchAll(WIKI_LINK)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const [raw, bang, inner] = match;
    const [ref, label] = inner.split("|", 2);
    const [target, heading] = ref.split("#", 2);
    parts.push({ raw, embed: bang === "!", target: target.trim(), heading: heading?.trim(), label: label?.trim() });
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
