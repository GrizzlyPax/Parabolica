// Radio's 28 deck colours and their ink (docs/story/team-identity.md → Team
// creator). The one ink table: inkFor() reads it first (#639), so deck teams,
// the team creator and every badge agree. Pure data; imports nothing.

export interface TeamColour { name: string; hex: string; ink: string }

/** The 28 deck colours in picker order (7 × 4: reds → purples → blues → greens → yellows → oranges → neutrals). */
export const DECK_COLOURS: readonly TeamColour[] = [
  { name: 'Rosso', hex: '#E8242F', ink: '#FFFFFF' }, { name: 'Crimson', hex: '#C31851', ink: '#FFFFFF' },
  { name: 'Raspberry', hex: '#E63281', ink: '#FFFFFF' }, { name: 'Hot Pink', hex: '#FF4DB8', ink: '#FFFFFF' },
  { name: 'Orchid', hex: '#D95FFC', ink: '#FFFFFF' }, { name: 'Purple', hex: '#8F3DC0', ink: '#FFFFFF' },
  { name: 'Violet', hex: '#9B8AFE', ink: '#0A0A0C' }, { name: 'Indigo', hex: '#5454EA', ink: '#FFFFFF' },
  { name: 'Cobalt', hex: '#006EBE', ink: '#FFFFFF' }, { name: 'Cornflower', hex: '#5E9EFD', ink: '#FFFFFF' },
  { name: 'Cyan', hex: '#0BAEE0', ink: '#FFFFFF' }, { name: 'Aqua', hex: '#1BB4B8', ink: '#FFFFFF' },
  { name: 'Petrol', hex: '#087C77', ink: '#FFFFFF' }, { name: 'Jade', hex: '#0DB98E', ink: '#FFFFFF' },
  { name: 'Leaf', hex: '#8DCC6E', ink: '#0A0A0C' }, { name: 'Lime', hex: '#4EBB05', ink: '#FFFFFF' },
  { name: 'Moss', hex: '#507B07', ink: '#FFFFFF' }, { name: 'Signal', hex: '#DED903', ink: '#0A0A0C' },
  { name: 'Gold', hex: '#C2A02A', ink: '#0A0A0C' }, { name: 'Amber', hex: '#FFB000', ink: '#0A0A0C' },
  { name: 'Papaya', hex: '#F87103', ink: '#FFFFFF' }, { name: 'Coral', hex: '#F8767A', ink: '#0A0A0C' },
  { name: 'Rust', hex: '#C0502A', ink: '#FFFFFF' }, { name: 'Saddle', hex: '#945F0E', ink: '#FFFFFF' },
  { name: 'Bronze', hex: '#B47B46', ink: '#FFFFFF' }, { name: 'Slate', hex: '#718295', ink: '#FFFFFF' },
  { name: 'Silver', hex: '#B6BBC1', ink: '#0A0A0C' }, { name: 'Cream', hex: '#F4EEDE', ink: '#0A0A0C' },
];
