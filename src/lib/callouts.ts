// Renders Obsidian callouts: `> [!type] Title`, foldable with `[!type]-` (closed) or `[!type]+` (open).
import { defineMdastPlugin } from "satteri";
import type { PhrasingContent } from "mdast";

const CALLOUT = /^\[!([\w-]+)\]([+-]?)[ \t]*/;

export const callouts = defineMdastPlugin({
  name: "garden-callouts",
  blockquote(node, ctx) {
    const first = node.children[0];
    if (first?.type !== "paragraph") return;
    const head = first.children[0];
    if (head?.type !== "text") return;
    const marker = CALLOUT.exec(head.value);
    if (!marker) return;

    const [matched, rawType, fold] = marker;
    const type = rawType.toLowerCase();

    // The title is the rest of the marker's line, which may span several inline nodes.
    const title: PhrasingContent[] = [];
    let body: PhrasingContent[] = [];
    for (const [i, child] of first.children.entries()) {
      const part = i === 0 ? { type: "text" as const, value: head.value.slice(matched.length) } : child;
      const newline = part.type === "text" ? part.value.indexOf("\n") : -1;
      if (part.type !== "text" || newline === -1) {
        title.push(part);
        continue;
      }
      title.push({ type: "text", value: part.value.slice(0, newline) });
      body = [{ type: "text", value: part.value.slice(newline + 1) }, ...first.children.slice(i + 1)];
      break;
    }
    const titleNodes = title.filter((n) => n.type !== "text" || n.value.trim());
    if (titleNodes.length === 0) titleNodes.push({ type: "text", value: type[0].toUpperCase() + type.slice(1) });

    ctx.setProperty(node, "data", {
      hName: fold ? "details" : "div",
      hProperties: { className: ["callout"], dataCallout: type, ...(fold === "+" && { open: true }) },
    });
    ctx.replaceNode(first, [
      {
        type: "paragraph",
        data: { hName: fold ? "summary" : "div", hProperties: { className: ["callout-title"] } },
        children: titleNodes,
      },
      ...(body.some((n) => n.type !== "text" || n.value.trim()) ? [{ type: "paragraph" as const, children: body }] : []),
    ]);
  },
});
