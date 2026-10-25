import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://physicalreasoning.ai',
  trailingSlash: 'always',
  // Keep whitespace as written. Compression drops a line break that sits between text and an
  // inline tag ("from\n<a>"), which glues the words together on the page.
  compressHTML: false,
  redirects: {
    '/join/ai-engineer-new-grad/': '/join/member-of-research-staff/',
  },
  build: {
    // Every page is served as /path/index.html, matching the URLs the site has always used.
    format: 'directory',
    // Each page carries its own styles inline, as the hand-written pages did: no extra request.
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      // Ship the CSS as written. The minifier rewrites media queries into range syntax
      // (width<=480px), which Safari before 16.4 ignores.
      cssMinify: false,
    },
  },
});
