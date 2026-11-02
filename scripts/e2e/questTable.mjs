/**
 * The quest table agrees with the challenges and the menu's story points: every story challenge has one gate or
 * belongs to the finale, every quest can be jumped to, and a quest's number is its place in the list.
 * Needs no browser and no running server: Vite loads the game's data modules directly.
 *
 * Run: node scripts/e2e/questTable.mjs
 * Proof: scripts/e2e/out/questTable/summary.json
 */

import { readdirSync } from "node:fs";
import { createServer } from "vite";
import { proof } from "./lib/harness.mjs";

const { check, finish } = proof("questTable");

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "silent" });
const { QUESTS, QUEST, gateOf } = await vite.ssrLoadModule("/src/data/quests.ts");
const { JUMPS } = await vite.ssrLoadModule("/src/data/jumps.ts");
const { SIDE_GAMES } = await vite.ssrLoadModule("/src/game/sideGames.ts");
await vite.close();

const folders = readdirSync("src/challenges", { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== "shared").map((e) => e.name);
const side = SIDE_GAMES.map((s) => s.challenge);
// Reason: the festival has no gate of its own, it follows the finale's challenge
const story = folders.filter((name) => !side.includes(name) && name !== "festival");
const gates = QUESTS.map(gateOf).filter(Boolean).map((g) => g.challenge);

check("there are twelve quests", QUESTS.length === 12, QUESTS.length);
check("quest names in code are unique", new Set(QUESTS.map((q) => q.key)).size === QUESTS.length);
check("a quest's number is its place in the list", QUESTS.every((q, i) => QUEST[q.key] === i + 1));
check("every story challenge has exactly one gate", story.every((name) => gates.filter((g) => g === name).length === 1), story.join(", "));
check("every gate starts a challenge that exists", gates.every((g) => folders.includes(g)), gates.join(", "));
check("no side game has a gate", side.every((name) => !gates.includes(name)), side.join(", "));
check("the last quest is the finale, so the festival follows it", QUESTS.at(-1).goal.kind === "finale" && folders.includes("festival"));
check("every quest has a name and a hint", QUESTS.every((q) => q.name && q.hint));

const jumpTo = (q, i) => {
  const gate = gateOf(q);
  return JUMPS.some((j) => j.query === (gate ? `challenge=${gate.challenge}` : `quest=${i + 1}`));
};
const missing = QUESTS.filter((q, i) => q.goal.kind !== "opening" && !jumpTo(q, i)).map((q) => q.key);
check("every quest but the opening has a story point in the menu", missing.length === 0, missing.join(", "));

const after = (q) => QUESTS[QUESTS.indexOf(q) + 1];
check("a quest that goes straight on has a next quest with a challenge", QUESTS.filter((q) => q.straightOn).every((q) => after(q) && gateOf(after(q))));

finish();
