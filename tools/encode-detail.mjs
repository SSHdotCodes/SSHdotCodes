import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const source = process.argv[2] || 'tools/workstation/blue-detail-cycle.mp4';
const FPS = 25, SECONDS = 4, FRAMES = FPS * SECONDS;
await mkdir('.render/detail', { recursive: true });
for (const name of ['background', 'type']) {
  await sharp(`tools/banner-${name}.svg`).png().toFile(`.render/detail/${name}.png`);
}
// Extend the studio floor before feathering, keeping the case feet fully opaque.
const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="848" height="557"><defs><linearGradient id="x"><stop stop-color="black"/><stop offset=".12" stop-color="white"/><stop offset=".90" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient><linearGradient id="y" x2="0" y2="1"><stop stop-color="black"/><stop offset=".06" stop-color="white"/><stop offset=".84" stop-color="white"/><stop offset=".90" stop-color="#c8c8c8"/><stop offset=".96" stop-color="#343434"/><stop offset="1" stop-color="black"/></linearGradient><mask id="m"><rect width="848" height="557" fill="url(#y)"/></mask></defs><rect width="848" height="557" fill="url(#x)" mask="url(#m)"/></svg>`;
await sharp(Buffer.from(mask)).flatten({ background: '#000' }).png().toFile('.render/detail/mask.png');
function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'warning', '-y', ...args], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.status}`);
}
ffmpeg([
  '-i', source, '-loop', '1', '-framerate', String(FPS), '-i', '.render/detail/background.png',
  '-loop', '1', '-framerate', String(FPS), '-i', '.render/detail/mask.png',
  '-loop', '1', '-framerate', String(FPS), '-i', '.render/detail/type.png',
  '-filter_complex', `[0:v]fps=${FPS},scale=848:477:flags=lanczos,format=rgb24,split[body][floor];[floor]crop=848:1:0:476,trim=end_frame=1,loop=loop=-1:size=1:start=0,setpts=N/${FPS}/TB,scale=848:80:flags=neighbor,gblur=sigma=3[extension];[body][extension]vstack=shortest=1[v];[2:v]format=gray[m];[v][m]alphamerge[pc];[1:v][pc]overlay=500:38:shortest=1:format=rgb[scene];[scene][3:v]overlay=0:0:shortest=1:format=rgb,format=rgb24[out]`,
  '-map', '[out]', '-frames:v', String(FRAMES), '-start_number', '0', '.render/detail/%04d.png'
]);
ffmpeg([
  '-framerate', String(FPS), '-start_number', '0', '-i', '.render/detail/%04d.png',
  '-filter_complex', '[0:v]split[a][b];[a]palettegen=stats_mode=full:max_colors=256:reserve_transparent=0[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
  '-loop', '0', '-frames:v', String(FRAMES), 'assets/workstation-blue-detail.gif'
]);
await sharp('.render/detail/0000.png').png().toFile('assets/workstation-blue-detail.png');
const sourceBytes = await readFile(source);
await writeFile('assets/workstation-blue-detail.json', JSON.stringify({
  width: 1280, height: 600, fps: FPS, frames: FRAMES, duration_seconds: SECONDS,
  source: 'tools/workstation/blue-detail-cycle.mp4',
  source_sha256: createHash('sha256').update(sourceBytes).digest('hex'),
  source_resolution: [3840, 2160], source_fps: 60,
  visible_base_faces: 2043498, front_vent_holes: 25877,
  renderer: 'Blender 5.1.2 / Cycles / OptiX',
  camera: 'fixed', lighting: 'blue', motion: 'eight spinning fan assemblies'
}, null, 2) + '\n');
console.log('Wrote the high-detail blue GIF, reduced-motion PNG, and source manifest.');
