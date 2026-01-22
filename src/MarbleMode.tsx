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

/**
 * Calculate betting odds for a driver based on their stats
 *
 * New system: Payout = Base Multiplier × Driver Modifier
 * - Base is fixed per bet type (WIN=10×, PODIUM=4×, etc.)
 * - Driver Modifier ranges from 0.5× (favorites) to 5× (longshots)
 *
 * This makes payouts more generous and the formula transparent
 */
export function calculateDriverOdds(driver: Driver, allDrivers: Driver[]): DriverOdds {
  // Calculate a "strength" score for the driver (0-1 scale)
  const speedScore = (driver.stats.baseSpeed - 0.85) / 0.30;  // Normalized 0-1
  const consistencyScore = (driver.stats.consistency - 0.3) / 0.50;
  const luckScore = (driver.stats.luck - 0.3) / 0.50;

  // Car stats matter too
  const carPower = (driver.carStats?.power ?? 3) / 5;
  const carGrip = (driver.carStats?.grip ?? 3) / 5;
  const carReliability = (driver.carStats?.reliability ?? 3) / 5;

  // Overall strength (weighted)
  const strength = (
    speedScore * 0.35 +
    consistencyScore * 0.20 +
    luckScore * 0.10 +
    carPower * 0.20 +
    carGrip * 0.10 +
    carReliability * 0.05
  );

  // Rank among all drivers (affects modifier)
  const allStrengths = allDrivers.map(d => {
    const ss = (d.stats.baseSpeed - 0.85) / 0.30;
    const cs = (d.stats.consistency - 0.3) / 0.50;
    const ls = (d.stats.luck - 0.3) / 0.50;
    const cp = (d.carStats?.power ?? 3) / 5;
    const cg = (d.carStats?.grip ?? 3) / 5;
    const cr = (d.carStats?.reliability ?? 3) / 5;
    return ss * 0.35 + cs * 0.20 + ls * 0.10 + cp * 0.20 + cg * 0.10 + cr * 0.05;
  }).sort((a, b) => b - a);

  const rank = allStrengths.indexOf(strength) + 1 || allStrengths.length;

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

  // Calculate odds for all drivers
  const driverOdds = useMemo(() => {
    const oddsMap = new Map<number, DriverOdds>();
    drivers.forEach(d => {
      oddsMap.set(d.id, calculateDriverOdds(d, drivers));
    });
    return oddsMap;
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
      case 'win': return 'Win (P1)';
      case 'podium': return 'Podium (Top 3)';
      case 'points': return 'Points (Top 10)';
      case 'finishes': return 'Finishes';
      case 'dnf': return 'DNF';
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

  // Categorize drivers into tiers by win odds
  const driverTiers = useMemo(() => {
    const sorted = [...drivers].sort((a, b) => {
      const oddsA = driverOdds.get(a.id)?.win ?? 100;
      const oddsB = driverOdds.get(b.id)?.win ?? 100;
      return oddsA - oddsB;
    });

    // Favorites: win odds < 5x (top ~3-4)
    // Contenders: win odds 5-12x (middle pack)
    // Longshots: win odds 12-25x (back of midfield)
    // Wildcards: win odds > 25x (backmarkers with crazy odds)
    const favorites: Driver[] = [];
    const contenders: Driver[] = [];
    const longshots: Driver[] = [];
    const wildcards: Driver[] = [];

    sorted.forEach(driver => {
      const winOdds = driverOdds.get(driver.id)?.win ?? 100;
      if (winOdds < 5) {
        favorites.push(driver);
      } else if (winOdds < 12) {
        contenders.push(driver);
      } else if (winOdds < 25) {
        longshots.push(driver);
      } else {
        wildcards.push(driver);
      }
    });

    return { favorites, contenders, longshots, wildcards };
  }, [drivers, driverOdds]);

  return (
    <div className="betting-interface">
      <div className="betting-header">
        <div className="race-info">
          <span className="race-number">Race {raceNumber} of {totalRaces}</span>
          <h2 className="track-name">{trackName}</h2>
        </div>
        <div className="marble-status">
          <div className="bankroll">
            <span className="label">Bankroll</span>
            <span className="value">{bankroll.toLocaleString()} ṁ</span>
          </div>
          <div className="race-budget">
            <span className="label">Race Budget</span>
            <span className="value">{remaining} ṁ</span>
          </div>
        </div>
      </div>

      <div className="narrator-box">
        <span className="narrator-name">Mister Marbles:</span>
        <span className="narrator-message">"{narratorMessage}"</span>
      </div>

      <div className="betting-content">
        <div className="driver-grid">
          <h3>Select Driver</h3>
          <div className="drivers-list tiered">
            {/* Favorites - Green */}
            {driverTiers.favorites.length > 0 && (
              <div className="driver-tier favorites">
                <div className="tier-header">
                  <span className="tier-label">Favorites</span>
                  <span className="tier-desc">Low risk, low reward</span>
                </div>
                <div className="tier-drivers">
                  {driverTiers.favorites.map(driver => {
                    const odds = driverOdds.get(driver.id);
                    const isSelected = selectedDriver?.id === driver.id;
                    const hasBet = currentBets.some(b => b.driverId === driver.id);
                    return (
                      <button
                        key={driver.id}
                        className={`driver-option tier-favorite ${isSelected ? 'selected' : ''} ${hasBet ? 'has-bet' : ''}`}
                        onClick={() => setSelectedDriver(driver)}
                      >
                        <span className="driver-emoji">{driver.emoji}</span>
                        <span className="driver-name">{driver.shortName}</span>
                        <span className="driver-odds">{odds?.win.toFixed(1)}x</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contenders - Yellow */}
            {driverTiers.contenders.length > 0 && (
              <div className="driver-tier contenders">
                <div className="tier-header">
                  <span className="tier-label">Contenders</span>
                  <span className="tier-desc">Could surprise</span>
                </div>
                <div className="tier-drivers">
                  {driverTiers.contenders.map(driver => {
                    const odds = driverOdds.get(driver.id);
                    const isSelected = selectedDriver?.id === driver.id;
                    const hasBet = currentBets.some(b => b.driverId === driver.id);
                    return (
                      <button
                        key={driver.id}
                        className={`driver-option tier-contender ${isSelected ? 'selected' : ''} ${hasBet ? 'has-bet' : ''}`}
                        onClick={() => setSelectedDriver(driver)}
                      >
                        <span className="driver-emoji">{driver.emoji}</span>
                        <span className="driver-name">{driver.shortName}</span>
                        <span className="driver-odds">{odds?.win.toFixed(1)}x</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Longshots - Red */}
            {driverTiers.longshots.length > 0 && (
              <div className="driver-tier longshots">
                <div className="tier-header">
                  <span className="tier-label">Longshots</span>
                  <span className="tier-desc">Risky business</span>
                </div>
                <div className="tier-drivers">
                  {driverTiers.longshots.map(driver => {
                    const odds = driverOdds.get(driver.id);
                    const isSelected = selectedDriver?.id === driver.id;
                    const hasBet = currentBets.some(b => b.driverId === driver.id);
                    return (
                      <button
                        key={driver.id}
                        className={`driver-option tier-longshot ${isSelected ? 'selected' : ''} ${hasBet ? 'has-bet' : ''}`}
                        onClick={() => setSelectedDriver(driver)}
                      >
                        <span className="driver-emoji">{driver.emoji}</span>
                        <span className="driver-name">{driver.shortName}</span>
                        <span className="driver-odds">{odds?.win.toFixed(1)}x</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Wildcards - Purple */}
            {driverTiers.wildcards.length > 0 && (
              <div className="driver-tier wildcards">
                <div className="tier-header">
                  <span className="tier-label">Wildcards</span>
                  <span className="tier-desc">Chaos agents</span>
                </div>
                <div className="tier-drivers">
                  {driverTiers.wildcards.map(driver => {
                    const odds = driverOdds.get(driver.id);
                    const isSelected = selectedDriver?.id === driver.id;
                    const hasBet = currentBets.some(b => b.driverId === driver.id);
                    return (
                      <button
                        key={driver.id}
                        className={`driver-option tier-wildcard ${isSelected ? 'selected' : ''} ${hasBet ? 'has-bet' : ''}`}
                        onClick={() => setSelectedDriver(driver)}
                      >
                        <span className="driver-emoji">{driver.emoji}</span>
                        <span className="driver-name">{driver.shortName}</span>
                        <span className="driver-odds">{odds?.win.toFixed(1)}x</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bet-builder">
          {selectedDriver ? (
            <>
              <div className="selected-driver-info">
                <span className="emoji">{selectedDriver.emoji}</span>
                <span className="name">{selectedDriver.name}</span>
              </div>

              <div className="bet-type-selector">
                <h4>Bet Type</h4>
                <div className="bet-types">
                  {(['win', 'podium', 'points', 'finishes', 'dnf'] as BetType[]).map(type => {
                    const odds = driverOdds.get(selectedDriver.id)?.[type] ?? 0;
                    const count = getBetCountByType(type);
                    const limit = getBetTypeLimit(type);
                    const atLimit = count >= limit;
                    const showCount = limit <= 10;  // Only show count for limited types
                    return (
                      <button
                        key={type}
                        className={`bet-type ${selectedBetType === type ? 'selected' : ''} ${atLimit ? 'at-limit' : ''}`}
                        onClick={() => !atLimit && setSelectedBetType(type)}
                        disabled={atLimit}
                      >
                        <span className="type-label">
                          {getBetTypeLabel(type)}
                          {showCount && <span className="type-count"> ({count}/{limit})</span>}
                        </span>
                        <span className="type-odds">{atLimit ? 'FULL' : `${odds.toFixed(1)}x`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bet-amount-selector">
                <h4>Amount</h4>
                <div className="amount-controls">
                  <button onClick={() => setBetAmount(Math.max(1, betAmount - 5))}>-5</button>
                  <button onClick={() => setBetAmount(Math.max(1, betAmount - 1))}>-1</button>
                  <span className="amount-display">{betAmount} ṁ</span>
                  <button onClick={() => setBetAmount(Math.min(remaining, betAmount + 1))}>+1</button>
                  <button onClick={() => setBetAmount(Math.min(remaining, betAmount + 5))}>+5</button>
                </div>
                <div className="quick-amounts">
                  <button onClick={() => setBetAmount(Math.min(remaining, 10))}>10</button>
                  <button onClick={() => setBetAmount(Math.min(remaining, 25))}>25</button>
                  <button onClick={() => setBetAmount(Math.min(remaining, 50))}>50</button>
                  <button onClick={() => setBetAmount(remaining)}>All</button>
                </div>
              </div>

              <div className="potential-payout">
                {(() => {
                  const totalOdds = driverOdds.get(selectedDriver.id)?.[selectedBetType] ?? 0;
                  const baseMultiplier = BASE_MULTIPLIERS[selectedBetType];
                  const driverMod = totalOdds / baseMultiplier;
                  const betTypeShort = selectedBetType === 'finishes' ? 'Finish' :
                                       selectedBetType === 'podium' ? 'Podium' :
                                       selectedBetType === 'points' ? 'Points' :
                                       selectedBetType === 'dnf' ? 'DNF' : 'Win';
                  return (
                    <>
                      <div className="payout-breakdown">
                        <div className="payout-part">
                          <span className="payout-bet">{betAmount}ṁ</span>
                          <span className="payout-label">Wager</span>
                        </div>
                        <span className="payout-times">×</span>
                        <div className="payout-part">
                          <span className="payout-base">{baseMultiplier}×</span>
                          <span className="payout-label">{betTypeShort}</span>
                        </div>
                        <span className="payout-times">×</span>
                        <div className="payout-part">
                          <span className="payout-driver">{driverMod.toFixed(2)}×</span>
                          <span className="payout-label">Driver</span>
                        </div>
                      </div>
                      <div className="payout-result">
                        <span className="payout-equals">=</span>
                        <span className="payout-value">{Math.floor(betAmount * totalOdds)} ṁ</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {(() => {
                const alreadyHasBet = currentBets.some(b => b.driverId === selectedDriver.id);
                const betTypeAtLimit = isBetTypeAtLimit(selectedBetType);
                const cannotPlace = remaining <= 0 || betAmount <= 0 || alreadyHasBet || betTypeAtLimit;
                const buttonText = alreadyHasBet ? 'Already Bet On' :
                                   betTypeAtLimit ? `${getBetTypeLabel(selectedBetType)} Full` :
                                   'Place Bet';
                return (
                  <button
                    className="place-bet-btn"
                    onClick={handlePlaceBet}
                    disabled={cannotPlace}
                  >
                    {buttonText}
                  </button>
                );
              })()}
            </>
          ) : (
            <div className="no-driver-selected">
              <p>Select a driver to place a bet.</p>
              <span className="hint">← Pick from the driver list</span>
              {remaining > 0 && (
                <button
                  className="mister-marbles-btn"
                  onClick={handleMisterMarblesDecides}
                >
                  🔮 Let Mister Marbles Decide
                </button>
              )}
            </div>
          )}
        </div>

        <div className="current-bets">
          <h3>
            Your Bets
            {currentBets.length > 0 && <span className="bet-count">{currentBets.length}</span>}
          </h3>
          {currentBets.length === 0 ? (
            <p className="no-bets">Place bets to build your ticket.</p>
          ) : (
            <div className="bets-list">
              {currentBets.map(bet => (
                <div key={bet.id} className="bet-item">
                  <div className="bet-item-header">
                    <span className="bet-driver">{bet.driverEmoji} {bet.driverName}</span>
                    <button className="remove-bet" onClick={() => onRemoveBet(bet.id)}>×</button>
                  </div>
                  <div className="bet-item-details">
                    <span className="bet-type-label">{getBetTypeLabel(bet.type)}</span>
                    <div className="bet-item-payout">
                      <span className="bet-amount">{bet.amount}ṁ</span>
                      <span className="bet-arrow">→</span>
                      <span className="bet-potential">{Math.floor(bet.amount * bet.odds)}ṁ</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bets-total">
                <span className="bets-total-label">Wagered</span>
                <span className="bets-total-value">{totalWagered} ṁ</span>
              </div>
              <div className="bets-potential-total">
                <span className="label">Max Payout</span>
                <span className="value">{currentBets.reduce((sum, b) => sum + Math.floor(b.amount * b.odds), 0)} ṁ</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="betting-footer">
        {currentBets.length === 0 && (
          <span className="betting-footer-hint">You can skip betting and just watch the race.</span>
        )}
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
                  <span className="win">+{bet.payout} ṁ</span>
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
  onNewSeason: () => void;
}

export function SeasonTally({
  finalBankroll,
  seasonHistory,
  onNewSeason,
}: SeasonTallyProps) {
  const totalWagered = seasonHistory.reduce((sum, r) => sum + r.totalWagered, 0);
  const totalWon = seasonHistory.reduce((sum, r) => sum + r.totalWon, 0);
  const totalBetsPlaced = seasonHistory.reduce((sum, r) => sum + r.bets.length, 0);
  const totalBetsWon = seasonHistory.reduce((sum, r) => sum + r.bets.filter(b => b.won).length, 0);

  const narratorMessage = useMemo(() => {
    const quotes = MISTER_MARBLES.seasonEnd(finalBankroll);
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, [finalBankroll]);

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

      <button className="new-season-btn" onClick={onNewSeason}>
        New Season
      </button>
    </div>
  );
}

export default BettingInterface;
