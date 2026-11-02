/**
 * GameProbe — what an E2E test may read and do. Tests are plain JavaScript, so they reach it through `window.probe`;
 * keeping everything they need behind this one typed interface makes a rename inside the game fail the type-check here.
 */

import * as THREE from "three";
import { Shot } from "../core/CameraRig";
import { P2 } from "../world/layout";

/** A goal Tadeo can walk to now. */
export interface ProbeGoal {
  at: P2;
  radius: number;
  verb: string;
}

export interface GameProbe {
  /** The number of the current quest. */
  readonly milestone: number;
  /** True while a cutscene, conversation or challenge owns the controls. */
  readonly busy: boolean;
  /** The open goals. */
  goals(): ProbeGoal[];
  /** Teleport Tadeo and bring the camera and Chuleta along. */
  place(x: number, z: number, facing?: number): void;
  /** Complete the current quest as a win does. */
  advance(): Promise<void>;
  /** Play this quest's challenge with the controls held, as walking to its gate does. */
  playQuest(milestone: number): Promise<void>;
  /** Take the controls away from Tadeo, or give them back. */
  holdControls(hold: boolean): void;
  /** Save the game with Tadeo at this spot. */
  save(at: P2): void;
  readonly chuleta: { position: THREE.Vector3; visible: boolean; line: string | null };
  /** The running cinematic, or null when the camera follows Tadeo. */
  readonly cinematic: { time: number; shotAt(t: number): Shot } | null;
}
