# Profile assets

## Hero banner (`vega-hero.gif` / `vega-hero.png`)

`vega-hero.gif` is a four-second, 25 fps seamless loop of **Vega** (RTX PRO 6000 Blackwell) rendered in Blender 5.1.2 / Cycles / OptiX at 3840 × 2160 and 60 fps (`tools/workstation/blue-detail-cycle.mp4`), composited into a 1280 × 500 banner with typography matching [ssh.codes](https://ssh.codes) (`Geist`, `Instrument Serif`, `Geist Mono`). `vega-hero.png` is frame 0 for `prefers-reduced-motion`.

Regenerate (requires Node.js, ffmpeg, and Chrome for font rasterization):

```sh
npm ci
npm run encode
```

## Live Hugging Face stats (`hf-stats-dark.svg` / `hf-stats-light.svg`)

Generated directly from the Hugging Face API for `ProCreations` via `npm run stats` (`tools/update-hf-stats.mjs`) and refreshed automatically every 6 hours on the `output` branch by `.github/workflows/hf-stats.yml`.
