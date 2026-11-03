/**
 * E2E: the island adventure flow, played with real key presses in Chrome.
 *
 *  1. Title screen → "Neues Abenteuer" → the opening: bottle on the beach, map card, the shark's hit at sea, the flight
 *     down to the landing beach, Chuleta and the call for help
 *  2. Quest 1 ends with the opening → quest 2 starts, game is saved (version 4), twelve quests exist
 *  3. Coins: walk through a coin → counter goes up
 *  4. Quest 3 (debug start): the elder tells the legend whole, the map card opens and closes → quest 4 starts;
 *     a reload in his talk keeps the quest and tells the legend again
 *  5. Quest 4 (debug start): three riddles at the lake (mashing Space, a wrong answer, any order, a lit tablet is silent),
 *     the Hüter rises and tells the lake in order → quest 5 starts; a reload in his talk keeps the quest;
 *     mashing Space through the lake; a reload forgets the tablets and the first-tablet talk plays again
 *  6. Village (debug start): chat with a villager
 *  6b. The new cast: portraits, faces in the dialogue box, Paco beside the elder, the mole in the cave, the Hüter on the lake,
 *      and no tree hides him when he rises (hueterView.mjs)
 *  7. Quest 12 (debug start): the goal is the volcano gate, and away from it the island is free
 *  8. A save from an older version offers no Continue, and starting over keeps coins and hats;
 *     a valid save offers both, and a new game from it clears them
 *  9. Mashing Space through the whole opening skips nothing and leaves the game correct
 *
 * Run (dev server on :5199 must be running):  node scripts/e2e/island.mjs
 * Proof: scripts/e2e/out/island/summary.json + screenshots
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { hueterViewChecks } from "./hueterView.mjs";

const BASE = process.env.GAME_URL ?? "http://localhost:5199/";
const OUT = new URL("./out/island/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✔" : "✘"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);
const state = () =>
  page.evaluate(() => {
    const g = window.game;
    const p = g.island.player.position;
    return {
      x: p.x,
      z: p.z,
      milestone: window.probe.milestone,
      coins: g.coins.collected,
      dialogue: g.ui.dialogue.isOpen,
      busy: window.probe.busy,
      free: !window.probe.busy && !g.ui.dialogue.isOpen,
      prompt: document.querySelector(".prompt")?.style.display !== "none" ? document.querySelector(".prompt")?.textContent.trim() : null,
    };
  });

/** Press Space until no dialogue is open (each press completes or advances a line). */
async function finishDialogue(maxPresses = 40) {
  for (let i = 0; i < maxPresses; i++) {
    if (!(await state()).dialogue) return true;
    await page.keyboard.press("Space");
    await wait(250);
  }
  return !(await state()).dialogue;
}

/** Steer Tadeo towards (x, z) with the arrow keys (camera looks north: Up = -z, Right = +x). */
async function walkTo(x, z, radius = 1.2, timeoutMs = 20000) {
  const t0 = Date.now();
  const held = new Set();
  const hold = async (key, on) => {
    if (on && !held.has(key)) await page.keyboard.down(key), held.add(key);
    if (!on && held.has(key)) await page.keyboard.up(key), held.delete(key);
  };
  let s = await state();
  while (Math.hypot(s.x - x, s.z - z) > radius && Date.now() - t0 < timeoutMs) {
    const dx = x - s.x;
    const dz = z - s.z;
    await hold("ArrowRight", dx > 0.4);
    await hold("ArrowLeft", dx < -0.4);
    await hold("ArrowDown", dz > 0.4);
    await hold("ArrowUp", dz < -0.4);
    await wait(60);
    s = await state();
  }
  for (const k of [...held]) await hold(k, false);
  await wait(250);
  return Math.hypot(s.x - x, s.z - z) <= radius + 0.5;
}

async function waitUntilFree(timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const s = await state();
    if (s.dialogue) await page.keyboard.press("Space");
    else if (!s.busy) return true;
    await wait(250);
  }
  return false;
}

/** Wait until `test()` holds. */
async function until(test, timeoutMs = 30000, stepMs = 100) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await test()) return true;
    await wait(stepMs);
  }
  return false;
}

/** Everyone who spoke so far in the opening, and their lines in order as "Name: text". */
const speakers = new Set();
const spoken = [];

/** Press through any open dialogue, noting who speaks and what they say, until `stop()` holds. */
async function readUntil(stop, timeoutMs = 30000) {
  return until(async () => {
    if (await stop()) return true;
    if ((await state()).dialogue) {
      const name = await page.textContent(".dialogue .name");
      speakers.add(name);
      // Reason: the box types its text out letter by letter, so the whole line comes from the dialogue itself
      const said = `${name}: ${await page.evaluate(() => window.game.ui.dialogue.full)}`;
      if (spoken.at(-1) !== said) spoken.push(said);
      await page.keyboard.press("Space");
    }
    return false;
  }, timeoutMs, 200);
}

const story = () => page.evaluate(() => window.game.story.e2e);
const bannerText = () => page.textContent(".banner");
const hasObject = (name) => page.evaluate((n) => !!window.game.island.scene.getObjectByName(n), name);
const mapCardOpen = () => page.isVisible(".map-card");
const chuletaVisible = () => page.evaluate(() => window.probe.chuleta.visible);
const dialogueOpen = async () => (await state()).dialogue;
const screenBlack = () => page.evaluate(() => Number(getComputedStyle(document.getElementById("fade")).opacity) > 0.95);
const banner2Shows = async () => (await page.isVisible(".banner.show")) && (await bannerText()).includes("von");

// ── 1. Title + opening ──────────────────────────────────────
await page.addInitScript(() => {
  if (!sessionStorage.getItem("e2e-cleared")) {
    localStorage.clear();
    sessionStorage.setItem("e2e-cleared", "1");
  }
});
await page.goto(BASE);
await wait(4000);
check("title screen shows logo + menu", await page.isVisible(".title-screen .logo"), await page.textContent(".title-screen .menu"));
check("twelve quests", (await page.evaluate(async () => (await import("/src/data/quests.ts")).QUESTS.length)) === 12);
await shot("01-title");
await page.keyboard.press("Space");

// The bottle on the beach
check("the opening starts with the narrator on a beach", await until(dialogueOpen, 15000));
await wait(1500);
check("the first voice is the narrator", (await page.textContent(".dialogue .name")) === "Erzähler");
await shot("02-beach");
check("Chuleta hides in the backpack at the start", !(await chuletaVisible()));

// The map card
await readUntil(mapCardOpen);
check("map card shows and has no text", (await mapCardOpen()) && (await page.textContent(".map-card")).trim() === "");
await page.keyboard.press("Space");
await wait(150);
// Reason: a press that was taken starts the closing animation, and the card stays in the page for 0.28 s while it plays
check("Space does not close the card in its first 0.4 s", (await mapCardOpen()) && !(await page.isVisible(".map-card.closing")));
await wait(1600);
await shot("03-map-card");
await page.keyboard.press("Space");
check("Space closes the map card", await until(async () => !(await mapCardOpen()), 2000));
await wait(500);
await shot("03b-tadeo-sets-off");

// Reason: only sayOverBlack lifts the dialogue's layer above the fade, so z-index 101 means the line is told over black
const layerIndex = () => page.evaluate(() => window.game.ui.layer.style.zIndex);
const onScreen = () => page.evaluate(() => (document.querySelector(".dialogue.open") ? window.game.ui.dialogue.full : ""));
const sailingSeen = await readUntil(async () => (await onScreen()).startsWith("Noch am selben Tag"), 30000);
const overBlack = await layerIndex();
check("the sailing is told over black", sailingSeen && overBlack === "101" && (await screenBlack()), `z-index "${overBlack}"`);

// The shark's hit at sea
check("the sea cinematic starts", await readUntil(() => hasObject("opening-sea"), 12000));
check("the dialogue layer is back down after the sailing", (await layerIndex()) === "", `z-index "${await layerIndex()}"`);
const seaStart = Date.now();
check("Chuleta stays in the backpack at sea", !(await chuletaVisible()));
await wait(1500);
await shot("04-sailing");
await wait(3300);
await shot("05-fin");
check("the shark breaks the surface", await until(() => page.evaluate(() => window.game.island.scene.getObjectByName("opening-shark")?.position.y > -0.2), 9000, 16));
await shot("06-hit");
await wait(150);
await shot("06b-hit");
check("the hit cuts to black", await until(screenBlack, 3000, 16));
const seaSeconds = (Date.now() - seaStart) / 1000;
check("the sea cinematic stays under 12 seconds", seaSeconds < 12, `${seaSeconds.toFixed(1)} s`);
check("the sea cinematic has a moment for the fin", seaSeconds > 5, `${seaSeconds.toFixed(1)} s`);
await shot("07-black");
check("the sea group is cleaned up", await until(async () => !(await hasObject("opening-sea")), 3000));
check("the beach bottle is cleaned up", !(await hasObject("opening-beach")));

// Flight down to the landing beach
await wait(3500);
await shot("08-flight");
check("the arrival dialogue opens", await until(dialogueOpen, 20000));
await shot("09-arrival");
// Reason: he turns to the volcano only after these, so the narrator and his first words play on the landing shot
const firstWords = await readUntil(async () => (await onScreen()).startsWith("Uff!"), 30000);
check("Tadeo has not turned to the volcano during his first words", firstWords && (await page.evaluate(() => window.game.island.player.facing)) === 0);
// Reason: the camera glides round in 1.6 s; Space is held back until then so that the line stays on screen
const volcanoLine = await readUntil(async () => (await onScreen()).startsWith("Und da hinten raucht ein Berg"), 30000);
await wait(2200);
const view = await page.evaluate(async () => {
  const THREE = await import(performance.getEntriesByType("resource").map((e) => e.name).find((n) => /deps\/three\.js/.test(n)));
  const { LANDMARKS } = await import("/src/world/layout.ts");
  const { island } = window.game;
  const [vx, vz] = LANDMARKS.volcano;
  // The crater rim is about nine metres above the floor
  const top = new THREE.Vector3(vx, island.island.hf.heightAt(vx, vz) + 9, vz);
  const ndc = top.clone().project(island.camera);
  const box = document.querySelector(".dialogue").getBoundingClientRect();
  const py = ((1 - ndc.y) / 2) * innerHeight;
  const from = island.camera.position;
  const dist = from.distanceTo(top);
  const ray = new THREE.Raycaster(from, top.clone().sub(from).normalize(), 0.3, dist);
  ray.camera = island.camera;
  const blockers = ray.intersectObjects(island.scene.children, true).filter((h) => h.object.isMesh && h.object.visible && h.distance < dist - 6);
  return { x: ndc.x, py, boxTop: box.top, blockers: blockers.map((h) => `${h.object.name || h.object.type}@${h.distance.toFixed(0)}/${dist.toFixed(0)}`).slice(0, 4) };
});
await shot("landing_volcano");
check(
  "the volcano is in the picture when Tadeo talks about it",
  volcanoLine && Math.abs(view.x) < 0.9 && view.py > 0 && view.py < view.boxTop && view.blockers.length === 0,
  JSON.stringify(view),
);
check("Chuleta is still in the backpack while Tadeo says where he is", !(await chuletaVisible()));
check("Chuleta is out of the backpack after that", await readUntil(chuletaVisible, 30000));
check("the banner comes after the talk", await readUntil(banner2Shows, 30000));
await shot("10-quest2-banner");
const bannerLine = await bannerText();
check("intro has narrator, Tadeo, Chuleta and Stimme", ["Erzähler", "Tadeo", "Chuleta", "Stimme"].every((s) => speakers.has(s)), [...speakers].join(", "));
check("no sign quest", !speakers.has("Schild"));
check(
  "the narrator's last word sends him after the golden star, right after Tadeo says he will look after her",
  /^Erzähler: .*goldene Stern/.test(spoken.at(-1)) && /^Tadeo: .*wer da ruft/.test(spoken.at(-2)),
  spoken.slice(-2).join(" | "),
);
const at = (re) => spoken.findIndex((l) => re.test(l));
const landingEnd = at(/^Tadeo: Und da hinten raucht ein Berg/);
const chuletaOut = at(/^Chuleta: Und mich hast du wohl vergessen/);
const arrivalStart = at(/^Chuleta: Gack! Der Hai/);
check(
  "Tadeo reacts before Chuleta climbs out",
  landingEnd >= 0 && landingEnd < chuletaOut && chuletaOut < arrivalStart,
  `${landingEnd} < ${chuletaOut} < ${arrivalStart}`,
);
const landingStart = at(/^Erzähler: Ein Hai hat Tadeos Boot angegriffen/);
check(
  "on the beach the narrator tells of the shark, then the waves, before Tadeo speaks",
  landingStart >= 0 && /^Erzähler: Zum Glück haben die Wellen/.test(spoken[landingStart + 1]) && /^Tadeo: Uff!/.test(spoken[landingStart + 2]),
  spoken.slice(landingStart, landingStart + 3).join(" | "),
);
check("player is free after intro", await waitUntilFree());

// ── 2. Quest 1 ends with the intro ──────────────────────────
let s = await state();
check("quest 1 completes by itself", s.milestone === 2 && s.free, JSON.stringify(s));
check("banner says 2 von 12", bannerLine.includes("2 von 12"), bannerLine);
const e2e = await story();
check("wreck on the sand", e2e.wreck);
check("Tadeo stands at the landing pier, no coin was picked up on the way", Math.hypot(s.x + 66, s.z - 47) < 1 && s.coins === 0, JSON.stringify(s));
check("the HUD is on", await page.isVisible(".hud-quest"));
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("schatzkarten_save") ?? "null"));
check("progress was saved", saved?.milestone === 2, JSON.stringify(saved));
check("save version is 4", saved?.version === 4, JSON.stringify(saved));
await shot("11-quest2");

// ── 3. Coins ────────────────────────────────────────────────
const coinsBefore = (await state()).coins;
const [coin, coinStart] = await page.evaluate(() => {
  const g = window.game;
  const p = g.island.player.position;
  const spots = g.coins.spots.filter((_, i) => !g.coins.taken.has(i));
  spots.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
  const { x, z } = spots[0];
  // Reason: a coin can lie beside a tree or a pond, so Tadeo walks in from a side where he can stand
  const start = [[0, 4], [4, 0], [0, -4], [-4, 0]].map(([dx, dz]) => [x + dx, z + dz]).find(([sx, sz]) => g.island.player.world.canStand(sx, sz));
  return [[x, z], start];
});
await page.evaluate(([x, z]) => window.probe.place(x, z), coinStart);
await wait(500);
await walkTo(coin[0], coin[1], 0.6, 8000);
await wait(300);
s = await state();
check("walking through a coin collects it", s.coins === coinsBefore + 1, `${coinsBefore} → ${s.coins}`);
check("HUD shows the coin count", (await page.textContent(".hud-coins"))?.includes(`${s.coins} / 50`) ?? false);
await shot("05-coin");

// ── 4. Quest 3: the elder tells the legend ──────────────────
/** Every line the dialogue box begins, as "Name: text": read from the box itself, so a quick line is never missed. */
async function recordLines() {
  await page.evaluate(() => {
    const box = Object.getPrototypeOf(window.game.ui.dialogue);
    const begin = box.showLine;
    window.said = [];
    box.showLine = function () {
      begin.call(this);
      window.said.push(`${this.script[this.index].speaker}: ${this.script[this.index].text}`);
    };
  });
}
const said = () => page.evaluate(() => window.said);
const plain = (list) => list.map((l) => l.replace(/^[^:]+: /, ""));
const onIsland = () => page.evaluate(() => window.engine.scene === window.game.island);
/** A conversation of the game as "Name: text" lines, or several joined in order. */
const scriptLines = (...keys) =>
  page.evaluate(async (keys) => {
    const { DIALOGUES } = await import("/src/data/dialogues.ts");
    return keys.flatMap((k) => DIALOGUES[k].map((l) => `${l.speaker}: ${l.text}`));
  }, keys);
/**
 * Press Continue on the title screen: what a player does after closing the game. With `m`, a save at quest `m` is
 * seeded first; without it, the game's own save is used, as after a reload in the middle of a talk.
 */
async function continueAt(m) {
  if (m) await page.evaluate((m) => localStorage.setItem("schatzkarten_save", JSON.stringify({ version: 4, milestone: m, items: [], playerX: 0, playerY: 0, timestamp: 1 })), m);
  await page.goto(BASE);
  await wait(4000);
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.engine?.scene === window.game?.island && !window.probe.busy, null, { timeout: 30000 });
  await recordLines();
}
/** Press Space, as separate presses every 60 ms like a child mashing it, while a talk is open, until `n` lines have begun. */
async function pressUntilLines(n, timeoutMs = 60000) {
  return until(async () => {
    if ((await said()).length >= n) return true;
    if ((await state()).dialogue) await page.keyboard.press("Space");
    return false;
  }, timeoutMs, 60);
}
await page.goto(`${BASE}?quest=3`);
await wait(4000);
await recordLines();
// When the map card is added to the page, so a press can be placed inside its first 0.4 s
await page.evaluate(() => {
  new MutationObserver((changes) => {
    if (changes.some((c) => [...c.addedNodes].some((n) => n.classList?.contains("map-card")))) window.mapCardOpenedAt = performance.now();
  }).observe(document.getElementById("ui"), { childList: true });
});
const elder = await page.evaluate(() => {
  const p = window.game.npcs.get("elder").position;
  return [p.x, p.z];
});
await page.evaluate(([x, z]) => window.probe.place(x, z + 2.2, Math.PI), elder);
await wait(600);
s = await state();
check("elder: prompt to talk", s.prompt?.includes("Sprechen") ?? false, s.prompt ?? "no prompt");
await page.keyboard.press("Space");
await wait(600);
check("elder: the talk opens a dialogue, no challenge starts", (await state()).dialogue && (await onIsland()));
await readUntil(mapCardOpen, 90000);
const mapCardSeen = await mapCardOpen();
const heardAtCard = await said();
// The card is held up inside the elder's talk, where the island leaves Space alone. A press right now is in its first 0.4 s.
await page.keyboard.press("Space");
const pressAge = await page.evaluate(() => performance.now() - window.mapCardOpenedAt);
await wait(150);
// Reason: a press that was taken starts the closing animation, and the card stays in the page for 0.28 s while it plays
const taken = await page.isVisible(".map-card.closing");
check("the map card stays open when Space comes in its first 0.4 s", pressAge < 400 && !taken && (await mapCardOpen()), `${Math.round(pressAge)} ms after it opened, closing: ${taken}`);
await wait(450);
await shot("04-map-card-quest3");
await wait(1000);
await page.keyboard.press("Space");
check("Space closes the map card at quest 3", await until(async () => !(await mapCardOpen()), 2000));
await readUntil(async () => (await state()).milestone === 4, 90000);
await waitUntilFree();
s = await state();
let heard = await said();
let lines = plain(heard);
check("elder tells the legend at quest 3 and no challenge starts", heard[0]?.startsWith("Dorfältester: ") && (await onIsland()));
check("the legend is told whole", heardAtCard.join("\n") === (await scriptLines("elder_legend")).join("\n"), `${heardAtCard.length} lines`);
check("the map card opens right after Tadeo asks for the Flaschenpost", heardAtCard.at(-1) === "Tadeo: Moment! Ich habe eine Karte! Sie war in einer Flaschenpost.", heardAtCard.at(-1));
check("the map card appears", mapCardSeen);
check("elder_after_map follows the card", heard.slice(heardAtCard.length).join("\n") === (await scriptLines("elder_after_map")).join("\n"), `${heard.length - heardAtCard.length} lines`);
check("quest 4 (See) is active after the elder", s.milestone === 4, `milestone ${s.milestone}`);
await shot("04b-quest4");

// ── 5. Quest 4: three riddles at the lake ───────────────────
// [x, z, approach dx, approach dz] — tablet 2 stands on a steep lake bank, reachable only from the east
const tablets = [[-14, -9, 0, 1], [17, -9, 1, 0], [2, 19, 0, 1]];
const RIGHT = [1, 2, 1];
const lake = () => page.evaluate(() => window.game.lake.e2e);
const riddleOpen = () => page.isVisible(".riddle-card");
const highlighted = () => page.evaluate(() => [...document.querySelectorAll(".riddle-answer")].findIndex((a) => a.classList.contains("active")));
const answersShown = () => page.evaluate(() => [...document.querySelectorAll(".riddle-answer")].map((a) => a.textContent.trim()));
const saidAloud = () => page.evaluate(() => window.spokenAloud.map((l) => l.replace(/^[^:]+: /, "")));
await page.goto(`${BASE}?quest=4`);
await wait(4000);
await recordLines();
// Every spoken line is noted, so the answers read aloud can be checked
await page.evaluate(async () => {
  const { NarrationManager } = await import("/src/systems/NarrationManager.ts");
  const narration = NarrationManager.getInstance();
  const speak = narration.speakLine.bind(narration);
  window.spokenAloud = [];
  narration.speakLine = (text, speaker) => (window.spokenAloud.push(`${speaker}: ${text}`), speak(text, speaker));
});
check("all three tablets start dark and asleep", (await lake()).lit.every((l) => !l) && (await lake()).solved === 0 && !(await lake()).ghost);

async function goToTablet(i) {
  const [tx, tz, ax, az] = tablets[i];
  await page.evaluate(([x, z]) => window.probe.place(x, z), [tx + ax * 3.2, tz + az * 3.2]);
  await wait(500);
  await walkTo(tx + ax * 2.2, tz + az * 2.2, 0.6, 6000);
  s = await state();
  check(`tablet ${i + 1}: prompt to read`, s.prompt?.includes("Lesen") ?? false, s.prompt ?? "no prompt");
}

/** Read a tablet's lines and wait for its card; the card is then at least 0.5 s old when this returns. */
async function openRiddle() {
  await page.keyboard.press("Space");
  await readUntil(riddleOpen, 20000);
  await wait(550);
}

/** Choose answer k with the arrows and Space. */
async function choose(k) {
  // Reason: two presses inside one frame count as one, so a person's presses are told apart by a pause
  for (let n = await highlighted(); n < k; n++) {
    await page.keyboard.press("ArrowDown");
    await wait(120);
  }
  await wait(150);
  await page.keyboard.press("Space");
}

// First tablet: mashing Space gets nowhere, a wrong answer is kind, the right one lights the tablet
await goToTablet(0);
await page.evaluate(() => (window.said = []));
await page.keyboard.press("Space");
check("tablet 1: Tadeo and Chuleta talk first, at the first tablet", await until(async () => (await state()).dialogue && (await page.textContent(".dialogue .name")) === "Tadeo", 3000));
let sawKindLine = false;
let kindSpeaker = "";
let presses = 0;
const mashUntil = Date.now() + 14000;
while (Date.now() < mashUntil && !sawKindLine) {
  if ((await state()).dialogue) {
    sawKindLine = (await page.evaluate(() => window.game.ui.dialogue.full)).includes("passt noch nicht");
    kindSpeaker = await page.textContent(".dialogue .name");
  }
  await page.keyboard.press("Space");
  presses++;
  await wait(90);
}
check("mashing Space never solves a riddle", (await lake()).solved === 0 && sawKindLine, `${presses} presses`);
check("the kind line is the tablet's", kindSpeaker === "Steintafel", kindSpeaker);
await shot("05-wrong-answer");
check("a wrong answer keeps the tablet dark", !(await lake()).lit[0]);
await readUntil(riddleOpen, 20000);
check("after a wrong answer the question comes back", await riddleOpen());
check("the highlight starts on the first answer again", (await highlighted()) === 0);
check("the card shows the three answers", (await answersShown()).join() === "Chuleta,Schatten,Wind", (await answersShown()).join());
check("the first answer is read aloud when it is highlighted", (await saidAloud()).includes("Chuleta"));
await page.keyboard.press("Space");
await wait(100);
// Reason: a press that was taken marks the answer, and the card stays up for 0.7 s after that
check("Space does nothing in the first 0.4 s of a card", (await riddleOpen()) && !(await page.isVisible(".riddle-answer.chosen")));
await wait(500);
await page.keyboard.press("ArrowDown");
await wait(150);
check("ArrowDown moves the highlight", (await highlighted()) === 1);
check("the new answer is read aloud", (await saidAloud()).includes("Schatten"));
check("the riddle on the card ends with its question", (await page.textContent(".riddle-lines")).trim().endsWith("Was bin ich?"));
await shot("06-riddle-card");
await page.keyboard.press("ArrowUp");
await wait(100);
await page.keyboard.press("ArrowUp");
await wait(100);
check("the highlight stops at the first answer", (await highlighted()) === 0);
await page.keyboard.press("ArrowDown");
await wait(150);
await page.keyboard.press("Space");
check("the card closes when an answer is chosen", await until(async () => !(await riddleOpen()), 2000));
check("the right answer lights the tablet", await until(async () => (await lake()).lit[0] && (await lake()).solved === 1, 3000), JSON.stringify(await lake()));
await wait(500);
await shot("07-tablet-lit");
await waitUntilFree();
let lakeHeard = await said();
const count = (list, line) => list.filter((l) => l === line).length;
const [firstTablet, litFirst, litSecond] = await Promise.all([scriptLines("lake_first_tablet"), scriptLines("lake_lit_first"), scriptLines("lake_lit_second")]);
check("a wrong answer doesn't replay the first talk", firstTablet.every((l) => count(lakeHeard, l) === 1) && count(lakeHeard, (await scriptLines("lake_wrong"))[0]) === 1 && litFirst.every((l) => count(lakeHeard, l) === 1), lakeHeard.join(" | "));
check("the first talk comes before the riddle, the first lit line after the wrong answer", lakeHeard.indexOf(firstTablet[0]) === 0 && lakeHeard.indexOf(litFirst[0]) > lakeHeard.indexOf((await scriptLines("lake_wrong"))[0]));

// A lit tablet is silent: walking back to it and pressing Space adds no line
await page.evaluate(([x, z]) => window.probe.place(x, z), [tablets[0][0], tablets[0][1] + 2.2]);
await wait(500);
await page.keyboard.press("Space");
await wait(800);
check("a lit tablet stays silent", !(await state()).dialogue && (await said()).length === lakeHeard.length, `${(await said()).length - lakeHeard.length} new lines`);

// The other two, in the order 3, 2: any order works
for (const i of [2, 1]) {
  await goToTablet(i);
  await page.evaluate(() => (window.said = []));
  await openRiddle();
  if (i === 2) await shot("08-ghost-riddle");
  await choose(RIGHT[i]);
  check(`tablet ${i + 1}: the right answer lights it`, await until(async () => (await lake()).lit[i], 3000), JSON.stringify(await lake()));
  if (i === 2) {
    check("the ghost has not risen before the third riddle", !(await lake()).ghost);
    await wait(1500);
    await shot("09-two-lit");
    await waitUntilFree();
    lakeHeard = await said();
    check("the second tablet says the second line, and not the first tablet's talk", litSecond.every((l) => lakeHeard.includes(l)) && firstTablet.every((l) => !lakeHeard.includes(l)) && litFirst.every((l) => !lakeHeard.includes(l)), lakeHeard.join(" | "));
  }
}

// The third riddle wakes the ghost
await page.evaluate(() => (window.said = []));
check("any order works", (await lake()).lit.every(Boolean) && (await lake()).solved === 3, JSON.stringify(await lake()));
// Reason: the ghost flag is read at the first line of each part, so the camera and the ghost are seen where the lake talk begins and ends
await page.evaluate(() => {
  const box = Object.getPrototypeOf(window.game.ui.dialogue);
  const begin = box.showLine;
  window.ghostAt = {};
  box.showLine = function () {
    begin.call(this);
    window.ghostAt[`${this.script[this.index].speaker}: ${this.script[this.index].text}`] = window.game.lake.e2e.ghost;
  };
});
// Reason: the lake goes still first (a line of the Erzähler), so the ghost rises once that line is read
check("the ghost rises after the third", await readUntil(async () => (await lake()).ghost, 30000));
await wait(1500);
await shot("10-hueter-rising");
await wait(2500);
await shot("11-hueter-risen");
await readUntil(async () => (await state()).milestone === 5, 120000);
await waitUntilFree();
s = await state();
heard = await said();
lines = plain(heard);
const [still, hueterTalk, rhymeTalk, afterRhyme, gone] = await Promise.all(["lake_still", "lake_hueter", "lake_rhyme", "lake_after_rhyme", "lake_gone"].map((k) => scriptLines(k)));
check("the lake is told in order", heard.join("\n") === [...still, ...hueterTalk, ...rhymeTalk, ...afterRhyme, ...gone].join("\n"), `${heard.length} lines`);
const ghostAt = await page.evaluate(() => window.ghostAt);
check("the ghost is not there while the lake is still, is there when he speaks, and is gone for the last talk", ghostAt[still.at(-1)] === false && ghostAt[hueterTalk[0]] === true && ghostAt[gone[0]] === false, JSON.stringify([ghostAt[still.at(-1)], ghostAt[hueterTalk[0]], ghostAt[gone[0]]]));
check("the rhyme says Wesen", lines.includes("Also: Das Schwert für die Dornen. Die Beeren für die Wesen."));
check("the whole rhyme is four lines, then Tadeo's two", lines.indexOf("Also: Das Schwert für die Dornen. Die Beeren für die Wesen.") - lines.indexOf("Das Schwert aus dem Fels zerschneidet den Dorn,") === 4);
check("Tadeo has the last word", lines.at(-1) === "Also zuerst das Schwert. Auf zur Höhle!", lines.at(-1));
check("the ghost is gone after he has spoken", await until(async () => !(await lake()).ghost, 6000));
check("quest 5 (Höhle) is active", s.milestone === 5, `milestone ${s.milestone}`);
check("Chuleta asks nothing old", await until(async () => (await saidAloud()).includes("Näher, als du denkst? Gack! Jetzt schaue ich mich dauernd um!"), 6000));
await shot("12-quest5");

// A reload keeps nothing of the riddles: one tablet lit, then a reload, and all three come back dark
await page.goto(`${BASE}?quest=4`);
await wait(4000);
await recordLines();
await goToTablet(1);
await openRiddle();
await choose(RIGHT[1]);
check("one tablet is lit before the reload", await until(async () => (await lake()).solved === 1, 3000));
await waitUntilFree();
await page.goto(`${BASE}?quest=4`);
await wait(4000);
await recordLines();
check("after a reload the tablets are dark again", (await lake()).lit.every((l) => !l) && (await lake()).solved === 0);
await goToTablet(1);
await page.keyboard.press("Space");
await readUntil(riddleOpen, 20000);
await wait(550);
check("a riddle can be asked again after a reload", (await riddleOpen()) && (await highlighted()) === 0);
check("after a reload the next tablet plays the first-tablet talk", (await said()).slice(0, firstTablet.length).join("\n") === firstTablet.join("\n"), (await said()).join(" | "));
await choose(RIGHT[1]);
await until(async () => (await lake()).solved === 1, 3000);
await waitUntilFree();
check("and then the first lit line, not the second", (await said()).includes(litFirst[0]) && !(await said()).includes(litSecond[0]), (await said()).join(" | "));

/** Solve the three tablets in the order 1, 2, 3 (a real player's presses); the last one wakes the Hüter. */
async function solveAllTablets() {
  for (const i of [0, 1, 2]) {
    await goToTablet(i);
    await openRiddle();
    if (i === 2) await page.evaluate(() => (window.said = []));
    await choose(RIGHT[i]);
    if (i < 2) {
      check(`tablet ${i + 1}: lit`, await until(async () => (await lake()).lit[i], 3000));
      await waitUntilFree();
    }
  }
}

// A reload in the elder's talk and in the Hüter's talk: the quest stays, and the talk is told again from its start
const elderTalk = await scriptLines("elder_legend");
await continueAt(3);
await page.evaluate(([x, z]) => window.probe.place(x, z + 2.2, Math.PI), elder);
await wait(600);
await page.keyboard.press("Space");
check("a reload in the elder's talk: the talk is at line 10", await pressUntilLines(10, 30000));
await continueAt();
check("a reload in the elder's talk keeps the quest", (await state()).milestone === 3 && (await said()).length === 0);
await page.evaluate(([x, z]) => window.probe.place(x, z + 2.2, Math.PI), elder);
await wait(600);
await page.keyboard.press("Space");
await readUntil(mapCardOpen, 90000);
check("after the reload the elder starts again on his first line and tells the legend whole", (await said()).join("\n") === elderTalk.join("\n"), `${(await said()).length} lines`);
await wait(1000);
await page.keyboard.press("Space");
await readUntil(async () => (await state()).milestone === 4, 90000);
await waitUntilFree();
check("only then the quest advances", (await state()).milestone === 4);

const lakeOrder = await scriptLines("lake_still", "lake_hueter", "lake_rhyme", "lake_after_rhyme", "lake_gone");
await continueAt(4);
await solveAllTablets();
await pressUntilLines(1 + 10, 30000);
check("a reload in the Hüter's talk: the talk is at line 10", (await said()).length >= 11 && (await lake()).ghost);
await continueAt();
check("a reload in the Hüter's talk keeps the quest, and the tablets are forgotten", (await state()).milestone === 4 && (await lake()).solved === 0 && (await said()).length === 0);
await solveAllTablets();
await readUntil(async () => (await state()).milestone === 5, 120000);
await waitUntilFree();
check("after the reload the Hüter tells the lake again from its start, and only then the quest advances", (await said()).slice(-lakeOrder.length).join("\n") === lakeOrder.join("\n") && (await state()).milestone === 5, `${(await said()).length} lines`);

// Mashing Space through the lake: separate presses every 60 ms from the third tablet's answer on
await continueAt(4);
await solveAllTablets();
let lakeMash = true;
const lakeMasher = (async () => {
  while (lakeMash) {
    await page.keyboard.press("Space");
    await wait(60);
  }
})();
const lakeDone = await until(async () => (await state()).milestone === 5 && (await state()).free, 120000, 100);
lakeMash = false;
await lakeMasher;
await wait(500);
check("mashing Space through the lake: the ghost is gone, the quest advanced and Tadeo is in control", lakeDone && !(await lake()).ghost && (await state()).milestone === 5 && (await state()).free, JSON.stringify(await state()));
check("mashing Space through the lake skips no line", (await said()).join("\n") === lakeOrder.join("\n"), `${(await said()).length} of ${lakeOrder.length} lines`);

// ── 6. Village chat ─────────────────────────────────────────
await page.goto(`${BASE}?quest=8`);
await wait(4000);
await page.evaluate(() => window.probe.place(69.2, 38.4, -Math.PI / 2));
await wait(600);
s = await state();
check("villager offers a chat", s.prompt?.includes("Sprechen") ?? false, s.prompt ?? "no prompt");
await page.keyboard.press("Space");
await wait(900);
const chatName = await page.textContent(".dialogue .name");
check("chat dialogue with a villager", (await state()).dialogue && chatName === "Käpt'n Paco", chatName ?? "");
await shot("08-village-chat");
await finishDialogue();
await waitUntilFree();
await page.evaluate(() => window.probe.place(60, 42.4, Math.PI));
await wait(600);
s = await state();
check("Fischer Freddy offers the fishing side game", s.prompt?.includes("Angeln") ?? false, s.prompt ?? "no prompt");

const fps = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let n = 0;
      const t0 = performance.now();
      const tick = () => (++n, performance.now() - t0 < 2000 ? requestAnimationFrame(tick) : resolve((n * 1000) / (performance.now() - t0)));
      requestAnimationFrame(tick);
    }),
);
check("runs smoothly (≥ 50 fps)", fps >= 50, `${fps.toFixed(1)} fps`);

// ── 6b. The new cast ────────────────────────────────────────
const portraitData = await page.evaluate(async () => (await import("/src/ui/Snapshots.ts")).renderSnapshots().portraits);
const portraits = Object.keys(portraitData);
check("every new speaker has a portrait", ["maulwurf", "hueter", "villager3"].every((k) => portraits.includes(k)));
for (const k of ["villager3", "maulwurf", "hueter"]) {
  if (portraitData[k]) writeFileSync(`${OUT}portrait-${k}.png`, Buffer.from(portraitData[k].split(",")[1], "base64"));
}

// Each new speaker in the real dialogue box: an image portrait, or the emoji for the voice nobody sees yet
const faces = [
  ["Käpt'n Paco", "img", "Puh! Danke, Junge! Mein Fuß steckte ganz fest."],
  ["Stimme", "🗣️", "Hilfe! Hilfe!"],
  ["Maulwurf", "img", "Ich habe Hunger! Bring mir einen Leuchtpilz, dann grabe ich dir den Weg frei."],
  ["Hüter", "img", "Ich bin der Hüter. Ich habe auf das Herz aufgepasst."],
];
for (const [i, [speaker, face, text]] of faces.entries()) {
  await page.evaluate(([speaker, text]) => void window.game.ui.say([{ speaker, portrait: "", text }]), [speaker, text]);
  await wait(500);
  await page.keyboard.press("Space");
  await wait(300);
  const shown = await page.evaluate(() => {
    const p = document.querySelector(".dialogue .portrait");
    return p.querySelector("img") ? "img" : p.textContent;
  });
  check(`${speaker} has a face`, shown === face && (await page.textContent(".dialogue .name")) === speaker, shown);
  await shot(`09-face-${i + 1}`);
  await finishDialogue();
}

const oneCaptain = await page.evaluate(async () => {
  const { createVillager } = await import("/src/characters/cast.ts");
  const hat = (i) => !!createVillager(i).root.getObjectByName("captain-hat");
  return { paco: hat(3), crowd: hat(7) };
});
check("createVillager(3) is Paco, and the crowd has no second Paco", oneCaptain.paco && !oneCaptain.crowd, JSON.stringify(oneCaptain));

// Paco next to the elder, in the village's real light: they share scenes and must look clearly different
const pacoAt = await page.evaluate(() => {
  const [x, z] = window.game.story.pacoHome.at;
  return { x, y: window.game.island.island.hf.heightAt(x, z), z };
});
await page.goto(`${BASE}?cam=${pacoAt.x - 0.85},${pacoAt.y + 1.5},${pacoAt.z + 3.9},${pacoAt.x - 0.85},${pacoAt.y + 0.85},${pacoAt.z}`);
await wait(4000);
await page.evaluate(() => {
  // Reason: this page starts at quest 1, when Paco is still away
  window.game.story.apply(3);
  const paco = window.game.npcs.get("villager3");
  const elder = window.game.npcs.get("elder");
  elder.position.set(paco.position.x - 1.7, paco.position.y, paco.position.z);
  elder.avatar.root.position.copy(elder.position);
  paco.homeFacing = elder.homeFacing = 0;
});
await wait(1200);
await shot("10-paco-and-elder");

// Paco is in the picture for every one of his lines in the elder's talks, from whichever side Tadeo walks up to the elder:
// the legend and what follows the map at quest 3, and the talk at the gate at quest 7
const pacoSides = { "from-the-well": [65.2, 39.7], "from-the-gate": [62.5, 36.2] };
for (const [quest, keys, tag] of [[3, ["elder_legend", "elder_after_map"], "elder"], [7, ["village_enter"], "gate"]]) {
  const pacoLines = (await scriptLines(...keys)).filter((l) => l.startsWith("Käpt'n Paco: "));
  for (const [name, at] of Object.entries(pacoSides)) {
    await page.goto(`${BASE}?quest=${quest}`);
    await page.waitForFunction(() => window.engine?.scene === window.game?.island && !window.probe.busy, null, { timeout: 30000 });
    await recordLines();
    await page.evaluate(([x, z]) => window.probe.place(x, z), at);
    await wait(500);
    await page.keyboard.press("Space");
    const measured = new Set();
    for (let i = 0; i < 400 && measured.size < pacoLines.length; i++) {
      if (await mapCardOpen()) {
        await wait(900);
        await page.keyboard.press("Space");
      } else if ((await state()).dialogue && (await page.textContent(".dialogue .name")) === "Käpt'n Paco" && !measured.has((await said()).length)) {
        measured.add((await said()).length);
        await wait(1200);
        await shot(`${tag === "elder" ? "elder_paco" : "gate_paco"}_${name}${measured.size > 1 ? `_${measured.size}` : ""}`);
        const inShot = await page.evaluate(() => {
          const { island, npcs } = window.game;
          const screen = (npc) => npc.avatar.head.getWorldPosition(npc.position.clone()).project(island.camera);
          const [paco, elder] = [screen(npcs.get("villager3")), screen(npcs.get("elder"))];
          return { x: +paco.x.toFixed(2), y: +paco.y.toFixed(2), elderApart: +Math.abs(paco.x - elder.x).toFixed(2) };
        });
        // Reason: the dialogue box covers the screen below y = -0.48
        check(`Paco is in the picture for every Hm, hm (${tag} ${name}, line ${measured.size})`, Math.abs(inShot.x) < 0.8 && inShot.y > -0.45 && inShot.y < 1 && inShot.elderApart > 0.18, JSON.stringify(inShot));
      } else if ((await state()).dialogue) {
        await page.keyboard.press("Space");
        await wait(200);
      } else {
        await wait(100);
      }
    }
    check(`Paco spoke all his lines (${tag} ${name})`, measured.size === pacoLines.length, `${measured.size} of ${pacoLines.length}`);
  }
}

// The mole in the real cave, by torchlight, next to Tadeo
await page.goto(`${BASE}?challenge=cave`);
await wait(6000);
for (let i = 0; i < 40 && (await page.evaluate(() => !!document.querySelector(".dialogue.open"))); i++) {
  await page.keyboard.press("Space");
  await wait(220);
}
const moleStart = await page
  .evaluate(async () => {
    const { createMole } = await import("/src/characters/Mole.ts");
    const cave = window.engine.scene;
    const p = cave.player.position;
    // Reason: the first open spot beside Tadeo, in front of the camera
    const spot = [[1.7, -0.9], [-1.7, -0.9], [1.7, 0.4], [-1.7, 0.4], [0, -2]]
      .map(([dx, dz]) => [p.x + dx, p.z + dz])
      .find(([x, z]) => cave.world.field.openAt(x, z) > 0.42);
    const mole = createMole();
    mole.root.position.set(spot[0], cave.world.field.heightAt(spot[0], spot[1]), spot[1]);
    mole.root.rotation.y = Math.atan2(p.x - spot[0], p.z - spot[1]);
    cave.scene.add(mole.root);
    let last = performance.now();
    const tick = (now) => {
      mole.update((now - last) / 1000);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.mole = mole;
    return { hungry: mole.hungry };
  })
  .catch((e) => ({ error: e.message }));
check("the mole starts hungry", moleStart.hungry === true, JSON.stringify(moleStart));
if (!moleStart.error) {
  await wait(1500);
  await shot("11-mole-hungry");
  await page.evaluate(() => void (window.moleDug = window.mole.dig()));
  await wait(1100);
  await shot("12-mole-digging");
  await page.evaluate(() => window.moleDug);
  check("the mole finishes digging and is no longer hungry", await page.evaluate(() => !window.mole.hungry));
  await wait(600);
  await shot("13-mole-fed");
}

// The Hüter over the lake: hidden, rises, stays see-through, fades away
await page.goto(`${BASE}?quest=4&cam=2,3.4,17,2,3.2,2`);
await wait(4000);
const hueterStart = await page
  .evaluate(async () => {
    const { createHueter } = await import("/src/characters/Hueter.ts");
    const { LANDMARKS, WATER_LEVEL } = await import("/src/world/layout.ts");
    const hueter = createHueter();
    hueter.root.position.set(LANDMARKS.lake[0], WATER_LEVEL, LANDMARKS.lake[1]);
    window.game.island.scene.add(hueter.root);
    const tick = (now) => {
      hueter.update(1 / 60, now / 1000);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.hueter = hueter;
    const mats = [];
    hueter.root.traverse((o) => o.material && mats.push(o.material));
    const additive = mats.filter((m) => m.blending === 2);
    return { hiddenFirst: !hueter.root.visible, seeThrough: mats.every((m) => m.transparent), additive: additive.length, foggy: additive.filter((m) => m.fog).length };
  })
  .catch((e) => ({ error: e.message }));
check("the Hüter is hidden until he rises", hueterStart.hiddenFirst === true, JSON.stringify(hueterStart));
check("every part of the Hüter is see-through", hueterStart.seeThrough === true);
check("his additive parts ignore fog", hueterStart.additive > 0 && hueterStart.foggy === 0);
if (!hueterStart.error) {
  await page.evaluate(() => void (window.hueterRisen = window.hueter.rise()));
  await wait(1300);
  await shot("14-hueter-rising");
  await page.evaluate(() => window.hueterRisen);
  check("the Hüter has risen", await page.evaluate(() => window.hueter.root.visible));
  await wait(800);
  await shot("15-hueter-lake");
  await page.evaluate(() => void (window.hueterGone = window.hueter.fade()));
  await wait(1300);
  await shot("16-hueter-fading");
  await page.evaluate(() => window.hueterGone);
  check("the Hüter fades away", await page.evaluate(() => !window.hueter.root.visible));
}
await hueterViewChecks({ page, BASE, check, shot, wait });

// ── 7. Quest 12's gate is the volcano: Tadeo starts far from it, so no prompt shows and the game must still run
await page.goto(`${BASE}?quest=12`);
await wait(4000);
s = await state();
check("a game at quest 12 is free, with no prompt away from the gate", s.milestone === 12 && !s.dialogue && !s.busy && s.prompt === null, JSON.stringify(s));
const finalGoal = await page.evaluate(() => window.probe.goals()[0]?.verb ?? null);
check("quest 12 has a goal", finalGoal === "Los geht's!", String(finalGoal));

// ── 8. A save from an older version ─────────────────────────
// Seed a version 3 save plus three coins and a prize hat, then reload onto the title screen
await page.evaluate(() => {
  localStorage.setItem("schatzkarten_save", JSON.stringify({ version: 3, milestone: 6, items: ["sword"], playerX: 0, playerY: 0, timestamp: 1 }));
  localStorage.setItem("schatzkarten_coins", JSON.stringify([0, 1, 2]));
  localStorage.setItem("schatzkarten_prizes", JSON.stringify(["fishingHat"]));
  localStorage.setItem("schatzkarten_hat", JSON.stringify("fishingHat"));
});
await page.goto(BASE);
await wait(4000);
check("an old save offers no Continue", (await page.evaluate(() => window.game.title.choices)).join() === "new");
const keep = () => page.evaluate(() => ({ coins: window.game.coins.collected, hats: window.game.wardrobe.prizes.size }));
const kept = await keep();
check("coins and hats are loaded with an old save", kept.coins === 3 && kept.hats === 1, JSON.stringify(kept));
await page.keyboard.press("Space");
await wait(3000);
const startedOver = await keep();
check("starting over keeps coins and hats", startedOver.coins === 3 && startedOver.hats === 1, JSON.stringify(startedOver));

// ── 8b. A running adventure ─────────────────────────────────
// The same coins and hat with a valid save: choosing a new game gives up the running one, and its finds with it
await page.evaluate(() => {
  localStorage.setItem("schatzkarten_save", JSON.stringify({ version: 4, milestone: 6, items: ["sword"], playerX: 0, playerY: 0, timestamp: 1 }));
  localStorage.setItem("schatzkarten_coins", JSON.stringify([0, 1, 2]));
  localStorage.setItem("schatzkarten_prizes", JSON.stringify(["fishingHat"]));
  localStorage.setItem("schatzkarten_hat", JSON.stringify("fishingHat"));
});
await page.goto(BASE);
await wait(4000);
check("a valid save offers Continue and a new game", (await page.evaluate(() => window.game.title.choices)).join() === "continue,new");
const running = await keep();
check("coins and hats are loaded with a valid save", running.coins === 3 && running.hats === 1, JSON.stringify(running));
await page.keyboard.press("ArrowDown");
await wait(150);
await page.keyboard.press("Space");
await wait(3000);
const abandoned = await keep();
check("a new game from a valid save clears coins and hats", abandoned.coins === 0 && abandoned.hats === 0, JSON.stringify(abandoned));

// ── 9. Mashing Space through the whole opening ──────────────
await page.evaluate(() => localStorage.clear());
await page.goto(BASE);
await wait(4000);
let mashing = true;
const masher = (async () => {
  while (mashing) {
    await page.keyboard.press("Space");
    await wait(60);
  }
})();
let seaSeen = 0;
const mashDone = await until(async () => {
  if (await hasObject("opening-sea")) seaSeen = seaSeen || Date.now();
  else if (seaSeen > 0 && seaSeen < 1e15) seaSeen = 1e15 + (Date.now() - seaSeen);
  return (await state()).free;
}, 120000, 50);
mashing = false;
await masher;
await wait(800);
s = await state();
const seaMs = seaSeen - 1e15;
check("mashing Space through the opening ends with the game free", mashDone);
check("mashing Space cannot skip the sea cinematic", seaMs > 5000 && seaMs < 12000, `${seaMs} ms`);
check("after mashing: quest 2, nothing open", s.milestone === 2 && s.free && !(await mapCardOpen()), JSON.stringify(s));
check("after mashing: Tadeo and Chuleta are at the landing pier", Math.hypot(s.x + 66, s.z - 47) < 3 && (await chuletaVisible()), JSON.stringify(s));
const mashed = await story();
check("after mashing: wreck on the sand", mashed.wreck);
check("after mashing: nothing of the opening is left", !(await hasObject("opening-sea")) && !(await hasObject("opening-beach")));
check("after mashing: the camera is back with Tadeo", await page.evaluate(() => {
  const g = window.game;
  return window.probe.cinematic === null && g.island.camera.position.distanceTo(g.island.player.position) < 25;
}));
await shot("20-after-mashing");
check("after mashing: no dialogue is open and the layer is down", !s.dialogue && (await layerIndex()) === "", `z-index "${await layerIndex()}"`);
await page.keyboard.down("ArrowRight");
await wait(500);
await page.keyboard.up("ArrowRight");
check("after mashing: Tadeo walks on an arrow press", Math.abs((await state()).x - s.x) > 0.5, `${s.x.toFixed(1)} -> ${(await state()).x.toFixed(1)}`);
check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
const passed = results.every((r) => r.ok);
writeFileSync(`${OUT}summary.json`, JSON.stringify({ passed, when: new Date().toISOString(), results, errors }, null, 2));
console.log(passed ? "\nPASS" : "\nFAIL", `→ ${OUT}summary.json`);
process.exit(passed ? 0 : 1);
