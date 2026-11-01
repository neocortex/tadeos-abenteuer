/**
 * Where the camera stands while Tadeo talks to someone: to the side of the two of them, on a spot from which nothing
 * solid stands in the picture. scripts/e2e/talk.mjs measures the result in pixels from everywhere Tadeo can stand.
 */

import * as THREE from "three";
import { Shot } from "../core/CameraRig";
import { Colliders } from "../world/Colliders";

/** How far from the two the camera stands. Closer in only when nothing further out is free: there less fits between. */
const DISTANCES = [5.6, 4.6];
const HEIGHT = 2.4;
const LOOK_HEIGHT = 1.1;
/** Radians around the two speakers, tried in this order. More than this and one of them hides the other. */
const TURNS = [0, 0.4, -0.4, 0.8, -0.8];
/** Half the picture's width in radians, for a window a bit narrower than 16:9. */
const VIEW_HALF = 0.5;
const VIEW_RAYS = 5;
const RAY_STEP = 0.5;
/** Nothing this close to the speakers' depth is counted: it stands beside them or behind them, not in front. */
const NEAR_SPEAKERS = 0.8;
/** How far from a collider a place in the picture counts as free. Things are wider than their colliders. */
const CLEARANCE = 0.45;
/** The one spoken to stands on their own collider, which never counts. */
const OWN_ROOM = 1;

/** How many sample places in the picture, up to the speakers, have something solid on them. */
function blocked(pos: THREE.Vector3, look: THREE.Vector3, npc: THREE.Vector3, colliders: Colliders): number {
  const towards = Math.atan2(look.x - pos.x, look.z - pos.z);
  const depth = Math.hypot(look.x - pos.x, look.z - pos.z) - NEAR_SPEAKERS;
  let count = 0;
  for (let ray = -VIEW_RAYS; ray <= VIEW_RAYS; ray++) {
    const angle = towards + (ray / VIEW_RAYS) * VIEW_HALF;
    for (let along = 0; along < depth; along += RAY_STEP) {
      const [x, z] = [pos.x + Math.sin(angle) * along, pos.z + Math.cos(angle) * along];
      if (colliders.hits(x, z, CLEARANCE) && Math.hypot(x - npc.x, z - npc.z) > OWN_ROOM) count++;
    }
  }
  return count;
}

/**
 * The shot for a conversation.
 *
 * @param player Where Tadeo stands.
 * @param npc Where the one he talks to stands.
 * @param colliders What stands around on the island.
 * @returns The first shot with a free picture, or the one with the least in the way.
 */
export function talkShot(player: THREE.Vector3, npc: THREE.Vector3, colliders: Colliders): Shot {
  const mid = player.clone().lerp(npc, 0.5);
  const dir = npc.clone().sub(player).setY(0).normalize();
  const side = new THREE.Vector3(dir.z, 0, -dir.x);
  // Reason: on the village's south-west side; with the two north and south of each other one step would otherwise swing the camera round
  if (side.z - side.x * 0.6 < 0) side.negate();

  const look = mid.clone().add(new THREE.Vector3(0, LOOK_HEIGHT, 0));
  let best: Shot = { pos: look, look };
  let least = Infinity;
  for (const distance of DISTANCES) {
    for (const turn of [...TURNS, ...TURNS.map((t) => t + Math.PI)]) {
      const pos = mid.clone().addScaledVector(side.clone().applyAxisAngle(THREE.Object3D.DEFAULT_UP, turn), distance);
      pos.y += HEIGHT;
      const count = blocked(pos, look, npc, colliders);
      if (count === 0) return { pos, look };
      if (count < least) {
        least = count;
        best = { pos, look };
      }
    }
  }
  return best;
}
