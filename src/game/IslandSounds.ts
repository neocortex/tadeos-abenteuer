/**
 * Lets the island's sound follow Tadeo: the sea grows louder near the shore, each region has its own background,
 * and the animals that live around him are the ones that call.
 */

import { audio } from "../audio/Audio";
import { CallGroup } from "../audio/Ambience";
import { Heightfield } from "../world/Heightfield";
import { REGION_INDEX } from "../world/regions";

const UPDATE_EVERY_SECONDS = 0.25;
/** How far away the sea is still heard clearly. */
const SHORE_RANGE = 24;
const SHORE_DIRECTIONS = 8;
/** Reason: on an island the sea never quite goes away */
const FAINT_SEA = 0.2;
/** A region counts as the place Tadeo is in from this share on. */
const INSIDE = 0.5;

export class IslandSounds {
  private wait = 0;

  constructor(private hf: Heightfield) {}

  update(dt: number, position: { x: number; z: number }): void {
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = UPDATE_EVERY_SECONDS;

    const { x, z } = position;
    const jungle = this.hf.regionAt(x, z, REGION_INDEX.jungle);
    const swamp = this.hf.regionAt(x, z, REGION_INDEX.swamp);
    const hills = this.hf.regionAt(x, z, REGION_INDEX.hills);
    const shore = this.shoreNearness(x, z);
    audio.setIslandMix({
      beach: FAINT_SEA + (1 - FAINT_SEA) * shore,
      jungle,
      swamp,
      hills,
      calls: this.animals(jungle, swamp, hills, shore),
    });
  }

  /** 0 far inland, 1 with water on several sides. */
  private shoreNearness(x: number, z: number): number {
    let water = 0;
    for (let i = 0; i < SHORE_DIRECTIONS; i++) {
      const a = (i / SHORE_DIRECTIONS) * Math.PI * 2;
      if (this.hf.heightAt(x + Math.cos(a) * SHORE_RANGE, z + Math.sin(a) * SHORE_RANGE) < 0) water++;
    }
    return Math.min(1, (water / SHORE_DIRECTIONS) * 2.5);
  }

  private animals(jungle: number, swamp: number, hills: number, shore: number): CallGroup {
    if (jungle > INSIDE) return "parrot";
    if (swamp > INSIDE) return "frog";
    if (hills > INSIDE) return "hills";
    return shore > INSIDE ? "gull" : "songbird";
  }
}
