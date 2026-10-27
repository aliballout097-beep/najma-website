// Turns the raw AI assets in source-assets/ into web-ready files in public/:
//   videos  -> public/seq/<name>/0001.webp ... (image sequences, scrubbed by scroll)
//   photos  -> public/img/<name>.webp
// Run once after changing the source files:  npm run assets
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const SRC = 'source-assets';
const OUT = 'public';
const FPS = 18; // 8 s of video -> 144 frames per sequence
const SEQUENCES = { smash: 'stackd2_video_burger.mp4', stack: 'stackd2_video_burger2.mp4', box: 'stackd2_video_combo.mp4' };

function ffmpeg() {
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  const winget = join(homedir(), 'AppData/Local/Microsoft/WinGet/Packages');
  for (const d of existsSync(winget) ? readdirSync(winget).filter((n) => n.startsWith('Gyan.FFmpeg')) : []) {
    for (const b of readdirSync(join(winget, d))) {
      const exe = join(winget, d, b, 'bin', 'ffmpeg.exe');
      if (existsSync(exe)) return exe;
    }
  }
  throw new Error('ffmpeg not found (winget install Gyan.FFmpeg)');
}
const FF = ffmpeg();

for (const [name, file] of Object.entries(SEQUENCES)) {
  const dir = join(OUT, 'seq', name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  execFileSync(FF, ['-y', '-loglevel', 'error', '-i', join(SRC, file), '-vf', `fps=${FPS}`, '-c:v', 'libwebp', '-quality', '74', '-compression_level', '5', join(dir, '%04d.webp')]);
  console.log(name, readdirSync(dir).length, 'frames');
}

const imgDir = join(OUT, 'img');
mkdirSync(imgDir, { recursive: true });
for (const f of readdirSync(SRC).filter((n) => n.endsWith('.jpg'))) {
  const name = f.replace('stackd2_', '').replace('.jpg', '');
  execFileSync(FF, ['-y', '-loglevel', 'error', '-i', join(SRC, f), '-c:v', 'libwebp', '-quality', '84', join(imgDir, `${name}.webp`)]);
}
console.log('images', readdirSync(imgDir).length);
