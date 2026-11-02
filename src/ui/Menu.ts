/**
 * The menu behind a faint ship's wheel in the corner: switches for sound, music and voice, a list to start the story
 * from any quest and, while Tadeo walks the island freely, a little map to travel by. A click or Esc opens it. While it
 * is open the world stands still and the game sees no keys; the arrows move the light and Space picks, as in every other
 * menu.
 */

import "./menu.css";
import { Engine } from "../core/Engine";
import { keyName } from "../core/Input";
import { audio } from "../audio/Audio";
import { NarrationManager } from "../systems/NarrationManager";
import { Jump, JUMPS } from "../data/jumps";
import { Place, PLACES } from "../data/places";
import { P2 } from "../world/layout";
import { mapPercent, paintIslandMap } from "./IslandMap";

/** What the menu needs from the game. */
export interface MenuOptions {
  engine: Engine;
  /** Tadeo's portrait, which marks his spot on the map. */
  portrait: string;
  heightAt(x: number, z: number): number;
  where(): { x: number; z: number };
  /** Whether Tadeo walks freely on the island right now. Only then can he travel. */
  canTravel(): boolean;
  travel(at: P2): void;
}

/** One thing the light can rest on. */
interface Item {
  el: HTMLElement;
  act(): void;
}

interface Switch {
  el: HTMLElement;
  label: string;
  on(): boolean;
}

const WHEEL = `
  <svg viewBox="-16 -16 32 32" fill="none" stroke="currentColor" stroke-linecap="round">
    <circle r="9.6" stroke-width="2.3"/><circle r="2.8" stroke-width="2"/>
    ${Array.from({ length: 8 }, (_, i) => `<path d="M0-3V-9M0-10.5V-14.6" stroke-width="${i % 2 ? 1.6 : 2.4}" transform="rotate(${i * 45})"/>`).join("")}
  </svg>`;

const DIRECTIONS: Record<string, readonly [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};
/** How much further away a thing straight ahead may be than one off to the side, and still get the light. */
const STRAIGHT_AHEAD = 2.5;
/** Milliseconds of fading to black before the game starts afresh at a picked quest. */
const JUMP_FADE_MS = 300;

function button(className: string, html = ""): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = className;
  el.tabIndex = -1;
  el.innerHTML = html;
  return el;
}

function centre(el: HTMLElement): [number, number] {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}

export class Menu {
  private root = document.createElement("div");
  private map = document.createElement("div");
  private canvas = document.createElement("canvas");
  private you = document.createElement("div");
  private switches: Switch[] = [];
  private chips: Item[] = [];
  private jumps: Item[] = [];
  private pins: Item[] = [];
  /** What the arrows can reach while the menu is open. */
  private items: Item[] = [];
  private lit!: Item;
  private isOpen = false;
  private painted = false;

  constructor(private options: MenuOptions) {
    // Reason: a jump happens once, so reloading the page afterwards goes to the title and "Weiterspielen"
    if (new URLSearchParams(location.search).has("jump")) history.replaceState(null, "", location.pathname);
    this.root.className = "menu-root";

    const scrim = document.createElement("div");
    scrim.className = "menu-scrim";
    scrim.addEventListener("click", () => this.close());

    const panel = document.createElement("div");
    panel.className = "menu-panel";
    const row = document.createElement("div");
    row.className = "menu-row";
    const narration = NarrationManager.getInstance();
    this.addSwitch(row, "Ton", () => !audio.muted, () => audio.toggleMute());
    this.addSwitch(row, "Musik", () => audio.musicOn, () => audio.toggleMusic());
    this.addSwitch(row, "Stimme", () => narration.isEnabled, () => narration.toggleAndAnnounce());
    const go = this.addItem(this.chips, row, button("menu-chip menu-go", "Weiter"), () => this.close());
    this.lit = go;

    const story = document.createElement("div");
    story.className = "menu-story";
    story.innerHTML = `<div class="menu-story-title">Spielen ab</div>`;
    for (const jump of JUMPS) this.addJump(story, jump);

    this.map.className = "menu-map";
    this.map.innerHTML = `<div class="menu-where">Wohin?</div>`;
    this.map.prepend(this.canvas);
    for (const place of PLACES) this.addPin(place);
    this.you.className = "menu-you";
    this.you.innerHTML = `<img src="${options.portrait}" alt="">`;
    this.map.appendChild(this.you);
    const body = document.createElement("div");
    body.className = "menu-body";
    body.append(story, this.map);
    panel.append(row, body);

    const wheel = button("menu-wheel", WHEEL);
    wheel.title = "Menü (Esc)";
    wheel.setAttribute("aria-label", "Menü");
    wheel.addEventListener("click", () => this.toggle());

    this.root.append(scrim, panel, wheel);
    // Reason: a clicked button would keep the focus, and then Space and Enter would click it again
    this.root.addEventListener("mousedown", (e) => e.preventDefault());
    document.body.appendChild(this.root);
    window.addEventListener("keydown", (e) => this.onKey(e));
  }

  private addItem(list: Item[], parent: HTMLElement, el: HTMLElement, act: () => void): Item {
    const item = { el, act };
    list.push(item);
    parent.appendChild(el);
    el.addEventListener("click", act);
    el.addEventListener("pointerenter", () => this.light(item));
    return item;
  }

  private addSwitch(parent: HTMLElement, label: string, on: () => boolean, flip: () => void): void {
    const el = button("menu-chip");
    this.switches.push({ el, label, on });
    this.addItem(this.chips, parent, el, () => {
      flip();
      audio.playSfx("sfx_menu_select", 0.5);
      this.showSwitches();
    });
  }

  private addJump(parent: HTMLElement, jump: Jump): void {
    const el = button("menu-jump", `<span>${jump.emoji}</span><span>${jump.name}</span>`);
    this.addItem(this.jumps, parent, el, () => {
      audio.playSfx("sfx_menu_confirm", 0.7);
      this.root.classList.remove("open");
      // Reason: a fresh page leaves nothing behind of the scene being left, and it is the start that `?challenge` and
      // `?quest` are tested with up to the end card. The world stays paused while the picture fades.
      void this.options.engine.fade(1, JUMP_FADE_MS).then(() => {
        location.search = `?${jump.query}&jump`;
      });
    });
  }

  private addPin(place: Place): void {
    const el = button("menu-pin", `<span class="menu-pin-mark">${place.emoji}</span><span class="menu-pin-name">${place.name}</span>`);
    const { left, top } = mapPercent(place.at[0], place.at[1]);
    el.style.left = `${left}%`;
    el.style.top = `${top}%`;
    this.addItem(this.pins, this.map, el, () => {
      audio.playSfx("sfx_menu_confirm", 0.7);
      this.close();
      this.options.travel(place.at);
    });
  }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat) return;
    const key = keyName(e);
    if (key === "Escape") return this.toggle();
    if (!this.isOpen) return;
    // Reason: this listener comes after those of M and V, so the switches show what those keys just did
    this.showSwitches();
    if (DIRECTIONS[key]) this.step(DIRECTIONS[key]);
    else if (key === "Space") this.lit.act();
  }

  private toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  private open(): void {
    const { engine, canTravel, where, heightAt } = this.options;
    this.isOpen = true;
    engine.paused = true;
    engine.input.setBlocked(true);
    const free = canTravel();
    this.map.hidden = !free;
    this.items = free ? [...this.chips, ...this.jumps, ...this.pins] : [...this.chips, ...this.jumps];
    if (free) {
      if (!this.painted) paintIslandMap(this.canvas, heightAt);
      this.painted = true;
      const { x, z } = where();
      const { left, top } = mapPercent(x, z);
      this.you.style.left = `${left}%`;
      this.you.style.top = `${top}%`;
    }
    this.showSwitches();
    // Reason: Weiter gets the light first, so that a stray Space only closes the menu again
    this.light(this.chips[this.chips.length - 1]);
    this.root.classList.add("open");
    audio.playSfx("sfx_menu_select", 0.5);
  }

  private close(): void {
    this.isOpen = false;
    this.options.engine.paused = false;
    this.options.engine.input.setBlocked(false);
    this.root.classList.remove("open");
  }

  private showSwitches(): void {
    for (const { el, label, on } of this.switches) {
      el.innerHTML = `${label} <span>${on() ? "an" : "aus"}</span>`;
      el.classList.toggle("off", !on());
      // Reason: with all sound off, the music is silent whatever its own switch says
      el.classList.toggle("quiet", label === "Musik" && audio.muted);
    }
  }

  private light(item: Item): void {
    this.lit.el.classList.remove("active");
    this.lit = item;
    item.el.classList.add("active");
  }

  /** Move the light to the nearest thing in that direction. */
  private step([dx, dy]: readonly [number, number]): void {
    const [cx, cy] = centre(this.lit.el);
    let best: Item | null = null;
    let bestScore = Infinity;
    for (const item of this.items) {
      const [x, y] = centre(item.el);
      const along = (x - cx) * dx + (y - cy) * dy;
      const across = Math.abs((x - cx) * dy) + Math.abs((y - cy) * dx);
      const score = along + across * STRAIGHT_AHEAD;
      if (along > 1 && score < bestScore) {
        best = item;
        bestScore = score;
      }
    }
    if (!best) return;
    audio.playSfx("sfx_menu_select", 0.3);
    this.light(best);
  }
}
