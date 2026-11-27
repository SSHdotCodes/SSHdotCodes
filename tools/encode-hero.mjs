import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
process.chdir(rootDir);

const source = process.argv[2] || 'tools/workstation/blue-detail-cycle.mp4';
const W = 1280;
const H = 500;
const FPS = 25;
const SECONDS = 4;
const FRAMES = FPS * SECONDS;

await mkdir('.render/hero', { recursive: true });
await mkdir('.render/fonts', { recursive: true });

// Ensure ssh.codes web fonts exist locally for Chrome rasterization
const fontBase = 'https://ssh.codes/media/fonts';
const fontFiles = [
  'geist-normal.woff2',
  'geist-mono-normal.woff2',
  'instrument-serif-italic.woff2',
];
for (const f of fontFiles) {
  const dest = path.join(rootDir, '.render/fonts', f);
  try {
    await readFile(dest);
  } catch {
    const res = spawnSync('curl', ['-fsSL', `${fontBase}/${f}`, '-o', dest], { stdio: 'inherit' });
    if (res.status !== 0) throw new Error(`Failed to fetch font ${f}`);
  }
}

const chromeBin = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// 1) Render transparent typography overlay via headless Chrome at 2x DPI then downscale to 1280x500
const overlayHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: "Geist";
    src: url("file://${rootDir}.render/fonts/geist-normal.woff2") format("woff2");
    font-weight: 300 800;
    font-style: normal;
  }
  @font-face {
    font-family: "Geist Mono";
    src: url("file://${rootDir}.render/fonts/geist-mono-normal.woff2") format("woff2");
    font-weight: 400 600;
    font-style: normal;
  }
  @font-face {
    font-family: "Instrument Serif";
    src: url("file://${rootDir}.render/fonts/instrument-serif-italic.woff2") format("woff2");
    font-weight: 400;
    font-style: italic;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${W}px;
    height: ${H}px;
    background: transparent;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  .frame {
    position: relative;
    width: ${W}px;
    height: ${H}px;
    border: 1px solid rgba(255, 255, 255, 0.085);
    padding: 46px 56px 40px 58px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
    font-family: "Geist Mono", monospace;
    font-size: 13.5px;
    letter-spacing: -0.01em;
  }
  .orb {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 32%, #b8deff 0%, #4d88eb 58%, #102652 100%);
    box-shadow: 0 0 12px rgba(102, 163, 255, 0.55);
  }
  .brand-main { color: #eef3fc; font-weight: 500; }
  .brand-tld { color: #7e8aa1; font-weight: 400; }
  .brand-sep { color: rgba(255, 255, 255, 0.22); margin: 0 2px; }
  .brand-handle { color: #8c98b0; font-weight: 400; }

  .hero-copy {
    margin-top: -10px;
    max-width: 560px;
  }
  h1 {
    font-family: "Geist", sans-serif;
    font-size: 66px;
    font-weight: 600;
    line-height: 1.04;
    letter-spacing: -0.038em;
    color: #f4f7fd;
    margin-bottom: 20px;
  }
  h1 em {
    font-family: "Instrument Serif", Georgia, serif;
    font-style: italic;
    font-weight: 400;
    font-size: 76px;
    letter-spacing: -0.015em;
    background: linear-gradient(102deg, #7da4ff 0%, #a5c4ff 52%, #d2e4ff 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    padding-right: 6px;
  }
  .lead {
    font-family: "Geist", sans-serif;
    font-size: 20px;
    font-weight: 400;
    line-height: 1.48;
    letter-spacing: -0.012em;
    color: rgba(219, 228, 244, 0.80);
    max-width: 470px;
  }
  .pillars {
    display: flex;
    align-items: stretch;
    gap: 28px;
    margin-top: 34px;
  }
  .pillar {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-left: 14px;
    border-left: 1px solid rgba(159, 208, 255, 0.22);
  }
  .pillar-k {
    font-family: "Geist Mono", monospace;
    font-size: 10.5px;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: #70809c;
  }
  .pillar-v {
    font-family: "Geist", sans-serif;
    font-size: 14.5px;
    font-weight: 500;
    color: #dfe7f6;
    letter-spacing: -0.01em;
  }
  .bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: "Geist Mono", monospace;
    font-size: 11.5px;
    letter-spacing: 0.02em;
  }
  .caption-left {
    color: #67748d;
  }
  .caption-right {
    color: #9bb0d3;
  }
</style>
</head>
<body>
  <div class="frame">
    <div class="top-row">
      <div class="brand">
        <span class="orb"></span>
        <span><span class="brand-main">ssh</span><span class="brand-tld">.codes</span></span>
        <span class="brand-sep">/</span>
        <span class="brand-handle">@SSHCodes</span>
      </div>
    </div>

    <div class="hero-copy">
      <h1>Hi, I&rsquo;m <em>SSH.</em></h1>
      <p class="lead">Open-weight models, single-GPU frontier inference, and local agent tooling.</p>
      <div class="pillars">
        <div class="pillar">
          <span class="pillar-k">Models</span>
          <span class="pillar-v">ProCreations on HF</span>
        </div>
        <div class="pillar">
          <span class="pillar-k">Hardware</span>
          <span class="pillar-v">Vega &middot; RTX PRO 6000</span>
        </div>
        <div class="pillar">
          <span class="pillar-k">Benchmarks</span>
          <span class="pillar-v">BHBench &middot; Speed Log</span>
        </div>
      </div>
    </div>

    <div class="bottom-row">
      <span class="caption-left">Vega &middot; 96 GB Blackwell &middot; rendered in Cycles</span>
      <span class="caption-right">ssh.codes/vega &#x2197;</span>
    </div>
  </div>
</body>
</html>`;

const overlayHtmlPath = path.join(rootDir, '.render/hero/overlay.html');
const overlayRawPath = path.join(rootDir, '.render/hero/overlay-2x.png');
const overlayPngPath = path.join(rootDir, '.render/hero/overlay.png');
await writeFile(overlayHtmlPath, overlayHtml);

const chromeRes = spawnSync(chromeBin, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--default-background-color=00000000',
  '--force-device-scale-factor=2',
  `--window-size=${W},${H}`,
  `--screenshot=${overlayRawPath}`,
  `file://${overlayHtmlPath}`,
], { stdio: 'inherit' });
if (chromeRes.status !== 0) throw new Error(`Chrome overlay render failed: ${chromeRes.status}`);

await sharp(overlayRawPath)
  .resize(W, H, { kernel: sharp.kernel.lanczos3 })
  .png()
  .toFile(overlayPngPath);

// 2) Render smooth deep obsidian studio background (no gridlines, matches Cycles black)
const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="studio" cx="73%" cy="56%" r="48%">
      <stop offset="0%" stop-color="#0e1d36"/>
      <stop offset="48%" stop-color="#070d18"/>
      <stop offset="100%" stop-color="#040508"/>
    </radialGradient>
    <radialGradient id="subtleLeft" cx="14%" cy="32%" r="42%">
      <stop offset="0%" stop-color="#142342" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#040508" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#040508"/>
  <rect width="${W}" height="${H}" fill="url(#studio)"/>
  <rect width="${W}" height="${H}" fill="url(#subtleLeft)"/>
</svg>`;
await sharp(Buffer.from(bgSvg)).png().toFile('.render/hero/background.png');

// 3) Crop and feather the Cycles workstation render so Vega sits big, sharp, and seamless on the right.
// Source is 3840x2160. Wider left crop captures the full blue floor falloff so it dissolves smoothly into studio black.
const pcW = 636;
const pcH = 488;
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pcW}" height="${pcH}">
  <defs>
    <linearGradient id="mx" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="black"/>
      <stop offset="22%" stop-color="white"/>
      <stop offset="92%" stop-color="white"/>
      <stop offset="100%" stop-color="black"/>
    </linearGradient>
    <linearGradient id="my" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black"/>
      <stop offset="5%" stop-color="white"/>
      <stop offset="91%" stop-color="white"/>
      <stop offset="100%" stop-color="black"/>
    </linearGradient>
    <mask id="m"><rect width="${pcW}" height="${pcH}" fill="url(#my)"/></mask>
  </defs>
  <rect width="${pcW}" height="${pcH}" fill="url(#mx)" mask="url(#m)"/>
</svg>`;
await sharp(Buffer.from(maskSvg)).flatten({ background: '#000' }).png().toFile('.render/hero/mask.png');

function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'warning', '-y', ...args], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.status}`);
}

const previewOnly = process.argv.includes('--preview');
const frameLimit = previewOnly ? 1 : FRAMES;

ffmpeg([
  '-i', source,
  '-loop', '1', '-framerate', String(FPS), '-i', '.render/hero/background.png',
  '-loop', '1', '-framerate', String(FPS), '-i', '.render/hero/mask.png',
  '-loop', '1', '-framerate', String(FPS), '-i', overlayPngPath,
  '-filter_complex',
  `[0:v]fps=${FPS},crop=2656:2040:584:120,scale=${pcW}:${pcH}:flags=lanczos,format=rgb24[v];[2:v]format=gray[m];[v][m]alphamerge[pc];[1:v][pc]overlay=628:6:shortest=1:format=rgb[scene];[scene][3:v]overlay=0:0:shortest=1:format=rgb,format=rgb24[out]`,
  '-map', '[out]',
  '-frames:v', String(frameLimit),
  '-start_number', '0',
  '.render/hero/%04d.png',
]);

await sharp('.render/hero/0000.png').png().toFile('assets/vega-hero.png');

if (!previewOnly) {
  ffmpeg([
    '-framerate', String(FPS),
    '-start_number', '0',
    '-i', '.render/hero/%04d.png',
    '-filter_complex',
    '[0:v]split[a][b];[a]palettegen=stats_mode=full:max_colors=256:reserve_transparent=0[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
    '-loop', '0',
    '-frames:v', String(FRAMES),
    'assets/vega-hero.gif',
  ]);

  const sourceBytes = await readFile(source);
  await writeFile('assets/vega-hero.json', JSON.stringify({
    width: W,
    height: H,
    fps: FPS,
    frames: FRAMES,
    duration_seconds: SECONDS,
    source: 'tools/workstation/blue-detail-cycle.mp4',
    source_sha256: createHash('sha256').update(sourceBytes).digest('hex'),
    source_resolution: [3840, 2160],
    source_fps: 60,
    renderer: 'Blender 5.1.2 / Cycles / OptiX',
    camera: 'fixed',
    lighting: 'blue',
    motion: 'eight spinning fan assemblies',
  }, null, 2) + '\n');
  console.log('Wrote assets/vega-hero.gif, assets/vega-hero.png, and assets/vega-hero.json.');
} else {
  console.log('Wrote preview frame assets/vega-hero.png.');
}
