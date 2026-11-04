/**
 * The voyage's giant swells. Each one is a long crest across the channel that
 * rolls towards the boat as the boat sails towards it, and it is part of the
 * ocean itself: the GPU lifts the sea surface with it (`swellHeight` in
 * `SEA_GLSL`) and `height` is the same shape in JS, so the boat rides what the
 * player sees. Met bow-first it carries the boat up and over with a jump; met
 * sideways, or where it breaks into white foam, it is a hit.
 */

import * as THREE from "three";
import { Fx } from "../ogre/fx";
import { MAX_SWELLS, SWELL_BACK, SWELL_FRONT, SWELL_TAPER, SwellUniforms } from "./ocean";
import { SECTIONS, routeX } from "./route";
import { BoatState, SeaEvent, SeaThing } from "./things";

/** A swell rolls towards the boat at this fraction of the boat's own approach. */
const ROLL = 0.6;
/** Crest height (m) and the jump it gives when ridden bow-first. */
const HEIGHT = 2.4;
const JUMP = 1.6;
/** How far the bow may point away from straight into the swell and still ride it. */
const RIDE_ANGLE = 0.45;
/** Swells rise out of the sea between these distances ahead of the boat, and sink away this far behind it. */
const RISE_FAR = 190;
const RISE_NEAR = 130;
const SINK_BEHIND = 30;

interface Swell {
  section: number;
  zMeet: number;
  x0: number;
  x1: number;
  breakX: [number, number] | null;
  /** Where the crest is now, how far it was from the boat last frame (NaN before the first update), and how tall. */
  z: number;
  rel: number;
  amp: number;
  /** Already met the boat. */
  judged: boolean;
}

export class Swells implements SeaThing {
  readonly group = new THREE.Group();
  private swells: Swell[] = [];
  private sprayTimer = 0;
  private v = new THREE.Vector3();
  private dir = new THREE.Vector3();

  /** `uniforms`: the ocean's swell slots (the wake shares them). */
  constructor(
    private fx: Fx,
    readonly uniforms: SwellUniforms,
  ) {
    SECTIONS.forEach((sec, section) => {
      for (const s of sec.swells ?? []) {
        const c = routeX(s.zMeet);
        const breakX: [number, number] | null = s.breakX ? [c + s.breakX[0], c + s.breakX[1]] : null;
        this.swells.push({ section, zMeet: s.zMeet, x0: c + s.x0, x1: c + s.x1, breakX, z: s.zMeet, rel: NaN, amp: 0, judged: false });
      }
    });
  }

  /** The giant swells' height at (x, z): the JS twin of `swellHeight` in `SEA_GLSL`. */
  height(x: number, z: number): number {
    let h = 0;
    for (const s of this.swells) {
      if (s.amp <= 0) continue;
      const dz = z - s.z;
      const w = dz > 0 ? SWELL_FRONT : SWELL_BACK;
      const c = Math.exp(-(dz * dz) / (w * w));
      if (c < 1e-4) continue;
      const half = (s.x1 - s.x0) / 2;
      const u = Math.abs(x - (s.x0 + s.x1) / 2) / half;
      const e = Math.min(Math.max((u - SWELL_TAPER) / (1 - SWELL_TAPER), 0), 1);
      h += s.amp * c * (1 - e * e * (3 - 2 * e));
    }
    return h;
  }

  /** Where the trail's high starfish hang: one over each swell that is not a teaching one (meeting z). */
  get highSpots(): number[] {
    return this.swells.filter((s) => SECTIONS[s.section].name !== "start").map((s) => s.zMeet);
  }

  update(dt: number, _t: number, boat: BoatState, active: boolean): SeaEvent[] {
    const events: SeaEvent[] = [];
    for (const s of this.swells) {
      const prev = s.rel;
      s.z = s.zMeet - (boat.z - s.zMeet) * ROLL;
      const ahead = boat.z - s.z;
      // Reason: only rise out of the sea within sight, and sink away behind the boat instead of blocking the chase camera
      const rise = 1 - THREE.MathUtils.smoothstep(ahead, RISE_NEAR, RISE_FAR);
      const sink = 1 - THREE.MathUtils.smoothstep(-ahead, 6, SINK_BEHIND);
      s.amp = HEIGHT * rise * sink;
      // The crest passes the boat: ride it or get hit
      const now = s.z - boat.z;
      s.rel = now;
      // Reason: NaN before the first update, so a swell already behind a debug start is not judged
      if (!s.judged && prev < 0 && now >= 0) {
        s.judged = true;
        if (active && !boat.airborne && boat.x > s.x0 && boat.x < s.x1) events.push(this.judge(s, boat));
      }
    }
    this.spray(dt, boat);
    this.feed(boat);
    return events;
  }

  private judge(s: Swell, boat: BoatState): SeaEvent {
    const breaking = s.breakX !== null && boat.x > s.breakX[0] - 0.8 && boat.x < s.breakX[1] + 0.8;
    if (!breaking && Math.abs(boat.heading) < RIDE_ANGLE) return { kind: "jump", height: JUMP };
    return { kind: "hit", at: new THREE.Vector3(boat.x, 1.8, boat.z - 1), push: boat.heading > 0 ? 1 : -1, what: "swell" };
  }

  /** Spray blown off the breaking parts of the crests near the boat. */
  private spray(dt: number, boat: BoatState): void {
    this.sprayTimer -= dt;
    if (this.sprayTimer > 0) return;
    this.sprayTimer = 0.04;
    for (const s of this.swells) {
      if (!s.breakX || s.amp < 0.8 || Math.abs(s.z - boat.z) > 110) continue;
      const lo = Math.max(s.breakX[0], s.x0 + 2);
      const hi = Math.min(s.breakX[1], s.x1 - 2);
      const x = THREE.MathUtils.lerp(lo, hi, Math.random());
      this.fx.puff.emit({ at: this.v.set(x, s.amp * 0.95, s.z + 0.8), count: 3, speed: [2, 5], dir: this.dir.set(0, 0.9, 1), spread: 0.45, gravity: 8, drag: 0.7, life: [0.5, 1.0], size: [0.45, 0.15], color: ["#ffffff", "#e6fbff"], alpha: 0.9 });
    }
  }

  /** The nearest swells go to the shader; the other slots are switched off. */
  private feed(boat: BoatState): void {
    const near = this.swells.filter((s) => s.amp > 0.01).sort((a, b) => Math.abs(a.z - boat.z) - Math.abs(b.z - boat.z));
    for (let i = 0; i < MAX_SWELLS; i++) {
      const s = near[i];
      const slot = this.uniforms.uSwells.value[i];
      const brk = this.uniforms.uSwellBreak.value[i];
      if (!s) {
        slot.set(0, 1, 0, 0);
        brk.set(1e5, 1e5);
        continue;
      }
      slot.set((s.x0 + s.x1) / 2, (s.x1 - s.x0) / 2, s.z, s.amp);
      if (s.breakX) brk.set(s.breakX[0], s.breakX[1]);
      else brk.set(1e5, 1e5);
    }
  }

  reset(index: number): void {
    for (const s of this.swells) if (s.section >= index) s.judged = false;
  }
}
