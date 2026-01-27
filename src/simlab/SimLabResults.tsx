import { useState } from 'react';
import type { SimLabResults as Results, TagPerformance, ComparisonResults } from './types';
import { StatBucketChart, StatImpactTable, PieChart, TagImpactTable, StatMetric, StatImpactRow } from './SimLabCharts';
import { ALL_TAGS } from '../data/tags';

type ResultsTab = 'overview' | 'stats' | 'tags' | 'dnf' | 'pits' | 'tracks' | 'events';

interface Props {
  results: Results;
  comparisonResults?: ComparisonResults;
  onReset: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  copyConfirmed?: boolean;
}

export default function SimLabResults({ results, comparisonResults, onReset, onExportJSON, onExportCSV, copyConfirmed }: Props) {
  const [activeTab, setActiveTab] = useState<ResultsTab>('overview');
  const [statMetric, setStatMetric] = useState<StatMetric>('winRate');
  const [activeDataset, setActiveDataset] = useState<'canon' | 'heretic'>('canon');

  // Get the active results based on toggle
  const hasComparison = !!comparisonResults && comparisonResults.variablesDiff.length > 0;
  const activeResults = hasComparison && activeDataset === 'heretic'
    ? comparisonResults.heretic
    : results;

  const tabLabels: Record<ResultsTab, string> = {
    overview: 'Overview',
    stats: 'Stats',
    tags: 'Tags',
    dnf: 'DNF',
    pits: 'Pits',
    tracks: 'Tracks',
    events: 'Events',
  };

  return (
    <div className="sim-lab-results">
      <div className="results-header">
        <div className="results-summary">
          <span className="summary-item">{activeResults.totalRaces} races</span>
          <span className="summary-item">{(activeResults.executionTimeMs / 1000).toFixed(1)}s</span>
          {hasComparison && (
            <span className="summary-item dataset-label">
              Viewing: <strong className={activeDataset}>{activeDataset === 'canon' ? 'Canon' : 'Heretic'}</strong>
            </span>
          )}
        </div>
        <div className="results-actions">
          <button onClick={onExportCSV}>{copyConfirmed ? 'Copied!' : 'Copy All Data'}</button>
          <button onClick={onExportJSON}>Export JSON</button>
          <button onClick={onReset}>New Sim</button>
        </div>
      </div>

      {hasComparison && (
        <div className="comparison-toggle">
          <button
            className={`canon ${activeDataset === 'canon' ? 'active' : ''}`}
            onClick={() => setActiveDataset('canon')}
          >
            Canon
          </button>
          <button
            className={`heretic ${activeDataset === 'heretic' ? 'active' : ''}`}
            onClick={() => setActiveDataset('heretic')}
          >
            Heretic
          </button>
        </div>
      )}

      {hasComparison && comparisonResults.variablesDiff.length > 0 && (
        <div className="variables-diff-summary">
          <h4>Variables Changed ({comparisonResults.variablesDiff.length})</h4>
          <div className="diff-list">
            {comparisonResults.variablesDiff.map(diff => (
              <div key={diff.path} className="diff-item">
                <span className="diff-item-label">{diff.label}</span>
                <span className={`diff-item-change ${diff.percentChange >= 0 ? 'positive' : 'negative'}`}>
                  {diff.percentChange >= 0 ? '+' : ''}{diff.percentChange.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="results-tabs">
        {(Object.keys(tabLabels) as ResultsTab[]).map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="results-content">
        {activeTab === 'overview' && (
          <OverviewTab
            results={activeResults}
            comparisonResults={hasComparison ? comparisonResults : undefined}
            activeDataset={activeDataset}
          />
        )}
        {activeTab === 'stats' && (
          <StatsTab
            results={activeResults}
            metric={statMetric}
            onMetricChange={setStatMetric}
          />
        )}
        {activeTab === 'tags' && <TagsTab results={activeResults} />}
        {activeTab === 'dnf' && <DNFTab results={activeResults} />}
        {activeTab === 'pits' && <PitsTab results={activeResults} />}
        {activeTab === 'tracks' && <TracksTab results={activeResults} />}
        {activeTab === 'events' && <EventsTab results={activeResults} />}
      </div>
    </div>
  );
}

// === TAB COMPONENTS ===

function OverviewTab({
  results,
  comparisonResults,
  activeDataset,
}: {
  results: Results;
  comparisonResults?: ComparisonResults;
  activeDataset: 'canon' | 'heretic';
}) {
  const dnfRate = results.dnfResults.totalDriverRaces > 0
    ? (results.dnfResults.totalDNFs / results.dnfResults.totalDriverRaces) * 100
    : 0;

  const avgPitStops = results.pitStopResults.totalRaces > 0
    ? results.pitStopResults.totalPitStops / results.pitStopResults.totalRaces / 20 // 20 drivers
    : 0;

  const scRate = results.dnfResults.safetyCars.totalRaceLaps > 0
    ? (results.dnfResults.safetyCars.totalLapsUnderSC / results.dnfResults.safetyCars.totalRaceLaps) * 100
    : 0;

  // Calculate comparison values if available
  const hasComparison = !!comparisonResults;
  let canonDnfRate = 0, hereticDnfRate = 0;
  let canonScRate = 0, hereticScRate = 0;
  let canonAvgPits = 0, hereticAvgPits = 0;
  let canonCrashRate = 0, hereticCrashRate = 0;

  if (hasComparison) {
    const c = comparisonResults.canon;
    const h = comparisonResults.heretic;

    canonDnfRate = c.dnfResults.totalDriverRaces > 0
      ? (c.dnfResults.totalDNFs / c.dnfResults.totalDriverRaces) * 100 : 0;
    hereticDnfRate = h.dnfResults.totalDriverRaces > 0
      ? (h.dnfResults.totalDNFs / h.dnfResults.totalDriverRaces) * 100 : 0;

    canonScRate = c.dnfResults.safetyCars.totalRaceLaps > 0
      ? (c.dnfResults.safetyCars.totalLapsUnderSC / c.dnfResults.safetyCars.totalRaceLaps) * 100 : 0;
    hereticScRate = h.dnfResults.safetyCars.totalRaceLaps > 0
      ? (h.dnfResults.safetyCars.totalLapsUnderSC / h.dnfResults.safetyCars.totalRaceLaps) * 100 : 0;

    canonAvgPits = c.pitStopResults.totalRaces > 0
      ? c.pitStopResults.totalPitStops / c.pitStopResults.totalRaces / 20 : 0;
    hereticAvgPits = h.pitStopResults.totalRaces > 0
      ? h.pitStopResults.totalPitStops / h.pitStopResults.totalRaces / 20 : 0;

    canonCrashRate = c.dnfResults.totalDriverRaces > 0
      ? (c.dnfResults.byReason.crash / c.dnfResults.totalDriverRaces) * 100 : 0;
    hereticCrashRate = h.dnfResults.totalDriverRaces > 0
      ? (h.dnfResults.byReason.crash / h.dnfResults.totalDriverRaces) * 100 : 0;
  }

  const formatDelta = (delta: number, suffix = '%') => {
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}${suffix}`;
  };

  const getDeltaClass = (delta: number) => delta >= 0 ? 'positive' : 'negative';

  return (
    <div className="tab-overview">
      {hasComparison ? (
        <>
          <div className="comparison-overview">
            <h4>Canon vs Heretic Comparison</h4>
            <div className="comparison-table">
              <div className="comparison-table-header">
                <span className="comp-col-label">Metric</span>
                <span className="comp-col-canon">Canon</span>
                <span className="comp-col-heretic">Heretic</span>
                <span className="comp-col-delta">Delta</span>
              </div>
              <div className="comparison-table-row">
                <span className="comp-col-label">DNF Rate</span>
                <span className="comp-col-canon">{canonDnfRate.toFixed(1)}%</span>
                <span className="comp-col-heretic">{hereticDnfRate.toFixed(1)}%</span>
                <span className={`comp-col-delta ${getDeltaClass(hereticDnfRate - canonDnfRate)}`}>
                  {formatDelta(hereticDnfRate - canonDnfRate)}
                </span>
              </div>
              <div className="comparison-table-row">
                <span className="comp-col-label">Crash Rate</span>
                <span className="comp-col-canon">{canonCrashRate.toFixed(1)}%</span>
                <span className="comp-col-heretic">{hereticCrashRate.toFixed(1)}%</span>
                <span className={`comp-col-delta ${getDeltaClass(hereticCrashRate - canonCrashRate)}`}>
                  {formatDelta(hereticCrashRate - canonCrashRate)}
                </span>
              </div>
              <div className="comparison-table-row">
                <span className="comp-col-label">SC Lap %</span>
                <span className="comp-col-canon">{canonScRate.toFixed(1)}%</span>
                <span className="comp-col-heretic">{hereticScRate.toFixed(1)}%</span>
                <span className={`comp-col-delta ${getDeltaClass(hereticScRate - canonScRate)}`}>
                  {formatDelta(hereticScRate - canonScRate)}
                </span>
              </div>
              <div className="comparison-table-row">
                <span className="comp-col-label">Avg Pit Stops</span>
                <span className="comp-col-canon">{canonAvgPits.toFixed(2)}</span>
                <span className="comp-col-heretic">{hereticAvgPits.toFixed(2)}</span>
                <span className={`comp-col-delta ${getDeltaClass(hereticAvgPits - canonAvgPits)}`}>
                  {formatDelta(hereticAvgPits - canonAvgPits, '')}
                </span>
              </div>
            </div>
          </div>

          <div className="overview-section">
            <h4>Currently Viewing: <span className={activeDataset}>{activeDataset === 'canon' ? 'Canon' : 'Heretic'}</span></h4>
            <p className="viewing-note">Use the toggle above to switch between Canon and Heretic data in all tabs.</p>
          </div>
        </>
      ) : (
        <div className="overview-grid">
          <div className="overview-card">
            <span className="overview-label">Total Races</span>
            <span className="overview-value">{results.totalRaces}</span>
          </div>
          <div className="overview-card">
            <span className="overview-label">Driver-Races</span>
            <span className="overview-value">{results.totalDriverRaces.toLocaleString()}</span>
          </div>
          <div className="overview-card">
            <span className="overview-label">DNF Rate</span>
            <span className="overview-value">{Math.round(dnfRate)}%</span>
          </div>
          <div className="overview-card">
            <span className="overview-label">Avg Pit Stops</span>
            <span className="overview-value">{avgPitStops.toFixed(1)}</span>
          </div>
          <div className="overview-card">
            <span className="overview-label">SC Lap %</span>
            <span className="overview-value">{scRate.toFixed(1)}%</span>
          </div>
          <div className="overview-card">
            <span className="overview-label">Races/Second</span>
            <span className="overview-value">
              {(results.totalRaces / (results.executionTimeMs / 1000)).toFixed(0)}
            </span>
          </div>
        </div>
      )}

      <div className="overview-section">
        <h4>Configuration</h4>
        <p>
          {results.config.batchSize} races | {results.config.trackSelection} tracks
        </p>
      </div>

      <div className="overview-section methodology">
        <h4>How It Works</h4>
        <p>
          Each race generates <strong>20 fresh random drivers</strong> with random stats, cars (1-5★), and teams.
          Stats are then grouped into quintiles (Q1-Q5) or star ratings to show correlations.
        </p>
        <p className="methodology-note">
          This is Monte Carlo sampling — we run many races with random drivers to see which stats
          actually impact performance. A stat with steep Q1→Q5 difference matters more than a flat one.
        </p>
      </div>
    </div>
  );
}

// Stat descriptions for popup
const STAT_INFO: Record<string, { icon: string; description: string; formula: string }> = {
  speed: {
    icon: '⚡',
    description: 'Base speed determines lap time potential. Higher speed = faster base lap times. This is the primary stat for outright pace.',
    formula: 'lapTime = baseLapTime × (1 - speed × 0.15)',
  },
  consistency: {
    icon: '🎯',
    description: 'Reduces lap time variance. High consistency means more predictable performance with fewer mistakes. Low consistency causes more fluctuation.',
    formula: 'variance = baseVariance × (1 - consistency × 0.8)',
  },
  luck: {
    icon: '🍀',
    description: 'Affects random events and close battles. Higher luck improves odds in 50/50 situations like wheel-to-wheel combat and mechanical reliability.',
    formula: 'eventChance = baseChance × (1 + luck × 0.3)',
  },
  acceleration: {
    icon: '🚀',
    description: 'Affects speed out of corners and after pit stops. Higher acceleration helps on tracks with many slow corners and during restarts.',
    formula: 'exitSpeed = baseSpeed × (1 + acceleration × 0.1)',
  },
  endurance: {
    icon: '💪',
    description: 'Reduces performance degradation over race distance. Higher endurance means less tire wear and better late-race pace.',
    formula: 'degradation = baseDegradation × (1 - endurance × 0.4)',
  },
  aggression: {
    icon: '🔥',
    description: 'Double-edged: increases overtaking success but also crash risk. Aggressive drivers make more moves but are more likely to DNF.',
    formula: 'overtakeChance ↑, crashRisk ↑',
  },
  carPower: {
    icon: '🏎️',
    description: 'Engine power affects top speed on straights. Higher power = faster on power tracks like Monza. Combined with driver speed.',
    formula: 'topSpeed = baseSpeed × (1 + power × 0.2)',
  },
  carGrip: {
    icon: '🛞',
    description: 'Tire grip affects cornering speed and tire wear. Higher grip = faster through corners and better tire management.',
    formula: 'cornerSpeed = baseSpeed × (1 + grip × 0.15)',
  },
  carReliability: {
    icon: '🔧',
    description: 'Reduces mechanical failure chance. Higher reliability = lower DNF risk from mechanical issues. Critical for finishing races.',
    formula: 'mechanicalDNF = baseRisk × (1 - reliability × 0.8)',
  },
  pitCrew: {
    icon: '👨‍🔧',
    description: 'Pit stop speed affects time lost in pits. Faster pit crew = less time lost per stop. Adds up over multi-stop races.',
    formula: 'pitTime = basePitTime × (1 - pitCrew × 0.3)',
  },
  tireManagement: {
    icon: '🎚️',
    description: 'Affects tire strategy optimization. Better management = smarter compound choices and better stint lengths.',
    formula: 'stintLength ↑, blowoutRisk ↓',
  },
};

function StatsTab({
  results,
  metric,
  onMetricChange,
}: {
  results: Results;
  metric: StatMetric;
  onMetricChange: (m: StatMetric) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedStat, setSelectedStat] = useState<{ key: string; row: StatImpactRow } | null>(null);

  const metricLabels: Record<StatMetric, string> = {
    winRate: 'Win %',
    podiumRate: 'Podium %',
    pointsRate: 'Points %',
    finishRate: 'Finish %',
  };

  const metricDescriptions: Record<StatMetric, string> = {
    winRate: 'Which stats help drivers win? Higher Δ = stronger correlation with winning.',
    podiumRate: 'Which stats help drivers reach the podium (top 3)?',
    pointsRate: 'Which stats help drivers finish in the points (top 10)?',
    finishRate: 'Which stats help drivers finish the race? (Higher = more reliable)',
  };

  const handleStatClick = (statKey: string, row: StatImpactRow) => {
    setSelectedStat({ key: statKey, row });
  };

  return (
    <div className="tab-stats">
      <div className="stat-metric-selector">
        <span>Show:</span>
        {(Object.keys(metricLabels) as (keyof typeof metricLabels)[]).map(m => (
          <button
            key={m}
            className={metric === m ? 'active' : ''}
            onClick={() => onMetricChange(m)}
          >
            {metricLabels[m]}
          </button>
        ))}
      </div>

      <p className="stat-metric-desc">{metricDescriptions[metric]}</p>

      <StatImpactTable
        statBuckets={results.statBucketResults}
        metric={metric}
        onStatClick={handleStatClick}
      />

      {selectedStat && (() => {
        const info = STAT_INFO[selectedStat.key];
        const row = selectedStat.row;
        const deltaSign = row.delta >= 0 ? '+' : '';
        return (
          <div className="stat-popup-overlay" onClick={() => setSelectedStat(null)}>
            <div className="stat-popup" onClick={e => e.stopPropagation()}>
              <button className="stat-popup-close" onClick={() => setSelectedStat(null)}>×</button>
              <div className="stat-popup-header">
                <span className="stat-popup-icon">{info?.icon || '📊'}</span>
                <span className="stat-popup-name">{row.name}</span>
              </div>
              <span className="stat-popup-category">{row.category} stat</span>
              {info && (
                <>
                  <p className="stat-popup-desc">{info.description}</p>
                  <div className="stat-popup-formula">{info.formula}</div>
                </>
              )}
              <div className="stat-popup-stats">
                <div className="stat-popup-stat">
                  <span className="stat-popup-stat-value">{Math.round(row.lowValue * 100)}%</span>
                  <span className="stat-popup-stat-label">{row.lowLabel} {metricLabels[metric]}</span>
                </div>
                <div className="stat-popup-stat">
                  <span className="stat-popup-stat-value">{Math.round(row.highValue * 100)}%</span>
                  <span className="stat-popup-stat-label">{row.highLabel} {metricLabels[metric]}</span>
                </div>
                <div className="stat-popup-stat">
                  <span className={`stat-popup-stat-value ${row.delta >= 0 ? 'positive' : 'negative'}`}>
                    {deltaSign}{Math.round(row.delta * 100)}%
                  </span>
                  <span className="stat-popup-stat-label">Δ Impact</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="stat-details-toggle">
        <button onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? '▼ Hide Quintile Charts' : '▶ Show Quintile Charts'}
        </button>
      </div>

      {showDetails && (
        <div className="stat-sections">
          <div className="stat-section">
            <h4>Driver Stats (quintiles)</h4>
            <div className="stat-grid">
              <StatBucketChart
                buckets={results.statBucketResults.speed}
                metric={metric}
                label="Speed"
              />
              <StatBucketChart
                buckets={results.statBucketResults.consistency}
                metric={metric}
                label="Consistency"
              />
              <StatBucketChart
                buckets={results.statBucketResults.luck}
                metric={metric}
                label="Luck"
              />
              <StatBucketChart
                buckets={results.statBucketResults.acceleration}
                metric={metric}
                label="Acceleration"
              />
              <StatBucketChart
                buckets={results.statBucketResults.endurance}
                metric={metric}
                label="Endurance"
              />
              <StatBucketChart
                buckets={results.statBucketResults.aggression}
                metric={metric}
                label="Aggression"
              />
            </div>
          </div>

          <div className="stat-section">
            <h4>Car Stats (1-5★)</h4>
            <div className="stat-grid">
              <StatBucketChart
                buckets={results.statBucketResults.carPower}
                metric={metric}
                label="Power"
                isStarBased
              />
              <StatBucketChart
                buckets={results.statBucketResults.carGrip}
                metric={metric}
                label="Grip"
                isStarBased
              />
              <StatBucketChart
                buckets={results.statBucketResults.carReliability}
                metric={metric}
                label="Reliability"
                isStarBased
              />
            </div>
          </div>

          <div className="stat-section">
            <h4>Team Stats (1-5★)</h4>
            <div className="stat-grid">
              <StatBucketChart
                buckets={results.statBucketResults.pitCrew}
                metric={metric}
                label="Pit Crew"
                isStarBased
              />
              <StatBucketChart
                buckets={results.statBucketResults.tireManagement}
                metric={metric}
                label="Tire Mgmt"
                isStarBased
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TagsTab({ results }: { results: Results }) {
  const [metric, setMetric] = useState<StatMetric>('winRate');
  const [selectedTag, setSelectedTag] = useState<TagPerformance | null>(null);

  const metricLabels: Record<StatMetric, string> = {
    winRate: 'Win %',
    podiumRate: 'Podium %',
    pointsRate: 'Points %',
    finishRate: 'Finish %',
  };

  // Calculate baseline rates (average across all driver-races)
  // Baseline is 1 winner per 20 drivers = 5% win rate
  // Baseline is 3 podiums per 20 drivers = 15% podium rate
  // Baseline points (top 10) = 10/20 = 50%
  // Baseline finish rate from results
  const overallDnfRate = results.dnfResults.totalDriverRaces > 0
    ? results.dnfResults.totalDNFs / results.dnfResults.totalDriverRaces
    : 0;
  const baselineRates: Record<StatMetric, number> = {
    winRate: 1 / 20, // 5%
    podiumRate: 3 / 20, // 15%
    pointsRate: 10 / 20, // 50%
    finishRate: 1 - overallDnfRate,
  };

  // Calculate tag stats for popup
  const getTagStats = (tag: TagPerformance) => {
    const winRate = tag.appearances > 0 ? (tag.wins / tag.appearances) * 100 : 0;
    const podiumRate = tag.appearances > 0 ? (tag.podiums / tag.appearances) * 100 : 0;
    const pointsRate = tag.appearances > 0 ? (tag.pointsFinishes / tag.appearances) * 100 : 0;
    const finishRate = tag.appearances > 0 ? ((tag.appearances - tag.dnfs) / tag.appearances) * 100 : 0;
    const avgPos = tag.appearances > 0 ? tag.totalFinishPosition / tag.appearances : 0;
    return { winRate, podiumRate, pointsRate, finishRate, avgPos };
  };

  return (
    <div className="tab-tags">
      <div className="stat-metric-selector">
        <span>Show:</span>
        {(Object.keys(metricLabels) as (keyof typeof metricLabels)[]).map(m => (
          <button
            key={m}
            className={metric === m ? 'active' : ''}
            onClick={() => setMetric(m)}
          >
            {metricLabels[m]}
          </button>
        ))}
      </div>

      <p className="stat-metric-desc">
        Tag performance vs random baseline. Green = above average, Red = below average.
      </p>

      <div className="tag-sections">
        <div className="tag-section">
          <div className="impact-group-label">
            <span>Driver Tags</span>
            <span className="group-count">{results.tagResults.driverTags.length}</span>
          </div>
          <TagImpactTable
            tags={results.tagResults.driverTags}
            metric={metric}
            baselineRate={baselineRates[metric]}
            tagType="driver"
            onTagClick={setSelectedTag}
          />
        </div>

        <div className="tag-section">
          <div className="impact-group-label">
            <span>Car Tags</span>
            <span className="group-count">{results.tagResults.carTags.length}</span>
          </div>
          <TagImpactTable
            tags={results.tagResults.carTags}
            metric={metric}
            baselineRate={baselineRates[metric]}
            tagType="car"
            onTagClick={setSelectedTag}
          />
        </div>

        <div className="tag-section">
          <div className="impact-group-label">
            <span>Team Tags</span>
            <span className="group-count">{results.tagResults.teamTags.length}</span>
          </div>
          <TagImpactTable
            tags={results.tagResults.teamTags}
            metric={metric}
            baselineRate={baselineRates[metric]}
            tagType="team"
            onTagClick={setSelectedTag}
          />
        </div>
      </div>

      {selectedTag && (() => {
        const stats = getTagStats(selectedTag);
        const winDelta = stats.winRate - 5; // vs 5% baseline
        const podiumDelta = stats.podiumRate - 15; // vs 15% baseline
        // Look up tag definition for description and effects
        const tagDef = ALL_TAGS.find(t => t.id === selectedTag.tagId);

        // Format effect modifier as percentage
        const formatEffect = (val: number | undefined, isResistance = false) => {
          if (val === undefined) return null;
          if (isResistance) {
            const pct = Math.round(val * 100);
            return pct >= 0 ? `+${pct}%` : `${pct}%`;
          }
          const pct = Math.round((val - 1) * 100);
          return pct >= 0 ? `+${pct}%` : `${pct}%`;
        };

        const triggerLabels: Record<string, string> = {
          passive: 'Always active',
          race_start: 'At race start',
          pit_stop: 'During pit stops',
          overtake: 'When overtaking',
          crash_proximity: 'Near crashes',
          final_lap: 'On final lap',
        };

        return (
          <div className="tag-popup-overlay" onClick={() => setSelectedTag(null)}>
            <div className="tag-popup" onClick={e => e.stopPropagation()}>
              <button className="tag-popup-close" onClick={() => setSelectedTag(null)}>×</button>
              <div className="tag-popup-header">
                <span className="tag-popup-emoji">{selectedTag.tagEmoji}</span>
                <span className="tag-popup-name">{selectedTag.tagName}</span>
              </div>
              <span className="tag-popup-type">{selectedTag.tagType} tag</span>

              {tagDef && (
                <>
                  <p className="tag-popup-desc">{tagDef.description}</p>
                  <div className="tag-popup-effects">
                    <span className="tag-popup-trigger">{triggerLabels[tagDef.trigger] || tagDef.trigger}</span>
                    <div className="tag-popup-effect-list">
                      {tagDef.effects.speedModifier && (
                        <span className={`tag-effect ${tagDef.effects.speedModifier >= 1 ? 'positive' : 'negative'}`}>
                          Speed {formatEffect(tagDef.effects.speedModifier)}
                        </span>
                      )}
                      {tagDef.effects.consistencyModifier && (
                        <span className={`tag-effect ${tagDef.effects.consistencyModifier >= 1 ? 'positive' : 'negative'}`}>
                          Consistency {formatEffect(tagDef.effects.consistencyModifier)}
                        </span>
                      )}
                      {tagDef.effects.luckModifier && (
                        <span className={`tag-effect ${tagDef.effects.luckModifier >= 1 ? 'positive' : 'negative'}`}>
                          Luck {formatEffect(tagDef.effects.luckModifier)}
                        </span>
                      )}
                      {tagDef.effects.crashResistance !== undefined && (
                        <span className={`tag-effect ${tagDef.effects.crashResistance >= 0 ? 'positive' : 'negative'}`}>
                          Crash Resist {formatEffect(tagDef.effects.crashResistance, true)}
                        </span>
                      )}
                      {tagDef.effects.pitSpeedModifier && (
                        <span className={`tag-effect ${tagDef.effects.pitSpeedModifier <= 1 ? 'positive' : 'negative'}`}>
                          Pit Speed {formatEffect(2 - tagDef.effects.pitSpeedModifier)}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="tag-popup-stats">
                <div className="tag-popup-stat">
                  <span className={`tag-popup-stat-value ${winDelta >= 0 ? 'positive' : 'negative'}`}>
                    {stats.winRate.toFixed(1)}%
                  </span>
                  <span className="tag-popup-stat-label">Win Rate</span>
                </div>
                <div className="tag-popup-stat">
                  <span className={`tag-popup-stat-value ${podiumDelta >= 0 ? 'positive' : 'negative'}`}>
                    {stats.podiumRate.toFixed(1)}%
                  </span>
                  <span className="tag-popup-stat-label">Podium</span>
                </div>
                <div className="tag-popup-stat">
                  <span className="tag-popup-stat-value">{stats.pointsRate.toFixed(1)}%</span>
                  <span className="tag-popup-stat-label">Points</span>
                </div>
                <div className="tag-popup-stat">
                  <span className="tag-popup-stat-value">{stats.finishRate.toFixed(1)}%</span>
                  <span className="tag-popup-stat-label">Finish</span>
                </div>
              </div>
              <div className="tag-popup-breakdown">
                <h4>Raw Numbers</h4>
                <div className="tag-popup-breakdown-row">
                  <span>Appearances</span>
                  <span className="tag-popup-breakdown-value">{selectedTag.appearances.toLocaleString()}</span>
                </div>
                <div className="tag-popup-breakdown-row">
                  <span>Wins</span>
                  <span className="tag-popup-breakdown-value">{selectedTag.wins.toLocaleString()}</span>
                </div>
                <div className="tag-popup-breakdown-row">
                  <span>Podiums</span>
                  <span className="tag-popup-breakdown-value">{selectedTag.podiums.toLocaleString()}</span>
                </div>
                <div className="tag-popup-breakdown-row">
                  <span>Points Finishes</span>
                  <span className="tag-popup-breakdown-value">{selectedTag.pointsFinishes.toLocaleString()}</span>
                </div>
                <div className="tag-popup-breakdown-row">
                  <span>DNFs</span>
                  <span className="tag-popup-breakdown-value">{selectedTag.dnfs.toLocaleString()}</span>
                </div>
                <div className="tag-popup-breakdown-row">
                  <span>Avg Finish Position</span>
                  <span className="tag-popup-breakdown-value">P{stats.avgPos.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function DNFTab({ results }: { results: Results }) {
  const { dnfResults } = results;
  const total = dnfResults.totalDNFs;
  const rate = dnfResults.totalDriverRaces > 0
    ? (total / dnfResults.totalDriverRaces) * 100
    : 0;

  const reasonData = [
    { label: 'Crash', value: dnfResults.byReason.crash, color: '#dc2626' },
    { label: 'Mechanical', value: dnfResults.byReason.mechanical, color: '#6366f1' },
    { label: 'Tire Failure', value: dnfResults.byReason.tire_failure, color: '#14b8a6' },
  ];

  const phaseData = [
    { label: 'Early (0-33%)', value: dnfResults.byRacePhase.early, color: '#22c55e' },
    { label: 'Mid (33-67%)', value: dnfResults.byRacePhase.mid, color: '#3b82f6' },
    { label: 'Late (67-100%)', value: dnfResults.byRacePhase.late, color: '#8b5cf6' },
  ];

  const scLapRate = dnfResults.safetyCars.totalRaceLaps > 0
    ? (dnfResults.safetyCars.totalLapsUnderSC / dnfResults.safetyCars.totalRaceLaps) * 100
    : 0;

  return (
    <div className="tab-dnf">
      <div className="dnf-summary">
        <div className="dnf-stat">
          <span className="dnf-value">{total}</span>
          <span className="dnf-label">Total DNFs</span>
        </div>
        <div className="dnf-stat">
          <span className="dnf-value">{Math.round(rate)}%</span>
          <span className="dnf-label">DNF Rate</span>
        </div>
        <div className="dnf-stat">
          <span className="dnf-value">{(total / results.totalRaces).toFixed(1)}</span>
          <span className="dnf-label">Per Race</span>
        </div>
        <div className="dnf-stat safety-car">
          <span className="dnf-value">{dnfResults.safetyCars.totalDeployments}</span>
          <span className="dnf-label">Safety Cars</span>
        </div>
        <div className="dnf-stat safety-car">
          <span className="dnf-value">{scLapRate.toFixed(1)}%</span>
          <span className="dnf-label">Laps Under SC</span>
        </div>
      </div>

      <div className="dnf-charts">
        <div className="dnf-chart-section">
          <h4>By Reason</h4>
          <PieChart data={reasonData} />
        </div>
        <div className="dnf-chart-section">
          <h4>By Race Phase</h4>
          <PieChart data={phaseData} />
        </div>
      </div>

      <div className="dnf-breakdown">
        <h4>DNF Breakdown</h4>
        <div className="dnf-bar-horizontal">
          {total > 0 && (
            <>
              <div
                className="dnf-bar-segment crash"
                style={{ width: `${(dnfResults.byReason.crash / total) * 100}%` }}
                title={`Crash: ${dnfResults.byReason.crash} (${((dnfResults.byReason.crash / total) * 100).toFixed(0)}%)`}
              >
                {dnfResults.byReason.crash > total * 0.1 && '💥'}
              </div>
              <div
                className="dnf-bar-segment mechanical"
                style={{ width: `${(dnfResults.byReason.mechanical / total) * 100}%` }}
                title={`Mechanical: ${dnfResults.byReason.mechanical} (${((dnfResults.byReason.mechanical / total) * 100).toFixed(0)}%)`}
              >
                {dnfResults.byReason.mechanical > total * 0.1 && '🔧'}
              </div>
              <div
                className="dnf-bar-segment tire"
                style={{ width: `${(dnfResults.byReason.tire_failure / total) * 100}%` }}
                title={`Tire Failure: ${dnfResults.byReason.tire_failure} (${((dnfResults.byReason.tire_failure / total) * 100).toFixed(0)}%)`}
              >
                {dnfResults.byReason.tire_failure > total * 0.1 && '💨'}
              </div>
            </>
          )}
        </div>
        <div className="dnf-bar-legend">
          <span><span className="legend-dot crash"></span> Crash {((dnfResults.byReason.crash / total) * 100 || 0).toFixed(0)}%</span>
          <span><span className="legend-dot mechanical"></span> Mechanical {((dnfResults.byReason.mechanical / total) * 100 || 0).toFixed(0)}%</span>
          <span><span className="legend-dot tire"></span> Tire {((dnfResults.byReason.tire_failure / total) * 100 || 0).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

function PitsTab({ results }: { results: Results }) {
  const [startMetric, setStartMetric] = useState<'winRate' | 'podiumRate' | 'pointsRate' | 'finishRate'>('winRate');

  const { pitStopResults } = results;
  const totalStops = pitStopResults.totalPitStops;
  const avgPerDriver = pitStopResults.totalRaces > 0
    ? totalStops / pitStopResults.totalRaces / 20
    : 0;

  const slowRate = totalStops > 0 ? (pitStopResults.slowStops / totalStops) * 100 : 0;
  const quickRate = totalStops > 0 ? (pitStopResults.quickStops / totalStops) * 100 : 0;
  const normalStops = totalStops - pitStopResults.slowStops - pitStopResults.quickStops;
  const normalRate = totalStops > 0 ? (normalStops / totalStops) * 100 : 0;

  const winnerAvgPits = pitStopResults.winnerRaces > 0
    ? pitStopResults.winnerTotalPitStops / pitStopResults.winnerRaces
    : 0;

  // Calculate tire stint averages
  const tireStints = pitStopResults.tireStints;
  const softAvgLaps = tireStints.soft.stintCount > 0
    ? tireStints.soft.totalLaps / tireStints.soft.stintCount
    : 0;
  const mediumAvgLaps = tireStints.medium.stintCount > 0
    ? tireStints.medium.totalLaps / tireStints.medium.stintCount
    : 0;
  const hardAvgLaps = tireStints.hard.stintCount > 0
    ? tireStints.hard.totalLaps / tireStints.hard.stintCount
    : 0;

  // Blowout rates per stint
  const softBlowoutRate = tireStints.soft.stintCount > 0
    ? (tireStints.soft.blowouts / tireStints.soft.stintCount) * 100
    : 0;
  const mediumBlowoutRate = tireStints.medium.stintCount > 0
    ? (tireStints.medium.blowouts / tireStints.medium.stintCount) * 100
    : 0;
  const hardBlowoutRate = tireStints.hard.stintCount > 0
    ? (tireStints.hard.blowouts / tireStints.hard.stintCount) * 100
    : 0;

  // Starting tire performance - calculated per metric
  const startPerf = pitStopResults.startingTirePerformance;

  return (
    <div className="tab-pits">
      <div className="pits-summary">
        <div className="pit-stat">
          <span className="pit-value">{totalStops.toLocaleString()}</span>
          <span className="pit-label">Total Stops</span>
        </div>
        <div className="pit-stat">
          <span className="pit-value">{avgPerDriver.toFixed(1)}</span>
          <span className="pit-label">Avg per Driver</span>
        </div>
        <div className="pit-stat">
          <span className="pit-value">{winnerAvgPits.toFixed(1)}</span>
          <span className="pit-label">Winner Avg</span>
        </div>
      </div>

      <div className="pits-quality">
        <h4>Pit Stop Quality</h4>
        <div className="quality-bars">
          <div className="quality-item">
            <span className="quality-label">Quick Stops</span>
            <div className="quality-bar">
              <div className="quality-fill quick" style={{ width: `${quickRate}%` }} />
            </div>
            <span className="quality-value">{Math.round(quickRate)}%</span>
          </div>
          <div className="quality-item">
            <span className="quality-label">Normal Stops</span>
            <div className="quality-bar">
              <div className="quality-fill normal" style={{ width: `${normalRate}%` }} />
            </div>
            <span className="quality-value">{Math.round(normalRate)}%</span>
          </div>
          <div className="quality-item">
            <span className="quality-label">Slow Stops</span>
            <div className="quality-bar">
              <div className="quality-fill slow" style={{ width: `${slowRate}%` }} />
            </div>
            <span className="quality-value">{Math.round(slowRate)}%</span>
          </div>
        </div>
      </div>

      <div className="tire-analysis">
        <h4>Tire Stint Analysis</h4>
        <div className="tire-table">
          <div className="tire-table-header">
            <span className="tire-col-name">Compound</span>
            <span className="tire-col-stat">Stints</span>
            <span className="tire-col-stat">Avg Laps</span>
            <span className="tire-col-stat">Blowout %</span>
            <span className="tire-col-bar"></span>
          </div>
          <div className="tire-table-row">
            <span className="tire-col-name"><span className="tire-dot soft"></span> Soft</span>
            <span className="tire-col-stat">{tireStints.soft.stintCount.toLocaleString()}</span>
            <span className="tire-col-stat">{softAvgLaps.toFixed(1)}</span>
            <span className="tire-col-stat">{Math.round(softBlowoutRate)}%</span>
            <span className="tire-col-bar">
              <div className="stint-bar" style={{ width: `${(softAvgLaps / 20) * 100}%`, background: '#ef4444' }} />
            </span>
          </div>
          <div className="tire-table-row">
            <span className="tire-col-name"><span className="tire-dot medium"></span> Medium</span>
            <span className="tire-col-stat">{tireStints.medium.stintCount.toLocaleString()}</span>
            <span className="tire-col-stat">{mediumAvgLaps.toFixed(1)}</span>
            <span className="tire-col-stat">{Math.round(mediumBlowoutRate)}%</span>
            <span className="tire-col-bar">
              <div className="stint-bar" style={{ width: `${(mediumAvgLaps / 20) * 100}%`, background: '#eab308' }} />
            </span>
          </div>
          <div className="tire-table-row">
            <span className="tire-col-name"><span className="tire-dot hard"></span> Hard</span>
            <span className="tire-col-stat">{tireStints.hard.stintCount.toLocaleString()}</span>
            <span className="tire-col-stat">{hardAvgLaps.toFixed(1)}</span>
            <span className="tire-col-stat">{Math.round(hardBlowoutRate)}%</span>
            <span className="tire-col-bar">
              <div className="stint-bar" style={{ width: `${(hardAvgLaps / 20) * 100}%`, background: '#888' }} />
            </span>
          </div>
        </div>
      </div>

      <div className="starting-tire-analysis">
        <h4>Starting Tire Performance</h4>
        <div className="stat-metric-selector">
          <span>Show:</span>
          {(['winRate', 'podiumRate', 'pointsRate', 'finishRate'] as const).map(m => (
            <button
              key={m}
              className={startMetric === m ? 'active' : ''}
              onClick={() => setStartMetric(m)}
            >
              {{
                winRate: 'Win %',
                podiumRate: 'Podium %',
                pointsRate: 'Points %',
                finishRate: 'Finish %',
              }[m]}
            </button>
          ))}
        </div>
        <div className="tire-table">
          <div className="tire-table-header">
            <span className="tire-col-name">Start On</span>
            <span className="tire-col-stat">Starts</span>
            <span className="tire-col-stat">Value</span>
            <span className="tire-col-stat">vs Avg</span>
            <span className="tire-col-bar"></span>
          </div>
          {(() => {
            // Calculate values for each compound based on selected metric
            const getValue = (perf: typeof startPerf.soft): number => {
              if (perf.starts === 0) return 0;
              switch (startMetric) {
                case 'winRate': return (perf.wins / perf.starts) * 100;
                case 'podiumRate': return (perf.podiums / perf.starts) * 100;
                case 'pointsRate': return (perf.pointsFinishes / perf.starts) * 100;
                case 'finishRate': return ((perf.starts - perf.dnfs) / perf.starts) * 100;
              }
            };

            // Baseline rates
            const baselines = {
              winRate: 5, // 1/20 = 5%
              podiumRate: 15, // 3/20 = 15%
              pointsRate: 50, // 10/20 = 50%
              finishRate: results.dnfResults.totalDriverRaces > 0
                ? ((results.dnfResults.totalDriverRaces - results.dnfResults.totalDNFs) / results.dnfResults.totalDriverRaces) * 100
                : 95,
            };
            const baseline = baselines[startMetric];

            const formatValue = (v: number) => `${Math.round(v)}%`;

            const tires = [
              { name: 'Soft', dot: 'soft', perf: startPerf.soft, color: '#ef4444' },
              { name: 'Medium', dot: 'medium', perf: startPerf.medium, color: '#eab308' },
              { name: 'Hard', dot: 'hard', perf: startPerf.hard, color: '#888' },
            ].map(t => ({
              ...t,
              value: getValue(t.perf),
              delta: getValue(t.perf) - baseline,
            }));

            const maxValue = Math.max(...tires.map(t => t.value), baseline, 0.01);

            return tires.map(tire => {
              const isPositive = tire.delta > 0;
              const deltaStr = isPositive ? `+${Math.round(tire.delta)}%` : `${Math.round(tire.delta)}%`;

              return (
                <div key={tire.name} className="tire-table-row">
                  <span className="tire-col-name"><span className={`tire-dot ${tire.dot}`}></span> {tire.name}</span>
                  <span className="tire-col-stat">{tire.perf.starts.toLocaleString()}</span>
                  <span className="tire-col-stat">{formatValue(tire.value)}</span>
                  <span className={`tire-col-stat ${isPositive ? 'positive' : 'negative'}`}>{deltaStr}</span>
                  <span className="tire-col-bar">
                    <div className="stint-bar" style={{ width: `${(tire.value / maxValue) * 100}%`, background: tire.color }} />
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}

type TrackSortKey = 'name' | 'races' | 'finishRate' | 'crashRate' | 'mechRate' | 'tireRate' | 'leads';
type EventSortKey = 'name' | 'races' | 'triggers' | 'affectedPct' | 'winDelta' | 'podiumDelta' | 'pointsDelta' | 'finishDelta';

function TracksTab({ results }: { results: Results }) {
  const { tracks } = results.trackResults;
  const [sortKey, setSortKey] = useState<TrackSortKey>('finishRate');
  const [sortAsc, setSortAsc] = useState(false); // false = descending (show worst first for rates)

  if (tracks.length === 0) {
    return <p className="no-data">No track data</p>;
  }

  // Calculate derived values for each track
  const tracksWithStats = tracks.map(track => {
    const totalOutcomes = track.racesRun * 20; // 20 drivers per race
    return {
      ...track,
      finishRate: totalOutcomes > 0 ? (track.totalFinishers / totalOutcomes) * 100 : 0,
      crashRate: totalOutcomes > 0 ? (track.dnfBreakdown.crash / totalOutcomes) * 100 : 0,
      mechRate: totalOutcomes > 0 ? (track.dnfBreakdown.mechanical / totalOutcomes) * 100 : 0,
      tireRate: totalOutcomes > 0 ? (track.dnfBreakdown.tire_failure / totalOutcomes) * 100 : 0,
      avgLeads: track.racesRun > 0 ? track.totalLeadChanges / track.racesRun : 0,
    };
  });

  // Sort tracks
  const sorted = [...tracksWithStats].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.trackName.localeCompare(b.trackName); break;
      case 'races': cmp = a.racesRun - b.racesRun; break;
      case 'finishRate': cmp = a.finishRate - b.finishRate; break;
      case 'crashRate': cmp = a.crashRate - b.crashRate; break;
      case 'mechRate': cmp = a.mechRate - b.mechRate; break;
      case 'tireRate': cmp = a.tireRate - b.tireRate; break;
      case 'leads': cmp = a.avgLeads - b.avgLeads; break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: TrackSortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      // Default direction: descending for rates (show highest first), ascending for name
      setSortAsc(key === 'name');
    }
  };

  const SortIndicator = ({ column }: { column: TrackSortKey }) => {
    if (sortKey !== column) return null;
    return <span className="sort-indicator">{sortAsc ? ' ▲' : ' ▼'}</span>;
  };

  return (
    <div className="tab-tracks">
      <table className="track-table">
        <thead>
          <tr>
            <th className="track-th-emoji"></th>
            <th className="track-th-name" onClick={() => handleSort('name')}>
              Track<SortIndicator column="name" />
            </th>
            <th className="track-th-num" onClick={() => handleSort('races')}>
              Races<SortIndicator column="races" />
            </th>
            <th className="track-th-num" onClick={() => handleSort('finishRate')}>
              Finish %<SortIndicator column="finishRate" />
            </th>
            <th className="track-th-num" onClick={() => handleSort('crashRate')}>
              Crash %<SortIndicator column="crashRate" />
            </th>
            <th className="track-th-num" onClick={() => handleSort('mechRate')}>
              Mech %<SortIndicator column="mechRate" />
            </th>
            <th className="track-th-num" onClick={() => handleSort('tireRate')}>
              Tire %<SortIndicator column="tireRate" />
            </th>
            <th className="track-th-num" onClick={() => handleSort('leads')}>
              Leads<SortIndicator column="leads" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(track => (
            <tr key={track.trackId}>
              <td className="track-td-emoji">{track.trackEmoji}</td>
              <td className="track-td-name">{track.trackName}</td>
              <td className="track-td-num">{track.racesRun}</td>
              <td className="track-td-num good">{Math.round(track.finishRate)}%</td>
              <td className="track-td-num">{Math.round(track.crashRate)}%</td>
              <td className="track-td-num">{Math.round(track.mechRate)}%</td>
              <td className="track-td-num">{Math.round(track.tireRate)}%</td>
              <td className="track-td-num">{Math.round(track.avgLeads)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Processed event with computed fields
type ProcessedEvent = Results['eventResults']['trackEvents'][0] & {
  affectedPct: number;
  affWinRate: number;
  affPodiumRate: number;
  affPointsRate: number;
  affFinishRate: number;
  unaffWinRate: number;
  unaffPodiumRate: number;
  unaffPointsRate: number;
  unaffFinishRate: number;
  winDelta: number;
  podiumDelta: number;
  pointsDelta: number;
  finishDelta: number;
};

function EventsTab({ results }: { results: Results }) {
  const { eventResults } = results;
  const [activeSection, setActiveSection] = useState<'track' | 'tag'>('track');
  const [sortKey, setSortKey] = useState<EventSortKey>('races');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ProcessedEvent | null>(null);

  // Calculate derived values for events - comparing affected vs unaffected
  const processEvents = (events: typeof eventResults.trackEvents): ProcessedEvent[] => {
    return events.map(event => {
      const aff = event.affectedDriverRaces;
      const unaff = event.unaffectedDriverRaces;
      const totalInRaces = aff + unaff;

      // Affected driver rates
      const affWinRate = aff > 0 ? (event.affectedWins / aff) * 100 : 0;
      const affPodiumRate = aff > 0 ? (event.affectedPodiums / aff) * 100 : 0;
      const affPointsRate = aff > 0 ? (event.affectedPointsFinishes / aff) * 100 : 0;
      const affFinishRate = aff > 0 ? ((aff - event.affectedDNFs) / aff) * 100 : 0;

      // Unaffected driver rates (baseline for this event)
      const unaffWinRate = unaff > 0 ? (event.unaffectedWins / unaff) * 100 : 0;
      const unaffPodiumRate = unaff > 0 ? (event.unaffectedPodiums / unaff) * 100 : 0;
      const unaffPointsRate = unaff > 0 ? (event.unaffectedPointsFinishes / unaff) * 100 : 0;
      const unaffFinishRate = unaff > 0 ? ((unaff - event.unaffectedDNFs) / unaff) * 100 : 0;

      // Deltas: how much better/worse affected drivers perform vs unaffected
      const winDelta = affWinRate - unaffWinRate;
      const podiumDelta = affPodiumRate - unaffPodiumRate;
      const pointsDelta = affPointsRate - unaffPointsRate;
      const finishDelta = affFinishRate - unaffFinishRate;

      // Affected percentage
      const affectedPct = totalInRaces > 0 ? (aff / totalInRaces) * 100 : 0;

      return {
        ...event,
        affectedPct,
        affWinRate,
        affPodiumRate,
        affPointsRate,
        affFinishRate,
        unaffWinRate,
        unaffPodiumRate,
        unaffPointsRate,
        unaffFinishRate,
        winDelta,
        podiumDelta,
        pointsDelta,
        finishDelta,
      };
    });
  };

  const trackEventsProcessed = processEvents(eventResults.trackEvents);
  const tagEventsProcessed = processEvents(eventResults.tagEvents);

  const currentEvents = activeSection === 'track' ? trackEventsProcessed : tagEventsProcessed;

  // Sort events
  const sorted = [...currentEvents].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = a.eventName.localeCompare(b.eventName); break;
      case 'races': cmp = a.racesTriggered - b.racesTriggered; break;
      case 'triggers': cmp = a.totalTriggers - b.totalTriggers; break;
      case 'affectedPct': cmp = a.affectedPct - b.affectedPct; break;
      case 'winDelta': cmp = a.winDelta - b.winDelta; break;
      case 'podiumDelta': cmp = a.podiumDelta - b.podiumDelta; break;
      case 'pointsDelta': cmp = a.pointsDelta - b.pointsDelta; break;
      case 'finishDelta': cmp = a.finishDelta - b.finishDelta; break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: EventSortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name');
    }
  };

  const SortIndicator = ({ column }: { column: EventSortKey }) => {
    if (sortKey !== column) return null;
    return <span className="sort-indicator">{sortAsc ? ' ▲' : ' ▼'}</span>;
  };

  // Helper to get color class based on delta value
  const getDeltaClass = (delta: number, threshold: number = 1) => {
    if (delta > threshold) return 'positive';
    if (delta < -threshold) return 'negative';
    return '';
  };

  // Format delta as +X% or -X%, or "—" if no affected drivers
  const formatDelta = (delta: number, hasAffected: boolean) => {
    if (!hasAffected) return '—';
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${Math.round(delta)}%`;
  };

  return (
    <div className="tab-events">
      <div className="events-section-selector">
        <button
          className={activeSection === 'track' ? 'active' : ''}
          onClick={() => setActiveSection('track')}
        >
          Track Events ({eventResults.trackEvents.length})
        </button>
        <button
          className={activeSection === 'tag' ? 'active' : ''}
          onClick={() => setActiveSection('tag')}
        >
          Tag Events ({eventResults.tagEvents.length})
        </button>
      </div>

      <p className="events-desc">
        {activeSection === 'track'
          ? 'Comparing affected vs unaffected drivers. Deltas show how much better/worse affected drivers perform.'
          : 'Comparing affected vs unaffected drivers. Deltas show how much better/worse affected drivers perform.'}
      </p>

      {sorted.length === 0 ? (
        <p className="no-data">No {activeSection} events recorded</p>
      ) : (
        <table className="events-table">
          <thead>
            <tr>
              <th className="event-th-emoji"></th>
              <th className="event-th-name" onClick={() => handleSort('name')}>
                Event<SortIndicator column="name" />
              </th>
              <th className="event-th-num" onClick={() => handleSort('races')}>
                Races<SortIndicator column="races" />
              </th>
              <th className="event-th-num" onClick={() => handleSort('triggers')}>
                Triggers<SortIndicator column="triggers" />
              </th>
              <th className="event-th-num" onClick={() => handleSort('affectedPct')}>
                Affected %<SortIndicator column="affectedPct" />
              </th>
              <th className="event-th-num" onClick={() => handleSort('winDelta')}>
                Win Δ<SortIndicator column="winDelta" />
              </th>
              <th className="event-th-num" onClick={() => handleSort('podiumDelta')}>
                Podium Δ<SortIndicator column="podiumDelta" />
              </th>
              <th className="event-th-num" onClick={() => handleSort('pointsDelta')}>
                Points Δ<SortIndicator column="pointsDelta" />
              </th>
              <th className="event-th-num" onClick={() => handleSort('finishDelta')}>
                Finish Δ<SortIndicator column="finishDelta" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(event => (
              <tr
                key={event.eventId}
                className="event-row-clickable"
                onClick={() => setSelectedEvent(event)}
              >
                <td className="event-td-emoji">{event.eventEmoji}</td>
                <td className="event-td-name">{event.eventName}</td>
                <td className="event-td-num">{event.racesTriggered}</td>
                <td className="event-td-num">{event.totalTriggers.toLocaleString()}</td>
                <td className="event-td-num">{Math.round(event.affectedPct)}%</td>
                <td className={`event-td-num ${event.affectedDriverRaces > 0 ? getDeltaClass(event.winDelta, 1) : ''}`}>
                  {formatDelta(event.winDelta, event.affectedDriverRaces > 0)}
                </td>
                <td className={`event-td-num ${event.affectedDriverRaces > 0 ? getDeltaClass(event.podiumDelta, 2) : ''}`}>
                  {formatDelta(event.podiumDelta, event.affectedDriverRaces > 0)}
                </td>
                <td className={`event-td-num ${event.affectedDriverRaces > 0 ? getDeltaClass(event.pointsDelta, 3) : ''}`}>
                  {formatDelta(event.pointsDelta, event.affectedDriverRaces > 0)}
                </td>
                <td className={`event-td-num ${event.affectedDriverRaces > 0 ? getDeltaClass(event.finishDelta, 3) : ''}`}>
                  {formatDelta(event.finishDelta, event.affectedDriverRaces > 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="events-legend">
        <h4>How to Read</h4>
        <ul>
          <li><strong>Affected %:</strong> % of drivers in event races who were affected</li>
          <li><strong>Win Δ:</strong> Affected win rate minus unaffected win rate</li>
          <li><strong>Podium Δ:</strong> Affected podium rate minus unaffected podium rate</li>
          <li><strong>Points Δ:</strong> Affected points rate minus unaffected points rate</li>
          <li><strong>Finish Δ:</strong> Affected finish rate minus unaffected finish rate</li>
        </ul>
      </div>

      {selectedEvent && (
        <div className="event-popup-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="event-popup" onClick={e => e.stopPropagation()}>
            <button className="event-popup-close" onClick={() => setSelectedEvent(null)}>×</button>
            <div className="event-popup-header">
              <span className="event-popup-emoji">{selectedEvent.eventEmoji}</span>
              <span className="event-popup-name">{selectedEvent.eventName}</span>
            </div>
            <span className="event-popup-source">
              {selectedEvent.eventSource === 'track' ? '🏁 Track Event' : `🏷️ ${selectedEvent.tagType} Tag`}
            </span>
            {selectedEvent.description && (
              <p className="event-popup-desc">{selectedEvent.description}</p>
            )}
            {selectedEvent.flavorText && (
              <p className="event-popup-flavor">"{selectedEvent.flavorText}"</p>
            )}
            <div className="event-popup-stats">
              <div className="event-popup-stat">
                <span className="event-popup-stat-value">{selectedEvent.racesTriggered}</span>
                <span className="event-popup-stat-label">Races</span>
              </div>
              <div className="event-popup-stat">
                <span className="event-popup-stat-value">{selectedEvent.totalTriggers.toLocaleString()}</span>
                <span className="event-popup-stat-label">Triggers</span>
              </div>
              <div className="event-popup-stat">
                <span className="event-popup-stat-value">{Math.round(selectedEvent.affectedPct)}%</span>
                <span className="event-popup-stat-label">Affected %</span>
              </div>
              <div className="event-popup-stat">
                <span className={`event-popup-stat-value ${selectedEvent.affectedDriverRaces > 0 ? getDeltaClass(selectedEvent.winDelta, 1) : ''}`}>
                  {formatDelta(selectedEvent.winDelta, selectedEvent.affectedDriverRaces > 0)}
                </span>
                <span className="event-popup-stat-label">Win Δ</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
