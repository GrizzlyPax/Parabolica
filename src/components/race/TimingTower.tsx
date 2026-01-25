// Timing Tower - shared component for Track and Detail views
// Uses column configuration for flexible rendering
import { useMemo } from 'react';
import DriverRow from './DriverRow';
import { getGridTemplate } from './columns';
import { formatGap } from '../../utils/raceTime';
import { calculateLiveBetStatus } from '../../MarbleMode';
import type { TimingTowerProps, RowContext, BetInfo, LapTimeClass } from './types';
import type { Driver } from '../../RaceEngine';
import './TimingTower.css';
import './components.css';

function TimingTower({
  drivers,
  columns,
  raceState,
  totalLaps,
  lapLength: _lapLength, // Reserved for future gap calculation refinement
  activeBets = [],
  focusedDriverIds = new Set(),
  onDriverClick,
  condensed: _condensed = false, // Reserved for future styling differences
  statusEffects,
  positionDeltas,
  fastestLapOverall,
  className = '',
}: TimingTowerProps) {
  const { finishOrder } = raceState;

  // Sort drivers by position
  const sortedDrivers = useMemo(() => {
    // Finished drivers sorted by finish order
    const finished = drivers
      .filter(d => d.status === 'finished')
      .sort((a, b) => {
        const aIdx = finishOrder.indexOf(a.id);
        const bIdx = finishOrder.indexOf(b.id);
        return aIdx - bIdx;
      });

    // DNF drivers sorted by when they DNF'd (further = better)
    const dnf = drivers
      .filter(d => d.status === 'dnf')
      .sort((a, b) => b.position - a.position);

    // Racing drivers sorted by position
    const racing = drivers
      .filter(d => d.status !== 'finished' && d.status !== 'dnf')
      .sort((a, b) => b.position - a.position);

    return [...finished, ...racing, ...dnf];
  }, [drivers, finishOrder]);

  // Calculate leader gap reference
  const leaderPosition = sortedDrivers[0]?.position || 0;

  // Generate row context for each driver
  const getRowContext = (driver: Driver, index: number): RowContext => {
    const isFinished = driver.status === 'finished';
    const isDNF = driver.status === 'dnf';
    const isPitting = driver.status === 'pitting';
    const isFocused = focusedDriverIds.has(driver.id);

    // Display position
    let displayPosition: string;
    if (isFinished) {
      const finishPos = finishOrder.indexOf(driver.id);
      displayPosition = `${finishPos + 1}`;
    } else if (isDNF) {
      displayPosition = 'DNF';
    } else {
      displayPosition = `${index + 1}`;
    }

    // Position delta
    const positionDelta = positionDeltas?.get(driver.id);

    // Gap calculations
    let intervalGap = '';
    let leaderGap = '';

    if (index === 0) {
      intervalGap = '-';
      leaderGap = 'Leader';
    } else if (!isFinished && !isDNF) {
      const prevDriver = sortedDrivers[index - 1];
      const gapToPrev = prevDriver ? (prevDriver.position - driver.position) : 0;
      const gapToLeader = leaderPosition - driver.position;

      // Convert distance to approximate time gap (based on average speed)
      const avgSpeed = driver.stats?.baseSpeed || 1;
      const ticksPerUnit = 1 / avgSpeed;

      intervalGap = formatGap(gapToPrev * ticksPerUnit * 10);
      leaderGap = formatGap(gapToLeader * ticksPerUnit * 10);
    }

    // Lap times
    const lapTimes = driver.lapTimes || [];
    const lastLapTime = lapTimes.length > 0 ? lapTimes[lapTimes.length - 1] : null;
    const prevLapTime = lapTimes.length > 1 ? lapTimes[lapTimes.length - 2] : null;
    const bestLapTime = lapTimes.length > 0 ? Math.min(...lapTimes) : null;

    // Determine lap time colors
    let lastLapClass: LapTimeClass = '';
    if (lastLapTime !== null) {
      if (fastestLapOverall !== null && lastLapTime === fastestLapOverall) {
        lastLapClass = 'fastest';
      } else if (prevLapTime !== null && lastLapTime < prevLapTime) {
        lastLapClass = 'improved';
      } else {
        lastLapClass = 'slower';
      }
    }

    let bestLapClass: LapTimeClass = '';
    if (bestLapTime !== null && fastestLapOverall !== null && bestLapTime === fastestLapOverall) {
      bestLapClass = 'fastest';
    }

    // Status emoji
    const statusEmoji = statusEffects?.get(driver.id);

    // Bet info
    let betInfo: BetInfo | undefined;
    if (activeBets.length > 0) {
      const betStatus = calculateLiveBetStatus(driver.id, index + 1, activeBets, isDNF);
      if (betStatus.status !== 'none') {
        betInfo = {
          totalAmount: betStatus.totalPotential,
          bets: betStatus.bets.map(b => ({
            type: getBetLabel(b.type),
            amount: b.amount,
            isWinning: b.isWinning,
          })),
          overallStatus: betStatus.status as 'winning' | 'losing' | 'pending',
        };
      }
    }

    return {
      displayPosition,
      positionDelta,
      intervalGap,
      leaderGap,
      lastLapTime,
      lastLapClass,
      bestLapTime,
      bestLapClass,
      statusEmoji,
      betInfo,
      isFocused,
      isFinished,
      isDNF,
      isPitting,
      // For tire history chart
      currentLap: driver.currentLap + 1,
      totalLaps,
    };
  };

  // Show all drivers (no longer filtering for condensed mode)
  const displayDrivers = sortedDrivers;

  // Grid template from columns
  const gridTemplate = getGridTemplate(columns);

  // Calculate current lap for header
  const currentLap = Math.max(1, ...sortedDrivers.map(d => d.currentLap + 1));

  const hasFocus = focusedDriverIds.size > 0;

  return (
    <div className={`timing-tower ${className} ${hasFocus ? 'has-focus' : ''}`}>
      {/* Lap header */}
      <div className="timing-tower-lap">
        <span className="lap-current">{currentLap}</span>
        <span className="lap-divider">/</span>
        <span className="lap-total">{totalLaps}</span>
      </div>

      {/* Column headers */}
      <div
        className="timing-tower-header"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {columns.map(col => (
          <div
            key={col.id}
            className={`timing-header-cell col-${col.id}`}
            style={{ textAlign: col.align }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Driver rows */}
      <div className="timing-tower-body">
        {displayDrivers.map((driver) => {
          const context = getRowContext(driver, sortedDrivers.indexOf(driver));
          return (
            <DriverRow
              key={driver.id}
              driver={driver}
              columns={columns}
              context={context}
              gridTemplate={gridTemplate}
              isFocused={focusedDriverIds.has(driver.id)}
              onClick={() => onDriverClick?.(driver.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// Helper: Get short labels for bet types
function getBetLabel(type: string): string {
  switch (type) {
    case 'win': return 'WIN';
    case 'podium': return 'POD';
    case 'points': return 'PTS';
    case 'finishes': return 'FIN';
    case 'dnf': return 'DNF';
    default: return type.slice(0, 3).toUpperCase();
  }
}

export default TimingTower;
