# Story Narration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every quest tells the child, in simple spoken lines, where Tadeo is going and why, what just happened, and where he goes next.

**Architecture:** The text moves from `data/dialogues.ts` into one file per part of the story under `data/story/`, and `data/dialogues.ts` merges them so no import changes. Each quest's lines then go in with the small staging they need: new talks where the game already pauses, camera beats moved to their new lines, and the one visual addition, the small island and the fin seen from the summit. A new script check compares the game's lines with the design, and all voices are recorded once, at the end.

**Tech Stack:** Three.js, TypeScript, Vite, Playwright E2E scripts in `scripts/e2e/`, ElevenLabs through `npm run voices`.

**Spec:** `docs/superpowers/specs/2026-11-01-story-narration-design.md`. Its section "The script" is the only source of the text. This plan names keys and never repeats the lines.

## Global Constraints

- At most 14 words per spoken line. The four old lines in `KNOWN_LONG` (Task 1) are outside this work and stay.
- "Wesen", never "Monster", in every line and in `data/items.ts`.
- Nobody says what they can't know.
- New conversations only go where the game already pauses. Bubbles stay as they are.
- No change to how the challenges play, the quest order, the rewards, the HUD or the saves. The island changes in no way; the summit's far view is the only new visual.
- The side games, the villagers' casual chats, `CHULETA_HINTS` and `classic-2d/` stay.
- Chuleta only speaks with her voice and portrait inside the challenges.
- If a line doesn't fit the picture, a small wording change is fine as long as the facts and the simplicity stay. Change the design in the same commit, so that `storyLines.mjs` stays true, and list the change in the task's report.
- `src/game/Game.ts` stays under about 550 lines, and every other file under about 500.
- Controls are arrows + Space only.
- Work only in `.claude/worktrees/story-narration` on branch `story-narration`. **Never push or merge: a push to `main` publishes to tadeo.fun.** The main checkout's uncommitted title-flight changes are left alone.
- Commit messages are conventional, name no AI co-author, never use `--no-verify`, and end with `Claude-Session: https://claude.ai/code/session_01PytftvSdytuXzqiAjmviAG`.
- Nothing is recorded before Task 9. Until then the game logs `[voice] no recording` for new lines and uses browser speech, which is expected.
- E2E runs: start `npx vite --port 5199` from the worktree, after `lsof -nP -iTCP:5199 -sTCP:LISTEN` shows nothing. The tests have this port hardcoded, and another session's server on it would test the wrong code.
- Sentence-count checks in old E2Es (`sentences(l) <= 2`, and the cave's `> 2`) would flag 29 approved lines. Each task that owns such a check removes the sentence part and keeps the 14-word part, and renames it "every line has at most 14 words".
- `finishDialogue` and similar helpers that give up after a number of presses must allow two presses per line of the longest talk they pass through. Raise the limit in whichever task first fails on it.

## Review Focus

1. **Closing the game in the middle of a long talk (the elder's or the Hüter's, about two minutes each).** Continuing returns to the same quest, the talk plays again from its start and the quest isn't counted as done. Tested in Task 3.
2. **A wrong answer at the first tablet, a walk back to a lit tablet, and a reload at the lake.** `lake_first_tablet` plays once per visit, `lake_lit_first` and `lake_lit_second` once each and in that order, and a lit tablet stays silent. After a reload the tablets are dark again and the first-tablet talk plays again, as the tablets are forgotten. Tested in Task 3.
3. **Reaching the elder from a different side.** Paco stands in the picture for every "Hm, hm." whichever way Tadeo came. Tested in Task 3.
4. **A different window shape at the summit.** The small island and the fin stay in the frame and above the dialogue box on 4:3, 16:9 and very wide windows. Tested in Task 6.
5. **Making a mistake in a challenge.** A longer "before" talk that plays again after every mistake would wear out a 7-year-old, so a lava hit, a hit from the ogre or a missed throw at the shark never replays `volcano_enter`, `ogre_enter` or `sea_shark`. Tested in Tasks 2, 5 and 7.

---

### Task 1: Branch, story files and the line check

**Files:**
- Create: `src/data/story/arrival.ts`, `legend.ts`, `caveForest.ts`, `villageOgreMountain.ts`, `seaTreasure.ts`, `finale.ts`
- Modify: `src/data/dialogues.ts`
- Create: `scripts/e2e/storyLines.mjs`
- Modify: `scripts/e2e/all.mjs`, `AGENTS.md`

**Interfaces:**
- Produces: `DIALOGUES`, `DialogueLine`, `DialogueScript` from `data/dialogues.ts`, unchanged for importers.
- Produces: in each story file `export const ARRIVAL: Record<string, DialogueScript>` (`LEGEND`, `CAVE_FOREST`, `VILLAGE_OGRE_MOUNTAIN`, `SEA_TREASURE`, `FINALE`), written with a helper local to the file, because `scripts/voice/lines.mjs` looks for helpers per file:
  `const line = (speaker: string, text: string): DialogueLine => ({ speaker, portrait: "", text });`
- Produces: `node scripts/e2e/storyLines.mjs` checks the two rules, and stays in `all.mjs` for good. `node scripts/e2e/storyLines.mjs 1 2` only compares those quests with the design, so that it can pass before the last "Monster" has gone.

| File | Keys today |
|---|---|
| `arrival.ts` | `intro_bottle`, `intro_treasure`, `intro_arrival`, `volcano_enter`, `volcano_paco_thanks`, `volcano_paco_boat` |
| `legend.ts` | `elder_legend`, `elder_after_map`, `lake_wrong`, `lake_hueter`, `lake_rhyme`, `lake_after_rhyme` |
| `caveForest.ts` | `cave_enter`, `cave_sword`, `forest_enter`, `forest_complete` |
| `villageOgreMountain.ts` | `village_enter`, `village_after`, `ogre_enter`, `ogre_defeat`, `ogre_boulder`, `ogre_boulder_done`, `mountain_enter`, `mountain_complete` |
| `seaTreasure.ts` | `sea_dock`, `sea_crossing`, `sea_shark`, `shark_defeat`, all `treasure_*` |
| `finale.ts` | `finale_sail_back`, `finale_climb`, `finale_hueter_thanks`, `festival_talk` |

- [ ] **Step 1: Create the worktree and commit the design and this plan**

The hedge commit `42aba37` is on `magic-forest-arch`, one commit ahead of `main`, so the branch starts there.

```bash
git worktree add .claude/worktrees/story-narration -b story-narration 42aba37
cp .env .claude/worktrees/story-narration/.env
cp docs/superpowers/specs/2026-11-01-story-narration-design.md .claude/worktrees/story-narration/docs/superpowers/specs/
cp docs/superpowers/plans/2026-11-01-story-narration.md .claude/worktrees/story-narration/docs/superpowers/plans/
cd .claude/worktrees/story-narration && npm ci && npx tsc --noEmit -p .
git add docs/superpowers && git commit -m "docs: story narration design and plan"
```

Expected: the type-check prints nothing.

- [ ] **Step 2: Write `scripts/e2e/storyLines.mjs`, using `collectLines()` from `scripts/voice/lines.mjs`**

No browser. Same `check` and proof style as the other E2Es, with proof in `scripts/e2e/out/storyLines/result.json`. The script section is the design's text between `## The script` and `## What the new lines need`; a section runs from `### N.` to the next `###`; a line is `- **Speaker:** text`.

```js
// Reason: side-game and tip lines outside this work; the design leaves them as they are
const KNOWN_LONG = new Set([
  "Fängst du sie für mich? Lauf einfach in ein Huhn hinein. Dann flattert es in den Stall.",
  "Goldi versteckt sich gern hinter dem Heu. Sie ist flink, aber sie wird schnell müde.",
  "Wo ein Kreis auf dem Boden leuchtet, landet gleich ein Lavabrocken. Da gehe ich schnell weg!",
  "Ich zeige dir ein Muster aus drei Schritten. Schau genau hin und wiederhole es mit den Pfeiltasten!",
]);
check("no spoken line has more than 14 words", overlong.length === 0, overlong.join(" | "));
check("nobody says Monster", said.length === 0 && !/monster/i.test(itemsSource), said.join(" | "));
// only when quest numbers are passed, instead of the two checks above, for each number:
check(`quest ${n}: every line of the design is in the game`, missing.length === 0, missing.join(" | "));
```

- [ ] **Step 3: Run it to see it fail for the right reasons**

Run: `node scripts/e2e/storyLines.mjs; node scripts/e2e/storyLines.mjs 1`
Expected: the first run FAILS on the Monster check (5 lines and `items.ts`) and passes the 14-word check. The second FAILS on quest 1, listing the new lines.

- [ ] **Step 4: Save the baseline**

Run: `grep -hE '^  [a-zA-Z_]+: \[' src/data/dialogues.ts | sed 's/: \[.*//' | sort > "$TMPDIR/keys.txt"`
Expected: 40 keys in that file.

- [ ] **Step 5: Move the 40 scripts into the story files, text unchanged, and let `dialogues.ts` keep the types and merge them**

Story files use `import type { DialogueLine, DialogueScript } from "../dialogues"`, so nothing imports in a circle at run time. First confirm with `grep -rn "portrait_" src/ui src/characters` that no `portrait_*` string is a key in `Snapshots`: `Dialogue.showLine` then falls back to the speaker's face, so dropping those strings keeps the same picture. Add the `TESTS` entry `storyLines` to `all.mjs` and to the E2E list in `AGENTS.md`.

- [ ] **Step 6: Verify nothing changed**

Run: `grep -hE '^  [a-zA-Z_]+: \[' src/data/story/*.ts | sed 's/: \[.*//' | sort | diff - "$TMPDIR/keys.txt"`
Expected: no output.
Run: `npm run voices -- --dry-run`
Expected: nothing to render, nothing to remove.
Run: `npx tsc --noEmit -p . && node scripts/e2e/title.mjs`
Expected: clean, and the test passes.

- [ ] **Step 7: Commit**

```bash
git add src/data scripts/e2e/storyLines.mjs scripts/e2e/all.mjs AGENTS.md
git commit -m "refactor(story): one file per part of the story, and a check for the lines"
```

### Task 2: Quests 1 and 2, the landing and the volcano

**Files:**
- Modify: `src/data/story/arrival.ts`, `src/game/chuletaLines.ts` (`CHULETA_INTRO` only)
- Modify: `src/game/opening.ts`, `src/challenges/volcano/rescue.ts`
- Test: `scripts/e2e/island.mjs`, `scripts/e2e/volcano.mjs`

**Interfaces:**
- Consumes: `line` helper and `ARRIVAL` from Task 1.
- Produces: keys `intro_sailing`, `intro_landing`, `volcano_paco_found`.

- [ ] **Step 1: Write the failing checks**

In `island.mjs`:
- `"the sailing is told over black"`: while each `intro_sailing` line shows, the dialogue's layer has `style.zIndex === "101"` (only `sayOverBlack` sets it), and it is `""` afterwards.
- `"Tadeo reacts before Chuleta climbs out"`: in `heard`, the last line of `intro_landing` comes before the first line of `CHULETA_INTRO`, and that comes before `intro_arrival`.
- `"mashing Space through the opening"`: Space every 60 ms from the title to the first control; afterwards no dialogue is open, `zIndex` is `""`, Tadeo walks on an arrow press and Chuleta is out of the backpack.
- Update the portrait check at about line 499, which looks for "Danke, Junge! Ich bin Käpt'n Paco.", to "Puh! Danke, Junge! Mein Fuß steckte ganz fest."

In `volcano.mjs`:
- Before the wait for the lift prompt, pass the dialogue with `volcano_paco_found`. Its lines are said with the name tags Tadeo and Stimme, and the check is `"Tadeo sees who called before the lift"`.
- Extend the `want` list (about line 578) with every line of `volcano_paco_found`, `volcano_paco_thanks` and `volcano_paco_boat`, taken from `DIALOGUES`.
- `"the old stone is in shot on the hole line, and Paco on his answer"`: screenshots `paco_stone.png` and `paco_answer.png`, plus the stone's position projected with the camera inside the frame on the hole line.
- `"Paco walks off on the narrator's last line"`: Paco's position has moved towards `exitAt` between the start of that line and one second later.
- `"mashing Space through the rescue"`: Space every 60 ms from the goal on; the quest ends and Tadeo is back in control.
- **Review Focus 5:** `"a hit doesn't replay the talk"`: after a lava hit, the "Autsch!" and the fresh start at the checkpoint, the first line of `volcano_enter` was heard exactly once.

- [ ] **Step 2: Run them to see them fail**

Run: `node scripts/e2e/storyLines.mjs 1 2; node scripts/e2e/island.mjs; node scripts/e2e/volcano.mjs`
Expected: FAIL on the missing lines and the checks above.

- [ ] **Step 3: Put in the lines of quests 1 and 2 and the flow**

- `opening.ts`, `findTheBottle`: `await d.ui.sayOverBlack("intro_sailing")` after the fade.
- `opening.ts`, `arrive`: `await d.talk("intro_landing")` before `chuleta.climbOut()`.
- `rescue.ts`, `rescueEnding`: `await ui.say("volcano_paco_found")` after Tadeo's walk and facing and before `r.heaver`, with `onLine` not yet set. The beats move to `line === 8` (stone shot) and `line === 9` (wide). Paco's walk to `exitAt` starts on the narrator's line of `volcano_paco_boat`; a counter or `speaker === "Erzähler"` finds it.

- [ ] **Step 4: Run them to see them pass**

Run: `npx tsc --noEmit -p . && node scripts/e2e/storyLines.mjs 1 2 && node scripts/e2e/island.mjs && node scripts/e2e/volcano.mjs`
Expected: all PASS, with screenshots in `scripts/e2e/out/volcano/` showing the stone and the hole.

- [ ] **Step 5: Commit**

```bash
git add src scripts/e2e
git commit -m "feat(story): Tadeo reacts on landing, and Paco's rescue is told"
```

### Task 3: Quests 3 and 4, the elder and the lake

**Files:**
- Modify: `src/data/story/legend.ts`, `src/game/chuletaLines.ts` (`CHULETA_CHEERS[4]`)
- Modify: `src/game/lake.ts`, `src/game/Game.ts`
- Test: `scripts/e2e/island.mjs`, and `scripts/e2e/hueterView.mjs` if it breaks

**Interfaces:**
- Consumes: `Lake.solve(i: number): Promise<boolean>`, `Lake.rise()`, `Lake.fade()`, the `talk` dependency of `Lake`.
- Produces: `Lake.awaken(): Promise<void>`, which plays `lake_still`, `rise()`, the talk `[...lake_hueter, ...lake_rhyme, ...lake_after_rhyme]`, `fade()` and `lake_gone`.
- Produces: keys `lake_first_tablet`, `lake_lit_first`, `lake_lit_second`, `lake_still`, `lake_gone`.

- [ ] **Step 1: Write the failing checks in `island.mjs`**

Replace the pinned old checks: "Paco says Hm, hm.", "the legend is nine lines", the rhyme index, "the Hüter speaks first", the ghost's "11 lines under the limit of 12".

- `"the legend is told whole"`: `heard` equals `DIALOGUES.elder_legend` as `Speaker: text`, the map card opens right after "Moment! Ich habe eine Karte! Sie war in einer Flaschenpost.", and `elder_after_map` follows.
- `"the lake is told in order"`: `lake_still`, then `lake_hueter`, `lake_rhyme`, `lake_after_rhyme`, then `lake_gone`. `ghost` is false on the last line of `lake_still` and true on the first of `lake_hueter`, and false on the first of `lake_gone`.
- `"the rhyme says Wesen"`: the heard lines contain "Also: Das Schwert für die Dornen. Die Beeren für die Wesen."
- `"Chuleta asks nothing old"`: the cheer after quest 4 is "Näher, als du denkst? Gack! Jetzt schaue ich mich dauernd um!"
- `"mashing Space through the lake"`: Space every 60 ms from the third tablet on; afterwards the ghost is gone, the quest has advanced and Tadeo is in control.
- **Review Focus 1:** `"a reload in the elder's talk keeps the quest"` and `"a reload in the Hüter's talk keeps the quest"`: reload after line 10 of each talk, press Continue. The quest number is unchanged. The talk starts again on its first line (at the lake after solving the three tablets again, since they are forgotten) and plays to its end, and only then does the quest advance.
- **Review Focus 2:** `"a wrong answer doesn't replay the first talk"`: at the first tablet, a wrong answer and then the right one. `lake_first_tablet` is heard once, `lake_wrong` once, `lake_lit_first` once. `"a lit tablet stays silent"`: Space at the lit tablet adds no line. `"the second tablet says the second line"`: `lake_lit_second` comes after the second, and `lake_first_tablet` doesn't. `"after a reload the lake starts over"`: after a reload with one tablet lit, `solved` is 0, and the next tablet plays `lake_first_tablet` and then `lake_lit_first`.
- **Review Focus 3:** `"Paco is in the picture for every Hm, hm"`: walk to the elder once from each of two opposite sides. On each of Paco's lines in `elder_legend` and `elder_after_map`, his head position projected with the island camera has `|x| < 1` and `|y| < 1`. Screenshot `elder_paco_<side>.png`.

- [ ] **Step 2: Run them to see them fail**

Run: `node scripts/e2e/storyLines.mjs 3 4; node scripts/e2e/island.mjs`
Expected: FAIL on the missing lines and the checks above.

- [ ] **Step 3: Put in the lines and move the flow into `lake.ts`**

- `Lake.solve`: `lake_first_tablet` when `solved.size === 0`, before the riddle's lines. After lighting and the 2000 ms wait, `lake_lit_first` or `lake_lit_second` by `solved.size`, with the tablet still in shot, before `rig.setShot(null, 1)`.
- `Lake.awaken` as in Interfaces. The third tablet's shot is still on when `lake_still` plays, because `solve` returns `true` before clearing it.
- `Game.readTablet`: `if (await this.lake.solve(i)) { await this.lake.awaken(); await this.advance(); }` with the same run wrapper as today. Drop the `DIALOGUES` import from `Game.ts`, which only used it there.
- If Review Focus 3 fails from one side, `Game.talk` gets an optional third parameter `also?: Npc` that widens the shot to hold that person too, and only `meetElder` passes it, with Paco. Other conversations keep their camera.

- [ ] **Step 4: Run them to see them pass**

Run: `npx tsc --noEmit -p . && wc -l src/game/Game.ts && node scripts/e2e/storyLines.mjs 3 4 && node scripts/e2e/island.mjs`
Expected: all PASS, and `Game.ts` is shorter than before. `node scripts/e2e/hueterView.mjs` still works, because `lake.rise()` keeps its name.

- [ ] **Step 5: Commit**

```bash
git add src scripts/e2e
git commit -m "feat(story): the elder and the Hüter tell the legend in pieces"
```

### Task 4: Quests 5 and 6, the cave and the Zauberwald

**Files:**
- Modify: `src/data/story/caveForest.ts`, `src/data/items.ts:26`
- Modify: `src/challenges/cave/script.ts`, `src/challenges/cave/index.ts`, `src/challenges/forest/script.ts`, `src/game/StoryWorld.ts`
- Test: `scripts/e2e/cave.mjs`, `scripts/e2e/forest.mjs`

**Interfaces:**
- Produces: keys `cave_sword_before`, `cave_sword_after`, `forest_hedge`, `forest_hedge_open`. The key `cave_sword` goes.

- [ ] **Step 1: Write the failing checks**

In `cave.mjs`:
- Line 401 uses `DIALOGUES.cave_sword`: `"the sword talk surrounds the pull"`: `cave_sword_before` is heard before the pull, and `cave_sword_after` with the sword held up.
- Lines 428-429: the Global Constraint on sentence counts.

In `forest.mjs`:
- `"the hedge talk surrounds the opening"`: `forest_hedge`, then the opening, then `forest_hedge_open`, then `forest_enter`. The hedge is up on the last line of `forest_hedge` and gone on the first line of `forest_hedge_open`. Screenshot `hedge_talk.png`.
- `"no hedge talk when the hedge is gone"`: call `beforeQuest(FOREST_QUEST)` a second time in the same page: no new line, and no second opening.
- `"a Continue at the arch plays the talk"`: `?quest=6` from a save, in front of the arch: `forest_hedge` plays, the hedge opens and the forest starts.
- `"mashing Space through the hedge talks"`: Space every 60 ms from the gate on; the hedge is gone and the forest challenge is running.
- `"the berries' card says Wesen"`: the berries' description contains "Wesen".

- [ ] **Step 2: Run them to see them fail**

Run: `node scripts/e2e/storyLines.mjs 5 6; node scripts/e2e/cave.mjs; node scripts/e2e/forest.mjs`
Expected: FAIL on the missing lines and the checks above.

- [ ] **Step 3: Put in the lines and the flow**

- `cave/index.ts`: `cave_sword.slice(0, 1)` (about line 338) becomes `"cave_sword_before"`, and `slice(1)` (about line 352) becomes `"cave_sword_after"`.
- `cave/script.ts` (`moleAsks`, `moleSmells`, `moleAsksTwo`, `moleFed[1]`, `paintings`) and `forest/script.ts` (`MEET_FOX`) as in the design.
- `StoryWorld.beforeQuest(FOREST_QUEST)`: inside `if (this.hedge.up)`, `await talk("forest_hedge")`, `hedgeOpening.play()`, `await talk("forest_hedge_open")`.
- `items.ts:26`: "Monster" becomes "Wesen".

- [ ] **Step 4: Run them to see them pass**

Run: `npx tsc --noEmit -p . && node scripts/e2e/storyLines.mjs 5 6 && node scripts/e2e/cave.mjs && node scripts/e2e/forest.mjs`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src scripts/e2e
git commit -m "feat(story): the mole's cave and the thorns are told"
```

### Task 5: Quests 7 to 9, the lines of the village, the ogre and the mountain

**Files:**
- Modify: `src/data/story/villageOgreMountain.ts`, `src/challenges/village/trials.ts` (`WELCOME`)
- Test: `scripts/e2e/village.mjs`, `scripts/e2e/ogre.mjs`, `scripts/e2e/mountain.mjs`

**Interfaces:**
- Consumes: `lines.slice(1)` in `challenges/ogre/story.ts` returns more lines with no flow change.

- [ ] **Step 1: Write the failing checks**

- `village.mjs:225` wants "Die Beeren" from Chuleta, and the new line must still contain it. `village.mjs:233`, `ogre.mjs:484`, `mountain.mjs:359`: the Global Constraint on sentence counts.
- `village.mjs`: `"mashing Space through the village talks"`: Space every 60 ms through `village_enter` and `village_after`; the quest advances and Tadeo is in control.
- `ogre.mjs`: `"mashing Space through the ogre's talks"`: the ogre ends friendly and the boulder is lifted, with the state row in `storyChecks.mjs` for quest 9 true. `"the ogre says why he is angry"`: every line of `ogre_enter` is heard.
- **Review Focus 5**, `ogre.mjs`: `"a hit doesn't replay the talk"`: after the ogre has hit Tadeo, the first line of `ogre_enter` was heard exactly once.

- [ ] **Step 2: Run them to see them fail**

Run: `node scripts/e2e/storyLines.mjs 7 8 9; node scripts/e2e/village.mjs; node scripts/e2e/ogre.mjs; node scripts/e2e/mountain.mjs`
Expected: FAIL on the missing lines. `mountain.mjs` may still pass apart from its 14-word rename.

- [ ] **Step 3: Put in the lines of quests 7 to 9**

No flow changes. `TIP` and `TIPS`, the drum and maths lines, `BERRY_OFFER`, `BERRY_THANKS` and `ogre_boulder` stay.

- [ ] **Step 4: Run them to see them pass**

Run: `npx tsc --noEmit -p . && node scripts/e2e/storyLines.mjs 7 8 9 && node scripts/e2e/village.mjs && node scripts/e2e/ogre.mjs && node scripts/e2e/mountain.mjs`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src scripts/e2e
git commit -m "feat(story): the elder sends Tadeo on, and the ogre explains himself"
```

### Task 6: The summit view, the small island and the fin

**Files:**
- Modify: `src/challenges/mountain/decor.ts`, `src/challenges/mountain/MountainChallenge.ts`
- Test: `scripts/e2e/mountain.mjs`

**Interfaces:**
- Consumes: `this.summit.faceDir` (the sea is in the direction `out = faceDir.negate()`), `SpiralCamera.setShot(fn, seconds)` (`this.cam` in `MountainChallenge`), `Decor.update(dt, time, camera, snowAmount)`, the haze of `Decor.volcano` (`#a9c4dd`, lerp 0.4), scene fog near 160, far 820.
- Produces: `Decor.addFarIsle(out: THREE.Vector3): void`, and `Decor.farIsle: { island: THREE.Object3D; fin: THREE.Object3D } | null`. `update` moves the fin in a slow circle around the island. Everything goes on `owned`, so that `dispose` frees it.

- [ ] **Step 1: Write the failing checks in `mountain.mjs`**

At the narrator's line of `mountain_complete` and at each later line of that talk, for each of the window sizes 1280×720, 1024×768 and 1920×800 (**Review Focus 4**):
- `"the island and the fin are in the picture at <size>"`: both positions projected with the camera have `|x| < 0.85`, and their screen y is above `.dialogue`'s `getBoundingClientRect().top` by at least 8 px and below the top of the window.
- `"the fin is big enough to see at <size>"`: from fin base to fin tip is at least 14 px on screen, and the island is at least 60 px wide. Screenshot `summit_isle_<size>.png`.

Once:
- `"the fin swims"`: its position differs between two frames 0.5 s apart.
- `"the view costs next to nothing"`: `renderer.info.render.calls` at the summit is at most 3 higher than with `farIsle.island.visible` and `farIsle.fin.visible` set to false.
- `"the view before the narrator's line is unchanged"`: the camera position on the talk's first line is the epic shot of today, within 0.5 units once settled.

- [ ] **Step 2: Run them to see them fail**

Run: `node scripts/e2e/mountain.mjs`
Expected: FAIL, as `farIsle` is undefined.

- [ ] **Step 3: Implement `Decor.addFarIsle` and the camera**

- Island: one low `LatheGeometry` or merged mesh with a sand rim and one green top, coloured towards the haze as `volcano()` is, on the sea plane in direction `out`, inside fog far 820. Fin: one dark mesh, made bigger than life and standing on the water.
- `MountainChallenge.finale`: call `addFarIsle(out)` before the talk. Set `ui.dialogue.onLine` so that on the first `speaker === "Erzähler"` line, `cam.setShot(fn, 2.0)` holds the island and the fin above the dialogue box from behind Tadeo's shoulder. Clear `onLine` after the talk. The shot before that line stays as it is today.
- Check the screenshots: no cloud of the ring in `Decor`'s constructor may stand in front of the island. Choose the distance or the camera height to avoid it.

- [ ] **Step 4: Run them to see them pass**

Run: `npx tsc --noEmit -p . && node scripts/e2e/mountain.mjs && node scripts/e2e/fps.mjs`
Expected: all PASS, and the three screenshots show the island and the fin clearly.

- [ ] **Step 5: Commit**

```bash
git add src scripts/e2e
git commit -m "feat(mountain): the summit looks out on the small island and the fin"
```

### Task 7: Quests 10 and 11, the shark and the treasure island

**Files:**
- Modify: `src/data/story/seaTreasure.ts`
- Modify: `src/challenges/sea/SeaChallenge.ts`, `src/challenges/treasure/script.ts`, `src/challenges/treasure/reveals.ts`
- Test: `scripts/e2e/sea.mjs`, `scripts/e2e/treasure.mjs`

**Interfaces:**
- Consumes: `lines(name, from, to)` in `challenges/treasure/stage.ts:58`.
- Produces: keys `sea_landed`, `treasure_dig_start`, `treasure_heart_before`, `treasure_heart_held`, `treasure_crown`.

- [ ] **Step 1: Write the failing checks**

In `sea.mjs`:
- Rename `"Chuleta knows what a monster needs"` to `"Chuleta knows what the shark needs"`. Line 379: the Global Constraint on sentence counts.
- `"the berries come out on Hier, Hai!"`: not raised on "Da ist er! Der Hai, der mein Boot kaputt gemacht hat!", raised on "Hier, Hai! Mach den Mund auf!".
- `"mashing Space still raises the berries once"`: Space every 60 ms through `sea_shark`; the berries are up once and the fight starts.
- `"the shark's goodbye and the landing are apart"`: all of `shark_defeat` is heard at sea, and all of `sea_landed` on the sand.
- **Review Focus 5:** `"a missed throw doesn't replay the talk"`: after a throw that misses, the narrator's first line of `sea_shark` was heard exactly once.

In `treasure.mjs`:
- Remove `"a conversation has at most 5 lines"` (line 510). Widen the `"hammer only for the ice"` check's regex so that it allows the design's new lines, while still failing if the hammer is used on anything but the ice.
- `"the treasure is told in order"`: `treasure_arrive`, map card, walk, `treasure_dig_start`, `treasure_dig`, `treasure_hammer`, `treasure_note`, `treasure_heart_before`, `treasure_heart_held`, `treasure_plan`, `treasure_gold`, `treasure_crown`, `treasure_erupt`.
- `"the heart is held on the second talk"`: Tadeo doesn't hold it on the last line of `treasure_heart_before`, and does on the first line of `treasure_heart_held`.
- `"the crown is on his head when he talks about it"`: `crownFlight` has landed by the first line of `treasure_crown`, and the ground doesn't shake until after its last line.
- `"Tadeo doesn't know the plan"`: `treasure_plan` holds "Keine Ahnung" and doesn't hold "Rakete".
- `"mashing Space through the reveals"`: Space every 60 ms from the X on; the order above holds and the eruption starts.

- [ ] **Step 2: Run them to see them fail**

Run: `node scripts/e2e/storyLines.mjs 10 11; node scripts/e2e/sea.mjs; node scripts/e2e/treasure.mjs`
Expected: FAIL on the missing lines and the checks above.

- [ ] **Step 3: Put in the lines and the flow**

- `SeaChallenge`: `onLine` raises the berries on Tadeo's second line of `sea_shark`, with a counter local to that scene. `shark_defeat.slice(0, 1)` (about line 316) becomes all of `shark_defeat`, and `slice(1)` (about line 400) becomes `"sea_landed"`.
- `treasure/script.ts`, `reveals.ts`: `lines("treasure_arrive", 0, 1)` becomes the whole key, `(1, 2)` becomes `treasure_dig_start`, and `treasure_heart` `(0, 1)` and `(1)` become the two new keys. `treasure_crown` with `HERO_SHOT` in `takeGold`, after `crownFlight` and the cheer, before the eruption.

- [ ] **Step 4: Run them to see them pass**

Run: `npx tsc --noEmit -p . && node scripts/e2e/storyLines.mjs 10 11 && node scripts/e2e/sea.mjs && node scripts/e2e/treasure.mjs`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src scripts/e2e
git commit -m "feat(story): the shark and the treasure island are told"
```

### Task 8: Quest 12, the last climb and the festival

**Files:**
- Modify: `src/data/story/finale.ts`
- Modify: `src/challenges/finale/ending.ts`, `src/challenges/festival/script.ts`
- Test: `scripts/e2e/finale.mjs`

**Interfaces:**
- Consumes: `home.lookAtStone()`, `home.settle()`, `home.sleep(s)`, `hueter.fade()`; `welcome()`, `talk()`, `faceShot(a, distance, side)`, `f.atWide`, `f.ogre`, `f.plan` in `festival/script.ts`.
- Produces: keys `finale_stone`, `finale_calm`, `festival_opening`.

- [ ] **Step 1: Write the failing checks in `finale.mjs`**

- Remove `MAX_FESTIVAL_LINES` and `"the festival stays a short conversation"`. The `shotAt` moments keep working; add the ones below.
- `"the stone is told before the prompt"`: `finale_stone` plays after the walk and before the "Einsetzen" prompt shows.
- `"it is calm before the Hüter rises"`: `finale_calm` plays after the eruption has died down and before the ghost appears, and the ghost is still there on the last line of `finale_hueter_thanks`.
- `"the festival opens with the cheer"`: `festival_opening` plays while everyone cheers, and Paco is still seated on its last line.
- `"every festival line has its own beat"`: the beats fired after the talk equal `DIALOGUES.festival_talk.length`, which is 25.
- Screenshots and checks: `"wide on the stillness"`: nobody moves on "Auf einmal ist es ganz still am Feuer.", with `festival_still.png`. `"the camera is on the ogre"`: the ogre's head projected inside the frame on "Und ich? Gibt es auch Kuchen?", with `festival_ogre.png`. `"the plan comes out"`: `f.plan.visible` turns true on "Und das hier war auch in der Truhe. Was ist das nur?". `"the elder takes over"`: the camera is on the elder on "Zeig mal her... Das gibt es doch nicht! Ein Plan für eine Rakete!". `"the drawing is in the picture"`: the plan is still visible and projected inside the frame on the elder's next line, with `festival_plan.png`. `"Tadeo looks at the stars"`: he looks up on the talk's last line.
- `"mashing Space through the festival"`: Space every 60 ms from `festival_opening` on; the party runs, the camera is back to the party's shot and the end card comes with "Und bald kommt die Rakete!".
- `"mashing Space through the ending"`: Space every 60 ms from the stone on; the eruption ends, the ghost fades and the festival starts.

- [ ] **Step 2: Run them to see them fail**

Run: `node scripts/e2e/storyLines.mjs 12; node scripts/e2e/finale.mjs`
Expected: FAIL on the missing lines and the checks above.

- [ ] **Step 3: Put in the lines and the flow**

- `ending.ts`: `finale_stone` after `home.lookAtStone()`, before the phase `"wait"`. `finale_calm` after `home.settle(); home.sleep(1.8)`.
- `festival/script.ts`: `await s.ui.say("festival_opening")` in `welcome()` after the jump and before Paco gets up. The `beats` array grows to 25 entries. Today's 8 beats stay on the lines they belong to, and a new line gets a camera on whoever speaks. Line 2 of the talk is the wide shot with nobody moving. The ogre's name tag has `SPEAKERS.Oger`'s emoji, so no portrait work is needed.

- [ ] **Step 4: Run them to see them pass**

Run: `npx tsc --noEmit -p . && node scripts/e2e/storyLines.mjs 12 && node scripts/e2e/finale.mjs`
Expected: all PASS, with the screenshots matching their lines.

- [ ] **Step 5: Commit**

```bash
git add src scripts/e2e
git commit -m "feat(story): the truth comes out at the fire, and the rocket is a story for another time"
```

### Task 9: Voices, full run and docs

**Files:**
- Create or replace: `public/voices/*`, `public/voices/manifest.json`
- Modify: `AGENTS.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: every key from Tasks 2 to 8.

- [ ] **Step 1: Check the text is final**

Run: `node scripts/e2e/storyLines.mjs && node scripts/e2e/storyLines.mjs 1 2 3 4 5 6 7 8 9 10 11 12`
Expected: PASS for both rules and all twelve quests.

- [ ] **Step 2: Dry-run the voices**

Run: `npm run voices -- --dry-run`
Expected: only lines from the design, about 230 lines and 12,000 characters, no speaker missing and no dynamic line. Stop and report if the count is far above that, because it costs credits.

- [ ] **Step 3: Record**

Run: `npm run voices`
Expected: finishes without an error, and a second `npm run voices -- --dry-run` reports nothing to render. The owner approved this spend with the design.

- [ ] **Step 4: Update the docs**

- `AGENTS.md`, Conventions: every quest follows before, when something happens, after. At most 14 words per line, a moment runs 3 to 8 lines and a big scene 10 to 30. "Wesen", never "Monster". Nobody says what they can't know. Architecture: story text lives in `data/story/`, with `data/dialogues.ts` merging it.
- `CHANGELOG.md`: an entry on the longer narration and the summit view. The main checkout's own uncommitted title-flight entry is not part of this branch, so expect a merge there later.

- [ ] **Step 5: Run everything**

Run: `node scripts/e2e/all.mjs`
Expected: `ALL PASS` in `scripts/e2e/out/all.json`, and `voices.mjs` finds a recording for every line.
Run: `npx tsc --noEmit -p . && wc -l src/game/Game.ts src/data/story/*.ts`
Expected: clean, `Game.ts` is under about 550, and each story file is under about 500.

- [ ] **Step 6: Commit**

```bash
git add public/voices AGENTS.md CHANGELOG.md
git commit -m "feat(voices): record the longer story"
```

- [ ] **Step 7: Stop for the owner**

No push and no merge. The branch holds the hedge commit `42aba37`, so merging it also brings that commit to `main` if `magic-forest-arch` isn't merged first. The final check is the owner's: Tadeo plays it, stays with the long scenes and can retell the story.
