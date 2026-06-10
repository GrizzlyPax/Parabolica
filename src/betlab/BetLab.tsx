import { useState, useEffect, useRef, useCallback } from 'react';
import { SimVariables, CANON_VARIABLES, cloneVariables } from '../simlab/types';
import {
  BetLabConfig,
  BetLabResults,
  BetLabComparison,
  BetLabWorkerResponse,
} from './types';
import BetLabResultsView from './BetLabResults';
import './BetLab.css';

type BetLabPhase = 'setup' | 'running' | 'results';

// Compute diff for betting variables only
function computeBettingDiff(canon: SimVariables, heretic: SimVariables) {
  const diffs: { path: string; label: string; canonValue: number; hereticValue: number; percentChange: number }[] = [];

  const compare = (path: string, label: string, canonVal: number, hereticVal: number) => {
    if (canonVal !== hereticVal) {
      const percentChange = canonVal !== 0 ? ((hereticVal - canonVal) / canonVal) * 100 : 0;
      diffs.push({ path, label, canonValue: canonVal, hereticValue: hereticVal, percentChange });
    }
  };

  // Betting strength weights
  const cw = canon.betting.strengthWeights;
  const hw = heretic.betting.strengthWeights;
  compare('betting.strengthWeights.carPower', 'Power Weight', cw.carPower, hw.carPower);
  compare('betting.strengthWeights.consistency', 'Consistency Weight', cw.consistency, hw.consistency);
  compare('betting.strengthWeights.speed', 'Speed Weight', cw.speed, hw.speed);
  compare('betting.strengthWeights.pitCrew', 'Pit Crew Weight', cw.pitCrew, hw.pitCrew);
  compare('betting.strengthWeights.carGrip', 'Grip Weight', cw.carGrip, hw.carGrip);
  compare('betting.strengthWeights.luck', 'Luck Weight', cw.luck, hw.luck);
  compare('betting.strengthWeights.carReliability', 'Reliability Weight', cw.carReliability, hw.carReliability);

  // Base multipliers
  const cm = canon.betting.baseMultipliers;
  const hm = heretic.betting.baseMultipliers;
  compare('betting.baseMultipliers.win', 'Win Payout', cm.win, hm.win);
  compare('betting.baseMultipliers.podium', 'Podium Payout', cm.podium, hm.podium);
  compare('betting.baseMultipliers.points', 'Points Payout', cm.points, hm.points);
  compare('betting.baseMultipliers.finishes', 'Finishes Payout', cm.finishes, hm.finishes);
  compare('betting.baseMultipliers.dnf', 'DNF Payout', cm.dnf, hm.dnf);

  // Rating weights
  const cr = canon.betting.driverRatingWeights;
  const hr = heretic.betting.driverRatingWeights;
  compare('betting.driverRatingWeights.consistency', 'Rating: Consistency', cr.consistency, hr.consistency);
  compare('betting.driverRatingWeights.speed', 'Rating: Speed', cr.speed, hr.speed);
  compare('betting.driverRatingWeights.luck', 'Rating: Luck', cr.luck, hr.luck);

  return diffs;
}

export default function BetLab() {
  const [phase, setPhase] = useState<BetLabPhase>('setup');

  // Config state
  const [batchSize, setBatchSize] = useState(500);
  const [trackSelection, setTrackSelection] = useState<'random' | 'all'>('all');

  // Heretic variables (full SimVariables, but we only edit betting section)
  const [hereticVariables, setHereticVariables] = useState<SimVariables>(cloneVariables(CANON_VARIABLES));

  // Progress tracking
  const [canonProgress, setCanonProgress] = useState({ completed: 0, total: 0, currentTrack: '' });
  const [hereticProgress, setHereticProgress] = useState({ completed: 0, total: 0, currentTrack: '' });

  // Results
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [completedWorkers, setCompletedWorkers] = useState(0);
  const canonResultsRef = useRef<BetLabResults | null>(null);
  const hereticResultsRef = useRef<BetLabResults | null>(null);
  const [comparisonResults, setComparisonResults] = useState<BetLabComparison | null>(null);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [canonOnlyResults, setCanonOnlyResults] = useState<BetLabResults | null>(null);

  // Workers
  const canonWorkerRef = useRef<Worker | null>(null);
  const hereticWorkerRef = useRef<Worker | null>(null);

  // Initialize workers
  useEffect(() => {
    canonWorkerRef.current = new Worker(
      new URL('./betLabWorker.ts', import.meta.url),
      { type: 'module' }
    );
    hereticWorkerRef.current = new Worker(
      new URL('./betLabWorker.ts', import.meta.url),
      { type: 'module' }
    );

    // Canon worker message handler
    canonWorkerRef.current.onmessage = (e: MessageEvent<BetLabWorkerResponse>) => {
      if (e.data.type === 'PROGRESS') {
        setCanonProgress({ completed: e.data.completed, total: e.data.total, currentTrack: e.data.currentTrack });
      } else if (e.data.type === 'COMPLETE') {
        canonResultsRef.current = e.data.results;
        setCompletedWorkers(prev => prev + 1);
      } else if (e.data.type === 'ERROR') {
        console.error('Canon worker error:', e.data.message);
        setPhase('setup');
      }
    };

    // Heretic worker message handler
    hereticWorkerRef.current.onmessage = (e: MessageEvent<BetLabWorkerResponse>) => {
      if (e.data.type === 'PROGRESS') {
        setHereticProgress({ completed: e.data.completed, total: e.data.total, currentTrack: e.data.currentTrack });
      } else if (e.data.type === 'COMPLETE') {
        hereticResultsRef.current = e.data.results;
        setCompletedWorkers(prev => prev + 1);
      } else if (e.data.type === 'ERROR') {
        console.error('Heretic worker error:', e.data.message);
      }
    };

    return () => {
      canonWorkerRef.current?.terminate();
      hereticWorkerRef.current?.terminate();
    };
  }, []);

  // Check if all workers completed
  useEffect(() => {
    const expectedWorkers = isComparisonMode ? 2 : 1;
    if (completedWorkers >= expectedWorkers && canonResultsRef.current) {
      if (isComparisonMode && hereticResultsRef.current) {
        setComparisonResults({
          canon: canonResultsRef.current,
          heretic: hereticResultsRef.current,
        });
        setCanonOnlyResults(null);
      } else {
        setCanonOnlyResults(canonResultsRef.current);
        setComparisonResults(null);
      }
      setPhase('results');
    }
  }, [completedWorkers, isComparisonMode]);

  // Check if heretic has betting changes
  const hasBettingChanges = useCallback(() => {
    const diffs = computeBettingDiff(CANON_VARIABLES, hereticVariables);
    return diffs.length > 0;
  }, [hereticVariables]);

  const handleStart = (runComparison: boolean) => {
    const config: BetLabConfig = {
      batchSize,
      trackSelection,
    };

    setPhase('running');
    setCompletedWorkers(0);
    setIsComparisonMode(runComparison);
    canonResultsRef.current = null;
    hereticResultsRef.current = null;
    setCanonProgress({ completed: 0, total: config.batchSize, currentTrack: '' });
    setHereticProgress({ completed: 0, total: config.batchSize, currentTrack: '' });

    // Start canon worker
    canonWorkerRef.current?.postMessage({ type: 'START', config, variables: CANON_VARIABLES, label: 'canon' });

    // Start heretic worker if comparing
    if (runComparison) {
      hereticWorkerRef.current?.postMessage({ type: 'START', config, variables: hereticVariables, label: 'heretic' });
    }
  };

  const handleAbort = () => {
    canonWorkerRef.current?.postMessage({ type: 'ABORT' });
    hereticWorkerRef.current?.postMessage({ type: 'ABORT' });
    setPhase('setup');
  };

  const handleReset = () => {
    setPhase('setup');
    setComparisonResults(null);
    setCanonOnlyResults(null);
    canonResultsRef.current = null;
    hereticResultsRef.current = null;
  };

  const handleResetVariables = () => {
    setHereticVariables(cloneVariables(CANON_VARIABLES));
  };

  // Export results as TSV to clipboard
  const handleExportCSV = async () => {
    const data = comparisonResults?.canon ?? canonOnlyResults;
    if (!data) return;

    const rows: string[] = [];
    const addRow = (...cols: (string | number)[]) => rows.push(cols.join('\t'));
    const addBlank = () => rows.push('');

    const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`;
    const formatROI = (v: number) => `${v.toFixed(2)}×`;

    // Header
    addRow('BET LAB RESULTS');
    addRow('Generated', new Date().toISOString());
    addRow('Total Races', data.totalRaces);
    addRow('Total Bets', data.totalBets);
    addRow('Execution Time', `${(data.executionTimeMs / 1000).toFixed(1)}s`);
    addBlank();

    // Overall Stats
    addRow('OVERALL STATS');
    addRow('Metric', 'Value');
    addRow('Overall Hit Rate', formatPercent(data.overallHitRate));
    addRow('Overall ROI', formatROI(data.overallROI));
    addRow('Total Payout', data.totalPayout.toFixed(0));
    addRow('Total Staked', data.totalStaked.toFixed(0));
    addBlank();

    // By Bet Type
    addRow('BY BET TYPE');
    addRow('Bet Type', 'Total Bets', 'Wins', 'Hit Rate', 'Avg Odds', 'Implied %', 'Calibration Δ', 'ROI');
    for (const bt of data.betTypeResults) {
      addRow(
        bt.betType.charAt(0).toUpperCase() + bt.betType.slice(1),
        bt.totalBets,
        bt.winningBets,
        formatPercent(bt.hitRate),
        `${bt.avgOddsOffered.toFixed(1)}×`,
        formatPercent(bt.impliedProbability),
        formatPercent(bt.calibrationDelta),
        formatROI(bt.roi)
      );
    }
    addBlank();

    // By Tier
    addRow('BY TIER');
    addRow('Tier', 'Drivers', 'Win%', 'Podium%', 'Points%', 'Finish%', 'DNF%', 'Avg Win Odds', 'ROI');
    for (const tier of data.tierResults) {
      addRow(
        tier.tierLabel,
        tier.driverCount.toFixed(1),
        formatPercent(tier.winRate),
        formatPercent(tier.podiumRate),
        formatPercent(tier.pointsRate),
        formatPercent(tier.finishRate),
        formatPercent(tier.dnfRate),
        `${tier.avgWinOdds.toFixed(1)}×`,
        formatROI(tier.overallROI)
      );
    }
    addBlank();

    // By Odds Range
    addRow('BY ODDS RANGE (CALIBRATION)');
    addRow('Range', 'Total Bets', 'Wins', 'Hit Rate', 'Implied %', 'Calibration', 'ROI');
    for (const bucket of data.oddsBucketResults) {
      addRow(
        bucket.range,
        bucket.totalBets,
        bucket.winningBets,
        formatPercent(bucket.hitRate),
        formatPercent(bucket.impliedProbability),
        bucket.calibration === 'good' ? 'Good' : bucket.calibration === 'high' ? 'Hitting High' : 'Hitting Low',
        formatROI(bucket.roi)
      );
    }
    addBlank();

    // Comparison data if available
    if (comparisonResults) {
      const canon = comparisonResults.canon;
      const heretic = comparisonResults.heretic;

      addRow('CANON VS HERETIC COMPARISON');
      addRow('Metric', 'Canon', 'Heretic', 'Δ');
      addRow('Overall Hit Rate', formatPercent(canon.overallHitRate), formatPercent(heretic.overallHitRate), formatPercent(heretic.overallHitRate - canon.overallHitRate));
      addRow('Overall ROI', formatROI(canon.overallROI), formatROI(heretic.overallROI), `${(heretic.overallROI - canon.overallROI).toFixed(2)}`);
      addBlank();

      addRow('BY BET TYPE COMPARISON');
      addRow('Bet Type', 'Canon Hit%', 'Heretic Hit%', 'Δ', 'Canon ROI', 'Heretic ROI', 'Δ');
      for (let i = 0; i < canon.betTypeResults.length; i++) {
        const c = canon.betTypeResults[i];
        const h = heretic.betTypeResults[i];
        addRow(
          c.betType.charAt(0).toUpperCase() + c.betType.slice(1),
          formatPercent(c.hitRate),
          formatPercent(h.hitRate),
          formatPercent(h.hitRate - c.hitRate),
          formatROI(c.roi),
          formatROI(h.roi),
          `${(h.roi - c.roi).toFixed(2)}`
        );
      }
      addBlank();

      // Variables changed
      if (bettingDiffs.length > 0) {
        addRow('VARIABLES CHANGED');
        addRow('Variable', 'Canon', 'Heretic', 'Change %');
        for (const diff of bettingDiffs) {
          addRow(diff.label, diff.canonValue, diff.hereticValue, `${diff.percentChange >= 0 ? '+' : ''}${diff.percentChange.toFixed(1)}%`);
        }
      }
    }

    // Copy to clipboard
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

  // Update a single betting variable
  const handleVariableChange = (path: string, value: number) => {
    setHereticVariables(prev => {
      const clone = cloneVariables(prev);
      const parts = path.split('.');
      let current: Record<string, unknown> = clone as unknown as Record<string, unknown>;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]] as Record<string, unknown>;
      }
      current[parts[parts.length - 1]] = value;
      return clone;
    });
  };

  const bettingDiffs = computeBettingDiff(CANON_VARIABLES, hereticVariables);

  return (
    <div className="betlab">
      <div className="betlab-header">
        <h1>Bet Lab</h1>
        <p className="betlab-subtitle">
          Monte Carlo testing for betting odds calibration
        </p>
      </div>

      {phase === 'setup' && (
        <div className="betlab-setup">
          {/* Config Section */}
          <div className="betlab-config">
            <h3>Simulation Config</h3>

            <div className="config-row">
              <label>Races to Simulate</label>
              <div className="batch-buttons">
                {[100, 500, 1000, 2000].map(size => (
                  <button
                    key={size}
                    className={`batch-btn ${batchSize === size ? 'active' : ''}`}
                    onClick={() => setBatchSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="config-row">
              <label>Tracks</label>
              <div className="batch-buttons">
                <button
                  className={`batch-btn ${trackSelection === 'all' ? 'active' : ''}`}
                  onClick={() => setTrackSelection('all')}
                >
                  All Tracks
                </button>
                <button
                  className={`batch-btn ${trackSelection === 'random' ? 'active' : ''}`}
                  onClick={() => setTrackSelection('random')}
                >
                  Random
                </button>
              </div>
            </div>

            <div className="config-info">
              <p>
                {batchSize} races × 22 drivers × 5 bet types = <strong>{(batchSize * 22 * 5).toLocaleString()}</strong> bets
              </p>
            </div>
          </div>

          {/* Betting Variables Section */}
          <div className="betlab-variables">
            <div className="variables-header">
              <h3>Betting Variables</h3>
              <button className="reset-btn" onClick={handleResetVariables}>
                Reset to Canon
              </button>
            </div>

            <div className="variables-grid">
              {/* Strength Weights */}
              <div className="variable-group">
                <h4>Strength Weights (for odds ranking)</h4>
                {Object.entries(hereticVariables.betting.strengthWeights).map(([key, value]) => (
                  <div key={key} className="variable-row">
                    <label>{key}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={value}
                      onChange={(e) => handleVariableChange(`betting.strengthWeights.${key}`, parseFloat(e.target.value) || 0)}
                    />
                    <span className="canon-value">
                      (canon: {(CANON_VARIABLES.betting.strengthWeights as Record<string, number>)[key]})
                    </span>
                  </div>
                ))}
              </div>

              {/* Base Multipliers */}
              <div className="variable-group">
                <h4>Base Payout Multipliers</h4>
                {Object.entries(hereticVariables.betting.baseMultipliers).map(([key, value]) => (
                  <div key={key} className="variable-row">
                    <label>{key}</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="50"
                      value={value}
                      onChange={(e) => handleVariableChange(`betting.baseMultipliers.${key}`, parseFloat(e.target.value) || 1)}
                    />
                    <span className="canon-value">
                      (canon: {(CANON_VARIABLES.betting.baseMultipliers as Record<string, number>)[key]}×)
                    </span>
                  </div>
                ))}
              </div>

              {/* Rating Weights */}
              <div className="variable-group">
                <h4>Driver Rating Weights</h4>
                {Object.entries(hereticVariables.betting.driverRatingWeights).map(([key, value]) => (
                  <div key={key} className="variable-row">
                    <label>{key}</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={value}
                      onChange={(e) => handleVariableChange(`betting.driverRatingWeights.${key}`, parseFloat(e.target.value) || 0)}
                    />
                    <span className="canon-value">
                      (canon: {(CANON_VARIABLES.betting.driverRatingWeights as Record<string, number>)[key]})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {bettingDiffs.length > 0 && (
              <div className="changes-summary">
                <h4>{bettingDiffs.length} Variable{bettingDiffs.length > 1 ? 's' : ''} Changed</h4>
                <ul>
                  {bettingDiffs.map(diff => (
                    <li key={diff.path}>
                      <span className="diff-label">{diff.label}:</span>
                      <span className="diff-values">
                        {diff.canonValue} → {diff.hereticValue}
                        <span className={`diff-percent ${diff.percentChange >= 0 ? 'positive' : 'negative'}`}>
                          ({diff.percentChange >= 0 ? '+' : ''}{diff.percentChange.toFixed(1)}%)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Start Buttons */}
          <div className="betlab-actions">
            <button
              className="start-btn canon-only"
              onClick={() => handleStart(false)}
            >
              Run Canon Only
            </button>
            <button
              className="start-btn compare"
              onClick={() => handleStart(true)}
              disabled={!hasBettingChanges()}
              title={!hasBettingChanges() ? 'Change some betting variables to enable comparison' : ''}
            >
              Compare Canon vs Heretic
            </button>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <div className="betlab-running">
          <h3>Running Simulation...</h3>

          <div className="progress-section">
            <div className="progress-bar-container">
              <label>Canon</label>
              <div className="progress-bar">
                <div
                  className="progress-fill canon"
                  style={{ width: `${canonProgress.total > 0 ? (canonProgress.completed / canonProgress.total) * 100 : 0}%` }}
                />
              </div>
              <span className="progress-text">
                {canonProgress.completed} / {canonProgress.total}
                {canonProgress.currentTrack && ` - ${canonProgress.currentTrack}`}
              </span>
            </div>

            {isComparisonMode && (
              <div className="progress-bar-container">
                <label>Heretic</label>
                <div className="progress-bar">
                  <div
                    className="progress-fill heretic"
                    style={{ width: `${hereticProgress.total > 0 ? (hereticProgress.completed / hereticProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="progress-text">
                  {hereticProgress.completed} / {hereticProgress.total}
                  {hereticProgress.currentTrack && ` - ${hereticProgress.currentTrack}`}
                </span>
              </div>
            )}
          </div>

          <button className="abort-btn" onClick={handleAbort}>
            Abort
          </button>
        </div>
      )}

      {phase === 'results' && (comparisonResults || canonOnlyResults) && (
        <BetLabResultsView
          results={canonOnlyResults}
          comparisonResults={comparisonResults}
          variablesDiff={bettingDiffs}
          onReset={handleReset}
          onExportCSV={handleExportCSV}
          copyConfirmed={copyConfirmed}
        />
      )}
    </div>
  );
}
