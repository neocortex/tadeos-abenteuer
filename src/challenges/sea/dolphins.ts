/**
 * Dolphins: a pair surfaces ahead of the boat and leaps along the starfish
 * trail for a while. Sailing close behind the leader, in its wake, gives the
 * boat a speed boost; then they dive away.
 */

import * as THREE from "three";
import { audio } from "../../audio/Audio";
import { mat, toonMesh } from "../../characters/parts";
import { Fx } from "../ogre/fx";
import { SECTIONS, routeX, trailX } from "./route";
import { BoatState, SeaEvent, SeaThing } from "./things";

/** Dolphins come up when the boat is this close to where they live, and stay this long. */
const WAKE_UP = 45;
const STAY = 22;
/** How far ahead of the boat the leader surfaces, how close it lets the boat come, and how fast it swims at least. */
const LEAD = 7;
const CLOSEST = 4;
const SWIM = 9.6;
/** Following within this box behind the leader for `FOLLOW` seconds starts a boost of `BOOST` seconds. */
const BEHIND = 9;
const SIDE = 2.6;
const FOLLOW = 0.8;
const BOOST = 3;

interface Dolphin {
  root: THREE.Group;
  tail: THREE.Object3D;
  /** Offset from the leader (x, z) and leap phase. */
  ox: number;
  oz: number;
  phase: number;
}

interface Pod {
  section: number;
  z0: number;
  x0: number;
  /** -1 asleep, then seconds since it surfaced. */
  age: number;
  /** Where the leader is. */
  x: number;
  z: number;
  following: number;
  members: Dolphin[];
}

function dolphinModel(): { root: THREE.Group; tail: THREE.Object3D } {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const skin = mat("#6d8fb3", 0.45);
  const belly = mat("#dfe9f2", 0.5);
  const torso = toonMesh(new THREE.CapsuleGeometry(0.42, 1.5, 6, 14), skin);
  torso.rotation.x = Math.PI / 2;
  torso.scale.set(1, 1, 0.85);
  body.add(torso);
  const under = toonMesh(new THREE.CapsuleGeometry(0.34, 1.2, 6, 12), belly, false);
  under.rotation.x = Math.PI / 2;
  under.position.set(0, -0.14, 0.1);
  body.add(under);
  const beak = toonMesh(new THREE.CapsuleGeometry(0.13, 0.4, 4, 8), skin);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.08, 1.25);
  body.add(beak);
  const fin = toonMesh(new THREE.ConeGeometry(0.28, 0.6, 4), skin);
  fin.scale.set(0.35, 1, 1);
  fin.rotation.x = -0.5;
  fin.position.set(0, 0.5, -0.1);
  body.add(fin);
  for (const sx of [-1, 1]) {
    const flipper = toonMesh(new THREE.ConeGeometry(0.16, 0.5, 4), skin);
    flipper.scale.set(0.3, 1, 1);
    flipper.rotation.set(0.6, 0, sx * 1.9);
    flipper.position.set(sx * 0.38, -0.22, 0.45);
    body.add(flipper);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat("#1b1b1b", 0.3));
    eye.position.set(sx * 0.27, 0.08, 0.95);
    body.add(eye);
  }
  const tail = new THREE.Group();
  tail.position.z = -1.0;
  const fluke = toonMesh(new THREE.ConeGeometry(0.5, 0.45, 3), skin);
  fluke.scale.set(1.3, 1, 0.25);
  fluke.rotation.x = -Math.PI / 2;
  fluke.position.z = -0.25;
  tail.add(fluke);
  body.add(tail);
  return { root, tail };
}

export class Dolphins implements SeaThing {
  readonly group = new THREE.Group();
  private pods: Pod[] = [];
  private foamTimer = 0;

  constructor(private fx: Fx) {
    SECTIONS.forEach((sec, section) => {
      for (const [dx, z] of sec.dolphins ?? []) {
        const members = [
          [0, 0, 0],
          [2.6, 3.0, 1.4],
        ].map(([ox, oz, phase]) => {
          const m = dolphinModel();
          this.group.add(m.root);
          m.root.visible = false;
          return { ...m, ox, oz, phase };
        });
        this.pods.push({ section, z0: z, x0: routeX(z) + dx, age: -1, x: 0, z: 0, following: 0, members });
      }
    });
  }

  update(dt: number, t: number, boat: BoatState, active: boolean): SeaEvent[] {
    const events: SeaEvent[] = [];
    this.foamTimer -= dt;
    const foam = this.foamTimer <= 0;
    if (foam) this.foamTimer = 0.06;
    for (const pod of this.pods) {
      if (pod.age < 0) {
        if (boat.z - pod.z0 > WAKE_UP || boat.z < pod.z0 - 10) continue;
        // Surface ahead of the boat, on the trail
        pod.age = 0;
        pod.z = Math.min(pod.z0, boat.z - LEAD);
        pod.x = pod.x0;
        audio.playSfx("sfx_dolphin", 0.8);
      }
      pod.age += dt;
      const leaving = pod.age > STAY;
      // Reason: they keep their lead even when the boat speeds up, so the boost always has a wake to ride
      const lead = pod.z - boat.z;
      const speed = Math.max(SWIM, lead > -CLOSEST ? boat.speed + 3 : 0) * (leaving ? 1.4 : 1);
      pod.z -= speed * dt;
      pod.x += (trailX(pod.z) - pod.x) * Math.min(dt * 1.5, 1);
      const sink = leaving ? Math.min((pod.age - STAY) * 0.8, 3) : 0;
      for (const d of pod.members) {
        const x = pod.x + d.ox;
        const z = pod.z + d.oz;
        // Leap: out of the water for half of each cycle
        const k = (pod.age * 0.9 + d.phase) % 2;
        const up = k < 1 ? Math.sin(k * Math.PI) : 0;
        const y = -0.55 + up * 1.7 - (k < 1 ? 0 : 0.25) - sink;
        d.root.position.set(x, y, z);
        d.root.rotation.set(k < 1 ? Math.cos(k * Math.PI) * 0.7 : 0, Math.PI, 0);
        d.tail.rotation.x = Math.sin(t * 9 + d.phase) * 0.35;
        d.root.visible = sink < 2.9;
        if (foam && Math.abs(y) < 0.5) this.fx.puff.emit({ at: new THREE.Vector3(x, 0.15, z), count: 2, speed: [1, 2.5], dir: new THREE.Vector3(0, 1, 0), spread: 0.7, gravity: 8, drag: 0.8, life: [0.4, 0.7], size: [0.25, 0.1], color: "#ffffff", alpha: 0.85 });
      }
      if (leaving || !active) {
        pod.following = 0;
        continue;
      }
      const behind = boat.z - pod.z;
      if (behind > 0 && behind < BEHIND && Math.abs(boat.x - pod.x) < SIDE) {
        pod.following += dt;
        if (pod.following >= FOLLOW) {
          pod.following = -BOOST;
          events.push({ kind: "boost", seconds: BOOST });
        }
      } else if (pod.following > 0) pod.following = 0;
      else pod.following = Math.min(pod.following + dt, 0);
    }
    return events;
  }

  /** Where the nearest swimming leader is (for the E2E test). */
  leader(z: number): [number, number] | null {
    const pod = this.pods.filter((p) => p.age >= 0 && p.age < STAY).sort((a, b) => Math.abs(a.z - z) - Math.abs(b.z - z))[0];
    return pod ? [pod.x, pod.z] : null;
  }

  reset(index: number): void {
    for (const pod of this.pods) {
      if (pod.section < index) continue;
      pod.age = -1;
      pod.following = 0;
      for (const d of pod.members) d.root.visible = false;
    }
  }
}
