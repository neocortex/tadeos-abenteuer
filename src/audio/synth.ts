/**
 * Programmatic chiptune sound synthesis. Every sound effect is generated as raw
 * PCM samples here — no external sound files needed.
 */

// ─── Synthesis Primitives ───────────────────────────────────────────────────

export const SAMPLE_RATE = 22050;

/** Generate samples using a synthesis function. */
function generate(duration: number, fn: (t: number, i: number) => number): Float32Array {
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    samples[i] = fn(i / SAMPLE_RATE, i);
  }
  return samples;
}

/** Square wave oscillator (chiptune staple). */
function square(freq: number, t: number): number {
  return Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
}

/** Triangle wave oscillator. */
function triangle(freq: number, t: number): number {
  const p = (freq * t) % 1;
  return 4 * Math.abs(p - 0.5) - 1;
}

/** Sawtooth wave oscillator. */
function sawtooth(freq: number, t: number): number {
  return 2 * ((freq * t) % 1) - 1;
}

/** White noise. */
function noise(): number {
  return Math.random() * 2 - 1;
}

/** Simple linear ADSR envelope (0-1). */
function adsr(t: number, a: number, d: number, s: number, r: number, totalDur: number): number {
  if (t < a) return t / a;
  if (t < a + d) return 1 - ((t - a) / d) * (1 - s);
  if (t < totalDur - r) return s;
  if (t < totalDur) return s * (1 - (t - (totalDur - r)) / r);
  return 0;
}

// ─── Sound Effect Generators ────────────────────────────────────────────────

function genMenuSelect(): Float32Array {
  return generate(0.06, (t) => {
    return square(880, t) * 0.3 * adsr(t, 0.005, 0.02, 0.3, 0.02, 0.06);
  });
}

function genMenuConfirm(): Float32Array {
  return generate(0.12, (t) => {
    const freq = t < 0.06 ? 523 : 659;
    return square(freq, t) * 0.3 * adsr(t, 0.005, 0.03, 0.4, 0.03, 0.12);
  });
}

function genDialogueAdvance(): Float32Array {
  return generate(0.05, (t) => {
    return triangle(660, t) * 0.2 * adsr(t, 0.003, 0.015, 0.2, 0.015, 0.05);
  });
}

function genAttack(): Float32Array {
  return generate(0.15, (t) => {
    const sweep = 800 - t * 4000;
    const wave = sawtooth(Math.max(sweep, 100), t) * 0.4;
    const n = noise() * 0.15 * adsr(t, 0.001, 0.03, 0, 0, 0.06);
    return (wave + n) * adsr(t, 0.005, 0.04, 0.3, 0.05, 0.15);
  });
}

function genDefend(): Float32Array {
  return generate(0.12, (t) => {
    return (Math.sin(2 * Math.PI * 120 * t) * 0.4 + noise() * 0.08) * adsr(t, 0.005, 0.04, 0.3, 0.04, 0.12);
  });
}

function genHeal(): Float32Array {
  return generate(0.3, (t) => {
    // Reason: Rising arpeggio C5-E5-G5 creates a "sparkle" heal effect
    let freq: number;
    if (t < 0.1) freq = 523;
    else if (t < 0.2) freq = 659;
    else freq = 784;
    return triangle(freq, t) * 0.3 * adsr(t, 0.01, 0.05, 0.4, 0.08, 0.3);
  });
}

function genSpecial(): Float32Array {
  return generate(0.5, (t) => {
    const sweep = 200 + t * 1200;
    return sawtooth(sweep, t) * 0.35 * adsr(t, 0.02, 0.1, 0.5, 0.15, 0.5);
  });
}

function genEnemyHit(): Float32Array {
  return generate(0.1, (t) => {
    return (noise() * 0.3 + square(150 - t * 800, t) * 0.2) * adsr(t, 0.003, 0.03, 0.2, 0.03, 0.1);
  });
}

function genEnemyAttack(): Float32Array {
  return generate(0.2, (t) => {
    const sweep = 300 - t * 1000;
    return sawtooth(Math.max(sweep, 60), t) * 0.35 * adsr(t, 0.01, 0.06, 0.3, 0.06, 0.2);
  });
}

function genVictoryFanfare(): Float32Array {
  // Reason: Short ascending 4-note fanfare — C5 E5 G5 C6
  const notes = [523, 659, 784, 1047];
  const noteDur = 0.15;
  const totalDur = notes.length * noteDur + 0.1;
  return generate(totalDur, (t) => {
    const idx = Math.floor(t / noteDur);
    if (idx >= notes.length) return 0;
    const localT = t - idx * noteDur;
    return square(notes[idx], t) * 0.3 * adsr(localT, 0.01, 0.03, 0.5, 0.04, noteDur);
  });
}

function genDefeat(): Float32Array {
  // Descending sad tones: C4 A3 F3 D3
  const notes = [262, 220, 175, 147];
  const noteDur = 0.2;
  const totalDur = notes.length * noteDur + 0.1;
  return generate(totalDur, (t) => {
    const idx = Math.floor(t / noteDur);
    if (idx >= notes.length) return 0;
    const localT = t - idx * noteDur;
    return triangle(notes[idx], t) * 0.3 * adsr(localT, 0.01, 0.05, 0.3, 0.08, noteDur);
  });
}

function genItemGet(): Float32Array {
  // Reason: Classic Zelda-style ascending chime — D5 F#5 A5 D6
  const notes = [587, 740, 880, 1175];
  const noteDur = 0.1;
  const totalDur = notes.length * noteDur + 0.15;
  return generate(totalDur, (t) => {
    const idx = Math.floor(t / noteDur);
    if (idx >= notes.length) {
      const fadeT = t - notes.length * noteDur;
      return triangle(1175, t) * 0.25 * Math.max(0, 1 - fadeT / 0.15);
    }
    const localT = t - idx * noteDur;
    return triangle(notes[idx], t) * 0.3 * adsr(localT, 0.005, 0.02, 0.6, 0.02, noteDur);
  });
}

function genDoor(): Float32Array {
  return generate(0.25, (t) => {
    const sweep = 200 - t * 600;
    return (sawtooth(Math.max(sweep, 50), t) * 0.2 + noise() * 0.05) * adsr(t, 0.01, 0.08, 0.2, 0.1, 0.25);
  });
}

function genLavaFall(): Float32Array {
  return generate(0.3, (t) => {
    const sweep = 1200 - t * 3500;
    return (Math.sin(2 * Math.PI * Math.max(sweep, 80) * t) * 0.3) * adsr(t, 0.005, 0.05, 0.4, 0.1, 0.3);
  });
}

function genHitDamage(): Float32Array {
  return generate(0.12, (t) => {
    return (noise() * 0.35 + square(100, t) * 0.15) * adsr(t, 0.003, 0.03, 0.2, 0.04, 0.12);
  });
}

function genTimerWarn(): Float32Array {
  return generate(0.15, (t) => {
    const beep = t < 0.06 || (t > 0.08 && t < 0.14);
    return beep ? square(1000, t) * 0.25 * adsr(t % 0.08, 0.003, 0.02, 0.3, 0.02, 0.06) : 0;
  });
}

function genBerryCollect(): Float32Array {
  return generate(0.15, (t) => {
    const freq = 600 + t * 1500;
    return triangle(freq, t) * 0.25 * adsr(t, 0.005, 0.03, 0.4, 0.05, 0.15);
  });
}

function genSimonPanel(pitch: number): Float32Array {
  return generate(0.2, (t) => {
    return square(pitch, t) * 0.25 * adsr(t, 0.01, 0.03, 0.5, 0.05, 0.2);
  });
}

function genSimonCorrect(): Float32Array {
  const notes = [523, 659, 784];
  const noteDur = 0.08;
  return generate(0.3, (t) => {
    const idx = Math.floor(t / noteDur);
    if (idx >= notes.length) return 0;
    return triangle(notes[idx], t) * 0.3 * adsr(t - idx * noteDur, 0.005, 0.02, 0.4, 0.02, noteDur);
  });
}

function genSimonWrong(): Float32Array {
  return generate(0.25, (t) => {
    return square(110, t) * 0.3 * adsr(t, 0.01, 0.05, 0.4, 0.1, 0.25);
  });
}

function genDig(): Float32Array {
  return generate(0.08, (t) => {
    return (noise() * 0.25 + square(80, t) * 0.15) * adsr(t, 0.003, 0.02, 0.2, 0.02, 0.08);
  });
}

function genHammerHit(): Float32Array {
  return generate(0.15, (t) => {
    return (noise() * 0.2 + square(400 - t * 2000, t) * 0.3) * adsr(t, 0.003, 0.04, 0.2, 0.05, 0.15);
  });
}

function genHammerMiss(): Float32Array {
  return generate(0.1, (t) => {
    return noise() * 0.2 * adsr(t, 0.005, 0.03, 0.1, 0.04, 0.1);
  });
}

function genWave(): Float32Array {
  return generate(0.4, (t) => {
    // Reason: Filtered noise whoosh simulates a wave
    const mod = Math.sin(2 * Math.PI * 3 * t) * 0.5 + 0.5;
    return noise() * mod * 0.2 * adsr(t, 0.05, 0.1, 0.3, 0.15, 0.4);
  });
}

function genChestOpen(): Float32Array {
  // Grand sparkle arpeggio: C5 E5 G5 B5 C6
  const notes = [523, 659, 784, 988, 1047];
  const noteDur = 0.1;
  const totalDur = notes.length * noteDur + 0.2;
  return generate(totalDur, (t) => {
    const idx = Math.floor(t / noteDur);
    if (idx >= notes.length) {
      const fadeT = t - notes.length * noteDur;
      return triangle(1047, t) * 0.25 * Math.max(0, 1 - fadeT / 0.2);
    }
    return triangle(notes[idx], t) * 0.3 * adsr(t - idx * noteDur, 0.005, 0.02, 0.5, 0.02, noteDur);
  });
}

function genKeyJiggle(): Float32Array {
  return generate(0.15, (t) => {
    const jitter = Math.sin(2 * Math.PI * 40 * t) * 200;
    return triangle(300 + jitter, t) * 0.2 * adsr(t, 0.005, 0.04, 0.2, 0.04, 0.15);
  });
}

function genKeyUnlock(): Float32Array {
  return generate(0.2, (t) => {
    if (t < 0.05) return noise() * 0.15 * adsr(t, 0.003, 0.02, 0.1, 0.01, 0.05);
    return triangle(880, t) * 0.25 * adsr(t - 0.05, 0.005, 0.03, 0.4, 0.08, 0.15);
  });
}

// ─── Registry ───────────────────────────────────────────────────────────────

/** Every sound by key; generated lazily on first use. */
export const SOUND_GENERATORS: Record<string, () => Float32Array> = {
  sfx_menu_select: genMenuSelect,
  sfx_menu_confirm: genMenuConfirm,
  sfx_dialogue_advance: genDialogueAdvance,
  sfx_attack: genAttack,
  sfx_defend: genDefend,
  sfx_heal: genHeal,
  sfx_special: genSpecial,
  sfx_enemy_hit: genEnemyHit,
  sfx_enemy_attack: genEnemyAttack,
  sfx_victory_fanfare: genVictoryFanfare,
  sfx_defeat: genDefeat,
  sfx_item_get: genItemGet,
  sfx_door: genDoor,
  sfx_lava_fall: genLavaFall,
  sfx_hit_damage: genHitDamage,
  sfx_timer_warn: genTimerWarn,
  sfx_berry_collect: genBerryCollect,
  sfx_simon_panel_up: () => genSimonPanel(523),
  sfx_simon_panel_down: () => genSimonPanel(659),
  sfx_simon_panel_left: () => genSimonPanel(784),
  sfx_simon_panel_right: () => genSimonPanel(988),
  sfx_simon_correct: genSimonCorrect,
  sfx_simon_wrong: genSimonWrong,
  sfx_dig: genDig,
  sfx_hammer_hit: genHammerHit,
  sfx_hammer_miss: genHammerMiss,
  sfx_wave: genWave,
  sfx_chest_open: genChestOpen,
  sfx_key_jiggle: genKeyJiggle,
  sfx_key_unlock: genKeyUnlock,
};
