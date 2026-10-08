// A sample card sheet for the World Deck preview (#331). Example data only:
// nobody's real roster. Shows every state: traits on all three holders (one
// empty), a filled and an empty gear slot, and a locker.
import { getDeckTeamById } from '../data/deckTeams';
import { CARDS_BY_ID } from './deck';
import type { Card } from './types';
import type { CardSheetData } from './CardSheet';

const card = (id: string): Card => {
  const c = CARDS_BY_ID.get(id);
  if (!c) throw new Error(`sample sheet: no card ${id}`);
  return c;
};

const team = getDeckTeamById('vantor-motorwerke')!;

export const SAMPLE_SHEET: CardSheetData = {
  driver: { name: 'Yuki Okafor', number: 7, traits: [card('tr-driver-gold-speed+consistency')], equipment: card('eq-silver-luck') },
  car: { name: 'Vantor GT-7', traits: [], upgrade: null },
  team: {
    ...team,
    traits: [card('tr-team-bronze-pit-crew')],
    facility: card('fa-iridium-tyre-management+pit-crew'),
    locker: [card('eq-bronze-aggression'), card('up-gold-power+grip')],
  },
};
