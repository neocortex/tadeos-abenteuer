/**
 * Drifting things: old barrels that start floating across the route when the
 * boat comes near (a bump costs a plank), and one message in a bottle bobbing
 * off to the side of the arches, a small find with a line from Tadeo.
 */

import * as THREE from "three";
import { audio } from "../../audio/Audio";
import { mat, toonMesh } from "../../characters/parts";
import { Fx } from "../ogre/fx";
import { seaHeight } from "./ocean";
import { SECTIONS, routeX } from "./route";
import { BoatState, SeaEvent, SeaThing, hullDistance } from "./things";

/** Barrels start drifting when the boat is this close. */
const WAKE_UP = 55;
const BARREL_TOUCH = 1.6;
const BOTTLE_TOUCH = 2.0;

interface Barrel {
  section: number;
  root: THREE.Group;
  x0: number;
  z: number;
  vx: number;
  x: number;
  moving: boolean;
  /** Knocked away after a bump: flies off and sinks. */
  knocked: number;
}

function barrelModel(): THREE.Group {
  const root = new THREE.Group();
  const body = toonMesh(new THREE.CylinderGeometry(0.62, 0.62, 1.5, 14), mat("#a8703f", 0.75));
  // Reason: barrels float on their side, rolling as they drift
  body.rotation.z = Math.PI / 2;
  root.add(body);
  for (const x of [-0.5, 0, 0.5]) {
    const hoop = toonMesh(new THREE.TorusGeometry(0.64, 0.05, 5, 18), mat("#4c4a4f", 0.5), false);
    hoop.rotation.y = Math.PI / 2;
    hoop.position.x = x;
    root.add(hoop);
  }
  return root;
}

function bottleModel(): THREE.Group {
  const root = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: "#8fe3c8", roughness: 0.15, transparent: true, opacity: 0.7, emissive: new THREE.Color("#5fd6b0"), emissiveIntensity: 0.35 });
  const body = toonMesh(new THREE.CapsuleGeometry(0.26, 0.6, 4, 12), glass);
  body.userData.ownMaterial = true;
  body.rotation.z = Math.PI / 2 - 0.3;
  root.add(body);
  const neck = toonMesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 8), glass);
  neck.position.set(0.55, 0.17, 0);
  neck.rotation.z = Math.PI / 2 - 0.3;
  root.add(neck);
  const cork = toonMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 8), mat("#c9955a", 0.8));
  cork.position.set(0.72, 0.22, 0);
  cork.rotation.z = Math.PI / 2 - 0.3;
  root.add(cork);
  const note = toonMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 8), mat("#fff3d1", 0.7, 0.3), false);
  note.rotation.z = Math.PI / 2 - 0.3;
  root.add(note);
  return root;
}

export class Drift implements SeaThing {
  readonly group = new THREE.Group();
  /** The bottle has been found (it stays found, so its line is said once). */
  bottleFound = false;
  private barrels: Barrel[] = [];
  private bottle: { root: THREE.Group; x: number; z: number } | null = null;

  constructor(private fx: Fx) {
    SECTIONS.forEach((sec, section) => {
      for (const [dx, z, vx] of sec.barrels ?? []) {
        const root = barrelModel();
        this.group.add(root);
        const x0 = routeX(z) + dx;
        this.barrels.push({ section, root, x0, z, vx, x: x0, moving: false, knocked: -1 });
      }
      if (sec.bottle) {
        const [dx, z] = sec.bottle;
        const root = bottleModel();
        this.group.add(root);
        this.bottle = { root, x: routeX(z) + dx, z };
      }
    });
  }

  update(dt: number, t: number, boat: BoatState, active: boolean): SeaEvent[] {
    const events: SeaEvent[] = [];
    for (const b of this.barrels) {
      const far = Math.abs(b.z - boat.z) > 250;
      b.root.visible = !far && b.knocked < 2;
      if (far) continue;
      if (!b.moving && boat.z - b.z < WAKE_UP) b.moving = true;
      if (b.moving && b.knocked < 0) b.x += b.vx * dt;
      const sea = seaHeight(b.x, b.z, t);
      if (b.knocked >= 0) {
        // Knocked away: it bounces off and sinks out of sight
        b.knocked += dt;
        b.root.position.set(b.x + Math.sign(b.vx || 1) * b.knocked * 3, sea - b.knocked * 0.9, b.z - b.knocked * 2);
      } else b.root.position.set(b.x, sea + 0.05, b.z);
      b.root.rotation.x = b.x * 0.9;
      b.root.rotation.z = Math.sin(t * 1.4 + b.z) * 0.1;
      if (!active || b.knocked >= 0) continue;
      if (hullDistance(boat, b.x, b.z) < BARREL_TOUCH) {
        b.knocked = 0;
        events.push({ kind: "hit", at: new THREE.Vector3(b.x, 0.8, b.z), push: boat.x >= b.x ? 1 : -1, what: "barrel" });
      }
    }
    const bottle = this.bottle;
    if (bottle && !this.bottleFound) {
      bottle.root.position.set(bottle.x, seaHeight(bottle.x, bottle.z, t) + 0.1, bottle.z);
      bottle.root.rotation.y = t * 0.6;
      bottle.root.rotation.x = Math.sin(t * 2.1) * 0.2;
      if (Math.random() < dt * 3) this.fx.glow.emit({ at: bottle.root.position.clone().add(new THREE.Vector3(0, 0.4, 0)), count: 1, speed: [0.2, 0.6], dir: new THREE.Vector3(0, 1, 0), life: [0.5, 0.9], size: [0.35, 0.05], color: "#fff4b0", intensity: 2, shape: 1 });
      if (active && hullDistance(boat, bottle.x, bottle.z) < BOTTLE_TOUCH) {
        this.bottleFound = true;
        bottle.root.visible = false;
        this.fx.stars(bottle.root.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 14);
        audio.playSfx("sfx_item_get", 0.7);
        events.push({ kind: "find", what: "bottle" });
      }
    }
    return events;
  }

  /** The nearest barrel ahead that can still be bumped, and the bottle (for the E2E test). */
  barrelAhead(z: number): [number, number] | null {
    const b = this.barrels.filter((k) => k.z < z - 3 && k.knocked < 0).sort((a, c) => c.z - a.z)[0];
    return b ? [b.x, b.z] : null;
  }

  get bottleAt(): [number, number] | null {
    return this.bottle && !this.bottleFound ? [this.bottle.x, this.bottle.z] : null;
  }

  reset(index: number): void {
    for (const b of this.barrels) {
      if (b.section < index) continue;
      b.x = b.x0;
      b.moving = false;
      b.knocked = -1;
    }
  }
}
