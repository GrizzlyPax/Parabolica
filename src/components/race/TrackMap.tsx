// TrackMap: the race, drawn. Since #778 the map is a VENUE SCENE when it
// has one (look/venues/scenes.tsx: a drawn map per kind on cream paper, its
// own racing line and pit lane, the surface in its material), with the cars
// as numbered roundels trailing dust that scales with pace, and a SCOPE
// (all · mine · follow one) that decides who is big, labelled and lit. The
// bare loop stays for a track without a scene (the lab's default).
import { NUMBER_DY } from '../../icons/RaceNumber';
import { useMemo, useCallback, useState } from 'react';
import type { Driver } from '../../RaceEngine';
import './TrackMap.css';
import '../../look/venues.css';
import { GameIcon } from '../../icons/GameIcon';
import { driverCode } from './driverCode';
import { SCENE_BAND, SceneBand, SceneDefs, type SceneCtx, type VenueScene } from '../../look/venues/scenes';
import type { RaceScope } from './types';

// Default track path (oval) if no layout provided
const DEFAULT_TRACK_PATH = 'M 150 60 L 450 60 Q 550 60, 550 150 Q 550 240, 450 240 L 150 240 Q 50 240, 50 150 Q 50 60, 150 60 Z';

interface TrackMapProps {
  trackPath?: string;
  pitLanePath?: string; // Optional pit lane path
  trackLength: number;
  drivers: Driver[];
  focusedDriverIds?: number[]; // Support multiple focused drivers
  highlightedDriverIds?: number[]; // Always-visible drivers (e.g. the current podium): bigger marker + team emoji
  /** Your team's cars (Season Mode, Pax Oct 9): always big, numbered and labelled, drawn on top. */
  mineDriverIds?: number[];
  unsafetyCarActive?: boolean; // Show Safety Carl when true
  unsafetyCarPosition?: number; // Position on track (0-1 percentage)
  /** Live fights: the defender gets a pulsing ring, the attacker a sword. */
  battles?: { chaserId: number; aheadId: number; ticks: number }[];
  className?: string;
  /** The venue, drawn (#778): its paper, scenery, racing line and pit lane replace the bare path. */
  scene?: VenueScene;
  sceneCtx?: SceneCtx;
  /** Who the picture is about (#778): all · mine · one car followed. */
  scope?: RaceScope;
  followId?: number;
}

// Get a point along an SVG path at a given percentage (0-1)
// Clamps percentage to valid range to prevent SVG errors
function getPointAlongPath(pathElement: SVGPathElement | null, percentage: number): { x: number; y: number } {
  if (!pathElement) return { x: 300, y: 150 };
  // Handle NaN, undefined, or out-of-range percentage - default to start of path
  const safePct = (typeof percentage === 'number' && !isNaN(percentage))
    ? Math.max(0, Math.min(1, percentage))
    : 0;
  const length = pathElement.getTotalLength();
  const point = pathElement.getPointAtLength(safePct * length);
  return { x: point.x, y: point.y };
}

// Parse a simple line path (M x1 y1 L x2 y2) and interpolate along it
// This is simpler and more reliable than creating temp SVG elements
function getPointAlongLinePath(pathString: string, percentage: number): { x: number; y: number } | null {
  // Parse "M x1 y1 L x2 y2" format
  const match = pathString.match(/M\s*(-?[\d.]+)\s+(-?[\d.]+)\s*L\s*(-?[\d.]+)\s+(-?[\d.]+)/i);
  if (!match) return null;

  const x1 = parseFloat(match[1]);
  const y1 = parseFloat(match[2]);
  const x2 = parseFloat(match[3]);
  const y2 = parseFloat(match[4]);

  // Handle NaN, undefined, or out-of-range percentage - default to start of path
  const safePct = (typeof percentage === 'number' && !isNaN(percentage))
    ? Math.max(0, Math.min(1, percentage))
    : 0;

  return {
    x: x1 + (x2 - x1) * safePct,
    y: y1 + (y2 - y1) * safePct,
  };
}

function TrackMap({
  trackPath = DEFAULT_TRACK_PATH,
  pitLanePath,
  trackLength,
  drivers,
  focusedDriverIds = [],
  highlightedDriverIds = [],
  mineDriverIds,
  unsafetyCarActive = false,
  unsafetyCarPosition = 0,
  className = '',
  battles,
  scene,
  sceneCtx = {},
  scope = 'all',
  followId,
}: TrackMapProps) {
  // The scene's line and lane win over the layout's.
  const path = scene?.path ?? trackPath;
  const pit = scene?.pitLane ?? pitLanePath;
  // Store track path element in state to ensure useMemo re-runs when it's attached
  // Using state instead of refs ensures React knows about the element
  const [trackPathEl, setTrackPathEl] = useState<SVGPathElement | null>(null);
  // Your cars get the focused treatment all race (big, numbered, labelled, on top).
  const mineKey = (mineDriverIds ?? []).join(',');
  const bigIds = useMemo(() => [...focusedDriverIds, ...(mineDriverIds ?? [])], [focusedDriverIds.join(','), mineKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Callback ref for track path - stores element in state
  const trackPathRef = useCallback((el: SVGPathElement | null) => {
    setTrackPathEl(el);
  }, []);

  // Combine focused and highlighted drivers for visibility
  const visibleDriverIds = useMemo(() => {
    return new Set([...focusedDriverIds, ...highlightedDriverIds]);
  }, [focusedDriverIds, highlightedDriverIds]);

  // Calculate driver positions on track
  const driverPositions = useMemo(() => {
    if (!trackPathEl) return [];

    // Separate by status (finished drivers are not shown on track)
    const racing = drivers.filter(d => d.status === 'racing');
    const pitting = drivers.filter(d => d.status === 'pitting');
    const dnf = drivers.filter(d => d.status === 'dnf');

    // The dust tail (#778): a short line back along the path, longer the faster the car is going this tick.
    const vmax = racing.reduce((m, d) => Math.max(m, d.speedSmooth || 0), 0) || 1;
    // Calculate positions for racing drivers
    const racingPositions = racing.map(driver => {
      const normalizedPosition = ((driver.position % trackLength) + trackLength) % trackLength;
      const lapProgress = normalizedPosition / trackLength;
      const point = getPointAlongPath(trackPathEl, lapProgress);
      const tailLen = scene ? 0.008 + 0.028 * Math.max(0, Math.min(1, (driver.speedSmooth || 0) / vmax)) : 0;
      const tail = tailLen ? getPointAlongPath(trackPathEl, ((lapProgress - tailLen) % 1 + 1) % 1) : undefined;

      const isFocused = bigIds.includes(driver.id);
      const isHighlighted = visibleDriverIds.has(driver.id);

      return {
        driver,
        x: point.x,
        y: point.y,
        tail,
        isFocused,
        isHighlighted,
        isDNF: false,
        isPitting: false,
        isStopped: false,
      };
    });

    // DNF drivers at their crash position
    const dnfPositions = dnf.map(driver => {
      const lapProgress = driver.position / trackLength;
      const point = getPointAlongPath(trackPathEl, lapProgress);

      return {
        driver,
        x: point.x,
        y: point.y,
        tail: undefined as { x: number; y: number } | undefined,
        isFocused: bigIds.includes(driver.id),
        isHighlighted: visibleDriverIds.has(driver.id),
        isDNF: true,
        isPitting: false,
        isStopped: false,
      };
    });

    // Pitting drivers - show on pit lane using actual pit progress
    // Three phases: entry (driving to box), stopped (at pit box), exit (driving out)
    const pittingPositions = pitting.map((driver) => {
      let point: { x: number; y: number };
      const isStopped = driver.pitPhase === 'stopped';

      if (pit) {
        // Use driver's actual pit progress (0 = just entered, 1 = about to exit)
        // For clockwise tracks, pit lane runs left→right (same as path definition)
        const pitLaneProgress = driver.pitProgress ?? 0;
        const linePoint = getPointAlongLinePath(pit, pitLaneProgress);

        if (linePoint) {
          point = linePoint;
          // When stopped at pit box, offset Y position to show driver "pulled in"
          if (isStopped) {
            point = { x: point.x, y: point.y + 15 }; // Offset into pit box area
          }
        } else {
          // Fallback if path parsing failed
          point = getPointAlongPath(trackPathEl, 0);
        }
      } else {
        // Fallback: show at start/finish area on track
        point = getPointAlongPath(trackPathEl, 0);
      }

      return {
        driver,
        x: point.x,
        y: point.y,
        tail: undefined as { x: number; y: number } | undefined,
        isFocused: bigIds.includes(driver.id),
        isHighlighted: visibleDriverIds.has(driver.id),
        isDNF: false,
        isPitting: true,
        isStopped, // Track if driver is stopped for pit work
      };
    });

    // Finished drivers are removed from track map (they're done racing)
    // No need to calculate positions for them

    // Order: DNF first (background), then regular, then highlighted, then focused (foreground)
    // Pitting drivers now included in proper z-order based on focus/highlight status
    const allPositions = [
      ...dnfPositions,
      ...pittingPositions.filter(p => !p.isFocused && !p.isHighlighted),
      ...racingPositions.filter(p => !p.isFocused && !p.isHighlighted),
      ...pittingPositions.filter(p => p.isHighlighted && !p.isFocused),
      ...racingPositions.filter(p => p.isHighlighted && !p.isFocused),
      ...pittingPositions.filter(p => p.isFocused),
      ...racingPositions.filter(p => p.isFocused),
    ];

    // Under a scope the followed car and yours come to the front.
    const front = (p: { driver: Driver }) => (scope === 'follow' && p.driver.id === followId ? 2 : scope !== 'all' && mineDriverIds?.includes(p.driver.id) ? 1 : 0);
    return allPositions.map((p, i) => ({ p, i })).sort((a, b) => front(a.p) - front(b.p) || a.i - b.i).map(x => x.p);
  }, [drivers, trackLength, bigIds, visibleDriverIds, trackPathEl, pit, scene, scope, followId, mineKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate start/finish line position
  const startFinish = useMemo(() => {
    if (!trackPathEl) return null;
    return getPointAlongPath(trackPathEl, 0);
  }, [trackPathEl]);

  // Calculate Safety Carl's position
  const safetyCarlPosition = useMemo(() => {
    if (!unsafetyCarActive || !trackPathEl) return null;
    return getPointAlongPath(trackPathEl, unsafetyCarPosition);
  }, [unsafetyCarActive, unsafetyCarPosition, trackPathEl]);

  // A scene is a page of the program: its band on top, the scene under it (everything placed on the path moves with it).
  const box = scene ? { w: scene.box.w, h: scene.box.h + SCENE_BAND } : { w: 600, h: 360 };
  const sc = unsafetyCarActive;
  return (
    <div className={`track-map ${scene ? 'scene' : ''} ${className}`.replace(/\s+/g, ' ').trim()}>
      <svg
        viewBox={`0 0 ${box.w} ${box.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="track-svg"
      >
      {scene && <SceneBand ctx={sceneCtx} />}
      <g transform={scene ? `translate(0 ${SCENE_BAND})` : undefined}>
        {/* Patterns: the chequer, and the scenes' paper, hatching and salt */}
        <defs>
          <pattern id="checkered" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="2" height="2" fill="var(--ace-paper)" />
            <rect x="2" y="2" width="2" height="2" fill="var(--ace-paper)" />
            <rect x="2" width="2" height="2" fill="var(--ace-ink)" />
            <rect y="2" width="2" height="2" fill="var(--ace-ink)" />
          </pattern>
          <SceneDefs />
        </defs>

        {/* The venue under the track (#778): paper, infield, stand, landmark */}
        {scene?.under(sceneCtx)}

        {scene ? (
          <>
            {/* The surface in its material: an ink edge, the fill, then its marks */}
            <path d={path} fill="none" stroke={sc ? 'var(--ace-yellow)' : 'var(--ace-ink)'} strokeWidth={scene.surface.width + 3} strokeLinejoin="round" strokeLinecap="round" className="track-outline-outer" opacity={sc ? 0.9 : 0.85} />
            <path ref={trackPathRef} d={path} fill="none" stroke={scene.surface.fill} strokeWidth={scene.surface.width} strokeLinejoin="round" strokeLinecap="round" className="track-outline" />
            {scene.surface.centreDash && <path d={path} fill="none" stroke="var(--ace-paper)" strokeWidth={1} strokeDasharray="6 8" opacity={0.7} />}
            {scene.surface.planks && <path d={path} fill="none" stroke="var(--ace-ink)" strokeWidth={scene.surface.width} strokeDasharray="1 9" opacity={0.3} />}
            {scene.surface.marks && <path d={path} fill="none" stroke="var(--ace-ink)" strokeWidth={3} strokeDasharray="14 26" opacity={0.18} />}
            {pit && (
              <>
                <path d={pit} fill="none" stroke="var(--ace-ink)" strokeWidth={11} strokeLinecap="round" opacity={0.5} className="pit-lane-outer" />
                <path d={pit} fill="none" stroke="var(--ace-paper-2)" strokeWidth={8} strokeLinecap="round" className="pit-lane" />
              </>
            )}
            {scene.over?.(sceneCtx)}
          </>
        ) : (
          <>
            {/* The bare loop: pale edges, an ink interior (yellow under the safety car) */}
            <path d={path} fill="none" stroke={sc ? 'var(--ace-yellow)' : 'var(--ace-paper)'} strokeWidth="14" strokeOpacity={sc ? 0.6 : 0.4} className="track-outline-outer" />
            <path ref={trackPathRef} d={path} fill="none" stroke="var(--ace-ink)" strokeWidth="10" className="track-outline" />
            {pit && (
              <>
                <path d={pit} fill="none" stroke={sc ? 'var(--ace-yellow)' : 'var(--ace-paper)'} strokeWidth="10" strokeOpacity={sc ? 0.6 : 0.4} strokeLinecap="round" className="pit-lane-outer" />
                <path d={pit} fill="none" stroke="var(--ace-ink)" strokeWidth="6" strokeLinecap="round" className="pit-lane" />
              </>
            )}
          </>
        )}

        {/* Start/Finish line */}
        {startFinish && (
          <g transform={`translate(${startFinish.x}, ${startFinish.y})`}>
            <rect
              x={-8}
              y={-12}
              width={16}
              height={24}
              fill="url(#checkered)"
              opacity={0.8}
            />
          </g>
        )}

        {/* Dust (#778): every racing car's tail, under the markers */}
        {scene && driverPositions.map(({ driver, x, y, tail }) => tail && (
          <line key={`tail-${driver.id}`} x1={tail.x} y1={tail.y} x2={x} y2={y} stroke={scene.dust} strokeWidth={scope !== 'all' && !mineDriverIds?.includes(driver.id) && driver.id !== followId ? 3 : 5} strokeLinecap="round" opacity={0.55} className="marker-dust" />
        ))}

        {/* Safety Carl - The Unsafety Car */}
        {safetyCarlPosition && (
          <g
            className="safety-carl focused"
            transform={`translate(${safetyCarlPosition.x}, ${safetyCarlPosition.y})`}
          >
            {/* Glow effect */}
            <circle
              cx={0}
              cy={0}
              r={20}
              fill="none"
              stroke="var(--ace-yellow)"
              strokeWidth={2}
              opacity={0.6}
              className="safety-carl-glow"
            />
            {/* Main marker circle - bright yellow */}
            <circle
              cx={0}
              cy={0}
              r={14}
              fill="var(--ace-yellow)"
              stroke="var(--ace-brick)"
              strokeWidth={2.5}
              className="safety-carl-circle"
            />
            {/* Emoji inside */}
            <g transform="translate(-8 -8)" className="safety-carl-emoji"><GameIcon name="race.safety_car" size={16} /></g>
            {/* SC label above */}
            <text
              x={0}
              y={-22}
              textAnchor="middle"
              className="safety-carl-label"
              style={{ fontSize: '11px', fontWeight: 700, fill: 'var(--ace-yellow)' }}
            >
              SC
            </text>
          </g>
        )}

        {/* Driver markers */}
        {driverPositions.map(({ driver, x, y, isFocused, isHighlighted, isDNF, isPitting }) => {
          // The scope (#778): under "mine" the rivals fall back to small faint dots; under "follow" one car is the picture.
          const isMine = !!mineDriverIds?.includes(driver.id);
          const isFollowed = scope === 'follow' && driver.id === followId;
          const dimmed = !isDNF && ((scope === 'mine' && !isMine) || (scope === 'follow' && !isMine && !isFollowed));
          const big = !dimmed && (isFocused || isFollowed || (scope !== 'all' && isMine));
          // Only big drivers get the full treatment (name label, large size); highlighted (podium) ones a number and a glow.
          const showNameLabel = big;

          // Marker sizes: big = large, highlighted = medium, normal = small, dimmed = a dot
          const radius = dimmed ? 5 : big ? 13 : isHighlighted ? 10 : isDNF ? 5 : 7;
          const strokeWidth = big ? 2.5 : 2;
          const opacity = isDNF ? 0.3 : dimmed ? 0.45 : isPitting ? 0.8 : big ? 1 : isHighlighted ? 0.9 : 0.7;

          return (
            <g
              key={driver.id}
              className={`driver-marker ${big ? 'focused' : ''} ${isHighlighted ? 'highlighted' : ''} ${isDNF ? 'dnf' : ''} ${isPitting ? 'pitting' : ''} ${dimmed ? 'dimmed' : ''}`}
              transform={`translate(${x}, ${y})`}
            >
              {/* Your car: a soft halo in the team colour, always (Pax, Oct 9) */}
              {isMine && !isDNF && (
                <circle cx={0} cy={0} r={radius + 8} fill={driver.color} opacity={0.22} className="marker-mine-halo" />
              )}
              {/* The followed car: a ring in the ink (#778) */}
              {isFollowed && !isDNF && <circle cx={0} cy={0} r={radius + 11} fill="none" stroke="var(--map-ink, var(--ace-fg))" strokeWidth={1.5} strokeDasharray="4 3" className="marker-follow-ring" />}

              {/* Glow for big drivers */}
              {big && (
                <circle
                  cx={0}
                  cy={0}
                  r={radius + 5}
                  fill="none"
                  stroke={driver.color}
                  strokeWidth={2}
                  opacity={0.5}
                  className="marker-glow"
                />
              )}

              {/* Subtle glow for highlighted (bet) drivers when not focused */}
              {isHighlighted && !big && !dimmed && (
                <circle
                  cx={0}
                  cy={0}
                  r={radius + 3}
                  fill="none"
                  stroke={driver.color}
                  strokeWidth={1.5}
                  opacity={0.3}
                  className="marker-glow-subtle"
                />
              )}

              {/* Battle: defender ring (pulsing) and attacker sword */}
              {battles?.some(b => b.aheadId === driver.id) && !isDNF && (
                <circle cx={0} cy={0} r={radius + 4} fill="none" stroke="var(--ace-yellow)" strokeWidth={2} className="marker-battle-ring" />
              )}
              {battles?.some(b => b.chaserId === driver.id) && !isDNF && (
                <g transform={`translate(${radius + 1} ${-radius - 8})`} className="marker-swords"><GameIcon name="race.battle" size={10} /></g>
              )}

              {/* Main marker circle */}
              <circle
                cx={0}
                cy={0}
                r={radius}
                fill={driver.color}
                stroke={driver.ink || 'var(--ace-paper)'}
                strokeWidth={strokeWidth}
                opacity={opacity}
                className="marker-circle"
              />

              {/* Racing number (in the team's ink) inside the marker for big and highlighted (podium) drivers */}
              {(big || isHighlighted) && !isDNF && !dimmed && (
                <text
                  x={0}
                  y={0}
                  dy={NUMBER_DY}
                  textAnchor="middle"
                  className="marker-emoji"
                  style={{ fontSize: big ? '11px' : '9px', fill: driver.ink || 'var(--ace-paper)', fontFamily: 'var(--ace-cond)', fontWeight: 600 }}
                >
                  {driver.number ?? driver.emoji}
                </text>
              )}

              {/* 3-letter code label above marker for focused drivers only */}
              {showNameLabel && !isDNF && (
                <text
                  x={0}
                  y={-radius - 6}
                  textAnchor="middle"
                  className="marker-label"
                  style={{ fontSize: '10px', fontWeight: 700 }}
                >
                  {driverCode(driver.name)}
                </text>
              )}

              {/* DNF indicator */}
              {isDNF && (big || isHighlighted) && (
                <g transform="translate(-4 -4)" className="marker-dnf">
                  <GameIcon name={driver.dnfInfo?.reason === 'tire_failure' ? 'race.tire_failure' : driver.dnfInfo?.reason === 'mechanical' ? 'race.mechanical' : 'race.crash'} size={8} />
                </g>
              )}

            </g>
          );
        })}
      </g>
      </svg>
    </div>
  );
}

export default TrackMap;
