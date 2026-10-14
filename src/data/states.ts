// The 52 places of Ace America (#695): 50 states, DC and Puerto Rico, each
// with the population that sets its field (docs/STORY_BIBLE.md → The run),
// a pool of real towns (never invented) and its look for the State step. The
// look is the accents the UI takes while you race for that state (the state
// bar, buttons, the sash edge) on the state's own dark ground. All 52 looks
// come from Radio's table (docs/story/states.md, #708 / #740). One source:
// the design system reads it through
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
  /** The State step's look (#740); null only for a place missing from the table. */
  look: StateLook | null;
}

function look(id: string, primary: string, secondary: string, accent: string, ground: string, note: string): StateLook {
  return { primary, secondary, accent, ink: inkFor(primary), ground, flag: { id: `wheel-flag-${id}`, note } };
}

/** The 52 looks (#740): Radio's table, picked by Pax on Oct 14 (docs/story/states.md, the single source). */
const LOOKS: Record<string, StateLook> = {
  ak: look('ak', '#0F4C8A', '#081F3B', '#F5C518', '#06111F', 'The flag\'s deep blue, with the Big Dipper\'s gold'),
  al: look('al', '#A8172E', '#3A0911', '#F4A9B8', '#1A080F', 'The flag\'s crimson saltire, with the camellia (the state flower)'),
  ar: look('ar', '#D23A4A', '#1C2E6B', '#EEF3FA', '#0E1733', 'The flag\'s red, blue-ringed white diamond (the Diamond State)'),
  az: look('az', '#A6491B', '#002868', '#FED700', '#031431', 'Copper (the flag\'s star), with the flag\'s blue and sunburst gold'),
  ca: look('ca', '#7A4E2D', '#341F12', '#F2B33D', '#18110F', 'The bear on the flag: grizzly brown, with Golden State gold'),
  co: look('co', '#6F7FCB', '#1C2457', '#F5C116', '#0E132B', 'The columbine (the state flower), with the flag\'s gold disc'),
  ct: look('ct', '#244A9A', '#0F1F45', '#95C15A', '#091123', 'The flag\'s royal blue shield, with its green grapevines'),
  dc: look('dc', '#F3EFE8', '#9E1528', '#FF6070', '#420D18', 'The flag\'s white field with its red stars and bars'),
  de: look('de', '#3A6E97', '#14304A', '#EBCB9E', '#0B1725', 'Colonial blue and buff, straight off the flag\'s diamond'),
  fl: look('fl', '#F0861F', '#7E1E14', '#3CC7B6', '#351010', 'Orange groves, with the Gulf\'s teal'),
  ga: look('ga', '#F2A07B', '#7A1D24', '#F2C14E', '#341016', 'Peach, with the flag\'s red stripes and gold arch'),
  hi: look('hi', '#13849A', '#08343E', '#F2D04B', '#061921', 'Pacific blue, with the yellow hibiscus (the state flower)'),
  ia: look('ia', '#5F9230', '#1F3510', '#F2C94C', '#0F190E', 'Corn in July, with corn-silk gold'),
  id: look('id', '#5E1A2B', '#250A12', '#E3B04B', '#12080F', 'The star garnet, Idaho\'s gem, with gold'),
  il: look('il', '#1F3E6E', '#0E1D36', '#EE7E2F', '#09101D', 'The eagle\'s shield blue, with a prairie-sunset orange'),
  in: look('in', '#8E3B2A', '#2E120C', '#F2B33A', '#150B0D', 'The Brickyard\'s brick, with the flag\'s gold torch'),
  ks: look('ks', '#F2A900', '#4E3214', '#5C9BD6', '#221810', 'The sunflower: petal gold and seed-head brown, with Kansas sky'),
  ky: look('ky', '#C21E56', '#3E0A1C', '#86B9E8', '#1C0813', 'A garland of roses, with bluegrass blue'),
  la: look('la', '#5B2A86', '#24103A', '#F2C14E', '#110B1F', 'Purple, green and gold, with the flag\'s pelican'),
  ma: look('ma', '#A01C3F', '#3A0A18', '#F0C987', '#1A0811', 'Cranberry bogs, with the flag\'s gold-trimmed shield'),
  md: look('md', '#F0B323', '#1A1A1A', '#F04A55', '#0D0F12', 'The Calvert gold and black, with the Crossland red'),
  me: look('me', '#4B3F8C', '#1E1838', '#E2533A', '#0F0E1E', 'Wild blueberries and a lobster-red accent; the flag\'s North Star is the wheel'),
  mi: look('mi', '#2A7AB8', '#0E2E4E', '#F25466', '#091727', 'Great Lakes blue, with cherry red'),
  mn: look('mn', '#6FB2DD', '#0B2545', '#F7F5EF', '#071323', 'The new flag: lake blue, the dark state shape, a white North Star'),
  mo: look('mo', '#B9C2CC', '#111D45', '#F2555A', '#0A1023', 'The Gateway Arch\'s steel, with the flag\'s blue and red'),
  ms: look('ms', '#3B7D46', '#14321B', '#F4EBD3', '#0B1813', 'Magnolia leaves and the new flag\'s magnolia bloom'),
  mt: look('mt', '#4A8FD0', '#0F2A4A', '#E2B33C', '#091525', 'Big Sky blue, with the motto\'s gold (Oro y Plata)'),
  nc: look('nc', '#5A9FD6', '#13294B', '#E04A4A', '#0B1526', 'Carolina sky blue, with the flag\'s red bar'),
  nd: look('nd', '#D6B370', '#2F4B7C', '#E8749A', '#162239', 'Wheat, with the flag\'s blue and a prairie rose'),
  ne: look('ne', '#8F9440', '#2C2E12', '#E7B93A', '#15170F', 'The Sandhills\' prairie grass, with goldenrod (the state flower)'),
  nh: look('nh', '#5E6670', '#23272C', '#B9A2E0', '#111419', 'The Granite State\'s grey, with purple lilac (the state flower)'),
  nj: look('nj', '#E2C38E', '#1F4E79', '#7FB2E5', '#0F2338', 'The flag\'s buff field and Jersey blue'),
  nm: look('nm', '#FFD100', '#9C1328', '#35B9A8', '#410C18', 'The flag\'s yellow and red Zia, with turquoise'),
  nv: look('nv', '#0B4FB0', '#0A1F4D', '#C9CFD8', '#071127', 'The flag\'s cobalt, with Silver State silver'),
  ny: look('ny', '#1D3570', '#0D1838', '#7FCBAE', '#080E1E', 'Empire blue, with the Statue of Liberty\'s copper-green'),
  oh: look('oh', '#B8312F', '#1D2B4F', '#EFE6D2', '#0F1527', 'Ohio\'s burgee: red stripes, the blue triangle, the white O as the wheel'),
  ok: look('ok', '#A8437A', '#3B1530', '#79B9E6', '#1B0D1B', 'Redbud blossom, with the flag\'s sky blue'),
  or: look('or', '#123A63', '#0A1D33', '#F2C230', '#07101C', 'Navy and gold, the only flag with two sides'),
  pa: look('pa', '#2B4C80', '#132443', '#D29143', '#0B1323', 'The Keystone flag\'s blue, with Liberty Bell bronze'),
  pr: look('pr', '#E4572E', '#0B2C59', '#79C2F2', '#07162B', 'Flamboyán red-orange, with the light-blue triangle of 1895'),
  ri: look('ri', '#2F7D7A', '#0F3332', '#EBC155', '#09191C', 'The Ocean State\'s sea glass, with the flag\'s gold anchor'),
  sc: look('sc', '#2D2F7E', '#13143A', '#F3F1EA', '#0B0C1F', 'Indigo, the flag\'s own colour, with the white palmetto and crescent'),
  sd: look('sd', '#C2814F', '#3A2213', '#7FB8E8', '#1A120F', 'The Badlands\' banded clay, with the flag\'s sky blue'),
  tn: look('tn', '#9B1B30', '#132E66', '#BBA2EE', '#0B1731', 'The flag\'s red field and blue circle, with the iris (the state flower)'),
  tx: look('tx', '#BF0A30', '#002868', '#9DB7F2', '#031431', 'The Lone Star flag\'s red and blue, with a bluebonnet accent'),
  ut: look('ut', '#BC4E2D', '#3E1610', '#F0E3C2', '#1C0D0E', 'Red rock country, with the beehive\'s honey cream'),
  va: look('va', '#F0B9C8', '#1A2B5C', '#E8414B', '#0D152D', 'Dogwood blossom, with the flag\'s blue and a cardinal red'),
  vt: look('vt', '#1B4D3E', '#0F241C', '#E8892E', '#091313', 'The Green Mountains, with a maple-in-October accent'),
  wa: look('wa', '#1E6B46', '#0B2A1B', '#D8E9A8', '#071513', 'The Evergreen State, with new-growth green'),
  wi: look('wi', '#E9C46A', '#5B3A1A', '#7DB8E8', '#271B12', 'Cheddar and dairy-barn brown, with Lake Michigan blue'),
  wv: look('wv', '#34363D', '#16171B', '#EAAA00', '#0C0D13', 'Coal country, with the old gold of the mountains'),
  wy: look('wy', '#6B4A2E', '#2A1B10', '#E8D3A6', '#140F0E', 'The bucking horse\'s saddle brown, with prairie straw'),
};

/** The fallback look (a place missing from LOOKS): Americana's red and navy. Every place has its own since #740. */
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
