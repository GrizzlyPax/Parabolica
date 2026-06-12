// Sim Lab Web Worker
// Runs headless race simulations and aggregates results

import RaceEngine, { Driver, RaceState, RaceEvent } from '../RaceEngine';
import { generateRoster, GeneratedDriver } from '../generators/drivers';
import { generateCarsForKingdoms, GeneratedCar } from '../generators/cars';
import { ALL_TRACKS, Track } from '../generators/tracks';
import { TEAMS } from '../data/teams';
import { Tag } from '../data/tags';
import { rollWeather, WeatherState } from '../data/weather';
import { intrinsicTrackTags, TrackTag } from '../data/trackTags';
import type {
  SimLabConfig,
  WorkerInMessage,
  WorkerOutMessage,
  SimLabResults,
  SimLabAccumulators,
  StatBucket,
  SimVariables,
} from './types';

// Helper to merge roster with car data (like LeagueSetup does)
function createRosterWithCars(roster: GeneratedDriver[], cars: Map<string, GeneratedCar>) {
  return roster.map(driver => {
    const car = cars.get(driver.kingdomId);
    return {
      ...driver,
      carStats: car?.stats,
      carName: car?.name,
      teamStats: car?.teamStats,
      driverTag: driver.tag,
      carTag: car?.carTag,
      teamTag: car?.teamTag,
    };
  });
}

let aborted = false;

// Handle messages from main thread
self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  if (e.data.type === 'ABORT') {
    aborted = true;
    return;
  }

  if (e.data.type === 'START') {
    aborted = false;
    runSimulation(e.data.config, e.data.variables, e.data.label);
  }
};

function postProgress(completed: number, total: number, currentTrack: string) {
  const msg: WorkerOutMessage = { type: 'PROGRESS', completed, total, currentTrack };
  self.postMessage(msg);
}

function postComplete(results: SimLabResults) {
  const msg: WorkerOutMessage = { type: 'COMPLETE', results };
  self.postMessage(msg);
}

function postError(message: string) {
  const msg: WorkerOutMessage = { type: 'ERROR', message };
  self.postMessage(msg);
}

// Initialize empty stat buckets
function createStatBuckets(): Map<number, StatBucket> {
  const buckets = new Map<number, StatBucket>();
  for (let i = 1; i <= 5; i++) {
    buckets.set(i, {
      bucket: i as 1 | 2 | 3 | 4 | 5,
      entries: 0,
      wins: 0,
      podiums: 0,
      pointsFinishes: 0,
      dnfs: 0,
      totalFinishPosition: 0,
    });
  }
  return buckets;
}

// Create empty accumulators
function createAccumulators(): SimLabAccumulators {
  const statNames = [
    'speed', 'consistency', 'luck', 'acceleration', 'endurance', 'aggression',
    'carPower', 'carGrip', 'carReliability', 'pitCrew', 'tireManagement'
  ];

  const statBuckets: Record<string, Map<number, StatBucket>> = {};
  for (const stat of statNames) {
    statBuckets[stat] = createStatBuckets();
  }

  return {
    totalRaces: 0,
    totalDriverRaces: 0,
    statBuckets,
    tagAccumulators: new Map(),
    dnfByReason: { crash: 0, mechanical: 0, tire_failure: 0 },
    dnfByPhase: { early: 0, mid: 0, late: 0 },
    safetyCars: { totalDeployments: 0, racesWithSafetyCar: 0, totalLapsUnderSC: 0, totalRaceLaps: 0 },
    pitStopCount: 0,
    slowStopCount: 0,
    quickStopCount: 0,
    compoundUsage: { soft: 0, medium: 0, hard: 0 },
    winnerPitStops: 0,
    winnerCount: 0,
    tireStints: {
      soft: { totalLaps: 0, stintCount: 0, blowouts: 0 },
      medium: { totalLaps: 0, stintCount: 0, blowouts: 0 },
      hard: { totalLaps: 0, stintCount: 0, blowouts: 0 },
    },
    startingTirePerformance: {
      soft: { starts: 0, wins: 0, podiums: 0, pointsFinishes: 0, dnfs: 0 },
      medium: { starts: 0, wins: 0, podiums: 0, pointsFinishes: 0, dnfs: 0 },
      hard: { starts: 0, wins: 0, podiums: 0, pointsFinishes: 0, dnfs: 0 },
    },
    trackAccumulators: new Map(),
    weatherAccumulators: new Map(),
    reactiveTagAccumulators: new Map(),
    tagWeatherAccumulators: new Map(),
    trackTagAccumulators: new Map(),
    eventAccumulators: new Map(),
    currentRaceEventEffects: new Map(),
    fieldSpread: {
      totalFinishers: 0,
      leaderMarginTotal: 0,
      leaderMarginRaces: 0,
      leadLapFinishers: 0,
      totalFinishersForLeadLap: 0,
      winnerStats: {
        speed: 0,
        consistency: 0,
        luck: 0,
        acceleration: 0,
        endurance: 0,
        aggression: 0,
        carPower: 0,
        carGrip: 0,
        carReliability: 0,
        pitCrew: 0,
        tireManagement: 0,
      },
      winnerCount: 0,
    },
  };
}

// Get quintile bucket (1-5) for a value in a range
function getQuintile(value: number, min: number, max: number): 1 | 2 | 3 | 4 | 5 {
  const normalized = (value - min) / (max - min);
  if (normalized < 0.2) return 1;
  if (normalized < 0.4) return 2;
  if (normalized < 0.6) return 3;
  if (normalized < 0.8) return 4;
  return 5;
}

// Aggregate results from a single race
function aggregateRaceResult(
  acc: SimLabAccumulators,
  drivers: Driver[],
  raceState: RaceState,
  events: RaceEvent[],
  track: Track,
  weather: WeatherState | null,
  trackTags: TrackTag[]
) {
  acc.totalRaces++;
  const driverCount = drivers.length;
  acc.totalDriverRaces += driverCount;
  const totalLaps = track.laps;

  // Process each driver's result
  const finishOrder = raceState.finishOrder;

  // Track per-track DNF breakdown for this race
  const trackDnfs = { crash: 0, mechanical: 0, tire_failure: 0 };
  let finishersThisRace = 0;

  for (let i = 0; i < drivers.length; i++) {
    const driver = drivers[i];
    const finishPosition = finishOrder.indexOf(driver.id) + 1 || driverCount; // DNF gets last
    const isWinner = finishPosition === 1;
    const isPodium = finishPosition <= 3;
    const isDNF = driver.status === 'dnf';

    if (!isDNF) finishersThisRace++;

    // === STAT BUCKET AGGREGATION ===

    // Driver stats (range 0.3-0.8 for some, 0.85-1.15 for others)
    const speedBucket = getQuintile(driver.stats.baseSpeed, 0.85, 1.15);
    const consistencyBucket = getQuintile(driver.stats.consistency, 0.3, 0.8);
    const luckBucket = getQuintile(driver.stats.luck, 0.3, 0.8);
    const accelBucket = getQuintile(driver.stats.acceleration, 0.85, 1.15);
    const enduranceBucket = getQuintile(driver.stats.endurance, 0.85, 1.15);
    const aggressionBucket = getQuintile(driver.stats.aggression, 0.3, 0.8);

    // Car stats (1-5 stars)
    const carPowerBucket = (driver.carStats?.power ?? 3) as 1 | 2 | 3 | 4 | 5;
    const carGripBucket = (driver.carStats?.grip ?? 3) as 1 | 2 | 3 | 4 | 5;
    const carReliabilityBucket = (driver.carStats?.reliability ?? 3) as 1 | 2 | 3 | 4 | 5;

    // Team stats (1-5 stars)
    const pitCrewBucket = (driver.teamStats?.pitCrew ?? 3) as 1 | 2 | 3 | 4 | 5;
    const tireMgmtBucket = (driver.teamStats?.tireManagement ?? 3) as 1 | 2 | 3 | 4 | 5;

    // Update all stat buckets
    const isPointsFinish = finishPosition <= 10 && !isDNF;
    const updateBucket = (statName: string, bucket: 1 | 2 | 3 | 4 | 5) => {
      const b = acc.statBuckets[statName].get(bucket)!;
      b.entries++;
      if (isWinner) b.wins++;
      if (isPodium) b.podiums++;
      if (isPointsFinish) b.pointsFinishes++;
      if (isDNF) b.dnfs++;
      b.totalFinishPosition += finishPosition;
    };

    updateBucket('speed', speedBucket);
    updateBucket('consistency', consistencyBucket);
    updateBucket('luck', luckBucket);
    updateBucket('acceleration', accelBucket);
    updateBucket('endurance', enduranceBucket);
    updateBucket('aggression', aggressionBucket);
    updateBucket('carPower', carPowerBucket);
    updateBucket('carGrip', carGripBucket);
    updateBucket('carReliability', carReliabilityBucket);
    updateBucket('pitCrew', pitCrewBucket);
    updateBucket('tireManagement', tireMgmtBucket);

    // === TAG AGGREGATION ===
    // Active conditions are the union of every environmental source — weather
    // AND track-stamped — matching the engine's recomputeConditions. (Reading
    // weather alone here mis-bucketed tags gated on track conditions.)
    const activeConditions = [
      ...(weather?.conditions ?? []),
      ...trackTags.flatMap(t => t.conditions ?? []),
    ];
    const weatherId = weather?.id ?? 'clear';
    const updateTag = (tag: Tag | undefined, tagType: 'driver' | 'car' | 'team') => {
      if (!tag) return;

      // Tag × weather matrix: per-tag win rate broken out by weather.
      let tw = acc.tagWeatherAccumulators.get(tag.id);
      if (!tw) {
        tw = { tagId: tag.id, tagName: tag.name, tagEmoji: tag.emoji, byWeather: new Map() };
        acc.tagWeatherAccumulators.set(tag.id, tw);
      }
      let cell = tw.byWeather.get(weatherId);
      if (!cell) { cell = { appearances: 0, wins: 0 }; tw.byWeather.set(weatherId, cell); }
      cell.appearances++;
      if (isWinner) cell.wins++;

      // Condition-reactive tags (e.g. Rain Dancer): split appearances/wins by
      // whether the tag's weather condition was active this race.
      if (tag.condition?.when === 'condition') {
        const conditionId = tag.condition.has;
        let rt = acc.reactiveTagAccumulators.get(tag.id);
        if (!rt) {
          rt = { tagId: tag.id, tagName: tag.name, tagEmoji: tag.emoji, conditionId,
            inAppearances: 0, inWins: 0, outAppearances: 0, outWins: 0 };
          acc.reactiveTagAccumulators.set(tag.id, rt);
        }
        if (activeConditions.includes(conditionId)) {
          rt.inAppearances++;
          if (isWinner) rt.inWins++;
        } else {
          rt.outAppearances++;
          if (isWinner) rt.outWins++;
        }
      }

      let tagAcc = acc.tagAccumulators.get(tag.id);
      if (!tagAcc) {
        tagAcc = {
          tagId: tag.id,
          tagName: tag.name,
          tagEmoji: tag.emoji,
          tagType,
          appearances: 0,
          wins: 0,
          podiums: 0,
          pointsFinishes: 0,
          dnfs: 0,
          totalFinishPosition: 0,
        };
        acc.tagAccumulators.set(tag.id, tagAcc);
      }

      tagAcc.appearances++;
      if (isWinner) tagAcc.wins++;
      if (isPodium) tagAcc.podiums++;
      if (isPointsFinish) tagAcc.pointsFinishes++;
      if (isDNF) tagAcc.dnfs++;
      tagAcc.totalFinishPosition += finishPosition;
    };

    updateTag(driver.driverTag, 'driver');
    updateTag(driver.carTag, 'car');
    updateTag(driver.teamTag, 'team');

    // === DNF AGGREGATION ===
    if (isDNF && driver.dnfInfo) {
      const reason = driver.dnfInfo.reason;
      acc.dnfByReason[reason]++;
      trackDnfs[reason]++;

      // Determine race phase (early/mid/late based on lap)
      const lapPercent = driver.dnfInfo.lap / totalLaps;
      if (lapPercent < 0.33) {
        acc.dnfByPhase.early++;
      } else if (lapPercent < 0.67) {
        acc.dnfByPhase.mid++;
      } else {
        acc.dnfByPhase.late++;
      }
    }

    // === STARTING TIRE PERFORMANCE ===
    // First compound in usedCompounds is the starting compound
    const startingCompound = driver.usedCompounds[0];
    if (startingCompound) {
      const startPerf = acc.startingTirePerformance[startingCompound];
      startPerf.starts++;
      if (isWinner) startPerf.wins++;
      if (isPodium) startPerf.podiums++;
      if (isPointsFinish) startPerf.pointsFinishes++;
      if (isDNF) startPerf.dnfs++;
    }

    // === TIRE STINT TRACKING ===
    // Track laps run on each compound
    // First stint: from start until first pit or race end
    const pitStops = driver.pitStops;
    let prevLap = 0;
    let currentCompound = driver.usedCompounds[0];

    for (let p = 0; p < pitStops.length; p++) {
      const pit = pitStops[p];
      const stintLaps = pit.lap - prevLap;
      if (currentCompound && stintLaps > 0) {
        acc.tireStints[currentCompound].totalLaps += stintLaps;
        acc.tireStints[currentCompound].stintCount++;
      }
      currentCompound = pit.tiresAfter;
      prevLap = pit.lap;
    }

    // Final stint: from last pit to race end (or DNF lap)
    const finalLap = isDNF && driver.dnfInfo ? driver.dnfInfo.lap : totalLaps;
    const finalStintLaps = finalLap - prevLap;
    if (currentCompound && finalStintLaps > 0) {
      acc.tireStints[currentCompound].totalLaps += finalStintLaps;
      acc.tireStints[currentCompound].stintCount++;
    }

    // Track blowouts
    if (isDNF && driver.dnfInfo?.reason === 'tire_failure' && currentCompound) {
      acc.tireStints[currentCompound].blowouts++;
    }

    // === PIT STOP AGGREGATION ===
    for (const pit of pitStops) {
      acc.pitStopCount++;
      if (pit.wasSlowStop) acc.slowStopCount++;
      acc.compoundUsage[pit.tiresAfter]++;
    }

    // Winner pit stops
    if (isWinner) {
      acc.winnerPitStops += pitStops.length;
      acc.winnerCount++;
    }
  }

  // === EVENT AGGREGATION ===
  let safetyCarsThisRace = 0;

  // Clear per-race event effects tracking
  acc.currentRaceEventEffects.clear();

  // Track which events fired this race (for racesTriggered count)
  const eventsFiredThisRace = new Set<string>();

  for (const event of events) {
    if (event.type === 'quick_pit_stop') {
      acc.quickStopCount++;
    }
    if (event.type === 'unsafety_car_deployed') {
      safetyCarsThisRace++;
      acc.safetyCars.totalDeployments++;
    }

    // Track track_event_effect - these are the actual effects on drivers
    if (event.type === 'track_event_effect' && track.event) {
      const eventId = `track_${track.event.id}`;

      // Get or create accumulator for this track event
      let eventAcc = acc.eventAccumulators.get(eventId);
      if (!eventAcc) {
        eventAcc = {
          eventId,
          eventName: track.event.name,
          eventEmoji: track.event.emoji,
          eventSource: 'track',
          description: track.event.description,
          flavorText: track.event.flavorText,
          totalTriggers: 0,
          racesTriggered: 0,
          affectedDriverRaces: 0,
          affectedWins: 0,
          affectedPodiums: 0,
          affectedPointsFinishes: 0,
          affectedDNFs: 0,
          affectedTotalPosition: 0,
          unaffectedDriverRaces: 0,
          unaffectedWins: 0,
          unaffectedPodiums: 0,
          unaffectedPointsFinishes: 0,
          unaffectedDNFs: 0,
          unaffectedTotalPosition: 0,
          positiveImpacts: 0,
          negativeImpacts: 0,
          neutralImpacts: 0,
        };
        acc.eventAccumulators.set(eventId, eventAcc);
      }

      eventAcc.totalTriggers++;
      eventsFiredThisRace.add(eventId);

      // Track impact type
      if (event.impact === 'positive') eventAcc.positiveImpacts++;
      else if (event.impact === 'negative') eventAcc.negativeImpacts++;
      else eventAcc.neutralImpacts++;

      // Track which driver was affected
      if (event.driverId !== -1) {
        const effects = acc.currentRaceEventEffects.get(event.driverId) || [];
        effects.push({ eventId, impact: event.impact });
        acc.currentRaceEventEffects.set(event.driverId, effects);
      }
    }

    // Track tag_activation events
    if (event.type === 'tag_activation') {
      // Extract tag info from event description (format: "emoji Tag Name activated")
      // We need to parse or infer the tag id - use a hash of the description for uniqueness
      const eventId = `tag_${event.description.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;

      let eventAcc = acc.eventAccumulators.get(eventId);
      if (!eventAcc) {
        // Try to extract emoji and name from description
        const emojiMatch = event.description.match(/^(\p{Emoji})/u);
        const nameMatch = event.description.match(/^(?:\p{Emoji}\s*)?(.+?)\s*(?:activated|triggered)/ui);
        eventAcc = {
          eventId,
          eventName: nameMatch ? nameMatch[1].trim() : event.description,
          eventEmoji: emojiMatch ? emojiMatch[1] : '🏷️',
          eventSource: 'tag',
          totalTriggers: 0,
          racesTriggered: 0,
          affectedDriverRaces: 0,
          affectedWins: 0,
          affectedPodiums: 0,
          affectedPointsFinishes: 0,
          affectedDNFs: 0,
          affectedTotalPosition: 0,
          unaffectedDriverRaces: 0,
          unaffectedWins: 0,
          unaffectedPodiums: 0,
          unaffectedPointsFinishes: 0,
          unaffectedDNFs: 0,
          unaffectedTotalPosition: 0,
          positiveImpacts: 0,
          negativeImpacts: 0,
          neutralImpacts: 0,
        };
        acc.eventAccumulators.set(eventId, eventAcc);
      }

      eventAcc.totalTriggers++;
      eventsFiredThisRace.add(eventId);

      // Track impact type
      if (event.impact === 'positive') eventAcc.positiveImpacts++;
      else if (event.impact === 'negative') eventAcc.negativeImpacts++;
      else eventAcc.neutralImpacts++;

      // Track affected driver
      if (event.driverId !== -1) {
        const effects = acc.currentRaceEventEffects.get(event.driverId) || [];
        effects.push({ eventId, impact: event.impact });
        acc.currentRaceEventEffects.set(event.driverId, effects);
      }
    }
  }

  // Update racesTriggered for each event that fired this race
  for (const eventId of eventsFiredThisRace) {
    const eventAcc = acc.eventAccumulators.get(eventId);
    if (eventAcc) eventAcc.racesTriggered++;
  }

  // Build set of affected driver IDs per event for this race
  const affectedDriversByEvent = new Map<string, Set<number>>();
  for (const eventId of eventsFiredThisRace) {
    affectedDriversByEvent.set(eventId, new Set());
  }

  // Now correlate affected drivers with their finish positions
  for (const [driverId, effects] of acc.currentRaceEventEffects) {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) continue;

    const finishPosition = finishOrder.indexOf(driverId) + 1 || driverCount;
    const isWinner = finishPosition === 1;
    const isPodium = finishPosition <= 3;
    const isPointsFinish = finishPosition <= 10 && driver.status !== 'dnf';
    const isDNF = driver.status === 'dnf';

    // Track unique events this driver was affected by (avoid double counting)
    const uniqueEventIds = new Set(effects.map(e => e.eventId));
    for (const eventId of uniqueEventIds) {
      const eventAcc = acc.eventAccumulators.get(eventId);
      if (!eventAcc) continue;

      // Mark this driver as affected by this event
      affectedDriversByEvent.get(eventId)?.add(driverId);

      eventAcc.affectedDriverRaces++;
      if (isWinner) eventAcc.affectedWins++;
      if (isPodium) eventAcc.affectedPodiums++;
      if (isPointsFinish) eventAcc.affectedPointsFinishes++;
      if (isDNF) eventAcc.affectedDNFs++;
      eventAcc.affectedTotalPosition += finishPosition;
    }
  }

  // Now track UNAFFECTED drivers for each event that fired this race
  for (const eventId of eventsFiredThisRace) {
    const eventAcc = acc.eventAccumulators.get(eventId);
    if (!eventAcc) continue;

    const affectedSet = affectedDriversByEvent.get(eventId) || new Set();

    // For each driver in this race who was NOT affected by this event
    for (const driver of drivers) {
      if (affectedSet.has(driver.id)) continue; // Skip affected drivers

      const finishPosition = finishOrder.indexOf(driver.id) + 1 || driverCount;
      const isWinner = finishPosition === 1;
      const isPodium = finishPosition <= 3;
      const isPointsFinish = finishPosition <= 10 && driver.status !== 'dnf';
      const isDNF = driver.status === 'dnf';

      eventAcc.unaffectedDriverRaces++;
      if (isWinner) eventAcc.unaffectedWins++;
      if (isPodium) eventAcc.unaffectedPodiums++;
      if (isPointsFinish) eventAcc.unaffectedPointsFinishes++;
      if (isDNF) eventAcc.unaffectedDNFs++;
      eventAcc.unaffectedTotalPosition += finishPosition;
    }
  }

  if (safetyCarsThisRace > 0) {
    acc.safetyCars.racesWithSafetyCar++;
  }

  // Track total laps and laps under SC
  // SC stays out for 1 lap per deployment (UNSAFETY_CAR_LAPS constant in RaceEngine)
  acc.safetyCars.totalRaceLaps += track.laps;
  acc.safetyCars.totalLapsUnderSC += safetyCarsThisRace; // 1 lap per deployment

  // === TRACK AGGREGATION ===
  let trackAcc = acc.trackAccumulators.get(track.id);
  if (!trackAcc) {
    trackAcc = {
      trackId: track.id,
      trackName: track.name,
      trackEmoji: track.funEmoji,
      racesRun: 0,
      totalDNFs: 0,
      dnfBreakdown: { crash: 0, mechanical: 0, tire_failure: 0 },
      totalFinishers: 0,
      totalLeadChanges: 0,
      totalTicks: 0,
      eventName: track.event?.name ?? 'No Event',
      eventEmoji: track.event?.emoji ?? '',
      eventDescription: track.event?.description ?? '',
      eventFlavorText: track.event?.flavorText ?? '',
    };
    acc.trackAccumulators.set(track.id, trackAcc);
  }

  trackAcc.racesRun++;
  trackAcc.totalDNFs += trackDnfs.crash + trackDnfs.mechanical + trackDnfs.tire_failure;
  trackAcc.dnfBreakdown.crash += trackDnfs.crash;
  trackAcc.dnfBreakdown.mechanical += trackDnfs.mechanical;
  trackAcc.dnfBreakdown.tire_failure += trackDnfs.tire_failure;
  trackAcc.totalFinishers += finishersThisRace;
  trackAcc.totalLeadChanges += raceState.leadChanges;
  trackAcc.totalTicks += raceState.totalTicks;

  // === WEATHER AGGREGATION ===
  const wId = weather?.id ?? 'clear';
  let weatherAcc = acc.weatherAccumulators.get(wId);
  if (!weatherAcc) {
    weatherAcc = {
      weatherId: wId,
      weatherName: weather?.name ?? 'Clear',
      weatherEmoji: weather?.emoji ?? '☀️',
      races: 0, driverRaces: 0, dnfs: 0, crashes: 0, totalTicks: 0,
    };
    acc.weatherAccumulators.set(wId, weatherAcc);
  }
  weatherAcc.races++;
  weatherAcc.driverRaces += driverCount;
  weatherAcc.dnfs += driverCount - finishersThisRace;
  weatherAcc.crashes += trackDnfs.crash;
  weatherAcc.totalTicks += raceState.totalTicks;

  // === TRACK TAG AGGREGATION (race-level: how each character bends races) ===
  for (const tt of trackTags) {
    let ttAcc = acc.trackTagAccumulators.get(tt.id);
    if (!ttAcc) {
      ttAcc = {
        tagId: tt.id, tagName: tt.name, tagEmoji: tt.emoji,
        races: 0, driverRaces: 0, dnfs: 0, crashes: 0, totalTicks: 0, totalLeadChanges: 0,
      };
      acc.trackTagAccumulators.set(tt.id, ttAcc);
    }
    ttAcc.races++;
    ttAcc.driverRaces += driverCount;
    ttAcc.dnfs += driverCount - finishersThisRace;
    ttAcc.crashes += trackDnfs.crash;
    ttAcc.totalTicks += raceState.totalTicks;
    ttAcc.totalLeadChanges += raceState.leadChanges;
  }

  // === FIELD SPREAD AGGREGATION ===
  // Get finishers sorted by position
  const finishers = drivers
    .filter(d => d.status === 'finished')
    .sort((a, b) => finishOrder.indexOf(a.id) - finishOrder.indexOf(b.id));

  acc.fieldSpread.totalFinishers += finishers.length;

  if (finishers.length >= 2) {
    // Leader margin: gap between P1 and P2 as % of lap
    const p1 = finishers[0];
    const p2 = finishers[1];
    // Position is in distance units, track.length is one lap
    const gapDistance = p1.position - p2.position;
    const gapAsPercentOfLap = (gapDistance / track.length) * 100;
    acc.fieldSpread.leaderMarginTotal += gapAsPercentOfLap;
    acc.fieldSpread.leaderMarginRaces++;
  }

  // Lead lap finishers (lapsBehind === 0)
  if (finishers.length > 0) {
    const leadLapCount = finishers.filter(d => d.lapsBehind === 0).length;
    acc.fieldSpread.leadLapFinishers += leadLapCount;
    acc.fieldSpread.totalFinishersForLeadLap += finishers.length;
  }

  // Winner stats
  if (finishers.length > 0) {
    const winner = finishers[0];
    acc.fieldSpread.winnerStats.speed += winner.stats.baseSpeed;
    acc.fieldSpread.winnerStats.consistency += winner.stats.consistency;
    acc.fieldSpread.winnerStats.luck += winner.stats.luck;
    acc.fieldSpread.winnerStats.acceleration += winner.stats.acceleration;
    acc.fieldSpread.winnerStats.endurance += winner.stats.endurance;
    acc.fieldSpread.winnerStats.aggression += winner.stats.aggression;
    acc.fieldSpread.winnerStats.carPower += winner.carStats?.power ?? 3;
    acc.fieldSpread.winnerStats.carGrip += winner.carStats?.grip ?? 3;
    acc.fieldSpread.winnerStats.carReliability += winner.carStats?.reliability ?? 3;
    acc.fieldSpread.winnerStats.pitCrew += winner.teamStats?.pitCrew ?? 3;
    acc.fieldSpread.winnerStats.tireManagement += winner.teamStats?.tireManagement ?? 3;
    acc.fieldSpread.winnerCount++;
  }
}

// Finalize results from accumulators
function finalizeResults(acc: SimLabAccumulators, config: SimLabConfig, executionTimeMs: number): SimLabResults {
  // Convert stat bucket maps to arrays
  const statBucketResults: SimLabResults['statBucketResults'] = {
    speed: Array.from(acc.statBuckets['speed'].values()),
    consistency: Array.from(acc.statBuckets['consistency'].values()),
    luck: Array.from(acc.statBuckets['luck'].values()),
    acceleration: Array.from(acc.statBuckets['acceleration'].values()),
    endurance: Array.from(acc.statBuckets['endurance'].values()),
    aggression: Array.from(acc.statBuckets['aggression'].values()),
    carPower: Array.from(acc.statBuckets['carPower'].values()),
    carGrip: Array.from(acc.statBuckets['carGrip'].values()),
    carReliability: Array.from(acc.statBuckets['carReliability'].values()),
    pitCrew: Array.from(acc.statBuckets['pitCrew'].values()),
    tireManagement: Array.from(acc.statBuckets['tireManagement'].values()),
  };

  // Convert tag accumulators to categorized arrays
  const tagArray = Array.from(acc.tagAccumulators.values());
  const tagResults: SimLabResults['tagResults'] = {
    driverTags: tagArray.filter(t => t.tagType === 'driver'),
    carTags: tagArray.filter(t => t.tagType === 'car'),
    teamTags: tagArray.filter(t => t.tagType === 'team'),
  };

  // DNF results
  const totalDNFs = acc.dnfByReason.crash + acc.dnfByReason.mechanical + acc.dnfByReason.tire_failure;
  const dnfResults: SimLabResults['dnfResults'] = {
    totalDNFs,
    totalDriverRaces: acc.totalDriverRaces,
    byReason: acc.dnfByReason,
    byRacePhase: acc.dnfByPhase,
    safetyCars: acc.safetyCars,
  };

  // Pit stop results
  const pitStopResults: SimLabResults['pitStopResults'] = {
    totalPitStops: acc.pitStopCount,
    totalRaces: acc.totalRaces,
    slowStops: acc.slowStopCount,
    quickStops: acc.quickStopCount,
    compoundUsage: acc.compoundUsage,
    winnerTotalPitStops: acc.winnerPitStops,
    winnerRaces: acc.winnerCount,
    tireStints: acc.tireStints,
    startingTirePerformance: acc.startingTirePerformance,
  };

  // Track results
  const trackResults: SimLabResults['trackResults'] = {
    tracks: Array.from(acc.trackAccumulators.values()),
  };

  // Weather results (distribution + condition-reactive tag splits + full matrix)
  const weatherResults: SimLabResults['weatherResults'] = {
    weathers: Array.from(acc.weatherAccumulators.values()).sort((a, b) => b.races - a.races),
    reactiveTags: Array.from(acc.reactiveTagAccumulators.values()),
    tagWeatherMatrix: Array.from(acc.tagWeatherAccumulators.values()).map(tw => ({
      tagId: tw.tagId, tagName: tw.tagName, tagEmoji: tw.tagEmoji,
      byWeather: Array.from(tw.byWeather.entries()).map(([weatherId, c]) => ({ weatherId, ...c })),
    })),
  };

  // Track tag results (race-level)
  const trackTagResults: SimLabResults['trackTagResults'] = {
    trackTags: Array.from(acc.trackTagAccumulators.values()).sort((a, b) => b.races - a.races),
  };

  // Event results
  const eventArray = Array.from(acc.eventAccumulators.values());
  const eventResults: SimLabResults['eventResults'] = {
    trackEvents: eventArray.filter(e => e.eventSource === 'track'),
    tagEvents: eventArray.filter(e => e.eventSource === 'tag'),
  };

  // Field spread results
  const fieldSpreadResults: SimLabResults['fieldSpreadResults'] = {
    totalRaces: acc.totalRaces,
    totalFinishers: acc.fieldSpread.totalFinishers,
    leaderMarginTotal: acc.fieldSpread.leaderMarginTotal,
    leaderMarginRaces: acc.fieldSpread.leaderMarginRaces,
    leadLapFinishers: acc.fieldSpread.leadLapFinishers,
    totalFinishersForLeadLap: acc.fieldSpread.totalFinishersForLeadLap,
    winnerStats: acc.fieldSpread.winnerStats,
    winnerCount: acc.fieldSpread.winnerCount,
  };

  return {
    config,
    totalRaces: acc.totalRaces,
    totalDriverRaces: acc.totalDriverRaces,
    executionTimeMs,
    statBucketResults,
    tagResults,
    dnfResults,
    pitStopResults,
    trackResults,
    weatherResults,
    trackTagResults,
    eventResults,
    fieldSpreadResults,
  };
}

// Main simulation loop
async function runSimulation(config: SimLabConfig, variables?: SimVariables, _label?: 'canon' | 'heretic') {
  const startTime = performance.now();

  try {
    const acc = createAccumulators();

    // Get tracks to use
    const tracks = config.trackSelection === 'all'
      ? ALL_TRACKS
      : ALL_TRACKS; // For 'random', we'll pick randomly each race

    // Create a reusable engine instance with optional variable overrides
    const engine = RaceEngine.createForWorker(variables);

    for (let i = 0; i < config.batchSize; i++) {
      if (aborted) {
        postError('Simulation aborted by user');
        return;
      }

      // Pick track for this race
      const track = config.trackSelection === 'all'
        ? tracks[i % tracks.length]
        : tracks[Math.floor(Math.random() * tracks.length)];

      // Generate fresh roster and cars for this race
      const roster = generateRoster();
      const teamIds = TEAMS.map(t => t.id);
      const cars = generateCarsForKingdoms(teamIds);
      const rosterWithCars = createRosterWithCars(roster, cars);

      // Load roster into engine
      engine.loadGeneratedRoster(rosterWithCars);

      // Configure engine - use track's lap count AND length
      engine.updateConfig({
        totalLaps: track.laps,
        lapLength: track.length,
        // The lab counts quick stops / SC deploys / tag & track events from
        // the event log. The 500-event live-UI cap silently evicts most of a
        // race (luck procs alone log ~1200 events/race), which skewed every
        // event-derived metric. Keep the whole log.
        maxStoredEvents: Number.MAX_SAFE_INTEGER,
      });

      // Set track info (TrackInfo interface expects separate eventTrigger/eventEffect)
      engine.setTrackInfo({
        id: track.id,
        name: track.name,
        emoji: track.emoji,
        funEmoji: track.funEmoji,
        description: track.description ?? '',
        laps: track.laps,
        event: track.event ? {
          id: track.event.id,
          name: track.event.name,
          emoji: track.event.emoji,
          description: track.event.description,
          flavorText: track.event.flavorText,
        } : undefined,
        eventTrigger: track.event?.trigger,
        eventEffect: track.event?.effect,
      });

      // Roll weather per race so the conditions layer (and weather-gated tags
      // like Rain Dancer) are exercised and measured, not dormant.
      const weather = rollWeather();
      engine.setWeather(weather);
      // Apply the track's intrinsic tags (C3) so they're exercised + measured.
      const trackTags = intrinsicTrackTags(track.id);
      engine.setTrackTags(trackTags);

      // Run the race headlessly
      const result = engine.runHeadless();

      // Aggregate results
      aggregateRaceResult(
        acc,
        result.drivers,
        result.raceState,
        result.events,
        track,
        weather,
        trackTags
      );

      // Report progress periodically
      const progressInterval = Math.max(1, Math.floor(config.batchSize / 100));
      if ((i + 1) % progressInterval === 0 || i === config.batchSize - 1) {
        postProgress(i + 1, config.batchSize, track.name);
        // Yield to allow abort messages to be processed
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Finalize and send results
    const executionTimeMs = performance.now() - startTime;
    const results = finalizeResults(acc, config, executionTimeMs);
    postComplete(results);

  } catch (error) {
    postError(error instanceof Error ? error.message : 'Unknown error during simulation');
  }
}
