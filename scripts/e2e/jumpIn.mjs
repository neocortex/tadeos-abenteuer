/**
 * E2E: a game started in the middle with `?quest=N` or `?challenge=<name>` goes on with the story.
 *
 * After each jumped-to quest Tadeo must be back on the island with the next quest open and the arrow keys
 * working. Two runs go further and follow the story from the forest all the way to the end card.
 *
 * What comes after a challenge is under test here, not the challenge: each one is ended by resolving its
 * `finished` promise, which is what a win does, and every other step uses real key presses. Reaching a goal
 * uses `probe.place` instead of walking. Quests 3 and 4 are left out: `island.mjs` plays them through.
 *
 * Usage: node scripts/e2e/jumpIn.mjs [baseUrl]
 * Output: scripts/e2e/out/jumpIn/{*.png, summary.json, console.log}
 */

import { writeFileSync } from "node:fs";
import { BASE, launch, proof } from "./lib/harness.mjs";

const { out: OUT, check, finish } = proof("jumpIn");
const { browser, page, errors, logs } = await launch();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const state = () =>
  page.evaluate(() => {
    const g = window.game;
    const e = window.engine;
    return {
      onIsland: e.scene === g.island,
      switching: e.isSwitching,
      busy: window.probe.busy,
      milestone: window.probe.milestone,
      dialogue: !!document.querySelector(".dialogue.open"),
      mapCard: !!document.querySelector(".map-card"),
      endCard: !!document.querySelector(".endcard"),
    };
  });

/** Clear dialogues with Space and end any challenge on screen, until `done` holds. */
async function playUntil(done, timeoutMs = 90000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const s = await state();
    if (done(s)) return s;
    if (s.dialogue || s.mapCard) {
      await page.keyboard.press("Space");
      await wait(150);
    } else if (!s.onIsland && !s.switching) {
      // Reason: the intro comes first, so the challenge ends the way a win does and not under its own opening lines
      await wait(1200);
      if (!(await state()).dialogue) {
        await page.evaluate(() => {
          const scene = window.engine.scene;
          (scene.resolveFinished ?? scene.resolve)?.call(scene);
        });
      }
    } else {
      await wait(100);
    }
  }
  return null;
}

const free = (s) => s.onIsland && !s.switching && !s.dialogue && !s.mapCard && !s.busy;

/** Tadeo moves when the arrow keys are held. Tries both ways, as one may be blocked where he stands. */
async function tadeoWalks() {
  const at = () => page.evaluate(() => window.game.island.player.position.toArray());
  for (const key of ["ArrowUp", "ArrowDown"]) {
    const a = await at();
    await page.keyboard.down(key);
    await wait(700);
    await page.keyboard.up(key);
    const b = await at();
    if (Math.hypot(b[0] - a[0], b[2] - a[2]) > 0.3) return true;
  }
  return false;
}

/** Go to the goal of the current quest and press Space there. */
async function startNextQuest() {
  await page.evaluate(() => {
    const [goal] = window.probe.goals();
    window.probe.place(goal.at[0], goal.at[1]);
  });
  await wait(500);
  await page.keyboard.press("Space");
  await wait(300);
}

const open = async (query) => {
  await page.goto(`${BASE}/?${query}`);
  await page.waitForFunction(() => window.engine && window.game?.island, null, { timeout: 30000 });
};

// A fresh browser state per start, so a save from the run before plays no part
const clearSave = () => page.evaluate(() => localStorage.clear());

// ── ?challenge=<name>: back on the island, the next quest open ─────────────────
for (const [name, quest] of [["volcano", 2], ["cave", 5], ["forest", 6], ["village", 7], ["ogre", 8], ["mountain", 9]]) {
  await open(`challenge=${name}`);
  await clearSave();
  const s = await playUntil((x) => x.milestone === quest + 1 && free(x), 60000);
  if (!s) {
    const stuck = await state();
    check(`?challenge=${name} goes on to quest ${quest + 1}`, false, JSON.stringify(stuck));
    await page.screenshot({ path: `${OUT}/stuck-challenge-${name}.png` });
    continue;
  }
  check(`?challenge=${name} goes on to quest ${quest + 1}`, true);
  check(`?challenge=${name}: the arrow keys move Tadeo`, await tadeoWalks());
  await page.screenshot({ path: `${OUT}/after-challenge-${name}.png` });
}

// ── ?quest=N: the quest plays from the island, then the next one opens ─────────
for (const quest of [2, 5, 6, 7, 8, 9]) {
  await open(`quest=${quest}`);
  await clearSave();
  await page.waitForFunction(() => window.engine.scene === window.game.island && !window.probe.busy, null, { timeout: 30000 });
  await startNextQuest();
  const s = await playUntil((x) => x.milestone === quest + 1 && free(x), 60000);
  if (!s) {
    const stuck = await state();
    check(`?quest=${quest} goes on to quest ${quest + 1}`, false, JSON.stringify(stuck));
    await page.screenshot({ path: `${OUT}/stuck-quest-${quest}.png` });
    continue;
  }
  check(`?quest=${quest} goes on to quest ${quest + 1}`, true);
  check(`?quest=${quest}: the arrow keys move Tadeo`, await tadeoWalks());
}

// ── From the forest to the end card ────────────────────────────────────────────
for (const query of ["challenge=forest", "quest=6"]) {
  await open(query);
  await clearSave();
  if (query.startsWith("quest")) {
    await page.waitForFunction(() => window.engine.scene === window.game.island && !window.probe.busy, null, { timeout: 30000 });
    await startNextQuest();
  }
  const reached = [];
  let ended = false;
  for (let step = 0; step < 12 && !ended; step++) {
    const s = await playUntil((x) => x.endCard || free(x), 90000);
    if (!s) break;
    if (s.endCard) {
      ended = true;
      break;
    }
    reached.push(s.milestone);
    await startNextQuest();
  }
  check(`?${query} plays on to the end card`, ended, `quests on the island: ${reached.join(", ")}`);
  await page.screenshot({ path: `${OUT}/end-${query.replace("=", "-")}.png` });
}

// The festival has no gate of its own: starting it plays on to the end card.
await page.goto(`${BASE}/?challenge=festival`);
await page.waitForFunction(() => window.probe && window.engine.scene && !window.engine.isSwitching, null, { timeout: 90000 });
const festival = await playUntil((x) => x.endCard, 180000);
check("?challenge=festival plays on to the end card", !!festival?.endCard, JSON.stringify(festival));

check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

writeFileSync(`${OUT}/console.log`, logs.join("\n"));
await browser.close();
finish();
