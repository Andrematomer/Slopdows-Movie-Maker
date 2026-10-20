import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// base './' so the build works under https://<user>.github.io/<repo>/
export default defineConfig({
  base: './',
  plugins: [preact()],
  build: {
    // XP.css has a selector (progress:not([value]):before:not([value])) that lightningcss's
    // minifier rejects. Skipping CSS minification is the cheap workaround.
    cssMinify: false,
  },
});
