// The 52 places of Ace America (#695): 50 states, DC and Puerto Rico, each
// with the population that sets its field (docs/STORY_BIBLE.md → The run),
// a pool of real towns (never invented) and its look for the State step. The
// look is the accents the UI takes while you race for that state (the state
// bar, buttons, the sash edge); the ground stays dark. Four looks are filled
// from the #698 mock-ups; the rest drop in from #708 (The 52 looks) and wear
// DEFAULT_LOOK until then. One source: the design system reads it through
// `stateLook` (src/look/step.ts). Pure data.
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
  /** The second colour: the sash's ink, flag fields. */
  secondary: string;
  /** Highlights: the flag's wheel (the sash's wheels stay gold). */
  accent: string;
  /** Text and icons on `primary`, from inkFor. */
  ink: string;
  /** A dark ground tint for the State step; absent = the navy. */
  ground?: string;
  flag: WheelFlag;
}

export interface UsPlace {
  /** Lower-case postal code: 'oh', 'dc', 'pr'. */
  id: string;
  name: string;
  /** The postal code: 'OH'. */
  abbr: string;
  kind: PlaceKind;
  /** Population in millions (2020 census, rounded): sets the State field (`fieldSize`). */
  population: number;
  /** Real towns, big and small, the run draws your town and your rivals' from. */
  cities: readonly string[];
  /** null until #708 fills it; `stateLook` falls back to DEFAULT_LOOK. */
  look: StateLook | null;
}

function look(id: string, primary: string, secondary: string, accent: string, ground: string, note: string): StateLook {
  return { primary, secondary, accent, ink: inkFor(primary), ground, flag: { id: `wheel-flag-${id}`, note } };
}

/** The filled looks, by id (#698 mock-ups, Oct 10). */
const LOOKS: Record<string, StateLook> = {
  oh: look('oh', '#B8312F', '#1D2B4F', '#C99A3A', '#0F1730', "Ohio's burgee: red and white stripes on the swallowtail, the wheel in place of the white O on the blue triangle"),
  az: look('az', '#CE5C17', '#002868', '#FED700', '#1C1410', "Arizona's red and gold sunburst over blue, a copper wheel in place of the copper star"),
  vt: look('vt', '#1B4D3E', '#0F241C', '#C99A3A', '#0F241C', "Vermont's green field and mountains, a cream wheel at the centre, a gold band with VERMONT along the foot"),
  tx: look('tx', '#BF0A30', '#002868', '#EFE6D2', '#0D1630', "Texas's lone star field, the wheel in place of the star"),
};

/** The look an unfilled place wears until #708: Americana's red and navy. */
export const DEFAULT_LOOK: StateLook = { primary: '#B8312F', secondary: '#1D2B4F', accent: '#C99A3A', ink: inkFor('#B8312F'), flag: { id: 'wheel-flag-default', note: 'The Accord banner: a gold wheel on midnight blue, until the state gets its own' } };

type Row = [abbr: string, name: string, population: number, cities: string[], kind?: PlaceKind];

const PLACES: Row[] = [
  ['AL', 'Alabama', 5.0, ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa', 'Dothan', 'Decatur', 'Selma']],
  ['AK', 'Alaska', 0.7, ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan', 'Wasilla', 'Kodiak', 'Nome']],
  ['AZ', 'Arizona', 7.2, ['Phoenix', 'Tucson', 'Mesa', 'Flagstaff', 'Yuma', 'Prescott', 'Bisbee', 'Kingman']],
  ['AR', 'Arkansas', 3.0, ['Little Rock', 'Fort Smith', 'Fayetteville', 'Hot Springs', 'Jonesboro', 'Pine Bluff', 'Texarkana', 'Conway']],
  ['CA', 'California', 39.5, ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Fresno', 'Oakland', 'Bakersfield', 'Stockton', 'Santa Barbara', 'Eureka', 'Modesto', 'Pasadena']],
  ['CO', 'Colorado', 5.8, ['Denver', 'Colorado Springs', 'Pueblo', 'Boulder', 'Grand Junction', 'Durango', 'Leadville', 'Fort Collins']],
  ['CT', 'Connecticut', 3.6, ['Hartford', 'New Haven', 'Bridgeport', 'Stamford', 'Waterbury', 'Norwich', 'Danbury', 'New London']],
  ['DE', 'Delaware', 1.0, ['Wilmington', 'Dover', 'Newark', 'Lewes', 'Milford', 'Seaford', 'Smyrna', 'Georgetown']],
  ['FL', 'Florida', 21.5, ['Miami', 'Tampa', 'Jacksonville', 'Orlando', 'Tallahassee', 'Pensacola', 'St. Augustine', 'Key West', 'Daytona Beach', 'Gainesville', 'Ocala', 'Sebring']],
  ['GA', 'Georgia', 10.7, ['Atlanta', 'Savannah', 'Augusta', 'Macon', 'Columbus', 'Athens', 'Valdosta', 'Rome', 'Albany', 'Dalton']],
  ['HI', 'Hawaii', 1.5, ['Honolulu', 'Hilo', 'Kailua', 'Kahului', 'Lihue', 'Kaneohe', 'Waipahu', 'Lahaina']],
  ['ID', 'Idaho', 1.8, ['Boise', 'Pocatello', 'Idaho Falls', 'Twin Falls', 'Lewiston', 'Coeur d\'Alene', 'Nampa', 'Moscow']],
  ['IL', 'Illinois', 12.8, ['Chicago', 'Springfield', 'Peoria', 'Rockford', 'Joliet', 'Decatur', 'Champaign', 'Galesburg', 'Quincy', 'Elgin']],
  ['IN', 'Indiana', 6.8, ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Gary', 'Terre Haute', 'Muncie', 'Kokomo']],
  ['IA', 'Iowa', 3.2, ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Dubuque', 'Waterloo', 'Ames', 'Council Bluffs']],
  ['KS', 'Kansas', 2.9, ['Wichita', 'Topeka', 'Kansas City', 'Lawrence', 'Salina', 'Dodge City', 'Hutchinson', 'Emporia']],
  ['KY', 'Kentucky', 4.5, ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Paducah', 'Frankfort', 'Covington', 'Ashland']],
  ['LA', 'Louisiana', 4.7, ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles', 'Monroe', 'Alexandria', 'Houma']],
  ['ME', 'Maine', 1.4, ['Portland', 'Bangor', 'Augusta', 'Lewiston', 'Bar Harbor', 'Presque Isle', 'Rockland', 'Biddeford']],
  ['MD', 'Maryland', 6.2, ['Baltimore', 'Annapolis', 'Frederick', 'Hagerstown', 'Cumberland', 'Salisbury', 'Rockville', 'Ocean City']],
  ['MA', 'Massachusetts', 7.0, ['Boston', 'Worcester', 'Springfield', 'Lowell', 'New Bedford', 'Pittsfield', 'Gloucester', 'Fall River']],
  ['MI', 'Michigan', 10.1, ['Detroit', 'Grand Rapids', 'Flint', 'Lansing', 'Kalamazoo', 'Saginaw', 'Marquette', 'Traverse City', 'Ann Arbor', 'Muskegon']],
  ['MN', 'Minnesota', 5.7, ['Minneapolis', 'St. Paul', 'Duluth', 'Rochester', 'St. Cloud', 'Mankato', 'Bemidji', 'Winona']],
  ['MS', 'Mississippi', 3.0, ['Jackson', 'Gulfport', 'Biloxi', 'Hattiesburg', 'Meridian', 'Tupelo', 'Vicksburg', 'Natchez']],
  ['MO', 'Missouri', 6.2, ['St. Louis', 'Kansas City', 'Springfield', 'Columbia', 'Joplin', 'Hannibal', 'Cape Girardeau', 'Sedalia']],
  ['MT', 'Montana', 1.1, ['Billings', 'Missoula', 'Great Falls', 'Butte', 'Helena', 'Bozeman', 'Kalispell', 'Havre']],
  ['NE', 'Nebraska', 2.0, ['Omaha', 'Lincoln', 'Grand Island', 'Kearney', 'North Platte', 'Scottsbluff', 'Norfolk', 'Hastings']],
  ['NV', 'Nevada', 3.1, ['Las Vegas', 'Reno', 'Carson City', 'Elko', 'Henderson', 'Ely', 'Winnemucca', 'Tonopah']],
  ['NH', 'New Hampshire', 1.4, ['Manchester', 'Nashua', 'Concord', 'Portsmouth', 'Keene', 'Laconia', 'Berlin', 'Dover']],
  ['NJ', 'New Jersey', 9.3, ['Newark', 'Jersey City', 'Trenton', 'Paterson', 'Camden', 'Atlantic City', 'Hoboken', 'Elizabeth', 'Cape May', 'New Brunswick']],
  ['NM', 'New Mexico', 2.1, ['Albuquerque', 'Santa Fe', 'Las Cruces', 'Roswell', 'Gallup', 'Taos', 'Carlsbad', 'Silver City']],
  ['NY', 'New York', 20.2, ['New York', 'Buffalo', 'Rochester', 'Albany', 'Syracuse', 'Utica', 'Watkins Glen', 'Binghamton', 'Saratoga Springs', 'Poughkeepsie', 'Elmira', 'Ithaca']],
  ['NC', 'North Carolina', 10.4, ['Charlotte', 'Raleigh', 'Greensboro', 'Winston-Salem', 'Asheville', 'Wilmington', 'Durham', 'Rockingham', 'Fayetteville', 'Hickory']],
  ['ND', 'North Dakota', 0.8, ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'Williston', 'Dickinson', 'Jamestown', 'Devils Lake']],
  ['OH', 'Ohio', 11.8, ['Toledo', 'Columbus', 'Cleveland', 'Cincinnati', 'Akron', 'Dayton', 'Youngstown', 'Canton', 'Mansfield', 'Zanesville', 'Sandusky', 'Lima']],
  ['OK', 'Oklahoma', 4.0, ['Oklahoma City', 'Tulsa', 'Norman', 'Lawton', 'Enid', 'Muskogee', 'Stillwater', 'Ardmore']],
  ['OR', 'Oregon', 4.2, ['Portland', 'Salem', 'Eugene', 'Bend', 'Medford', 'Astoria', 'Pendleton', 'Klamath Falls']],
  ['PA', 'Pennsylvania', 13.0, ['Philadelphia', 'Pittsburgh', 'Harrisburg', 'Allentown', 'Erie', 'Scranton', 'Reading', 'Lancaster', 'Altoona', 'Johnstown', 'Williamsport', 'York']],
  ['RI', 'Rhode Island', 1.1, ['Providence', 'Newport', 'Warwick', 'Pawtucket', 'Cranston', 'Woonsocket', 'Westerly', 'Bristol']],
  ['SC', 'South Carolina', 5.1, ['Charleston', 'Columbia', 'Greenville', 'Spartanburg', 'Myrtle Beach', 'Darlington', 'Florence', 'Rock Hill']],
  ['SD', 'South Dakota', 0.9, ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Pierre', 'Deadwood', 'Mitchell', 'Yankton', 'Huron']],
  ['TN', 'Tennessee', 6.9, ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Bristol', 'Jackson', 'Clarksville', 'Johnson City']],
  ['TX', 'Texas', 29.1, ['Houston', 'Dallas', 'San Antonio', 'Austin', 'Fort Worth', 'El Paso', 'Galveston', 'Lubbock', 'Amarillo', 'Corpus Christi', 'Waco', 'Laredo']],
  ['UT', 'Utah', 3.3, ['Salt Lake City', 'Ogden', 'Provo', 'St. George', 'Logan', 'Moab', 'Cedar City', 'Bonneville']],
  ['VT', 'Vermont', 0.6, ['Burlington', 'Montpelier', 'Rutland', 'Brattleboro', 'Bennington', 'St. Johnsbury', 'Barre', 'Middlebury']],
  ['VA', 'Virginia', 8.6, ['Richmond', 'Norfolk', 'Virginia Beach', 'Roanoke', 'Alexandria', 'Lynchburg', 'Charlottesville', 'Martinsville', 'Danville', 'Winchester']],
  ['WA', 'Washington', 7.7, ['Seattle', 'Spokane', 'Tacoma', 'Olympia', 'Yakima', 'Bellingham', 'Walla Walla', 'Wenatchee']],
  ['WV', 'West Virginia', 1.8, ['Charleston', 'Huntington', 'Wheeling', 'Morgantown', 'Parkersburg', 'Beckley', 'Clarksburg', 'Bluefield']],
  ['WI', 'Wisconsin', 5.9, ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'La Crosse', 'Eau Claire', 'Oshkosh']],
  ['WY', 'Wyoming', 0.6, ['Cheyenne', 'Casper', 'Laramie', 'Sheridan', 'Rock Springs', 'Cody', 'Jackson', 'Rawlins']],
  ['DC', 'District of Columbia', 0.7, ['Georgetown', 'Anacostia', 'Capitol Hill', 'Brookland', 'Navy Yard', 'Shaw', 'Petworth', 'Foggy Bottom'], 'district'],
  ['PR', 'Puerto Rico', 3.3, ['San Juan', 'Ponce', 'Mayagüez', 'Caguas', 'Arecibo', 'Bayamón', 'Aguadilla', 'Humacao'], 'territory'],
];

/** All 52 places, alphabetical states first, then DC and Puerto Rico. */
export const US_PLACES: readonly UsPlace[] = PLACES.map(([abbr, name, population, cities, kind = 'state']) => {
  const id = abbr.toLowerCase();
  return { id, name, abbr, kind, population, cities, look: LOOKS[id] ?? null };
});

const BY_ID = new Map(US_PLACES.map(p => [p.id, p]));

/** A place by id ('oh') or postal code ('OH'). */
export function placeById(id: string): UsPlace | undefined {
  return BY_ID.get(id.toLowerCase());
}

/** The State field: how many towns' Aces you race (Pax, #693: "the state's size is the difficulty"). */
export type FieldSize = 5 | 10 | 20;
/** Population (millions) at and above which a state fields 10, then 20 towns. */
export const FIELD_STEPS: { ten: number; twenty: number } = { ten: 2.5, twenty: 8 };

export function fieldSize(place: Pick<UsPlace, 'population'>): FieldSize {
  return place.population >= FIELD_STEPS.twenty ? 20 : place.population >= FIELD_STEPS.ten ? 10 : 5;
}

/** "5 towns compete": the honest number on the start screen. */
export const fieldLine = (place: Pick<UsPlace, 'population'>) => `${fieldSize(place)} towns compete`;
