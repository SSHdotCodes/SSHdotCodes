# Profile artwork

`workstation-blue-detail.gif` is a four-second, 25 fps loop of the detailed blue
Blender workstation, composed into the profile's 1280 × 600 banner.
`workstation-blue-detail.png` is its first frame and the reduced-motion fallback.
The camera stays fixed and eight fan assemblies spin. The banner links to the
interactive Three.js version on [ssh.codes](https://ssh.codes/#workstation-reconstruction).

The render uses the photographed workstation reconstruction refined in Blender
5.1.2: approximately 2.04 million visible base faces, 25,877 actual front intake
holes, a woven roof filter, curved fan blades, detailed circuitry, GPU fins and
screws, textured metal, and physical glass. Hidden hardware details are artistic
approximations. Cycles/OptiX rendered the source at native 3840 × 2160 and 60 fps
on an RTX PRO 6000, with up to 256 adaptive samples and denoising.

`tools/workstation/blue-detail-cycle.mp4` contains one complete four-second
physical fan cycle from that render. Every rotor makes an integer number of
revolutions in four seconds. It has no music, camera cuts, reverse playback or
crossfade. The GIF samples that cycle at 25 fps; its frames have exact 40 ms delays.
The source checksum and output settings are in `workstation-blue-detail.json`.

## Regenerate

Requires Node.js, npm and ffmpeg. Arial and Menlo (or their platform substitutes)
are rasterized into the banner. No fonts or rendering libraries load on GitHub.

```sh
npm ci
npm run encode
```

The included video is the default input. To use an equivalent 4K/60 fixed-camera,
four-second cycle, pass its path to `npm run encode -- /path/to/cycle.mp4`.
The two SVG files in `tools/` define the existing banner layout and matching blue
accents. The encoder feathers the studio background, preserves the full chassis,
and produces both the animation and static fallback. Temporary composited frames
stay in ignored `.render/detail/`.

The earlier website-derived renderer remains under `tools/render.html` and
`tools/workstation/scene.js` for reference. Its commands are `npm run render` and
`npm run encode:legacy`; it does not generate the current profile artwork.
