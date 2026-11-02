/**
 * The twelve quests of the adventure, in story order. A quest's number (its milestone, which saves keep and `?quest=N`
 * asks for) is its place in this list, so code names quests through `QUEST`. This is data only: what each kind of goal
 * does is in game/Game.ts.
 */

import type { ChallengeName } from "../challenges/types";
import { LANDMARKS, P2, VILLAGE } from "../world/layout";

export type QuestKey = "arrival" | "volcano" | "elder" | "lake" | "cave" | "forest" | "village" | "ogre" | "mountain" | "sea" | "treasure" | "finale";

/** Where a quest's challenge starts on the island. `back` = where Tadeo stands afterwards. */
export interface Gate {
  at: P2;
  challenge: ChallengeName;
  back?: P2;
}

/** What the player does to finish a quest. */
export type QuestGoal =
  /** The opening's cutscene. */
  | { kind: "opening" }
  /** Talk to someone at this place. */
  | { kind: "talk"; at: P2 }
  /** Solve the riddles of the lake's tablets. */
  | { kind: "tablets" }
  /** Win the challenge at the gate. */
  | { kind: "challenge"; gate: Gate }
  /** Talk at the gate, then win its challenge. */
  | { kind: "talkThenChallenge"; gate: Gate }
  /** The last challenge at the gate, then the festival and the end card. */
  | { kind: "finale"; gate: Gate };

export interface QuestDef {
  key: QuestKey;
  name: string;
  /** Shown on the HUD. Chuleta says it too when Tadeo seems lost, except on the opening. */
  hint: string;
  /** Item key rewarded on completion, if any. */
  reward: string | null;
  goal: QuestGoal;
  /** The next quest follows the win with no walk in between: save with Tadeo at `saveAt`, say `overBlack`, and go on. */
  straightOn?: { saveAt: P2; overBlack?: string };
}

export const QUESTS: QuestDef[] = [
  {
    key: "arrival",
    name: "Ankunft",
    hint: "Hör zu und schau dich um!",
    reward: null,
    goal: { kind: "opening" },
  },
  {
    key: "volcano",
    name: "Der Vulkan",
    hint: "Jemand ruft um Hilfe! Schnell zum Vulkan im Westen!",
    reward: null,
    goal: { kind: "challenge", gate: { at: LANDMARKS.volcanoGate, challenge: "volcano" } },
  },
  {
    key: "elder",
    name: "Das Dorf",
    hint: "Paco wartet im Dorf! Geh über die Trittsteine am Fluss.",
    reward: null,
    goal: { kind: "talk", at: VILLAGE.elder },
  },
  {
    key: "lake",
    name: "Der See",
    hint: "Nur der Geist weiß den Weg! Lös die Rätsel am See.",
    reward: null,
    goal: { kind: "tablets" },
  },
  {
    key: "cave",
    name: "Die Höhle",
    hint: "Das Schwert liegt in der Höhle im Nordwesten. Gack!",
    reward: "sword",
    // Reason: the walkable spot in front of the built entrance; the layout point sits on the cliff face
    goal: { kind: "challenge", gate: { at: [-60, -18.5], challenge: "cave" } },
  },
  {
    key: "forest",
    name: "Der Zauberwald",
    hint: "Die Zauberbeeren wachsen im Zauberwald! Er liegt südlich vom See.",
    reward: "berry",
    // Reason: on the lake's side of the arch, so the sword scene can never start behind the thorns
    goal: { kind: "challenge", gate: { at: [-12, 23.5], challenge: "forest", back: [-12, 28.5] } },
  },
  {
    key: "village",
    name: "Das Dorf",
    hint: "Der Schlüssel ist im Dorf. Sprich mit dem Dorfältesten!",
    reward: "key",
    goal: { kind: "talkThenChallenge", gate: { at: VILLAGE.elder, challenge: "village" } },
  },
  {
    key: "ogre",
    name: "Der Oger",
    hint: "Nur der Oger hebt den Felsen! Er sitzt auf der Brücke.",
    reward: null,
    goal: { kind: "challenge", gate: { at: [53.5, 0.5], challenge: "ogre", back: [53.5, 0.5] } },
  },
  {
    key: "mountain",
    name: "Der Berg",
    hint: "Der Hammer liegt ganz oben auf dem Berg. Gack!",
    reward: "hammer",
    // Reason: the walkable spot in front of the built entrance; the layout point sits in the river
    goal: { kind: "challenge", gate: { at: [55.5, -13.5], challenge: "mountain" } },
  },
  {
    key: "sea",
    name: "Der Hai",
    hint: "Dein Boot ist fertig! Es wartet am Steg im Norden.",
    reward: null,
    goal: { kind: "challenge", gate: { at: LANDMARKS.northDockEnd, challenge: "sea" } },
    // Reason: the boat trip ends on the treasure island
    straightOn: { saveAt: LANDMARKS.northDockEnd },
  },
  {
    key: "treasure",
    name: "Die Schatzinsel",
    hint: "Das X wartet! Zurück zum Boot am Steg im Norden.",
    reward: null,
    goal: { kind: "challenge", gate: { at: LANDMARKS.northDockEnd, challenge: "treasure" } },
    // Reason: the eruption sends Tadeo straight back
    straightOn: { saveAt: LANDMARKS.volcanoGate, overBlack: "finale_sail_back" },
  },
  {
    key: "finale",
    name: "Das Herz des Vulkans",
    hint: "Schnell! Das Herz muss zurück auf den alten Stein am Vulkan!",
    reward: null,
    goal: { kind: "finale", gate: { at: LANDMARKS.volcanoGate, challenge: "finale" } },
  },
];

/** The number of each quest, by name. */
export const QUEST = Object.fromEntries(QUESTS.map((q, i) => [q.key, i + 1])) as Record<QuestKey, number>;

/** Where this quest's challenge starts, if it has one. */
export function gateOf(quest: QuestDef): Gate | null {
  return "gate" in quest.goal ? quest.goal.gate : null;
}
