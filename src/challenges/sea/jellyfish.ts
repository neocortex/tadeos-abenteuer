/**
 * The jellyfish field: glowing pink jellyfish drifting in slow circles beside
 * the trail, their bells pulsing and tentacles trailing. Touching one wobbles
 * the boat and costs a plank.
 */

import * as THREE from "three";
import { mat, toonMesh } from "../../characters/parts";
import { seaHeight } from "./ocean";
import { SECTIONS, routeX } from "./route";
import { BoatState, SeaEvent, SeaThing, hullDistance } from "./things";

/** How close the boat's centre line comes to a jellyfish before they touch. */
const TOUCH = 1.5;

interface Jelly {
  section: number;
  root: THREE.Group;
  bell: THREE.Mesh;
  cx: number;
  cz: number;
  r: number;
  phase: number;
  x: number;
  z: number;
  touched: boolean;
}

function jellyModel(tint: string): { root: THREE.Group; bell: THREE.Mesh } {
  const root = new THREE.Group();
  const jelly = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.3, transparent: true, opacity: 0.78, emissive: new THREE.Color(tint), emissiveIntensity: 0.45 });
  const bell = toonMesh(new THREE.SphereGeometry(0.9, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), jelly);
  bell.userData.ownMaterial = true;
  root.add(bell);
  const rim = toonMesh(new THREE.TorusGeometry(0.78, 0.09, 6, 18), mat("#ffd0ec", 0.4, 0.5), false);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.05;
  bell.add(rim);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const t = toonMesh(new THREE.CylinderGeometry(0.05, 0.015, 1.4, 5), mat("#ffb3dc", 0.5, 0.4), false);
    t.position.set(Math.cos(a) * 0.45, -0.65, Math.sin(a) * 0.45);
    t.rotation.set(Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2);
    root.add(t);
  }
  // Two friendly dots for eyes, so they read as creatures and not as rocks
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat("#4a1d3a", 0.3));
    eye.position.set(sx * 0.28, 0.45, 0.72);
    bell.add(eye);
  }
  return { root, bell };
}

export class Jellyfish implements SeaThing {
  readonly group = new THREE.Group();
  private jellies: Jelly[] = [];

  constructor() {
    const tints = ["#ff7ac8", "#c99bff", "#ff9ad6"];
    SECTIONS.forEach((sec, section) => {
      (sec.jellies ?? []).forEach(([dx, z, r], i) => {
        const { root, bell } = jellyModel(tints[i % tints.length]);
        this.group.add(root);
        const cx = routeX(z) + dx;
        this.jellies.push({ section, root, bell, cx, cz: z, r, phase: i * 1.7, x: cx, z, touched: false });
      });
    });
    this.group.name = "jellyfish";
  }

  update(_dt: number, t: number, boat: BoatState, active: boolean): SeaEvent[] {
    const events: SeaEvent[] = [];
    for (const j of this.jellies) {
      const far = Math.abs(j.cz - boat.z) > 220;
      j.root.visible = !far;
      if (far) continue;
      // Slow circles, each its own way round
      const a = t * 0.35 * (j.phase % 2 > 1 ? 1 : -1) + j.phase;
      j.x = j.cx + Math.cos(a) * j.r;
      j.z = j.cz + Math.sin(a) * j.r;
      const pulse = Math.sin(t * 3 + j.phase);
      j.root.position.set(j.x, seaHeight(j.x, j.z, t) + 0.15 + pulse * 0.08, j.z);
      j.bell.scale.set(1 + pulse * 0.08, 1 - pulse * 0.1, 1 + pulse * 0.08);
      j.root.rotation.y = -a;
      if (!active || j.touched) continue;
      if (hullDistance(boat, j.x, j.z) < TOUCH) {
        j.touched = true;
        events.push({ kind: "hit", at: new THREE.Vector3(j.x, 1, j.z), push: boat.x >= j.x ? 1 : -1, what: "jelly" });
      }
    }
    return events;
  }

  /** Where the nearest jellyfish ahead is (for the E2E test). */
  ahead(z: number): [number, number] | null {
    const j = this.jellies.filter((k) => k.z < z - 3 && !k.touched).sort((a, b) => b.z - a.z)[0];
    return j ? [j.x, j.z] : null;
  }

  reset(index: number): void {
    for (const j of this.jellies) if (j.section >= index) j.touched = false;
  }
}
