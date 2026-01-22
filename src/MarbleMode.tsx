import { useState, useMemo, useEffect } from 'react';
import { Driver, RaceState } from './RaceEngine';
import './MarbleMode.css';

// ============================================
// MARBLE MODE TYPES
// ============================================

export type BetType = 'win' | 'podium' | 'points' | 'finishes' | 'dnf';

export interface Bet {
  id: string;
  driverId: number;
  driverName: string;
  driverEmoji: string;
  type: BetType;
  amount: number;
  odds: number;  // Multiplier (e.g., 3.5 means 3.5x payout)
}

export interface ResolvedBet extends Bet {
  won: boolean;
  payout: number;  // 0 if lost, amount * odds if won
  finalPosition: number | null;  // null if DNF
}

export interface MarbleState {
  bankroll: number;  // Total marbles accumulated
  raceBudget: number;  // 100 marbles given each race
  currentBets: Bet[];
  seasonHistory: SeasonRaceResult[];
}

export interface SeasonRaceResult {
  raceIndex: number;
  trackName: string;
  bets: ResolvedBet[];
  totalWagered: number;
  totalWon: number;
  netChange: number;
}

// ============================================
// MISTER MARBLES - THE NARRATOR
// ============================================

const MISTER_MARBLES = {
  // Greetings at start of betting
  greetings: [
    "Here's your 100 Marbles.",
    "100 Marbles. Spend them wisely. Or don't.",
    "Your allocation has arrived. 100 Marbles.",
    "The Void provides. 100 Marbles.",
    "Another race, another 100 Marbles to lose.",
  ],

  // When player is broke but gets their 100
  brokeGreetings: [
    "You're out of Marbles. Here's 100 more.",
    "Zero Marbles. How interesting. Here's 100.",
    "Starting from nothing again. 100 Marbles.",
    "The simulation takes pity. 100 Marbles.",
    "Back to baseline. 100 Marbles.",
  ],

  // When placing bets
  betPlaced: [
    "Noted.",
    "Recorded.",
    "The simulation observes.",
    "An interesting choice.",
    "If you say so.",
  ],

  // Multiple bets on same driver
  multipleBets: (count: number, name: string) => [
    `You placed ${count} bets on ${name}. Noted.`,
    `${count} bets on ${name}. Committed.`,
    `${name} again? ${count} times now.`,
    `The simulation notices your attachment to ${name}.`,
  ],

  // When bet wins
  betWon: [
    "That worked. Interesting.",
    "Correct.",
    "The chaos favored you.",
    "Against expectations.",
    "Well then.",
  ],

  // When bet loses
  betLost: [
    "It didn't.",
    "No.",
    "The chaos had other plans.",
    "Perhaps next time.",
    "Unfortunate.",
  ],

  // Big win (5x+ payout)
  bigWin: [
    "...Impressive.",
    "The simulation did not expect that.",
    "Against all probability.",
    "You shouldn't have won that.",
    "Noted. With interest.",
  ],

  // Total loss (all bets lost)
  totalLoss: [
    "Everything. Gone.",
    "A complete loss. It happens.",
    "The chaos took everything this time.",
    "Zero returns. The simulation continues.",
    "Perhaps your strategy needs... revision.",
  ],

  // Season end
  seasonEnd: (marbles: number) => [
    `Final tally: ${marbles.toLocaleString()} Marbles.`,
    `Season complete. ${marbles.toLocaleString()} Marbles accumulated.`,
    `The chaos settles. ${marbles.toLocaleString()} Marbles remain.`,
    `${marbles.toLocaleString()} Marbles. The simulation has recorded your performance.`,
  ],

  // Shareable quotes - cryptic, haunting, "interesting"
  shareQuotes: [
    "The marbles remember.",
    "Everything is fine.",
    "The simulation continues.",
    "Chaos finds a way.",
    "Fortune favors the bold. Sometimes.",
    "The void watches.",
    "Results may vary.",
    "Past performance does not guarantee future results.",
    "The house always... well.",
    "Interesting.",
    "You should have bet differently.",
    "The numbers don't lie. But they do whisper.",
    "Another season. Another story.",
    "Luck is a pattern we haven't identified yet.",
    "The marbles are never wrong.",
  ],

  // Commenting on odds
  longshot: [
    "A longshot. The simulation approves of chaos.",
    "High risk. High reward. High foolishness.",
    "The odds are not in your favor. Interesting.",
  ],

  favorite: [
    "The safe choice. How predictable.",
    "Low odds. Low excitement.",
    "Playing it safe. The simulation notes this.",
  ],
};

function getMisterMarblesQuote(category: keyof typeof MISTER_MARBLES): string {
  const quotes = MISTER_MARBLES[category];
  if (Array.isArray(quotes)) {
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
  return '';
}

// ============================================
// RATING DESCRIPTORS - Vibes over numbers
// Tiers: legendary (purple/best) → elite (green) → solid (yellow) → scrappy (orange) → hopeless (red/worst)
// ============================================

type RatingTier = 'legendary' | 'elite' | 'solid' | 'hopeless';

interface RatingDescriptor {
  tier: RatingTier;
  label: string;
}

// Driver skill descriptors (based on combined driver stats)
// 4 tiers: legendary (purple) → elite (green) → solid (yellow) → hopeless (red)
const DRIVER_DESCRIPTORS: Record<RatingTier, string[]> = {
  legendary: [
    'Legendary', 'Mythical', 'Godlike', 'Transcendent', 'Chosen One',
    'The GOAT', 'Untouchable', 'Built Different', 'Main Character',
    'Sicko Mode', 'Final Boss', 'Prophecy Fulfilled', 'Literally Him',
  ],
  elite: [
    'Elite', 'Masterful', 'Brilliant', 'Exceptional', 'Cracked',
    'Dialed In', 'On One', 'Locked In', 'Different Gravy',
    'Certified', 'Top Shelf', 'Premium', 'Chef\'s Kiss',
  ],
  solid: [
    'Solid', 'Reliable', 'Dependable', 'Steady', 'Gets The Job Done',
    'Honest Work', 'No Drama', 'Lunch Pail Guy', 'Professional',
    'Shows Up', 'Pays Rent', 'Fine I Guess', 'Could Be Worse',
    'Scrappy', 'Gritty', 'Questionable', 'Winging It', 'Mid',
  ],
  hopeless: [
    'Hopeless', 'Tragic', 'Doomed', 'Walking DNF', 'Lost Cause',
    'Thoughts & Prayers', 'Bless Their Heart', 'Oh No Baby',
    'Disaster Artist', 'Absolute Cinema', 'Content Creator',
    'Participation Trophy', 'At Least They Tried', 'Yikes',
    'Sus', 'Concerning', 'Prayers Required', 'Red Flags',
  ],
};

// Car quality descriptors (based on car stats)
const CAR_DESCRIPTORS: Record<RatingTier, string[]> = {
  legendary: [
    'Rocketship', 'Absolute Unit', 'Cheat Code', 'Engineering Porn',
    'Beast Mode', 'Straight Nasty', 'War Machine', 'Death Star',
    'Weapon of Choice', 'Pure Violence', 'Unfair Advantage',
  ],
  elite: [
    'Refined', 'Tuned', 'Sharp', 'Pristine', 'Dialed',
    'Clean Build', 'Chef\'s Kiss', 'Money Well Spent', 'Actually Good',
    'The Real Deal', 'Legit', 'Premium Gas Only',
  ],
  solid: [
    'Decent', 'Gets Around', 'Runs Fine', 'Adequate', 'It\'ll Do',
    'Nothing Special', 'Basic', 'Economy Class', 'Sensible',
    'Mid', 'Could Be Worse', 'Passes Inspection',
    'Sketchy', 'Held Together', 'Vibes Only',
  ],
  hopeless: [
    'Tractor', 'Shopping Cart', 'Dumpster Fire', 'Insurance Claim',
    'Rolling Coffin', 'Lawsuit Waiting', 'Tetanus Mobile',
    'Yard Sale', 'Scrap Metal', 'Museum Piece', 'Tax Write-Off',
    'Crime Scene', 'Cry For Help', 'Health Hazard',
    'Duct Tape Dreams', 'Concerning Noises', 'Check Engine Light',
  ],
};

function getRandomDescriptor(descriptors: string[]): string {
  return descriptors[Math.floor(Math.random() * descriptors.length)];
}

/**
 * Calculate a driver's overall rating tier based on their stats
 * Returns a vibe-based descriptor instead of numbers
 */
export function getDriverRating(driver: Driver): RatingDescriptor {
  // Combine driver stats into overall score (0-1 scale)
  const speedScore = (driver.stats.baseSpeed - 0.85) / 0.30;
  const consistencyScore = (driver.stats.consistency - 0.3) / 0.50;
  const luckScore = (driver.stats.luck - 0.3) / 0.50;

  // Weighted average favoring speed and consistency
  const overall = speedScore * 0.5 + consistencyScore * 0.35 + luckScore * 0.15;

  let tier: RatingTier;
  if (overall >= 0.75) tier = 'legendary';
  else if (overall >= 0.5) tier = 'elite';
  else if (overall >= 0.25) tier = 'solid';
  else tier = 'hopeless';

  return {
    tier,
    label: getRandomDescriptor(DRIVER_DESCRIPTORS[tier]),
  };
}

/**
 * Calculate a car's overall rating tier based on its stats
 * Returns a vibe-based descriptor instead of numbers
 */
export function getCarRating(driver: Driver): RatingDescriptor {
  if (!driver.carStats) {
    return { tier: 'solid', label: getRandomDescriptor(CAR_DESCRIPTORS.solid) };
  }

  // Car stats are 1-5 scale, normalize to 0-1
  const powerScore = (driver.carStats.power - 1) / 4;
  const gripScore = (driver.carStats.grip - 1) / 4;
  const reliabilityScore = (driver.carStats.reliability - 1) / 4;

  // Weighted average
  const overall = powerScore * 0.4 + gripScore * 0.35 + reliabilityScore * 0.25;

  let tier: RatingTier;
  if (overall >= 0.75) tier = 'legendary';
  else if (overall >= 0.5) tier = 'elite';
  else if (overall >= 0.25) tier = 'solid';
  else tier = 'hopeless';

  return {
    tier,
    label: getRandomDescriptor(CAR_DESCRIPTORS[tier]),
  };
}

// ============================================
// ODDS CALCULATION
// ============================================

interface DriverOdds {
  win: number;
  podium: number;
  points: number;
  finishes: number;
  dnf: number;
}

// Base multipliers for each bet type (before driver modifier)
// These are generous because the race is chaotic
export const BASE_MULTIPLIERS: Record<BetType, number> = {
  win: 10,      // 10× base for picking the winner
  podium: 4,    // 4× base for top 3
  points: 2,    // 2× base for top 10
  finishes: 1.5, // 1.5× base for completing the race
  dnf: 3,       // 3× base for calling a DNF
};

// Helper to calculate strength score for any driver
function calcDriverStrength(d: Driver): number {
  const ss = (d.stats.baseSpeed - 0.85) / 0.30;
  const cs = (d.stats.consistency - 0.3) / 0.50;
  const ls = (d.stats.luck - 0.3) / 0.50;
  const cp = (d.carStats?.power ?? 3) / 5;
  const cg = (d.carStats?.grip ?? 3) / 5;
  const cr = (d.carStats?.reliability ?? 3) / 5;
  return ss * 0.35 + cs * 0.20 + ls * 0.10 + cp * 0.20 + cg * 0.10 + cr * 0.05;
}

/**
 * Pre-compute driver rankings once for all odds calculations.
 * Returns a Map of driverId -> rank (1-indexed).
 * This avoids O(n²) sorting when calculating odds for each driver.
 */
export function computeDriverRankings(drivers: Driver[]): Map<number, number> {
  const rankings = new Map<number, number>();
  const sorted = drivers
    .map(d => ({ id: d.id, strength: calcDriverStrength(d) }))
    .sort((a, b) => b.strength - a.strength || a.id - b.id);

  sorted.forEach((d, index) => {
    rankings.set(d.id, index + 1);
  });

  return rankings;
}

/**
 * Calculate betting odds for a driver based on their stats
 *
 * New system: Payout = Base Multiplier × Driver Modifier
 * - Base is fixed per bet type (WIN=10×, PODIUM=4×, etc.)
 * - Driver Modifier ranges from 0.5× (favorites) to 5× (longshots)
 *
 * This makes payouts more generous and the formula transparent
 */
export function calculateDriverOdds(driver: Driver, rank: number, _totalDrivers: number): DriverOdds {
  // Get car reliability for DNF/finishes calculations
  const carReliability = (driver.carStats?.reliability ?? 3) / 5;

  // Driver modifier based on rank: favorites ~0.6×, midfield ~1.2×, longshots ~3×
  // This creates a nice spread without being too punishing or too generous
  let driverMod: number;
  if (rank <= 3) {
    driverMod = 0.5 + (rank - 1) * 0.15;  // 0.5, 0.65, 0.8
  } else if (rank <= 6) {
    driverMod = 0.9 + (rank - 3) * 0.15;  // 1.05, 1.2, 1.35
  } else if (rank <= 10) {
    driverMod = 1.4 + (rank - 6) * 0.2;   // 1.6, 1.8, 2.0, 2.2
  } else if (rank <= 15) {
    driverMod = 2.4 + (rank - 10) * 0.3;  // 2.7, 3.0, 3.3, 3.6, 3.9
  } else {
    driverMod = 4.0 + (rank - 15) * 0.4;  // 4.4, 4.8, 5.2...
  }

  // DNF modifier: based on reliability and aggression (inverse - unreliable = lower modifier = easier bet)
  const dnfLikelihood = (1 - carReliability) * 0.6 + (driver.stats.aggression - 0.3) / 0.5 * 0.4;
  // More likely to DNF = lower modifier (1.0), less likely = higher modifier (2.5)
  const dnfMod = 1.0 + (1 - dnfLikelihood) * 1.5;

  // Finishes modifier: inverse of DNF (reliable drivers = lower modifier)
  const finishesMod = 0.8 + dnfLikelihood * 1.5;  // Reliable: 0.8×, unreliable: up to 2.3×

  // Add slight randomness (+/- 10%) to make it feel less deterministic
  const jitter = () => 0.9 + Math.random() * 0.2;

  // Final odds = Base × Driver Modifier (with jitter)
  return {
    win: Math.round(BASE_MULTIPLIERS.win * driverMod * jitter() * 10) / 10,
    podium: Math.round(BASE_MULTIPLIERS.podium * driverMod * jitter() * 10) / 10,
    points: Math.round(BASE_MULTIPLIERS.points * driverMod * jitter() * 10) / 10,
    finishes: Math.round(BASE_MULTIPLIERS.finishes * finishesMod * jitter() * 10) / 10,
    dnf: Math.round(BASE_MULTIPLIERS.dnf * dnfMod * jitter() * 10) / 10,
  };
}

// ============================================
// BET RESOLUTION
// ============================================

export function resolveBets(bets: Bet[], drivers: Driver[], raceState: RaceState): ResolvedBet[] {
  return bets.map(bet => {
    const driver = drivers.find(d => d.id === bet.driverId);
    if (!driver) {
      return { ...bet, won: false, payout: 0, finalPosition: null };
    }

    const isDNF = driver.status === 'dnf';
    const finishPosition = isDNF ? null : raceState.finishOrder.indexOf(driver.id) + 1;

    let won = false;
    switch (bet.type) {
      case 'win':
        won = finishPosition === 1;
        break;
      case 'podium':
        won = finishPosition !== null && finishPosition <= 3;
        break;
      case 'points':
        won = finishPosition !== null && finishPosition <= 10;
        break;
      case 'finishes':
        won = !isDNF;  // Driver completed the race
        break;
      case 'dnf':
        won = isDNF;
        break;
    }

    return {
      ...bet,
      won,
      payout: won ? Math.floor(bet.amount * bet.odds) : 0,
      finalPosition: finishPosition,
    };
  });
}

// ============================================
// BETTING INTERFACE COMPONENT
// ============================================

interface BettingInterfaceProps {
  drivers: Driver[];
  raceBudget: number;
  currentBets: Bet[];
  onPlaceBet: (bet: Omit<Bet, 'id'>) => void;
  onRemoveBet: (betId: string) => void;
  onConfirmBets: () => void;
  trackName: string;
  raceNumber: number;
  totalRaces: number;
  bankroll: number;
}

export function BettingInterface({
  drivers,
  raceBudget,
  currentBets,
  onPlaceBet,
  onRemoveBet,
  onConfirmBets,
  trackName,
  raceNumber,
  totalRaces,
  bankroll,
}: BettingInterfaceProps) {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedBetType, setSelectedBetType] = useState<BetType>('podium');
  const [betAmount, setBetAmount] = useState(10);
  const [narratorMessage, setNarratorMessage] = useState('');

  // Pre-compute rankings once (O(n log n)) instead of per-driver (O(n² log n))
  const driverRankings = useMemo(() => computeDriverRankings(drivers), [drivers]);

  // Calculate odds for all drivers using pre-computed rankings
  const driverOdds = useMemo(() => {
    const oddsMap = new Map<number, DriverOdds>();
    const total = drivers.length;
    drivers.forEach(d => {
      const rank = driverRankings.get(d.id) ?? total;
      oddsMap.set(d.id, calculateDriverOdds(d, rank, total));
    });
    return oddsMap;
  }, [drivers, driverRankings]);

  // Sort drivers by win odds for display
  const sortedDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => {
      const oddsA = driverOdds.get(a.id)?.win ?? 100;
      const oddsB = driverOdds.get(b.id)?.win ?? 100;
      return oddsA - oddsB;
    });
  }, [drivers, driverOdds]);

  // Get betting tier based on rank position (sorted by odds)
  // Dynamic tier distribution based on driver count:
  // - Top ~15% = purple (favorite)
  // - Next ~35% = green (contender)
  // - Next ~25% = yellow (longshot)
  // - Rest = red (wildcard)
  // For 20 drivers: 3 purple, 7 green, 5 yellow, 5 red
  const driverTiers = useMemo(() => {
    const tiers = new Map<number, 'favorite' | 'contender' | 'longshot' | 'wildcard'>();
    const total = sortedDrivers.length;

    // Calculate tier cutoffs (proportional to grid size)
    const purpleCutoff = Math.max(1, Math.round(total * 0.15));  // Top ~15%
    const greenCutoff = purpleCutoff + Math.max(1, Math.round(total * 0.35));  // Next ~35%
    const yellowCutoff = greenCutoff + Math.max(1, Math.round(total * 0.25));  // Next ~25%

    sortedDrivers.forEach((driver, index) => {
      const rank = index + 1;
      if (rank <= purpleCutoff) {
        tiers.set(driver.id, 'favorite');
      } else if (rank <= greenCutoff) {
        tiers.set(driver.id, 'contender');
      } else if (rank <= yellowCutoff) {
        tiers.set(driver.id, 'longshot');
      } else {
        tiers.set(driver.id, 'wildcard');
      }
    });

    return tiers;
  }, [sortedDrivers]);

  const getDriverTierByOdds = (driver: Driver): 'favorite' | 'contender' | 'longshot' | 'wildcard' => {
    return driverTiers.get(driver.id) ?? 'wildcard';
  };

  // Memoize driver ratings so they don't re-randomize on every render
  const driverRatings = useMemo(() => {
    const ratings = new Map<number, RatingDescriptor>();
    drivers.forEach(driver => {
      const rating = getDriverRating(driver);
      ratings.set(driver.id, rating);
    });
    return ratings;
  }, [drivers]);

  // Memoize car ratings so they don't re-randomize on every render
  const carRatings = useMemo(() => {
    const ratings = new Map<number, RatingDescriptor>();
    drivers.forEach(driver => {
      const rating = getCarRating(driver);
      ratings.set(driver.id, rating);
    });
    return ratings;
  }, [drivers]);

  // Total wagered so far
  const totalWagered = currentBets.reduce((sum, b) => sum + b.amount, 0);
  const remaining = raceBudget - totalWagered;

  // Set initial narrator message
  useEffect(() => {
    const isBroke = bankroll === 0;
    setNarratorMessage(
      isBroke
        ? getMisterMarblesQuote('brokeGreetings')
        : getMisterMarblesQuote('greetings')
    );
  }, [bankroll]);

  const handlePlaceBet = () => {
    if (!selectedDriver || betAmount <= 0 || betAmount > remaining) return;

    // Prevent multiple bets on the same driver
    if (currentBets.some(b => b.driverId === selectedDriver.id)) return;

    // Prevent exceeding bet type limits
    if (isBetTypeAtLimit(selectedBetType)) return;

    const odds = driverOdds.get(selectedDriver.id);
    if (!odds) return;

    const bet: Omit<Bet, 'id'> = {
      driverId: selectedDriver.id,
      driverName: selectedDriver.name,
      driverEmoji: selectedDriver.emoji,
      type: selectedBetType,
      amount: betAmount,
      odds: odds[selectedBetType],
    };

    onPlaceBet(bet);

    if (odds[selectedBetType] > 15) {
      setNarratorMessage(getMisterMarblesQuote('longshot'));
    } else if (odds[selectedBetType] < 3) {
      setNarratorMessage(getMisterMarblesQuote('favorite'));
    } else {
      setNarratorMessage(getMisterMarblesQuote('betPlaced'));
    }

    // Reset for next bet
    setBetAmount(Math.min(10, remaining - betAmount));
    setSelectedDriver(null);
  };

  // Let Mister Marbles place random bets with ALL remaining budget
  const handleMisterMarblesDecides = () => {
    if (remaining <= 0) return;

    const availableDrivers = drivers.filter(d => !currentBets.some(b => b.driverId === d.id));
    const shuffledDrivers = [...availableDrivers].sort(() => Math.random() - 0.5);

    const betTypes: BetType[] = ['win', 'podium', 'points', 'finishes', 'dnf'];
    const betsToPlace: Array<Omit<Bet, 'id'>> = [];

    // First pass: pick drivers and bet types
    for (const driver of shuffledDrivers) {
      // Pick a random bet type that isn't at limit
      const availableTypes = betTypes.filter(type => {
        const currentCount = getBetCountByType(type) + betsToPlace.filter(b => b.type === type).length;
        return currentCount < getBetTypeLimit(type);
      });

      if (availableTypes.length === 0) break;

      const betType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      const odds = driverOdds.get(driver.id);
      if (!odds) continue;

      betsToPlace.push({
        driverId: driver.id,
        driverName: driver.name,
        driverEmoji: driver.emoji,
        type: betType,
        amount: 0,  // Will be filled in next step
        odds: odds[betType],
      });

      // Random number of bets (3-8), but don't exceed available drivers
      if (betsToPlace.length >= 3 + Math.floor(Math.random() * 6)) break;
    }

    // Second pass: distribute ALL remaining marbles across bets
    if (betsToPlace.length > 0) {
      let budgetLeft = remaining;
      const baseAmount = Math.floor(budgetLeft / betsToPlace.length);
      let remainder = budgetLeft - (baseAmount * betsToPlace.length);

      for (const bet of betsToPlace) {
        // Give base amount plus 1 extra if there's remainder
        const extra = remainder > 0 ? 1 : 0;
        bet.amount = baseAmount + extra;
        remainder--;
      }
    }

    // Place all the bets
    for (const bet of betsToPlace) {
      if (bet.amount > 0) {
        onPlaceBet(bet);
      }
    }

    // Mister Marbles commentary
    const quotes = [
      "The marbles have spoken.",
      "I saw this in a vision. Or a fever dream. Same thing.",
      "Trust the process. I certainly don't.",
      "These picks are guaranteed.* (*Not a guarantee)",
      "My third eye picked these. The other two were busy.",
      "Fortune favors the bold. And the confused.",
    ];
    setNarratorMessage(quotes[Math.floor(Math.random() * quotes.length)]);
    setSelectedDriver(null);
  };

  const getBetTypeLabel = (type: BetType): string => {
    switch (type) {
      case 'win': return 'Win';
      case 'podium': return 'Podium';
      case 'points': return 'Points';
      case 'finishes': return 'Finishes';
      case 'dnf': return 'DNF';
    }
  };

  const getBetTypeDesc = (type: BetType): string => {
    switch (type) {
      case 'win': return 'P1';
      case 'podium': return 'Top 3';
      case 'points': return 'Top 10';
      case 'finishes': return 'Complete';
      case 'dnf': return 'Crash';
    }
  };

  // Max bets per type - can only bet on as many drivers as could win
  const getBetTypeLimit = (type: BetType): number => {
    switch (type) {
      case 'win': return 1;        // Only 1 winner
      case 'podium': return 3;     // Only 3 podium spots
      case 'points': return 10;    // Only 10 points positions
      case 'finishes': return drivers.length;  // Anyone can finish
      case 'dnf': return drivers.length;       // Anyone can DNF
    }
  };

  // Count bets by type
  const getBetCountByType = (type: BetType): number => {
    return currentBets.filter(b => b.type === type).length;
  };

  // Check if bet type is at limit
  const isBetTypeAtLimit = (type: BetType): boolean => {
    return getBetCountByType(type) >= getBetTypeLimit(type);
  };

  // Find the index of selected driver for inline bet panel positioning
  const selectedDriverIndex = selectedDriver ? sortedDrivers.findIndex(d => d.id === selectedDriver.id) : -1;

  return (
    <div className="betting-interface wordle-style">
      {/* Header - Compact */}
      <div className="betting-header">
        <div className="race-info">
          <span className="race-number">Race {raceNumber}/{totalRaces}</span>
          <h2 className="track-name">{trackName}</h2>
        </div>
        <div className="marble-status">
          <div className="bankroll">
            <span className="label">Bank</span>
            <span className="value">{bankroll.toLocaleString()}</span>
          </div>
          <div className="race-budget">
            <span className="label">Budget</span>
            <span className="value">{remaining}</span>
          </div>
        </div>
      </div>

      {/* Narrator - Prominent */}
      <div className="narrator-box">
        <span className="narrator-name">🔮 Mister Marbles</span>
        <span className="narrator-message">"{narratorMessage}"</span>
        <span className="betting-tip">Better drivers, worse odds. The chaos doesn't care about your favorites.</span>
      </div>

      {/* Main Grid Area */}
      <div className="wordle-main">
        {/* Driver Grid - Wordle Style */}
        <div className="wordle-grid">
          {sortedDrivers.map((driver, index) => {
            const odds = driverOdds.get(driver.id);
            const isSelected = selectedDriver?.id === driver.id;
            const hasBet = currentBets.some(b => b.driverId === driver.id);
            const tier = getDriverTierByOdds(driver);

            // Check if bet panel should appear after this driver
            const showBetPanelAfter = selectedDriver && selectedDriverIndex === index;

            return (
              <div key={driver.id} className="wordle-cell-wrapper">
                <button
                  className={`wordle-cell tier-${tier} ${isSelected ? 'selected' : ''} ${hasBet ? 'has-bet' : ''}`}
                  onClick={() => setSelectedDriver(isSelected ? null : driver)}
                  disabled={hasBet}
                >
                  <span className="cell-emoji">{driver.emoji}</span>
                  <span className="cell-odds">{odds?.win.toFixed(1)}x</span>
                  {hasBet && <span className="cell-check">✓</span>}
                </button>

                {/* Inline Bet Panel - appears below selected driver */}
                {showBetPanelAfter && (
                  <div className="inline-bet-panel">
                    <div className="inline-bet-header">
                      <span className="inline-driver-name">{selectedDriver.emoji} {selectedDriver.name}</span>
                      <button className="inline-close" onClick={() => setSelectedDriver(null)}>×</button>
                    </div>

                    {/* Driver Vibes - Opaque ratings */}
                    <div className="driver-vibes">
                      <div className="vibe-ratings">
                        <div className="vibe-item">
                          <span className="vibe-label">Driver:</span>
                          <span className={`vibe-value tier-${driverRatings.get(selectedDriver.id)?.tier}`}>
                            {driverRatings.get(selectedDriver.id)?.label}
                          </span>
                        </div>
                        <div className="vibe-item">
                          <span className="vibe-label">Car:</span>
                          <span className={`vibe-value tier-${carRatings.get(selectedDriver.id)?.tier}`}>
                            {carRatings.get(selectedDriver.id)?.label}
                          </span>
                        </div>
                      </div>
                      {selectedDriver.quirk && (
                        <div className="driver-quirk">
                          <span className="quirk-tag">⚡ {selectedDriver.quirk}</span>
                        </div>
                      )}
                    </div>

                    {/* Bet Type Pills */}
                    <div className="bet-type-pills">
                      {(['win', 'podium', 'points', 'finishes', 'dnf'] as BetType[]).map(type => {
                        const typeOdds = driverOdds.get(selectedDriver.id)?.[type] ?? 0;
                        const atLimit = isBetTypeAtLimit(type);
                        return (
                          <button
                            key={type}
                            className={`bet-pill ${selectedBetType === type ? 'selected' : ''} ${atLimit ? 'disabled' : ''}`}
                            onClick={() => !atLimit && setSelectedBetType(type)}
                            disabled={atLimit}
                          >
                            <span className="pill-label">{getBetTypeLabel(type)}</span>
                            <span className="pill-desc">{getBetTypeDesc(type)}</span>
                            <span className="pill-odds">{atLimit ? '—' : `${typeOdds.toFixed(1)}x`}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Amount & Place Bet */}
                    <div className="inline-bet-actions">
                      <div className="amount-row">
                        <button onClick={() => setBetAmount(Math.max(1, betAmount - 10))}>−10</button>
                        <button onClick={() => setBetAmount(Math.max(1, betAmount - 1))}>−1</button>
                        <span className="amount-value">{betAmount}ṁ</span>
                        <button onClick={() => setBetAmount(Math.min(remaining, betAmount + 1))}>+1</button>
                        <button onClick={() => setBetAmount(Math.min(remaining, betAmount + 10))}>+10</button>
                      </div>
                      <div className="quick-row">
                        <button onClick={() => setBetAmount(Math.min(remaining, 10))}>10</button>
                        <button onClick={() => setBetAmount(Math.min(remaining, 25))}>25</button>
                        <button onClick={() => setBetAmount(Math.min(remaining, 50))}>50</button>
                        <button onClick={() => setBetAmount(remaining)}>All</button>
                      </div>
                      <button
                        className="place-bet-inline"
                        onClick={handlePlaceBet}
                        disabled={remaining <= 0 || betAmount <= 0}
                      >
                        Place {betAmount}ṁ → {Math.floor(betAmount * (driverOdds.get(selectedDriver.id)?.[selectedBetType] ?? 0))}ṁ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Section - Mister Marbles + Current Bets */}
        <div className="wordle-bottom">
          {/* Mister Marbles Button - Always Visible */}
          {remaining > 0 && (
            <button className="mister-marbles-btn" onClick={handleMisterMarblesDecides}>
              🔮 Let Mister Marbles Decide ({remaining}ṁ)
            </button>
          )}

          {/* Current Bets Summary */}
          {currentBets.length > 0 && (
            <div className="bets-summary">
              <div className="bets-chips">
                {currentBets.map(bet => (
                  <div key={bet.id} className="bet-chip">
                    <span className="chip-emoji">{bet.driverEmoji}</span>
                    <span className="chip-type">{getBetTypeLabel(bet.type)}</span>
                    <span className="chip-amount">{bet.amount}→{Math.floor(bet.amount * bet.odds)}</span>
                    <button className="chip-remove" onClick={() => onRemoveBet(bet.id)}>×</button>
                  </div>
                ))}
              </div>
              <div className="bets-totals">
                <span className="total-wagered">{totalWagered}ṁ wagered</span>
                <span className="total-potential">→ {currentBets.reduce((sum, b) => sum + Math.floor(b.amount * b.odds), 0)}ṁ max</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Start Race */}
      <div className="betting-footer">
        <button
          className={`confirm-bets-btn ${currentBets.length > 0 ? 'has-bets' : ''}`}
          onClick={onConfirmBets}
        >
          {currentBets.length > 0 ? `Start Race (${currentBets.length} bet${currentBets.length > 1 ? 's' : ''})` : 'Skip Betting'}
        </button>
      </div>
    </div>
  );
}

// ============================================
// LIVE BET INDICATOR FOR TIMING TOWER
// ============================================

export interface LiveBetInfo {
  type: BetType;
  amount: number;
  potential: number;
  isWinning: boolean;
}

export function calculateLiveBetStatus(
  driverId: number,
  currentPosition: number,
  bets: Bet[],
  isDNF: boolean
): { totalPotential: number; status: 'winning' | 'losing' | 'none'; bets: LiveBetInfo[] } {
  const driverBets = bets.filter(b => b.driverId === driverId);
  if (driverBets.length === 0) return { totalPotential: 0, status: 'none', bets: [] };

  let totalPotential = 0;
  let anyWinning = false;
  const betInfos: LiveBetInfo[] = [];

  for (const bet of driverBets) {
    let wouldWin = false;

    if (isDNF) {
      wouldWin = bet.type === 'dnf';
    } else {
      switch (bet.type) {
        case 'win':
          wouldWin = currentPosition === 1;
          break;
        case 'podium':
          wouldWin = currentPosition <= 3;
          break;
        case 'points':
          wouldWin = currentPosition <= 10;
          break;
        case 'finishes':
          wouldWin = true;  // Still racing = will finish (optimistic until DNF)
          break;
        case 'dnf':
          wouldWin = false;  // Not DNF, so DNF bet loses
          break;
      }
    }

    const potential = wouldWin ? Math.floor(bet.amount * bet.odds) : -bet.amount;
    betInfos.push({
      type: bet.type,
      amount: bet.amount,
      potential,
      isWinning: wouldWin,
    });

    if (wouldWin) {
      totalPotential += Math.floor(bet.amount * bet.odds);
      anyWinning = true;
    } else {
      totalPotential -= bet.amount;
    }
  }

  return {
    totalPotential,
    status: anyWinning ? 'winning' : 'losing',
    bets: betInfos,
  };
}

// ============================================
// POST-RACE RESULTS COMPONENT
// ============================================

interface RaceResultsProps {
  resolvedBets: ResolvedBet[];
  onContinue: () => void;
  raceNumber: number;
  totalRaces: number;
  newBankroll: number;
}

export function RaceResults({
  resolvedBets,
  onContinue,
  raceNumber,
  totalRaces,
  newBankroll,
}: RaceResultsProps) {
  const totalWagered = resolvedBets.reduce((sum, b) => sum + b.amount, 0);
  const totalWon = resolvedBets.reduce((sum, b) => sum + b.payout, 0);
  const netChange = totalWon - totalWagered;
  const anyWins = resolvedBets.some(b => b.won);
  const allLost = resolvedBets.length > 0 && !anyWins;
  const bigWin = resolvedBets.some(b => b.won && b.odds >= 5);

  const [narratorMessage, setNarratorMessage] = useState('');

  useEffect(() => {
    if (resolvedBets.length === 0) {
      setNarratorMessage("You didn't bet. The simulation notes your caution.");
    } else if (allLost) {
      setNarratorMessage(getMisterMarblesQuote('totalLoss'));
    } else if (bigWin) {
      setNarratorMessage(getMisterMarblesQuote('bigWin'));
    } else if (anyWins) {
      setNarratorMessage(getMisterMarblesQuote('betWon'));
    } else {
      setNarratorMessage(getMisterMarblesQuote('betLost'));
    }
  }, [resolvedBets, allLost, bigWin, anyWins]);

  const getBetTypeLabel = (type: BetType): string => {
    switch (type) {
      case 'win': return 'Win';
      case 'podium': return 'Podium';
      case 'points': return 'Points';
      case 'finishes': return 'Finishes';
      case 'dnf': return 'DNF';
    }
  };

  const isLastRace = raceNumber === totalRaces;

  return (
    <div className="race-results">
      <h2>Race {raceNumber} Complete</h2>

      <div className="narrator-box results">
        <span className="narrator-name">Mister Marbles:</span>
        <span className="narrator-message">"{narratorMessage}"</span>
      </div>

      {resolvedBets.length > 0 ? (
        <div className="results-list">
          {resolvedBets.map(bet => (
            <div key={bet.id} className={`result-item ${bet.won ? 'won' : 'lost'}`}>
              <span className="result-driver">{bet.driverEmoji} {bet.driverName}</span>
              <span className="result-type">{getBetTypeLabel(bet.type)}</span>
              <span className="result-position">
                {bet.finalPosition ? `P${bet.finalPosition}` : 'DNF'}
              </span>
              <span className="result-outcome">
                {bet.won ? (
                  <span className="win">+{bet.payout - bet.amount} ṁ</span>
                ) : (
                  <span className="loss">-{bet.amount} ṁ</span>
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-bets-placed">No bets were placed this race.</p>
      )}

      <div className="results-summary">
        <div className="summary-row">
          <span>Wagered:</span>
          <span>{totalWagered} ṁ</span>
        </div>
        <div className="summary-row">
          <span>Won:</span>
          <span>{totalWon} ṁ</span>
        </div>
        <div className={`summary-row net ${netChange >= 0 ? 'positive' : 'negative'}`}>
          <span>Net:</span>
          <span>{netChange >= 0 ? '+' : ''}{netChange} ṁ</span>
        </div>
        <div className="summary-row bankroll">
          <span>Bankroll:</span>
          <span>{newBankroll.toLocaleString()} ṁ</span>
        </div>
      </div>

      <button className="continue-btn" onClick={onContinue}>
        {isLastRace ? 'View Final Tally' : 'Next Race'}
      </button>
    </div>
  );
}

// ============================================
// SEASON FINAL TALLY
// ============================================

interface SeasonTallyProps {
  finalBankroll: number;
  seasonHistory: SeasonRaceResult[];
  totalRaces: number;
  champion: { name: string; emoji: string } | null;
  onNewSeason: () => void;
}

export function SeasonTally({
  finalBankroll,
  seasonHistory,
  totalRaces,
  champion,
  onNewSeason,
}: SeasonTallyProps) {
  const totalWagered = seasonHistory.reduce((sum, r) => sum + r.totalWagered, 0);
  const totalWon = seasonHistory.reduce((sum, r) => sum + r.totalWon, 0);
  const totalBetsPlaced = seasonHistory.reduce((sum, r) => sum + r.bets.length, 0);
  const totalBetsWon = seasonHistory.reduce((sum, r) => sum + r.bets.filter(b => b.won).length, 0);

  const [shareCopied, setShareCopied] = useState(false);

  const narratorMessage = useMemo(() => {
    const quotes = MISTER_MARBLES.seasonEnd(finalBankroll);
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, [finalBankroll]);

  // Generate shareable season summary
  const handleShare = async () => {
    const netChange = totalWon - totalWagered;

    // Generate race-by-race result boxes (like Wordle)
    const raceBoxes = seasonHistory.map(race => {
      if (race.bets.length === 0) return '⬜'; // No bets
      const wins = race.bets.filter(b => b.won).length;
      const total = race.bets.length;
      if (wins === total) return '🟩'; // All wins
      if (wins === 0) return '🟥'; // All losses
      return '🟨'; // Mixed
    }).join('');

    // Count DNFs from bets (drivers we bet on who didn't finish)
    const eliminations = seasonHistory.reduce((sum, race) =>
      sum + race.bets.filter(b => b.finalPosition === null).length, 0);

    // Random Mister Marbles quote
    const quote = MISTER_MARBLES.shareQuotes[
      Math.floor(Math.random() * MISTER_MARBLES.shareQuotes.length)
    ];

    const lines: string[] = [
      '🏁 PARABOLICA 🏁',
      `Season Complete (${totalRaces} races)`,
      '',
      raceBoxes,
      '',
      ...(champion ? [`🏆 ${champion.emoji} ${champion.name}`] : []),
      `🔮 ${netChange >= 0 ? '+' : ''}${netChange.toLocaleString()} marbles`,
      ...(eliminations > 0 ? [`💀 ${eliminations} eliminations witnessed`] : []),
      '',
      `"${quote}"`,
      '',
      '🔮 playparabolica.com',
    ];

    const shareText = lines.join('\n');

    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <div className="season-tally">
      <h1>Season Complete</h1>

      <div className="narrator-box final">
        <span className="narrator-name">Mister Marbles:</span>
        <span className="narrator-message">"{narratorMessage}"</span>
      </div>

      <div className="final-score">
        <span className="score-value">{finalBankroll.toLocaleString()}</span>
        <span className="score-label">Marbles</span>
      </div>

      <div className="season-stats">
        <div className="stat">
          <span className="stat-value">{seasonHistory.length}</span>
          <span className="stat-label">Races</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalBetsPlaced}</span>
          <span className="stat-label">Bets Placed</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalBetsWon}</span>
          <span className="stat-label">Bets Won</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalWagered.toLocaleString()} ṁ</span>
          <span className="stat-label">Total Wagered</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalWon.toLocaleString()} ṁ</span>
          <span className="stat-label">Total Won</span>
        </div>
      </div>

      <div className="race-history">
        <h3>Race by Race</h3>
        {seasonHistory.map((race, i) => (
          <div key={i} className={`history-row ${race.netChange >= 0 ? 'positive' : 'negative'}`}>
            <span className="race-track">{race.trackName}</span>
            <span className="race-bets">{race.bets.length} bets</span>
            <span className="race-net">
              {race.netChange >= 0 ? '+' : ''}{race.netChange} ṁ
            </span>
          </div>
        ))}
      </div>

      <div className="season-tally-buttons">
        <button className="share-btn" onClick={handleShare}>
          {shareCopied ? '✓ Copied!' : '📋 Share'}
        </button>
        <button className="new-season-btn" onClick={onNewSeason}>
          New Season
        </button>
      </div>
    </div>
  );
}

export default BettingInterface;
