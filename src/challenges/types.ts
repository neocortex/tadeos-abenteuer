/**
 * Contract between the game flow and the challenge minigames.
 *
 * Every challenge lives in `src/challenges/<name>/index.ts` and default-exports
 * a `ChallengeFactory`. The game flow fades into the challenge scene, waits for
 * `finished`, then fades back to the island and hands out the quest reward.
 * Challenges play their own dialogues (via `ctx.ui.say`). There is no "Game
 * Over", because the player is seven: mistakes cost something, and too many
 * fade back to the last checkpoint with a kind line (`shared/retry.ts`).
 */

import { Engine, GameScene } from "../core/Engine";
import { GameUI } from "../ui/GameUI";

export interface ChallengeContext {
  engine: Engine;
  ui: GameUI;
  /** Debug start (`&section=N`): begin a challenge that has sections at section N instead of its start. */
  startSection?: number;
}

export interface Challenge extends GameScene {
  /** Resolves once the player has won the challenge. */
  readonly finished: Promise<void>;
}

export type ChallengeFactory = (ctx: ChallengeContext) => Challenge;

/** Quest challenges, followed by the side games villagers offer at any time. */
export type ChallengeName =
  | "volcano"
  | "cave"
  | "forest"
  | "ogre"
  | "village"
  | "mountain"
  | "sea"
  | "treasure"
  | "finale"
  | "festival"
  | "fishing"
  | "hens";
