# Slopdows Movie Faker

> **🚧 WORK IN PROGRESS — nothing here works yet. Come back later. 🚧**

A fake-nostalgic video editor that runs 100% in your browser. It imitates the look of a
2000s Windows XP movie editor and the quality of a 2008 YouTube upload.

No server. No uploads. Your videos never leave your computer.

## Planned

- Windows XP "Luna" style window, menus, toolbar and storyboard
- Title cards: white text on deep blue, with fades
- Ugly 2000s transitions (star wipe and friends)
- "2008 YouTube mode": 4:3, low bitrate, tinny laptop-mic audio
- Parody screen-recorder watermarks (toggle on and off)
- Export to MP4, in the browser

## Not affiliated with Microsoft

This is a parody and a fan project. It is not made by, endorsed by, or connected to
Microsoft. It uses no Microsoft code, icons, sounds, logos or fonts.

## Status

Work in progress, but usable:

- Working: XP-style window, title cards, pictures, **video and audio import** (decoded in the
  browser), trim (start + length), split at playhead, volume, a music lane, drag to reorder,
  7 transitions (cut, fade, star wipe, iris, checkerboard, pixelate, spin), two parody
  watermarks, 2008 mode (4:3, blurry, telephone-band audio plus hiss), full screen preview,
  **autosave** (project and media are kept in this browser's IndexedDB and restored on load),
  MP4 export in the browser with sound (AAC, or Opus if AAC is unavailable).
- Export uses H.264 when the browser can encode it, otherwise VP9 inside an MP4.

### Known limitations

- **No converter for odd formats.** Only what your browser can decode works (MP4/H.264, WebM,
  MOV, MP3, WAV, AAC, Opus...). WMV, AVI, HEVC and similar are rejected with a message.
  An ffmpeg.wasm fallback was dropped: single-threaded it is slow and ~30 MB, and it
  cannot be made multithreaded on GitHub Pages.
- Export runs on the main thread (the tab may feel sluggish), not in a Worker.
- Whole audio tracks are decoded into memory, so very long audio files are heavy.
- Autosave stores copies of your media in the browser; clearing site data deletes them.
- Not yet: extra transitions from the plan (Random dissolve, Shatter), moving titles.

See `CLAUDE.md` for the decisions made so far.

## Develop

```
npm install
npm run dev     # local dev server
npm run build   # type-check + production build into dist/
```

## License

TBD (will be an open-source license before the first release).
