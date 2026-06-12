// Name generation pools - absurdist Blaseball-inspired names
// TODO: Consider filtering surnames that produce unfortunate 3-letter codes (e.g., "Associates" -> "ASS")
//       Could add a blocklist or swap first 3 chars for problematic surnames

import { Rng, pick } from '../engine/rng';

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
  // More mundane (still heavily weighted real names)
  "Christopher", "Carl", "Frank", "Walter", "Henry", "Arthur", "Albert", "Harold",
  "Eugene", "Ralph", "Roy", "Louis", "Philip", "Bruce", "Wayne", "Russell",
  "Roger", "Dennis", "Jerry", "Keith", "Terry", "Sean", "Austin", "Gerald",
  "Jesse", "Bryan", "Willie", "Randy", "Gabriel", "Vincent", "Aaron", "Adam",
  "Nathan", "Zachary", "Kyle", "Noah", "Ethan", "Jeremy", "Christian", "Dylan",
  "Tyler", "Lucas", "Caleb", "Isaac", "Connor", "Marcus", "Logan", "Owen",
  "Julian", "Levi", "Carolyn", "Janet", "Catherine", "Maria", "Heather", "Diane",
  "Ruth", "Julie", "Joyce", "Virginia", "Victoria", "Christina", "Joan", "Evelyn",
  "Judith", "Megan", "Andrea", "Cheryl", "Hannah", "Jacqueline", "Martha", "Gloria",
  "Teresa", "Sara", "Madison", "Kathryn", "Janice", "Jean", "Abigail", "Alice",
  "Julia", "Judy", "Sophia", "Grace", "Denise", "Amber", "Marilyn", "Danielle",
  "Diana", "Natalie", "Brittany", "Charlotte", "Marie", "Kayla", "Lori", "Tiffany",
  "Crystal", "Olivia", "Theresa", "Frances",

  // Normal-ish names
  "August", "Beverly", "Carmen", "Dana", "Eliot", "Glenn", "Harper",
  "Indigo", "Jordan", "Kennedy", "Leslie", "Morgan", "Noel", "Oakley", "Parker",
  "Quinn", "Riley", "Sage", "Taylor", "Urban", "Valentine", "Winter", "Xander",
  "Atlas", "Cleo", "Dash", "Felix", "Greer", "Hollis", "Iris", "Jules",
  "Knox", "Lennon", "Marlowe", "Nova", "Onyx", "Phoenix", "Reese", "Sawyer",
  "Sterling", "Tatum", "Wren", "Zephyr", "Briar", "Calloway", "Delphine", "Emerson",
  "Finley", "Juniper", "Lark", "Marigold", "Sorrel", "Tamsin", "Wilder", "Bellamy",

  // Slightly off names
  "Sixto", "Eleven", "Cricket", "Tuesday", "Noon", "Decimal", "Memo", "Toggle",
  "Placeholder", "Pending", "Meanwhile", "Shortly", "Ongoing", "Currently", "Adjacent",
  "Provisional", "Hereby", "Whereas", "Notwithstanding", "Pursuant", "Forthwith",
  "Heretofore", "Subsequently", "Accordingly", "Henceforth", "Moreover", "Furthermore",
  "Otherwise", "Likewise", "Anyway", "Regarding", "Concerning", "Pseudo", "Quasi",
  "Basically", "Technically", "Literally", "Allegedly", "Supposedly", "Presumably",

  // Object names
  "Brisket", "Sandwich", "Crouton", "Noodle", "Pretzel", "Waffle", "Dumpling",
  "Peanut", "Pickle", "Biscuit", "Muffin", "Scone", "Gravy", "Soup", "Salad",
  "Crumpet", "Bagel", "Toast", "Custard", "Crumble", "Trifle", "Pudding", "Wafer",
  "Cracker", "Marshmallow", "Popcorn", "Cabbage", "Turnip", "Radish", "Celery",
  "Parsnip", "Squash", "Rhubarb", "Lentil", "Tofu", "Relish", "Mustard", "Wasabi",
  "Sprout", "Crumb", "Dollop", "Morsel", "Nugget", "Wedge", "Rind",

  // Concept names
  "Mercy", "Justice", "Patience", "Courage", "Comfort", "Notion", "Theory",
  "Method", "System", "Process", "Instance", "Version", "Update", "Backup",
  "Logic", "Reason", "Nuance", "Premise", "Paradox", "Sequel", "Footnote", "Appendix",
  "Subtext", "Context", "Hubris", "Whimsy", "Folly", "Candor", "Valor", "Vigor",
  "Rigor", "Tedium", "Caveat", "Maxim", "Axiom", "Penance", "Reverie", "Quandary",
  "Gravitas", "Ennui", "Malaise", "Zeal", "Spite",

  // Sound names
  "Beep", "Click", "Buzz", "Hum", "Ping", "Whir", "Static", "Echo", "Tone",
  "Crackle", "Thud", "Clang", "Sizzle", "Rumble", "Chime", "Squeak", "Rustle",
  "Snap", "Crunch", "Hiss", "Murmur", "Whoosh", "Clatter", "Drip", "Plink",
  "Boom", "Wheeze", "Gurgle", "Twang", "Jingle", "Patter", "Sputter", "Warble",

  // Time names
  "Yesterday", "Tomorrow", "Earlier", "Later", "Sometimes", "Always", "Never",
  "Eventually", "Momentarily", "Briefly", "Soon", "Presently", "Formerly",
  "Lately", "Recently", "Hourly", "Daily", "Weekly", "Annual", "Overdue",
  "Belated", "Premature", "Untimely", "Prompt", "Tardy", "Imminent", "Forever",
  "Awhile", "Once", "Twice", "Whenever", "Midnight", "Dusk", "Dawn", "Anytime", "Someday",

  // Weather names
  "Foggy", "Cloudy", "Drizzle", "Overcast", "Partly", "Mostly", "Clearing",
  "Sleet", "Hail", "Frost", "Mist", "Humid", "Balmy", "Breezy", "Gusty",
  "Muggy", "Sunny", "Stormy", "Thunder", "Lightning", "Rainbow", "Blizzard",
  "Tropical", "Arctic", "Damp", "Scorching", "Hazy", "Misty", "Sweltering",

  // Direction names
  "North", "East", "Slightly", "Approximately", "Roughly", "Nearly", "Almost",
  "South", "West", "Upward", "Onward", "Backward", "Sideways", "Forward",
  "Beyond", "Yonder", "Hither", "Thither", "Inward", "Outward", "Around",
  "Across", "Toward", "Underneath", "Northbound", "Leftward", "Rightward",

  // Status names
  "Loading", "Buffering", "Syncing", "Processing", "Updating",
  "Offline", "Online", "Cached", "Queued", "Pinned", "Archived", "Flagged",
  "Muted", "Verified", "Encrypted", "Corrupted", "Compiling", "Rendering",
  "Debugging", "Deployed", "Throttled", "Idle", "Stale", "Locked", "Booting",
  "Lagging", "Pixelated"
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
  // More mundane surnames
  "Bell", "Foster", "Powell", "Long", "Patterson", "Butler", "Simmons", "Bryant",
  "Russell", "Griffin", "Hayes", "Ford", "Hamilton", "Graham", "Sullivan", "Wallace",
  "Woods", "Cole", "West", "Owens", "Reynolds", "Fisher", "Ellis", "Harrison",
  "Gibson", "Marshall", "Murray", "Freeman", "Wells", "Webb", "Simpson", "Stevens",
  "Tucker", "Porter", "Hunter", "Hicks", "Crawford", "Henry", "Boyd", "Warren",
  "Dixon", "Burns", "Gordon", "Shaw", "Holmes", "Rice", "Robertson", "Hunt",
  "Black", "Daniels", "Palmer", "Mills", "Nichols", "Grant", "Knight", "Ferguson",
  "Rose", "Stone", "Hawkins", "Dunn", "Perkins", "Hudson", "Spencer", "Gardner",
  "Payne", "Pierce", "Berry", "Matthews", "Arnold", "Wagner", "Willis", "Watkins",
  "Olson", "Carroll", "Duncan", "Snyder", "Hart", "Cunningham", "Bradley", "Lane",
  "Andrews", "Armstrong", "Carpenter", "Weaver", "Greene", "Lawrence", "Elliott",
  "Austin", "Peters", "Franklin", "Lawson", "Fields", "Gregory", "Hampton",

  // Occupational
  "Mechanic", "Accountant", "Consultant", "Coordinator", "Administrator", "Supervisor",
  "Representative", "Specialist", "Technician", "Analyst", "Manager", "Director",
  "Auditor", "Adjuster", "Liaison", "Intern", "Apprentice", "Foreman", "Custodian",
  "Receptionist", "Surveyor", "Inspector", "Examiner", "Operator", "Contractor",
  "Strategist", "Architect", "Engineer", "Machinist", "Tactician", "Negotiator",
  "Facilitator", "Moderator", "Curator", "Archivist", "Steward", "Warden",
  "Registrar", "Underwriter", "Appraiser", "Broker", "Vendor", "Supplier",

  // Compound absurd
  "Placeholder", "Undefined", "Untitled", "Unnamed", "Unspecified", "TBD",
  "Various", "Assorted", "Miscellaneous", "Generic", "Standard", "Default",
  "Redacted", "Censored", "Omitted", "Withheld", "Classified", "Anonymous",
  "Confidential", "Restricted", "Unlisted", "Unverified", "Unknown", "Nondescript",
  "Indeterminate", "Unresolved", "Inconclusive", "Forthcoming", "Hypothetical", "Notional",

  // Object-based
  "Lamppost", "Sidewalk", "Crosswalk", "Parking", "Elevator", "Escalator",
  "Hallway", "Doorway", "Stairwell", "Cubicle", "Breakroom", "Backlog",
  "Vestibule", "Mezzanine", "Foyer", "Atrium", "Corridor", "Threshold",
  "Driveway", "Pavement", "Gutter", "Awning", "Turnstile", "Mailroom",
  "Lobby", "Pantry", "Closet", "Basement", "Rooftop", "Courtyard", "Balcony",
  "Veranda", "Storeroom", "Warehouse", "Stockroom", "Workshop",

  // State/condition
  "Pending", "Complete", "Partial", "Ongoing", "Resolved", "Deferred",
  "Tentative", "Conditional", "Approximate", "Estimated", "Projected",
  "Suspended", "Lapsed", "Expired", "Renewed", "Amended", "Revised", "Finalized",
  "Drafted", "Submitted", "Approved", "Rejected", "Escalated", "Delegated",
  "Outstanding", "Dormant", "Latent", "Stalled", "Recurring", "Intermittent", "Sporadic",

  // Number-adjacent
  "Twelve", "Several", "Multiple", "Numerous", "Few", "Many", "Some",
  "Occasional", "Frequent", "Rare", "Common", "Typical", "Average",
  "Countless", "Endless", "Plenty", "Scarce", "Sparse", "Ample", "Surplus",
  "Deficit", "Plural", "Singular", "Sundry", "Umpteen", "Myriad", "Handful",
  "Dozen", "Score", "Gross",

  // Corporate/bureaucratic
  "Incorporated", "Limited", "Holdings", "Solutions", "Services", "Associates",
  "Enterprises", "Industries", "Dynamics", "Logistics", "Systems", "Networks",
  "Ventures", "Partners", "Consolidated", "Unlimited", "Conglomerate", "Syndicate",
  "Collective", "Cooperative", "Capital", "Equity", "Acquisitions", "Subsidiary",
  "Franchise", "Brands", "Works", "Foundry", "Global", "International",
  "Universal", "Federated", "Allied", "United", "Apex", "Vertex", "Nexus",

  // Vaguely ominous
  "Void", "Null", "Empty", "Blank", "Missing", "Gone", "Lost", "Found",
  "Returned", "Recovered", "Restored", "Salvaged", "Reclaimed",
  "Forgotten", "Abandoned", "Forsaken", "Vanished", "Erased", "Deleted", "Banished",
  "Departed", "Severed", "Hollow", "Faded", "Withered", "Ceased", "Buried",
  "Frozen", "Shattered", "Fractured", "Splintered", "Unraveled", "Undone",
  "Forbidden", "Doomed", "Fated", "Marked", "Bound", "Sealed", "Veiled", "Shrouded",

  // Roman numerals
  "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
  "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",

  // Suffixes
  "Jr.", "Sr.", "Esq.", "PhD", "etc.", "et al.", "the Elder", "the Younger"
];

// Middle name modifiers - empty for cleaner names
export const MIDDLE_MODIFIERS = [""];

// Generate a random driver name
export function generateDriverName(rng: Rng = Math.random): { firstName: string; middleName: string; lastName: string; fullName: string } {
  const firstName = pick(FIRST_NAMES, rng);
  const middleName = pick(MIDDLE_MODIFIERS, rng);
  const lastName = pick(LAST_NAMES, rng);

  const fullName = middleName
    ? `${firstName} ${middleName} ${lastName}`
    : `${firstName} ${lastName}`;

  return { firstName, middleName, lastName, fullName };
}

// Generate a car name (random combination)
export function generateCarName(rng: Rng = Math.random): string {
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

  const prefix = pick(prefixes, rng);
  const modifier = pick(modifiers, rng);
  const suffix = pick(suffixes, rng);

  return `${prefix}${modifier}${suffix}`;
}
