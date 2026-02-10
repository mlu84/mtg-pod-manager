export type PlaySlot = {
  deckId: string | null;
  deckName: string;
  playerName: string;
  life: number;
  poison: number;
  commanderDamage: number[];
};
