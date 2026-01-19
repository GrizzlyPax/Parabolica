// League and Season management
// This is the top-level generator that brings everything together

import { GeneratedDriver, generateRoster } from './drivers';
import { Track, generateSeason as generateTrackSeason } from './tracks';
import { Card, generateDeck, generateStarterDeck } from './cards';

export interface LeagueConfig {
  name: string;
  season: number;
  numDrivers: number;
  numTracks: number;
  deckSize: number;
}

export interface RaceResult {
  trackId: string;
  trackName: string;
  finishOrder: number[];        // Driver IDs in finish order
  driverPoints: Map<number, number>;
  leadChanges: number;
  totalTicks: number;
  chaosEvents: number;
  crashes: number;
  photoFinishes: number;        // Drivers finishing within 1 tick of each other
}

export interface SeasonStandings {
  driverId: number;
  driverName: string;
  emoji: string;
  totalPoints: number;
  wins: number;
  podiums: number;              // Top 3 finishes
  averagePosition: number;
  bestFinish: number;
  worstFinish: number;
  dnfs: number;                 // Did Not Finish
}

export interface SeasonStats {
  totalRaces: number;
  totalLaps: number;
  totalTicks: number;
  totalLeadChanges: number;
  totalChaosEvents: number;
  totalCrashes: number;
  closestRace: string;          // Track name
  mostChaoticRace: string;      // Track name
  biggestUpset: string;         // Description of biggest upset
  competitivenessScore: number; // 0-100
  chaosScore: number;           // 0-100
  excitementScore: number;      // 0-100
}

export interface League {
  id: string;
  config: LeagueConfig;
  drivers: GeneratedDriver[];
  tracks: Track[];
  deck: Card[];
  activeDeck: Card[];           // Cards in current use
  discardPile: Card[];
  raceResults: RaceResult[];
  standings: SeasonStandings[];
  stats: SeasonStats;
  currentRaceIndex: number;
  seasonComplete: boolean;
}

// Points system for race finishes
const POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

let leagueIdCounter = 0;

export function generateLeague(config: Partial<LeagueConfig> = {}): League {
  const fullConfig: LeagueConfig = {
    name: config.name || generateLeagueName(),
    season: config.season || 1,
    numDrivers: config.numDrivers || 10,
    numTracks: config.numTracks || 5,
    deckSize: config.deckSize || 10
  };

  const id = `league_${++leagueIdCounter}_${Date.now()}`;
  const drivers = generateRoster(); // Now generates 20 drivers (2 per kingdom)
  const tracks = generateTrackSeason(fullConfig.numTracks);
  const deck = generateDeck(fullConfig.deckSize);
  const starterDeck = generateStarterDeck();

  // Initialize standings
  const standings: SeasonStandings[] = drivers.map(driver => ({
    driverId: driver.id,
    driverName: driver.fullName,
    emoji: driver.emoji,
    totalPoints: 0,
    wins: 0,
    podiums: 0,
    averagePosition: 0,
    bestFinish: fullConfig.numDrivers,
    worstFinish: 1,
    dnfs: 0
  }));

  // Initialize stats
  const stats: SeasonStats = {
    totalRaces: 0,
    totalLaps: 0,
    totalTicks: 0,
    totalLeadChanges: 0,
    totalChaosEvents: 0,
    totalCrashes: 0,
    closestRace: "",
    mostChaoticRace: "",
    biggestUpset: "",
    competitivenessScore: 0,
    chaosScore: 0,
    excitementScore: 0
  };

  return {
    id,
    config: fullConfig,
    drivers,
    tracks,
    deck: [...deck, ...starterDeck],
    activeDeck: [],
    discardPile: [],
    raceResults: [],
    standings,
    stats,
    currentRaceIndex: 0,
    seasonComplete: false
  };
}

// Generate a fun league name
function generateLeagueName(): string {
  const adjectives = [
    "Extreme", "Ultimate", "Supreme", "Legendary", "Cosmic", "Chaotic",
    "Professional", "Semi-Professional", "Questionably Professional",
    "Underground", "Interdimensional", "Slightly Cursed", "Mostly Legal"
  ];

  const nouns = [
    "Racing League", "Speed Association", "Velocity Federation",
    "Grand Prix Series", "Championship Circuit", "Racing Collective",
    "Speed Syndicate", "Motorsport Mayhem", "Race Wars", "Thunder Series"
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `The ${adj} ${noun}`;
}

// Record a race result and update standings
export function recordRaceResult(league: League, result: RaceResult): void {
  league.raceResults.push(result);

  // Update standings
  result.finishOrder.forEach((driverId, position) => {
    const standing = league.standings.find(s => s.driverId === driverId);
    if (!standing) return;

    // Add points
    const points = POINTS_SYSTEM[position] || 0;
    standing.totalPoints += points;
    result.driverPoints.set(driverId, points);

    // Update stats
    if (position === 0) standing.wins++;
    if (position < 3) standing.podiums++;
    if (position < standing.bestFinish) standing.bestFinish = position + 1;
    if (position + 1 > standing.worstFinish) standing.worstFinish = position + 1;

    // Calculate average position
    const raceCount = league.raceResults.length;
    standing.averagePosition = (standing.averagePosition * (raceCount - 1) + position + 1) / raceCount;
  });

  // Sort standings by total points
  league.standings.sort((a, b) => b.totalPoints - a.totalPoints);

  // Update season stats
  league.stats.totalRaces++;
  league.stats.totalLeadChanges += result.leadChanges;
  league.stats.totalChaosEvents += result.chaosEvents;
  league.stats.totalCrashes += result.crashes;
  league.stats.totalTicks += result.totalTicks;

  // Update scores
  updateSeasonScores(league);

  // Check if season is complete
  if (league.currentRaceIndex >= league.tracks.length - 1) {
    league.seasonComplete = true;
    finalizeSeason(league);
  } else {
    league.currentRaceIndex++;
  }
}

// Update the computed scores
function updateSeasonScores(league: League): void {
  const { standings, raceResults } = league;

  // Competitiveness: How close are the standings?
  const pointsSpread = standings.length > 1
    ? standings[0].totalPoints - standings[standings.length - 1].totalPoints
    : 0;
  const maxPossibleSpread = raceResults.length * 25; // Max points per race
  league.stats.competitivenessScore = maxPossibleSpread > 0
    ? Math.round(100 - (pointsSpread / maxPossibleSpread) * 100)
    : 50;

  // Chaos: Based on lead changes and chaos events
  const avgLeadChanges = league.stats.totalLeadChanges / Math.max(1, raceResults.length);
  const avgChaosEvents = league.stats.totalChaosEvents / Math.max(1, raceResults.length);
  league.stats.chaosScore = Math.min(100, Math.round((avgLeadChanges * 2) + (avgChaosEvents * 5)));

  // Excitement: Combination of competitiveness and chaos
  league.stats.excitementScore = Math.round(
    (league.stats.competitivenessScore * 0.6) + (league.stats.chaosScore * 0.4)
  );
}

// Finalize season stats and determine superlatives
function finalizeSeason(league: League): void {
  // Find closest race
  let closestMargin = Infinity;
  for (const result of league.raceResults) {
    if (result.photoFinishes > closestMargin) {
      league.stats.closestRace = result.trackName;
      closestMargin = result.photoFinishes;
    }
  }

  // Find most chaotic race
  let maxChaos = 0;
  for (const result of league.raceResults) {
    if (result.chaosEvents > maxChaos) {
      league.stats.mostChaoticRace = result.trackName;
      maxChaos = result.chaosEvents;
    }
  }

  // Determine biggest upset (lowest pre-race position winning)
  // For now, just note if someone unexpected won
  const winner = league.standings[0];
  const driver = league.drivers.find(d => d.id === winner.driverId);
  if (driver) {
    league.stats.biggestUpset = `${driver.fullName} claims the championship!`;
  }
}

// Play a card from the deck
export function playCard(league: League, cardId: string): Card | null {
  const cardIndex = league.deck.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return null;

  const [card] = league.deck.splice(cardIndex, 1);
  league.activeDeck.push(card);
  return card;
}

// Discard a card after use
export function discardCard(league: League, cardId: string): void {
  const cardIndex = league.activeDeck.findIndex(c => c.id === cardId);
  if (cardIndex !== -1) {
    const [card] = league.activeDeck.splice(cardIndex, 1);
    league.discardPile.push(card);
  }
}

// Get current track
export function getCurrentTrack(league: League): Track | null {
  return league.tracks[league.currentRaceIndex] || null;
}

// Get next race preview
export function getNextRacePreview(league: League): {
  track: Track | null;
  standings: SeasonStandings[];
  raceNumber: number;
  totalRaces: number;
} {
  return {
    track: getCurrentTrack(league),
    standings: league.standings,
    raceNumber: league.currentRaceIndex + 1,
    totalRaces: league.tracks.length
  };
}

// Serialize league for storage
export function serializeLeague(league: League): string {
  return JSON.stringify({
    ...league,
    // Convert Maps to arrays for JSON serialization
    raceResults: league.raceResults.map(r => ({
      ...r,
      driverPoints: Array.from(r.driverPoints.entries())
    }))
  }, null, 2);
}

// Deserialize league from storage
export function deserializeLeague(json: string): League {
  const data = JSON.parse(json);
  return {
    ...data,
    raceResults: data.raceResults.map((r: any) => ({
      ...r,
      driverPoints: new Map(r.driverPoints)
    }))
  };
}
