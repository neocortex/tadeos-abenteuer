/**
 * What every E2E test needs: Chrome with the game's GPU flags and the proof a run leaves behind.
 * Move a helper here only once two converted tests need the same version of it.
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

export const BASE = process.argv[2] ?? "http://localhost:5199";

/**
 * Open a page in Chrome.
 *
 * @param {{ autoplay?: boolean }} [options] `autoplay: false` keeps the browser's real rule that sound waits for a
 *   key or click, which the checks of the title screen depend on.
 * @returns {Promise<{ browser: import("playwright").Browser, page: import("playwright").Page, errors: string[], logs: string[] }>}
 */
export async function launch({ autoplay = true } = {}) {
  const args = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];
  if (autoplay) args.push("--autoplay-policy=no-user-gesture-required");
  const browser = await chromium.launch({ channel: "chrome", args });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  // Reason: Vite's reload socket would restart the game under a test when any source file changes
  await page.routeWebSocket(/.*/, () => {});
  const errors = [];
  const logs = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    logs.push(`[${m.type()}] ${m.text()}`);
    if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text());
  });
  return { browser, page, errors, logs };
}

/**
 * Start a test's record of checks; it is saved to `scripts/e2e/out/<name>/summary.json`.
 *
 * @param {string} name The test's name, which is also its folder of proof.
 * @returns {{ out: string, check: (name: string, ok: boolean, detail?: unknown) => void, finish: () => never }}
 *   `finish` saves the summary and ends the process, with exit code 1 if any check failed.
 */
export function proof(name) {
  const out = `scripts/e2e/out/${name}`;
  mkdirSync(out, { recursive: true });
  const results = [];
  const check = (what, ok, detail = "") => {
    results.push({ name: what, ok, detail: String(detail) });
    console.log(`${ok ? "✔" : "✘"} ${what}${detail !== "" ? ` — ${detail}` : ""}`);
  };
  const finish = () => {
    const passed = results.every((r) => r.ok);
    writeFileSync(`${out}/summary.json`, JSON.stringify({ passed, when: new Date().toISOString(), results }, null, 2));
    console.log(`\n${results.filter((r) => r.ok).length}/${results.length} ${passed ? "PASS" : "FAIL"} → ${out}/summary.json`);
    process.exit(passed ? 0 : 1);
  };
  return { out, check, finish };
}
