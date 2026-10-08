// Column definitions for TimingTower
// Each column has an id, header, width, alignment, and render function

import TeamStripe from './TeamStripe';
import LapTime from './LapTime';
import PositionDelta from './PositionDelta';
import TireHistory from './TireHistory';
import type { ColumnConfig, RowContext } from './types';
import { Driver } from '../../RaceEngine';
import TagChips, { EffectChips } from './TagChips';
import { CardFace } from '../../cards/CardFace';
import { CANON_VARIABLES } from '../../simlab/types';

// Suffixes to ignore when extracting surname
const NAME_SUFFIXES = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);

// Helper to get 3-letter driver code from surname (like F1: VER, HAM, NOR)
function getDriverCode(driver: Driver): string {
  // Always extract from full name (driver.name is "FirstName LastName")
  const parts = driver.name.split(' ').filter(p => p.length > 0);
  const filteredParts = parts.filter(p => !NAME_SUFFIXES.has(p.toUpperCase()));

  // Get surname (last filtered part)
  const surname = filteredParts[filteredParts.length - 1] || parts[parts.length - 1] || '';

  // If surname is too short, pad from previous word
  if (surname.length < 3 && filteredParts.length > 1) {
    const prev = filteredParts[filteredParts.length - 2];
    const combined = prev.slice(-1) + surname;
    return combined.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
  }

  // Clean and return first 3 chars of surname
  return surname.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
}

// Position column (P)
export const COLUMN_POSITION: ColumnConfig = {
  id: 'position',
  header: 'P',
  width: '32px',
  align: 'center',
  render: (_driver: Driver, ctx: RowContext) => (
    <span className={`position-number ${ctx.isFinished ? 'finished' : ''} ${ctx.isDNF ? 'dnf' : ''} ${ctx.isPitting ? 'pitting' : ''}`}
      title={_driver.penaltyTicks > 0 ? `Penalty: ${_driver.penaltyReason}` : undefined}>
      {ctx.isDNF ? 'DNF' : ctx.isPitting ? 'PIT' : ctx.displayPosition}
      {_driver.penaltyTicks > 0 && <span className="pos-penalty" aria-label="penalty">!</span>}
    </span>
  ),
};

// Team stripe column (4px color bar)
export const COLUMN_TEAM_STRIPE: ColumnConfig = {
  id: 'teamStripe',
  header: '',
  width: '4px',
  align: 'left',
  render: (driver: Driver) => <TeamStripe color={driver.color} />,
};

// Team marble column: the racing number in the team's ink on the team colour (#381)
export const COLUMN_TEAM_MARBLE: ColumnConfig = {
  id: 'teamMarble',
  header: '',
  width: '26px',
  align: 'center',
  render: (driver: Driver) => (
    <span
      className="team-marble"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: driver.color,
        color: driver.ink || '#fff',
        border: `2px solid ${driver.ink || '#fff'}`,
        fontSize: driver.number !== undefined ? '10px' : '12px',
        fontFamily: driver.number !== undefined ? 'var(--look-data, monospace)' : undefined,
        fontWeight: 600,
        lineHeight: 1,
        boxShadow: `0 0 6px ${driver.color}60`,
      }}
    >
      {driver.number ?? driver.emoji}
    </span>
  ),
};

// Driver code column (3-letter code in team color)
export const COLUMN_DRIVER_CODE: ColumnConfig = {
  id: 'driverCode',
  header: 'Driver',
  width: '46px', // Fixed width - just 3 letters
  align: 'left',
  render: (driver: Driver, ctx: RowContext) => (
    <span className={`driver-code ${ctx.isFocused ? 'focused' : ''}`}>
      {getDriverCode(driver)}
    </span>
  ),
};

// Full driver name column (for detail view)
export const COLUMN_DRIVER_FULL_NAME: ColumnConfig = {
  id: 'driverFullName',
  header: 'Driver',
  width: 'minmax(140px, 1.4fr)',
  align: 'left',
  render: (driver: Driver, ctx: RowContext) => (
    <>
      <span className={`driver-full-name ${ctx.isFocused ? 'focused' : ''}`}>
        {driver.name}
      </span>
      {ctx.fantasyTeam && <span className="fantasy-badge" style={{ '--fantasy-color': ctx.fantasyTeam.color } as React.CSSProperties}>{ctx.fantasyTeam.name}</span>}
    </>
  ),
};

// Team name column (for detail view)
export const COLUMN_TEAM_NAME: ColumnConfig = {
  id: 'teamName',
  header: 'Team',
  width: 'minmax(96px, 1fr)',
  align: 'left',
  render: (driver: Driver) => (
    <span className="team-name">
      {driver.teamName || ''}
    </span>
  ),
};

// Position delta column (shows ▲/▼ on position changes)
export const COLUMN_DELTA_POS: ColumnConfig = {
  id: 'deltaPos',
  header: '±',
  width: '36px',
  align: 'center',
  render: (_driver: Driver, ctx: RowContext) => (
    ctx.positionDelta !== undefined && ctx.positionDelta !== 0
      ? <PositionDelta delta={ctx.positionDelta} />
      : null
  ),
};

// Places gained/lost vs the starting grid (#246 pass 2)
export const COLUMN_GRID: ColumnConfig = {
  id: 'grid',
  header: 'Grid',
  width: '46px',
  align: 'center',
  render: (_driver: Driver, ctx: RowContext) => {
    if (ctx.gridSlot === undefined || ctx.isDNF) return <span className="muted-cell">—</span>;
    const now = Number(ctx.displayPosition);
    const d = Number.isFinite(now) ? ctx.gridSlot - now : 0;
    return (
      <span className="grid-cell" title={`Started P${ctx.gridSlot}`}>
        <span className="grid-slot">P{ctx.gridSlot}</span>
        {d !== 0 && <span className={`grid-delta ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? '▲' : '▼'}{Math.abs(d)}</span>}
      </span>
    );
  },
};

// Track view: just the places gained/lost since the grid
export const COLUMN_GRID_DELTA: ColumnConfig = {
  id: 'gridDelta',
  header: '',
  width: '30px',
  align: 'center',
  render: (_driver: Driver, ctx: RowContext) => {
    if (ctx.gridSlot === undefined || ctx.isDNF) return null;
    const now = Number(ctx.displayPosition);
    const d = Number.isFinite(now) ? ctx.gridSlot - now : 0;
    if (d === 0) return <span className="grid-delta flat" title={`Started P${ctx.gridSlot}`}>·</span>;
    return <span className={`grid-delta ${d > 0 ? 'up' : 'down'}`} title={`Started P${ctx.gridSlot}`}>{d > 0 ? '▲' : '▼'}{Math.abs(d)}</span>;
  },
};

/** Units/tick → km/h: a tick is 100 ms and a lap unit is a metre, so ×10 m/s ×3.6. */
export function kmh(unitsPerTick: number): number { return Math.round(unitsPerTick * 36); }

// Live speed, coloured against the pack (#246: no more "ticks")
export const COLUMN_SPEED: ColumnConfig = {
  id: 'speed',
  header: 'km/h',
  width: '54px',
  align: 'right',
  render: (driver: Driver, ctx: RowContext) => {
    if (driver.status !== 'racing' || driver.speedSmooth <= 0) return <span className="muted-cell">—</span>;
    const titles = { hot: 'Flying — well above the pack', quick: 'Quicker than the pack', pack: 'Pack pace', slow: 'Slower than the pack' };
    const rel = ctx.speedRel ?? 0;
    return (
      <span className={`speed-cell tone-${ctx.speedTone ?? 'pack'}`} title={ctx.speedTone ? titles[ctx.speedTone] : undefined}>
        <span className="speed-value">{kmh(driver.speedSmooth)}</span>
        <span className="speed-tach" aria-hidden="true">
          <span className="speed-tach-mid" />
          <span className={`speed-tach-fill ${rel >= 0 ? 'pos' : 'neg'}`} style={rel >= 0 ? { left: '50%', width: `${rel * 50}%` } : { right: '50%', width: `${-rel * 50}%` }} />
        </span>
      </span>
    );
  },
};

// Interval to the car ahead (the racing battle)
export const COLUMN_GAP_AHEAD: ColumnConfig = {
  id: 'gapAhead',
  header: 'Int',
  width: '62px',
  align: 'right',
  render: (_driver: Driver, ctx: RowContext) => {
    // A real fight (engine says this car is held behind the one ahead) gets
    // the swords; merely close gets the warm colour.
    const fighting = ctx.battle?.role === 'attacking';
    const close = /^\+0\.[0-4]/.test(ctx.intervalGap);
    const title = fighting ? `Stuck behind the car ahead for ${Math.round((ctx.battle?.ticks ?? 0) / 10)}s` : ctx.battle?.role === 'defending' ? 'Under attack from behind' : undefined;
    return (
      <span className={`gap-value gap-ahead ${fighting ? 'gap-fight' : close ? 'gap-battle' : ''}`} title={title}>
        {fighting && <span className="gap-swords" aria-label="attacking">⚔</span>}{ctx.intervalGap}
      </span>
    );
  },
};

// Gap to leader
export const COLUMN_GAP_LEADER: ColumnConfig = {
  id: 'gapLeader',
  header: 'Leader',
  width: '62px',
  align: 'right',
  render: (_driver: Driver, ctx: RowContext) => (
    <span className="gap-value gap-leader">{ctx.leaderGap}</span>
  ),
};

// Last lap time
export const COLUMN_LAST_LAP: ColumnConfig = {
  id: 'lastLap',
  header: 'Last',
  width: '58px',
  align: 'right',
  render: (_driver: Driver, ctx: RowContext) => (
    <LapTime time={ctx.lastLapTime} className={ctx.lastLapClass} />
  ),
};

// Best lap time
export const COLUMN_BEST_LAP: ColumnConfig = {
  id: 'bestLap',
  header: 'Best',
  width: '58px',
  align: 'right',
  render: (_driver: Driver, ctx: RowContext) => (
    <LapTime time={ctx.bestLapTime} className={ctx.bestLapClass} />
  ),
};

// Tire: current compound (colored pip) + age in laps
const TIRE_LETTER: Record<string, string> = { soft: 'S', medium: 'M', hard: 'H' };
export const COLUMN_TIRE_AGE: ColumnConfig = {
  id: 'tireAge',
  header: 'Tyre',
  width: '58px',
  align: 'center',
  render: (driver: Driver) => {
    const compound = driver.tireState?.compound;
    if (!compound) return <span className="muted-cell">—</span>;
    const wear = driver.tireState?.wear ?? 0;
    const cliff = CANON_VARIABLES.tires[compound as 'soft' | 'medium' | 'hard']?.criticalAt ?? 75;
    const past = wear >= cliff;
    const used = driver.usedCompounds ?? [];
    const owed = (['soft', 'medium', 'hard'] as const).filter(c => !used.includes(c));
    const title = `${compound}, ${Math.round(wear)}% worn${past ? ' — past the cliff' : ''}${owed.length ? ` · still owes ${owed.join(', ')}` : ''}`;
    return (
      <span className={`tire-age ${past ? 'past-cliff' : ''}`} title={title}>
        <span className={`tire-pip tire-pip-${compound}`}>
          {TIRE_LETTER[compound] ?? '?'}
        </span>
        <span className="tire-age-laps">{driver.tireState?.lapsOnTires ?? 0}</span>
        <span className="tire-life" aria-hidden="true">
          <span className="tire-life-fill" style={{ width: `${Math.min(100, wear)}%` }} />
          <span className="tire-life-cliff" style={{ left: `${cliff}%` }} />
        </span>
      </span>
    );
  },
};

// Pit-stop count
export const COLUMN_PITS: ColumnConfig = {
  id: 'pits',
  header: 'Pit',
  width: '34px',
  align: 'center',
  render: (driver: Driver) => {
    const n = driver.pitStops?.length ?? 0;
    return <span className={`pit-count ${n === 0 ? 'muted-cell' : ''}`}>{n}</span>;
  },
};

// Tire compound dots
export const COLUMN_TIRES: ColumnConfig = {
  id: 'tires',
  header: '',
  width: '42px',
  align: 'center',
  render: (driver: Driver) => {
    const TIRE_COLORS: Record<string, string> = {
      soft: '#e74c3c',
      medium: '#f1c40f',
      hard: '#ecf0f1',
    };
    const usedCompounds = driver.usedCompounds || [];
    const currentCompound = driver.tireState?.compound;

    return (
      <div className="tire-dots">
        {(['soft', 'medium', 'hard'] as const).map(compound => {
          const isUsed = usedCompounds.includes(compound);
          const isCurrent = compound === currentCompound;
          return (
            <span
              key={compound}
              className={`tire-dot ${isUsed ? 'used' : ''} ${isCurrent ? 'current' : ''}`}
              style={{
                backgroundColor: isUsed ? TIRE_COLORS[compound] : 'transparent',
                borderColor: TIRE_COLORS[compound],
              }}
              title={compound.charAt(0).toUpperCase() + compound.slice(1)}
            />
          );
        })}
      </div>
    );
  },
};

// Identity tag chips (driver/car/team tags). Dormant tags render dim; a tag
// whose condition gate is open (or whose trigger has fired) lights up — you
// can literally watch Rain Dancer wake when the skies open.
export const COLUMN_TAGS: ColumnConfig = {
  id: 'tags',
  header: 'Tags',
  width: '118px',
  align: 'center',
  render: (driver: Driver, ctx: RowContext) => {
    // One column for everything on the car: identity tags, then the transient
    // ones (track events, inflictions, damage) — they're all tags at heart.
    const hits = (ctx.effectStack ?? []).filter(e => e.source === 'track_event' || e.source === 'infliction' || e.source === 'damage');
    const cards = driver.cards ?? [];
    if (driver.tags.length === 0 && cards.length === 0 && hits.length === 0) return <span className="muted-cell">—</span>;
    return (
      <span className="tag-chips">
        {cards.map(c => <CardFace key={c.id} card={c} size="mini" flippable={false} />)}
        {driver.tags.length > 0 && <TagChips tags={driver.tags} stack={ctx.effectStack} />}
        {hits.length > 0 && <EffectChips entries={hits} />}
      </span>
    );
  },
};

// Status icon (mid-race inflictions / effects)
// Mid-race things that happened TO the car (track events, inflictions,
// damage). Read from the effect stack so each one has a name and a reason on
// hover; the focus row spells them out in full.
export const COLUMN_STATUS: ColumnConfig = {
  id: 'status',
  header: 'Event',
  width: '52px',
  align: 'center',
  render: (_driver: Driver, ctx: RowContext) => {
    const hits = (ctx.effectStack ?? []).filter(e => e.source === 'track_event' || e.source === 'infliction' || e.source === 'damage');
    if (hits.length === 0 && ctx.statusEmoji) return <span className="status-icon">{ctx.statusEmoji}</span>;
    return <EffectChips entries={hits} />;
  },
};

export const COLUMN_TIRE_HISTORY: ColumnConfig = {
  id: 'tireHistory',
  header: 'Tires',
  width: 'minmax(80px, 120px)',
  align: 'center',
  render: (driver: Driver, ctx: RowContext) => (
    <TireHistory
      driver={driver}
      totalLaps={ctx.totalLaps}
      currentLap={ctx.currentLap}
    />
  ),
};

export const TRACK_COLUMNS: ColumnConfig[] = [
  COLUMN_POSITION,
  COLUMN_GRID_DELTA,
  COLUMN_TEAM_MARBLE,
  COLUMN_DRIVER_CODE,
  COLUMN_GAP_AHEAD,
  COLUMN_GAP_LEADER,
  COLUMN_SPEED,
  COLUMN_LAST_LAP,
  COLUMN_TIRE_AGE,
  COLUMN_TAGS,
];

// Detail View: the rich broadcast data screen (F1 timing).
// P | Marble | Driver | Team | Int | Leader | Last | Best | Tyre | Pit | Tags | !
export const DETAIL_COLUMNS: ColumnConfig[] = [
  COLUMN_POSITION,
  COLUMN_TEAM_MARBLE,
  COLUMN_DRIVER_FULL_NAME,
  COLUMN_TEAM_NAME,
  COLUMN_GRID,
  COLUMN_GAP_AHEAD,
  COLUMN_GAP_LEADER,
  COLUMN_SPEED,
  COLUMN_LAST_LAP,
  COLUMN_BEST_LAP,
  COLUMN_TIRE_AGE,
  COLUMN_TIRES,
  COLUMN_PITS,
  COLUMN_TAGS,
];

// Generate grid-template-columns CSS from column config
export function getGridTemplate(columns: ColumnConfig[]): string {
  return columns.map(col => col.width).join(' ');
}
