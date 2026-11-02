/**
 * Keyboard input state shared by all scenes. Tracks held keys plus
 * "just pressed" edges: presses made since the last frame are readable from
 * the start of a frame until the next one begins.
 */

const ALIASES: Record<string, string> = {
  KeyW: "ArrowUp",
  KeyA: "ArrowLeft",
  KeyS: "ArrowDown",
  KeyD: "ArrowRight",
  Enter: "Space",
  NumpadEnter: "Space",
};

const GAME_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]);

/** The game's name for the key of a key event: WASD are the arrows, Enter is Space. */
export const keyName = (e: KeyboardEvent): string => ALIASES[e.code] ?? e.code;

export class Input {
  private held = new Set<string>();
  private pressed = new Set<string>();
  /** Presses that arrived since the current frame began. */
  private incoming = new Set<string>();
  private blocked = false;

  constructor() {
    window.addEventListener("keydown", (e) => {
      const code = keyName(e);
      // Reason: arrow keys and space would otherwise scroll the page
      if (GAME_KEYS.has(code)) e.preventDefault();
      if (this.blocked) return;
      if (!e.repeat) this.incoming.add(code);
      this.held.add(code);
    });
    window.addEventListener("keyup", (e) => {
      this.held.delete(keyName(e));
    });
    window.addEventListener("blur", () => this.held.clear());
  }

  /** While blocked the game sees no keys at all: the menu is open and reads them itself. */
  setBlocked(on: boolean): void {
    this.blocked = on;
    this.held.clear();
    this.pressed.clear();
    this.incoming.clear();
  }

  isDown(code: string): boolean {
    return this.held.has(code);
  }

  justPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  /** Consume a press so later checks in the same frame don't see it again. */
  consume(code: string): boolean {
    return this.pressed.delete(code);
  }

  /** Movement vector from arrow keys: x = right, y = down (screen space). */
  axis(): { x: number; y: number } {
    const x = (this.isDown("ArrowRight") ? 1 : 0) - (this.isDown("ArrowLeft") ? 1 : 0);
    const y = (this.isDown("ArrowDown") ? 1 : 0) - (this.isDown("ArrowUp") ? 1 : 0);
    return { x, y };
  }

  /**
   * Call once at the start of every frame.
   * Reason: presses stay readable after the frame's update, so code that continues after an
   * `await` (scripted sequences waiting for a frame) still sees the press that resumed it.
   */
  beginFrame(): void {
    const read = this.pressed;
    this.pressed = this.incoming;
    this.incoming = read;
    this.incoming.clear();
  }
}
