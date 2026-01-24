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

  // Crashes
  compare('crashes.baseCrashChance', 'crash chance', canon.crashes.baseCrashChance, heretic.crashes.baseCrashChance);
  compare('crashes.crashProximityThreshold', 'proximity', canon.crashes.crashProximityThreshold, heretic.crashes.crashProximityThreshold);
  compare('crashes.initialSurvivalChance', 'survival', canon.crashes.initialSurvivalChance, heretic.crashes.initialSurvivalChance);

  // Mechanical
  compare('mechanical.baseFailureChance', 'mech failure', canon.mechanical.baseFailureChance, heretic.mechanical.baseFailureChance);

  // Pits
  compare('pits.basePitDuration', 'pit duration', canon.pits.basePitDuration, heretic.pits.basePitDuration);
  compare('pits.slowStopMultiplier', 'slow stop mult', canon.pits.slowStopMultiplier, heretic.pits.slowStopMultiplier);
  compare('pits.quickStopMultiplier', 'quick stop mult', canon.pits.quickStopMultiplier, heretic.pits.quickStopMultiplier);

  // Performance
  compare('performance.luckProcChance', 'luck proc', canon.performance.luckProcChance, heretic.performance.luckProcChance);
  compare('performance.enduranceDecay', 'endurance decay', canon.performance.enduranceDecay, heretic.performance.enduranceDecay);
  compare('performance.damageSpeedPenalty', 'damage penalty', canon.performance.damageSpeedPenalty, heretic.performance.damageSpeedPenalty);

  // Blowouts
  compare('blowouts.riskMultiplier', 'blowout risk mult', canon.blowouts.riskMultiplier, heretic.blowouts.riskMultiplier);
  compare('blowouts.aggressionBonus', 'aggression blowout', canon.blowouts.aggressionBonus, heretic.blowouts.aggressionBonus);

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

    // Always start canon worker
    canonWorkerRef.current?.postMessage({ type: 'START', config, label: 'canon' });

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

      const canonSCRate = (canon.dnfResults.safetyCars.racesWithSafetyCar / canon.totalRaces) * 100;
      const hereticSCRate = (heretic.dnfResults.safetyCars.racesWithSafetyCar / heretic.totalRaces) * 100;
      addRow('Safety Cars', canon.dnfResults.safetyCars.totalDeployments, heretic.dnfResults.safetyCars.totalDeployments, heretic.dnfResults.safetyCars.totalDeployments - canon.dnfResults.safetyCars.totalDeployments);
      addRow('Safety Car Rate', `${canonSCRate.toFixed(1)}%`, `${hereticSCRate.toFixed(1)}%`, `${(hereticSCRate - canonSCRate).toFixed(1)}%`);
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
    } else {
      // === SIMPLE FORMAT (Canon only, no comparison) ===
      const dnfRate = (canon.dnfResults.totalDNFs / canon.dnfResults.totalDriverRaces) * 100;
      const scRate = (canon.dnfResults.safetyCars.racesWithSafetyCar / canon.totalRaces) * 100;
      const avgPits = canon.pitStopResults.totalPitStops / canon.pitStopResults.totalRaces / 20;

      addRow('SIMULATION RESULTS');
      addRow('Metric', 'Value');
      addRow('Total Races', canon.totalRaces);
      addRow('Total Driver-Races', canon.totalDriverRaces);
      addBlank();

      addRow('DNF STATS');
      addRow('Metric', 'Value');
      addRow('DNF Rate', `${dnfRate.toFixed(1)}%`);
      addRow('Total DNFs', canon.dnfResults.totalDNFs);
      addRow('DNFs per Race', (canon.dnfResults.totalDNFs / canon.totalRaces).toFixed(1));
      addRow('Crash DNFs', canon.dnfResults.byReason.crash);
      addRow('Mechanical DNFs', canon.dnfResults.byReason.mechanical);
      addRow('Tire Failure DNFs', canon.dnfResults.byReason.tire_failure);
      addRow('Safety Cars', canon.dnfResults.safetyCars.totalDeployments);
      addRow('Safety Car Rate', `${scRate.toFixed(1)}%`);
      addBlank();

      addRow('PIT STOP STATS');
      addRow('Metric', 'Value');
      addRow('Total Pit Stops', canon.pitStopResults.totalPitStops);
      addRow('Avg per Driver', avgPits.toFixed(2));
      addRow('Quick Stops', canon.pitStopResults.quickStops);
      addRow('Slow Stops', canon.pitStopResults.slowStops);
      addBlank();

      addRow('STAT IMPACT (Q1 vs Q5 Win Rate)');
      addRow('Stat', 'Q1 Win%', 'Q5 Win%', 'Δ');
      for (const [statName, buckets] of Object.entries(canon.statBucketResults)) {
        const q1Win = getBucketRate(buckets[0], 'win');
        const q5Win = getBucketRate(buckets[4], 'win');
        addRow(statLabels[statName] || statName, `${q1Win.toFixed(1)}%`, `${q5Win.toFixed(1)}%`, `${(q5Win - q1Win).toFixed(1)}%`);
      }
      addBlank();
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
