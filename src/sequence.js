// Loads the image sequences in priority order and always answers with the closest
// frame that is already decoded, so scrubbing never shows a hole while loading.
import { SEQ } from './data.js';

const url = (name, i) => `seq/${name}/${String(i + 1).padStart(4, '0')}.webp`;

export class Sequences {
  constructor() {
    this.frames = Object.fromEntries(Object.entries(SEQ).map(([k, n]) => [k, new Array(n).fill(null)]));
    this.total = Object.values(SEQ).reduce((a, b) => a + b, 0);
    this.loaded = 0;
  }

  /** Load in this order: first + last frames of everything, then each sequence fully. */
  async load(onProgress, order = ['smash', 'stack', 'box']) {
    const queue = [];
    for (const k of order) queue.push([k, 0], [k, SEQ[k] - 1]);
    for (const k of order) {
      // coarse pass first (every 4th frame), then fill the gaps
      for (let i = 0; i < SEQ[k]; i += 4) queue.push([k, i]);
      for (let i = 0; i < SEQ[k]; i++) if (i % 4) queue.push([k, i]);
    }
    const seen = new Set();
    const jobs = queue.filter(([k, i]) => !seen.has(`${k}${i}`) && seen.add(`${k}${i}`));
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const [k, i] = jobs[next++];
        const img = new Image();
        img.src = url(k, i);
        try {
          await img.decode();
          this.frames[k][i] = img;
        } catch {
          /* keep going: a missing frame falls back to its neighbour */
        }
        this.loaded++;
        onProgress?.(this.loaded / this.total, k);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  }

  /** Nearest decoded frame to index i (or null if nothing of this sequence is ready). */
  get(name, i) {
    const arr = this.frames[name];
    const n = arr.length;
    i = Math.max(0, Math.min(n - 1, Math.round(i)));
    if (arr[i]) return arr[i];
    for (let d = 1; d < n; d++) {
      if (arr[i - d]) return arr[i - d];
      if (arr[i + d]) return arr[i + d];
    }
    return null;
  }
}
