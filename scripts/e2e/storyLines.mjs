/**
 * E2E: the spoken lines, read from the source (no browser).
 *
 *  1. No spoken line has more than 14 words
 *  2. Nobody says "Monster" (not in a line, not in an item description)
 *  With quest numbers (e.g. `1 2`), instead of 1 and 2: every line of that quest in the design is in the game.
 *
 * Run:  node scripts/e2e/storyLines.mjs [quest ...]
 * Proof: scripts/e2e/out/storyLines/result.json
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { collectLines } from "../voice/lines.mjs";

const OUT = new URL("./out/storyLines/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✔" : "✘"} ${name}${detail ? ` — ${detail}` : ""}`);
};

// Reason: side-game and tip lines outside this work; the design leaves them as they are
const KNOWN_LONG = new Set([
  "Fängst du sie für mich? Lauf einfach in ein Huhn hinein. Dann flattert es in den Stall.",
  "Goldi versteckt sich gern hinter dem Heu. Sie ist flink, aber sie wird schnell müde.",
  "Wo ein Kreis auf dem Boden leuchtet, landet gleich ein Lavabrocken. Da gehe ich schnell weg!",
  "Ich zeige dir ein Muster aus drei Schritten. Schau genau hin und wiederhole es mit den Pfeiltasten!",
]);

const { lines } = collectLines();
const quests = process.argv.slice(2);

if (quests.length === 0) {
  const overlong = lines.filter((l) => l.text.split(/\s+/).length > 14 && !KNOWN_LONG.has(l.text)).map((l) => `${l.speaker}: ${l.text}`);
  check("no spoken line has more than 14 words", overlong.length === 0, overlong.join(" | "));

  const said = lines.filter((l) => /monster/i.test(l.text)).map((l) => `${l.speaker}: ${l.text}`);
  const itemsSource = readFileSync(new URL("../../src/data/items.ts", import.meta.url), "utf8");
  check("nobody says Monster", said.length === 0 && !/monster/i.test(itemsSource), said.join(" | "));
} else {
  // Reason: the design's script is the only source of text; each quest is a "### N." section of it
  const design = readFileSync(new URL("../../docs/superpowers/specs/2026-11-01-story-narration-design.md", import.meta.url), "utf8");
  const script = design.slice(design.indexOf("## The script"), design.indexOf("## What the new lines need"));
  const sections = script.split(/^### /m).slice(1);
  const inGame = new Set(lines.map((l) => `${l.speaker}|${l.text}`));
  for (const n of quests) {
    const section = sections.find((s) => s.startsWith(`${n}.`));
    if (!section) {
      check(`quest ${n}: found in the design`, false);
      continue;
    }
    const wanted = [...section.matchAll(/^- \*\*([^:*]+):\*\* (.+)$/gm)].map((m) => ({ speaker: m[1], text: m[2].trim() }));
    const missing = wanted.filter((l) => !inGame.has(`${l.speaker}|${l.text}`)).map((l) => `${l.speaker}: ${l.text}`);
    check(`quest ${n}: every line of the design is in the game`, missing.length === 0, `${wanted.length} lines, missing: ${missing.join(" | ")}`);
  }
}

writeFileSync(`${OUT}result.json`, JSON.stringify({ passed: results.every((r) => r.ok), quests, results }, null, 2));
await new Promise((resolve) => process.stdout.write("", resolve));
process.exit(results.every((r) => r.ok) ? 0 : 1);
