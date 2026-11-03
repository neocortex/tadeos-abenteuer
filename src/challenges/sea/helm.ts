/**
 * The boat's helm: ← → turn the bow and the boat sails where it points, ↑ a
 * little faster, ↓ slower but never to a stop. Outside the channel a gentle
 * current turns the bow back towards the route and carries the boat in, so a
 * child can never get lost out at sea.
 */

import { CHANNEL_HALF, routeX } from "./route";

/** Turning speed (rad/s) and how far the bow may turn from straight ahead. */
const TURN_RATE = 1.3;
const MAX_HEADING = 1.2;
export const CRUISE = 9;
const FAST = 11.5;
/** Reason: holding ↓ must never stop the boat, or a child is stuck at sea. */
export const SLOW = 6;
const BOOST = 14;

export class Helm {
  /** Yaw: 0 = bow towards -z, positive = turned left. */
  heading = 0;
  speed = 0;

  /** `turn`: +1 = ← (left), -1 = → (right). `throttle`: +1 = ↑, -1 = ↓. */
  steer(dt: number, turn: -1 | 0 | 1, throttle: -1 | 0 | 1, boost: boolean): void {
    this.heading = Math.max(-MAX_HEADING, Math.min(MAX_HEADING, this.heading + turn * TURN_RATE * dt));
    const target = boost ? BOOST : throttle > 0 ? FAST : throttle < 0 ? SLOW : CRUISE;
    this.speed += (target - this.speed) * Math.min(dt * 1.2, 1);
  }

  /**
   * Out past the channel's edge, turn the bow back towards the route (harder the further out) and say how far the
   * current carries the boat sideways this frame (`drift`, in metres along x).
   */
  pull(dt: number, x: number, z: number): { offCourse: boolean; drift: number } {
    const off = x - routeX(z);
    const out = Math.abs(off) - CHANNEL_HALF;
    if (out <= 0) return { offCourse: false, drift: 0 };
    // Reason: past ~3 m out the current turns faster than the player can, so nobody sails away for good
    const strength = Math.min(out / 3, 1.6);
    const back = Math.sign(off) * 0.7;
    const step = TURN_RATE * 1.4 * strength * dt;
    this.heading += Math.max(-step, Math.min(step, back - this.heading));
    return { offCourse: true, drift: -Math.sign(off) * Math.min(out, 6) * 0.6 * dt };
  }
}
