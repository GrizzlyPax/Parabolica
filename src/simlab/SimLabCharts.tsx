import type { StatBucket, TagPerformance, StatBucketResults } from './types';

// === HORIZONTAL BAR CHART ===

interface BarChartItem {
  label: string;
  value: number;
  emoji?: string;
  color?: string;
}

interface BarChartProps {
  data: BarChartItem[];
  maxValue?: number;
  formatValue?: (v: number) => string;
  showPercent?: boolean;
}

export function HorizontalBarChart({
  data,
  maxValue,
  formatValue = v => v.toFixed(1),
  showPercent = false,
}: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map(d => d.value), 0.01);

  return (
    <div className="bar-chart">
      {data.map((item, i) => (
        <div key={i} className="bar-row">
          <span className="bar-label">
            {item.emoji && <span className="bar-emoji">{item.emoji}</span>}
            {item.label}
          </span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${Math.min((item.value / max) * 100, 100)}%`,
                backgroundColor: item.color ?? 'var(--accent-green)',
              }}
            />
          </div>
          <span className="bar-value">
            {showPercent ? `${Math.round(item.value * 100)}%` : formatValue(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// === STAT IMPACT TABLE (Dashboard View) ===

export interface StatImpactRow {
  statKey: string;
  name: string;
  lowLabel: string;
  highLabel: string;
  lowValue: number;
  highValue: number;
  delta: number;
  impactScore: number; // 0-100 normalized
  contribution: number; // % of total impact (adds to 100%)
  isInverted?: boolean; // True for avgPosition where lower is better
  category: 'driver' | 'car' | 'team';
}

export type StatMetric = 'winRate' | 'podiumRate' | 'pointsRate' | 'finishRate';

interface StatImpactTableProps {
  statBuckets: StatBucketResults;
  metric: StatMetric;
  onStatClick?: (statKey: string, row: StatImpactRow) => void;
}

export function StatImpactTable({ statBuckets, metric, onStatClick }: StatImpactTableProps) {
  const statLabels: Record<string, { name: string; isStarBased: boolean; category: 'driver' | 'car' | 'team' }> = {
    speed: { name: 'Speed', isStarBased: false, category: 'driver' },
    consistency: { name: 'Consistency', isStarBased: false, category: 'driver' },
    luck: { name: 'Luck', isStarBased: false, category: 'driver' },
    acceleration: { name: 'Acceleration', isStarBased: false, category: 'driver' },
    endurance: { name: 'Endurance', isStarBased: false, category: 'driver' },
    aggression: { name: 'Aggression', isStarBased: false, category: 'driver' },
    carPower: { name: 'Power', isStarBased: true, category: 'car' },
    carGrip: { name: 'Grip', isStarBased: true, category: 'car' },
    carReliability: { name: 'Reliability', isStarBased: true, category: 'car' },
    pitCrew: { name: 'Pit Crew', isStarBased: true, category: 'team' },
    tireManagement: { name: 'Tire Mgmt', isStarBased: true, category: 'team' },
  };

  const getValue = (bucket: StatBucket): number => {
    if (bucket.entries === 0) return 0;
    switch (metric) {
      case 'winRate': return bucket.wins / bucket.entries;
      case 'podiumRate': return bucket.podiums / bucket.entries;
      case 'pointsRate': return bucket.pointsFinishes / bucket.entries;
      case 'finishRate': return (bucket.entries - bucket.dnfs) / bucket.entries;
    }
  };

  const formatValue = (v: number): string => {
    return `${Math.round(v * 100)}%`;
  };

  const isInverted = false;

  // Calculate impact for each stat
  const rows: StatImpactRow[] = Object.entries(statBuckets).map(([statName, buckets]) => {
    const info = statLabels[statName] || { name: statName, isStarBased: false, category: 'driver' as const };
    const lowBucket = buckets[0]; // Q1 or 1★
    const highBucket = buckets[4]; // Q5 or 5★
    const lowValue = getValue(lowBucket);
    const highValue = getValue(highBucket);

    // Delta: how much better is high vs low
    const delta = isInverted ? lowValue - highValue : highValue - lowValue;

    return {
      statKey: statName,
      name: info.name,
      lowLabel: info.isStarBased ? '1★' : 'Q1',
      highLabel: info.isStarBased ? '5★' : 'Q5',
      lowValue,
      highValue,
      delta,
      impactScore: 0, // Will normalize below
      contribution: 0, // Will calculate below
      isInverted,
      category: info.category,
    };
  });

  // Calculate total delta for contribution %
  const totalDelta = rows.reduce((sum, r) => sum + Math.abs(r.delta), 0) || 0.001;

  // Normalize impact scores (0-100) and calculate contribution %
  const maxDelta = Math.max(...rows.map(r => Math.abs(r.delta)), 0.001);
  rows.forEach(r => {
    r.impactScore = (Math.abs(r.delta) / maxDelta) * 100;
    r.contribution = (Math.abs(r.delta) / totalDelta) * 100;
  });

  // Group by category, sorted by impact within each group
  const driverStats = rows.filter(r => r.category === 'driver').sort((a, b) => b.impactScore - a.impactScore);
  const carStats = rows.filter(r => r.category === 'car').sort((a, b) => b.impactScore - a.impactScore);
  const teamStats = rows.filter(r => r.category === 'team').sort((a, b) => b.impactScore - a.impactScore);

  // Calculate group totals
  const driverWeight = driverStats.reduce((sum, r) => sum + r.contribution, 0);
  const carWeight = carStats.reduce((sum, r) => sum + r.contribution, 0);
  const teamWeight = teamStats.reduce((sum, r) => sum + r.contribution, 0);

  // Get color based on impact
  const getImpactColor = (score: number): string => {
    if (score >= 80) return '#a855f7'; // purple - high impact
    if (score >= 60) return '#22c55e'; // green
    if (score >= 40) return '#eab308'; // yellow
    if (score >= 20) return '#f97316'; // orange
    return '#ef4444'; // red - low impact
  };

  const renderRow = (row: StatImpactRow) => (
    <div
      key={row.name}
      className={`impact-row ${onStatClick ? 'clickable' : ''}`}
      onClick={() => onStatClick?.(row.statKey, row)}
    >
      <span className="impact-col-name">{row.name}</span>
      <span className="impact-col-low">
        <span className="impact-label">{row.lowLabel}</span>
        <span className="impact-value">{formatValue(row.lowValue)}</span>
      </span>
      <span className="impact-col-high">
        <span className="impact-label">{row.highLabel}</span>
        <span className="impact-value">{formatValue(row.highValue)}</span>
      </span>
      <span className="impact-col-contrib">
        {Math.round(row.contribution)}%
      </span>
      <span className="impact-col-bar">
        <div className="impact-bar-track">
          <div
            className="impact-bar-fill"
            style={{
              width: `${row.impactScore}%`,
              backgroundColor: getImpactColor(row.impactScore),
            }}
          />
        </div>
      </span>
    </div>
  );

  return (
    <div className="stat-impact-table">
      <div className="impact-header">
        <span className="impact-col-name">Stat</span>
        <span className="impact-col-low">Low</span>
        <span className="impact-col-high">High</span>
        <span className="impact-col-contrib">Weight</span>
        <span className="impact-col-bar"></span>
      </div>

      <div className="impact-group-label">
        <span>Driver Stats</span>
        <span className="group-weight">{Math.round(driverWeight)}%</span>
      </div>
      {driverStats.map(renderRow)}

      <div className="impact-group-label">
        <span>Car Stats</span>
        <span className="group-weight">{Math.round(carWeight)}%</span>
      </div>
      {carStats.map(renderRow)}

      <div className="impact-group-label">
        <span>Team Stats</span>
        <span className="group-weight">{Math.round(teamWeight)}%</span>
      </div>
      {teamStats.map(renderRow)}
    </div>
  );
}

// === STAT BUCKET CHART (Quintile Bars) ===

interface StatBucketChartProps {
  buckets: StatBucket[];
  metric: StatMetric;
  label: string;
  isStarBased?: boolean; // True for car/team stats (1-5 stars instead of quintiles)
}

// Color grades by bucket position (1=worst → 5=best)
const PERFORMANCE_COLORS = {
  best: '#a855f7',    // purple - elite
  good: '#22c55e',    // green - good
  average: '#eab308', // yellow - average
  poor: '#f97316',    // orange - below average
  worst: '#ef4444',   // red - poor
};

export function StatBucketChart({ buckets, metric, label, isStarBased }: StatBucketChartProps) {
  const getValue = (bucket: StatBucket): number => {
    if (bucket.entries === 0) return 0;
    switch (metric) {
      case 'winRate':
        return bucket.wins / bucket.entries;
      case 'podiumRate':
        return bucket.podiums / bucket.entries;
      case 'pointsRate':
        return bucket.pointsFinishes / bucket.entries;
      case 'finishRate':
        return (bucket.entries - bucket.dnfs) / bucket.entries;
    }
  };

  const formatValue = (v: number): string => {
    return `${Math.round(v * 100)}%`;
  };

  const values = buckets.map(getValue);

  // Absolute scale: 100% bar height = 100% of the metric
  // So a 14% win rate shows as 14% filled bar
  const getAbsoluteMax = (): number => {
    return 1.0; // All metrics are percentages now
  };
  const maxVal = getAbsoluteMax();

  // Color by bucket position: Q5/5★ = best (purple), Q1/1★ = worst (red)
  // Colors array from worst to best (bucket 1 to 5)
  const BUCKET_COLORS = [
    PERFORMANCE_COLORS.worst,   // bucket 1
    PERFORMANCE_COLORS.poor,    // bucket 2
    PERFORMANCE_COLORS.average, // bucket 3
    PERFORMANCE_COLORS.good,    // bucket 4
    PERFORMANCE_COLORS.best,    // bucket 5
  ];

  // Labels: "Q1-Q5" for quintiles, "1★-5★" for star-based
  const getLabel = (bucketNum: number): string => {
    return isStarBased ? `${bucketNum}★` : `Q${bucketNum}`;
  };

  // Percentile ranges for tooltip
  const getPercentileRange = (bucketNum: number): string => {
    const ranges = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'];
    return ranges[bucketNum - 1] || '';
  };

  // Human-readable bucket description
  const getBucketDesc = (bucketNum: number): string => {
    if (isStarBased) {
      const descs = ['Worst rated', 'Below average', 'Average', 'Above average', 'Best rated'];
      return descs[bucketNum - 1] || '';
    }
    const descs = ['Bottom 20%', 'Below average', 'Middle', 'Above average', 'Top 20%'];
    return descs[bucketNum - 1] || '';
  };

  // Build tooltip text
  const getTooltip = (bucket: StatBucket, value: number): string => {
    const bucketLabel = getLabel(bucket.bucket);
    const desc = getBucketDesc(bucket.bucket);
    const range = isStarBased ? `(${bucket.bucket}/5 stars)` : `(${getPercentileRange(bucket.bucket)} of drivers)`;

    let valueExplain = '';
    if (metric === 'winRate') {
      valueExplain = `${Math.round(value * 100)}% of these drivers won their race`;
    } else if (metric === 'podiumRate') {
      valueExplain = `${Math.round(value * 100)}% finished in top 3`;
    } else if (metric === 'pointsRate') {
      valueExplain = `${Math.round(value * 100)}% finished in top 10 (earned points)`;
    } else if (metric === 'finishRate') {
      valueExplain = `${Math.round(value * 100)}% finished the race`;
    }

    return `${label} ${bucketLabel}\n${desc} ${range}\n\n${valueExplain}\n\nBased on ${bucket.entries.toLocaleString()} driver-races`;
  };

  // Total entries across all buckets
  const totalEntries = buckets.reduce((sum, b) => sum + b.entries, 0);

  return (
    <div className="stat-bucket-chart">
      <div className="chart-header">
        <h4>{label}</h4>
        <span className="chart-total">{totalEntries.toLocaleString()} races</span>
      </div>
      <div className="bucket-bars">
        {buckets.map((bucket, i) => {
          const value = values[i];
          const height = maxVal > 0 ? (value / maxVal) * 100 : 0;
          const color = BUCKET_COLORS[i]; // i is 0-4 for buckets 1-5
          const tooltip = getTooltip(bucket, value);

          return (
            <div key={bucket.bucket} className="bucket-column" title={tooltip}>
              <div className="bucket-bar-container">
                <div
                  className="bucket-bar"
                  style={{
                    height: `${height}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="bucket-label">{getLabel(bucket.bucket)}</span>
              <span className="bucket-value">{formatValue(value)}</span>
              <span className="bucket-count">n={bucket.entries.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
      <div className="bucket-legend">
        <span>{isStarBased ? 'Low ★' : 'Low stat'}</span>
        <span>{isStarBased ? 'High ★' : 'High stat'}</span>
      </div>
    </div>
  );
}

// === PIE CHART (SVG) ===

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  size?: number;
}

export function PieChart({ data, size = 140 }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="pie-chart empty">
        <p>No data</p>
      </div>
    );
  }

  const center = size / 2;
  const radius = size / 2 - 10;

  // Calculate pie slices
  let currentAngle = -90; // Start at top
  const slices = data.map(item => {
    const angle = (item.value / total) * 360;
    const slice = {
      ...item,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
    };
    currentAngle += angle;
    return slice;
  });

  // Convert angles to SVG arc path
  const describeArc = (startAngle: number, endAngle: number): string => {
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', center, center,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'Z',
    ].join(' ');
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  return (
    <div className="pie-chart">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {slices.map((slice, i) => (
          <path
            key={i}
            d={describeArc(slice.startAngle, slice.endAngle)}
            fill={slice.color}
          />
        ))}
      </svg>
      <div className="pie-legend">
        {data.map((item, i) => (
          <div key={i} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: item.color }} />
            <span className="legend-label">{item.label}</span>
            <span className="legend-value">{((item.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// === TAG IMPACT TABLE (Dashboard View) ===

interface TagImpactTableProps {
  tags: TagPerformance[];
  metric: StatMetric;
  baselineRate: number; // Average rate across all drivers
  tagType: 'driver' | 'car' | 'team';
  onTagClick?: (tag: TagPerformance) => void;
}

export function TagImpactTable({ tags, metric, baselineRate, tagType, onTagClick }: TagImpactTableProps) {
  if (tags.length === 0) {
    return <p className="no-data">No {tagType} tags recorded</p>;
  }

  const getValue = (tag: TagPerformance): number => {
    if (tag.appearances === 0) return 0;
    switch (metric) {
      case 'winRate': return tag.wins / tag.appearances;
      case 'podiumRate': return tag.podiums / tag.appearances;
      case 'pointsRate': return tag.pointsFinishes / tag.appearances;
      case 'finishRate': return (tag.appearances - tag.dnfs) / tag.appearances;
    }
  };

  const formatValue = (v: number): string => {
    return `${Math.round(v * 100)}%`;
  };

  const isInverted = false;

  // Calculate delta from baseline for each tag
  const rows = tags.map(tag => {
    const value = getValue(tag);
    const delta = isInverted ? baselineRate - value : value - baselineRate;
    return { tag, value, delta };
  });

  // Sort by delta (best performers first)
  rows.sort((a, b) => b.delta - a.delta);

  // Find max delta for bar scaling
  const maxDelta = Math.max(...rows.map(r => Math.abs(r.delta)), 0.001);

  return (
    <div className="tag-impact-table">
      <div className="tag-impact-header">
        <span className="tag-impact-col-name">Tag</span>
        <span className="tag-impact-col-races">Races</span>
        <span className="tag-impact-col-value">Value</span>
        <span className="tag-impact-col-delta">vs Avg</span>
        <span className="tag-impact-col-bar"></span>
      </div>
      {rows.map(({ tag, value, delta }) => {
        // Bar width is max 50% (half the track) scaled by how extreme this delta is
        const barWidthPct = (Math.abs(delta) / maxDelta) * 50;
        const isPositive = delta > 0;
        const barColor = isPositive ? '#22c55e' : '#ef4444';
        const deltaStr = delta > 0 ? `+${(delta * 100).toFixed(0)}%` : `${(delta * 100).toFixed(0)}%`;

        // Positive: bar starts at center (50%) and extends right
        // Negative: bar ends at center (50%), so starts at (50 - width)
        const barLeft = isPositive ? 50 : 50 - barWidthPct;

        return (
          <div
            key={tag.tagId}
            className={`tag-impact-row ${onTagClick ? 'clickable' : ''}`}
            onClick={() => onTagClick?.(tag)}
          >
            <span className="tag-impact-col-name">
              <span className="tag-emoji">{tag.tagEmoji}</span>
              {tag.tagName}
            </span>
            <span className="tag-impact-col-races">{tag.appearances.toLocaleString()}</span>
            <span className="tag-impact-col-value">{formatValue(value)}</span>
            <span className={`tag-impact-col-delta ${isPositive ? 'positive' : 'negative'}`}>
              {deltaStr}
            </span>
            <span className="tag-impact-col-bar">
              <div className="tag-impact-bar-track">
                <div
                  className="tag-impact-bar-fill"
                  style={{
                    width: `${barWidthPct}%`,
                    left: `${barLeft}%`,
                    backgroundColor: barColor,
                  }}
                />
                <div className="tag-impact-bar-center" />
              </div>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// === TAG TABLE (legacy) ===

interface TagTableProps {
  tags: TagPerformance[];
  showType?: boolean;
}

export function TagTable({ tags, showType }: TagTableProps) {
  if (tags.length === 0) {
    return <p className="no-data">No tags recorded</p>;
  }

  // Sort by win rate descending
  const sorted = [...tags].sort((a, b) => {
    const aRate = a.appearances > 0 ? a.wins / a.appearances : 0;
    const bRate = b.appearances > 0 ? b.wins / b.appearances : 0;
    return bRate - aRate;
  });

  return (
    <div className="tag-table">
      <div className="tag-header">
        <span className="tag-col-name">Tag</span>
        <span className="tag-col-stat">Races</span>
        <span className="tag-col-stat">Win%</span>
        <span className="tag-col-stat">Podium%</span>
        <span className="tag-col-stat">Avg Pos</span>
      </div>
      {sorted.map(tag => {
        const winRate = tag.appearances > 0 ? (tag.wins / tag.appearances) * 100 : 0;
        const podiumRate = tag.appearances > 0 ? (tag.podiums / tag.appearances) * 100 : 0;
        const avgPos = tag.appearances > 0 ? tag.totalFinishPosition / tag.appearances : 0;

        return (
          <div key={tag.tagId} className="tag-row">
            <span className="tag-col-name">
              <span className="tag-emoji">{tag.tagEmoji}</span>
              {tag.tagName}
              {showType && <span className="tag-type">({tag.tagType})</span>}
            </span>
            <span className="tag-col-stat">{tag.appearances}</span>
            <span className="tag-col-stat">{Math.round(winRate)}%</span>
            <span className="tag-col-stat">{Math.round(podiumRate)}%</span>
            <span className="tag-col-stat">P{avgPos.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

// === STAT COMPARISON GRID ===

interface StatComparisonProps {
  statBuckets: Record<string, StatBucket[]>;
  metric: StatMetric;
}

export function StatComparisonGrid({ statBuckets, metric }: StatComparisonProps) {
  const statLabels: Record<string, string> = {
    speed: 'Speed',
    consistency: 'Consistency',
    luck: 'Luck',
    acceleration: 'Acceleration',
    endurance: 'Endurance',
    aggression: 'Aggression',
    carPower: 'Car Power',
    carGrip: 'Car Grip',
    carReliability: 'Car Reliability',
    pitCrew: 'Pit Crew',
    tireManagement: 'Tire Mgmt',
  };

  return (
    <div className="stat-comparison-grid">
      {Object.entries(statBuckets).map(([statName, buckets]) => (
        <StatBucketChart
          key={statName}
          buckets={buckets}
          metric={metric}
          label={statLabels[statName] || statName}
        />
      ))}
    </div>
  );
}
