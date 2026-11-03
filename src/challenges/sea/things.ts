/**
 * What every obstacle and animal on the voyage has in common: each one is a
 * `SeaThing` that moves itself, looks at the boat and reports what happened
 * as `SeaEvent`s. The voyage only routes the events (a hit costs a plank, a
 * boost speeds the boat up, a spin turns it round, …).
 */

import * as THREE from "three";

/** The boat as the things see it. `heading` is the yaw: 0 = bow towards -z, positive = turned left. */
export interface BoatState {
  x: number;
  z: number;
  heading: number;
  speed: number;
  airborne: boolean;
}

export type SeaEvent =
  /** `push`: which way to shove the boat (-1 left, +1 right). */
  | { kind: "hit"; at: THREE.Vector3; push: number; what: "rock" | "swell" | "jelly" | "barrel" | "islet" }
  | { kind: "boost"; seconds: number }
  | { kind: "jump"; height: number }
  | { kind: "spin"; center: THREE.Vector3 }
  | { kind: "lift" }
  | { kind: "find"; what: "bottle" }
  | { kind: "checkpoint"; index: number };

export interface SeaThing {
  readonly group: THREE.Object3D;
  /** `active` is false outside the sail phase: animate, but report nothing. */
  update(dt: number, t: number, boat: BoatState, active: boolean): SeaEvent[];
  /** Put everything from section `index` on back to its start (a retry from that section's buoy). */
  reset(index: number): void;
}
