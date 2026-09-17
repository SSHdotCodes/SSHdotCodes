import { spawnSync } from 'node:child_process';
import { copyFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const frames = (await readdir('.render/frames')).filter(x => /^\d{4}\.png$/.test(x)).sort();
if (frames.length !== 120 || frames.some((name, i) => name !== `${String(i).padStart(4, '0')}.png`)) {
  throw new Error('Export all 120 frames in the browser before encoding.');
}
const result = spawnSync('ffmpeg', [
  '-y', '-framerate', '20', '-i', '.render/frames/%04d.png',
  '-filter_complex', '[0:v]split[a][b];[a]palettegen=stats_mode=full:max_colors=256[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
  '-loop', '0', 'assets/workstation-fixed-angle.gif'
], { stdio: 'inherit' });
if (result.status !== 0) throw new Error('ffmpeg failed; install ffmpeg and retry.');
await copyFile('.render/frames/0000.png', 'assets/workstation-fixed-angle.png');
console.log('Wrote assets/workstation-fixed-angle.gif and assets/workstation-fixed-angle.png');
