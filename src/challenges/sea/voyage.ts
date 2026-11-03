/**
 * Sailing the voyage: reads the helm keys, moves the boat where its bow
 * points, lets the current bring it back into the channel, and routes what
 * the course and the things along it report — a hit costs a plank, starfish
 * mend them, dolphins give a boost, the whirlpool spins the boat round, the
 * whale's spout lifts it, a buoy saves the checkpoint, and when the last plank goes the boat fades back to the last
 * checkpoint (`shared/retry.ts`). Outside the sail phase the boat steers
 * itself (towards `autoX`, at `cruise`).
 */

import * as THREE from "three";
import { audio } from "../../audio/Audio";
import { Input } from "../../core/Input";
import { DIALOGUES } from "../../data/dialogues";
import { ChallengeContext } from "../types";
import { lerp } from "../ogre/kit";
import { Fx } from "../ogre/fx";
import { Director } from "../ogre/director";
import { Popups } from "../ogre/popups";
import { retryFromCheckpoint } from "../shared/retry";
import { Boat } from "./boat";
import { Course } from "./course";
import { Helm, CRUISE } from "./helm";
import { Planks } from "./planks";
import { SECTIONS, trailX } from "./route";
import { LANDING_Z } from "./scenery";
import { SeaUI } from "./seaUI";
import { BoatState, SeaEvent, SeaThing } from "./things";

type Hit = Extract<SeaEvent, { kind: "hit" }>;

export interface VoyageDeps {
  ctx: ChallengeContext;
  boat: Boat;
  course: Course;
  things: SeaThing[];
  ui: SeaUI;
  fx: Fx;
  cam: Director;
  popups: Popups;
  input(): Input | undefined;
  /** A short spoken remark in a bubble over the boat. */
  remark(speaker: string, text: string): void;
}

export interface Checkpoint {
  index: number;
  x: number;
  z: number;
  starfish: number;
}

/** How long the whirlpool spins the boat, and how high the whale's spout lifts it. */
const SPIN_TIME = 1.6;
const LIFT = 1.5;

const RETRY_LINES = ["retry_sea_1", "retry_sea_2", "retry_sea_3"].map((k) => DIALOGUES[k]);

export class Voyage {
  readonly helm = new Helm();
  readonly planks = new Planks();
  checkpoint: Checkpoint = { index: 0, x: 0, z: 0, starfish: 0 };
  /** True from the moment the last plank goes until the boat sails on from the checkpoint. */
  retrying = false;
  retries = 0;
  starfish = 0;
  /** Everything the boat bumped into so far, by what it was, and the swells it jumped off. */
  hits = 0;
  hitsBy: Record<string, number> = {};
  jumps = 0;
  offCourse = false;
  /** Seconds of dolphin boost left. */
  boostLeft = 0;
  /** The whirlpool's hold on the boat, and how far round the last spin turned it (radians). */
  spin: { t: number; cx: number; cz: number; r: number; a0: number; dir: number; yaw0: number } | null = null;
  spun = 0;
  /** Lines said in bubbles while sailing (for the E2E test). */
  readonly remarks: string[] = [];
  /** Target speed and (when not steered by the player) target x. */
  cruise = 0;
  autoX: number | null = null;
  /** Sideways shove from a hit (m/s, decays). */
  private shove = 0;
  private offRemarkAt = -1e9;
  private boatState: BoatState = { x: 0, z: 0, heading: 0, speed: 0, airborne: false };

  constructor(private d: VoyageDeps) {}

  /** Save the place to come back to: where the boat is now, or section `index`'s buoy. */
  save(index: number, atBuoy = true): void {
    const p = this.d.boat.root.position;
    const z = atBuoy ? SECTIONS[index].startZ : p.z;
    this.checkpoint = { index, x: atBuoy ? trailX(z) : p.x, z, starfish: this.starfish };
  }

  update(dt: number, t: number, active: boolean): void {
    const { boat, course, things } = this.d;
    const helm = this.helm;
    const p = boat.root.position;
    // Reason: once the last plank is gone the boat waits for the fade, so nothing else can hit it
    if (this.retrying) {
      boat.speed = 0;
      return;
    }
    const before = helm.heading;
    this.boostLeft = Math.max(0, this.boostLeft - dt);
    if (this.spin) this.whirl(dt, p);
    else if (active) {
      const input = this.d.input();
      const key = (code: string) => (input && !this.d.ctx.ui.dialogue.isOpen && input.isDown(code) ? 1 : 0);
      helm.steer(dt, (key("ArrowLeft") - key("ArrowRight")) as -1 | 0 | 1, (key("ArrowUp") - key("ArrowDown")) as -1 | 0 | 1, this.boostLeft > 0);
    } else {
      // Outside the sail phase the boat steers itself: towards `autoX`, or straight ahead
      helm.speed += (this.cruise - helm.speed) * Math.min(dt * 1.2, 1);
      const want = this.autoX === null ? 0 : THREE.MathUtils.clamp((p.x - this.autoX) * 0.08, -0.5, 0.5);
      helm.heading = lerp(helm.heading, want, Math.min(dt * 2, 1));
    }
    boat.speed = helm.speed;
    if (!this.spin) {
      p.x += -Math.sin(helm.heading) * helm.speed * dt + this.shove * dt;
      p.z -= Math.cos(helm.heading) * helm.speed * dt;
      // Reason: `vx` is what the boat leans by; turning right (heading falling) leans it like the old sideways slide did
      boat.vx = lerp(boat.vx, dt > 0 ? ((before - helm.heading) / dt) * 5.4 : 0, Math.min(dt * 6, 1));
      boat.root.rotation.y = helm.heading;
    }
    this.shove *= Math.max(0, 1 - dt * 3);
    if (active) this.current(dt, t, p);
    course.keepOut(p);
    for (const th of things) th.keepOut?.(p);

    const res = course.update(dt, t, p.x, p.z, active, boat.airborne);
    const s = this.boatState;
    s.x = p.x;
    s.z = p.z;
    s.heading = helm.heading;
    s.speed = helm.speed;
    s.airborne = boat.airborne;
    const events = things.flatMap((th) => th.update(dt, t, s, active));
    if (!active) return;
    for (const h of res.hits) this.hit({ kind: "hit", at: h.at, push: h.push, what: h.kind });
    for (const e of events) this.route(e);
    for (const at of res.starfish) this.catchStarfish(at);
    this.d.ui.setVoyage(-p.z / -LANDING_Z, this.starfish);
  }

  /** Past the channel's edge the current carries the boat back, and Chuleta says so (at most every 10 s). */
  private current(dt: number, t: number, p: THREE.Vector3): void {
    const pull = this.helm.pull(dt, p.x, p.z);
    p.x += pull.drift;
    this.offCourse = pull.offCourse;
    if (!pull.offCourse || t - this.offRemarkAt < 10) return;
    this.offRemarkAt = t;
    this.say("Chuleta", DIALOGUES.sea_offcourse[0].text);
  }

  private catchStarfish(at: THREE.Vector3): void {
    const { fx, ui, boat } = this.d;
    this.starfish++;
    fx.stars(at, 8);
    fx.glow.emit({ at, count: 1, speed: [0, 0], life: [0.25, 0.25], size: [1.2, 2.4], color: "#ffb070", intensity: 2 });
    audio.playSfx("sfx_berry_collect", 0.55, 1 + (this.starfish % 5) * 0.06);
    if (!this.planks.collect(this.starfish)) return;
    // Ten starfish: a plank is mended
    ui.setPlanks(this.planks.count);
    fx.heal(boat.root.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
    audio.playSfx("sfx_heal", 0.6);
    this.d.popups.show("Geflickt!", this.headPos(), { color: "#ffe066", size: 52 });
  }

  /** What a thing along the route did to the boat. */
  private route(e: SeaEvent): void {
    const { boat, popups, fx } = this.d;
    switch (e.kind) {
      case "hit":
        return this.hit(e);
      case "jump":
        return this.jump(e.height);
      case "boost":
        if (this.boostLeft <= 0) popups.show("Delfin-Turbo!", this.headPos(), { color: "#7fdcff", size: 56 });
        this.boostLeft = Math.max(this.boostLeft, e.seconds);
        return;
      case "spin":
        return this.startSpin(e.center);
      case "lift":
        boat.leap(LIFT);
        fx.splash(boat.root.position.clone(), 1.6);
        popups.show("Wuuusch!", this.headPos(), { color: "#ffffff", size: 60 });
        return;
      case "find":
        this.say("Tadeo", DIALOGUES.sea_bottle[0].text);
        return;
      case "checkpoint":
        if (e.index <= this.checkpoint.index) return;
        this.save(e.index);
        fx.stars(boat.root.position.clone().add(new THREE.Vector3(5, 2.5, 0)), 12);
        popups.show("Boje! Hier geht's weiter.", this.headPos(), { color: "#ffd23f", size: 44 });
        return;
    }
  }

  /** A bubble over the boat, noted for the test. */
  private say(speaker: string, text: string): void {
    this.remarks.push(text);
    this.d.remark(speaker, text);
  }

  /** Caught by the whirlpool: carried half way round its eye while spinning once around, then thrown out. */
  private startSpin(center: THREE.Vector3): void {
    const p = this.d.boat.root.position;
    const r = Math.max(2.5, Math.hypot(p.x - center.x, p.z - center.z));
    // Reason: round the side that carries the boat on ahead, never back towards where it came from
    const a0 = Math.atan2(p.z - center.z, p.x - center.x);
    const dir = Math.sin(a0) > 0 ? (Math.cos(a0) > 0 ? -1 : 1) : Math.cos(a0) > 0 ? 1 : -1;
    this.spin = { t: 0, cx: center.x, cz: center.z, r, a0, dir, yaw0: this.d.boat.root.rotation.y };
    this.spun = 0;
    this.helm.speed *= 0.5;
  }

  private whirl(dt: number, p: THREE.Vector3): void {
    const sp = this.spin!;
    const boat = this.d.boat;
    sp.t += dt;
    const k = Math.min(sp.t / SPIN_TIME, 1);
    const e = k * k * (3 - 2 * k);
    const a = sp.a0 + e * Math.PI * sp.dir;
    p.x = sp.cx + Math.cos(a) * sp.r * (1 + e * 0.3);
    p.z = sp.cz + Math.sin(a) * sp.r * (1 + e * 0.3);
    this.spun = e * Math.PI * 2;
    boat.root.rotation.y = sp.yaw0 + this.spun * sp.dir;
    boat.vx = sp.dir * 6;
    if (k < 1) return;
    // Thrown out, bow straight ahead again, and shoved off towards the channel's middle
    this.spin = null;
    this.helm.heading = 0;
    boat.root.rotation.y = 0;
    this.shove = Math.sign(trailX(p.z) - p.x) * 7;
    this.say("Tadeo", DIALOGUES.sea_whirlpool[0].text);
  }

  /** Bow-first over a crest: up and away. */
  private jump(height: number): void {
    const { boat, popups, fx } = this.d;
    this.jumps++;
    boat.leap(height);
    fx.splash(boat.bowPos(), 1.4);
    audio.playSfx("sfx_wave", 0.8, 0.9);
    popups.show("Hui!", this.headPos(), { color: "#ffe066", size: 60 });
  }

  /** Something hit the boat: a splash, a plank flies off, and with the last plank the boat fades back to the checkpoint. */
  hit(e: Hit): void {
    if (this.retrying) return;
    const { boat, fx, cam, popups, ui } = this.d;
    const wet = e.what === "swell" || e.what === "jelly";
    this.hits++;
    this.hitsBy[e.what] = (this.hitsBy[e.what] ?? 0) + 1;
    fx.splash(e.at, wet ? 2.0 : 1.3);
    boat.bump(wet ? 1.0 : 0.6);
    this.shove = e.push * 6;
    this.helm.speed *= 0.45;
    cam.shake(0.6);
    audio.playSfx(wet ? "sfx_wave" : "sfx_hit_damage", 0.7);
    popups.show(e.what === "swell" ? "Platsch!" : e.what === "jelly" ? "Wabbel!" : "Bumm!", this.headPos(), { color: "#7fdcff", size: 64 });
    const last = this.planks.hit();
    boat.losePlank();
    ui.setPlanks(this.planks.count);
    if (last) void this.retry();
  }

  /**
   * The shark bumped the boat in the fight: a plank flies off. With the last one the screen fades, the boat is mended
   * where it lies (the fight's start is its checkpoint) and `restart` puts the fight back to its beginning.
   * Resolves true when that happened.
   */
  async fightMiss(restart: () => void): Promise<boolean> {
    const { boat, ui } = this.d;
    const last = this.planks.hit();
    boat.losePlank();
    ui.setPlanks(this.planks.count);
    if (!last) return false;
    this.retrying = true;
    this.retries++;
    await retryFromCheckpoint(this.d.ctx, RETRY_LINES, () => {
      this.planks.refill();
      ui.setPlanks(this.planks.count);
      restart();
    });
    this.retrying = false;
    return true;
  }

  private async retry(): Promise<void> {
    this.retrying = true;
    this.retries++;
    await retryFromCheckpoint(this.d.ctx, RETRY_LINES, () => this.restore());
    this.retrying = false;
  }

  /** Back at the checkpoint: boat mended and level, the starfish count it had there, the section as it was. */
  private restore(): void {
    const { boat, course, things, ui } = this.d;
    const c = this.checkpoint;
    boat.root.position.set(c.x, 0, c.z);
    boat.root.rotation.y = 0;
    boat.settle();
    this.helm.heading = 0;
    this.helm.speed = CRUISE;
    this.shove = 0;
    this.spin = null;
    this.boostLeft = 0;
    this.planks.refill();
    this.starfish = c.starfish;
    course.reset(c.z);
    for (const th of things) th.reset(c.index);
    ui.setPlanks(this.planks.count);
    ui.setVoyage(-c.z / -LANDING_Z, this.starfish);
  }

  private headPos(): THREE.Vector3 {
    return this.d.boat.hero.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 2.2, 0));
  }
}
