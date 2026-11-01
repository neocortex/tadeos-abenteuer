/**
 * Recorded sounds from public/audio/ (rendered by scripts/audio/generate.mjs): loading them, matching their
 * loudness, making loops run without a seam and short effects sound at once.
 */

export interface Sample {
  buffer: AudioBuffer;
  /** Gain that brings this sound to the shared loudness, so a new take of a sound needs no hand-tuning. */
  level: number;
  loopStart: number;
  loopEnd: number;
}

export interface Effect {
  buffer: AudioBuffer;
  /** Gain that brings this effect to the shared peak. */
  level: number;
  /** Where in the file the sound really starts, in seconds. */
  offset: number;
}

const BLOCK_SECONDS = 0.4;
const SHARED_LOUDNESS = 0.2;
const SHARED_EFFECT_PEAK = 0.7;
/** A block quieter than this share of the sound's typical loudness counts as a fade or silence. */
const QUIET = 0.3;
/** An effect has started once it reaches this share of its peak. */
const EFFECT_ONSET = 0.05;

async function decode(ctx: AudioContext, key: string): Promise<AudioBuffer> {
  const res = await fetch(`audio/${key}.mp3`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ctx.decodeAudioData(await res.arrayBuffer());
}

/** RMS loudness of each short block of the sound. */
function blockLoudness(buffer: AudioBuffer): Float32Array {
  const size = Math.floor(buffer.sampleRate * BLOCK_SECONDS);
  const blocks = new Float32Array(Math.max(1, Math.floor(buffer.length / size)));
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < blocks.length * size && i < data.length; i++) {
      blocks[Math.floor(i / size)] += data[i] * data[i];
    }
  }
  return blocks.map((sum) => Math.sqrt(sum / (size * buffer.numberOfChannels)));
}

/**
 * Fades the end of the sound into its start, right inside the buffer.
 * The first pass plays the real beginning. Every later pass jumps from the end of the file to just behind the part
 * that was blended in, so the music simply carries on.
 * Reason: a rendered track has its own beginning and end, and MP3 pads both, so looping the plain file would click.
 */
function blendLoop(buffer: AudioBuffer, start: number, end: number, overlap: number): void {
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < overlap; i++) {
      const t = ((i + 0.5) / overlap) * (Math.PI / 2);
      // Reason: equal power keeps the loudness steady through the fade, which equal gains would not
      data[end - overlap + i] = data[end - overlap + i] * Math.cos(t) + data[start + i] * Math.sin(t);
    }
  }
}

/**
 * Loads and prepares one sound.
 *
 * @param ctx The audio context to decode for.
 * @param key The sound's key, which is also its file name.
 * @param overlapSeconds How long the end fades into the start; 0 for a sound that does not loop.
 * @returns The sound, or null if it cannot play (the game carries on without it).
 */
export async function loadSample(ctx: AudioContext, key: string, overlapSeconds = 0): Promise<Sample | null> {
  try {
    const buffer = await decode(ctx, key);
    const blocks = blockLoudness(buffer);
    // Reason: the 90th percentile ignores both a single loud moment and the pauses between two bird calls
    const typical = [...blocks].sort((a, b) => a - b)[Math.floor(blocks.length * 0.9)];
    const level = SHARED_LOUDNESS / Math.max(typical, 0.001);
    if (!overlapSeconds) return { buffer, level, loopStart: 0, loopEnd: buffer.duration };

    // Reason: leave out a quiet intro and a fade-out, or the loudness would dip at every pass of the seam
    const blockSize = Math.floor(buffer.sampleRate * BLOCK_SECONDS);
    const start = blocks.findIndex((b) => b >= typical * QUIET) * blockSize;
    let lastLoud = blocks.length - 1;
    while (lastLoud > 0 && blocks[lastLoud] < typical * QUIET) lastLoud--;
    const end = (lastLoud + 1) * blockSize;
    const overlap = Math.floor(overlapSeconds * buffer.sampleRate);
    blendLoop(buffer, start, end, overlap);
    return { buffer, level, loopStart: (start + overlap) / buffer.sampleRate, loopEnd: end / buffer.sampleRate };
  } catch (error) {
    console.warn(`[audio] cannot play ${key} (run: npm run audio)`, error);
    return null;
  }
}

/**
 * Loads one short sound effect.
 *
 * @param ctx The audio context to decode for.
 * @param key The effect's key, which is also its file name.
 * @returns The effect, or null if it cannot play (the game carries on without it).
 */
export async function loadEffect(ctx: AudioContext, key: string): Promise<Effect | null> {
  try {
    const buffer = await decode(ctx, key);
    let peak = 0;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      for (const sample of buffer.getChannelData(c)) peak = Math.max(peak, Math.abs(sample));
    }
    // Reason: a rendered sound may open with a moment of silence, and a hit has to sound on the frame it lands
    let first = buffer.length;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const start = buffer.getChannelData(c).findIndex((sample) => Math.abs(sample) >= peak * EFFECT_ONSET);
      if (start >= 0) first = Math.min(first, start);
    }
    return { buffer, level: SHARED_EFFECT_PEAK / Math.max(peak, 0.001), offset: first / buffer.sampleRate };
  } catch (error) {
    console.warn(`[audio] cannot play ${key} (run: npm run audio)`, error);
    return null;
  }
}
