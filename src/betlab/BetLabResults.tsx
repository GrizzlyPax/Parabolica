import { useState } from 'react';
import { BetLabResults, BetLabComparison } from './types';

interface BetLabResultsViewProps {
  results: BetLabResults | null;  // Canon-only results
  comparisonResults: BetLabComparison | null;  // Canon vs Heretic
  variablesDiff: { path: string; label: string; canonValue: number; hereticValue: number; percentChange: number }[];
  onReset: () => void;
  onExportCSV: () => void;
  copyConfirmed: boolean;
}

type ResultTab = 'overview' | 'betTypes' | 'tiers' | 'odds';

export default function BetLabResultsView({
  results,
  comparisonResults,
  variablesDiff,
  onReset,
  onExportCSV,
  copyConfirmed,
}: BetLabResultsViewProps) {
  const [activeTab, setActiveTab] = useState<ResultTab>('overview');

  // Use comparison results if available, otherwise use canon-only
  const hasComparison = !!comparisonResults;
  const canonData = comparisonResults?.canon ?? results;
  const hereticData = comparisonResults?.heretic;

  if (!canonData) return null;

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatROI = (value: number) => `${value.toFixed(2)}×`;
  const formatDelta = (value: number, isPercent = true) => {
    const sign = value >= 0 ? '+' : '';
    return isPercent ? `${sign}${(value * 100).toFixed(1)}%` : `${sign}${value.toFixed(2)}`;
  };

  return (
    <div className="betlab-results">
      <div className="results-header">
        <h2>Bet Lab Results</h2>
        <div className="results-actions">
          <button className="reset-btn" onClick={onExportCSV}>
            {copyConfirmed ? 'Copied!' : 'Copy All Data'}
          </button>
          <button className="reset-btn" onClick={onReset}>
            New Simulation
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="results-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'betTypes' ? 'active' : ''}`}
          onClick={() => setActiveTab('betTypes')}
        >
          By Bet Type
        </button>
        <button
          className={`tab-btn ${activeTab === 'tiers' ? 'active' : ''}`}
          onClick={() => setActiveTab('tiers')}
        >
          By Tier
        </button>
        <button
          className={`tab-btn ${activeTab === 'odds' ? 'active' : ''}`}
          onClick={() => setActiveTab('odds')}
        >
          Odds Calibration
        </button>
      </div>

      {/* Tab Content */}
      <div className="results-content">
        {activeTab === 'overview' && (
          <div className="tab-overview">
            {/* Summary Stats */}
            <div className="overview-cards">
              <div className="overview-card">
                <span className="card-label">Total Races</span>
                <span className="card-value">{canonData.totalRaces.toLocaleString()}</span>
              </div>
              <div className="overview-card">
                <span className="card-label">Total Bets</span>
                <span className="card-value">{canonData.totalBets.toLocaleString()}</span>
              </div>
              <div className="overview-card">
                <span className="card-label">Overall Hit Rate</span>
                <span className="card-value">{formatPercent(canonData.overallHitRate)}</span>
              </div>
              <div className="overview-card">
                <span className="card-label">Overall ROI</span>
                <span className={`card-value ${canonData.overallROI >= 1 ? 'positive' : 'negative'}`}>
                  {formatROI(canonData.overallROI)}
                </span>
              </div>
              <div className="overview-card">
                <span className="card-label">Execution Time</span>
                <span className="card-value">{(canonData.executionTimeMs / 1000).toFixed(1)}s</span>
              </div>
            </div>

            {/* Comparison Table */}
            {hasComparison && hereticData && (
              <div className="comparison-section">
                <h3>Canon vs Heretic Comparison</h3>
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th className="canon">Canon</th>
                      <th className="heretic">Heretic</th>
                      <th>Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Overall Hit Rate</td>
                      <td className="canon">{formatPercent(canonData.overallHitRate)}</td>
                      <td className="heretic">{formatPercent(hereticData.overallHitRate)}</td>
                      <td className={hereticData.overallHitRate >= canonData.overallHitRate ? 'positive' : 'negative'}>
                        {formatDelta(hereticData.overallHitRate - canonData.overallHitRate)}
                      </td>
                    </tr>
                    <tr>
                      <td>Overall ROI</td>
                      <td className="canon">{formatROI(canonData.overallROI)}</td>
                      <td className="heretic">{formatROI(hereticData.overallROI)}</td>
                      <td className={hereticData.overallROI >= canonData.overallROI ? 'positive' : 'negative'}>
                        {formatDelta(hereticData.overallROI - canonData.overallROI, false)}
                      </td>
                    </tr>
                    {canonData.betTypeResults.map((bt, i) => (
                      <tr key={bt.betType}>
                        <td>{bt.betType.charAt(0).toUpperCase() + bt.betType.slice(1)} Hit Rate</td>
                        <td className="canon">{formatPercent(bt.hitRate)}</td>
                        <td className="heretic">{formatPercent(hereticData.betTypeResults[i].hitRate)}</td>
                        <td className={hereticData.betTypeResults[i].hitRate >= bt.hitRate ? 'positive' : 'negative'}>
                          {formatDelta(hereticData.betTypeResults[i].hitRate - bt.hitRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Variables Changed */}
            {variablesDiff.length > 0 && (
              <div className="variables-changed">
                <h3>Variables Changed</h3>
                <table className="variables-table">
                  <thead>
                    <tr>
                      <th>Variable</th>
                      <th>Canon</th>
                      <th>Heretic</th>
                      <th>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variablesDiff.map(diff => (
                      <tr key={diff.path}>
                        <td>{diff.label}</td>
                        <td>{diff.canonValue}</td>
                        <td>{diff.hereticValue}</td>
                        <td className={diff.percentChange >= 0 ? 'positive' : 'negative'}>
                          {diff.percentChange >= 0 ? '+' : ''}{diff.percentChange.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'betTypes' && (
          <div className="tab-bet-types">
            <h3>Performance by Bet Type</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bet Type</th>
                  <th>Total Bets</th>
                  <th>Hits</th>
                  <th>Hit Rate</th>
                  <th>Avg Odds</th>
                  <th>Implied %</th>
                  <th>Calibration</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {canonData.betTypeResults.map(bt => (
                  <tr key={bt.betType}>
                    <td className="bet-type">{bt.betType.charAt(0).toUpperCase() + bt.betType.slice(1)}</td>
                    <td>{bt.totalBets.toLocaleString()}</td>
                    <td>{bt.winningBets.toLocaleString()}</td>
                    <td>{formatPercent(bt.hitRate)}</td>
                    <td>{bt.avgOddsOffered.toFixed(1)}×</td>
                    <td>{formatPercent(bt.impliedProbability)}</td>
                    <td className={bt.calibrationDelta >= 0 ? 'positive' : 'negative'}>
                      {formatDelta(bt.calibrationDelta)}
                    </td>
                    <td className={bt.roi >= 1 ? 'positive' : 'negative'}>
                      {formatROI(bt.roi)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {hasComparison && hereticData && (
              <>
                <h3>Heretic Comparison</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bet Type</th>
                      <th>Canon Hit%</th>
                      <th>Heretic Hit%</th>
                      <th>Delta</th>
                      <th>Canon ROI</th>
                      <th>Heretic ROI</th>
                      <th>ROI Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {canonData.betTypeResults.map((bt, i) => {
                      const hbt = hereticData.betTypeResults[i];
                      return (
                        <tr key={bt.betType}>
                          <td className="bet-type">{bt.betType.charAt(0).toUpperCase() + bt.betType.slice(1)}</td>
                          <td>{formatPercent(bt.hitRate)}</td>
                          <td>{formatPercent(hbt.hitRate)}</td>
                          <td className={hbt.hitRate >= bt.hitRate ? 'positive' : 'negative'}>
                            {formatDelta(hbt.hitRate - bt.hitRate)}
                          </td>
                          <td>{formatROI(bt.roi)}</td>
                          <td>{formatROI(hbt.roi)}</td>
                          <td className={hbt.roi >= bt.roi ? 'positive' : 'negative'}>
                            {formatDelta(hbt.roi - bt.roi, false)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {activeTab === 'tiers' && (
          <div className="tab-tiers">
            <h3>Performance by Driver Tier</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Drivers</th>
                  <th>Win%</th>
                  <th>Podium%</th>
                  <th>Points%</th>
                  <th>Finish%</th>
                  <th>DNF%</th>
                  <th>Avg Win Odds</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {canonData.tierResults.map(tier => (
                  <tr key={tier.tier} className={`tier-${tier.tier}`}>
                    <td className="tier-name">
                      <span className={`tier-badge ${tier.tier}`}>{tier.tierLabel}</span>
                    </td>
                    <td>{tier.driverCount.toFixed(1)}</td>
                    <td>{formatPercent(tier.winRate)}</td>
                    <td>{formatPercent(tier.podiumRate)}</td>
                    <td>{formatPercent(tier.pointsRate)}</td>
                    <td>{formatPercent(tier.finishRate)}</td>
                    <td>{formatPercent(tier.dnfRate)}</td>
                    <td>{tier.avgWinOdds.toFixed(1)}×</td>
                    <td className={tier.overallROI >= 1 ? 'positive' : 'negative'}>
                      {formatROI(tier.overallROI)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="tier-insight">
              <h4>Tier Analysis</h4>
              <ul>
                {(() => {
                  const tiers = canonData.tierResults;
                  const contenders = tiers.find(t => t.tier === 'favorite');
                  const backmarkers = tiers.find(t => t.tier === 'wildcard');
                  const insights: string[] = [];

                  if (contenders && backmarkers) {
                    const winRatio = contenders.winRate / (backmarkers.winRate || 0.001);
                    insights.push(`Contenders win ${winRatio.toFixed(1)}× more often than Backmarkers`);

                    if (contenders.overallROI > 1) {
                      insights.push(`Betting on Contenders is profitable (ROI: ${formatROI(contenders.overallROI)})`);
                    } else {
                      insights.push(`Betting on Contenders loses money (ROI: ${formatROI(contenders.overallROI)})`);
                    }

                    if (backmarkers.overallROI > 1) {
                      insights.push(`Longshot bets on Backmarkers are profitable!`);
                    }
                  }

                  return insights.map((insight, i) => <li key={i}>{insight}</li>);
                })()}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'odds' && (
          <div className="tab-odds">
            <h3>Odds Calibration Analysis</h3>
            <p className="calibration-explainer">
              Compares actual hit rates against what the odds imply. Good calibration means bets hit at roughly their implied probability.
            </p>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Odds Range</th>
                  <th>Total Bets</th>
                  <th>Hits</th>
                  <th>Hit Rate</th>
                  <th>Implied %</th>
                  <th>Calibration</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {canonData.oddsBucketResults.map(bucket => (
                  <tr key={bucket.range}>
                    <td className="odds-range">{bucket.range}</td>
                    <td>{bucket.totalBets.toLocaleString()}</td>
                    <td>{bucket.winningBets.toLocaleString()}</td>
                    <td>{formatPercent(bucket.hitRate)}</td>
                    <td>{formatPercent(bucket.impliedProbability)}</td>
                    <td className={`calibration calibration-${bucket.calibration}`}>
                      {bucket.calibration === 'good' ? 'Good' : bucket.calibration === 'high' ? 'Hitting High' : 'Hitting Low'}
                    </td>
                    <td className={bucket.roi >= 1 ? 'positive' : 'negative'}>
                      {formatROI(bucket.roi)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="calibration-chart">
              <h4>Visual Calibration</h4>
              <div className="chart-bars">
                {canonData.oddsBucketResults.map(bucket => {
                  const expected = bucket.impliedProbability * 100;
                  const actual = bucket.hitRate * 100;
                  const maxHeight = Math.max(expected, actual, 80);

                  return (
                    <div key={bucket.range} className="chart-bar-group">
                      <div className="bar-container" style={{ height: `${maxHeight + 20}px` }}>
                        <div
                          className="bar expected"
                          style={{ height: `${expected}%` }}
                          title={`Implied: ${expected.toFixed(1)}%`}
                        />
                        <div
                          className="bar actual"
                          style={{ height: `${actual}%` }}
                          title={`Actual: ${actual.toFixed(1)}%`}
                        />
                      </div>
                      <span className="bar-label">{bucket.range}</span>
                    </div>
                  );
                })}
              </div>
              <div className="chart-legend">
                <span className="legend-item expected">Implied (from odds)</span>
                <span className="legend-item actual">Actual hit rate</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
