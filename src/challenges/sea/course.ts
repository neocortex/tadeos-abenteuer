/**
 * The obstacle course along the voyage's route (`route.ts`): rocky sea stacks
 * with foam rings, the islets beside the channel, and a trail of glowing
 * starfish that always shows the safe way through. Over every big swell one
 * starfish hangs high in the air, for a boat that jumps.
 */

import * as THREE from "three";
import { mulberry32 } from "../../core/noise";
import { emptyModel, rockBlob, stoneFn } from "../../world/models/shapes";
import { Bin, ModelMaterials, modelGroup } from "../ogre/kit";
import { seaHeight } from "./ocean";
import { StarfishTrail, createStarfishTrail } from "./starfish";
import { SECTIONS, COURSE_END, routeX, trailX } from "./route";
import { ISLETS } from "./scenery";

/** Size of a starfish (half its width) and of the glow around it. */
const FISH_SIZE = 0.85;
const GLOW_SIZE = 7;
/** The glow's lean up from the water, towards the boat: lying flat it would be a thin streak from the chase camera. */
const GLOW_LEAN = 1.0;
/** How far a starfish leans back from upright, towards the sky; flat on the water it would be a thin line from the boat. */
const FISH_LEAN = 0.85;

interface Rock {
  x: number;
  z: number;
  r: number;
  what: "rock" | "islet";
  /** The boat's centre never comes closer than `solid`; within `touch` of its bow-to-stern line it is a hit. */
  solid: number;
  touch: number;
  /** Scene time of the last hit (one hit per bump, not one per frame). */
  hitAt: number;
}

/** Radius of an arch's stacks. */
const ARCH_STACK = 1.5;
/** Seconds before the same rock or islet can cost the boat again. */
const HIT_COOLDOWN = 2.5;

interface Starfish {
  x: number;
  z: number;
  taken: boolean;
  pop: number;
  /** Hangs high over a swell's crest: only a boat in the air can catch it. */
  high: boolean;
}

/** How high a high starfish hangs over the water. */
const HIGH = 2.6;

export interface CourseHit {
  kind: "rock" | "islet";
  at: THREE.Vector3;
  /** Which way to push the boat (-1 left, +1 right). */
  push: number;
}

export class Course {
  readonly group = new THREE.Group();
  readonly rocks: Rock[] = [];
  readonly starfish: Starfish[] = [];
  private trail: StarfishTrail;
  /** Extra height of the sea under the starfish (the giant swells). */
  swellHeight: (x: number, z: number) => number = () => 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();

  constructor(
    bin: Bin,
    mats: ModelMaterials,
    highSpots: number[],
  ) {
    const rand = mulberry32(31);
    for (const sec of SECTIONS) {
      for (const row of sec.rows ?? []) {
        for (const [dx, r] of row.rocks ?? []) {
          const z = row.z + (rand() - 0.5) * 3;
          this.addRock(routeX(z) + dx, z, r, rand, mats);
        }
      }
      for (const [dx, z, gap] of sec.arches ?? []) this.addArch(routeX(z) + dx, z, gap, rand, mats);
    }
    // Reason: islets are solid like the rocks; their beach reaches out to the radius, and the boat is 2 m from mid to bow
    for (const [x, z, r] of ISLETS) this.rocks.push({ x, z, r, what: "islet", solid: r + 2.2, touch: r + 2.5, hitAt: -1e9 });
    // Starfish trail: from the dock along the safe way to the end of the voyage
    for (let z = -12; z > COURSE_END; z -= 7) this.starfish.push({ x: trailX(z), z, taken: false, pop: 0, high: false });
    for (const z of highSpots) {
      const near = this.starfish.reduce((a, b) => (Math.abs(b.z - z) < Math.abs(a.z - z) ? b : a));
      near.high = true;
    }
    this.trail = createStarfishTrail(this.starfish.length, bin);
    this.group.add(this.trail.fish, this.trail.glow);
  }

  private addRock(x: number, z: number, r: number, rand: () => number, mats: ModelMaterials): void {
    const m = emptyModel();
    const stone = stoneFn("#a39a8f", 0.35, rand);
    m.solid.push(rockBlob(Math.round(rand() * 1000), [r * 0.85, r * 1.35, r * 0.8], stone, 2).translate(0, r * 0.35, 0));
    for (let i = 0; i < 2; i++) {
      const a = rand() * Math.PI * 2;
      const s = r * (0.35 + rand() * 0.25);
      m.solid.push(rockBlob(Math.round(rand() * 1000), [s, s * 0.9, s], stone, 1).translate(Math.cos(a) * r * 0.8, -0.1, Math.sin(a) * r * 0.8));
    }
    const g = modelGroup(m, mats);
    g.position.set(x, -0.9, z);
    g.rotation.y = rand() * Math.PI * 2;
    this.group.add(g);
    this.rocks.push({ x, z, r, what: "rock", solid: r * 0.8 + 0.6, touch: r * 0.8 + 0.85, hitAt: -1e9 });
  }

  /** A rock arch to thread: two tall sea stacks `gap` apart with a rock lintel across their tops. */
  private addArch(x: number, z: number, gap: number, rand: () => number, mats: ModelMaterials): void {
    const m = emptyModel();
    const stone = stoneFn("#9d9184", 0.4, rand);
    const off = gap / 2 + ARCH_STACK;
    const height = 6.5 + rand() * 1.5;
    for (const sx of [-1, 1]) {
      m.solid.push(rockBlob(Math.round(rand() * 1000), [ARCH_STACK, height / 2, ARCH_STACK * 0.95], stone, 2).translate(sx * off, height / 2 - 1, 0));
      m.solid.push(rockBlob(Math.round(rand() * 1000), [ARCH_STACK * 1.3, 0.9, ARCH_STACK * 1.2], stone, 1).translate(sx * off, -0.3, 0));
    }
    m.solid.push(rockBlob(Math.round(rand() * 1000), [off + ARCH_STACK * 0.9, 1.0, ARCH_STACK * 0.85], stone, 2).translate(0, height - 1.1, 0));
    const g = modelGroup(m, mats);
    g.position.set(x, -0.9, z);
    this.group.add(g);
    for (const sx of [-1, 1]) {
      const r = ARCH_STACK;
      this.rocks.push({ x: x + sx * off, z, r, what: "rock", solid: r * 0.8 + 0.6, touch: r * 0.8 + 0.85, hitAt: -1e9 });
    }
  }

  /** A retry from the checkpoint at `z`: the starfish from there on float again, and every rock can hit again. */
  reset(z: number): void {
    for (const s of this.starfish) {
      if (s.z >= z) continue;
      s.taken = false;
      s.pop = 0;
    }
    for (const r of this.rocks) r.hitAt = -1e9;
  }

  /** Push the boat's centre out of every rock and islet: they are solid, the boat never sails through them. */
  keepOut(p: THREE.Vector3): void {
    for (const r of this.rocks) {
      const min = r.solid;
      const dx = p.x - r.x;
      const dz = p.z - r.z;
      const d = Math.hypot(dx, dz);
      if (d >= min || d < 1e-6) continue;
      p.x = r.x + (dx / d) * min;
      p.z = r.z + (dz / d) * min;
    }
  }

  /** The `n` sea stacks nearest to (x, z), for the ocean's shallows (which only has room for some). */
  nearestRocks(x: number, z: number, n: number): Rock[] {
    return this.rocks
      .filter((r) => r.what === "rock")
      .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))
      .slice(0, n);
  }

  /** The nearest sea stack ahead of z, or with `islets` any rock or islet (for the E2E test). */
  rockAhead(z: number, islets = false): [number, number] | null {
    const r = this.rocks.filter((k) => (islets || k.what === "rock") && k.z < z - 2).sort((a, b) => b.z - a.z)[0];
    return r ? [r.x, r.z] : null;
  }

  /** Nearest islet to (x, z): x, z and its shore radius (for the E2E test). */
  nearestIslet(x: number, z: number): [number, number, number] {
    let best: Rock | null = null;
    for (const r of this.rocks) if (r.what === "islet" && (!best || Math.hypot(r.x - x, r.z - z) < Math.hypot(best.x - x, best.z - z))) best = r;
    return best ? [best.x, best.z, best.r] : [0, 0, 0];
  }

  /**
   * Float the starfish and test the boat (centre x, z; bow points to -z; `airborne` in a jump).
   * Returns obstacles hit this frame and starfish collected (only while `active`).
   */
  update(dt: number, t: number, bx: number, bz: number, active: boolean, airborne: boolean): { hits: CourseHit[]; starfish: THREE.Vector3[] } {
    const hits: CourseHit[] = [];
    const got: THREE.Vector3[] = [];
    for (const r of this.rocks) {
      if (!active || t - r.hitAt < HIT_COOLDOWN || Math.abs(r.z - bz) > r.touch + 3) continue;
      // Distance from the rock to the boat's centre line (bow to stern)
      const dz = THREE.MathUtils.clamp(r.z - bz, -2.1, 2.1);
      const d = Math.hypot(r.x - bx, r.z - (bz + dz));
      if (d < r.touch) {
        r.hitAt = t;
        hits.push({ kind: r.what, at: new THREE.Vector3(r.x + Math.sign(bx - r.x) * r.r * 0.7, 0.4, bz - 1.5), push: bx >= r.x ? 1 : -1 });
      }
    }
    const { fish, glow } = this.trail;
    this.starfish.forEach((s, i) => {
      if (active && !s.taken && (airborne || !s.high) && Math.abs(s.z - bz) < 2.6 && Math.abs(s.x - bx) < 2.0) {
        s.taken = true;
        got.push(new THREE.Vector3(s.x, s.high ? 1.2 + HIGH : 1.2, s.z));
      }
      if (s.taken) s.pop = Math.min(s.pop + dt * 4, 1);
      const far = s.z > bz + 12 || s.z < bz - 260;
      const scale = far ? 0 : s.taken ? Math.max(0, 1 - s.pop) * (1 + s.pop) : 1;
      const sea = seaHeight(s.x, s.z, t) + this.swellHeight(s.x, s.z) + (s.high ? HIGH : 0);
      // Reason: the slow bob dips the lower arm in and out of the water, so each one floats instead of hovering
      const y = sea + 0.34 + Math.sin(t * 1.3 + i * 1.1) * 0.16 + s.pop * 1.5;
      // Reason: the phase falls with the index, so the light runs along the trail, away from the boat, and shows the way
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.55);
      this.e.set(-FISH_LEAN + Math.sin(t * 1.7 + i) * 0.1, Math.sin(t * 1.3 + i * 0.7) * 0.22, Math.sin(t * 0.5 + i * 2.4) * 0.6);
      this.m.compose(this.v.set(s.x, y, s.z), this.q.setFromEuler(this.e), this.s.setScalar(scale * FISH_SIZE));
      fish.setMatrixAt(i, this.m);
      fish.setColorAt(i, this.c.setScalar(0.75 + pulse * 0.6));
      this.e.set(GLOW_LEAN, 0, 0);
      this.m.compose(this.v.set(s.x, y, s.z), this.q.setFromEuler(this.e), this.s.setScalar(scale * GLOW_SIZE * (0.82 + pulse * 0.3)));
      glow.setMatrixAt(i, this.m);
      glow.setColorAt(i, this.c.setScalar(0.65 + pulse * 0.75));
    });
    for (const mesh of [fish, glow]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
    }
    return { hits, starfish: got };
  }
}
