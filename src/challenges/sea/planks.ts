/**
 * The boat's planks: every hit knocks one off, every 10 starfish mend one,
 * and when the last one goes the boat needs a pause (a retry from the last
 * checkpoint).
 */

export const MAX_PLANKS = 4;
/** Starfish it takes to mend one plank. */
const MEND_EVERY = 10;

export class Planks {
  readonly max = MAX_PLANKS;
  count = MAX_PLANKS;

  /** One plank knocked off. True when this hit took the last one. */
  hit(): boolean {
    if (this.count <= 0) return false;
    this.count--;
    return this.count === 0;
  }

  /** Call with the new starfish total after each catch; true when that catch mended a plank. */
  collect(starfish: number): boolean {
    if (starfish % MEND_EVERY !== 0 || this.count >= this.max || this.count <= 0) return false;
    this.count++;
    return true;
  }

  refill(): void {
    this.count = this.max;
  }
}
