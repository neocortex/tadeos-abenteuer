/**
 * The shark's fin, seen on the way: once in a few sections a grey dorsal fin
 * cuts across the water ahead of the boat with a foam trail, and sinks away.
 * It touches nothing; it only tells that the shark is out there.
 */

import * as THREE from "three";
import { mat, toonMesh } from "../../characters/parts";
import { Fx } from "../ogre/fx";
import { SECTIONS, routeX } from "./route";
import { BoatState, SeaEvent, SeaThing } from "./things";

/** The fin shows when the boat is this far before its spot, crossing this far ahead of the boat. */
const SHOW_AT = 45;
const AHEAD = 25;
const CROSS_TIME = 4.5;

interface Sighting {
  section: number;
  x: number;
  z: number;
  /** -1 not yet, then seconds since it showed; it shows once per section run. */
  age: number;
  /** Where it crosses (z) and which way (+1 = towards +x). */
  crossZ: number;
  dir: number;
}

export class Fin implements SeaThing {
  readonly group = new THREE.Group();
  /** Sections the fin has shown in (for the E2E test). */
  readonly seen = new Set<number>();
  private fin: THREE.Mesh;
  private sightings: Sighting[] = [];
  private foamTimer = 0;

  constructor(private fx: Fx) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.8, 0);
    shape.quadraticCurveTo(-0.2, 0.9, 0.35, 1.6);
    shape.quadraticCurveTo(0.35, 0.7, 0.8, 0);
    shape.lineTo(-0.8, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 });
    geo.translate(0, 0, -0.07);
    this.fin = toonMesh(geo, mat("#5f7487", 0.5));
    this.fin.visible = false;
    this.group.add(this.fin);
    this.group.name = "sharkFin";
    SECTIONS.forEach((sec, section) => {
      if (!sec.fin) return;
      const [dx, z] = sec.fin;
      this.sightings.push({ section, x: routeX(z) + dx, z, age: -1, crossZ: z, dir: dx > 0 ? -1 : 1 });
    });
  }

  update(dt: number, _t: number, boat: BoatState): SeaEvent[] {
    this.fin.visible = false;
    for (const s of this.sightings) {
      if (s.age < 0) {
        if (boat.z - s.z > SHOW_AT || boat.z < s.z) continue;
        s.age = 0;
        s.crossZ = boat.z - AHEAD;
      }
      if (s.age > CROSS_TIME) continue;
      s.age += dt;
      const k = s.age / CROSS_TIME;
      // From its side of the channel across to the other, rising out at the start and sinking at the end
      const x = s.x + s.dir * k * Math.abs(s.x - routeX(s.z)) * 2;
      const y = -1.4 + Math.min(k * 5, 1) * 1.3 - Math.max(0, k - 0.8) * 6;
      this.fin.position.set(x, y, s.crossZ);
      this.fin.rotation.y = 0;
      this.fin.scale.x = s.dir;
      this.fin.visible = true;
      this.seen.add(s.section);
      this.foamTimer -= dt;
      if (this.foamTimer <= 0 && y > -0.6) {
        this.foamTimer = 0.04;
        this.fx.puff.emit({ at: new THREE.Vector3(x, 0.15, s.crossZ), count: 2, speed: [0.6, 1.6], dir: new THREE.Vector3(0, 1, 0), spread: 1, gravity: 4, drag: 1.5, life: [0.5, 0.9], size: [0.3, 0.7], color: "#ffffff", alpha: 0.8 });
      }
    }
    return [];
  }

  reset(index: number): void {
    for (const s of this.sightings) if (s.section >= index) s.age = -1;
  }
}
