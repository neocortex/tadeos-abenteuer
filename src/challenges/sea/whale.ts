/**
 * The whale: a huge friendly blue whale rises beside the trail as the boat
 * comes near, its long back lying out to the side. When the boat passes its
 * head, it blows: the spout lifts the little boat up for a moment. Then it
 * waves its tail and dives.
 */

import * as THREE from "three";
import { audio } from "../../audio/Audio";
import { mat, toonMesh } from "../../characters/parts";
import { Fx } from "../ogre/fx";
import { SECTIONS, routeX } from "./route";
import { BoatState, SeaEvent, SeaThing } from "./things";

/** The whale rises when the boat is this close, and blows when the boat is this close to its blowhole. */
const RISE_AT = 40;
const SPOUT_AT = 6;
/** How far out from its spot beside the trail the whale's head lies. */
const HEAD_OUT = 2.8;

interface Whale {
  section: number;
  root: THREE.Group;
  tail: THREE.Object3D;
  /** Where it lives (x, z, beside the trail); the body lies out from there towards -x (`side` = -1) or +x. */
  x: number;
  z: number;
  side: number;
  /** -1 asleep, then seconds since it began to rise. */
  age: number;
  blown: boolean;
}

function whaleModel(): { root: THREE.Group; tail: THREE.Object3D } {
  const root = new THREE.Group();
  const skin = mat("#3f6fa8", 0.5);
  const belly = mat("#cfe0ee", 0.55);
  // The body runs along +x from the head (at the origin); `root` is turned so it lies away from the trail
  const body = toonMesh(new THREE.CapsuleGeometry(2.1, 9, 8, 20), skin);
  body.rotation.z = Math.PI / 2;
  body.scale.set(0.85, 1, 1);
  body.position.x = 5;
  root.add(body);
  const under = toonMesh(new THREE.CapsuleGeometry(1.7, 7.5, 6, 16), belly, false);
  under.rotation.z = Math.PI / 2;
  under.position.set(4.6, -0.7, 0);
  root.add(under);
  for (const sz of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat("#1b1b1b", 0.3));
    eye.position.set(0.6, 0.2, sz * 1.75);
    root.add(eye);
    const fin = toonMesh(new THREE.ConeGeometry(0.7, 2.4, 4), skin);
    fin.scale.set(1, 1, 0.25);
    fin.rotation.set(sz * 1.2, 0, -0.6);
    fin.position.set(2.8, -1.1, sz * 2.0);
    root.add(fin);
  }
  const tail = new THREE.Group();
  tail.position.x = 11;
  const fluke = toonMesh(new THREE.ConeGeometry(2.2, 1.8, 3), skin);
  fluke.scale.set(0.5, 1, 1.4);
  fluke.rotation.z = -Math.PI / 2;
  fluke.position.x = 0.9;
  tail.add(fluke);
  root.add(tail);
  return { root, tail };
}

export class Whales implements SeaThing {
  readonly group = new THREE.Group();
  private whales: Whale[] = [];

  constructor(private fx: Fx) {
    SECTIONS.forEach((sec, section) => {
      if (!sec.whale) return;
      const [dx, z] = sec.whale;
      const { root, tail } = whaleModel();
      const x = routeX(z) + dx;
      const side = dx <= 0 ? -1 : 1;
      root.rotation.y = side < 0 ? Math.PI : 0;
      root.visible = false;
      this.group.add(root);
      this.whales.push({ section, root, tail, x, z, side, age: -1, blown: false });
    });
  }

  update(dt: number, t: number, boat: BoatState, active: boolean): SeaEvent[] {
    const events: SeaEvent[] = [];
    for (const w of this.whales) {
      if (w.age < 0) {
        if (boat.z - w.z > RISE_AT || boat.z < w.z - 20) continue;
        w.age = 0;
        w.root.visible = true;
      }
      w.age += dt;
      // Rise over 2 s, lie at the surface, then dive after 12 s
      const rise = Math.min(w.age / 2, 1);
      const dive = Math.max(0, (w.age - 12) / 3);
      // Reason: the head sits out to the side of its spot, so the boat sails past it, never into it
      w.root.position.set(w.x + w.side * HEAD_OUT, -2.6 + rise * 1.9 - dive * 4 + Math.sin(t * 0.8) * 0.12, w.z);
      w.root.rotation.z = Math.sin(t * 0.6) * 0.03 - dive * 0.2 * w.side;
      w.tail.rotation.z = Math.sin(t * 1.2) * 0.25 + dive * 0.9;
      w.root.visible = dive < 1;
      // A little spout now and then while it waits
      if (!w.blown && rise >= 1 && Math.random() < dt * 0.8) this.spout(w, 0.5);
      if (!active || w.blown || rise < 1) continue;
      if (Math.hypot(boat.x - this.blowX(w), boat.z - w.z) < SPOUT_AT) {
        w.blown = true;
        this.spout(w, 1.6);
        audio.playSfx("sfx_whale_spout", 0.9);
        events.push({ kind: "lift" });
      }
    }
    return events;
  }

  private spout(w: Whale, power: number): void {
    const at = new THREE.Vector3(this.blowX(w), 1.2, w.z);
    this.fx.puff.emit({ at, count: Math.round(40 * power), speed: [5 * power, 11 * power], dir: new THREE.Vector3(0, 1, 0), spread: 0.18, gravity: 9, drag: 0.4, life: [0.9, 1.6], size: [0.35, 0.15], color: ["#ffffff", "#d9f6ff"], alpha: 0.9, jitter: 0.3 });
    this.fx.puff.emit({ at, count: Math.round(10 * power), speed: [1, 3], dir: new THREE.Vector3(0, 0.6, 0), spread: 1, gravity: 1, drag: 1.5, life: [0.8, 1.3], size: [0.9, 2.4], color: "#ffffff", alpha: 0.6 });
  }

  /** The blowhole, on top of the head just behind the eyes. */
  private blowX(w: Whale): number {
    return w.x + w.side * (HEAD_OUT + 1.2);
  }

  /** The nearest whale's blowhole (for the E2E test). */
  nearest(z: number): [number, number] | null {
    const w = [...this.whales].sort((a, b) => Math.abs(a.z - z) - Math.abs(b.z - z))[0];
    return w ? [this.blowX(w), w.z] : null;
  }

  reset(index: number): void {
    for (const w of this.whales) {
      if (w.section < index) continue;
      w.age = -1;
      w.blown = false;
      w.root.visible = false;
    }
  }
}
