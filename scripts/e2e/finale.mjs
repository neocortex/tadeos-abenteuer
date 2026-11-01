/**
 * E2E proof for the last quest, played the way a child reaches it.
 *
 * It starts at `?challenge=sea` and sails the real chain with real key presses:
 * the shark, the treasure island (the map card, reached through the boat trip and
 * not by URL), the eruption, the black screen and the narrator's line. The save is
 * read on the black screen, and the finale scene is watched coming up with no reload.
 * Then it reloads the page and presses Continue, which proves the save. From there
 * Tadeo walks through "Los geht's!", climbs the volcano with the autopilot from
 * `volcanoPilot.mjs`, sets the heart back with Space, and the island celebrates:
 * festival, confession, fireworks, end card, save gone. A tab closed at the end card
 * leaves nothing for the next game.
 *
 * Run:  node scripts/e2e/finale.mjs [baseUrl]
 * Out:  scripts/e2e/out/finale/*.png + summary.json + console.log
 */

import { chromium } from "playwright";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { boatTrip } from "./boatTrip.mjs";
import { courseHands, pilot } from "./volcanoPilot.mjs";

const BASE = process.argv[2] ?? "http://localhost:5199";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out", "finale");
const NORTH_DOCK_END = [-36, -76];
const SAIL_BACK = "Tadeo segelt zurück, so schnell er kann.";
const HUETER_THANKS = "Danke, Tadeo. Jetzt kann ich endlich ruhen.";
const HUETER_LAST = "Leb wohl, Hüter!";
const STONE_LINE = "Da ist der alte Stein! Und das Loch wie ein Herz.";
const CALM_LINE = "Das Licht läuft durch den ganzen Berg. Dann wird der Vulkan ganz still.";
const OPENING_LAST = "Hoch lebe Tadeo! Er hat unsere Insel gerettet!";
const TALK_FIRST = "Ich muss euch etwas sagen";
const FESTIVAL_GUESTS = ["Oger", "Fuchs", "Käpt'n Paco", "Dorfältester", "Kleine Mia", "Fischer Jonas", "Bäckerin Lina", "Maulwurf", "Chuleta", "Tadeo"];
const FORBIDDEN = ["die Alten", "Altar", "ewiges Eis", "besänftigen"];
const MAX_WORDS = 14;
/** In the wide shot: a part of the cone with the lava river on it and no sky, column or word in it. */
const LAVA_ON_THE_CONE = [0.35, 0.4, 0.48, 0.66];
// Start from an empty folder so every screenshot belongs to this run
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
// Reason: other edits to the dev server's files would trigger a Vite full reload mid-run;
// a silent mock of the HMR websocket keeps this test's page stable
await page.routeWebSocket(/.*/, () => {});
const errors = [];
const steps = [];
const checks = [];
const logs = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
  logs.push(`[${m.type()}] ${m.text()}`);
});

const t0 = Date.now();
const log = (msg) => {
  const line = `[${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`;
  steps.push(line);
  console.log(line);
};
const check = (name, ok, detail = "") => {
  checks.push({ name, ok: !!ok, detail: String(detail) });
  log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== "" ? ` (${detail})` : ""}`);
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const sleep = (ms) => page.waitForTimeout(ms);
const dialogueOpen = () => page.evaluate(() => !!document.querySelector(".dialogue.open")).catch(() => false);
const shot = async (name) => {
  const png = await page.screenshot({ path: join(OUT, `${name}.png`) });
  log(`screenshot ${name}.png`);
  return png;
};

async function waitFor(fn, what, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn()) return;
    await sleep(80);
  }
  throw new Error(`timeout waiting for ${what}`);
}

/** Press Space until no dialogue is open (each press completes or advances a line). */
async function skipDialogues() {
  while (await dialogueOpen()) {
    await page.keyboard.press("Space");
    await sleep(260);
  }
}

/** Notes every dialogue line, read from the box itself, so a short line is never missed. */
async function recordLines() {
  await page.waitForFunction(() => window.game?.ui?.dialogue, null, { timeout: 30000 });
  await page.evaluate(() => {
    window.said = [];
    const box = Object.getPrototypeOf(window.game.ui.dialogue);
    const begin = box.showLine;
    box.showLine = function () {
      begin.call(this);
      window.said.push({ speaker: this.script[this.index].speaker, text: this.script[this.index].text });
    };
  });
}
const heard = () => page.evaluate(() => window.said);

const { holdKeys, heroState, crossPlainly } = courseHands(page);
const { playSea, playTreasure } = boatTrip({ page, check, shot, log, waitFor, dialogueOpen, holdKeys });

/** Frames the game really draws per second (the 60 fps cap can skip browser ticks). */
const drawRate = (ms) =>
  page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const input = window.engine.input;
        const begin = input.beginFrame;
        let drawn = 0;
        input.beginFrame = function () {
          drawn++;
          begin.call(input);
        };
        const start = performance.now();
        setTimeout(() => {
          input.beginFrame = begin;
          resolve((drawn * 1000) / (performance.now() - start));
        }, ms);
      }),
    ms,
  );

/** What part of a frame is made of. `box` is [left, top, right, bottom] as fractions of the frame. */
const frameStats = (png, box = [0, 0, 1, 1]) =>
  page.evaluate(
    async ({ b64, box }) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const g = canvas.getContext("2d");
      g.drawImage(bitmap, 0, 0);
      const [l, t] = [Math.round(box[0] * bitmap.width), Math.round(box[1] * bitmap.height)];
      const px = g.getImageData(l, t, Math.round(box[2] * bitmap.width) - l, Math.round(box[3] * bitmap.height) - t).data;
      const n = px.length / 4;
      let [r, gr, b, hot, warm] = [0, 0, 0, 0, 0];
      for (let i = 0; i < px.length; i += 4) {
        r += px[i];
        gr += px[i + 1];
        b += px[i + 2];
        // Reason: only lava's yellow-white core is this bright; the red sky has hardly any green, so it cannot count
        if (px[i] > 235 && px[i + 1] > 160) hot++;
        if (px[i] > 170 && px[i + 1] > 90 && px[i + 2] < 140) warm++;
      }
      return { r: Math.round(r / n), g: Math.round(gr / n), b: Math.round(b / n), bright: Math.round((r + gr + b) / 3 / n), hot, warm };
    },
    { b64: png.toString("base64"), box },
  );

const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("schatzkarten_save") ?? "null"));
const noSave = async () => (await saved()) === null;

/** The island as the flow sees it. */
const island = () =>
  page.evaluate(() => {
    const g = window.game;
    const p = g.island.player.position;
    const prompt = document.querySelector(".prompt");
    return {
      player: [p.x, p.z],
      milestone: g.quest.currentMilestone,
      free: !g.busy && !g.ui.dialogue.isOpen && !window.engine.isSwitching,
      onIsland: window.engine.scene === g.island,
      prompt: prompt?.style.display !== "none" ? prompt?.textContent.trim() : "",
      rumble: g.story.e2e?.lastRumble ?? g.story.lastRumble,
    };
  });

/** Reload onto the title screen and choose Continue. */
async function reloadAndContinue() {
  await page.goto(BASE);
  await page.waitForFunction(() => window.game?.title, null, { timeout: 40000 });
  const choices = await page.evaluate(() => window.game.title.choices);
  if (choices[0] !== "continue") throw new Error(`no Continue on the title screen: ${choices}`);
  await sleep(600);
  await page.keyboard.press("Space");
  await waitFor(async () => (await island()).free, "the island to be free after Continue", 20000);
  await sleep(500);
}

/** Press Space through the whole opening of a new game, until Tadeo can walk. */
async function playThroughOpening() {
  const end = Date.now() + 120000;
  while (Date.now() < end) {
    if ((await page.evaluate(() => !window.game.busy && !window.game.ui.dialogue.isOpen && !window.engine.isSwitching)) === true) return;
    await page.keyboard.press("Space");
    await sleep(120);
  }
  throw new Error("the opening of the next game did not end");
}

// ── The climb ─────────────────────────────────────────────────

const heroHasHeart = () =>
  page.evaluate(() => {
    let found = false;
    window.engine.scene.hero.avatar.root.traverse((o) => {
      if (o.name === "feuerherz" && o.visible) found = true;
    });
    return found;
  });

/** How big the heart on Tadeo's back is on screen, in pixels, at the follow camera. */
const heartOnScreen = () =>
  page.evaluate(() => {
    const sc = window.engine.scene;
    const heart = sc.carriedHeart;
    const THREE_V = heart.position.constructor;
    const at = heart.getWorldPosition(new THREE_V());
    const size = heart.getWorldScale(new THREE_V()).x;
    const a = at.clone().project(sc.camera);
    const b = at.clone().add(new THREE_V(0, size, 0)).project(sc.camera);
    return Math.abs(a.y - b.y) * 0.5 * innerHeight;
  });

/** Climbs to the stone. Steps into a warning circle once, to prove the kind restart. */
async function climb() {
  let mode = "avoid";
  let hitCheck = null;
  let seekStart = 0;
  let last = null;
  const end = Date.now() + 240000;
  while (Date.now() < end) {
    const s = await page.evaluate(pilot, mode);
    if (!s) throw new Error("the finale scene vanished during the climb");
    last = s;
    if (s.state === "won") break;
    if (s.dialogue) {
      await holdKeys([]);
      await skipDialogues();
      continue;
    }
    if (mode === "avoid" && s.checkpoint >= 1 && !hitCheck && !seekStart) {
      mode = "seek";
      seekStart = Date.now();
    }
    if (mode === "seek" && Date.now() - seekStart > 45000) throw new Error("no hit while seeking a circle");
    if (mode === "seek" && s.state === "ouch") {
      await holdKeys([]);
      await sleep(100);
      await shot("03_climb_autsch");
      await waitFor(async () => (await heroState()).state === "play", "the respawn", 5000);
      const cp = await page.evaluate(() => {
        const sc = window.engine.scene;
        const p = sc.course.checkpoints[sc.checkpoint].pos;
        return [p.x, p.y];
      });
      const h = await heroState();
      hitCheck = { d: dist(cp, [h.x, h.z]), heart: await heroHasHeart() };
      mode = "avoid";
      continue;
    }
    if (mode === "avoid" && s.state === "play" && s.atCrossing >= 0) {
      await crossPlainly();
      continue;
    }
    await holdKeys(s.state === "play" ? s.keys : []);
    await sleep(30);
  }
  await holdKeys([]);
  if (last?.state !== "won") throw new Error(`goal not reached (s=${last?.s?.toFixed(1)})`);
  return { hits: last.hits, hitCheck };
}

/** Names of the guests a shot actually has in frame (their middle projected inside the screen). */
const guestsInFrame = () =>
  page.evaluate(() => {
    const sc = window.engine.scene;
    const inFrame = [];
    for (const g of sc.guests) {
      const v = g.object.position.clone();
      g.object.getWorldPosition(v);
      v.y += 0.6;
      v.project(sc.camera);
      if (Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1) inFrame.push(g.name);
    }
    return inFrame;
  });

/** Where a thing stands in the frame: normalised device coordinates, plus whether it is in front of the camera. */
const projectedInFrame = (what) =>
  page.evaluate((what) => {
    const sc = window.engine.scene;
    const f = sc.feast;
    const V = sc.camera.position.constructor;
    const world = {
      ogreHead: () => f.ogre.head.getWorldPosition(new V()),
      plan: () => f.plan.getWorldPosition(new V()),
      elder: () => sc.stage.crowd.sages.elder.avatar.root.getWorldPosition(new V()).add(new V(0, 1.4, 0)),
      paco: () => f.paco.avatar.root.getWorldPosition(new V()).add(new V(0, 1.4, 0)),
    }[what]();
    const v = world.project(sc.camera);
    const box = document.querySelector(".dialogue.open")?.getBoundingClientRect();
    // Reason: the dialogue box covers the bottom of the frame; a thing under it is not in the picture
    const px = ((1 - v.y) / 2) * innerHeight;
    return { x: v.x, y: v.y, inFrame: Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95 && v.z < 1, aboveBox: !box || px < box.top };
  }, what);

/** Where everyone stands, to tell a still picture from a moving one. */
const guestSpots = () =>
  page.evaluate(() => {
    const V = window.engine.scene.camera.position.constructor;
    return window.engine.scene.guests.map((g) => g.object.getWorldPosition(new V()).toArray());
  });

/** Space every 60 ms until `done()` says so: separate presses, as a child mashing the key makes them. */
async function mashUntil(done, what, timeout = 240000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await done()) return;
    await page.keyboard.press("Space");
    await sleep(60);
  }
  throw new Error(`timeout mashing until ${what}`);
}

// ── Play ──────────────────────────────────────────────────────

let passed = false;
let fps = 0;
try {
  // ── The loader knows both new scenes ──────────────────────
  await page.goto(`${BASE}/?notitle`);
  await page.waitForFunction(() => window.game?.island, null, { timeout: 40000 });
  const loader = await page.evaluate(async () => {
    const { loadChallenge } = await import("/src/challenges/registry.ts");
    const out = {};
    for (const name of ["finale", "festival"]) {
      try {
        out[name] = typeof (await loadChallenge(name));
      } catch (e) {
        out[name] = e.message;
      }
    }
    return out;
  });
  check("the loader finds the finale and the festival", loader.finale === "function" && loader.festival === "function", JSON.stringify(loader));
  if (loader.finale !== "function" || loader.festival !== "function") throw new Error(`loader: ${JSON.stringify(loader)}`);

  // ── ?challenge=finale: the mode ───────────────────────────
  await page.goto(`${BASE}/?challenge=finale`);
  await waitFor(() => page.evaluate(() => !!window.engine?.scene?.director && !!window.engine.scene.mode?.carriesHeart).catch(() => false), "the finale scene", 40000);
  await waitFor(dialogueOpen, "the finale's first line", 20000);
  const mode = await page.evaluate(async () => {
    const { RESCUE } = await import("/src/challenges/volcano/modes.ts");
    const sc = window.engine.scene;
    const hsl = (c) => c.getHSL({ h: 0, s: 0, l: 0 });
    // Reason: the finale's zenith is also much darker, so "redder" is red's share of the colour, not its amount
    const redShare = (c) => c.r / (c.r + c.g + c.b);
    return {
      start: sc.director.intervalAt(0),
      end: sc.director.intervalAt(1),
      zenith: { finale: sc.mode.sky.zenith.getHexString(), rescue: RESCUE.sky.zenith.getHexString() },
      zenithRedder: redShare(sc.mode.sky.zenith) > redShare(RESCUE.sky.zenith),
      horizonRedder: redShare(sc.mode.sky.horizon) > redShare(RESCUE.sky.horizon),
      zenithDarker: hsl(sc.mode.sky.zenith).l < hsl(RESCUE.sky.zenith).l,
    };
  });
  const redSky = await frameStats(await shot("02_red_sky_at_the_start"), [0, 0, 1, 0.3]);
  check(
    "the sky is redder and the rate is back to today's",
    mode.start === 1.15 && mode.end === 0.6 && mode.zenithRedder && mode.horizonRedder && mode.zenithDarker && redSky.r > redSky.b + 20,
    `${mode.start}→${mode.end}, ${mode.zenith.rescue}→${mode.zenith.finale}, sky on screen r${redSky.r} g${redSky.g} b${redSky.b}`,
  );

  // ── Continue at 11 goes to the dock ───────────────────────
  await page.evaluate(() => localStorage.setItem("schatzkarten_save", JSON.stringify({ version: 4, milestone: 11, items: [], playerX: -36, playerY: -76, timestamp: Date.now() })));
  await reloadAndContinue();
  const at11 = await island();
  check("Continue at 11 goes to the dock", at11.milestone === 11 && dist(at11.player, NORTH_DOCK_END) < 6 && at11.prompt.includes("Los geht's"), JSON.stringify(at11));
  await page.evaluate(() => localStorage.removeItem("schatzkarten_save"));

  // ── The chain: the sea runs on into the treasure, and the eruption into the finale ──
  await page.goto(`${BASE}/?challenge=sea`);
  await recordLines();
  await playSea();
  const mapCardSeen = await playTreasure();
  check("through the boat trip, the map card shows", mapCardSeen);
  await waitFor(() => page.evaluate((line) => window.game.ui.dialogue.full === line, SAIL_BACK), "the narrator's line over black", 15000);
  await sleep(1500);
  const blackPng = await shot("04_black_and_the_narrator");
  const black = await frameStats(blackPng, [0, 0, 1, 0.55]);
  const box = await page.evaluate(() => {
    const el = document.querySelector(".dialogue.open");
    const r = el?.getBoundingClientRect();
    return r ? [r.left / innerWidth, r.top / innerHeight, r.right / innerWidth, r.bottom / innerHeight] : null;
  });
  const boxStats = box ? await frameStats(blackPng, box) : { bright: 0 };
  check("the narrator's line stands on black", black.bright < 4 && boxStats.bright > 40, `above the box ${black.bright}, the box ${boxStats.bright}`);
  check("no end card and no walk between the eruption and the finale", !(await page.isVisible(".endcard")) && !(await page.evaluate(() => window.engine.scene === window.game.island)));
  const line = await heard();
  check("the narrator says it", line.some((l) => l.speaker === "Erzähler" && l.text === SAIL_BACK));
  // Reason: read while the line is still up, because a tab closed on this black screen must not lose the treasure
  const save12 = await saved();
  check("the treasure saved quest 12 before the black screen", save12?.milestone === 12, JSON.stringify(save12));
  await skipDialogues();
  await waitFor(() => page.evaluate(() => !!window.engine.scene?.mode?.carriesHeart).catch(() => false), "the finale scene after the treasure", 30000);
  log("the finale scene started straight from the treasure island");

  // ── The child's own way on: the same page, no reload ──────
  await waitFor(() => page.evaluate(() => !window.engine.isSwitching), "the fade into the finale", 10000);
  await sleep(300);
  const onward = await frameStats(await shot("04b_finale_without_a_reload"), [0, 0, 1, 0.55]);
  check("without a reload the black lifts and the climb is on screen", onward.bright > 40, `above the box ${onward.bright}`);
  const layerOrder = await page.evaluate(() => window.game.ui.layer.style.zIndex);
  check("the UI is back behind the fade", layerOrder === "", JSON.stringify(layerOrder));

  // ── Continue at 12 ────────────────────────────────────────
  await reloadAndContinue();
  const gate = await page.evaluate(async () => {
    const { LANDMARKS } = await import("/src/world/layout.ts");
    return LANDMARKS.volcanoGate;
  });
  const at12 = await island();
  check("Continue at 12 goes to the volcano gate", at12.milestone === 12 && dist(at12.player, gate) < 6 && at12.prompt.includes("Los geht's"), JSON.stringify(at12));
  check("the strongest rumble greets him there", at12.rumble === 1, at12.rumble);
  await shot("05_continue_at_the_gate");
  // Jonas stands far from the gate; the walk is not what is tested here
  await page.evaluate(() => {
    const g = window.game;
    const jonas = g.npcs.get("villager0").position;
    g.placePlayer(jonas.x + 1.6, jonas.z + 0.6);
  });
  await sleep(700);
  const atJonas = await island();
  await page.keyboard.press("Space");
  await sleep(500);
  const canTalkToJonas = atJonas.prompt.includes("Angeln") && (await dialogueOpen());
  check("side games are not locked at 12", canTalkToJonas, JSON.stringify(atJonas));
  // Reason: with every coin and two prize hats in hand, the end card further down has something to leave behind
  await page.evaluate(() => {
    localStorage.setItem("schatzkarten_coins", JSON.stringify([...Array(30).keys()]));
    localStorage.setItem("schatzkarten_prizes", JSON.stringify(["fishingHat", "crown"]));
    localStorage.setItem("schatzkarten_hat", JSON.stringify("fishingHat"));
  });
  await reloadAndContinue();

  // ── Through the gate and up the volcano ───────────────────
  await recordLines();
  await page.keyboard.press("Space");
  await waitFor(() => page.evaluate(() => !!window.engine.scene?.mode?.carriesHeart).catch(() => false), "the finale through the gate", 30000);
  log("through Los geht's");
  await waitFor(dialogueOpen, "the finale's first line", 20000);
  await sleep(500);
  await shot("06_finale_opening");
  await skipDialogues();
  await waitFor(() => page.evaluate(() => window.engine.scene.state === "play"), "play", 10000);
  await sleep(1600);
  check("Tadeo carries the heart", await heroHasHeart());
  const heartPx = await heartOnScreen();
  check("the heart reads at a glance at the follow camera", heartPx > 30, `${heartPx.toFixed(0)} px`);
  await shot("07_climb_with_the_heart");
  const climbed = await climb();
  check("a hit restarts kindly at the checkpoint and he keeps the heart", climbed.hitCheck && climbed.hitCheck.d < 1.5 && climbed.hitCheck.heart, JSON.stringify(climbed.hitCheck));
  log(`reached the stone with ${climbed.hits} hits`);

  // ── At the stone ──────────────────────────────────────────
  const hollowEmpty = await page.evaluate(() => !window.engine.scene.set.altar.heart.visible);
  await waitFor(() => page.evaluate((l) => window.game.ui.dialogue.full === l, STONE_LINE), "the stone's first line", 30000);
  const beforePrompt = await page.evaluate(() => ({ prompt: window.engine.scene.prompt, shown: document.querySelector(".prompt")?.style.display !== "none" }));
  check("the stone is told before the prompt", beforePrompt.prompt === null && !beforePrompt.shown, JSON.stringify(beforePrompt));
  await skipDialogues();
  await waitFor(() => page.evaluate(() => !!window.engine.scene.prompt), "the prompt at the stone", 15000);
  check("the distance pill is gone at the stone", !(await page.isVisible(".status")));
  await sleep(1200);
  await shot("08_at_the_stone");
  await sleep(1500);
  const waiting = await page.evaluate(() => ({ prompt: window.engine.scene.prompt?.verb, inHollow: window.engine.scene.set.altar.heart.visible, onBack: !!window.engine.scene.carriedHeart?.parent, shown: document.querySelector(".prompt")?.style.display !== "none" }));
  check("the stone waits for the child's own press", hollowEmpty && !waiting.inHollow && waiting.onBack && waiting.shown, JSON.stringify(waiting));
  // Reason: wraps the launcher, so a bomb thrown after the heart is home cannot go unnoticed between two looks
  await page.evaluate(() => {
    const bombs = window.engine.scene.bombs;
    const launch = bombs.launch;
    window.launches = 0;
    bombs.launch = function (...args) {
      window.launches++;
      return launch.apply(this, args);
    };
  });
  await page.keyboard.press("Space");
  await sleep(450);
  await shot("09_heart_flying_in");
  const stage = () =>
    page.evaluate(() => {
      const sc = window.engine.scene;
      return { phase: sc.ending?.phase, inHollow: sc.set.altar.heart.visible, cool: sc.ending?.cool.value, reveal: sc.ending?.rainbowReveal, stopped: sc.director.stopped, flying: sc.bombs.flying.length, launches: window.launches, dialogue: !!document.querySelector(".dialogue.open"), hueter: sc.ending?.hueter.root.visible };
    });
  await waitFor(async () => (await stage()).inHollow, "the heart in the hollow", 8000);
  await sleep(120);
  await shot("10_heart_home_light");
  const home = await stage();
  check("the heart goes into the hollow", home.inHollow && !(await heroHasHeart()), JSON.stringify(home));
  check("the rocks in the air are gone the moment the heart is home", home.stopped && home.flying === 0, `stopped ${home.stopped}, flying ${home.flying}`);
  await sleep(700);
  await shot("11_light_column");
  await waitFor(async () => (await stage()).phase === "wide", "the wide shot", 10000);
  await sleep(1300);
  const pngHot = await shot("12_wide_still_hot");
  const hotBefore = await frameStats(pngHot);
  const lavaBefore = await frameStats(pngHot, LAVA_ON_THE_CONE);
  await waitFor(async () => (await stage()).phase === "calm", "the calm to begin", 10000);
  await sleep(1800);
  await shot("13_lava_dimming");
  await waitFor(async () => (await stage()).cool >= 1, "the lava to cool", 15000);
  await waitFor(async () => (await stage()).reveal >= 1, "the rainbow to have risen", 8000);
  await sleep(200);
  const pngCalm = await shot("14_rainbow");
  const hotAfter = await frameStats(pngCalm);
  const lavaAfter = await frameStats(pngCalm, LAVA_ON_THE_CONE);
  const after = await stage();
  const lavaMaterial = await page.evaluate(() => {
    const out = [];
    window.engine.scene.scene.traverse((o) => {
      if (o.name.startsWith("lava-river") || o.name === "crater-lake") out.push(o.material.uniforms.uCool.value);
    });
    return out;
  });
  check("the rocks stop and the lava dims", after.stopped && after.flying === 0 && after.launches === home.launches && lavaMaterial.every((v) => v === 1) && lavaAfter.hot < lavaBefore.hot * 0.5, `flying ${after.flying}, launches before the heart was home ${home.launches} and by now ${after.launches}, white-hot pixels on the cone ${lavaBefore.hot}→${lavaAfter.hot}`);
  check("the sky clears", hotAfter.b > hotBefore.b + 15 || hotAfter.bright > hotBefore.bright + 15, `r${hotBefore.r} g${hotBefore.g} b${hotBefore.b} → r${hotAfter.r} g${hotAfter.g} b${hotAfter.b}`);
  check("the rainbow rises", after.reveal >= 1, after.reveal);
  await waitFor(() => page.evaluate((l) => window.game.ui.dialogue.full === l, CALM_LINE), "the calm told", 30000);
  const calmAt = await page.evaluate(() => ({ phase: window.engine.scene.ending.phase, cool: window.engine.scene.ending.cool.value, ghost: window.engine.scene.ending.hueter.root.visible }));
  check("it is calm before the Hüter rises", calmAt.phase === "calm" && calmAt.cool >= 1 && calmAt.ghost === false, JSON.stringify(calmAt));
  await skipDialogues();
  await waitFor(dialogueOpen, "the Hüter's thanks", 30000);
  await sleep(900);
  await shot("15_hueter_thanks");
  const smiling = await page.evaluate(() => window.engine.scene.ending.hueter.smiling);
  check("the Hüter smiles when he thanks Tadeo", smiling === true);
  while ((await page.evaluate(() => window.game.ui.dialogue.full)) !== HUETER_LAST) {
    await page.keyboard.press("Space");
    await sleep(260);
  }
  const ghostOnLast = await page.evaluate(() => window.engine.scene.ending.hueter.root.visible);
  check("the Hüter is still there on his last line", ghostOnLast === true);
  await skipDialogues();
  await sleep(1400);
  await shot("16_hueter_fading");
  await waitFor(() => page.evaluate(() => window.engine.scene.ending?.hueter.root.visible === false).catch(() => true), "the Hüter to be gone", 8000);
  const lines1 = (await heard()).map((l) => l.text);
  const hueterGone = await page.evaluate(() => window.engine.scene.ending?.hueter.root.visible === false).catch(() => false);
  check("the Hüter fades", hueterGone && lines1.includes(HUETER_THANKS), `gone ${hueterGone}`);
  await sleep(1500);
  await shot("17_geschafft_with_the_rainbow");

  // ── The festival ──────────────────────────────────────────
  await waitFor(() => page.evaluate(() => window.engine.scene?.state?.phase === "talk").catch(() => false), "the festival", 30000);
  const presentAt = await page.evaluate(() => window.engine.scene.state);
  check("the festival is at night with everyone", FESTIVAL_GUESTS.every((n) => presentAt.present.includes(n)), presentAt.present.join(", "));
  check("no fireworks while they talk", presentAt.fireworks === false);
  await page.waitForFunction(() => window.engine.scene.atWide, null, { timeout: 15000, polling: "raf" });
  await sleep(400);
  const nightPng = await shot("18_festival_night_wide");
  const nightSky = await frameStats(nightPng, [0.05, 0, 0.95, 0.14]);
  const nightAll = await frameStats(nightPng);
  check("the sky is night blue", nightSky.bright < 70 && nightSky.b > nightSky.r, `r${nightSky.r} g${nightSky.g} b${nightSky.b}`);
  check("the fire and lanterns stand out warm against it", nightAll.warm > 3000, nightAll.warm);
  const framed = await guestsInFrame();
  check("the wide shot has everyone in frame", FESTIVAL_GUESTS.every((n) => framed.includes(n)), framed.join(", "));
  check("the drums and answer stones are gone", await page.evaluate(() => !window.engine.scene.stage.drums.group.visible && !window.engine.scene.stage.stones.group.visible));
  const crowned = await page.evaluate(() => {
    let crown = false;
    window.engine.scene.stage.tadeo.avatar.head.traverse((o) => {
      if (o.name === "crown" && o.visible) crown = true;
    });
    return crown;
  });
  check("Tadeo wears the crown", crowned);
  // Each moment waits for the camera to settle, takes its picture, and then proves what the line asks for
  const moments = {
    [OPENING_LAST]: { name: "18b_festival_opening", run: async () => {
      const seen = await page.evaluate(() => {
        const sc = window.engine.scene;
        return { cheering: sc.stage.crowd.cheering, pacoSeated: sc.stage.crowd.watchers.find((w) => w.actor === sc.feast.paco).sitting };
      });
      check("the festival opens with the cheer", seen.cheering && seen.pacoSeated, JSON.stringify(seen));
    } },
    "das war ich": { name: "19_paco_confesses" },
    "Auf einmal ist es ganz still": { name: "festival_still", before: async () => ({ spots: await guestSpots() }), run: async (ctx) => {
      await sleep(700);
      const after = await guestSpots();
      const moved = Math.max(...after.map((p, i) => Math.hypot(p[0] - ctx.spots[i][0], p[2] - ctx.spots[i][2])));
      const framed = await guestsInFrame();
      check("wide on the stillness", moved < 0.05 && FESTIVAL_GUESTS.every((n) => framed.includes(n)), `most moved ${moved.toFixed(3)}, in frame ${framed.length}`);
    } },
    "P wie Paco": { name: "20_p_wie_paco" },
    "gut gemacht": { name: "21_elder_forgives" },
    "Gold ist": { name: "22_gold_for_the_village" },
    "Und ich? Gibt es auch Kuchen": { name: "festival_ogre", run: async () => {
      const at = await projectedInFrame("ogreHead");
      check("the camera is on the ogre", at.inFrame && at.aboveBox, JSON.stringify(at));
    } },
    "Und das hier war auch in der Truhe": { name: "22b_plan_comes_out", wait: 400, run: async () => {
      check("the plan comes out", await page.evaluate(() => window.engine.scene.feast.plan.visible));
    } },
    "Zeig mal her": { name: "23_rocket_plan", run: async () => {
      const [elder, paco] = [await projectedInFrame("elder"), await projectedInFrame("paco")];
      check("the elder takes over", elder.inFrame && Math.abs(elder.x) < 0.5 && Math.abs(elder.x) < Math.abs(paco.x), `elder x ${elder.x.toFixed(2)}, Paco x ${paco.x.toFixed(2)}`);
    } },
    "Eine alte Legende": { name: "festival_plan", run: async () => {
      const plan = await projectedInFrame("plan");
      const visible = await page.evaluate(() => window.engine.scene.feast.plan.visible);
      check("the drawing is in the picture", visible && plan.inFrame && plan.aboveBox, JSON.stringify(plan));
    } },
    "goldenes Ei": { name: "24_golden_egg" },
    "schaut hinauf zu den Sternen": { name: "24b_stars", run: async () => {
      const pitch = await page.evaluate(() => window.engine.scene.stage.tadeo.avatar.head.rotation.x);
      check("Tadeo looks at the stars", pitch < -0.3, pitch.toFixed(2));
    } },
  };
  const festivalEnd = Date.now() + 180000;
  while (Date.now() < festivalEnd) {
    const open = await dialogueOpen();
    const st = await page.evaluate(() => window.engine.scene?.state?.phase).catch(() => null);
    if (st === "party") break;
    if (open) {
      const current = await page.evaluate(() => window.game.ui.dialogue.full);
      for (const [text, m] of Object.entries(moments)) {
        if (current.includes(text)) {
          delete moments[text];
          const ctx = m.before ? await m.before() : {};
          await sleep(m.wait ?? 1300);
          await shot(m.name);
          await m.run?.(ctx);
        }
      }
      await page.keyboard.press("Space");
      await sleep(260);
    } else {
      await sleep(100);
    }
  }
  check("every moment of the festival was met", Object.keys(moments).length === 0, Object.keys(moments).join(" | "));
  const all = await heard();
  const lines = all.map((l) => l.text);
  check("Paco confesses", all.some((l) => l.speaker === "Käpt'n Paco" && l.text.includes("das war ich")));
  check("P wie Paco", lines.includes("P wie Paco!"));
  const beatsFired = await page.evaluate(async () => {
    const { DIALOGUES } = await import("/src/data/dialogues.ts");
    return { fired: window.engine.scene.feast.beatsFired, lines: DIALOGUES.festival_talk.length };
  });
  check("every festival line has its own beat", beatsFired.fired === beatsFired.lines && beatsFired.lines === 25, JSON.stringify(beatsFired));
  check("the rocket plan and the golden egg", lines.some((l) => l.includes("Rakete")) && lines.some((l) => l.includes("goldenes Ei")));
  const wordy = all.filter((l) => l.text.split(/\s+/).length > MAX_WORDS).map((l) => l.text);
  check(`no line of the last quest is longer than ${MAX_WORDS} words`, wordy.length === 0, wordy.join(" | "));
  // Reason: "..." is a pause inside a sentence, not the end of one
  const longLines = all.filter((l) => l.text.replace(/\.\.\./g, " ").split(/[.!?]+\s*/).filter(Boolean).length > 3).map((l) => l.text);
  check("every line is a few short sentences", longLines.length === 0, longLines.join(" | "));
  const forbidden = lines.filter((l) => FORBIDDEN.some((w) => l.includes(w)));
  check("no forbidden words", forbidden.length === 0, forbidden.join(" | "));

  // ── The party under the end card ──────────────────────────
  await waitFor(() => page.isVisible(".endcard"), "the end card", 10000);
  await sleep(1500);
  const party = await page.evaluate(() => window.engine.scene.state);
  check("the party loops: fireworks are on", party.phase === "party" && party.fireworks === true, JSON.stringify(party));
  const card = await page.textContent(".endcard");
  check("end card says the island is saved", card.includes("Du hast die Insel gerettet!"), card.replace(/\s+/g, " ").trim());
  check("the end card counts the coins he found", card.includes("Goldmünzen: 30 / 30"), card.match(/Goldmünzen: [^\s]+ \/ \d+/)?.[0]);
  check("the end card promises the rocket and the mended boat", card.includes("Rakete") && card.includes("Boot"));
  check("save is gone after the end", await noSave());
  await sleep(2600);
  await shot("25_end_card_fireworks");
  const sparks = await page.evaluate(() => window.engine.scene.fireworks.sparks.alive ?? null);
  fps = await drawRate(3000);
  let baselineFps = 57.7;
  try {
    baselineFps = Number(readFileSync(join(HERE, "out", "baseline.txt"), "utf8").match(/drawRate ([\d.]+)/)[1]);
  } catch {
    // Reason: the baseline file is a local proof, not in git; a fresh clone falls back to the number it held
  }
  check("runs at the baseline fps at the festival", fps >= baselineFps - 3, `${fps.toFixed(1)}, baseline ${baselineFps}, sparks ${sparks}`);

  // ── The tab is closed at the end card, with no Space ──────
  await page.goto(BASE);
  await page.waitForFunction(() => window.game?.title, null, { timeout: 40000 });
  check("a tab closed at the end card comes back with no Continue", (await page.evaluate(() => window.game.title.choices)).join() === "new");
  await sleep(600);
  await page.keyboard.press("Space");
  await playThroughOpening();
  const fresh = await page.evaluate(() => {
    const { coins, wardrobe } = window.game;
    // Reason: a coin that was taken has its instance scaled to nothing; the first column of its matrix is how big it is
    const sizes = coins.spots.map((_, i) => Math.hypot(...coins.body.instanceMatrix.array.slice(i * 16, i * 16 + 3)));
    return { coins: coins.collected, findable: sizes.filter((s) => s > 0.5).length, of: coins.spots.length, hats: wardrobe.prizes.size, hat: wardrobe.hat, worn: wardrobe.worn.size };
  });
  check("the next game starts with no coins, and all of them can be found", fresh.coins === 0 && fresh.findable === 30 && fresh.of === 30, JSON.stringify(fresh));
  check("the next game starts with no prize hats", fresh.hats === 0 && fresh.hat === null && fresh.worn === 0, JSON.stringify(fresh));

  // ── Space on the end card ─────────────────────────────────
  // Reason: the festival is the same way to the card, and it was just walked; this is the card's own way out
  await page.evaluate(async () => {
    const { playEnding } = await import("/src/game/ending.ts");
    const g = window.game;
    // Reason: a free Tadeo jumps on Space, and the card never hears it; on the way to the card the game is always busy
    g.busy = true;
    void playEnding(g.ui, window.engine.input, g.coins, g.wardrobe);
  });
  await waitFor(() => page.isVisible(".endcard"), "the end card again", 10000);
  await sleep(2700);
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.game?.title, null, { timeout: 40000 });
  check("Space on the end card starts the game again, with no Continue", (await page.evaluate(() => window.game.title.choices)).join() === "new");

  // ── Mashing Space from the stone on: the ending, then the festival ──
  await page.goto(`${BASE}/?challenge=finale`);
  await recordLines();
  await mashUntil(() => page.evaluate(() => window.engine.scene?.state === "play").catch(() => false), "the climb to open", 60000);
  await page.evaluate(() => {
    const sc = window.engine.scene;
    const p = sc.course.pointAt(sc.course.goalS + 4);
    sc.hero.teleport(p.x, p.y);
  });
  const sawGhost = { up: false, gone: false };
  const ghostAndPhase = () =>
    page.evaluate(() => {
      const sc = window.engine.scene;
      return { ghost: sc.ending?.hueter.root.visible ?? null, festival: sc.state?.phase ?? null };
    });
  await mashUntil(async () => {
    const g = await ghostAndPhase();
    if (g.ghost === true) sawGhost.up = true;
    if (sawGhost.up && g.ghost === false) sawGhost.gone = true;
    return g.festival !== null;
  }, "the festival to start");
  const mashedEnding = (await heard()).map((l) => l.text);
  check("mashing Space through the ending", sawGhost.up && sawGhost.gone && mashedEnding.includes(STONE_LINE) && mashedEnding.includes(CALM_LINE) && mashedEnding.includes(HUETER_LAST), JSON.stringify(sawGhost));
  await mashUntil(() => page.isVisible(".endcard"), "the end card");
  const mashedRead = () =>
    page.evaluate(() => {
      const sc = window.engine.scene;
      const cam = sc.camera.position;
      return { phase: sc.state.phase, orbitRadius: Math.hypot(cam.x, cam.z + 2.5), beats: sc.feast.beatsFired, tracking: sc.stage.director.tracker !== null };
    });
  // Reason: the end card comes while the camera is still gliding out to the party's circle
  await waitFor(async () => Math.abs((await mashedRead()).orbitRadius - 14.5) < 1.2, "the camera back on the party's circle", 12000).catch(() => {});
  const mashedFestival = await mashedRead();
  const mashedCard = await page.textContent(".endcard");
  // Reason: the party's camera orbits the fire at 14.5; a camera left on a close-up would be far from that circle
  check(
    "mashing Space through the festival",
    mashedFestival.phase === "party" && mashedFestival.tracking && Math.abs(mashedFestival.orbitRadius - 14.5) < 1.2 && mashedFestival.beats === 25 && mashedCard.includes("Und bald kommt die Rakete!"),
    JSON.stringify(mashedFestival),
  );

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  passed = checks.every((c) => c.ok);
} catch (e) {
  log(`FAILED: ${e.message}`);
  await shot("fail").catch(() => {});
}

const failed = checks.filter((c) => !c.ok).map((c) => c.name);
writeFileSync(join(OUT, "console.log"), logs.join("\n"));
writeFileSync(
  join(OUT, "summary.json"),
  JSON.stringify({ challenge: "finale", passed, seconds: (Date.now() - t0) / 1000, fps: Math.round(fps * 10) / 10, checks, failed, errors, steps, command: "node scripts/e2e/finale.mjs" }, null, 2),
);
console.log(passed ? "PASS" : "FAIL", `(${((Date.now() - t0) / 1000).toFixed(1)}s, checks ${checks.length - failed.length}/${checks.length}, errors: ${errors.length})`);
await browser.close();
process.exit(passed ? 0 : 1);
