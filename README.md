# castares.github.io

Personal site and digital Garden, built with [Astro](https://astro.build) and deployed to GitHub Pages on every push to `main`. Vocabulary lives in [CONTEXT.md](CONTEXT.md); decisions in [docs/adr](docs/adr).

## Planting a Note

1. Open `garden/` as an Obsidian vault and write a Note. The filename is its title; its URL is the slugified filename.
2. Commit and push to `main` (or merge a PR). It's live a minute later.

Frontmatter is optional:

```yaml
maturity: seedling   # seedling (default) | budding | evergreen
tags: [data, ai]
description: One line for previews and RSS.
aliases: [Old title] # also keeps the old URL working after a rename
draft: true          # hold the Note back from publishing
tended: 2026-10-03   # override the git-derived date, e.g. after a typo fix
planted: 2026-10-01  # override the git-derived first-published date
```

- `[[Note]]`, `[[Note|label]]` and `[[Note#Heading]]` link Notes; links to Notes that don't exist yet render as dimmed Unplanted Links.
- `![[image.png]]` embeds a file from `garden/attachments/`, where Obsidian puts pasted images.
- Files and folders starting with `_` or `.` (e.g. `_templates/`) are never published.

## Developing

```sh
pnpm install
pnpm dev                    # http://localhost:4321, live-reloads as you write
pnpm build && pnpm preview  # the exact site that will be deployed
pnpm check                  # type-check
```
