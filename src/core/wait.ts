/** Resolves after `ms` of real time (it keeps running while the game is paused). */
export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
