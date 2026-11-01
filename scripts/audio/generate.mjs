/**
 * Renders the music, island sounds and sound effects once with ElevenLabs and saves them to public/audio/<key>.mp3.
 * Only new sounds, changed prompts and deleted files cost credits; sounds nobody lists any more are deleted.
 * rendered.json next to this script remembers which prompt made which file.
 *
 * Needs ELEVENLABS_API_KEY in .env (a paid plan, because free plans cannot use the Music API).
 *
 *   npm run audio              render what is missing
 *   npm run audio -- --dry-run show what would be rendered, spend nothing
 *
 * To hear another take of a sound, delete its MP3 and run this again.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const OUT = new URL("../../public/audio/", import.meta.url).pathname;
const RENDERED = new URL("./rendered.json", import.meta.url).pathname;
const FORMAT = "mp3_44100_128";
const MUSIC_MODEL = "music_v2_5";
const SOUND_MODEL = "eleven_text_to_sound_v2";

/**
 * What the tracks share, so the game sounds like one soundtrack: a classic fantasy adventure sound, with a folk melody
 * on fiddle and horn and nothing that whistles.
 */
const FOLK_STYLE =
  "Warm orchestral folk for a children's fantasy adventure game, played by real-sounding instruments: a folk fiddle " +
  "and warm French horns over harp, soft strings and plucked mandolin, with a touch of marimba. A strong, singable " +
  "melody with a slightly Celtic folk sound. Charming and full of wonder. No flutes, no ocarina, no whistles and no " +
  "whistling. Instrumental.";
const DARK_STYLE =
  "Dark, mysterious music for exploring a deep cave by torchlight in a fantasy adventure game, played by real-sounding " +
  "instruments: cellos and violas carrying a slow, haunting melody in the middle register over a soft low drone, with " +
  "choir-like pads, distant chimes and a soft, slow drum. Tense and full of secrets, with a hint of wonder. No flutes, " +
  "no ocarina and no whistles. No sudden loud hits and no screams. Instrumental.";
/** Reason: the game loops each track by fading its end into its start, which works best when no real ending exists */
const LOOPABLE = "The same energy from the first bar to the last, with no big ending, no slowing down and no fade-out.";
const track = (seconds, mood, style = FOLK_STYLE) => ({ kind: "music", seconds, prompt: `${style} ${mood} ${LOOPABLE}` });
const bed = (prompt) => ({ kind: "sound", seconds: 30, loop: true, prompt: `${prompt} Continuous, no music, no voices.` });
const call = (seconds, prompt) => ({ kind: "sound", seconds, loop: false, prompt: `${prompt} Isolated, close up, no music, no voices.` });
const effect = (seconds, prompt) => ({ kind: "sound", seconds, loop: false, prompt: `${prompt} Clean and isolated, for a children's adventure game, with no background and no speech.` });

/** Every recorded sound by the key the game plays it under. */
const SOUNDS = {
  music_title: track(90, "A hopeful, slightly grand main theme with a heroic French horn melody answered by the fiddle, over strummed mandolin and marching drums. Major key, about 100 BPM."),
  music_overworld: track(120, "Sunny, adventurous music for wandering around a tropical island, ready to set off on a journey. A light marching rhythm on soft hand drums, with fiddle and French horn taking turns on the tune. Mixolydian mode, about 100 BPM."),
  music_village: track(120, "Cosy, homely music for a friendly little fishing village. Plucked harp and mandolin with a gentle fiddle, and a smile in every bar. Major key, about 85 BPM."),
  music_dungeon: track(90, "Slow, with a clear melody that keeps coming back. Minor key, about 60 BPM.", DARK_STYLE),
  music_mountain: track(90, "Brave, uplifting music for climbing a high mountain in the open air, with the summit in sight. A steady marching rhythm, soaring strings and a heroic French horn melody. Major key, about 110 BPM."),
  music_combat: track(90, "Exciting, brave music for a playful showdown. Driving marching drums, racing strings, fast mandolin and a heroic French horn. Never scary. Minor key, about 140 BPM."),
  music_victory: track(45, "Joyful celebration after a big win. A bright French horn and string fanfare, bouncing marimba and hand claps. Major key, about 120 BPM."),

  amb_beach: bed("Gentle waves washing onto a sandy tropical beach, with a soft sea breeze."),
  amb_jungle: bed("Lush tropical jungle atmosphere: a soft hum of insects, leaves rustling and water trickling far away."),
  amb_swamp: bed("Lively swamp atmosphere, close and clear: crickets chirping steadily, water bubbling and reeds rustling."),
  amb_hills: bed("Soft wind blowing over open grassy hills, with long grass rustling."),

  call_gull_1: call(3, "A single seagull calling from above a beach."),
  call_gull_2: call(3, "Two seagulls calling to each other."),
  call_songbird_1: call(3, "A small songbird singing a short cheerful phrase."),
  call_songbird_2: call(3, "A blackbird singing a short melodic phrase."),
  call_parrot_1: call(2, "A tropical parrot squawking twice."),
  call_parrot_2: call(3, "An exotic jungle bird with a bright, hooting, musical call."),
  call_frog_1: call(2, "One big frog croaking a few times."),
  call_frog_2: call(3, "A few small frogs croaking together."),
  call_hills_1: call(3, "A skylark singing high in the sky."),
  call_hills_2: call(2, "A single sheep bleating in the distance."),

  sfx_menu_select: effect(0.5, "A soft wooden tick, like one light tap on a marimba bar."),
  sfx_menu_confirm: effect(0.7, "Two quick, warm marimba notes going up, a friendly yes."),
  sfx_dialogue_advance: effect(0.5, "A very soft, short flick of a paper page."),
  sfx_timer_warn: effect(0.6, "Two quick, tense taps on a wood block."),
  sfx_simon_correct: effect(0.8, "Three quick marimba notes going up, a small happy right answer."),
  sfx_simon_wrong: effect(0.8, "Two soft, low wooden notes going down, a gentle oops, not harsh."),
  sfx_berry_collect: effect(0.5, "A small, bright, soft pop with a tiny bell, picking up a berry or a coin."),
  sfx_item_get: effect(1.2, "A bright, happy jingle of harp and bells, the sound of finding something special."),
  sfx_heal: effect(1.5, "A warm, gentle harp glissando going up with soft sparkles, a healing spell."),
  sfx_special: effect(1.5, "A magical shimmer of rising chimes and sparkles, a fairy-tale spell."),
  sfx_chest_open: effect(1.5, "An old wooden chest creaking open, followed by a soft sparkle."),
  sfx_victory_fanfare: effect(2.5, "A short, triumphant fanfare on warm French horns, ending on a bright chord."),
  sfx_attack: effect(0.6, "A quick sword swing, a whoosh with a light metallic ring."),
  sfx_defend: effect(0.6, "A sword hitting a wooden shield, one short solid knock."),
  sfx_enemy_attack: effect(1.5, "A big, friendly cartoon ogre giving a short, funny, angry roar, not scary."),
  sfx_enemy_hit: effect(0.7, "A cartoon punch landing on a big soft belly, one deep comic thud."),
  sfx_hit_damage: effect(0.6, "A soft cartoon bonk, a small comic bump, not painful."),
  sfx_hammer_hit: effect(0.7, "A wooden mallet hitting stone, one solid knock."),
  sfx_hammer_miss: effect(0.5, "A quick swish of air, a light whoosh."),
  sfx_lava_fall: effect(1.2, "A heavy rock falling fast through the air, a descending whoosh."),
  sfx_sizzle: effect(1.2, "A short hiss of hot lava with a puff of steam."),
  sfx_rumble: effect(2.5, "A deep, low earth rumble, the ground trembling under a volcano, with no sharp sounds."),
  sfx_boom: effect(1, "One deep, soft bass drum boom, like a giant heartbeat."),
  sfx_wave: effect(1.2, "A splash of water, something big landing in the sea."),
  sfx_dig: effect(0.6, "A shovel digging into soft sandy earth, one dull crunchy thump."),
  sfx_door: effect(2, "A heavy stone door slowly grinding open in a cave."),
  sfx_key_jiggle: effect(0.8, "A metal key jiggling and scratching inside an old lock."),
  sfx_key_unlock: effect(0.8, "A big old lock clicking open with a solid clunk."),
  sfx_fox_hop: effect(0.8, "A small, happy fox giving a short, playful yip."),
  sfx_drum: effect(0.6, "One warm hand drum hit, a single medium tom with a round tone."),
  hen_bok: effect(0.5, "A single short hen cluck."),
  hen_bagawk: effect(0.8, "A startled hen squawking ba-gawk."),
  hen_cackle: effect(1.5, "A proud hen cackling, a few clucks ending in a loud ba-gawk."),
  chick_peep: effect(0.6, "A small chick peeping twice."),
};

/** Changes with anything that shapes the sound, so a changed prompt is rendered again. */
const fingerprint = (sound) => createHash("sha1").update(JSON.stringify([sound, FORMAT, MUSIC_MODEL, SOUND_MODEL])).digest("hex").slice(0, 16);

async function post(url, body) {
  const res = await fetch(`https://api.elevenlabs.io/v1/${url}?output_format=${FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElevenLabs answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

const render = ({ kind, seconds, loop, prompt }) =>
  kind === "music"
    ? post("music", { prompt, music_length_ms: seconds * 1000, model_id: MUSIC_MODEL, force_instrumental: true })
    : post("sound-generation", { text: prompt, duration_seconds: seconds, loop, model_id: SOUND_MODEL });

const rendered = existsSync(RENDERED) ? JSON.parse(readFileSync(RENDERED, "utf8")) : {};
const fileOf = (key) => `${OUT}${key}.mp3`;
const missing = Object.keys(SOUNDS).filter((key) => !existsSync(fileOf(key)) || rendered[key] !== fingerprint(SOUNDS[key]));
const unused = existsSync(OUT) ? readdirSync(OUT).filter((f) => f.endsWith(".mp3") && !SOUNDS[f.slice(0, -4)]) : [];
const minutes = (kind) => missing.filter((key) => SOUNDS[key].kind === kind).reduce((sum, key) => sum + SOUNDS[key].seconds, 0) / 60;

console.log(`${Object.keys(SOUNDS).length} sounds, ${missing.length} to render (${minutes("music").toFixed(1)} min music, ${minutes("sound").toFixed(1)} min sounds), ${unused.length} unused`);

if (process.argv.includes("--dry-run")) {
  for (const key of missing) console.log(`  ${key}: ${SOUNDS[key].prompt}`);
  process.exit(0);
}

if (missing.length && !process.env.ELEVENLABS_API_KEY) {
  console.error("ELEVENLABS_API_KEY is not set (see .env)");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
for (const [index, key] of missing.entries()) {
  // Reason: stop at the first error; files already saved are kept, so running again resumes here
  writeFileSync(fileOf(key), await render(SOUNDS[key]));
  rendered[key] = fingerprint(SOUNDS[key]);
  writeFileSync(RENDERED, `${JSON.stringify(rendered, null, 1)}\n`);
  console.log(`[${index + 1}/${missing.length}] ${key}`);
}

for (const file of unused) {
  rmSync(`${OUT}${file}`);
  delete rendered[file.slice(0, -4)];
}
writeFileSync(RENDERED, `${JSON.stringify(rendered, null, 1)}\n`);
console.log("Done.");
