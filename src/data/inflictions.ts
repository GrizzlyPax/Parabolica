// Mid-race inflictions — state tags the environment stamps on individual
// drivers during a race ("⚡ Electrocuted in the storm"). Temporary by design:
// they ride the engine's unified-effect system with an expiry, surface as
// timing-tower status emojis and feed notifications via the existing
// track_event_effect event path, and land in digests/highlights.
//
// Deliberately bare-bones flavor (the skin is a future partnered pass —
// content here is data, easily swapped). Rare by design: an infliction is a
// notification-worthy event, so scarcity is the point.

export interface Infliction {
  id: string;
  name: string;
  emoji: string;
  /** Condition ids that allow this infliction (weather- or track-stamped). */
  requiresCondition: string[];
  /** Per-tick chance the infliction fires AT ALL (then one driver is struck).
   * ~2300 ticks/race: 4e-4 ≈ 0.9 expected events per race when active. */
  perTickChance: number;
  /** Effect duration in ticks once applied. */
  durationTicks: number;
  effects: {
    speedModifier?: number;
    consistencyModifier?: number;
    luckModifier?: number;
    crashResistance?: number;
  };
  /** Feed line; driver name is prepended by the event system. */
  activationText: string;
  /** 'negative' | 'positive' | 'neutral' — drives notification styling. */
  impact: 'negative' | 'positive' | 'neutral';
}

export const INFLICTIONS: Infliction[] = [
  {
    id: 'electrocuted',
    name: 'Electrocuted',
    emoji: '⚡',
    requiresCondition: ['rain'],
    perTickChance: 0.0004,
    durationTicks: 300,
    effects: { speedModifier: 0.92 },
    activationText: 'is struck by the storm!',
    impact: 'negative',
  },
  {
    id: 'lost-in-fog',
    name: 'Lost in Fog',
    emoji: '🌫️',
    requiresCondition: ['fog'],
    perTickChance: 0.0004,
    durationTicks: 350,
    effects: { consistencyModifier: 0.88 },
    activationText: 'has vanished into the fog!',
    impact: 'negative',
  },
  {
    id: 'overheating',
    name: 'Overheating',
    emoji: '🥵',
    requiresCondition: ['scorcher'],
    perTickChance: 0.0004,
    durationTicks: 250,
    effects: { speedModifier: 0.94 },
    activationText: 'is cooking in the cockpit!',
    impact: 'negative',
  },
  {
    id: 'tailwind',
    name: 'Tailwind',
    emoji: '🌬️',
    requiresCondition: ['windy'],
    perTickChance: 0.0003,
    durationTicks: 200,
    effects: { speedModifier: 1.06 },
    activationText: 'catches a monster tailwind!',
    impact: 'positive',
  },
  {
    id: 'debris-strike',
    name: 'Debris Strike',
    emoji: '🪨',
    requiresCondition: ['debris-hazard'],
    perTickChance: 0.0003,
    durationTicks: 250,
    effects: { speedModifier: 0.95, crashResistance: -0.1 },
    activationText: 'takes debris to the bodywork!',
    impact: 'negative',
  },
];
