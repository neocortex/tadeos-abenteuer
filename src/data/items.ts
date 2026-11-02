/**
 * Item definitions for the inventory system.
 */

export interface ItemDef {
  name: string;
  description: string;
}

export const ITEMS: Record<string, ItemDef> = {
  sword: {
    name: "Magisches Schwert",
    description: "Ein verzaubertes Schwert aus der Höhle. Es schneidet durch die Dornen.",
  },
  berry: {
    name: "Zauberbeeren",
    description: "Magische Beeren aus dem Zauberwald. Damit werden Wesen wieder lieb.",
  },
  key: {
    name: "Goldener Schlüssel",
    description: "Ein goldener Schlüssel von den Dorfbewohnern. Öffnet die Schatztruhe.",
  },
  hammer: {
    name: "Goldener Hammer",
    description: "Ein mächtiger Hammer vom Berggipfel. Er zerschlägt das Zauber-Eis.",
  },
};
