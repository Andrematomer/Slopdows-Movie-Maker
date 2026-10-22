import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

/**
 * XP.css bundles font files (MS Sans Serif look-alike, DOS font) whose licenses we can't verify.
 * Strip every @font-face from it so none of those files ship. The app uses system fonts instead
 * (see the font stack in src/styles.css).
 */
function stripXpFonts(): Plugin {
  return {
    name: 'strip-xp-css-fonts',
    enforce: 'pre',
    transform(code, id) {
      if (!/xp\.css/i.test(id) || !id.split('?')[0]!.endsWith('.css')) return null;
      return { code: code.replace(/@font-face\s*\{[^}]*\}/g, ''), map: null };
    },
  };
}

// base './' so the build works under https://<user>.github.io/<repo>/
export default defineConfig({
  base: './',
  plugins: [stripXpFonts(), preact()],
  build: {
    // XP.css has a selector (progress:not([value]):before:not([value])) that lightningcss's
    // minifier rejects. Skipping CSS minification is the cheap workaround.
    cssMinify: false,
  },
});
