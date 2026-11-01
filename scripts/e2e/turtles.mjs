/**
 * E2E: the turtle family at the lagoon, played with real key presses. Tadeo finds a baby before he has met Frau Moos, so
 * it runs after him; she explains; it goes home. He then brings the others back in two trips, one of them with a jump
 * and a trip away from the island along the way. All five home starts the thank-you scene (Space mashed through it) and
 * earns the turtle hat. After that: she has other things to say, the hat and the babies survive a reload, and a new
 * adventure puts the babies back on the beach.
 *
 * Usage: node scripts/e2e/turtles.mjs [baseUrl]
 * Output: scripts/e2e/out/turtles/{*.png, summary.json, console.log}
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5199";
const OUT = "scripts/e2e/out/turtles";
const TIMEOUT_MS = 240_000;
/** Where the village path reaches the lagoon. */
const PATH_END = [80, 92];
/** Ways around the water from Frau Moos: the beaches in the south, the shore in the north and east. */
const TO_SOUTH_BEACH = [[83, 100], [84, 106]];
const TO_NORTH_SHORE = [[86, 84]];
const TO_EAST_BEACH = [[112, 85], [118, 90]];
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
const logs = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
  logs.push(`[${m.type()}] ${m.text()}`);
});
await page.addInitScript(() => {
  window.__fps = [];
  let n = 0;
  let t0 = performance.now();
  const tick = (t) => {
    n++;
    if (t - t0 >= 1000) {
      window.__fps.push(Math.round((n * 1000) / (t - t0)));
      n = 0;
      t0 = t;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const started = Date.now();
const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const openGame = async (query = "notitle") => {
  await page.goto(`${BASE}/?${query}`);
  await page.waitForFunction(() => window.game?.busy === false, null, { timeout: 90_000 });
};

const state = () =>
  page.evaluate(() => {
    const g = window.game;
    const p = g.island.player.position;
    const box = g.ui.dialogue;
    const status = document.querySelector(".status");
    const prompt = document.querySelector(".prompt");
    return {
      x: p.x,
      z: p.z,
      yaw: g.island.rig.yaw,
      busy: g.busy,
      family: g.family.state,
      dialogue: !!document.querySelector(".dialogue.open"),
      speaker: box.nameEl.textContent,
      text: box.full,
      portrait: box.portraitEl.textContent,
      pill: status && status.style.display !== "none" ? status.textContent : null,
      prompt: prompt && prompt.style.display !== "none" ? prompt.textContent : null,
      chuleta: g.chuletaBubble.speaking ? g.chuletaBubble.el.textContent : null,
      won: g.wardrobe.hasPrize("shellHat"),
      wearing: g.wardrobe.worn.has("shellHat"),
    };
  });

/** Her front edge, the lowest part of her on the screen, has to stay above the dialogue box. */
const frauMoosAboveTheBox = () =>
  page.evaluate(() => {
    const g = window.game;
    const [x, z] = g.family.state.mum;
    const cam = g.island.camera;
    const d = Math.hypot(cam.position.x - x, cam.position.z - z);
    const edge = g.island.player.position.clone();
    edge.set(x + ((cam.position.x - x) / d) * 1.3, g.family.mum.y, z + ((cam.position.z - z) / d) * 1.3).project(cam);
    return ((-edge.y * 0.5 + 0.5) * window.innerHeight) < document.querySelector(".dialogue").getBoundingClientRect().top;
  });

const count = (s, kind) => s.family.babies.filter((b) => b.state === kind).length;
const babyNearest = (s, kind = "lost") =>
  s.family.babies
    .map((b, i) => ({ ...b, i, d: Math.hypot(b.x - s.x, b.z - s.z) }))
    .filter((b) => b.state === kind)
    .sort((a, b) => a.d - b.d)[0];

const until = async (test, timeoutMs = 15_000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const s = await state();
    if (test(s)) return s;
    await wait(80);
  }
  return null;
};

/** Hold the arrow keys that walk from here towards (x, z), whichever way the camera looks. */
async function walkTo(x, z, stopWhen = (s) => Math.hypot(s.x - x, s.z - z) < 1.3, timeoutMs = 40_000) {
  const held = new Set();
  const t0 = Date.now();
  let s = await state();
  let last = { x: s.x, z: s.z, t: Date.now() };
  while (!stopWhen(s) && Date.now() - t0 < timeoutMs) {
    const dx = x - s.x;
    const dz = z - s.z;
    const d = Math.hypot(dx, dz) || 1;
    let right = (dx * Math.cos(s.yaw) + dz * Math.sin(s.yaw)) / d;
    let down = (-dx * Math.sin(s.yaw) + dz * Math.cos(s.yaw)) / d;
    // Reason: a palm or a crate can stop the straight line; step to the side for a moment
    if (Date.now() - last.t > 1200) [right, down] = [-down, right];
    if (Date.now() - last.t > 1800) last = { x: s.x, z: s.z, t: Date.now() };
    const want = new Set();
    if (right > 0.38) want.add("ArrowRight");
    if (right < -0.38) want.add("ArrowLeft");
    if (down > 0.38) want.add("ArrowDown");
    if (down < -0.38) want.add("ArrowUp");
    for (const k of [...held]) if (!want.has(k)) await page.keyboard.up(k), held.delete(k);
    for (const k of want) if (!held.has(k)) await page.keyboard.down(k), held.add(k);
    await wait(50);
    s = await state();
    if (Math.hypot(s.x - last.x, s.z - last.z) > 0.4) last = { x: s.x, z: s.z, t: Date.now() };
  }
  for (const k of held) await page.keyboard.up(k);
  return s;
}

const walkRoute = async (route) => {
  for (const [x, z] of route) await walkTo(x, z);
};

/** Walk up to the nearest lost baby until it runs after Tadeo. */
const fetchBaby = async () => {
  const s = await state();
  const baby = babyNearest(s);
  const found = s.family.found;
  await walkTo(baby.x, baby.z, (now) => now.family.found > found);
  return (await state()).family.found === found + 1;
};

/** Press Space until the dialogue is over, keeping every line that was shown. */
const readDialogue = async (seen = []) => {
  for (let i = 0; i < 60; i++) {
    const s = await state();
    if (!s.dialogue) return seen;
    if (seen.at(-1)?.text !== s.text) seen.push({ speaker: s.speaker, text: s.text, portrait: s.portrait });
    await page.keyboard.press("Space");
    await wait(160);
  }
  return seen;
};

const checks = {};

// ── Nobody on the island has met her yet ──────────────────────
await openGame();
let s = await state();
checks.startsWithFiveLost = count(s, "lost") === 5 && !s.family.asked;
checks.noPillAtTheStart = s.pill === null;
checks.noCoinOnFrauMoos = await page.evaluate(() => {
  const [x, z] = window.game.family.state.mum;
  return window.game.coins.spots.every((c) => Math.hypot(c.x - x, c.z - z) > 3);
});
await page.evaluate(([x, z]) => window.game.placePlayer(x, z), PATH_END);
await wait(1500);
await shot("01-arriving-at-the-lagoon");

// ── A baby follows before Tadeo has met her ───────────────────
const firstBaby = babyNearest(await state());
await walkTo(firstBaby.x, firstBaby.z, (n) => Math.hypot(n.x - firstBaby.x, n.z - firstBaby.z) < 6);
await shot("02-lost-baby-with-glint");
checks.firstBabyFollows = await fetchBaby();
s = await until((n) => n.chuleta !== null, 3000);
checks.chuletaAsksForTheMother = !!s?.chuleta?.includes("Mama");
s = await state();
checks.pillCountsFoundBabies = s.pill?.includes("1 / 5") === true;

// It keeps up, and copies Tadeo's jump a moment later
await walkTo(s.x - 9, s.z - 2);
s = await state();
const follower = babyNearest(s, "following");
checks.babyStaysClose = follower?.d < 3.5;
await shot("03-baby-follows");
await page.keyboard.down("ArrowUp");
await wait(250);
await page.keyboard.press("Space");
let hopped = false;
for (let i = 0; i < 16 && !hopped; i++) {
  const now = await state();
  hopped = now.family.babies.some((b) => b.state === "following" && b.lift > 0.1);
  await wait(50);
}
await page.keyboard.up("ArrowUp");
checks.babyCopiesTheJump = hopped;

// ── First talk ────────────────────────────────────────────────
const mum = s.family.mum;
s = await walkTo(mum[0] - 3, mum[1], (n) => n.prompt !== null);
checks.promptAtFrauMoos = s.prompt?.includes("Sprechen") === true;
checks.noDeliveryBeforeTheTalk = count(s, "following") === 1 && count(s, "home") === 0;
await page.keyboard.press("Space");
s = await until((n) => n.dialogue, 3000);
await wait(900);
await shot("04-frau-moos-talks");
checks.pillHidesDuringTalk = (await state()).pill === null;
const intro = await readDialogue();
checks.frauMoosHasAFace = intro.filter((l) => l.speaker === "Frau Moos").every((l) => l.portrait.includes("🐢"));
checks.introMentionsTheBabyAlongside = intro.some((l) => l.text.includes("Meinst du die hier"));
checks.babyGoesHomeAfterTheTalk = !!(await until((n) => count(n, "home") === 1, 8000));
await shot("05-first-baby-in-the-water");

// ── Two from the south beach, with a trip away from the island ─
await walkRoute(TO_SOUTH_BEACH);
checks.secondBabyFollows = await fetchBaby();
checks.thirdBabyFollows = await fetchBaby();
await shot("06-two-babies-in-a-line");
const beach = await state();
await page.evaluate(() => window.game.placePlayer(60, 46));
await wait(400);
s = await walkTo(60, 53);
checks.babiesComeAlongAfterATeleport = s.family.babies.filter((b) => b.state === "following").every((b) => Math.hypot(b.x - s.x, b.z - s.z) < 4);
await page.evaluate(([x, z]) => window.game.placePlayer(x, z), [beach.x, beach.z]);
await wait(400);
await walkRoute([...TO_SOUTH_BEACH].reverse());
await walkTo(mum[0] - 3, mum[1] + 2);
checks.twoMoreGoHome = !!(await until((n) => count(n, "home") === 3, 9000));

// Talking again gives a hint and no prize
s = await walkTo(mum[0] - 3, mum[1], (n) => n.prompt !== null);
await page.keyboard.press("Space");
await until((n) => n.dialogue, 3000);
const nudge = await readDialogue();
checks.secondTalkIsAHint = nudge.length > 0 && !nudge.some((l) => l.text.includes("weggelaufen")) && !(await state()).won;

// ── The last two, from the north shore and the far beach ──────
await walkRoute(TO_NORTH_SHORE);
checks.fourthBabyFollows = await fetchBaby();
await walkRoute(TO_EAST_BEACH);
checks.fifthBabyFollows = await fetchBaby();
s = await until((n) => n.chuleta !== null, 3000);
checks.chuletaSaysThatWasTheLast = !!s?.chuleta?.includes("letzte");
checks.pillSaysFiveOfFive = (await state()).pill?.includes("5 / 5") === true;
await shot("07-last-baby");
await walkRoute([...TO_EAST_BEACH].reverse());
await walkRoute(TO_NORTH_SHORE);

// ── All home: the scene starts on its own ─────────────────────
await walkTo(mum[0] - 3, mum[1] - 2, (n) => n.dialogue || Math.hypot(n.x - mum[0] + 3, n.z - mum[1] + 2) < 1);
s = await until((n) => n.dialogue, 12_000);
checks.thanksSceneStartsByItself = !!s;
await wait(1100);
await shot("08-thanks-with-the-babies-swimming");
const thanks = await readDialogue();
checks.thanksMentionsAllFive = thanks.some((l) => l.text.includes("Alle fünf"));
s = await until((n) => n.won, 6000);
checks.hatWon = !!s;
await wait(600);
await shot("09-new-outfit-banner");
s = await until((n) => n.chuleta !== null, 6000);
checks.chuletaCheersTheHat = !!s?.chuleta?.includes("Schildkröte");
checks.wearingTheHat = (await state()).wearing;
s = await until((n) => !n.busy, 8000);
checks.controlsFreeAgain = !!s;
checks.pillGoneAfterTheEnd = (await state()).pill === null;
await wait(2500);
await shot("10-hat-from-behind");

// She has something else to say now, and no second hat
const prizesBefore = await page.evaluate(() => localStorage.getItem("schatzkarten_prizes"));
s = await walkTo(mum[0] - 3, mum[1], (n) => n.prompt !== null);
await page.keyboard.press("Space");
await until((n) => n.dialogue, 3000);
const after = await readDialogue();
checks.afterTalkHasNoPrize = after.length === 1 && (await page.evaluate(() => localStorage.getItem("schatzkarten_prizes"))) === prizesBefore;
await until((n) => !n.busy, 4000);

// Whichever side Tadeo comes from, the talk shot shows her above the dialogue box
const framed = {};
for (const [side, dx, dz] of [["west", -3.2, 0], ["north-west", -2.4, -2.4], ["north", 0, -3.2], ["south-west", -2.4, 2.4], ["south", 0, 3.2]]) {
  await page.evaluate(([x, z]) => window.game.placePlayer(x, z), [mum[0] + dx, mum[1] + dz]);
  await wait(500);
  await page.keyboard.press("Space");
  await until((n) => n.dialogue, 3000);
  await wait(1100);
  await shot(`talk-from-${side}`);
  framed[side] = await frauMoosAboveTheBox();
  await readDialogue();
  await until((n) => !n.busy, 4000);
}
checks.frauMoosAboveTheBoxFromEverySide = Object.values(framed).every(Boolean);

// The story must carry on as normal after all this
checks.questUntouched = await page.evaluate(() => window.game.quest.currentMilestone === 2);
const fpsLog = await page.evaluate(() => window.__fps ?? []);

// ── A reload keeps the hat and the swimming babies ────────────
await openGame();
s = await state();
checks.reloadKeepsTheHat = s.won && s.wearing;
checks.reloadKeepsBabiesHome = count(s, "home") === 5;
await page.evaluate(([x, z]) => window.game.placePlayer(x, z), [mum[0] - 3, mum[1]]);
await wait(1500);
await shot("11-family-after-reload");

// ── A new adventure starts the quest over ─────────────────────
await page.evaluate(() => window.game.wardrobe.reset());
s = await until((n) => count(n, "lost") === 5 && !n.family.asked, 3000);
checks.newAdventureStartsOver = !!s;

// A close look at the hat and the family for the eye (no check)
await page.evaluate(() => {
  localStorage.setItem("schatzkarten_prizes", JSON.stringify(["shellHat"]));
  localStorage.setItem("schatzkarten_hat", JSON.stringify("shellHat"));
});
await page.goto(`${BASE}/?closeup&spawn=70,60`);
await page.waitForFunction(() => window.engine?.scene, null, { timeout: 90_000 });
await wait(2500);
await shot("12-hat-close-up");
await page.goto(`${BASE}/?cam=78,7,85,88,0.8,93`);
await page.waitForFunction(() => window.engine?.scene, null, { timeout: 90_000 });
await wait(2500);
await shot("13-family-close-up");

const missingVoices = logs.filter((l) => l.includes("[voice] no recording"));
checks.everyLineHasARecording = missingVoices.length === 0;
checks.noConsoleErrors = errors.length === 0;

const fps = fpsLog.slice(5);
const summary = {
  test: "turtles",
  passed: Object.values(checks).every(Boolean) && Date.now() - started < TIMEOUT_MS,
  checks,
  fps: { avg: fps.length ? Math.round(fps.reduce((a, b) => a + b, 0) / fps.length) : null, min: fps.length ? Math.min(...fps) : null, secondsBelow55: fps.filter((f) => f < 55).length },
  lines: { intro, nudge, thanks, after },
  missingVoices,
  durationSec: Math.round((Date.now() - started) / 1000),
  errors,
};
writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
writeFileSync(`${OUT}/console.log`, logs.join("\n"));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
process.exit(summary.passed ? 0 : 1);
