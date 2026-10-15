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
import { isOutOfRace, type Driver } from '../../RaceEngine';
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
  window,
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
    // Cars a cut took (#694): the latest cut first, then by sectors, apart from the DNFs
    const eliminated = drivers
      .filter(d => d.status === 'eliminated')
      .sort((a, b) => (b.eliminatedLap ?? 0) - (a.eliminatedLap ?? 0) || (b.sectorTimes?.length || 0) - (a.sectorTimes?.length || 0) || getSurname(a).localeCompare(getSurname(b)));

    // Racing drivers sorted by sectors completed, then by time at last sector
    // If same sectors, whoever crossed that sector FIRST is ahead
    const racing = drivers
      .filter(d => d.status !== 'finished' && !isOutOfRace(d))
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

    return [...finished, ...racing, ...eliminated, ...dnf];
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
    const isEliminated = driver.status === 'eliminated';
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
    } else if (isEliminated) {
      displayPosition = 'OUT';
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
    } else if (isEliminated) {
      leaderGap = `Cut L${driver.eliminatedLap ?? '?'}`;
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
      isEliminated,
      isPitting,
      // For tire history chart
      currentLap: driver.currentLap + 1,
      totalLaps,
    };
  };

  // The Hundred's window (#694): the leaders, your cars (with a neighbour each), the cars either side of the
  // next cut line, your cars that are out; everything else folds into "+N running" / "N out" rows.
  type Item = { kind: 'row'; driver: Driver } | { kind: 'gap'; key: string; label: string } | { kind: 'cut'; key: string; label: string };
  const items = useMemo((): Item[] => {
    if (!window) return sortedDrivers.map(d => ({ kind: 'row' as const, driver: d }));
    const running = sortedDrivers.filter(d => !isOutOfRace(d));
    const out = sortedDrivers.filter(d => isOutOfRace(d));
    const teamOf = (d: Driver) => d.kingdomId ?? d.teamName ?? String(d.id);
    // Teams ranked by their best-placed running car; the line falls before the first car of a team outside `keep`.
    const ranked: string[] = [];
    for (const d of running) if (!ranked.includes(teamOf(d))) ranked.push(teamOf(d));
    const kept = new Set(ranked.slice(0, window.keep));
    const cutIndex = running.findIndex(d => !kept.has(teamOf(d)));
    const show = new Set<number>();
    for (let i = 0; i < Math.min(3, running.length); i++) show.add(i);
    running.forEach((d, i) => { if (mine?.has(d.id) || focusedDriverIds.has(d.id)) { show.add(i); if (i > 0) show.add(i - 1); if (i + 1 < running.length) show.add(i + 1); } });
    if (cutIndex > 0) for (let i = Math.max(0, cutIndex - 2); i < Math.min(running.length, cutIndex + 2); i++) show.add(i);
    const list: Item[] = [];
    let hidden = 0;
    const flush = (at: number) => { if (hidden) { list.push({ kind: 'gap', key: `gap-${at}`, label: `+${hidden} running` }); hidden = 0; } };
    running.forEach((d, i) => {
      if (cutIndex > 0 && i === cutIndex) { flush(i); list.push({ kind: 'cut', key: 'cut', label: `The cut · ${window.keep} states go on` }); }
      if (show.has(i)) { flush(i); list.push({ kind: 'row', driver: d }); } else hidden++;
    });
    flush(running.length);
    const mineOut = out.filter(d => mine?.has(d.id) || focusedDriverIds.has(d.id));
    for (const d of mineOut) list.push({ kind: 'row', driver: d });
    const rest = out.length - mineOut.length;
    if (rest) list.push({ kind: 'gap', key: 'out', label: `${rest} out` });
    return list;
  }, [sortedDrivers, window, mine, focusedDriverIds]);

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
        {items.map((item) => {
          if (item.kind === 'gap') return <div key={item.key} className="timing-row timing-gap" aria-label={item.label}>{item.label}</div>;
          if (item.kind === 'cut') return <div key={item.key} className="timing-row timing-cut" aria-label={item.label}>{item.label}</div>;
          const { driver } = item;
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
