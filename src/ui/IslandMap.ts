/**
 * The little map in the menu, painted from the real terrain so that every coast and hill is where Tadeo finds it:
 * sand, meadow and rock in the colours of the treasure map, with the light falling from the north-west. The frame
 * stops short of the treasure island, which Tadeo has to find on his own.
 */

/** World units the map shows. */
const WEST = -105;
const EAST = 160;
const NORTH = -78;
const SOUTH = 142;
/** Canvas pixels per world unit: enough to stay crisp on a sharp screen. */
const SCALE = 2;
const WIDTH = (EAST - WEST) * SCALE;
const HEIGHT = (SOUTH - NORTH) * SCALE;

type Rgb = readonly [number, number, number];
const SAND: Rgb = [238, 215, 156];
const MEADOW: Rgb = [156, 188, 96];
const ROCK: Rgb = [176, 148, 100];
const PEAK: Rgb = [132, 106, 76];
const INK: Rgb = [59, 36, 18];

/** Heights where the land changes colour, and water this shallow shows as a pale shoal. */
const SAND_TOP = 1.4;
const MEADOW_TOP = 9;
const ROCK_TOP = 22;
const SHOAL = -1.4;
const RELIEF = 16;

const mix = (a: Rgb, b: Rgb, t: number): Rgb => {
  const k = Math.min(Math.max(t, 0), 1);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};

function landColour(h: number): Rgb {
  if (h < SAND_TOP) return mix(SAND, MEADOW, (h - SAND_TOP + 0.5) / 0.5);
  if (h < MEADOW_TOP) return mix(MEADOW, ROCK, (h - MEADOW_TOP + 2) / 2);
  return mix(ROCK, PEAK, (h - ROCK_TOP + 4) / 4);
}

/** Where a world position lies on the map, in percent from its top-left corner. */
export function mapPercent(x: number, z: number): { left: number; top: number } {
  return { left: ((x - WEST) / (EAST - WEST)) * 100, top: ((z - NORTH) / (SOUTH - NORTH)) * 100 };
}

/**
 * Paint the island into a canvas; the sea stays see-through.
 *
 * @param canvas The canvas to paint into.
 * @param heightAt The terrain height at a world position; below 0 is water.
 */
export function paintIslandMap(canvas: HTMLCanvasElement, heightAt: (x: number, z: number) => number): void {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  // Reason: the coast line and the shading look one world unit to each side, so the grid reaches that far past the frame
  const rowLength = WIDTH + 2 * SCALE;
  const heights = new Float32Array(rowLength * (HEIGHT + 2 * SCALE));
  const at = (px: number, pz: number) => (pz + SCALE) * rowLength + px + SCALE;
  for (let pz = -SCALE; pz < HEIGHT + SCALE; pz++) {
    for (let px = -SCALE; px < WIDTH + SCALE; px++) heights[at(px, pz)] = heightAt(WEST + px / SCALE, NORTH + pz / SCALE);
  }

  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(WIDTH, HEIGHT);
  for (let pz = 0; pz < HEIGHT; pz++) {
    for (let px = 0; px < WIDTH; px++) {
      const h = heights[at(px, pz)];
      const i = (pz * WIDTH + px) * 4;
      if (h <= 0) {
        // Reason: the see-through sea lets the panel's own water colour show, with the shoals a little paler on it
        image.data.set([255, 250, 225, h > SHOAL ? 90 : 0], i);
        continue;
      }
      const coast = heights[at(px - SCALE, pz)] <= 0 || heights[at(px + SCALE, pz)] <= 0 || heights[at(px, pz - SCALE)] <= 0 || heights[at(px, pz + SCALE)] <= 0;
      const slope = heights[at(px - SCALE, pz - SCALE)] - heights[at(px + SCALE, pz + SCALE)];
      const lit = landColour(h).map((c) => c - slope * RELIEF) as unknown as Rgb;
      const [r, g, b] = coast ? mix(lit, INK, 0.75) : lit;
      image.data.set([r, g, b, 255], i);
    }
  }
  ctx.putImageData(image, 0, 0);
}
