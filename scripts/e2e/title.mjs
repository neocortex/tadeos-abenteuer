/**
 * E2E: the title screen names the game and plays its music as early as the browser lets it, in Chrome.
 *
 *  1. The logo, subtitle and browser tab name the game, and the logo fits common window sizes
 *  2. A browser that allows sound without a press plays the title music before the title screen is even up
 *  3. A player who muted the game stays muted
 *  4. A browser that wants a press first stays silent, queues no sounds, and starts the music on the first
 *     key or click, with Space also starting the adventure
 *
 * Sound is measured on what really goes to the speakers, not on what the game asked for.
 *
 * Run (dev server on :5199 must be running):  node scripts/e2e/title.mjs
 * Proof: scripts/e2e/out/title/summary.json and one screenshot per window size
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.GAME_URL ?? "http://localhost:5199/";
const OUT = new URL("./out/title/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const GPU = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];
const launch = (policy) => chromium.launch({ channel: "chrome", args: [...GPU, `--autoplay-policy=${policy}`] });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✔" : "✘"} ${name}${detail ? ` — ${detail}` : ""}`);
};

/** Logs every sound the game starts, and taps everything of it that reaches the speakers. */
function listen() {
  const log = { game: null, music: [], effects: 0, birdNotes: 0, titleAt: null };
  window.__sound = log;
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    constructor(...args) {
      super(...args);
      this.tap = this.createAnalyser();
      this.tap.fftSize = 2048;
    }
  };
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    if (target instanceof AudioDestinationNode) connect.call(this, this.context.tap);
    return connect.call(this, target, ...rest);
  };
  const startBuffer = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    // Reason: only the game's sound bank plays buffers; the hens have their own context, made of oscillators
    log.game = this.context;
    // Reason: music tracks are the looping mono buffers; the other loop, the sea, is stereo
    if (this.loop && this.buffer.numberOfChannels === 1) log.music.push(performance.now());
    if (!this.loop) log.effects++;
    return startBuffer.apply(this, args);
  };
  const startOscillator = OscillatorNode.prototype.start;
  OscillatorNode.prototype.start = function (...args) {
    if (this.context === log.game) log.birdNotes++;
    return startOscillator.apply(this, args);
  };
  new MutationObserver(() => {
    if (log.titleAt === null && document.querySelector(".title-screen")) log.titleAt = performance.now();
  }).observe(document, { childList: true, subtree: true });
}

/**
 * Runs a function in the page without counting as a press.
 * Reason: Playwright's evaluate and wait helpers carry a user gesture, which would lift the browser's block on sound.
 */
async function inPage(page, fn, arg) {
  const { result, exceptionDetails } = await page.cdp.send("Runtime.evaluate", {
    expression: `(${fn})(${JSON.stringify(arg)})`,
    awaitPromise: true,
    returnByValue: true,
    userGesture: false,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

const titleIsUp = (page) => inPage(page, () => !!document.querySelector(".title-screen .logo"));

async function waitForTitle(page) {
  const deadline = Date.now() + 60000;
  while (!(await titleIsUp(page))) {
    if (Date.now() > deadline) throw new Error("the title screen never appeared");
    await page.waitForTimeout(100);
  }
}

/** Opens the game fresh on its title screen. */
async function open(browser, prepare = () => {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.cdp = await page.context().newCDPSession(page);
  page.problems = [];
  page.on("pageerror", (e) => page.problems.push(e.message));
  page.on("console", (m) => m.type() === "error" && page.problems.push(m.text()));
  await page.addInitScript(listen);
  await page.addInitScript(prepare);
  await page.goto(BASE);
  await waitForTitle(page);
  return page;
}

const sound = (page) =>
  inPage(page, () => {
    const log = window.__sound;
    return {
      pressed: navigator.userActivation.hasBeenActive,
      state: log.game?.state ?? "none",
      musicTracks: log.music.length,
      musicAt: log.music[0] ?? null,
      titleAt: log.titleAt,
      effects: log.effects,
      birdNotes: log.birdNotes,
    };
  });

/** The loudest sample reaching the speakers over a moment of listening. */
const loudness = (page, ms = 1500) =>
  inPage(page, async (ms) => {
    const tap = window.__sound.game?.tap;
    if (!tap) return 0;
    let peak = 0;
    const end = performance.now() + ms;
    while (performance.now() < end) {
      const samples = new Float32Array(tap.fftSize);
      tap.getFloatTimeDomainData(samples);
      for (const s of samples) peak = Math.max(peak, Math.abs(s));
      await new Promise((r) => setTimeout(r, 50));
    }
    return peak;
  }, ms);

const AUDIBLE = 0.01;

// ── 1. The name, at every window size ───────────────────────
const allowing = await launch("no-user-gesture-required");
{
  const page = await open(allowing);
  const texts = await inPage(page, () => ({
    logo: document.querySelector(".title-screen .logo").textContent,
    sub: document.querySelector(".title-screen .sub").textContent,
    tab: document.title,
  }));
  check("the logo is the game's name", texts.logo === "Die Abenteuer von Tadeo", texts.logo);
  check("the subtitle is the island", texts.sub === "Die Schatzinsel", texts.sub);
  check("the browser tab names the game", texts.tab === "Die Abenteuer von Tadeo - Die Schatzinsel", texts.tab);

  // Reason: the flight starts inside a cloud; the screenshots should show the island
  await page.waitForTimeout(6000);
  for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 720], [1024, 600], [800, 600], [600, 500]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400);
    const fit = await inPage(page, () => {
      const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(document.querySelector(".title-screen .logo"));
      const text = range.getBoundingClientRect();
      return {
        left: Math.round(text.left),
        right: Math.round(innerWidth - text.right),
        lines: Math.round(text.height / parseFloat(getComputedStyle(document.querySelector(".title-screen .logo")).lineHeight)),
        gapToMenu: Math.round(rect(".title-screen .menu").top - rect(".title-screen .sub").bottom),
      };
    });
    check(
      `${width}x${height}: the logo fits on one line with room to breathe, above the menu`,
      fit.left >= 16 && fit.right >= 16 && fit.lines === 1 && fit.gapToMenu > 0,
      JSON.stringify(fit),
    );
    await page.screenshot({ path: `${OUT}title-${width}x${height}.png` });
  }
  check("no errors on the title screen", page.problems.length === 0, page.problems.join(" / "));
  await page.close();
}

// ── 2. Sound allowed: music with no press at all ────────────
{
  const page = await open(allowing);
  const peak = await loudness(page);
  const s = await sound(page);
  check("sound allowed: the music plays with no press", s.state === "running" && s.musicTracks === 1 && peak > AUDIBLE, `${JSON.stringify(s)}, peak ${peak.toFixed(3)}`);
  check("sound allowed: the music is on before the title screen appears", s.musicAt !== null && s.musicAt < s.titleAt, `music at ${Math.round(s.musicAt)} ms, title at ${Math.round(s.titleAt)} ms`);
  await page.waitForTimeout(9000);
  const later = await sound(page);
  check("sound allowed: the birds sing", later.birdNotes > 0, `${later.birdNotes} bird notes`);
  check("sound allowed: no errors", page.problems.length === 0, page.problems.join(" / "));
  await page.close();
}

// ── 3. Muted stays muted, also when sound is allowed ────────
{
  const page = await open(allowing, () => localStorage.setItem("schatzkarten_audio", JSON.stringify({ muted: true })));
  const peak = await loudness(page);
  check("a muted game stays silent on the title screen", peak === 0, `peak ${peak.toFixed(3)}`);
  await page.keyboard.press("KeyM");
  await page.waitForTimeout(300);
  const unmuted = await loudness(page);
  check("M brings the music back", unmuted > AUDIBLE, `peak ${unmuted.toFixed(3)}`);
  await page.close();
}
await allowing.close();

// ── 4. Sound blocked: the first press starts it ─────────────
// Reason: this is Chrome's rule for a first visit, and what a player meets on tadeo.fun
const blocking = await launch("document-user-activation-required");
{
  const page = await open(blocking);
  // Reason: long enough for several bird calls (at most every 8.5 s), which must not wait behind the block
  await page.waitForTimeout(18000);
  const before = await sound(page);
  const quiet = await loudness(page);
  check("sound blocked: this really is the browser with no press yet", before.pressed === false && (await sound(page)).pressed === false);
  check("sound blocked: silent until a press", before.state !== "running" && quiet === 0, `${JSON.stringify(before)}, peak ${quiet.toFixed(3)}`);
  check("sound blocked: no birds or effects pile up", before.birdNotes === 0 && before.effects === 0, `${before.birdNotes} bird notes, ${before.effects} effects`);
  check("sound blocked: the page is not broken", page.problems.length === 0, page.problems.join(" / "));

  await page.keyboard.press("ArrowDown");
  const peak = await loudness(page);
  const after = await sound(page);
  check("sound blocked: an arrow key starts the music", after.state === "running" && after.musicTracks === 1 && peak > AUDIBLE, `${JSON.stringify(after)}, peak ${peak.toFixed(3)}`);
  check("sound blocked: that press leaves the title screen up", await titleIsUp(page));
  check("sound blocked: no burst of waiting birds", after.birdNotes <= 4, `${after.birdNotes} bird notes`);

  // Reason: not something the game controls, but it decides what a returning player hears
  await page.reload();
  await waitForTitle(page);
  await page.waitForTimeout(1500);
  const reloaded = await sound(page);
  console.log(`  (info) after reloading the same tab, with no new press: ${reloaded.state}`);
  results.push({ name: "info: game audio state after a same-tab reload", ok: true, detail: reloaded.state });
  await page.close();
}
{
  const page = await open(blocking);
  await page.mouse.click(640, 360);
  const peak = await loudness(page);
  const s = await sound(page);
  check("sound blocked: a click starts the music", s.state === "running" && peak > AUDIBLE, `${JSON.stringify(s)}, peak ${peak.toFixed(3)}`);
  await page.close();
}
{
  const page = await open(blocking);
  await page.keyboard.press("Space");
  const peak = await loudness(page);
  const s = await sound(page);
  check("sound blocked: Space starts the sound and the adventure", s.state === "running" && peak > AUDIBLE, `${JSON.stringify(s)}, peak ${peak.toFixed(3)}`);
  await page.waitForFunction(() => !document.querySelector(".title-screen"), null, { timeout: 5000 });
  check("sound blocked: no errors", page.problems.length === 0, page.problems.join(" / "));
  await page.close();
}
await blocking.close();

const passed = results.every((r) => r.ok);
writeFileSync(`${OUT}summary.json`, JSON.stringify({ passed, when: new Date().toISOString(), results }, null, 2));
console.log(passed ? "\nALL PASS" : "\nFAIL", `→ ${OUT}summary.json`);
process.exit(passed ? 0 : 1);
