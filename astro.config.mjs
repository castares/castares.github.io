// @ts-check
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { wikiLinks } from "./src/lib/wiki-links";

export default defineConfig({
  site: "https://castares.github.io",
  trailingSlash: "always",
  markdown: {
    processor: satteri({ mdastPlugins: [wikiLinks] }),
  },
});
