// Turns Obsidian [[wiki-links]] and ![[embeds]] in Garden Notes into links,
// images, or Unplanted Links when the target Note does not exist (yet).
import { dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { slug as headingId } from "github-slugger";
import { defineMdastPlugin } from "satteri";
import type { MdastContent } from "satteri";
import { GARDEN_DIR, loadVault, parseWikiLinks, resolveNote, type WikiLink } from "./vault";

const IMAGE = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const unplanted = (text: string): MdastContent => ({
  type: "html",
  value: `<span class="unplanted" title="Not planted yet">${escapeHtml(text)}</span>`,
});

export function noteHref(slug: string, heading?: string): string {
  return `/garden/${slug}/${heading ? `#${headingId(heading)}` : ""}`;
}

function toNode(link: WikiLink, notePath: string): MdastContent {
  const vault = loadVault();

  if (link.embed && IMAGE.test(link.target)) {
    const file = vault.attachments.get(link.target.toLowerCase());
    if (!file) return unplanted(link.label ?? link.target);
    const url = `./${relative(dirname(notePath), file).split(sep).join("/")}`;
    // Obsidian uses `![[img.png|300]]` for width; only treat non-numeric labels as alt text.
    const alt = link.label && !/^\d+(x\d+)?$/.test(link.label) ? link.label : "";
    return { type: "image", url: encodeURI(url), alt };
  }

  // Obsidian's default label for [[Note#Heading]] is "Note > Heading".
  const text = link.label ?? [link.target, link.heading].filter(Boolean).join(" > ");
  if (!link.target) {
    return { type: "link", url: `#${headingId(link.heading ?? "")}`, children: [{ type: "text", value: text }] };
  }
  const note = resolveNote(vault, link.target);
  if (!note) return unplanted(text);
  return {
    type: "link",
    url: noteHref(note.slug, link.heading),
    children: [{ type: "text", value: text }],
    data: { hProperties: { className: ["wikilink"] } },
  };
}

export const wikiLinks = defineMdastPlugin({
  name: "garden-wiki-links",
  text(node, ctx) {
    if (!ctx.fileURL || !node.value.includes("[[")) return;
    const notePath = fileURLToPath(ctx.fileURL);
    if (!notePath.startsWith(GARDEN_DIR + sep)) return;

    const parts = parseWikiLinks(node.value);
    if (parts.length === 1 && typeof parts[0] === "string") return;
    ctx.replaceNode(
      node,
      parts.map((part) => (typeof part === "string" ? { type: "text", value: part } : toNode(part, notePath))),
    );
  },
});
