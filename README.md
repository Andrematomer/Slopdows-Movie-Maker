# Win Movie Faker

Make a video that looks like it was edited in 2008 and uploaded to YouTube from a laptop webcam.
Win Movie Faker is a video editor that runs entirely in your browser and imitates the look of a
2000s Windows XP movie editor, down to the star wipes.

![Win Movie Faker screenshot](docs/screenshot.jpg)

**[Open Win Movie Faker](https://andrematomer.github.io/Slopdows-Movie-Maker/)**

No install. No account. No upload: your files never leave your computer.

## What you can do

- Import **pictures, videos and music**, drag clips around on the storyboard, trim and split them.
- Add **title cards** (white text on deep blue, with fades) and credits.
- Glue clips together with **transitions**: Star Wipe, Iris, Checkerboard, Pixelate, Spin In and Fade.
- Pick how each picture or video meets the 4:3 screen: **Fit** (black bars), **Fill** (crop) or **Stretch**.
- Give a clip the **Old camera look**: 24 fps, sensor grain, and harsh early-digital contrast and colour.
- Turn on **2008 YouTube mode (uglier)**: blurry 4:3 picture, tinny sound, small file. On by default.
- Add parody **screen-recorder watermarks** (off by default, text is editable).
- Save the result as an **MP4** straight from the browser.
- Your project is **autosaved** in your browser and reopens where you left off.
- **Ctrl+Z** undoes, **Ctrl+Y** redoes, **Delete** removes the selected clip.

## Good to know

- Use a recent Chrome or Edge for the best results. Firefox and Safari should work too.
- Only files your browser can play can be imported (MP4, WebM, MOV, MP3, WAV, AAC, Opus and
  friends). Old formats like WMV or AVI are not supported.
- Autosave keeps copies of your files inside the browser. Clearing site data deletes them.
- Very long videos or songs use a lot of memory, and saving a movie can make the tab sluggish.
- The app is still being polished, so rough edges are expected.

## Not affiliated with Microsoft

Win Movie Faker is a parody and a fan project. It is not made by, endorsed by, or connected to
Microsoft. It uses no Microsoft code, icons, sounds, logos or fonts. The interface uses the fonts
already installed on your computer.

## Run it yourself

```
npm install
npm run dev      # local dev server
npm run build    # type-check + production build into dist/
```

It is a static site (Vite + TypeScript + Preact + [XP.css](https://botoxparty.github.io/XP.css/),
exporting with WebCodecs and [Mediabunny](https://mediabunny.dev)), deployed to GitHub Pages by
the workflow in `.github/workflows`.

`CLAUDE.md` has the design decisions.

## License

TBD (will be an open-source license before the first release).
