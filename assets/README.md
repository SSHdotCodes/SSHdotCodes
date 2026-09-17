# Profile artwork

`workstation.gif` is a seamless six-second, 20 fps render of the actual Three.js
workstation from [ssh.codes](https://ssh.codes/#workstation-reconstruction).
`workstation.png` is its first frame and the profile's reduced-motion fallback.
Both are 1280 × 600. GitHub renders the animation as an image; the banner links
to the live scene for camera and lighting controls.

The model was copied from a fresh `ssh-codes-root` Pi source archive on
2026-09-16. The original scene is preserved in `tools/workstation/scene.js`,
without changes to its geometry, materials, or interaction code. Its SHA-256 is
`87122af2870b2853db1171b81da3d0e2bd912aa5f74e2c14ba50accf88c114f8`.

The profile renderer adds a charcoal/red composition, a gentle orbit, deterministic
fan rotation, and brighter room lighting. It uses the original scene's exposed
rendering controls. The original scene and the new composition belong to this
profile; Three.js and esbuild remain external npm dependencies under their own
licenses. No production server or website changes are needed to regenerate it.

## Regenerate

Requires Node.js, npm, ffmpeg, and a browser with WebGL2.

1. Run `npm ci` in the repository root.
2. Run `npm run render` and open the printed loopback URL.
3. Wait for the scene, then click **Export 120 frames**.
4. When the page reports the export is complete, run `npm run encode` in another terminal.
5. Inspect both finished images before committing them. Stop the render server when done.

Raw frames and the bundled scene stay in the ignored `.render/` directory.
The renderer serves only on `127.0.0.1`; frame writes accept same-origin PNGs
in numbered slots. The build uses pinned dependencies from `package-lock.json`.
Arial and the browser's monospace font are rasterized into the artwork, so the
finished profile does not fetch fonts or rendering libraries.
