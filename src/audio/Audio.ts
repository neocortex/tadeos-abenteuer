/**
 * Audio — WebAudio playback for the recorded music, the island's ambience and the
 * sound effects, a soft reverb for the effects, music that steps back while someone
 * talks, and the mute toggle (M key, remembered between sessions).
 */

import { Ambience, IslandMix } from "./Ambience";
import { Effect, loadEffect, loadSample, Sample } from "./samples";

const STORAGE_KEY = "schatzkarten_audio";
/** Every sound effect in the game. They load together, so that the first use of each one sounds on time. */
const EFFECTS = [
  "sfx_menu_select", "sfx_menu_confirm", "sfx_dialogue_advance", "sfx_timer_warn", "sfx_simon_correct", "sfx_simon_wrong",
  "sfx_berry_collect", "sfx_item_get", "sfx_heal", "sfx_special", "sfx_chest_open", "sfx_victory_fanfare",
  "sfx_attack", "sfx_defend", "sfx_enemy_attack", "sfx_enemy_hit", "sfx_hit_damage", "sfx_hammer_hit", "sfx_hammer_miss",
  "sfx_lava_fall", "sfx_sizzle", "sfx_rumble", "sfx_boom", "sfx_wave", "sfx_dig", "sfx_door", "sfx_key_jiggle",
  "sfx_key_unlock", "sfx_fox_hop", "sfx_drum", "hen_bok", "hen_bagawk", "hen_cackle", "chick_peep",
];
const MUSIC_LEVEL = 0.28;
const MUSIC_OVERLAP_SECONDS = 4;
/** How much of the music and ambience stays while someone talks. */
const TALKING_DIP = 0.4;
/** Reason: a decoded two-minute track takes about 40 MB of memory, so only the latest few stay decoded */
const DECODED_TRACKS = 3;

class AudioSystem {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private ambienceBus!: GainNode;
  private effects = new Map<string, Promise<Effect | null>>();
  private tracks = new Map<string, Promise<Sample | null>>();
  private music: { key: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  /** The track the game asked for last; it may still be downloading while the one before it plays on. */
  private wantedMusic: string | null = null;
  private ambience: Ambience | null = null;
  private ambienceOn = false;
  private talking = false;
  private pressed = false;
  muted = false;
  /** The music's own switch in the menu; the effects and island sounds play on without it. */
  musicOn = true;

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
      this.muted = saved.muted ?? false;
      this.musicOn = saved.musicOn ?? true;
    } catch {
      // Reason: storage may be unavailable (private mode); default to sound on
    }
    // Reason: browsers may hold audio back until a user gesture — unlock on the first key/click
    const unlock = () => {
      this.pressed = true;
      this.ensureContext();
    };
    window.addEventListener("keydown", unlock);
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyM" && !e.repeat) this.toggleMute();
    });
  }

  playSfx(key: string, volume = 1, rate = 1): void {
    const ctx = this.ctx;
    if (!ctx) return;
    // Reason: a held-back context's clock stands still, so effects made before the first press would all sound on it.
    // The press itself may still be waking the clock, and its menu click should be heard.
    if (ctx.state !== "running" && !this.pressed) return;
    void this.loadEffect(key).then((effect) => {
      if (!effect) return;
      const src = ctx.createBufferSource();
      src.buffer = effect.buffer;
      src.playbackRate.value = rate;
      const g = ctx.createGain();
      g.gain.value = volume * effect.level;
      src.connect(g).connect(this.sfxBus);
      src.start(0, effect.offset);
    });
  }

  private loadEffect(key: string): Promise<Effect | null> {
    let effect = this.effects.get(key);
    if (!effect) {
      effect = loadEffect(this.ctx!, key);
      this.effects.set(key, effect);
    }
    return effect;
  }

  /** Loop a music track, cross-fading from the current one. */
  playMusic(key: string, fade = 1.2): void {
    // Reason: if the browser holds audio back, the track waits at its start and plays from the first key/click
    this.ensureContext();
    if (this.wantedMusic === key) return;
    this.wantedMusic = key;
    void this.loadTrack(key).then((sample) => {
      if (sample && this.wantedMusic === key && this.music?.key !== key) this.startTrack(key, sample, fade);
    });
  }

  private loadTrack(key: string): Promise<Sample | null> {
    let track = this.tracks.get(key);
    if (!track) {
      track = loadSample(this.ctx!, key, MUSIC_OVERLAP_SECONDS);
      this.tracks.set(key, track);
      if (this.tracks.size > DECODED_TRACKS) this.tracks.delete(this.tracks.keys().next().value!);
    }
    return track;
  }

  private startTrack(key: string, sample: Sample, fade: number): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (this.music) {
      const old = this.music;
      old.gain.gain.setTargetAtTime(0, now, fade / 4);
      old.src.stop(now + fade * 2);
    }
    const src = ctx.createBufferSource();
    src.buffer = sample.buffer;
    src.loop = true;
    src.loopStart = sample.loopStart;
    src.loopEnd = sample.loopEnd;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(sample.level, now, fade / 4);
    src.connect(gain).connect(this.musicBus);
    src.start();
    this.music = { key, src, gain };
  }

  stopMusic(fade = 1): void {
    this.wantedMusic = null;
    if (!this.ctx || !this.music) return;
    this.music.gain.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 4);
    this.music.src.stop(this.ctx.currentTime + fade * 2);
    this.music = null;
  }

  /** The island's background sounds and animal calls. */
  setAmbience(on: boolean): void {
    this.ambienceOn = on;
    this.ambience?.setCalling(on);
    this.applyLevels();
  }

  /** Which background sounds and animals to hear, for where Tadeo stands. */
  setIslandMix(mix: IslandMix): void {
    this.ambience?.setMix(mix);
  }

  /** Music and ambience step back while someone speaks, so that a child can follow every word. */
  setTalking(on: boolean): void {
    this.talking = on;
    this.applyLevels();
  }

  // Reason: step back quickly before the first word, and come back slowly once the talking is over
  private applyLevels(smoothing = this.talking ? 0.12 : 0.6): void {
    if (!this.ctx) return;
    const step = this.talking ? TALKING_DIP : 1;
    this.musicBus.gain.setTargetAtTime(this.musicOn ? MUSIC_LEVEL * step : 0, this.ctx.currentTime, smoothing);
    this.ambienceBus.gain.setTargetAtTime(this.ambienceOn ? step : 0, this.ctx.currentTime, smoothing);
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    this.savePreferences();
  }

  toggleMusic(): void {
    this.musicOn = !this.musicOn;
    this.applyLevels(0.1);
    this.savePreferences();
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted: this.muted, musicOn: this.musicOn }));
    } catch {
      // Reason: storage may be unavailable; the switches still work for this session
    }
  }

  private ensureContext(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 6;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(limiter).connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(2.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    reverb.connect(wet).connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? MUSIC_LEVEL : 0;
    this.musicBus.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.6;
    this.sfxBus.connect(this.master);
    this.sfxBus.connect(reverb);

    this.ambienceBus = ctx.createGain();
    this.ambienceBus.gain.value = this.ambienceOn ? 1 : 0;
    this.ambienceBus.connect(this.master);
    this.ambience = new Ambience(ctx, this.ambienceBus);
    for (const key of EFFECTS) void this.loadEffect(key);

    if (this.ambienceOn) this.setAmbience(true);
  }

  /** Decaying stereo noise used as a small-room reverb impulse. */
  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }
}

export const audio = new AudioSystem();
