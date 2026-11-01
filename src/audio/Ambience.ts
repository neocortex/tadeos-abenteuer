/**
 * The sound of the island: a looping background for each kind of place, mixed by where Tadeo stands, and the calls of
 * the animals living there at random moments.
 */

import { loadSample, Sample } from "./samples";

const BEDS = ["beach", "jungle", "swamp", "hills"] as const;
type Bed = (typeof BEDS)[number];

const CALLS = {
  gull: ["call_gull_1", "call_gull_2"],
  songbird: ["call_songbird_1", "call_songbird_2"],
  parrot: ["call_parrot_1", "call_parrot_2"],
  frog: ["call_frog_1", "call_frog_2"],
  hills: ["call_hills_1", "call_hills_2"],
};
export type CallGroup = keyof typeof CALLS;

/** How much of each background to hear (0..1), and which animals are around. */
export type IslandMix = Record<Bed, number> & { calls: CallGroup };

const BED_LEVEL = 0.18;
const CALL_LEVEL = 0.22;
const BED_OVERLAP_SECONDS = 2;
const MIX_SMOOTHING_SECONDS = 1.5;
const CALL_GAP_MS = { least: 3000, most: 10000 };

export class Ambience {
  private beds = {} as Record<Bed, GainNode>;
  private calls = new Map<string, Promise<Sample | null>>();
  private group: CallGroup = "gull";
  private timer: number | null = null;

  constructor(
    private ctx: AudioContext,
    private bus: GainNode,
  ) {
    for (const bed of BEDS) {
      const gain = ctx.createGain();
      gain.gain.value = bed === "beach" ? 1 : 0;
      gain.connect(bus);
      this.beds[bed] = gain;
      void this.startBed(bed);
    }
  }

  setMix(mix: IslandMix): void {
    for (const bed of BEDS) this.beds[bed].gain.setTargetAtTime(mix[bed], this.ctx.currentTime, MIX_SMOOTHING_SECONDS);
    this.group = mix.calls;
  }

  /** Starts or stops the animal calls. */
  setCalling(on: boolean): void {
    if (on && this.timer === null) this.scheduleCall();
    if (!on && this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async startBed(bed: Bed): Promise<void> {
    const sample = await loadSample(this.ctx, `amb_${bed}`, BED_OVERLAP_SECONDS);
    if (!sample) return;
    const src = this.ctx.createBufferSource();
    src.buffer = sample.buffer;
    src.loop = true;
    src.loopStart = sample.loopStart;
    src.loopEnd = sample.loopEnd;
    const level = this.ctx.createGain();
    level.gain.value = sample.level * BED_LEVEL;
    src.connect(level).connect(this.beds[bed]);
    src.start();
  }

  private scheduleCall(): void {
    const gap = CALL_GAP_MS.least + Math.random() * (CALL_GAP_MS.most - CALL_GAP_MS.least);
    this.timer = window.setTimeout(() => {
      // Reason: a held-back context's clock stands still, so every call made now would sound at once on the first press
      if (this.ctx.state === "running") void this.playCall();
      this.scheduleCall();
    }, gap);
  }

  private async playCall(): Promise<void> {
    const keys = CALLS[this.group];
    const key = keys[Math.floor(Math.random() * keys.length)];
    if (!this.calls.has(key)) this.calls.set(key, loadSample(this.ctx, key));
    const sample = await this.calls.get(key)!;
    if (!sample) return;
    const src = this.ctx.createBufferSource();
    src.buffer = sample.buffer;
    // Reason: small changes in pitch, distance and direction keep two takes from sounding like one bird repeating itself
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const gain = this.ctx.createGain();
    gain.gain.value = sample.level * CALL_LEVEL * (0.6 + Math.random() * 0.4);
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    src.connect(gain).connect(pan).connect(this.bus);
    src.start();
  }
}
