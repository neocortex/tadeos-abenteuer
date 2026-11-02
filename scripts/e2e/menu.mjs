/**
 * E2E: the menu behind the small ship's wheel, played with real clicks and key presses.
 *
 *  1. The wheel is small, faint and clear of the HUD, on the island and on the title screen
 *  2. A click or Esc opens it; Esc, a click beside it, the wheel or "Weiter" closes it
 *  3. While it is open the world stands still and the game sees no keys, and closing leaks no press into the game
 *  4. Ton, Musik and Stimme switch with clicks and arrows + Space, show what M and V do, and survive a reload
 *  5. Musik silences only the music
 *  6. Every switch and place can be reached with the arrow keys
 *  7. Every place is walkable ground, connected on foot to the beach, at the start of the story and at its end
 *  8. Travelling brings Tadeo, Chuleta and the camera there, and Tadeo can walk on
 *  9. The map only shows while Tadeo walks freely: not on the title, in a talk or in a challenge
 *
 * Run (dev server on :5199 must be running):  node scripts/e2e/menu.mjs [baseUrl]
 * Proof: scripts/e2e/out/menu/{*.png, summary.json}
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5199";
const OUT = "scripts/e2e/out/menu";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !m.text().includes("404") && errors.push(m.text()));

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail: String(detail) });
  console.log(`${ok ? "✔" : "✘"} ${name}${detail !== "" ? ` — ${detail}` : ""}`);
};

const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const openGame = async (query = "notitle") => {
  await page.goto(`${BASE}/?${query}`);
  await page.waitForFunction(() => window.game?.busy === false && !window.engine.isSwitching, null, { timeout: 90_000 });
};
const isOpen = () => page.locator(".menu-panel").isVisible();
const active = () => page.locator(".menu-panel .active").first().innerText();
const chip = (label) => page.locator(".menu-chip", { hasText: label });
const pin = (name) => page.locator(".menu-pin", { hasText: name });
const tadeo = () => page.evaluate(() => {
  const p = window.game.island.player.position;
  return { x: p.x, z: p.z };
});

// ── 1. The wheel on the island ──────────────────────────────
await page.goto(`${BASE}/?notitle`);
await page.waitForFunction(() => window.game?.busy === false && !window.engine.isSwitching, null, { timeout: 90_000 });
await wait(1000);
const wheel = await page.evaluate(() => {
  const el = document.querySelector(".menu-wheel");
  const r = el.getBoundingClientRect();
  const overlaps = [".hud-quest", ".hud-items", ".hud-coins", ".hud-help"].filter((s) => {
    const o = document.querySelector(s).getBoundingClientRect();
    return r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top;
  });
  return { w: r.width, h: r.height, right: innerWidth - r.right, bottom: innerHeight - r.bottom, opacity: Number(getComputedStyle(el).opacity), overlaps };
});
check("the wheel is small", wheel.w <= 44 && wheel.h <= 44, `${wheel.w}×${wheel.h}`);
check("the wheel is faint", wheel.opacity <= 0.45, `opacity ${wheel.opacity}`);
check("the wheel sits in the bottom-right corner", wheel.right < 24 && wheel.bottom < 24, `${wheel.right}, ${wheel.bottom} from the edges`);
check("the wheel covers no part of the HUD", wheel.overlaps.length === 0, wheel.overlaps.join(", "));
await shot("01-island-closed");

// ── 2. Opening and closing ──────────────────────────────────
check("the menu starts closed", !(await isOpen()));
await page.locator(".menu-wheel").click();
check("a click on the wheel opens it", await isOpen());
await wait(400);
await shot("02-open");
await page.locator(".menu-wheel").click();
check("a click on the wheel closes it", !(await isOpen()));
await page.keyboard.press("Escape");
check("Esc opens it", await isOpen());
await page.keyboard.press("Escape");
check("Esc closes it", !(await isOpen()));
await page.keyboard.press("Escape");
await page.mouse.click(200, 200);
check("a click beside it closes it", !(await isOpen()));
await page.keyboard.press("Escape");
await chip("Weiter").click();
check("a click on Weiter closes it", !(await isOpen()));
await page.keyboard.press("Escape");
check("the light starts on Weiter, so a stray Space only closes", (await active()) === "Weiter", await active());
await page.keyboard.press("Space");
check("Space on Weiter closes it", !(await isOpen()));
await page.locator(".menu-wheel").click();
await page.keyboard.press("Space");
check("after a click, Space works the light and not the clicked wheel", !(await isOpen()));

// ── 3. The world stands still ───────────────────────────────
await page.keyboard.press("Escape");
const before = await page.evaluate(() => ({ time: window.engine.time, ...window.game.island.player.position }));
await page.keyboard.down("ArrowDown");
await wait(500);
await page.keyboard.up("ArrowDown");
const during = await page.evaluate(() => ({ time: window.engine.time, ...window.game.island.player.position }));
check("the clock stands still", during.time === before.time, `${before.time} → ${during.time}`);
check("Tadeo does not walk", during.x === before.x && during.z === before.z);
check("the arrow moved the light instead", (await active()) !== "Weiter", await active());
await page.keyboard.press("Escape");
await wait(300);
const after = await page.evaluate(() => window.engine.time);
check("the clock runs on after closing", after > during.time, `${during.time} → ${after}`);

// Beside a villager Space would start a talk: closing with Space must not
const chat = await page.evaluate(() => {
  const n = window.game.npcs.get("villager1").position;
  const world = window.game.island.player.world;
  const spot = [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]].map(([dx, dz]) => [n.x + dx, n.z + dz]).find(([x, z]) => world.canStand(x, z));
  window.game.placePlayer(spot[0], spot[1]);
  return spot;
});
await wait(300);
await page.keyboard.press("Escape");
await page.keyboard.press("Space");
await wait(300);
check("the Space that closes the menu starts no talk", !(await page.evaluate(() => window.game.ui.dialogue.isOpen)), `beside a villager at ${chat}`);
await page.keyboard.press("Space");
await page.waitForFunction(() => window.game.ui.dialogue.isOpen, null, { timeout: 3000 });
check("the next Space does start it", true);
await page.keyboard.press("Escape");
await wait(200);
await shot("03-open-during-talk");
check("the menu opens during a talk", await isOpen());
check("the map stays away during a talk", !(await page.locator(".menu-map").isVisible()));
const line = () => page.evaluate(() => {
  const d = window.game.ui.dialogue;
  return { index: d.index, shown: d.shown, length: d.full.length };
});
const typed = await line();
await wait(300);
check("the words stop being typed while the menu is open", (await line()).shown === typed.shown, `${typed.shown} of ${typed.length} letters`);
await page.keyboard.press("Space");
const leaked = await line();
check("Space in the menu neither finishes nor advances the line", leaked.index === typed.index && leaked.shown < leaked.length, `${leaked.shown} of ${leaked.length} letters`);

// ── 4. The switches ─────────────────────────────────────────
await openGame();
const states = () => page.evaluate(() => ({ muted: window.audio.muted, music: window.audio.musicOn, voice: window.narration.isEnabled }));
await page.keyboard.press("Escape");
check("switches start on", (await chip("Ton").innerText()).endsWith("an") && (await chip("Musik").innerText()).endsWith("an") && (await chip("Stimme").innerText()).endsWith("an"));
await chip("Musik").click();
check("a click switches the music off", (await states()).music === false && (await chip("Musik").innerText()).endsWith("aus"));
await chip("Stimme").click();
check("a click switches the voice off", (await states()).voice === false && (await chip("Stimme").innerText()).endsWith("aus"));
await chip("Ton").click();
check("a click switches the sound off", (await states()).muted === true && (await chip("Ton").innerText()).endsWith("aus"));
check("the music switch looks quiet while all sound is off", await chip("Musik").evaluate((e) => e.classList.contains("quiet")));
await wait(400);
await shot("04-all-off");
await page.keyboard.press("KeyM");
check("M shows on the Ton switch", (await chip("Ton").innerText()).endsWith("an"));
await page.keyboard.press("KeyV");
check("V shows on the Stimme switch", (await chip("Stimme").innerText()).endsWith("an"));
await chip("Stimme").click();
await page.keyboard.press("Escape");
await page.reload();
await page.waitForFunction(() => window.game?.busy === false, null, { timeout: 90_000 });
check("music and voice stay off after a reload", (await states()).music === false && (await states()).voice === false);
await page.keyboard.press("Escape");
check("the switches show that after a reload", (await chip("Musik").innerText()).endsWith("aus") && (await chip("Stimme").innerText()).endsWith("aus"));
// Back to all on, with arrows + Space
const toLight = async (label) => {
  for (let i = 0; i < 6 && !(await active()).startsWith(label); i++) await page.keyboard.press("ArrowLeft");
  return (await active()).startsWith(label);
};
check("the arrows bring the light to Musik", await toLight("Musik"));
await page.keyboard.press("Space");
check("Space flips the lit switch and keeps the menu open", (await states()).music === true && (await isOpen()));
await page.keyboard.press("ArrowRight");
await page.keyboard.press("Space");
check("the next one too", (await states()).voice === true);
await page.keyboard.press("Escape");

// ── 5. Musik silences only the music ────────────────────────
const MUSIC_LEVEL = 0.28;
const levels = () => page.evaluate(() => ({ music: window.audio.musicBus.gain.value, sfx: window.audio.sfxBus.gain.value, master: window.audio.master.gain.value }));
// Reason: the voice switched back on just above says so, and the music steps back while it talks
await page.evaluate(() => window.narration.stop());
await page.waitForFunction((level) => Math.abs(window.audio.musicBus.gain.value - level) < 0.03, MUSIC_LEVEL, { timeout: 10_000 });
const loud = await levels();
await page.keyboard.press("Escape");
await chip("Musik").click();
await page.keyboard.press("Escape");
await wait(1500);
const quiet = await levels();
check("the music bus falls silent", quiet.music < 0.01 && loud.music > 0.1, `${loud.music.toFixed(3)} → ${quiet.music.toFixed(3)}`);
check("effects and master stay as they were", quiet.sfx === loud.sfx && Math.abs(quiet.master - loud.master) < 0.01);
await page.evaluate(() => window.audio.setTalking(true));
await wait(800);
await page.evaluate(() => window.audio.setTalking(false));
await wait(2500);
check("talking does not bring the music back", (await levels()).music < 0.01);
await page.evaluate(() => window.audio.toggleMusic());
await wait(1500);
check("switched on, it comes back at its level", Math.abs((await levels()).music - MUSIC_LEVEL) < 0.03, (await levels()).music.toFixed(3));

// ── 6. Everything can be reached with the arrows ────────────
{
  // Reason: read while open, because the text of a hidden element has no line breaks and its switches are not up to date
  await page.keyboard.press("Escape");
  const names = await page.evaluate(() => [...document.querySelectorAll(".menu-chip, .menu-pin")].map((e) => e.innerText.trim().split("\n").pop()));
  await page.keyboard.press("Escape");
  const seen = new Set();
  const queue = [[]];
  const walk = async (keys) => {
    await page.keyboard.press("Escape");
    for (const k of keys) await page.keyboard.press(k);
    const name = (await active()).trim().split("\n").pop();
    await page.keyboard.press("Escape");
    return name;
  };
  while (queue.length) {
    const keys = queue.shift();
    const name = await walk(keys);
    if (seen.has(name)) continue;
    seen.add(name);
    for (const k of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) queue.push([...keys, k]);
  }
  const missing = names.filter((n) => !seen.has(n));
  check(`the arrows reach all ${names.length} switches and places`, missing.length === 0, missing.join(", "));
}

// ── 7. Every place is good ground, early and late in the story ──
for (const quest of [2, 12]) {
  await openGame(`quest=${quest}`);
  const survey = await page.evaluate(async () => {
    const { PLACES } = await import("/src/data/places.ts");
    const { colliders } = window.game.island.island;
    const world = window.game.island.player.world;
    const STEP = 0.5;
    const HALF = 175;
    const SIZE = Math.round((HALF * 2) / STEP);
    const seen = new Uint8Array(SIZE * SIZE);
    const cell = (x, z) => [Math.round((x + HALF) / STEP), Math.round((z + HALF) / STEP)];
    const free = (ix, iz) => {
      const x = ix * STEP - HALF;
      const z = iz * STEP - HALF;
      return world.canStand(x, z) && !colliders.hits(x, z, 0.35);
    };
    // Flood the walkable ground from the landing beach, the way a character of Tadeo's size can walk it
    const queue = [cell(-66, 47)];
    seen[queue[0][1] * SIZE + queue[0][0]] = 1;
    for (let head = 0; head < queue.length; head++) {
      const [cx, cz] = queue[head];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= SIZE || nz >= SIZE || seen[nz * SIZE + nx] || !free(nx, nz)) continue;
        seen[nz * SIZE + nx] = 1;
        queue.push([nx, nz]);
      }
    }
    return PLACES.map((p) => {
      const [x, z] = p.at;
      const [cx, cz] = cell(x, z);
      return {
        name: p.name,
        stand: world.canStand(x, z) && !colliders.hits(x, z, 0.5),
        dry: world.groundHeight(x, z) > 0.2,
        onFoot: seen[cz * SIZE + cx] === 1,
        behindHedge: window.game.story.behindHedge(x, z),
      };
    });
  });
  check(`quest ${quest}: there are 12 places`, survey.length === 12, survey.length);
  for (const key of ["stand", "dry", "onFoot"]) {
    const bad = survey.filter((p) => !p[key]).map((p) => p.name);
    check(`quest ${quest}: every place passes "${key}"`, bad.length === 0, bad.join(", "));
  }
  const fenced = survey.filter((p) => p.behindHedge).map((p) => p.name);
  check(`quest ${quest}: no place lies behind the hedge`, fenced.length === 0, fenced.join(", "));
}

// ── 8. Travelling ───────────────────────────────────────────
await openGame("quest=2");
const places = await page.evaluate(async () => (await import("/src/data/places.ts")).PLACES.map((p) => ({ name: p.name, at: p.at })));
for (const place of places) {
  await page.keyboard.press("Escape");
  await pin(place.name).click();
  check(`${place.name}: picking it closes the menu`, !(await isOpen()));
  await page.waitForFunction(() => window.game.busy === false, null, { timeout: 5000 });
  await wait(250);
  const arrived = await page.evaluate(() => {
    const g = window.game;
    const p = g.island.player.position;
    const c = g.chuleta.position;
    const look = g.island.rig.look;
    return { x: p.x, z: p.z, hen: Math.hypot(c.x - p.x, c.z - p.z), cam: Math.hypot(look.x - p.x, look.z - p.z), fade: Number(getComputedStyle(document.getElementById("fade")).opacity) };
  });
  check(`${place.name}: Tadeo, Chuleta and the camera arrive`, Math.hypot(arrived.x - place.at[0], arrived.z - place.at[1]) < 0.6 && arrived.hen < 4 && arrived.cam < 2.5, `hen ${arrived.hen.toFixed(1)}, camera ${arrived.cam.toFixed(1)}`);
  await shot(`place-${place.name}`);
  const from = await tadeo();
  let moved = 0;
  for (const key of ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"]) {
    await page.keyboard.down(key);
    await wait(350);
    await page.keyboard.up(key);
    const to = await tadeo();
    moved = Math.max(moved, Math.hypot(to.x - from.x, to.z - from.z));
    if (moved > 1) break;
  }
  check(`${place.name}: Tadeo can walk on from there`, moved > 1, `${moved.toFixed(1)} m`);
}

// Tadeo's marker shows where he is
await page.keyboard.press("Escape");
await pin("Dorf").click();
await page.waitForFunction(() => window.game.busy === false, null, { timeout: 5000 });
await wait(200);
await page.keyboard.press("Escape");
const marks = await page.evaluate(() => {
  const you = document.querySelector(".menu-you").getBoundingClientRect();
  const dorf = [...document.querySelectorAll(".menu-pin")].find((e) => e.innerText.includes("Dorf")).getBoundingClientRect();
  return Math.hypot(you.left + you.width / 2 - (dorf.left + dorf.width / 2), you.top + you.height / 2 - (dorf.top + dorf.height / 2));
});
check("Tadeo's marker stands at the place he travelled to", marks < 40, `${marks.toFixed(0)} px from the pin`);
await wait(400);
await shot("05-open-in-village");
await page.keyboard.press("Escape");

// By keyboard
await page.keyboard.press("Escape");
await page.keyboard.press("ArrowDown");
const lit = (await active()).trim().split("\n").pop();
const litAt = places.find((p) => p.name === lit);
await page.keyboard.press("Space");
await page.waitForFunction(() => window.game.busy === false, null, { timeout: 5000 });
await wait(200);
const byKey = await tadeo();
check("arrows + Space travel too", !!litAt && Math.hypot(byKey.x - litAt.at[0], byKey.z - litAt.at[1]) < 1, lit);

// ── 9. The map only shows while Tadeo walks freely ──────────
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/`);
await page.waitForSelector(".title-screen .menu div", { timeout: 90_000 });
await wait(800);
await shot("06-title-closed");
await page.locator(".menu-wheel").click();
check("the menu opens on the title screen", await isOpen());
check("no map on the title screen", !(await page.locator(".menu-map").isVisible()));
await wait(400);
await shot("07-title-open");
const flight = await page.evaluate(() => window.engine.time);
await page.keyboard.press("Space");
await wait(300);
check("Space closes the menu and starts no game", !(await isOpen()) && (await page.locator(".title-screen").count()) === 1 && !(await page.locator(".title-screen.hide").count()));
check("the flight goes on", (await page.evaluate(() => window.engine.time)) > flight);

await page.goto(`${BASE}/?challenge=volcano`);
await page.waitForFunction(() => window.engine?.scene && window.engine.scene !== window.game.island && !window.engine.isSwitching, null, { timeout: 120_000 });
await wait(800);
await page.keyboard.press("Escape");
check("the menu opens in a challenge", await isOpen());
check("no map in a challenge", !(await page.locator(".menu-map").isVisible()));
const inChallenge = await page.evaluate(() => window.engine.time);
await wait(400);
check("a challenge stands still too", (await page.evaluate(() => window.engine.time)) === inChallenge);
await shot("08-challenge-open");
await page.keyboard.press("Escape");

// ── A narrow window ─────────────────────────────────────────
await openGame();
await page.setViewportSize({ width: 800, height: 500 });
await wait(400);
await page.keyboard.press("Escape");
const fit = await page.evaluate(() => {
  const r = document.querySelector(".menu-panel").getBoundingClientRect();
  return { left: r.left, top: r.top, right: innerWidth - r.right, bottom: innerHeight - r.bottom };
});
check("the panel fits a small window", Object.values(fit).every((v) => v >= 0), JSON.stringify(fit));
await wait(400);
await shot("09-small-window");
await page.keyboard.press("Escape");

check("no errors on the page", errors.length === 0, errors.slice(0, 3).join(" / "));

await browser.close();
const passed = results.every((r) => r.ok);
writeFileSync(`${OUT}/summary.json`, JSON.stringify({ passed, when: new Date().toISOString(), results }, null, 2));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} ${passed ? "PASS" : "FAIL"} → ${OUT}/summary.json`);
process.exit(passed ? 0 : 1);
