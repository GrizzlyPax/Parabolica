// Name generation pools - absurdist Blaseball-inspired names

export const FIRST_NAMES = [
  // Common mundane names (heavily weighted for balance)
  "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
  "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Chris", "Lisa", "Daniel", "Nancy",
  "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
  "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
  "Kevin", "Dorothy", "Brian", "Carol", "George", "Amanda", "Timothy", "Melissa",
  "Ronald", "Deborah", "Edward", "Stephanie", "Jason", "Rebecca", "Jeffrey", "Sharon",
  "Ryan", "Laura", "Jacob", "Cynthia", "Gary", "Kathleen", "Nicholas", "Amy",
  "Eric", "Angela", "Jonathan", "Shirley", "Stephen", "Anna", "Larry", "Brenda",
  "Justin", "Pamela", "Scott", "Emma", "Brandon", "Nicole", "Benjamin", "Helen",
  "Samuel", "Samantha", "Gregory", "Katherine", "Alexander", "Christine", "Patrick", "Debra",

  // Normal-ish names
  "August", "Beverly", "Carmen", "Dana", "Eliot", "Frances", "Glenn", "Harper",
  "Indigo", "Jordan", "Kennedy", "Leslie", "Morgan", "Noel", "Oakley", "Parker",
  "Quinn", "Riley", "Sage", "Taylor", "Urban", "Valentine", "Winter", "Xander",

  // Slightly off names
  "Sixto", "Eleven", "Cricket", "Tuesday", "Noon", "Decimal", "Memo", "Toggle",
  "Placeholder", "Pending", "Meanwhile", "Shortly", "Ongoing", "Currently", "Adjacent",

  // Object names
  "Brisket", "Sandwich", "Crouton", "Noodle", "Pretzel", "Waffle", "Dumpling",
  "Peanut", "Pickle", "Biscuit", "Muffin", "Scone", "Gravy", "Soup", "Salad",

  // Concept names
  "Mercy", "Justice", "Patience", "Courage", "Comfort", "Notion", "Theory",
  "Method", "System", "Process", "Instance", "Version", "Update", "Backup",

  // Sound names
  "Beep", "Click", "Buzz", "Hum", "Ping", "Whir", "Static", "Echo", "Tone",

  // Time names
  "Yesterday", "Tomorrow", "Earlier", "Later", "Sometimes", "Always", "Never",
  "Eventually", "Momentarily", "Briefly", "Soon", "Presently", "Formerly",

  // Weather names
  "Foggy", "Cloudy", "Drizzle", "Overcast", "Partly", "Mostly", "Clearing",

  // Direction names
  "North", "East", "Slightly", "Approximately", "Roughly", "Nearly", "Almost",

  // Status names
  "Pending", "Loading", "Buffering", "Syncing", "Processing", "Updating"
];

export const LAST_NAMES = [
  // Common mundane surnames (heavily weighted for balance)
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
  "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
  "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
  "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker",
  "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy",
  "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey",
  "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson",
  "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza",
  "Ruiz", "Hughes", "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers",

  // Occupational
  "Mechanic", "Accountant", "Consultant", "Coordinator", "Administrator", "Supervisor",
  "Representative", "Specialist", "Technician", "Analyst", "Manager", "Director",

  // Compound absurd
  "Placeholder", "Undefined", "Untitled", "Unnamed", "Unspecified", "TBD",
  "Various", "Assorted", "Miscellaneous", "Generic", "Standard", "Default",

  // Object-based
  "Lamppost", "Sidewalk", "Crosswalk", "Parking", "Elevator", "Escalator",
  "Hallway", "Doorway", "Stairwell", "Cubicle", "Breakroom", "Backlog",

  // State/condition
  "Pending", "Complete", "Partial", "Ongoing", "Resolved", "Deferred",
  "Tentative", "Conditional", "Approximate", "Estimated", "Projected",

  // Number-adjacent
  "Twelve", "Several", "Multiple", "Numerous", "Few", "Many", "Some",
  "Occasional", "Frequent", "Rare", "Common", "Typical", "Average",

  // Corporate/bureaucratic
  "Incorporated", "Limited", "Holdings", "Solutions", "Services", "Associates",
  "Enterprises", "Industries", "Dynamics", "Logistics", "Systems", "Networks",

  // Vaguely ominous
  "Void", "Null", "Empty", "Blank", "Missing", "Gone", "Lost", "Found",
  "Returned", "Recovered", "Restored", "Salvaged", "Reclaimed",

  // Roman numerals
  "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",

  // Suffixes
  "Jr.", "Sr.", "Esq.", "PhD", "etc.", "et al."
];

// Middle name modifiers - empty for cleaner names
export const MIDDLE_MODIFIERS = [""];

// Generate a random driver name
export function generateDriverName(): { firstName: string; middleName: string; lastName: string; fullName: string } {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const middleName = MIDDLE_MODIFIERS[Math.floor(Math.random() * MIDDLE_MODIFIERS.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

  const fullName = middleName
    ? `${firstName} ${middleName} ${lastName}`
    : `${firstName} ${lastName}`;

  return { firstName, middleName, lastName, fullName };
}

// Generate a car name (random combination)
export function generateCarName(): string {
  const prefixes = [
    "Model", "Type", "Series", "Version", "Unit", "Batch", "Run", "Edition",
    "Prototype", "Beta", "Alpha", "Delta", "Sigma", "Omega", "Gamma", "Theta"
  ];

  const suffixes = [
    "A", "B", "C", "X", "Z", "Q", "R", "S", "T", "V",
    "1", "2", "3", "7", "9", "11", "13", "17", "23", "42",
    "Plus", "Pro", "Max", "Ultra", "Lite", "Mini", "Turbo", "GT"
  ];

  const modifiers = [
    "", "", "", // Empty more often for cleaner names
    "-", ".", "/", " ", "_"
  ];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return `${prefix}${modifier}${suffix}`;
}
