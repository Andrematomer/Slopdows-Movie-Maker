# CLAUDE.md — Win Movie Faker

Browser-only retro video editor. Goal: **nostalgia, not polish.** If a choice is between
"looks nice" and "looks like a bad 2008 video", pick the bad 2008 video.

## Hard rules
- 100% client-side. No server code, no uploads, no analytics. Must work on GitHub Pages
  (no custom HTTP headers, so no SharedArrayBuffer / multithreaded ffmpeg.wasm).
- Legal safety: parody names only. Do NOT use Microsoft icons, sounds, logos, fonts, the
  words "Windows" or "Movie Maker" in the app name, or exact real watermark names.
  Do NOT copy any real product's watermark font or layout.
- App name: **Win Movie Faker**. Watermark defaults: "Unregistered HyperClam 2" and
  "www.BandiCRAM.com". Watermark text must be user-editable.
- README: the owner asked for a finished, user-ready feel, so it only has a soft line ("still being polished"). The old "must say work in progress" rule was relaxed on 2026-10-22; ask the owner before removing that line.
- Fonts: never bundle MS Sans Serif or look-alike font files (xp.css's @font-face rules are stripped in vite.config.ts). Use the system font stack in src/styles.css.
- Repo will be renamed to `winmoviefaker`; general name is "Win Movie Faker" (with spaces). Update the Pages link in README after the rename.

## Decisions
- Stack: Vite + TypeScript + Preact + XP.css (Luna theme). No Tailwind (reset fights XP.css).
- Export: WebCodecs + Mediabunny (NOT mp4-muxer, it is deprecated). MP4 (H.264 + AAC) is the
  default. Check support with `isConfigSupported()`; fall back to Opus-in-MP4, WebM last.
- Defaults: 640x480, 4:3, 30 fps. 800x600 optional. Output container/codec accuracy does
  not matter (no .wmv/.avi).
- Rendering: one pure function `renderFrame(project, t, ctx)` shared by preview and export.
  Export runs in a Worker with OffscreenCanvas. Time = frame index / fps.
- Title card: #000080 background, white Arial (bundle Arimo for identical rendering),
  fade in/out, optional "moving titles" ghost text.
- Transitions: Cut, Fade, Star wipe (chunky on purpose), Iris, Checkerboard, Pixelate,
  Random dissolve, Spin, Shatter, plus a "Random" button.
- "2008 YouTube mode": 4:3, low bitrate, band-pass audio (~300 Hz–3.4 kHz) plus a little noise.

## Layout (planned)
`src/model`, `src/render`, `src/media`, `src/export`, `src/ui`, `src/assets`.

## Working style
- Owner reads English better than Japanese: reply in plain English.
- Owner prefers blunt, honest answers over reassurance.
- Deploy target: GitHub Pages via GitHub Actions.
