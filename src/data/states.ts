// The 52 places of Ace America (#695): 50 states, DC and Puerto Rico, each
// with its look for the State step (docs/story/ace-america.md → The look).
// The look is the accents the UI takes while you race for that state (the
// state bar, buttons, the sash edge); the ground stays dark. Three looks are
// filled from the #698 mock-ups; the rest drop in from #708 (The 52 looks).
// Pure data; the design system (#705) reads it.
import { inkFor } from '../icons/ink';

export type PlaceKind = 'state' | 'district' | 'territory';

export interface WheelFlag {
  /** The flag asset key (art comes later): `wheel-flag-<id>`. */
  id: string;
  /** One line: what the flag keeps and where the Accord's wheel goes. */
  note: string;
}

export interface StateLook {
  /** The state bar, buttons and the sash edge. */
  primary: string;
  /** The second colour: button shadows, flag fields, the deep ground tint. */
  secondary: string;
  /** Highlights: rules, the wheel, a rung that's now. */
  accent: string;
  /** Text and icons on `primary`, from inkFor. */
  ink: string;
  flag: WheelFlag;
}

export interface UsPlace {
  /** Lower-case postal code: 'oh', 'dc', 'pr'. */
  id: string;
  name: string;
  /** The postal code: 'OH'. */
  abbr: string;
  kind: PlaceKind;
  /** null until #708 fills it; the UI falls back to the step's theme. */
  look: StateLook | null;
}

function look(id: string, primary: string, secondary: string, accent: string, note: string): StateLook {
  return { primary, secondary, accent, ink: inkFor(primary), flag: { id: `wheel-flag-${id}`, note } };
}

/** The filled looks, by id (#698 mock-ups, Oct 10). */
const LOOKS: Record<string, StateLook> = {
  oh: look('oh', '#B8312F', '#1D2B4F', '#C99A3A', "Ohio's burgee: red and white stripes on the swallowtail, the wheel in place of the white O on the blue triangle"),
  az: look('az', '#CE5C17', '#002868', '#FED700', "Arizona's red and gold sunburst over blue, a copper wheel in place of the copper star"),
  vt: look('vt', '#1B4D3E', '#0F241C', '#C99A3A', "Vermont's green field and mountains, a cream wheel at the centre, a gold band with VERMONT along the foot"),
};

const PLACES: [abbr: string, name: string, kind?: PlaceKind][] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['FL', 'Florida'], ['GA', 'Georgia'],
  ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
  ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'],
  ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
  ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
  ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'],
  ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
  ['DC', 'District of Columbia', 'district'], ['PR', 'Puerto Rico', 'territory'],
];

/** All 52 places, alphabetical states first, then DC and Puerto Rico. */
export const US_PLACES: readonly UsPlace[] = PLACES.map(([abbr, name, kind = 'state']) => {
  const id = abbr.toLowerCase();
  return { id, name, abbr, kind, look: LOOKS[id] ?? null };
});

const BY_ID = new Map(US_PLACES.map(p => [p.id, p]));

/** A place by id ('oh') or postal code ('OH'). */
export function placeById(id: string): UsPlace | undefined {
  return BY_ID.get(id.toLowerCase());
}
