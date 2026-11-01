/**
 * Hen voices: a quick "bok", a startled "ba-GAWK", a happy cackle and the chick's "piep", for Mia's flock and Chuleta.
 */

import { audio } from "./Audio";

const VOLUME = 0.6;
let lastAt = 0;

/** Rate-limit so a whole flock clucking at once doesn't turn into noise. */
function say(key: string, gapSeconds: number, pitch: number): void {
  const now = performance.now() / 1000;
  if (now - lastAt < gapSeconds) return;
  lastAt = now;
  audio.playSfx(key, VOLUME, pitch);
}

export const henVoice = {
  bok(pitch = 1): void {
    say("hen_bok", 0.12, pitch);
  },

  bagawk(pitch = 1): void {
    say("hen_bagawk", 0.25, pitch);
  },

  /** Proud "bok bok bok ba-GAAWK" when a hen lands in the coop. */
  cackle(pitch = 1): void {
    say("hen_cackle", 0.2, pitch);
  },

  peep(): void {
    say("chick_peep", 0.15, 1);
  },
};
