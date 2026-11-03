/**
 * Fishing overlays on top of the shared game UI: the catch card (fish icon,
 * name, size and a badge), the catch ring over a biting fish, a controls
 * hint at the bottom and the fish slots for the status pill.
 */

import "./fishing.css";
import { IconKey } from "./icons";

/** Catch ring sizes in screen pixels: the fixed target circle, and the ring when wide open. */
const TARGET_R = 30;
const OPEN_R = 120;

export interface CardInfo {
  icon: IconKey;
  name: string;
  size?: string;
  badge?: string;
  rare?: boolean;
}

export class FishingHud {
  private root: HTMLElement;
  private card: HTMLElement;
  private ring: HTMLElement;
  private hoop: SVGCircleElement;
  private lastClosed = 0;
  private hint: HTMLElement;
  private hintHtml = "";

  constructor(layer: HTMLElement, private icons: Record<IconKey, string>) {
    this.root = document.createElement("div");
    this.root.className = "fish-hud";
    this.root.innerHTML = `
      <div class="fish-card"><div class="rays"></div><div class="box">
        <img class="icon" alt=""><div class="name"></div><div class="size"></div><div class="badge"></div>
      </div></div>
      <div class="fish-ring"><svg viewBox="-130 -130 260 260">
        <circle class="target" r="${TARGET_R}"></circle><circle class="hoop" r="${OPEN_R}"></circle>
      </svg></div>
      <div class="fish-hint"></div>`;
    layer.appendChild(this.root);
    this.card = this.root.querySelector(".fish-card")!;
    this.ring = this.root.querySelector(".fish-ring")!;
    this.hoop = this.root.querySelector(".fish-ring .hoop")!;
    this.hint = this.root.querySelector(".fish-hint")!;
  }

  /** Pop the catch card in (stays until `hideCard`). */
  showCard(info: CardInfo): void {
    this.card.querySelector<HTMLImageElement>(".icon")!.src = this.icons[info.icon];
    this.card.querySelector(".name")!.textContent = info.name;
    this.card.querySelector(".size")!.textContent = info.size ?? "";
    this.card.querySelector(".badge")!.textContent = info.badge ?? "";
    this.card.classList.toggle("rare", !!info.rare);
    requestAnimationFrame(() => this.card.classList.add("show"));
  }

  hideCard(): void {
    this.card.classList.remove("show");
  }

  get cardShowing(): boolean {
    return this.card.classList.contains("show");
  }

  /**
   * The catch ring at a screen point, or null to hide: a fixed target circle and
   * a ring around it that shrinks onto it as `closed` goes from 0 to 1. Nearly
   * open it fades away, and it turns from red through yellow to green.
   */
  showRing(px: { x: number; y: number } | null, closed: number): void {
    this.ring.classList.toggle("show", !!px);
    if (!px) return;
    this.ring.style.left = `${px.x}px`;
    this.ring.style.top = `${px.y}px`;
    this.hoop.setAttribute("r", String(TARGET_R + (OPEN_R - TARGET_R) * (1 - closed)));
    this.hoop.style.stroke = `hsl(${Math.round(closed * 120)}, 90%, 55%)`;
    this.hoop.style.opacity = String(Math.min(1, closed / 0.25));
    // Reason: a press closes the ring in a jump; restarting the pulse animation makes each press feel like a tug
    if (closed > this.lastClosed + 0.02) {
      this.ring.classList.remove("hit");
      void this.ring.offsetWidth;
      this.ring.classList.add("hit");
    }
    this.lastClosed = closed;
  }

  /** Controls hint at the bottom (HTML), or null to hide. */
  showHint(html: string | null): void {
    if (html !== null && this.hintHtml !== html) this.hint.innerHTML = this.hintHtml = html;
    this.hint.classList.toggle("show", html !== null);
  }

  /** Status pill content: one slot per fish to catch, filled with the icons caught so far. */
  pill(caught: IconKey[], goal: number, fresh: boolean): string {
    const slots = Array.from({ length: goal }, (_, i) => {
      const kind = caught[i];
      if (!kind) return `<span class="fish-slot empty"></span>`;
      const pop = fresh && i === caught.length - 1 ? " new" : "";
      return `<img class="fish-slot${pop}" src="${this.icons[kind]}" alt="">`;
    });
    return `<span class="fish-slots">${slots.join("")}</span><span>${caught.length} / ${goal}</span>`;
  }

  dispose(): void {
    this.root.remove();
  }
}
