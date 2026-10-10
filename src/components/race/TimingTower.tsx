// Timing Tower - shared component for Track and Detail views
// Uses column configuration for flexible rendering
import { useMemo } from 'react';
import DriverRow from './DriverRow';
import { getGridTemplate } from './columns';
import { formatGap, formatLapGap } from '../../utils/raceTime';
import type { TimingTowerProps, RowContext, LapTimeClass } from './types';
import { rosterRanks } from '../../betting/utils';
import { fantasyOwners, fantasyHex } from '../../fantasy/types';
import '../../fantasy/Fantasy.css';
import type { Driver } from '../../RaceEngine';
import './TimingTower.css';
import './components.css';

// Suffixes to ignore when extracting surname
const NAME_SUFFIXES = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);

// Helper to extract surname for alphabetical sorting
function getSurname(driver: Driver): string {
  const parts = driver.name.split(' ').filter(p => p.length > 0);
  const filteredParts = parts.filter(p => !NAME_SUFFIXES.has(p.toUpperCase()));
  return (filteredParts[filteredParts.length - 1] || parts[parts.length - 1] || '').toUpperCase();
}

function TimingTower({
  drivers,
  columns,
  raceState,
  totalLaps,
  lapLength: _lapLength, // No longer used - pure sector-based timing
  focusedDriverIds = new Set(),
  onDriverClick,
  onDriverCard,
  condensed: _condensed = false, // Reserved for future styling differences
  expandable = true, // Show expanded row details on focus
  statusEffects,
  effectStacks,
  histories,
  positionDeltas,
  gridOrder,
  battles,
  fastestLapOverall,
  fantasy,
  sealed,
  mine,
  nemesis,
  avatars,
  className = '',
}: TimingTowerProps) {
  const { finishOrder } = raceState;

  // Total sector crossings - used as dependency to force re-sort when any driver crosses a sector
  // This catches cases where driver objects are mutated but array reference stays same
  const totalSectorCrossings = drivers.reduce((sum, d) => sum + (d.sectorTimes?.length || 0), 0);

  // Sort drivers by completed sectors (more sectors = higher position)
  // Order only changes when sector boundaries are crossed
  const sortedDrivers = useMemo(() => {
    // Finished drivers sorted by finish order
    const finished = drivers
      .filter(d => d.status === 'finished')
      .sort((a, b) => {
        const aIdx = finishOrder.indexOf(a.id);
        const bIdx = finishOrder.indexOf(b.id);
        return aIdx - bIdx;
      });

    // DNF drivers sorted by sectors completed when they DNF'd
    const dnf = drivers
      .filter(d => d.status === 'dnf')
      .sort((a, b) => {
        const aSectors = a.sectorTimes?.length || 0;
        const bSectors = b.sectorTimes?.length || 0;
        if (bSectors !== aSectors) return bSectors - aSectors;
        return getSurname(a).localeCompare(getSurname(b));
      });

    // Racing drivers sorted by sectors completed, then by time at last sector
    // If same sectors, whoever crossed that sector FIRST is ahead
    const racing = drivers
      .filter(d => d.status !== 'finished' && d.status !== 'dnf')
      .sort((a, b) => {
        const aSectors = a.sectorTimes?.length || 0;
        const bSectors = b.sectorTimes?.length || 0;
        if (bSectors !== aSectors) return bSectors - aSectors;
        // Same sectors: compare time at last sector (lower = crossed first = ahead)
        if (aSectors > 0 && bSectors > 0) {
          const aTime = a.sectorTimes![aSectors - 1];
          const bTime = b.sectorTimes![bSectors - 1];
          if (aTime !== bTime) return aTime - bTime;
        }
        // Race start: the grid order; then surname for equal times
        if (gridOrder && gridOrder.length) {
          const ga = gridOrder.indexOf(a.id), gb = gridOrder.indexOf(b.id);
          if (ga !== gb) return ga - gb;
        }
        return getSurname(a).localeCompare(getSurname(b));
      });

    return [...finished, ...racing, ...dnf];
  }, [drivers, finishOrder, totalSectorCrossings, gridOrder]);

  // Generate row context for each driver
  // How each driver and car stacks up against this grid. Keyed on the stats
  // themselves (a new universe can reuse the same driver ids), so it only
  // recomputes when the roster's numbers change, not every tick.
  const rosterKey = drivers.map(d => `${d.id}:${d.stats.baseSpeed}:${d.stats.consistency}:${d.stats.luck}:${d.carStats?.power}:${d.carStats?.grip}:${d.carStats?.reliability}:${d.teamStats?.pitCrew}`).join('|');
  const fieldRanking = useMemo(() => rosterRanks(drivers), [rosterKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const fantasyBy = useMemo(() => { const m = new Map<number, { name: string; color: string }>(); for (const [id, t] of fantasyOwners(fantasy)) m.set(id, { name: t.name, color: fantasyHex(t.color) }); return m; }, [fantasy]);

  const getRowContext = (driver: Driver, index: number): RowContext => {
    const isFinished = driver.status === 'finished';
    const isDNF = driver.status === 'dnf';
    const isPitting = driver.status === 'pitting';
    const isFocused = focusedDriverIds.has(driver.id);
    const isSealed = sealed?.has(driver.id) ?? false;

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
    const gridIdx = gridOrder ? gridOrder.indexOf(driver.id) : -1;
    const gridSlot = gridIdx >= 0 ? gridIdx + 1 : undefined;
    let battle: RowContext['battle'];
    if (battles) {
      const att = battles.find(b => b.chaserId === driver.id);
      const def = battles.find(b => b.aheadId === driver.id);
      if (att) battle = { role: 'attacking', ticks: att.ticks, otherId: att.aheadId };
      else if (def) battle = { role: 'defending', ticks: def.ticks, otherId: def.chaserId };
    }

    // Gap calculations - SECTOR-based checkpoint timing
    // Gap = time difference at the DRIVER's last completed sector
    // sectorTimes format: [S1_L1, S2_L1, S3_L1, S1_L2, S2_L2, S3_L2, ...]
    let intervalGap = '-';
    let leaderGap = '-';

    // Helper: Get sector count (how many sector crossings)
    const getSectorCount = (d: Driver): number => d.sectorTimes?.length || 0;

    // Helper: Get time at a specific sector index
    const getTimeAtSector = (d: Driver, sectorIdx: number): number | null => {
      const sectors = d.sectorTimes || [];
      if (sectorIdx < 0 || sectorIdx >= sectors.length) return null;
      return sectors[sectorIdx]; // sectorTimes stores cumulative race time
    };

    if (index === 0) {
      leaderGap = 'Leader';
    } else if (isFinished) {
      // Keep defaults
    } else if (isDNF) {
      leaderGap = 'DNF';
    } else {
      const leader = sortedDrivers[0];
      const prevDriver = sortedDrivers[index - 1];

      // Use driver's completed sectors as the checkpoint
      const driverSectors = getSectorCount(driver);
      const leaderSectors = getSectorCount(leader);

      // Pure sector-based lapping detection (no position data)
      // Lapped = leader is 1 lap (3 sectors) + 1 sector ahead = 4+ sectors
      // Formula: lapsDown = floor((sectorDiff - 1) / 3)
      // Examples: 4 sectors ahead = 1 lap down, 7 sectors = 2 laps down
      const sectorDiff = leaderSectors - driverSectors;
      const lapsDown = Math.max(0, Math.floor((sectorDiff - 1) / 3));

      if (lapsDown >= 1) {
        leaderGap = formatLapGap(lapsDown);
      } else if (driverSectors > 0) {
        // Driver has completed at least 1 sector - compare at that checkpoint
        const checkpointIdx = driverSectors - 1; // Last sector the driver crossed
        const driverTime = getTimeAtSector(driver, checkpointIdx);
        const leaderTime = getTimeAtSector(leader, checkpointIdx);

        if (driverTime !== null && leaderTime !== null) {
          leaderGap = formatGap(driverTime - leaderTime);
        }
        // else keep "-" (leader hasn't reached this checkpoint yet - rare edge case)
      }
      // else no sectors completed yet - keep "-"

      // Interval to car ahead (same pure sector logic)
      if (prevDriver) {
        const prevSectors = getSectorCount(prevDriver);
        const prevSectorDiff = prevSectors - driverSectors;
        const lapsDownToPrev = Math.max(0, Math.floor((prevSectorDiff - 1) / 3));

        if (lapsDownToPrev >= 1) {
          intervalGap = formatLapGap(lapsDownToPrev);
        } else if (driverSectors > 0) {
          const checkpointIdx = driverSectors - 1;
          const driverTime = getTimeAtSector(driver, checkpointIdx);
          const prevTime = getTimeAtSector(prevDriver, checkpointIdx);

          if (driverTime !== null && prevTime !== null) {
            intervalGap = formatGap(driverTime - prevTime);
          }
        }
      }
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

    return {
      displayPosition,
      positionDelta,
      gridSlot,
      // A rival keeps only the read (Front / Middle / Back) from its rank; the panel shows no numbers.
      driverRank: fieldRanking.driver.get(driver.id),
      carRank: isSealed ? undefined : fieldRanking.car.get(driver.id),
      sealed: isSealed || undefined,
      mine: mine?.has(driver.id) || undefined,
      nemesis: nemesis?.has(driver.id) || undefined,
      avatar: avatars?.get(driver.id),
      fantasyTeam: fantasyBy.get(driver.id),
      battle,
      intervalGap,
      leaderGap,
      lastLapTime,
      lastLapClass,
      bestLapTime,
      bestLapClass,
      statusEmoji,
      effectStack: isSealed ? undefined : effectStacks?.get(driver.id),
      history: histories?.get(driver.id),
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

  const hasFocus = focusedDriverIds.size > 0;

  return (
    <div className={`timing-tower ${className} ${hasFocus ? 'has-focus' : ''}`}>
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
              expandable={expandable}
              onClick={() => onDriverClick?.(driver.id)}
              onCard={onDriverCard ? () => onDriverCard(driver.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

export default TimingTower;
