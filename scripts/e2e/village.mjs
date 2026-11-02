/**
 * E2E: play quest 7 from start to finish with real key presses. Tadeo asks the
 * elder on the island for the key and hears where it came from, plays the village
 * challenge — including one wrong drum beat and one wrong maths answer to
 * prove that mistakes only lead to a fresh attempt — and is back on the island
 * with the golden key, where the elder sends him on to the ogre for the boulder.
 *
 * The live trial state (drum pattern, correct answer) is read from
 * `window.engine.scene.state`; every action is a real keyboard press.
 *
 * Usage: node scripts/e2e/village.mjs [baseUrl]
 * Output: scripts/e2e/out/village/{*.png, summary.json}
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5199";
const OUT = "scripts/e2e/out/village";
const TIMEOUT_MS = 240_000;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
const logs = [];
const checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
  logs.push(`[${m.type()}] ${m.text()}`);
});

const started = Date.now();
const check = (name, ok, detail = "") => {
  checks.push({ name, ok: !!ok, detail: String(detail) });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== "" ? ` (${detail})` : ""}`);
};
await page.goto(`${BASE}/?quest=7`);
await page.waitForFunction(() => window.game?.story && window.engine?.scene === window.game.island, null, { timeout: 30000 });

let reloads = 0;
page.on("framenavigated", (f) => {
  if (f === page.mainFrame() && Date.now() - started > 3000) reloads++;
});

const read = () =>
  page.evaluate(() => {
    const scene = window.engine?.scene;
    const s = scene?.state;
    return {
      onIsland: !!scene && "island" in scene,
      milestone: window.probe.milestone,
      phase: s?.phase ?? null,
      trial: s?.trial ?? 0,
      sequence: s?.sequence ?? [],
      progress: s?.progress ?? 0,
      correct: s?.correct ?? -1,
      selected: s?.selected ?? 1,
      dialogue: !!document.querySelector(".dialogue.open"),
      itemGet: !!document.querySelector(".item-get.show"),
    };
  })
  // Reason: other developers' edits make the Vite dev server reload the page; just keep playing
  .catch(() => null);

const shots = new Set();
async function shotOnce(name, delay = 0) {
  if (shots.has(name)) return;
  shots.add(name);
  if (delay) await page.waitForTimeout(delay);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

/**
 * How sharp the digit on each answer stone is: the steepest brightness steps between neighbouring pixels, as a share
 * of the way from slate to digit. A blurred or over-glowing number only ever takes small steps.
 */
async function measureDigitSharpness() {
  // Reason: the camera move and the stones' rise have to finish, or the crops miss the faces
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/05-math-numbers.png` });
  const boxes = await page.evaluate(() => {
    const { stage, camera } = window.engine.scene;
    return stage.stones.stones.map((stone) => {
      const number = stone.inner.children[1];
      const corners = [-0.42, 0.42].map((d) => {
        const p = number.position.clone().set(d, -d, 0);
        number.localToWorld(p).project(camera);
        return { x: ((p.x + 1) / 2) * innerWidth, y: ((1 - p.y) / 2) * innerHeight };
      });
      return { x: corners[0].x, y: corners[0].y, width: corners[1].x - corners[0].x, height: corners[1].y - corners[0].y };
    });
  });
  const sharpness = [];
  for (const clip of boxes) {
    const png = await page.screenshot({ clip });
    sharpness.push(
      await page.evaluate(async (base64) => {
        const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const g = canvas.getContext("2d");
        g.drawImage(bitmap, 0, 0);
        const { data, width } = g.getImageData(0, 0, bitmap.width, bitmap.height);
        const light = [];
        for (let i = 0; i < data.length; i += 4) light.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
        const sorted = [...light].sort((a, b) => a - b);
        const slateToDigit = sorted[Math.floor(sorted.length * 0.98)] - sorted[Math.floor(sorted.length * 0.1)];
        const steps = [];
        for (let i = 0; i < light.length; i++) {
          if ((i + 1) % width !== 0) steps.push(Math.abs(light[i + 1] - light[i]));
          if (i + width < light.length) steps.push(Math.abs(light[i + width] - light[i]));
        }
        steps.sort((a, b) => a - b);
        return Number((steps[Math.floor(steps.length * 0.99)] / slateToDigit).toFixed(3));
      }, png.toString("base64")),
    );
  }
  return sharpness;
}

/** Notes every dialogue line and every bubble read aloud, so a short line is never missed. */
async function recordLines() {
  await page.evaluate(async () => {
    window.said = [];
    const box = Object.getPrototypeOf(window.game.ui.dialogue);
    const begin = box.showLine;
    box.showLine = function () {
      begin.call(this);
      window.said.push(`${this.script[this.index].speaker}: ${this.script[this.index].text}`);
    };
    const { NarrationManager } = await import("/src/systems/NarrationManager.ts");
    const narration = NarrationManager.getInstance();
    const speak = narration.speakLine.bind(narration);
    narration.speakLine = (text, speaker) => {
      if (!window.said.at(-1)?.endsWith(text)) window.said.push(`${speaker}: ${text}`);
      return speak(text, speaker);
    };
  });
}
const said = () => page.evaluate(() => window.said ?? []);

// The elder first: Tadeo asks him for the key on the island, and the challenge starts when the talk ends
await recordLines();
await page.evaluate(() => window.probe.place(65, 39.5));
await page.waitForTimeout(500);
const prompt = await page.evaluate(() => document.querySelector(".prompt")?.textContent.trim() ?? "");
check("the elder offers a talk before the trials", prompt.includes("Sprechen"), prompt);
await page.keyboard.press("Space");

const phasesSeen = new Set();
const mistakes = { drum: false, math: false };
let lastKey = "";
let result = null;
let entered = false;
let digitSharpness = null;

while (Date.now() - started < TIMEOUT_MS) {
  const st = await read();
  if (!st) {
    await page.waitForTimeout(500);
    continue;
  }
  if (st.phase) {
    phasesSeen.add(st.phase);
    entered = true;
  }
  // Back on the island, the elder talks again before the next quest starts
  if (st.onIsland && entered && st.milestone >= 8 && !st.dialogue) {
    result = st;
    break;
  }
  if (st.onIsland && entered && st.dialogue) await shotOnce("07b-elder-sends-on", 900);
  if (st.itemGet) {
    await shotOnce("06-key-item-get", 600);
    await page.waitForTimeout(300);
    continue;
  }
  if (st.dialogue) {
    if (!entered) await shotOnce("00a-the-key-came-at-night", 900);
    if (st.phase === "intro") await shotOnce("01-welcome", 900);
    if (st.phase === "reward") await shotOnce("05-key-dialogue", 600);
    // Reason: a child mashes Space, so every talk is pressed through at 60 ms (separate presses, as Input ignores key repeat)
    await page.keyboard.press("Space");
    await page.waitForTimeout(60);
    continue;
  }
  switch (st.phase) {
    case "intro":
      await shotOnce("00-establishing", 2500);
      break;
    case "practice":
      await shotOnce("02-practice", 400);
      for (const k of ["ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown"]) {
        await page.keyboard.press(k);
        await page.waitForTimeout(380);
      }
      break;
    case "show":
      await shotOnce(`03-show-trial${st.trial}`, 1300);
      break;
    case "input": {
      // Pattern complete — the celebration is about to start
      if (st.progress >= st.sequence.length) break;
      // One deliberate wrong beat in the first trial: the sage must simply show the pattern again
      if (st.trial === 1 && !mistakes.drum) {
        mistakes.drum = true;
        const wrong = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].find((k) => k !== st.sequence[st.progress]);
        await page.keyboard.press(wrong);
        await page.waitForTimeout(500);
        break;
      }
      const key = st.sequence[st.progress];
      const marker = `${st.trial}:${st.progress}`;
      if (marker === lastKey) {
        await page.waitForTimeout(120);
        break;
      }
      lastKey = marker;
      await page.keyboard.press(key);
      if (st.progress === 1) await shotOnce(`04-input-trial${st.trial}`, 120);
      await page.waitForTimeout(420);
      if (st.progress + 1 >= st.sequence.length) lastKey = "";
      break;
    }
    case "math": {
      await shotOnce("05-math", 500);
      digitSharpness ??= await measureDigitSharpness();
      // First answer wrong on purpose (a new question follows), then the right one
      const target = mistakes.math ? st.correct : [0, 1, 2].find((i) => i !== st.correct);
      if (st.selected !== target) {
        await page.keyboard.press(st.selected < target ? "ArrowRight" : "ArrowLeft");
        await page.waitForTimeout(300);
        break;
      }
      mistakes.math = true;
      await page.keyboard.press("Space");
      await page.waitForTimeout(700);
      break;
    }
    case "reward":
      await shotOnce("05-key-flight", 1800);
      break;
    case "done":
      await shotOnce("07-finale", 300);
      break;
    default:
      break;
  }
  await page.waitForTimeout(150);
}

let hasKeyInHud = false;
if (result) {
  await page.waitForFunction(() => !window.engine.isSwitching, null, { timeout: 10_000 });
  hasKeyInHud = await page.evaluate(() => !!document.querySelector('.hud-items .slot[data-item="key"]:not(.empty)'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/08-back-on-island.png` });
}
const inventory = await page.evaluate(() => JSON.parse(localStorage.getItem("schatzkarten_save") ?? "null"));

// Reason: at this window size numbers blurred into their glow score about 0.1, and sharp ones from about 0.16
check("the numbers on the stones have sharp edges", digitSharpness?.every((s) => s >= 0.13), JSON.stringify(digitSharpness));

// ── What was said ─────────────────────────────────────────────

const lines = await said();
const words = (l) => l.split(": ").slice(1).join(": ").split(/\s+/).length;
check("elder explains the key before the trials", lines.some((l) => l.includes("eines Morgens vor meiner Tür")));
check("the note says the key is for someone clever", lines.some((l) => l.includes("Nur für jemanden, der klug ist")));
check("the welcome at the fire says what the test is for", lines.some((l) => l.startsWith("Dorfältester: Willkommen am Feuerkreis") && l.includes("klug")));
check("after the trials he sends Tadeo to the ogre", lines.some((l) => l.includes("Riesenfels")) && lines.some((l) => l.includes("Nur der Oger ist stark genug")));
check("Chuleta wants her berries for the angry ogre", lines.some((l) => l.startsWith("Chuleta: ") && l.includes("Die Beeren")));
check("Tadeo brings up the hammer on the mountain", lines.some((l) => l.startsWith("Tadeo: Jetzt fehlt nur noch der Hammer")));
// Reason: the trials' own lines stay as they were, so only what the story added around them is measured
const added = await page.evaluate(async () => {
  const { DIALOGUES } = await import("/src/data/dialogues.ts");
  return [...DIALOGUES.village_enter, ...DIALOGUES.village_after].map((l) => `${l.speaker}: ${l.text}`);
});
const welcome = lines.filter((l) => l.startsWith("Dorfältester: Willkommen am Feuerkreis"));
check("the elder's talks were all heard in this run", added.length >= 6 && added.every((l) => lines.includes(l)), added.filter((l) => !lines.includes(l)).join(" | "));
check("every line has at most 14 words", [...added, ...welcome].every((l) => words(l) <= 14), [...added, ...welcome].filter((l) => words(l) > 14).join(" | "));
check("the welcome at the fire says there are three trials", welcome.some((l) => l.includes("drei Prüfungen")) || lines.some((l) => l.includes("Es gibt drei Prüfungen")));
check("nobody says Monster", !/Monster/.test(lines.join("\n")));
// Reason: the whole run pressed Space every 60 ms through village_enter, WELCOME and village_after
await page.waitForFunction(() => !window.probe.busy, null, { timeout: 15_000 }).catch(() => {});
const control = await page.evaluate(async () => {
  const before = [window.game.island.player.position.x, window.game.island.player.position.z];
  return { before, milestone: window.probe.milestone, busy: window.probe.busy, talking: !!document.querySelector(".dialogue.open") };
});
await page.keyboard.down("ArrowLeft");
await page.waitForTimeout(700);
await page.keyboard.up("ArrowLeft");
const movedTo = await page.evaluate(() => [window.game.island.player.position.x, window.game.island.player.position.z]);
check(
  "mashing Space through the village talks: the quest advances and Tadeo is in control",
  control.milestone === 8 && !control.busy && !control.talking && Math.hypot(movedTo[0] - control.before[0], movedTo[1] - control.before[1]) > 0.5,
  JSON.stringify({ ...control, movedTo }),
);
check("nobody says the forbidden words", !/\b(die Alten|Altar|ewiges Eis|besänftigen)/.test(lines.join("\n")));

const summary = {
  test: "village",
  passed: !!result && hasKeyInHud && errors.length === 0 && mistakes.drum && mistakes.math && checks.every((c) => c.ok),
  backOnIsland: !!result,
  keyInInventory: hasKeyInHud,
  mistakesRecoveredFrom: mistakes,
  phasesSeen: [...phasesSeen],
  checks,
  durationSec: Math.round((Date.now() - started) / 1000),
  devServerReloads: reloads,
  errors,
  save: inventory,
  screenshots: [...shots].map((s) => `${OUT}/${s}.png`),
};
writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
writeFileSync(`${OUT}/console.log`, logs.join("\n"));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
process.exit(summary.passed ? 0 : 1);
