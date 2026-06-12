// Column definitions for TimingTower
// Each column has an id, header, width, alignment, and render function

import TeamStripe from './TeamStripe';
import LapTime from './LapTime';
import PositionDelta from './PositionDelta';
import TireHistory from './TireHistory';
import type { ColumnConfig, RowContext } from './types';
import { Driver } from '../../RaceEngine';

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
    <span className={`position-number ${ctx.isFinished ? 'finished' : ''} ${ctx.isDNF ? 'dnf' : ''} ${ctx.isPitting ? 'pitting' : ''}`}>
      {ctx.isDNF ? 'DNF' : ctx.isPitting ? 'PIT' : ctx.displayPosition}
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

// Team marble column (colored circle with emoji and accent border)
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
        border: `2px solid ${driver.accentColor || '#fff'}`,
        fontSize: '12px',
        lineHeight: 1,
        boxShadow: `0 0 6px ${driver.color}60`,
      }}
    >
      {driver.emoji}
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
    <span
      className={`driver-code ${ctx.isFocused ? 'focused' : ''}`}
      style={{ color: driver.color }}
    >
      {getDriverCode(driver)}
    </span>
  ),
};

// Full driver name column (for detail view)
export const COLUMN_DRIVER_FULL_NAME: ColumnConfig = {
  id: 'driverFullName',
  header: 'Driver',
  width: '156px',
  align: 'left',
  render: (driver: Driver, ctx: RowContext) => (
    <span
      className={`driver-full-name ${ctx.isFocused ? 'focused' : ''}`}
      style={{ color: driver.color }}
    >
      {driver.name}
    </span>
  ),
};

// Team name column (for detail view)
export const COLUMN_TEAM_NAME: ColumnConfig = {
  id: 'teamName',
  header: 'Team',
  width: '112px',
  align: 'left',
  render: (driver: Driver) => (
    <span className="team-name" style={{ color: driver.color }}>
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

// Interval to the car ahead (the racing battle)
export const COLUMN_GAP_AHEAD: ColumnConfig = {
  id: 'gapAhead',
  header: 'Int',
  width: '62px',
  align: 'right',
  render: (_driver: Driver, ctx: RowContext) => {
    // Highlight a live battle: within 0.5s of the car ahead.
    const close = /^\+0\.[0-4]/.test(ctx.intervalGap);
    return <span className={`gap-value gap-ahead ${close ? 'gap-battle' : ''}`}>{ctx.intervalGap}</span>;
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
    return (
      <span className="tire-age">
        <span className={`tire-pip tire-pip-${compound}`} title={compound}>
          {TIRE_LETTER[compound] ?? '?'}
        </span>
        <span className="tire-age-laps">{driver.tireState?.lapsOnTires ?? 0}</span>
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
  width: '54px',
  align: 'center',
  render: (driver: Driver, ctx: RowContext) => {
    const tags = [driver.driverTag, driver.carTag, driver.teamTag].filter(
      (t): t is NonNullable<typeof t> => !!t
    );
    if (tags.length === 0) return <span className="muted-cell">—</span>;
    return (
      <span className="tag-chips">
        {tags.slice(0, 3).map(tag => {
          const isActive = ctx.activeTagIds?.has(tag.id) ?? false;
          // Ungated passives are always-on: show them lit.
          const alwaysOn = tag.trigger === 'passive' && !tag.condition;
          return (
            <span
              key={tag.id}
              className={`tag-chip ${isActive || alwaysOn ? 'active' : 'dormant'}`}
              title={`${tag.name} — ${tag.description}`}
            >
              {tag.emoji}
            </span>
          );
        })}
      </span>
    );
  },
};

// Status icon (mid-race inflictions / effects)
export const COLUMN_STATUS: ColumnConfig = {
  id: 'status',
  header: '!',
  width: '30px',
  align: 'center',
  render: (_driver: Driver, ctx: RowContext) => (
    ctx.statusEmoji ? <span className="status-icon">{ctx.statusEmoji}</span> : <span className="muted-cell">—</span>
  ),
};

// Tire history chart (F1 style stint visualization)
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

// ============================================
// VIEW-SPECIFIC COLUMN SETS
// ============================================

// Track View: compact floating panel — the essentials only.
// P | Marble | Code | Interval | Last | Tags
export const TRACK_COLUMNS: ColumnConfig[] = [
  COLUMN_POSITION,
  COLUMN_TEAM_MARBLE,
  COLUMN_DRIVER_CODE,
  COLUMN_GAP_AHEAD,
  COLUMN_LAST_LAP,
  COLUMN_TAGS,
];

// Detail View: the rich broadcast data screen (F1 timing).
// P | Marble | Driver | Team | Int | Leader | Last | Best | Tyre | Pit | Tags | !
export const DETAIL_COLUMNS: ColumnConfig[] = [
  COLUMN_POSITION,
  COLUMN_TEAM_MARBLE,
  COLUMN_DRIVER_FULL_NAME,
  COLUMN_TEAM_NAME,
  COLUMN_GAP_AHEAD,
  COLUMN_GAP_LEADER,
  COLUMN_LAST_LAP,
  COLUMN_BEST_LAP,
  COLUMN_TIRE_AGE,
  COLUMN_PITS,
  COLUMN_TAGS,
  COLUMN_STATUS,
];

// Generate grid-template-columns CSS from column config
export function getGridTemplate(columns: ColumnConfig[]): string {
  return columns.map(col => col.width).join(' ');
}
