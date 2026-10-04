# Astro over Quartz for the site generator

The Garden is written in Obsidian, which makes Quartz the obvious choice: wiki-links, backlinks and graph view work out of the box. We chose Astro instead because this is a personal site that *contains* a Garden, not a Garden alone. Quartz treats the Home page as just another Note and makes a distinctive design costly. With Astro we build wiki-links (remark plugin) and backlinks (computed at build time) ourselves, and we get full control of Home and the visual design, plus a path to publishing notebooks later.
