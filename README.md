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

Early prototype (still work in progress):

- Working: XP-style window, title cards, picture clips, drag to reorder, 7 transitions
  (cut, fade, star wipe, iris, checkerboard, pixelate, spin), two parody watermarks,
  2008 mode (4:3, blurry, low quality), MP4 export in the browser.
- Not yet: video clips, audio, trimming, export in a Web Worker, more effects.
- Export uses H.264 when the browser can encode it, otherwise VP9 inside an MP4.

See `CLAUDE.md` for the decisions made so far.

## Develop

```
npm install
npm run dev     # local dev server
npm run build   # type-check + production build into dist/
```

## License

TBD (will be an open-source license before the first release).
