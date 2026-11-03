/**
 * Sailing the voyage: reads the helm keys, moves the boat where its bow
 * points, lets the current bring it back into the channel, and routes what
 * the course and the things along it report — a hit costs a plank, starfish
 * mend them, and when the last plank goes the boat fades back to the last
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
    if (active) {
      const input = this.d.input();
      const key = (code: string) => (input && !this.d.ctx.ui.dialogue.isOpen && input.isDown(code) ? 1 : 0);
      helm.steer(dt, (key("ArrowLeft") - key("ArrowRight")) as -1 | 0 | 1, (key("ArrowUp") - key("ArrowDown")) as -1 | 0 | 1, false);
    } else {
      // Outside the sail phase the boat steers itself: towards `autoX`, or straight ahead
      helm.speed += (this.cruise - helm.speed) * Math.min(dt * 1.2, 1);
      const want = this.autoX === null ? 0 : THREE.MathUtils.clamp((p.x - this.autoX) * 0.08, -0.5, 0.5);
      helm.heading = lerp(helm.heading, want, Math.min(dt * 2, 1));
    }
    boat.speed = helm.speed;
    p.x += -Math.sin(helm.heading) * helm.speed * dt + this.shove * dt;
    p.z -= Math.cos(helm.heading) * helm.speed * dt;
    this.shove *= Math.max(0, 1 - dt * 3);
    // Reason: `vx` is what the boat leans by; turning right (heading falling) leans it like the old sideways slide did
    boat.vx = lerp(boat.vx, dt > 0 ? ((before - helm.heading) / dt) * 5.4 : 0, Math.min(dt * 6, 1));
    boat.root.rotation.y = helm.heading;
    if (active) this.current(dt, t, p);
    course.keepOut(p);

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
    this.d.remark("Chuleta", DIALOGUES.sea_offcourse[0].text);
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
    if (e.kind === "hit") this.hit(e);
    else if (e.kind === "jump") this.jump(e.height);
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
