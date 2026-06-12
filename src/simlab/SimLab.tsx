import { useState, useEffect, useRef } from 'react';
import SimLabResults from './SimLabResults';
import { SimLabVariables } from './SimLabVariables';
import type { SimLabConfig as Config, SimLabResults as Results, WorkerOutMessage, SimVariables, ComparisonResults, VariablesDiff } from './types';
import { CANON_VARIABLES, cloneVariables } from './types';
import './SimLab.css';

type SimLabPhase = 'setup' | 'running' | 'results';

// Helper to compute diff between canon and heretic variables
function computeVariablesDiff(canon: SimVariables, heretic: SimVariables): VariablesDiff[] {
  const diffs: VariablesDiff[] = [];

  const compare = (path: string, label: string, canonVal: number, hereticVal: number) => {
    if (Math.abs(canonVal - hereticVal) > 0.0000001) {
      const percentChange = canonVal !== 0 ? ((hereticVal - canonVal) / canonVal) * 100 : 0;
      diffs.push({ path, label, canonValue: canonVal, hereticValue: hereticVal, percentChange });
    }
  };

  // Tire compounds
  for (const compound of ['soft', 'medium', 'hard'] as const) {
    compare(`tires.${compound}.speedBonus`, `${compound} speed`, canon.tires[compound].speedBonus, heretic.tires[compound].speedBonus);
    compare(`tires.${compound}.wearRate`, `${compound} wear`, canon.tires[compound].wearRate, heretic.tires[compound].wearRate);
    compare(`tires.${compound}.criticalAt`, `${compound} cliff`, canon.tires[compound].criticalAt, heretic.tires[compound].criticalAt);
    compare(`tires.${compound}.cliffSeverity`, `${compound} severity`, canon.tires[compound].cliffSeverity, heretic.tires[compound].cliffSeverity);
    compare(`tires.${compound}.blowoutRisk`, `${compound} blowout`, canon.tires[compound].blowoutRisk, heretic.tires[compound].blowoutRisk);
  }

  // Tire general
  compare('tires.precliffStart', 'precliff start', canon.tires.precliffStart, heretic.tires.precliffStart);
  compare('tires.precliffMaxPenalty', 'precliff penalty', canon.tires.precliffMaxPenalty, heretic.tires.precliffMaxPenalty);
  compare('tires.cliffExponent', 'cliff exponent', canon.tires.cliffExponent, heretic.tires.cliffExponent);
  compare('tires.cliffMultiplier', 'cliff multiplier', canon.tires.cliffMultiplier, heretic.tires.cliffMultiplier);
  compare('tires.flatPenalty', 'flat penalty', canon.tires.flatPenalty, heretic.tires.flatPenalty);
  compare('tires.minSpeedFloor', 'min speed floor', canon.tires.minSpeedFloor, heretic.tires.minSpeedFloor);
  compare('tires.aggressionWearMultiplier', 'aggression wear', canon.tires.aggressionWearMultiplier, heretic.tires.aggressionWearMultiplier);

  // Crashes
  compare('crashes.baseCrashChance', 'crash chance', canon.crashes.baseCrashChance, heretic.crashes.baseCrashChance);
  compare('crashes.crashProximityThreshold', 'proximity', canon.crashes.crashProximityThreshold, heretic.crashes.crashProximityThreshold);
  compare('crashes.crashGracePeriod', 'grace period', canon.crashes.crashGracePeriod, heretic.crashes.crashGracePeriod);
  compare('crashes.initialSurvivalChance', 'survival', canon.crashes.initialSurvivalChance, heretic.crashes.initialSurvivalChance);
  compare('crashes.pileupParticipationChance', 'pileup chance', canon.crashes.pileupParticipationChance, heretic.crashes.pileupParticipationChance);
  compare('crashes.pileupSurvivalChance', 'pileup survival', canon.crashes.pileupSurvivalChance, heretic.crashes.pileupSurvivalChance);
  compare('crashes.secondaryAccidentMultiplier', 'secondary mult', canon.crashes.secondaryAccidentMultiplier, heretic.crashes.secondaryAccidentMultiplier);
  compare('crashes.consistencyFactor', 'consistency factor', canon.crashes.consistencyFactor, heretic.crashes.consistencyFactor);
  compare('crashes.tireWearFactor', 'tire wear factor', canon.crashes.tireWearFactor, heretic.crashes.tireWearFactor);
  compare('crashes.luckReduction', 'luck reduction', canon.crashes.luckReduction, heretic.crashes.luckReduction);
  compare('crashes.safetyCarsReduction', 'SC reduction', canon.crashes.safetyCarsReduction, heretic.crashes.safetyCarsReduction);

  // Mechanical
  compare('mechanical.baseFailureChance', 'mech failure', canon.mechanical.baseFailureChance, heretic.mechanical.baseFailureChance);
  compare('mechanical.reliabilityBase', 'reliability base', canon.mechanical.reliabilityBase, heretic.mechanical.reliabilityBase);
  compare('mechanical.reliabilityPerStar', 'reliability/star', canon.mechanical.reliabilityPerStar, heretic.mechanical.reliabilityPerStar);
  compare('mechanical.luckBase', 'mech luck base', canon.mechanical.luckBase, heretic.mechanical.luckBase);
  compare('mechanical.luckMultiplier', 'mech luck mult', canon.mechanical.luckMultiplier, heretic.mechanical.luckMultiplier);

  // Pits
  compare('pits.basePitDuration', 'pit duration', canon.pits.basePitDuration, heretic.pits.basePitDuration);
  compare('pits.slowStopMultiplier', 'slow stop mult', canon.pits.slowStopMultiplier, heretic.pits.slowStopMultiplier);
  compare('pits.quickStopMultiplier', 'quick stop mult', canon.pits.quickStopMultiplier, heretic.pits.quickStopMultiplier);
  compare('pits.slowStopBase', 'slow stop base', canon.pits.slowStopBase, heretic.pits.slowStopBase);
  compare('pits.slowStopPerStar', 'slow stop/star', canon.pits.slowStopPerStar, heretic.pits.slowStopPerStar);
  compare('pits.quickStopBase', 'quick stop base', canon.pits.quickStopBase, heretic.pits.quickStopBase);
  compare('pits.quickStopPerStar', 'quick stop/star', canon.pits.quickStopPerStar, heretic.pits.quickStopPerStar);
  compare('pits.basePitChance', 'pit chance', canon.pits.basePitChance, heretic.pits.basePitChance);
  compare('pits.wearPitBonus', 'wear pit bonus', canon.pits.wearPitBonus, heretic.pits.wearPitBonus);
  compare('pits.luckPitAdjustment', 'luck pit adjust', canon.pits.luckPitAdjustment, heretic.pits.luckPitAdjustment);

  // Performance
  compare('performance.luckProcChance', 'luck proc', canon.performance.luckProcChance, heretic.performance.luckProcChance);
  compare('performance.luckMinBoostBase', 'luck min base', canon.performance.luckMinBoostBase, heretic.performance.luckMinBoostBase);
  compare('performance.luckMinBoostPerStat', 'luck min/stat', canon.performance.luckMinBoostPerStat, heretic.performance.luckMinBoostPerStat);
  compare('performance.luckMaxBoostBase', 'luck max base', canon.performance.luckMaxBoostBase, heretic.performance.luckMaxBoostBase);
  compare('performance.luckMaxBoostPerStat', 'luck max/stat', canon.performance.luckMaxBoostPerStat, heretic.performance.luckMaxBoostPerStat);
  compare('performance.enduranceDecay', 'endurance decay', canon.performance.enduranceDecay, heretic.performance.enduranceDecay);
  compare('performance.enduranceMaxPenalty', 'endurance max penalty', canon.performance.enduranceMaxPenalty, heretic.performance.enduranceMaxPenalty);
  compare('performance.endurancePenaltyMultiplier', 'endurance mult', canon.performance.endurancePenaltyMultiplier, heretic.performance.endurancePenaltyMultiplier);
  compare('performance.damageSpeedPenalty', 'damage penalty', canon.performance.damageSpeedPenalty, heretic.performance.damageSpeedPenalty);

  // Car Stats
  compare('carStats.powerBase', 'power base', canon.carStats.powerBase, heretic.carStats.powerBase);
  compare('carStats.powerPerStar', 'power/star', canon.carStats.powerPerStar, heretic.carStats.powerPerStar);
  compare('carStats.gripBase', 'grip base', canon.carStats.gripBase, heretic.carStats.gripBase);
  compare('carStats.gripPerStar', 'grip/star', canon.carStats.gripPerStar, heretic.carStats.gripPerStar);
  compare('carStats.reliabilityBase', 'car rel base', canon.carStats.reliabilityBase, heretic.carStats.reliabilityBase);
  compare('carStats.reliabilityPerStar', 'car rel/star', canon.carStats.reliabilityPerStar, heretic.carStats.reliabilityPerStar);
  compare('carStats.tireManagementBase', 'tire mgmt base', canon.carStats.tireManagementBase, heretic.carStats.tireManagementBase);
  compare('carStats.tireManagementPerStar', 'tire mgmt/star', canon.carStats.tireManagementPerStar, heretic.carStats.tireManagementPerStar);
  compare('carStats.pitCrewBase', 'pit crew base', canon.carStats.pitCrewBase, heretic.carStats.pitCrewBase);
  compare('carStats.pitCrewPerStar', 'pit crew/star', canon.carStats.pitCrewPerStar, heretic.carStats.pitCrewPerStar);

  // Safety Car
  compare('safetyCar.targetGap', 'SC target gap', canon.safetyCar.targetGap, heretic.safetyCar.targetGap);
  compare('safetyCar.cruiseSpeed', 'SC cruise speed', canon.safetyCar.cruiseSpeed, heretic.safetyCar.cruiseSpeed);
  compare('safetyCar.catchUpSpeed', 'SC catch up', canon.safetyCar.catchUpSpeed, heretic.safetyCar.catchUpSpeed);
  compare('safetyCar.unsafetyCarSpeed', 'unsafety speed', canon.safetyCar.unsafetyCarSpeed, heretic.safetyCar.unsafetyCarSpeed);

  // Blowouts
  compare('blowouts.riskExponent', 'blowout exponent', canon.blowouts.riskExponent, heretic.blowouts.riskExponent);
  compare('blowouts.riskMultiplier', 'blowout risk mult', canon.blowouts.riskMultiplier, heretic.blowouts.riskMultiplier);
  compare('blowouts.aggressionBonus', 'aggression blowout', canon.blowouts.aggressionBonus, heretic.blowouts.aggressionBonus);
  compare('blowouts.safetyCarReduction', 'SC blowout reduce', canon.blowouts.safetyCarReduction, heretic.blowouts.safetyCarReduction);

  // Driver Speed (Field Compression)
  compare('driverSpeed.speedStatMultiplier', 'speed stat effect', canon.driverSpeed.speedStatMultiplier, heretic.driverSpeed.speedStatMultiplier);
  compare('driverSpeed.consistencyWeight', 'consistency weight', canon.driverSpeed.consistencyWeight, heretic.driverSpeed.consistencyWeight);
  compare('driverSpeed.baseSpeedMin', 'base speed min', canon.driverSpeed.baseSpeedMin, heretic.driverSpeed.baseSpeedMin);
  compare('driverSpeed.baseSpeedMax', 'base speed max', canon.driverSpeed.baseSpeedMax, heretic.driverSpeed.baseSpeedMax);

  // Betting - Strength Weights
  compare('betting.strengthWeights.carPower', 'bet: power weight', canon.betting.strengthWeights.carPower, heretic.betting.strengthWeights.carPower);
  compare('betting.strengthWeights.consistency', 'bet: consistency weight', canon.betting.strengthWeights.consistency, heretic.betting.strengthWeights.consistency);
  compare('betting.strengthWeights.speed', 'bet: speed weight', canon.betting.strengthWeights.speed, heretic.betting.strengthWeights.speed);
  compare('betting.strengthWeights.pitCrew', 'bet: pit crew weight', canon.betting.strengthWeights.pitCrew, heretic.betting.strengthWeights.pitCrew);
  compare('betting.strengthWeights.carGrip', 'bet: grip weight', canon.betting.strengthWeights.carGrip, heretic.betting.strengthWeights.carGrip);
  compare('betting.strengthWeights.luck', 'bet: luck weight', canon.betting.strengthWeights.luck, heretic.betting.strengthWeights.luck);
  compare('betting.strengthWeights.carReliability', 'bet: reliability weight', canon.betting.strengthWeights.carReliability, heretic.betting.strengthWeights.carReliability);

  // Betting - Base Multipliers
  compare('betting.baseMultipliers.win', 'bet: win payout', canon.betting.baseMultipliers.win, heretic.betting.baseMultipliers.win);
  compare('betting.baseMultipliers.podium', 'bet: podium payout', canon.betting.baseMultipliers.podium, heretic.betting.baseMultipliers.podium);
  compare('betting.baseMultipliers.points', 'bet: points payout', canon.betting.baseMultipliers.points, heretic.betting.baseMultipliers.points);
  compare('betting.baseMultipliers.finishes', 'bet: finishes payout', canon.betting.baseMultipliers.finishes, heretic.betting.baseMultipliers.finishes);
  compare('betting.baseMultipliers.dnf', 'bet: dnf payout', canon.betting.baseMultipliers.dnf, heretic.betting.baseMultipliers.dnf);

  // Betting - Driver Rating Weights
  compare('betting.driverRatingWeights.consistency', 'rating: consistency', canon.betting.driverRatingWeights.consistency, heretic.betting.driverRatingWeights.consistency);
  compare('betting.driverRatingWeights.speed', 'rating: speed', canon.betting.driverRatingWeights.speed, heretic.betting.driverRatingWeights.speed);
  compare('betting.driverRatingWeights.luck', 'rating: luck', canon.betting.driverRatingWeights.luck, heretic.betting.driverRatingWeights.luck);

  return diffs;
}

export default function SimLab() {
  const [phase, setPhase] = useState<SimLabPhase>('setup');

  // Config state (moved from SimLabConfig)
  const [batchSize, setBatchSize] = useState(100);
  const [trackSelection, setTrackSelection] = useState<'random' | 'all'>('all');

  // Heretic variables
  const [hereticVariables, setHereticVariables] = useState<SimVariables>(cloneVariables(CANON_VARIABLES));

  // Progress tracking for both workers
  const [canonProgress, setCanonProgress] = useState({ completed: 0, total: 0, currentTrack: '' });
  const [hereticProgress, setHereticProgress] = useState({ completed: 0, total: 0, currentTrack: '' });

  // Results
  const [comparisonResults, setComparisonResults] = useState<ComparisonResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyConfirmed, setCopyConfirmed] = useState(false);

  // Workers
  const canonWorkerRef = useRef<Worker | null>(null);
  const hereticWorkerRef = useRef<Worker | null>(null);
  const canonResultsRef = useRef<Results | null>(null);
  const hereticResultsRef = useRef<Results | null>(null);

  // Count how many workers have completed
  const [completedWorkers, setCompletedWorkers] = useState(0);

  // Track if we're running in comparison mode (both canon and heretic)
  const [isComparisonMode, setIsComparisonMode] = useState(false);

  useEffect(() => {
    // Create workers on mount
    canonWorkerRef.current = new Worker(
      new URL('./simLabWorker.ts', import.meta.url),
      { type: 'module' }
    );

    hereticWorkerRef.current = new Worker(
      new URL('./simLabWorker.ts', import.meta.url),
      { type: 'module' }
    );

    // Canon worker message handler
    canonWorkerRef.current.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      switch (e.data.type) {
        case 'PROGRESS':
          setCanonProgress({
            completed: e.data.completed,
            total: e.data.total,
            currentTrack: e.data.currentTrack,
          });
          break;
        case 'COMPLETE':
          canonResultsRef.current = e.data.results;
          setCompletedWorkers(prev => prev + 1);
          break;
        case 'ERROR':
          console.error('Canon worker error:', e.data.message);
          setError(`Canon: ${e.data.message}`);
          setPhase('setup');
          break;
      }
    };

    // Heretic worker message handler
    hereticWorkerRef.current.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      switch (e.data.type) {
        case 'PROGRESS':
          setHereticProgress({
            completed: e.data.completed,
            total: e.data.total,
            currentTrack: e.data.currentTrack,
          });
          break;
        case 'COMPLETE':
          hereticResultsRef.current = e.data.results;
          setCompletedWorkers(prev => prev + 1);
          break;
        case 'ERROR':
          console.error('Heretic worker error:', e.data.message);
          setError(`Heretic: ${e.data.message}`);
          setPhase('setup');
          break;
      }
    };

    canonWorkerRef.current.onerror = (e) => {
      console.error('Canon worker crashed:', e);
      setError('Canon worker crashed unexpectedly');
      setPhase('setup');
    };

    hereticWorkerRef.current.onerror = (e) => {
      console.error('Heretic worker crashed:', e);
      setError('Heretic worker crashed unexpectedly');
      setPhase('setup');
    };

    return () => {
      canonWorkerRef.current?.terminate();
      hereticWorkerRef.current?.terminate();
    };
  }, []);

  // When worker(s) complete, build results
  useEffect(() => {
    // Comparison mode: wait for both workers
    if (isComparisonMode && completedWorkers >= 2 && canonResultsRef.current && hereticResultsRef.current) {
      const comparison: ComparisonResults = {
        canon: canonResultsRef.current,
        heretic: hereticResultsRef.current,
        hereticVariables,
        variablesDiff: computeVariablesDiff(CANON_VARIABLES, hereticVariables),
      };
      setComparisonResults(comparison);
      setPhase('results');
      setCompletedWorkers(0);
    }
    // Canon-only mode: just need 1 worker
    else if (!isComparisonMode && completedWorkers >= 1 && canonResultsRef.current) {
      const comparison: ComparisonResults = {
        canon: canonResultsRef.current,
        heretic: canonResultsRef.current, // Same as canon when no changes
        hereticVariables: CANON_VARIABLES,
        variablesDiff: [],
      };
      setComparisonResults(comparison);
      setPhase('results');
      setCompletedWorkers(0);
    }
  }, [completedWorkers, hereticVariables, isComparisonMode]);

  const handleStartSimulation = () => {
    const config: Config = { batchSize, trackSelection };
    const runComparison = hasChanges;

    setError(null);
    setPhase('running');
    setCompletedWorkers(0);
    setIsComparisonMode(runComparison);
    canonResultsRef.current = null;
    hereticResultsRef.current = null;
    setCanonProgress({ completed: 0, total: config.batchSize, currentTrack: '' });
    setHereticProgress({ completed: 0, total: config.batchSize, currentTrack: '' });

    // Always start canon worker - pass CANON_VARIABLES so it uses balanced values
    canonWorkerRef.current?.postMessage({ type: 'START', config, variables: CANON_VARIABLES, label: 'canon' });

    // Only start heretic worker if there are changes to compare
    if (runComparison) {
      hereticWorkerRef.current?.postMessage({ type: 'START', config, variables: hereticVariables, label: 'heretic' });
    }
  };

  const handleAbort = () => {
    canonWorkerRef.current?.postMessage({ type: 'ABORT' });
    if (isComparisonMode) {
      hereticWorkerRef.current?.postMessage({ type: 'ABORT' });
    }
    setPhase('setup');
  };

  const handleReset = () => {
    setComparisonResults(null);
    setError(null);
    setPhase('setup');
  };

  const handleResetVariables = () => {
    setHereticVariables(cloneVariables(CANON_VARIABLES));
  };

  const handleExportJSON = () => {
    if (!comparisonResults) return;

    const json = JSON.stringify(comparisonResults, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simlab-comparison-${comparisonResults.canon.totalRaces}-races.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    if (!comparisonResults) return;

    const canon = comparisonResults.canon;
    const heretic = comparisonResults.heretic;
    const hasChanges = comparisonResults.variablesDiff.length > 0;

    const getBucketRate = (bucket: { entries: number; wins: number; podiums: number; pointsFinishes: number; dnfs: number }, metric: 'win' | 'podium' | 'points' | 'finish') => {
      if (bucket.entries === 0) return 0;
      switch (metric) {
        case 'win': return (bucket.wins / bucket.entries) * 100;
        case 'podium': return (bucket.podiums / bucket.entries) * 100;
        case 'points': return (bucket.pointsFinishes / bucket.entries) * 100;
        case 'finish': return ((bucket.entries - bucket.dnfs) / bucket.entries) * 100;
      }
    };

    const rows: string[] = [];
    const addRow = (...cols: (string | number)[]) => rows.push(cols.join('\t'));
    const addBlank = () => rows.push('');

    const statLabels: Record<string, string> = {
      speed: 'Speed', consistency: 'Consistency', luck: 'Luck',
      acceleration: 'Acceleration', endurance: 'Endurance', aggression: 'Aggression',
      carPower: 'Car Power', carGrip: 'Car Grip', carReliability: 'Car Reliability',
      pitCrew: 'Pit Crew', tireManagement: 'Tire Mgmt'
    };

    // Helper to output all detailed data for a results object
    const outputDetailedData = (data: typeof canon, prefix: string) => {
      // Track Performance
      addRow(`${prefix}TRACK PERFORMANCE`);
      addRow('Track', 'Races', 'DNFs', 'DNF%', 'Crashes', 'Mechanical', 'Tire Failures', 'Finishers', 'Lead Changes', 'Avg Ticks', 'Event');
      for (const track of data.trackResults.tracks) {
        const dnfRate = track.racesRun > 0 ? ((track.totalDNFs / (track.racesRun * 20)) * 100).toFixed(1) : '0.0';
        const avgTicks = track.racesRun > 0 ? Math.round(track.totalTicks / track.racesRun) : 0;
        addRow(
          `${track.trackEmoji} ${track.trackName}`,
          track.racesRun,
          track.totalDNFs,
          `${dnfRate}%`,
          track.dnfBreakdown.crash,
          track.dnfBreakdown.mechanical,
          track.dnfBreakdown.tire_failure,
          track.totalFinishers,
          track.totalLeadChanges,
          avgTicks,
          `${track.eventEmoji} ${track.eventName}`
        );
      }
      addBlank();

      // Weather Distribution — how often each weather rolled, and how it played
      addRow(`${prefix}WEATHER DISTRIBUTION`);
      addRow('Weather', 'Races', '% of Races', 'DNF%', 'Crashes/Race', 'Avg Ticks');
      for (const w of data.weatherResults.weathers) {
        const pct = data.totalRaces > 0 ? ((w.races / data.totalRaces) * 100).toFixed(1) : '0.0';
        const dnfRate = w.driverRaces > 0 ? ((w.dnfs / w.driverRaces) * 100).toFixed(1) : '0.0';
        const crashesPerRace = w.races > 0 ? (w.crashes / w.races).toFixed(2) : '0.00';
        const avgTicks = w.races > 0 ? Math.round(w.totalTicks / w.races) : 0;
        addRow(`${w.weatherEmoji} ${w.weatherName}`, w.races, `${pct}%`, `${dnfRate}%`, crashesPerRace, avgTicks);
      }
      addBlank();

      // Weather-reactive tags — win% when their condition is active vs not
      if (data.weatherResults.reactiveTags.length > 0) {
        addRow(`${prefix}WEATHER-REACTIVE TAGS (in-condition vs out)`);
        addRow('Tag', 'Condition', 'In Appear', 'In Win%', 'Out Appear', 'Out Win%', 'Swing');
        for (const rt of data.weatherResults.reactiveTags) {
          const inWin = rt.inAppearances > 0 ? (rt.inWins / rt.inAppearances) * 100 : 0;
          const outWin = rt.outAppearances > 0 ? (rt.outWins / rt.outAppearances) * 100 : 0;
          addRow(
            `${rt.tagEmoji} ${rt.tagName}`, rt.conditionId,
            rt.inAppearances, `${inWin.toFixed(1)}%`,
            rt.outAppearances, `${outWin.toFixed(1)}%`,
            `${(inWin - outWin >= 0 ? '+' : '')}${(inWin - outWin).toFixed(1)}%`,
          );
        }
        addBlank();
      }

      // Tag × weather matrix — every tag's win% by weather (columns in a fixed
      // order so cells line up). Sparse cells (rare weather) are small-sample.
      if (data.weatherResults.tagWeatherMatrix.length > 0) {
        const cols = data.weatherResults.weathers.map(w => w.weatherId); // sorted by frequency
        addRow(`${prefix}TAG × WEATHER WIN%`);
        addRow('Tag', ...cols);
        for (const tw of data.weatherResults.tagWeatherMatrix) {
          const byId = new Map(tw.byWeather.map(c => [c.weatherId, c]));
          const cells = cols.map(id => {
            const c = byId.get(id);
            return c && c.appearances > 0 ? `${((c.wins / c.appearances) * 100).toFixed(1)}%` : '—';
          });
          addRow(`${tw.tagEmoji} ${tw.tagName}`, ...cells);
        }
        addBlank();
      }

      // Tag Performance
      addRow(`${prefix}TAG PERFORMANCE - DRIVER TAGS`);
      addRow('Tag', 'Appearances', 'Wins', 'Win%', 'Podiums', 'Podium%', 'Points', 'DNFs', 'DNF%', 'Avg Position');
      for (const tag of data.tagResults.driverTags) {
        const winRate = tag.appearances > 0 ? ((tag.wins / tag.appearances) * 100).toFixed(1) : '0.0';
        const podiumRate = tag.appearances > 0 ? ((tag.podiums / tag.appearances) * 100).toFixed(1) : '0.0';
        const dnfRate = tag.appearances > 0 ? ((tag.dnfs / tag.appearances) * 100).toFixed(1) : '0.0';
        const avgPos = tag.appearances - tag.dnfs > 0 ? (tag.totalFinishPosition / (tag.appearances - tag.dnfs)).toFixed(1) : '-';
        addRow(
          `${tag.tagEmoji} ${tag.tagName}`,
          tag.appearances,
          tag.wins,
          `${winRate}%`,
          tag.podiums,
          `${podiumRate}%`,
          tag.pointsFinishes,
          tag.dnfs,
          `${dnfRate}%`,
          avgPos
        );
      }
      addBlank();

      addRow(`${prefix}TAG PERFORMANCE - CAR TAGS`);
      addRow('Tag', 'Appearances', 'Wins', 'Win%', 'Podiums', 'Podium%', 'Points', 'DNFs', 'DNF%', 'Avg Position');
      for (const tag of data.tagResults.carTags) {
        const winRate = tag.appearances > 0 ? ((tag.wins / tag.appearances) * 100).toFixed(1) : '0.0';
        const podiumRate = tag.appearances > 0 ? ((tag.podiums / tag.appearances) * 100).toFixed(1) : '0.0';
        const dnfRate = tag.appearances > 0 ? ((tag.dnfs / tag.appearances) * 100).toFixed(1) : '0.0';
        const avgPos = tag.appearances - tag.dnfs > 0 ? (tag.totalFinishPosition / (tag.appearances - tag.dnfs)).toFixed(1) : '-';
        addRow(
          `${tag.tagEmoji} ${tag.tagName}`,
          tag.appearances,
          tag.wins,
          `${winRate}%`,
          tag.podiums,
          `${podiumRate}%`,
          tag.pointsFinishes,
          tag.dnfs,
          `${dnfRate}%`,
          avgPos
        );
      }
      addBlank();

      addRow(`${prefix}TAG PERFORMANCE - TEAM TAGS`);
      addRow('Tag', 'Appearances', 'Wins', 'Win%', 'Podiums', 'Podium%', 'Points', 'DNFs', 'DNF%', 'Avg Position');
      for (const tag of data.tagResults.teamTags) {
        const winRate = tag.appearances > 0 ? ((tag.wins / tag.appearances) * 100).toFixed(1) : '0.0';
        const podiumRate = tag.appearances > 0 ? ((tag.podiums / tag.appearances) * 100).toFixed(1) : '0.0';
        const dnfRate = tag.appearances > 0 ? ((tag.dnfs / tag.appearances) * 100).toFixed(1) : '0.0';
        const avgPos = tag.appearances - tag.dnfs > 0 ? (tag.totalFinishPosition / (tag.appearances - tag.dnfs)).toFixed(1) : '-';
        addRow(
          `${tag.tagEmoji} ${tag.tagName}`,
          tag.appearances,
          tag.wins,
          `${winRate}%`,
          tag.podiums,
          `${podiumRate}%`,
          tag.pointsFinishes,
          tag.dnfs,
          `${dnfRate}%`,
          avgPos
        );
      }
      addBlank();

      // Tire Compound Usage
      addRow(`${prefix}TIRE COMPOUND USAGE`);
      addRow('Compound', 'Pit Stops', '% of Total');
      const totalCompoundUsage = data.pitStopResults.compoundUsage.soft + data.pitStopResults.compoundUsage.medium + data.pitStopResults.compoundUsage.hard;
      addRow('Soft', data.pitStopResults.compoundUsage.soft, totalCompoundUsage > 0 ? `${((data.pitStopResults.compoundUsage.soft / totalCompoundUsage) * 100).toFixed(1)}%` : '0%');
      addRow('Medium', data.pitStopResults.compoundUsage.medium, totalCompoundUsage > 0 ? `${((data.pitStopResults.compoundUsage.medium / totalCompoundUsage) * 100).toFixed(1)}%` : '0%');
      addRow('Hard', data.pitStopResults.compoundUsage.hard, totalCompoundUsage > 0 ? `${((data.pitStopResults.compoundUsage.hard / totalCompoundUsage) * 100).toFixed(1)}%` : '0%');
      addBlank();

      // Tire Stint Analysis
      addRow(`${prefix}TIRE STINT ANALYSIS`);
      addRow('Compound', 'Total Laps', 'Stint Count', 'Avg Stint Length', 'Blowouts', 'Blowout Rate');
      for (const compound of ['soft', 'medium', 'hard'] as const) {
        const stint = data.pitStopResults.tireStints[compound];
        const avgStint = stint.stintCount > 0 ? (stint.totalLaps / stint.stintCount).toFixed(1) : '0';
        const blowoutRate = stint.stintCount > 0 ? ((stint.blowouts / stint.stintCount) * 100).toFixed(2) : '0';
        addRow(compound.charAt(0).toUpperCase() + compound.slice(1), stint.totalLaps, stint.stintCount, avgStint, stint.blowouts, `${blowoutRate}%`);
      }
      addBlank();

      // Starting Tire Performance
      addRow(`${prefix}STARTING TIRE PERFORMANCE`);
      addRow('Compound', 'Starts', 'Wins', 'Win%', 'Podiums', 'Podium%', 'Points', 'DNFs', 'DNF%');
      for (const compound of ['soft', 'medium', 'hard'] as const) {
        const perf = data.pitStopResults.startingTirePerformance[compound];
        const winRate = perf.starts > 0 ? ((perf.wins / perf.starts) * 100).toFixed(1) : '0.0';
        const podiumRate = perf.starts > 0 ? ((perf.podiums / perf.starts) * 100).toFixed(1) : '0.0';
        const dnfRate = perf.starts > 0 ? ((perf.dnfs / perf.starts) * 100).toFixed(1) : '0.0';
        addRow(
          compound.charAt(0).toUpperCase() + compound.slice(1),
          perf.starts,
          perf.wins,
          `${winRate}%`,
          perf.podiums,
          `${podiumRate}%`,
          perf.pointsFinishes,
          perf.dnfs,
          `${dnfRate}%`
        );
      }
      addBlank();

      // DNF by Race Phase
      addRow(`${prefix}DNF BY RACE PHASE`);
      addRow('Phase', 'DNFs', '% of Total');
      const totalPhaseDnfs = data.dnfResults.byRacePhase.early + data.dnfResults.byRacePhase.mid + data.dnfResults.byRacePhase.late;
      addRow('Early (0-33%)', data.dnfResults.byRacePhase.early, totalPhaseDnfs > 0 ? `${((data.dnfResults.byRacePhase.early / totalPhaseDnfs) * 100).toFixed(1)}%` : '0%');
      addRow('Mid (34-66%)', data.dnfResults.byRacePhase.mid, totalPhaseDnfs > 0 ? `${((data.dnfResults.byRacePhase.mid / totalPhaseDnfs) * 100).toFixed(1)}%` : '0%');
      addRow('Late (67-100%)', data.dnfResults.byRacePhase.late, totalPhaseDnfs > 0 ? `${((data.dnfResults.byRacePhase.late / totalPhaseDnfs) * 100).toFixed(1)}%` : '0%');
      addBlank();

      // Winner Pit Stop Analysis
      addRow(`${prefix}WINNER ANALYSIS`);
      addRow('Metric', 'Value');
      addRow('Winner Races', data.pitStopResults.winnerRaces);
      addRow('Winner Total Pits', data.pitStopResults.winnerTotalPitStops);
      addRow('Winner Avg Pits', data.pitStopResults.winnerRaces > 0 ? (data.pitStopResults.winnerTotalPitStops / data.pitStopResults.winnerRaces).toFixed(2) : '0');
      addBlank();

      // Track Events
      addRow(`${prefix}TRACK EVENTS`);
      addRow('Event', 'Track', 'Triggers', 'Races', 'Affected Drivers', 'Affected Win%', 'Affected Podium%', 'Affected DNF%', 'Unaffected Win%', 'Unaffected DNF%', '+', '-', '~', 'Description');
      for (const event of data.eventResults.trackEvents) {
        const affectedWinRate = event.affectedDriverRaces > 0 ? (event.affectedWins / event.affectedDriverRaces * 100).toFixed(1) : '0.0';
        const affectedPodiumRate = event.affectedDriverRaces > 0 ? (event.affectedPodiums / event.affectedDriverRaces * 100).toFixed(1) : '0.0';
        const affectedDNFRate = event.affectedDriverRaces > 0 ? (event.affectedDNFs / event.affectedDriverRaces * 100).toFixed(1) : '0.0';
        const unaffectedWinRate = event.unaffectedDriverRaces > 0 ? (event.unaffectedWins / event.unaffectedDriverRaces * 100).toFixed(1) : '0.0';
        const unaffectedDNFRate = event.unaffectedDriverRaces > 0 ? (event.unaffectedDNFs / event.unaffectedDriverRaces * 100).toFixed(1) : '0.0';
        addRow(
          `${event.eventEmoji} ${event.eventName}`,
          event.eventId,
          event.totalTriggers,
          event.racesTriggered,
          event.affectedDriverRaces,
          `${affectedWinRate}%`,
          `${affectedPodiumRate}%`,
          `${affectedDNFRate}%`,
          `${unaffectedWinRate}%`,
          `${unaffectedDNFRate}%`,
          event.positiveImpacts,
          event.negativeImpacts,
          event.neutralImpacts,
          event.description || ''
        );
      }
      addBlank();

      // Tag Events
      addRow(`${prefix}TAG EVENTS`);
      addRow('Tag', 'Type', 'Triggers', 'Races', 'Affected Drivers', 'Affected Win%', 'Affected Podium%', 'Affected DNF%', 'Unaffected Win%', 'Unaffected DNF%', '+', '-', '~', 'Description');
      for (const event of data.eventResults.tagEvents) {
        const affectedWinRate = event.affectedDriverRaces > 0 ? (event.affectedWins / event.affectedDriverRaces * 100).toFixed(1) : '0.0';
        const affectedPodiumRate = event.affectedDriverRaces > 0 ? (event.affectedPodiums / event.affectedDriverRaces * 100).toFixed(1) : '0.0';
        const affectedDNFRate = event.affectedDriverRaces > 0 ? (event.affectedDNFs / event.affectedDriverRaces * 100).toFixed(1) : '0.0';
        const unaffectedWinRate = event.unaffectedDriverRaces > 0 ? (event.unaffectedWins / event.unaffectedDriverRaces * 100).toFixed(1) : '0.0';
        const unaffectedDNFRate = event.unaffectedDriverRaces > 0 ? (event.unaffectedDNFs / event.unaffectedDriverRaces * 100).toFixed(1) : '0.0';
        addRow(
          `${event.eventEmoji} ${event.eventName}`,
          event.tagType || 'unknown',
          event.totalTriggers,
          event.racesTriggered,
          event.affectedDriverRaces,
          `${affectedWinRate}%`,
          `${affectedPodiumRate}%`,
          `${affectedDNFRate}%`,
          `${unaffectedWinRate}%`,
          `${unaffectedDNFRate}%`,
          event.positiveImpacts,
          event.negativeImpacts,
          event.neutralImpacts,
          event.description || ''
        );
      }
      addBlank();

      // Full Stat Bucket Breakdown
      addRow(`${prefix}STAT BUCKETS DETAIL`);
      addRow('Stat', 'Bucket', 'Entries', 'Wins', 'Win%', 'Podiums', 'Podium%', 'Points', 'DNFs', 'DNF%', 'Avg Position');
      for (const [statName, buckets] of Object.entries(data.statBucketResults)) {
        for (const bucket of buckets) {
          const winRate = bucket.entries > 0 ? ((bucket.wins / bucket.entries) * 100).toFixed(1) : '0.0';
          const podiumRate = bucket.entries > 0 ? ((bucket.podiums / bucket.entries) * 100).toFixed(1) : '0.0';
          const dnfRate = bucket.entries > 0 ? ((bucket.dnfs / bucket.entries) * 100).toFixed(1) : '0.0';
          const avgPos = bucket.entries - bucket.dnfs > 0 ? (bucket.totalFinishPosition / (bucket.entries - bucket.dnfs)).toFixed(1) : '-';
          addRow(
            statLabels[statName] || statName,
            `Q${bucket.bucket}`,
            bucket.entries,
            bucket.wins,
            `${winRate}%`,
            bucket.podiums,
            `${podiumRate}%`,
            bucket.pointsFinishes,
            bucket.dnfs,
            `${dnfRate}%`,
            avgPos
          );
        }
      }
      addBlank();
    };

    if (hasChanges) {
      // === COMPARISON FORMAT (Canon vs Heretic) ===
      addRow('VARIABLES CHANGED');
      addRow('Variable', 'Canon', 'Heretic', '% Change');
      for (const diff of comparisonResults.variablesDiff) {
        addRow(diff.label, diff.canonValue, diff.hereticValue, `${diff.percentChange > 0 ? '+' : ''}${diff.percentChange.toFixed(1)}%`);
      }
      addBlank();

      // DNF Stats Comparison
      addRow('DNF STATS COMPARISON');
      addRow('Metric', 'Canon', 'Heretic', 'Δ');

      const canonDNFRate = (canon.dnfResults.totalDNFs / canon.dnfResults.totalDriverRaces) * 100;
      const hereticDNFRate = (heretic.dnfResults.totalDNFs / heretic.dnfResults.totalDriverRaces) * 100;
      addRow('DNF Rate', `${canonDNFRate.toFixed(1)}%`, `${hereticDNFRate.toFixed(1)}%`, `${(hereticDNFRate - canonDNFRate).toFixed(1)}%`);

      addRow('Total DNFs', canon.dnfResults.totalDNFs, heretic.dnfResults.totalDNFs, heretic.dnfResults.totalDNFs - canon.dnfResults.totalDNFs);
      addRow('DNFs per Race', (canon.dnfResults.totalDNFs / canon.totalRaces).toFixed(1), (heretic.dnfResults.totalDNFs / heretic.totalRaces).toFixed(1));
      addRow('Crash DNFs', canon.dnfResults.byReason.crash, heretic.dnfResults.byReason.crash, heretic.dnfResults.byReason.crash - canon.dnfResults.byReason.crash);
      addRow('Mechanical DNFs', canon.dnfResults.byReason.mechanical, heretic.dnfResults.byReason.mechanical, heretic.dnfResults.byReason.mechanical - canon.dnfResults.byReason.mechanical);
      addRow('Tire Failure DNFs', canon.dnfResults.byReason.tire_failure, heretic.dnfResults.byReason.tire_failure, heretic.dnfResults.byReason.tire_failure - canon.dnfResults.byReason.tire_failure);

      const canonSCLapRate = canon.dnfResults.safetyCars.totalRaceLaps > 0
        ? (canon.dnfResults.safetyCars.totalLapsUnderSC / canon.dnfResults.safetyCars.totalRaceLaps) * 100 : 0;
      const hereticSCLapRate = heretic.dnfResults.safetyCars.totalRaceLaps > 0
        ? (heretic.dnfResults.safetyCars.totalLapsUnderSC / heretic.dnfResults.safetyCars.totalRaceLaps) * 100 : 0;
      addRow('Safety Cars', canon.dnfResults.safetyCars.totalDeployments, heretic.dnfResults.safetyCars.totalDeployments, heretic.dnfResults.safetyCars.totalDeployments - canon.dnfResults.safetyCars.totalDeployments);
      addRow('SC Lap %', `${canonSCLapRate.toFixed(1)}%`, `${hereticSCLapRate.toFixed(1)}%`, `${(hereticSCLapRate - canonSCLapRate).toFixed(1)}%`);
      addBlank();

      // Pit Stop Stats Comparison
      addRow('PIT STOP STATS COMPARISON');
      addRow('Metric', 'Canon', 'Heretic', 'Δ');
      addRow('Total Pit Stops', canon.pitStopResults.totalPitStops, heretic.pitStopResults.totalPitStops, heretic.pitStopResults.totalPitStops - canon.pitStopResults.totalPitStops);

      const canonAvgPits = canon.pitStopResults.totalPitStops / canon.pitStopResults.totalRaces / 20;
      const hereticAvgPits = heretic.pitStopResults.totalPitStops / heretic.pitStopResults.totalRaces / 20;
      addRow('Avg per Driver', canonAvgPits.toFixed(2), hereticAvgPits.toFixed(2), (hereticAvgPits - canonAvgPits).toFixed(2));
      addRow('Quick Stops', canon.pitStopResults.quickStops, heretic.pitStopResults.quickStops, heretic.pitStopResults.quickStops - canon.pitStopResults.quickStops);
      addRow('Slow Stops', canon.pitStopResults.slowStops, heretic.pitStopResults.slowStops, heretic.pitStopResults.slowStops - canon.pitStopResults.slowStops);
      addBlank();

      // Field Spread Comparison
      addRow('FIELD SPREAD COMPARISON');
      addRow('Metric', 'Canon', 'Heretic', 'Δ');

      const canonLeaderMargin = canon.fieldSpreadResults.leaderMarginRaces > 0
        ? canon.fieldSpreadResults.leaderMarginTotal / canon.fieldSpreadResults.leaderMarginRaces : 0;
      const hereticLeaderMargin = heretic.fieldSpreadResults.leaderMarginRaces > 0
        ? heretic.fieldSpreadResults.leaderMarginTotal / heretic.fieldSpreadResults.leaderMarginRaces : 0;
      addRow('Leader Margin (% lap)', `${canonLeaderMargin.toFixed(1)}%`, `${hereticLeaderMargin.toFixed(1)}%`, `${(hereticLeaderMargin - canonLeaderMargin).toFixed(1)}%`);

      const canonLeadLapPct = canon.fieldSpreadResults.totalFinishersForLeadLap > 0
        ? (canon.fieldSpreadResults.leadLapFinishers / canon.fieldSpreadResults.totalFinishersForLeadLap) * 100 : 0;
      const hereticLeadLapPct = heretic.fieldSpreadResults.totalFinishersForLeadLap > 0
        ? (heretic.fieldSpreadResults.leadLapFinishers / heretic.fieldSpreadResults.totalFinishersForLeadLap) * 100 : 0;
      addRow('Lead Lap Finishers %', `${canonLeadLapPct.toFixed(1)}%`, `${hereticLeadLapPct.toFixed(1)}%`, `${(hereticLeadLapPct - canonLeadLapPct).toFixed(1)}%`);

      const canonAvgFinishers = canon.fieldSpreadResults.totalFinishers / canon.totalRaces;
      const hereticAvgFinishers = heretic.fieldSpreadResults.totalFinishers / heretic.totalRaces;
      addRow('Avg Finishers/Race', canonAvgFinishers.toFixed(1), hereticAvgFinishers.toFixed(1), (hereticAvgFinishers - canonAvgFinishers).toFixed(1));
      addBlank();

      // Winner Stats Profile
      addRow('WINNER STATS PROFILE (Avg)');
      addRow('Stat', 'Canon Avg', 'Heretic Avg', 'Δ');
      const cWin = canon.fieldSpreadResults;
      const hWin = heretic.fieldSpreadResults;
      if (cWin.winnerCount > 0 && hWin.winnerCount > 0) {
        addRow('Speed', (cWin.winnerStats.speed / cWin.winnerCount).toFixed(3), (hWin.winnerStats.speed / hWin.winnerCount).toFixed(3));
        addRow('Consistency', (cWin.winnerStats.consistency / cWin.winnerCount).toFixed(3), (hWin.winnerStats.consistency / hWin.winnerCount).toFixed(3));
        addRow('Car Power', (cWin.winnerStats.carPower / cWin.winnerCount).toFixed(2), (hWin.winnerStats.carPower / hWin.winnerCount).toFixed(2));
        addRow('Car Grip', (cWin.winnerStats.carGrip / cWin.winnerCount).toFixed(2), (hWin.winnerStats.carGrip / hWin.winnerCount).toFixed(2));
        addRow('Aggression', (cWin.winnerStats.aggression / cWin.winnerCount).toFixed(3), (hWin.winnerStats.aggression / hWin.winnerCount).toFixed(3));
      }
      addBlank();

      // Stat Impact Comparison
      addRow('STAT IMPACT COMPARISON (Q1→Q5 Win% Delta)');
      addRow('Stat', 'Canon Δ', 'Heretic Δ', 'Difference');
      for (const [statName, canonBuckets] of Object.entries(canon.statBucketResults)) {
        const hereticBuckets = heretic.statBucketResults[statName as keyof typeof heretic.statBucketResults];
        const canonQ1 = getBucketRate(canonBuckets[0], 'win');
        const canonQ5 = getBucketRate(canonBuckets[4], 'win');
        const canonDelta = canonQ5 - canonQ1;
        const hereticQ1 = getBucketRate(hereticBuckets[0], 'win');
        const hereticQ5 = getBucketRate(hereticBuckets[4], 'win');
        const hereticDelta = hereticQ5 - hereticQ1;
        addRow(statLabels[statName] || statName, `${canonDelta.toFixed(1)}%`, `${hereticDelta.toFixed(1)}%`, `${(hereticDelta - canonDelta).toFixed(1)}%`);
      }
      addBlank();

      // Detailed stat breakdown for both
      addRow('CANON STAT DETAIL (Q1 vs Q5)');
      addRow('Stat', 'Q1 Win%', 'Q5 Win%', 'Δ');
      for (const [statName, buckets] of Object.entries(canon.statBucketResults)) {
        const q1Win = getBucketRate(buckets[0], 'win');
        const q5Win = getBucketRate(buckets[4], 'win');
        addRow(statLabels[statName] || statName, `${q1Win.toFixed(1)}%`, `${q5Win.toFixed(1)}%`, `${(q5Win - q1Win).toFixed(1)}%`);
      }
      addBlank();

      addRow('HERETIC STAT DETAIL (Q1 vs Q5)');
      addRow('Stat', 'Q1 Win%', 'Q5 Win%', 'Δ');
      for (const [statName, buckets] of Object.entries(heretic.statBucketResults)) {
        const q1Win = getBucketRate(buckets[0], 'win');
        const q5Win = getBucketRate(buckets[4], 'win');
        addRow(statLabels[statName] || statName, `${q1Win.toFixed(1)}%`, `${q5Win.toFixed(1)}%`, `${(q5Win - q1Win).toFixed(1)}%`);
      }
      addBlank();

      // Full detailed data for both Canon and Heretic
      outputDetailedData(canon, 'CANON ');
      outputDetailedData(heretic, 'HERETIC ');
    } else {
      // === SIMPLE FORMAT (Canon only, no comparison) ===
      const dnfRate = (canon.dnfResults.totalDNFs / canon.dnfResults.totalDriverRaces) * 100;
      const scLapRate = canon.dnfResults.safetyCars.totalRaceLaps > 0
        ? (canon.dnfResults.safetyCars.totalLapsUnderSC / canon.dnfResults.safetyCars.totalRaceLaps) * 100 : 0;
      const avgPits = canon.pitStopResults.totalPitStops / canon.pitStopResults.totalRaces / 20;

      addRow('SIMULATION RESULTS');
      addRow('Metric', 'Value');
      addRow('Total Races', canon.totalRaces);
      addRow('Total Driver-Races', canon.totalDriverRaces);
      addRow('DNF Rate', `${dnfRate.toFixed(1)}%`);
      addRow('DNFs per Race', (canon.dnfResults.totalDNFs / canon.totalRaces).toFixed(1));
      addRow('SC Lap %', `${scLapRate.toFixed(1)}%`);
      addRow('Avg Pit Stops', avgPits.toFixed(2));
      addBlank();

      // Field Spread
      addRow('FIELD SPREAD');
      addRow('Metric', 'Value');
      const leaderMargin = canon.fieldSpreadResults.leaderMarginRaces > 0
        ? canon.fieldSpreadResults.leaderMarginTotal / canon.fieldSpreadResults.leaderMarginRaces : 0;
      addRow('Leader Margin (% lap)', `${leaderMargin.toFixed(1)}%`);
      const leadLapPct = canon.fieldSpreadResults.totalFinishersForLeadLap > 0
        ? (canon.fieldSpreadResults.leadLapFinishers / canon.fieldSpreadResults.totalFinishersForLeadLap) * 100 : 0;
      addRow('Lead Lap Finishers %', `${leadLapPct.toFixed(1)}%`);
      addRow('Avg Finishers/Race', (canon.fieldSpreadResults.totalFinishers / canon.totalRaces).toFixed(1));
      addBlank();

      // Winner Stats Profile
      addRow('WINNER STATS PROFILE (Avg)');
      addRow('Stat', 'Value');
      const win = canon.fieldSpreadResults;
      if (win.winnerCount > 0) {
        addRow('Speed', (win.winnerStats.speed / win.winnerCount).toFixed(3));
        addRow('Consistency', (win.winnerStats.consistency / win.winnerCount).toFixed(3));
        addRow('Car Power', (win.winnerStats.carPower / win.winnerCount).toFixed(2));
        addRow('Car Grip', (win.winnerStats.carGrip / win.winnerCount).toFixed(2));
        addRow('Aggression', (win.winnerStats.aggression / win.winnerCount).toFixed(3));
      }
      addBlank();

      addRow('STAT IMPACT (Q1 vs Q5 Win Rate)');
      addRow('Stat', 'Q1 Win%', 'Q5 Win%', 'Δ');
      for (const [statName, buckets] of Object.entries(canon.statBucketResults)) {
        const q1Win = getBucketRate(buckets[0], 'win');
        const q5Win = getBucketRate(buckets[4], 'win');
        addRow(statLabels[statName] || statName, `${q1Win.toFixed(1)}%`, `${q5Win.toFixed(1)}%`, `${(q5Win - q1Win).toFixed(1)}%`);
      }
      addBlank();

      // Full detailed data
      outputDetailedData(canon, '');
    }

    addRow('CONFIG');
    addRow('Batch Size', canon.config.batchSize);
    addRow('Track Selection', canon.config.trackSelection);

    const tsv = rows.join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = tsv;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 2000);
    }
  };

  // Check if any variables have been changed
  const hasChanges = computeVariablesDiff(CANON_VARIABLES, hereticVariables).length > 0;

  return (
    <div className="sim-lab">
      <div className="sim-lab-header">
        <h2>Sim Lab</h2>
        <p className="sim-lab-subtitle">Monte Carlo simulation with Canon vs Heretic comparison</p>
      </div>

      {error && (
        <div className="sim-lab-error">
          <span>Error: {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {phase === 'setup' && (
        <div className="simlab-setup-phase">
          {/* Simulation Config */}
          <div className="simlab-config-section">
            <div className="config-row">
              <div className="config-group">
                <label>Simulation Size</label>
                <div className="batch-buttons">
                  {[100, 500, 1000, 2000].map(size => (
                    <button
                      key={size}
                      className={batchSize === size ? 'active' : ''}
                      onClick={() => setBatchSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="config-group">
                <label>Track Selection</label>
                <div className="track-buttons">
                  <button
                    className={trackSelection === 'all' ? 'active' : ''}
                    onClick={() => setTrackSelection('all')}
                  >
                    All Tracks
                  </button>
                  <button
                    className={trackSelection === 'random' ? 'active' : ''}
                    onClick={() => setTrackSelection('random')}
                  >
                    Random
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Variables Editor */}
          <SimLabVariables
            hereticVariables={hereticVariables}
            onVariablesChange={setHereticVariables}
            onReset={handleResetVariables}
          />

          {/* Run Button */}
          <div className="setup-actions">
            <button className="run-btn" onClick={handleStartSimulation}>
              {hasChanges ? 'Run Comparison (Canon vs Heretic)' : 'Run Simulation (Canon only)'}
            </button>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <div className="comparison-progress">
          <div className="comparison-progress-header">
            <h3>{isComparisonMode ? 'Running Comparison Simulation' : 'Running Simulation'}</h3>
            <p>{isComparisonMode ? 'Canon and Heretic simulations running in parallel' : 'Running canon simulation'}</p>
          </div>
          <div className="comparison-bars">
            <div className={`comparison-bar-section canon ${!isComparisonMode ? 'solo' : ''}`}>
              <div className="comparison-bar-label">
                <span>{isComparisonMode ? 'Canon (Current Rules)' : 'Simulation Progress'}</span>
                <span className="percent">{Math.round((canonProgress.completed / batchSize) * 100)}%</span>
              </div>
              <div className="comparison-bar-track">
                <div
                  className="comparison-bar-fill"
                  style={{ width: `${(canonProgress.completed / batchSize) * 100}%` }}
                />
              </div>
              {canonProgress.currentTrack && (
                <div className="comparison-track-info">{canonProgress.currentTrack}</div>
              )}
            </div>
            {isComparisonMode && (
              <div className="comparison-bar-section heretic">
                <div className="comparison-bar-label">
                  <span>Heretic (Modified Rules)</span>
                  <span className="percent">{Math.round((hereticProgress.completed / batchSize) * 100)}%</span>
                </div>
                <div className="comparison-bar-track">
                  <div
                    className="comparison-bar-fill"
                    style={{ width: `${(hereticProgress.completed / batchSize) * 100}%` }}
                  />
                </div>
                {hereticProgress.currentTrack && (
                  <div className="comparison-track-info">{hereticProgress.currentTrack}</div>
                )}
              </div>
            )}
          </div>
          <button className="abort-btn" onClick={handleAbort}>
            Abort Simulation
          </button>
        </div>
      )}

      {phase === 'results' && comparisonResults && (
        <SimLabResults
          results={comparisonResults.canon}
          comparisonResults={comparisonResults}
          onReset={handleReset}
          onExportJSON={handleExportJSON}
          onExportCSV={handleExportCSV}
          copyConfirmed={copyConfirmed}
        />
      )}
    </div>
  );
}
