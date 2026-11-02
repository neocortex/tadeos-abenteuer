/**
 * E2E: the recorded music and island sounds, measured on what really reaches the speakers.
 *
 *  1. Every sound exists, decodes, is stereo, lasts as long as ordered and is not silent
 *  2. Every loop passes its seam without a dip in loudness or a click
 *  3. The music follows the place and the quest; a missing file or a fast change of mind breaks nothing
 *  4. The island's background and animals follow Tadeo from region to region
 *  5. Music and ambience step back while someone talks, and stay quieter than the voices
 *  6. A real track keeps playing, at steady loudness, past the end of its file
 *  7. Every sound effect the code asks for exists, loads with the game and sounds at once
 *
 * Run (dev server on :5199 must be running):  node scripts/e2e/music.mjs [baseUrl]
 * Proof: scripts/e2e/out/music/summary.json (with the measured loudness of every sound)
 */

import { chromium } from "playwright";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5199";
const SRC = new URL("../../src/", import.meta.url).pathname;
const AUDIO_FILES = new URL("../../public/audio/", import.meta.url).pathname;
const OUT = new URL("./out/music/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const MUSIC = { music_title: 90, music_overworld: 120, music_village: 120, music_dungeon: 90, music_mountain: 90, music_combat: 90, music_victory: 45 };
const BEDS = { amb_beach: 30, amb_jungle: 30, amb_swamp: 30, amb_hills: 30 };
const CALLS = {
  call_gull_1: 3, call_gull_2: 3, call_songbird_1: 3, call_songbird_2: 3, call_parrot_1: 2,
  call_parrot_2: 3, call_frog_1: 2, call_frog_2: 3, call_hills_1: 3, call_hills_2: 2,
};
/** The overlap of each kind of loop in the game. */
const MUSIC_OVERLAP = 4;
const BED_OVERLAP = 2;
const VOICE_LINE = ["Tadeo", "Hier, dein Leuchtpilz!"];

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✔" : "✘"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});

/** Taps everything of the game's sound bank that reaches the speakers. */
function listen() {
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
}

async function open(query) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.problems = [];
  page.on("pageerror", (e) => page.problems.push(e.message));
  page.on("console", (m) => m.type() === "error" && page.problems.push(m.text()));
  await page.addInitScript(listen);
  await page.goto(`${BASE}/?${query}`, { timeout: 120_000 });
  await page.waitForFunction(() => window.game?.engine?.scene, null, { timeout: 90_000 });
  return page;
}

const state = (page) =>
  page.evaluate(() => {
    const audio = window.audio;
    const beds = {};
    for (const [name, gain] of Object.entries(audio.ambience?.beds ?? {})) beds[name] = +gain.gain.value.toFixed(2);
    return {
      track: audio.music?.key ?? null,
      wanted: audio.wantedMusic,
      group: audio.ambience?.group,
      ambienceBus: +audio.ambienceBus.gain.value.toFixed(2),
      musicBus: +audio.musicBus.gain.value.toFixed(3),
      beds,
    };
  });

/** Average loudness at the speakers over a moment of listening. */
const heard = (page, ms = 1500) =>
  page.evaluate(async (ms) => {
    const tap = window.audio.ctx.tap;
    const samples = new Float32Array(tap.fftSize);
    let sum = 0;
    let n = 0;
    const end = performance.now() + ms;
    while (performance.now() < end) {
      tap.getFloatTimeDomainData(samples);
      for (const s of samples) sum += s * s;
      n += samples.length;
      await new Promise((r) => setTimeout(r, 40));
    }
    return Math.sqrt(sum / n);
  }, ms);

// Reason: a synchronous check, because waitForFunction takes the promise of an async function as a true answer
const waitForTrack = (page, key, timeout = 15_000) =>
  page.waitForFunction((key) => window.audio.music?.key === key, key, { timeout }).then(() => true, () => false);

// ── 1 + 2. Every sound, and every seam ─────────────────────
const page = await open("notitle");
{
  const report = await page.evaluate(
    async ({ music, beds, calls, musicOverlap, bedOverlap }) => {
      const { loadSample } = await import("/src/audio/samples.ts");
      const ctx = new AudioContext();
      const rms = (data, from, to) => {
        let sum = 0;
        for (let i = from; i < to; i++) sum += data[i] * data[i];
        return Math.sqrt(sum / (to - from));
      };
      const measure = async (key, overlap) => {
        const s = await loadSample(ctx, key, overlap);
        if (!s) return { key, missing: true };
        const rate = s.buffer.sampleRate;
        const data = s.buffer.getChannelData(0);
        let loudest = 0;
        for (const sample of data) loudest = Math.max(loudest, Math.abs(sample));
        const out = {
          key,
          seconds: +s.buffer.duration.toFixed(1),
          channels: s.buffer.numberOfChannels,
          level: +s.level.toFixed(2),
          loudest: +loudest.toFixed(2),
        };
        if (!overlap) return out;
        const start = Math.round(s.loopStart * rate);
        const end = Math.round(s.loopEnd * rate);
        // What a player hears: the end of the file, then straight on from the loop's start
        const blockSize = Math.floor(rate * 0.25);
        const around = new Float32Array(rate * 8);
        around.set(data.subarray(end - rate * 4, end), 0);
        around.set(data.subarray(start, start + rate * 4), rate * 4);
        const blocks = [];
        for (let i = 0; i + blockSize <= around.length; i += blockSize) blocks.push(rms(around, i, i + blockSize));
        const typical = rms(data, start, end);
        // Reason: only the last 4 seconds of the file are blended; a second past the seam shows how it lands, and from
        // there on the track is simply as recorded, soft opening included
        const blended = blocks.slice(0, 20);
        // Reason: waves and sparse music rise and fall by nature; the seam only has to stay within that
        const elsewhere = [];
        for (let i = start + rate * 4; i + blockSize <= end - rate * 4; i += blockSize) elsewhere.push(rms(data, i, i + blockSize));
        elsewhere.sort((a, b) => a - b);
        let steepest = 0;
        for (let i = 1; i < rate; i++) steepest = Math.max(steepest, Math.abs(around[rate * 4 - i] - around[rate * 4 - i - 1]));
        return {
          ...out,
          loopSeconds: +((end - start) / rate).toFixed(1),
          trimmedEnd: +(s.buffer.duration - s.loopEnd).toFixed(1),
          loopStart: +s.loopStart.toFixed(1),
          typical: +typical.toFixed(3),
          seamQuietest: +(Math.min(...blended) / typical).toFixed(2),
          seamLoudest: +(Math.max(...blended) / typical).toFixed(2),
          naturalQuietest: +(elsewhere[0] / typical).toFixed(2),
          naturalLoudest: +(elsewhere[elsewhere.length - 1] / typical).toFixed(2),
          aroundSeam: blocks.map((b) => +(b / typical).toFixed(1)).join(" "),
          seamJump: +Math.abs(around[rate * 4] - around[rate * 4 - 1]).toFixed(4),
          steepest: +steepest.toFixed(4),
        };
      };
      const out = [];
      for (const key of Object.keys(music)) out.push(await measure(key, musicOverlap));
      for (const key of Object.keys(beds)) out.push(await measure(key, bedOverlap));
      for (const key of Object.keys(calls)) out.push(await measure(key, 0));
      await ctx.close();
      return out;
    },
    { music: MUSIC, beds: BEDS, calls: CALLS, musicOverlap: MUSIC_OVERLAP, bedOverlap: BED_OVERLAP },
  );
  writeFileSync(`${OUT}sounds.json`, JSON.stringify(report, null, 1));

  const ordered = { ...MUSIC, ...BEDS, ...CALLS };
  for (const s of report) {
    check(
      `${s.key}: decodes, stereo, as long as ordered, not silent`,
      !s.missing && s.channels === 2 && Math.abs(s.seconds - ordered[s.key]) < 1 && s.loudest > 0.02 && s.level < 20,
      JSON.stringify(s),
    );
    if (s.loopSeconds === undefined) continue;
    const minLoop = ordered[s.key] * 0.7;
    check(
      `${s.key}: the loop keeps most of the sound, with no dip and no click at the seam`,
      // Reason: twice the usual loudness is the sign of a bad seam; a very even sound may swell a little less than that
      s.loopSeconds > minLoop && s.seamQuietest >= s.naturalQuietest * 0.8 && s.seamLoudest <= Math.max(s.naturalLoudest * 1.2, 2) && s.seamJump <= s.steepest,
      `${s.loopSeconds}s loop, ${s.trimmedEnd}s cut off the end, loudness ×${s.seamQuietest}–×${s.seamLoudest} at the seam, ×${s.naturalQuietest}–×${s.naturalLoudest} elsewhere, jump ${s.seamJump} vs ${s.steepest}`,
    );
  }
}

// ── 3. The music follows place and quest ───────────────────
{
  check("on the landing beach: the island theme", await waitForTrack(page, "music_overworld"), JSON.stringify(await state(page)));
  check("the island theme is audible", (await heard(page)) > 0.005);

  await page.evaluate(() => window.game.island.player.teleport(64, 40));
  check("in the village: the village theme", await waitForTrack(page, "music_village"), JSON.stringify(await state(page)));
  await page.evaluate(() => window.game.island.player.teleport(0, 6));
  check("out of the village again: the island theme", await waitForTrack(page, "music_overworld"));

  const fast = await page.evaluate(async () => {
    const audio = window.audio;
    window.probe.holdControls(true);
    audio.playMusic("music_dungeon");
    audio.playMusic("music_combat");
    audio.playMusic("music_overworld");
    await new Promise((r) => setTimeout(r, 2500));
    return audio.music?.key;
  });
  check("three changes in a row end on the last one", fast === "music_overworld", String(fast));

  const stopped = await page.evaluate(async () => {
    const audio = window.audio;
    audio.playMusic("music_victory");
    audio.stopMusic();
    await new Promise((r) => setTimeout(r, 2000));
    return { key: audio.music?.key ?? null, wanted: audio.wantedMusic };
  });
  check("a track stopped while it downloads never starts", stopped.key === null && stopped.wanted === null, JSON.stringify(stopped));

  const before = page.problems.length;
  const missing = await page.evaluate(async () => {
    const audio = window.audio;
    audio.playMusic("music_overworld");
    await new Promise((r) => setTimeout(r, 1500));
    audio.playMusic("music_no_such_track");
    await new Promise((r) => setTimeout(r, 1500));
    const key = audio.music?.key;
    audio.playMusic("music_overworld");
    return key;
  });
  check("a missing file leaves the music playing", missing === "music_overworld" && page.problems.length === before, String(missing));
  await page.evaluate(() => (window.probe.holdControls(false)));
}

for (const [query, key] of [["challenge=cave", "music_dungeon"], ["challenge=mountain", "music_mountain"], ["challenge=volcano", "music_combat"], ["challenge=village", "music_village"]]) {
  const quest = await open(query);
  check(`${query}: plays ${key}`, await waitForTrack(quest, key, 60_000), JSON.stringify(await state(quest)));
  const s = await state(quest);
  check(`${query}: the island's ambience stays out of the quest`, s.ambienceBus < 0.05, `ambience ${s.ambienceBus}`);
  check(`${query}: no errors`, quest.problems.length === 0, quest.problems.join(" / "));
  await quest.close();
}

// ── 4. The island's sound follows Tadeo ────────────────────
{
  const places = [
    { name: "jungle", at: [0, 104], bed: "jungle", group: "parrot" },
    { name: "swamp", at: [-58, 90], bed: "swamp", group: "frog" },
    { name: "hills", at: [122, -4], bed: "hills", group: "hills" },
    { name: "the outer beach", at: [0, -62], bed: "beach", group: "gull" },
    { name: "inland, by the forest", at: [-10, 6], bed: null, group: "songbird" },
  ];
  for (const { name, at, bed, group } of places) {
    await page.evaluate(([x, z]) => window.game.island.player.teleport(x, z), at);
    await page.waitForTimeout(7000);
    const s = await state(page);
    const others = Object.entries(s.beds).filter(([b]) => b !== bed && b !== "beach");
    const fits = bed ? s.beds[bed] > 0.6 && others.every(([, v]) => v < 0.4) : Object.values(s.beds).every((v) => v < 0.5);
    check(`${name}: its background and animals`, fits && s.group === group, JSON.stringify({ beds: s.beds, group: s.group }));
  }

  const called = await page.evaluate(async () => {
    const audio = window.audio;
    let calls = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (!this.loop && this.buffer.numberOfChannels === 2) calls++;
      return start.apply(this, args);
    };
    await new Promise((r) => setTimeout(r, 22000));
    AudioBufferSourceNode.prototype.start = start;
    return { calls, state: audio.ctx.state };
  });
  check("the animals call a few times in 22 seconds, not constantly", called.calls >= 2 && called.calls <= 8, JSON.stringify(called));
}

// ── 5. Music and ambience step back for a voice ────────────
{
  // Reason: the combat theme keeps one loudness throughout, so a change at the speakers comes from the game and not
  // from a quieter passage of the music
  await page.evaluate(() => {
    window.probe.holdControls(true);
    window.audio.playMusic("music_combat", 0.2);
  });
  await waitForTrack(page, "music_combat");
  // Reason: speech waits for the player's first press, so this press releases any line that was waiting for it. That
  // line must be gone before listening, or the music is already low in what should be the normal measurement.
  await page.keyboard.press("ShiftLeft");
  await page.waitForTimeout(500);
  await page.evaluate(() => window.narration.stop());
  // Reason: long enough for the music to come back up, and past the track's softer first seconds
  await page.waitForTimeout(8000);
  const free = await state(page);
  check("nobody is talking before the measurement", free.musicBus > 0.27 && !(await page.evaluate(() => window.audio.talking)), `music bus ${free.musicBus}`);
  const quiet = await heard(page, 3000);

  const voice = await page.evaluate(async () => {
    const audio = window.audio;
    const manifest = await (await fetch("voices/manifest.json")).json();
    // Reason: the narrator's longest line leaves time to listen while it plays
    const key = Object.keys(manifest).filter((k) => k.startsWith("Erzähler|")).sort((a, b) => b.length - a.length)[0];
    const [speaker, text] = key.split("|");
    const file = manifest[key];
    const decoded = await audio.ctx.decodeAudioData(await (await fetch(`voices/${file}`)).arrayBuffer());
    const data = decoded.getChannelData(0);
    let sum = 0;
    for (const s of data) sum += s * s;
    window.narration.speakLine(text, speaker);
    return { file, seconds: decoded.duration, loudness: Math.sqrt(sum / data.length) };
  });
  await page.waitForTimeout(800);
  const talking = await state(page);
  const dipped = await heard(page, 3000);
  check("while a voice speaks the music steps back", talking.musicBus < free.musicBus * 0.6, `music bus ${free.musicBus} → ${talking.musicBus}, a ${voice.seconds.toFixed(1)}s line`);
  check("and the island's sounds too", talking.ambienceBus < free.ambienceBus * 0.6, `ambience ${free.ambienceBus} → ${talking.ambienceBus}`);
  check("and it is really quieter at the speakers", dipped < quiet * 0.6, `${quiet.toFixed(4)} → ${dipped.toFixed(4)}`);
  check("the voice stays clearly louder than the music under it", voice.loudness > dipped * 2, `voice ${voice.loudness.toFixed(3)}, music ${dipped.toFixed(3)}`);

  await page.evaluate(() => window.narration.stop());
  await page.waitForFunction(() => window.audio.talking === false, null, { timeout: 5000 });
  await page.waitForTimeout(3500);
  const afterCut = await state(page);
  check("a line cut off brings the music back", Math.abs(afterCut.musicBus - free.musicBus) < 0.03, `music bus ${afterCut.musicBus}`);

  await page.evaluate(([speaker, text]) => window.narration.speakLine(text, speaker), VOICE_LINE);
  await page.waitForFunction(() => window.audio.talking === true, null, { timeout: 10_000 });
  await page.waitForFunction(() => window.audio.talking === false, null, { timeout: 15_000 });
  await page.waitForTimeout(3500);
  const after = await state(page);
  check("a line played to its end brings the music back", Math.abs(after.musicBus - free.musicBus) < 0.03, `music bus ${after.musicBus}`);
}

// ── 6. A real track, in real time, past the end of its file ─
{
  const run = await page.evaluate(async () => {
    const audio = window.audio;
    window.probe.holdControls(true);
    audio.setAmbience(false);
    audio.playMusic("music_victory", 0.2);
    const tap = audio.ctx.tap;
    const samples = new Float32Array(tap.fftSize);
    const blocks = [];
    while (blocks.length < 55) {
      let sum = 0;
      let n = 0;
      const end = performance.now() + 1000;
      while (performance.now() < end) {
        tap.getFloatTimeDomainData(samples);
        for (const s of samples) sum += s * s;
        n += samples.length;
        await new Promise((r) => setTimeout(r, 40));
      }
      blocks.push(Math.sqrt(sum / n));
    }
    return { blocks: blocks.slice(3).map((b) => +b.toFixed(4)), key: audio.music?.key };
  });
  const sorted = [...run.blocks].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  check(
    "the victory theme plays on past the end of its 45-second file without a gap",
    run.key === "music_victory" && sorted[0] > median * 0.25,
    `quietest second ×${(sorted[0] / median).toFixed(2)} of the median, median ${median.toFixed(4)}`,
  );
  results.push({ name: "info: loudness per second, victory theme", ok: true, detail: JSON.stringify(run.blocks) });
}

// ── 7. Sound effects ───────────────────────────────────────
{
  // Reason: read from the source, so a key nobody rendered shows up here instead of as a silent moment in a quest.
  // Audio.ts is left out because it holds the list being checked.
  const used = new Set();
  for (const file of readdirSync(SRC, { recursive: true })) {
    if (!file.endsWith(".ts") || file.endsWith("audio/Audio.ts")) continue;
    for (const [, key] of readFileSync(`${SRC}${file}`, "utf8").matchAll(/"((?:sfx|hen|chick)_[a-z_]+)"/g)) used.add(key);
  }
  const unrendered = [...used].filter((key) => !existsSync(`${AUDIO_FILES}${key}.mp3`));
  check("every sound effect in the code has a recording", used.size > 25 && unrendered.length === 0, `${used.size} effects, missing: ${unrendered.join(", ")}`);

  const effects = await page.evaluate(async () => {
    const out = {};
    for (const [key, loading] of window.audio.effects) {
      const e = await loading;
      out[key] = e && { seconds: +e.buffer.duration.toFixed(2), offset: +e.offset.toFixed(3), level: +e.level.toFixed(2) };
    }
    return out;
  });
  writeFileSync(`${OUT}effects.json`, JSON.stringify(effects, null, 1));
  const notLoaded = [...used].filter((key) => !effects[key]);
  const unused = Object.keys(effects).filter((key) => !used.has(key));
  check("every one of them loads with the game", notLoaded.length === 0, `not loaded: ${notLoaded.join(", ")}`);
  check("no effect loads that the code never plays", unused.length === 0, `unused: ${unused.join(", ")}`);
  const late = Object.entries(effects).filter(([, e]) => e && e.offset > e.seconds * 0.6);
  check("no effect is mostly silence", late.length === 0, late.map(([key]) => key).join(", "));

  const reaction = await page.evaluate(async () => {
    const audio = window.audio;
    audio.stopMusic(0.2);
    audio.setAmbience(false);
    await new Promise((r) => setTimeout(r, 2500));
    const samples = new Float32Array(audio.ctx.tap.fftSize);
    const loudest = () => {
      audio.ctx.tap.getFloatTimeDomainData(samples);
      return Math.max(...samples.map(Math.abs));
    };
    const before = loudest();
    const start = performance.now();
    audio.playSfx("sfx_hammer_hit");
    let peak = 0;
    let heardAt = null;
    while (performance.now() - start < 600) {
      const now = loudest();
      peak = Math.max(peak, now);
      if (heardAt === null && now > 0.03) heardAt = performance.now() - start;
      await new Promise((r) => setTimeout(r, 4));
    }
    return { before, peak, heardAt };
  });
  check("an effect is heard right away", reaction.before < 0.03 && reaction.heardAt !== null && reaction.heardAt < 150, `heard after ${reaction.heardAt?.toFixed(0)} ms, peak ${reaction.peak.toFixed(3)}`);
}

check("no errors anywhere on the island", page.problems.length === 0, page.problems.join(" / "));
await browser.close();

const passed = results.every((r) => r.ok);
writeFileSync(`${OUT}summary.json`, JSON.stringify({ passed, when: new Date().toISOString(), results }, null, 2));
console.log(passed ? "\nALL PASS" : "\nFAIL", `→ ${OUT}summary.json`);
process.exit(passed ? 0 : 1);
