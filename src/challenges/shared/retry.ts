/**
 * Too many mistakes in a challenge: the screen fades to black, the Erzähler
 * says one short, kind line, and it fades back in at the last checkpoint.
 * No "Game Over", no scary sound. Each challenge brings its own lines and
 * says in `restore` how its checkpoint is put back.
 */

import { DialogueScript } from "../../data/dialogues";
import { ChallengeContext } from "../types";

const FADE_MS = 600;

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Fade out, `restore()` the checkpoint while the screen is black, say one of `lines` over black, fade back in.
 * Waits first for a dialogue that is still open, so two never stack.
 */
export async function retryFromCheckpoint(ctx: ChallengeContext, lines: DialogueScript[], restore: () => void): Promise<void> {
  const { engine, ui } = ctx;
  while (ui.dialogue.isOpen) await nextFrame();
  await engine.fade(1, FADE_MS);
  restore();
  await ui.sayOverBlack(lines[Math.floor(Math.random() * lines.length)]);
  await engine.fade(0, FADE_MS);
}
