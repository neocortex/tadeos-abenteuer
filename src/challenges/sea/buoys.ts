/**
 * Checkpoint buoys: a red and white float with a little yellow flag and a
 * bell, bobbing beside the trail at the start of every section after the
 * first. Sailing past one saves the place a retry comes back to.
 */

import * as THREE from "three";
import { audio } from "../../audio/Audio";
import { mat, toonMesh } from "../../characters/parts";
import { seaHeight } from "./ocean";
import { SECTIONS, trailX } from "./route";
import { BoatState, SeaEvent, SeaThing } from "./things";

/** How far beside the trail a buoy floats. */
const BESIDE = 5.5;

interface Buoy {
  index: number;
  root: THREE.Group;
  flag: THREE.Mesh;
  x: number;
  z: number;
  passed: boolean;
}

function buoyModel(): { root: THREE.Group; flag: THREE.Mesh } {
  const root = new THREE.Group();
  const red = mat("#e8402e", 0.5);
  const white = mat("#f6f1e6", 0.5);
  // A fat float in red and white bands, tapering to a cage on top
  const bands = [
    [0.95, 1.05, 0.45, red, -0.1],
    [0.85, 0.95, 0.35, white, 0.3],
    [0.6, 0.85, 0.45, red, 0.7],
  ] as const;
  for (const [top, bottom, h, m, y] of bands) {
    const band = toonMesh(new THREE.CylinderGeometry(top, bottom, h, 18), m);
    band.position.y = y;
    root.add(band);
  }
  const pole = toonMesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), mat("#4a3a30", 0.6));
  pole.position.y = 1.8;
  root.add(pole);
  const bell = toonMesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat("#f2c14e", 0.35, 0.15));
  bell.position.y = 1.35;
  root.add(bell);
  const flagGeo = new THREE.PlaneGeometry(0.9, 0.55, 6, 1);
  flagGeo.translate(0.45, 0, 0);
  const flag = toonMesh(flagGeo, new THREE.MeshStandardMaterial({ color: "#ffd23f", roughness: 0.6, side: THREE.DoubleSide }), false);
  flag.position.y = 2.4;
  // Reason: the flag's material is its own (not a shared `mat()`), so the challenge's Bin frees it
  flag.userData.ownMaterial = true;
  root.add(flag);
  return { root, flag };
}

export class Buoys implements SeaThing {
  readonly group = new THREE.Group();
  private buoys: Buoy[] = [];

  constructor() {
    SECTIONS.forEach((sec, index) => {
      if (index === 0) return;
      const { root, flag } = buoyModel();
      const z = sec.startZ;
      const x = trailX(z) + BESIDE;
      root.position.set(x, 0, z);
      this.group.add(root);
      this.buoys.push({ index, root, flag, x, z, passed: false });
    });
    this.group.name = "buoys";
  }

  update(_dt: number, t: number, boat: BoatState, active: boolean): SeaEvent[] {
    const events: SeaEvent[] = [];
    for (const b of this.buoys) {
      const far = Math.abs(b.z - boat.z) > 400;
      b.root.visible = !far;
      if (far) continue;
      b.root.position.y = seaHeight(b.x, b.z, t) - 0.25;
      b.root.rotation.z = Math.sin(t * 1.7 + b.index) * 0.12;
      b.root.rotation.x = Math.sin(t * 1.3 + b.index * 2) * 0.1;
      // The flag flutters
      b.flag.rotation.y = Math.sin(t * 6 + b.index) * 0.35;
      if (active && !b.passed && boat.z < b.z) {
        b.passed = true;
        audio.playSfx("sfx_buoy", 0.8);
        events.push({ kind: "checkpoint", index: b.index });
      }
    }
    return events;
  }

  /** Which buoy the boat passed last (for the E2E test). */
  get lastPassed(): number {
    return this.buoys.filter((b) => b.passed).reduce((m, b) => Math.max(m, b.index), 0);
  }

  reset(index: number): void {
    // Reason: the buoy the retry starts at stays passed, or it would save again on the way off
    for (const b of this.buoys) b.passed = b.index <= index;
  }
}
