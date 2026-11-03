/**
 * The people on the jetty: Tadeo sitting at the edge with his rod (casting,
 * pulling, showing off a catch, cheering), Fischer Freddy beside him in his
 * old fishing hat with his own lazily bobbing float, and Chuleta sitting on the
 * mooring post, turning her head, clucking and flapping when it's exciting.
 * Poses are layered on top of the Humanoid's own idle animation each frame.
 */

import * as THREE from "three";
import { Humanoid } from "../../characters/Humanoid";
import { createTadeo, createVillager } from "../../characters/cast";
import { createOutfit } from "../../characters/hats";
import { createChuletaModel } from "../../characters/Chuleta";
import { mat, toonMesh } from "../../characters/parts";
import { DECK, DECK_END, CHULETA_POST } from "./dock";
import { Tackle } from "./tackle";
import { swell } from "./water";
import { rnd, wrapAngle } from "../../world/ambient/spawn";

export type Action = "hold" | "rest" | "windup" | "throw" | "pull" | "yank" | "show" | "cheer" | "wave";

/** Arm/torso targets per action: right arm pitch, left arm pitch, left arm spread, torso lean. */
const POSES: Record<Action, { r: number; l: number; lz: number; lean: number }> = {
  hold: { r: -0.72, l: -0.55, lz: -0.15, lean: 0 },
  // Rod lowered towards the water, so in the talk shots the bobber hangs below everyone's faces
  rest: { r: -0.3, l: -0.5, lz: -0.15, lean: 0 },
  windup: { r: -2.75, l: -0.4, lz: -0.3, lean: -0.12 },
  throw: { r: -0.35, l: -0.7, lz: -0.2, lean: 0.12 },
  pull: { r: -1.05, l: -1.0, lz: -0.05, lean: -0.16 },
  yank: { r: -2.45, l: -1.2, lz: -0.4, lean: -0.22 },
  show: { r: -1.2, l: -1.4, lz: -0.2, lean: -0.05 },
  cheer: { r: -2.6, l: -2.6, lz: -0.9, lean: -0.05 },
  wave: { r: -0.3, l: -2.7, lz: -0.6, lean: 0 },
};

/** Where Tadeo sits (feet over the water, facing the sea). */
export const TADEO_AT = new THREE.Vector3(0.32, DECK - 0.02, DECK_END + 0.3);
/** Where a fresh catch is held up for everyone to see: at head height, between Tadeo and Chuleta. */
export const HOLD_AT = TADEO_AT.clone().add(new THREE.Vector3(0.6, 1.2, -0.5));
const FREDDY_AT = new THREE.Vector3(-0.85, DECK - 0.02, DECK_END + 0.3);
/** Where Freddy's own float bobs. */
const FREDDY_FLOAT = new THREE.Vector3(-3.4, 0, -4.6);


export class Crew {
  readonly group = new THREE.Group();
  readonly tadeo = createTadeo();
  readonly freddy = createVillager(0);
  readonly chuleta = createChuletaModel();
  /** Who is talking right now (dialogue or bubble): their mouth/beak moves. */
  speaker: string | null = null;
  /** Where Tadeo (and Chuleta) look: usually the bobber. */
  readonly lookAt = new THREE.Vector3(0, 0, -6);
  private action: Action = "hold";
  private actionTime = 0;
  private cur = { ...POSES.hold };
  private chuletaFlap = 0;
  private chuletaLook = 0;
  private chuletaLookTarget = 0;
  private chuletaLookTimer = 1;
  private chuletaChatter = 0;
  private freddyCheer = 0;
  private freddyRodTip = new THREE.Object3D();
  private freddyFloat: THREE.Group;
  private freddyLine: THREE.Line;
  private tmp = new THREE.Vector3();

  constructor(tackle: Tackle) {
    const t = this.tadeo;
    t.pose = "sit";
    t.root.position.copy(TADEO_AT);
    t.root.rotation.y = Math.PI;
    t.handR.add(tackle.rod);
    tackle.rod.rotation.set(0.2, 0, 0);

    const j = this.freddy;
    j.pose = "sit";
    j.root.position.copy(FREDDY_AT);
    j.root.rotation.y = Math.PI + 0.3;
    const hat = createOutfit("fishingHat");
    j.head.add(hat);
    // Freddy's bamboo rod with his own float out on the water
    const rod = new THREE.Group();
    const blank = toonMesh(new THREE.CylinderGeometry(0.012, 0.03, 2.3, 6).rotateX(Math.PI / 2), mat("#c9a65a", 0.7));
    blank.position.z = 1.0;
    this.freddyRodTip.position.z = 2.15;
    rod.add(blank, this.freddyRodTip);
    rod.rotation.x = 0.1;
    j.handR.add(rod);
    this.freddyFloat = new THREE.Group();
    const cap = toonMesh(new THREE.SphereGeometry(0.08, 12, 8), mat("#ff8a1a", 0.4, 0.4));
    cap.scale.y = 1.3;
    this.freddyFloat.add(cap);
    this.freddyFloat.position.copy(FREDDY_FLOAT);
    this.freddyLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(Array.from({ length: 16 }, () => new THREE.Vector3())),
      new THREE.LineBasicMaterial({ color: 0xf0ece0, transparent: true, opacity: 0.75 }),
    );
    this.freddyLine.frustumCulled = false;

    this.chuleta.root.scale.setScalar(0.7);
    this.chuleta.root.position.copy(CHULETA_POST);
    this.chuleta.root.rotation.y = Math.PI - 0.5;

    this.group.add(t.root, j.root, this.chuleta.root, this.freddyFloat, this.freddyLine);
  }

  /** Start a rod action (casting, pulling, showing a fish, cheering). */
  act(a: Action): void {
    this.action = a;
    this.actionTime = 0;
  }

  /** Chuleta flaps and hops for a moment. */
  exciteChuleta(seconds = 1.6): void {
    if (this.chuletaFlap <= 0) this.chuleta.kick(0.6);
    this.chuletaFlap = seconds;
  }

  /** Freddy throws his arms up for a moment. */
  cheerFreddy(seconds = 1.4): void {
    this.freddyCheer = seconds;
  }

  update(dt: number, time: number): void {
    this.actionTime += dt;
    // Reason: wind-up and throw are quick one-shots that settle back into holding the rod
    if (this.action === "throw" && this.actionTime > 0.45) this.act("hold");
    const target = POSES[this.action];
    const speed = this.action === "throw" || this.action === "yank" ? 22 : this.action === "windup" ? 9 : 6;
    const k = 1 - Math.exp(-dt * speed);
    for (const key of ["r", "l", "lz", "lean"] as const) this.cur[key] += (target[key] - this.cur[key]) * k;

    const t = this.tadeo;
    t.pose = this.speaker === "Tadeo" ? "talk" : "sit";
    t.update(dt, { speed: 0, grounded: true, vy: 0 });
    this.sit(t);
    const bounce = this.action === "cheer" ? Math.abs(Math.sin(time * 9)) * 0.12 : 0;
    t.body.position.y = -0.3 + bounce;
    t.armR.rotation.set(this.cur.r + (this.action === "cheer" ? Math.sin(time * 12) * 0.2 : 0), 0, 0.12);
    t.armL.rotation.set(this.cur.l, 0, this.cur.lz + (this.action === "wave" ? Math.sin(time * 10) * 0.35 : 0));
    t.torso.rotation.x = this.cur.lean;
    this.lookTowards(t, this.lookAt, this.speaker === "Tadeo" ? Math.sin(time * 9) * 0.06 : 0);

    const j = this.freddy;
    this.freddyCheer = Math.max(0, this.freddyCheer - dt);
    j.pose = this.speaker === "Fischer Freddy" ? "talk" : "sit";
    j.update(dt, { speed: 0, grounded: true, vy: 0 });
    this.sit(j);
    if (this.freddyCheer > 0) {
      j.armR.rotation.set(-2.5 + Math.sin(time * 11) * 0.2, 0, 0.3);
      j.armL.rotation.set(-2.5 - Math.sin(time * 11) * 0.2, 0, -0.3);
      j.body.position.y = -0.3 + Math.abs(Math.sin(time * 8)) * 0.08;
    } else {
      j.armR.rotation.set(-0.8 + Math.sin(time * 0.7) * 0.04, 0, 0.1);
      if (this.speaker !== "Fischer Freddy") j.armL.rotation.set(-0.5, 0, -0.15);
    }
    // Freddy glances over to Tadeo while either of them talks, otherwise watches his float
    const watch = this.speaker ? this.tmp.copy(this.tadeo.root.position).setY(DECK + 0.8) : FREDDY_FLOAT;
    this.lookTowards(j, watch, this.speaker === "Fischer Freddy" ? Math.sin(time * 9) * 0.06 : 0);

    this.updateFreddyFloat(time);
    this.updateChuleta(dt, time);
  }

  /** Sit on the deck edge: legs forward over the water, a little lower in the hips. */
  private sit(h: Humanoid): void {
    h.legL.rotation.x = -1.45;
    h.legR.rotation.x = -1.35;
    h.body.position.y = -0.3;
  }

  /** Turn the head (within limits) towards a world point; `nod` adds to the pitch (talking). */
  private lookTowards(h: Humanoid, at: THREE.Vector3, nod: number): void {
    const p = h.root.position;
    const yaw = Math.atan2(at.x - p.x, at.z - p.z) - h.root.rotation.y;
    const rel = wrapAngle(yaw);
    h.head.rotation.y = THREE.MathUtils.clamp(rel, -1.0, 1.0);
    const down = Math.atan2(p.y + 1.3 - at.y, Math.hypot(at.x - p.x, at.z - p.z));
    h.head.rotation.x = THREE.MathUtils.clamp(down * 0.6, -0.3, 0.45) + nod;
  }

  private updateFreddyFloat(time: number): void {
    const f = this.freddyFloat.position;
    f.y = swell(f.x, f.z, time) + Math.max(0, Math.sin(time * 0.9) - 0.96) * -1.2;
    this.freddyRodTip.updateWorldMatrix(true, false);
    const a = this.freddyRodTip.getWorldPosition(this.tmp);
    const pos = this.freddyLine.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const k = i / (pos.count - 1);
      pos.setXYZ(i, a.x + (f.x - a.x) * k, a.y + (f.y + 0.08 - a.y) * k - Math.sin(k * Math.PI) * 0.35, a.z + (f.z - a.z) * k);
    }
    pos.needsUpdate = true;
  }

  private updateChuleta(dt: number, time: number): void {
    const m = this.chuleta;
    this.chuletaFlap = Math.max(0, this.chuletaFlap - dt);
    const flapping = this.chuletaFlap > 0;
    // Hops up and down on the post with her wings going when it's exciting
    m.root.position.y = CHULETA_POST.y + (flapping ? Math.abs(Math.sin(time * 9)) * 0.12 : 0);
    // Face the action (the bobber) with the occasional curious head turn
    const want = Math.atan2(this.lookAt.x - CHULETA_POST.x, this.lookAt.z - CHULETA_POST.z);
    let d = want - m.root.rotation.y;
    d = wrapAngle(d);
    m.root.rotation.y += d * Math.min(dt * 3, 1);
    this.chuletaLookTimer -= dt;
    if (this.chuletaLookTimer < 0) {
      this.chuletaLookTarget = (Math.random() - 0.5) * 1.2;
      this.chuletaLookTimer = rnd(0.8, 2.6);
    }
    this.chuletaLook += (this.chuletaLookTarget - this.chuletaLook) * Math.min(dt * 10, 1);
    if (this.speaker === "Chuleta") {
      this.chuletaChatter -= dt;
      if (this.chuletaChatter < 0) {
        m.cluck(0.09);
        this.chuletaChatter = 0.18;
      }
    }
    m.update(dt, { speed: 0, flap: flapping ? 1 : 0, peck: 0, sit: flapping ? 0 : 1, pant: false, look: this.chuletaLook, air: flapping });
  }
}
