// TrackMap - Simplified track visualization
// Single thin path, no lanes, marker hierarchy for emphasis
import { useMemo, useCallback, useState } from 'react';
import type { Driver } from '../../RaceEngine';
import './TrackMap.css';

// Default track path (oval) if no layout provided
const DEFAULT_TRACK_PATH = 'M 150 60 L 450 60 Q 550 60, 550 150 Q 550 240, 450 240 L 150 240 Q 50 240, 50 150 Q 50 60, 150 60 Z';

// Suffixes to ignore when extracting surname
const NAME_SUFFIXES = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);

// Helper to get 3-letter driver code from surname
function getDriverCode(name: string): string {
  const parts = name.split(' ').filter(p => p.length > 0);
  const filteredParts = parts.filter(p => !NAME_SUFFIXES.has(p.toUpperCase()));
  const surname = filteredParts[filteredParts.length - 1] || parts[parts.length - 1] || '';
  return surname.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
}

interface TrackMapProps {
  trackPath?: string;
  pitLanePath?: string; // Optional pit lane path
  trackLength: number;
  drivers: Driver[];
  focusedDriverIds?: number[]; // Support multiple focused drivers
  highlightedDriverIds?: number[]; // Bet drivers - always visible
  unsafetyCarActive?: boolean; // Show Safety Carl when true
  unsafetyCarPosition?: number; // Position on track (0-1 percentage)
  className?: string;
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
  unsafetyCarActive = false,
  unsafetyCarPosition = 0,
  className = '',
}: TrackMapProps) {
  // Store track path element in state to ensure useMemo re-runs when it's attached
  // Using state instead of refs ensures React knows about the element
  const [trackPathEl, setTrackPathEl] = useState<SVGPathElement | null>(null);

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

    // Calculate positions for racing drivers
    const racingPositions = racing.map(driver => {
      const normalizedPosition = ((driver.position % trackLength) + trackLength) % trackLength;
      const lapProgress = normalizedPosition / trackLength;
      const point = getPointAlongPath(trackPathEl, lapProgress);

      const isFocused = focusedDriverIds.includes(driver.id);
      const isHighlighted = visibleDriverIds.has(driver.id);

      return {
        driver,
        x: point.x,
        y: point.y,
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
        isFocused: focusedDriverIds.includes(driver.id),
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

      if (pitLanePath) {
        // Use driver's actual pit progress (0 = just entered, 1 = about to exit)
        // For clockwise tracks, pit lane runs left→right (same as path definition)
        const pitLaneProgress = driver.pitProgress ?? 0;
        const linePoint = getPointAlongLinePath(pitLanePath, pitLaneProgress);

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
        isFocused: focusedDriverIds.includes(driver.id),
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

    return allPositions;
  }, [drivers, trackLength, focusedDriverIds, visibleDriverIds, trackPathEl, pitLanePath]);

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

  return (
    <div className={`track-map ${className}`}>
      <svg
        viewBox="0 0 600 360"
        preserveAspectRatio="xMidYMid meet"
        className="track-svg"
      >
        {/* Track - white edges with black interior (yellow during safety car) */}
        {/* Outer stroke (edges) */}
        <path
          d={trackPath}
          fill="none"
          stroke={unsafetyCarActive ? "#FFD700" : "#ffffff"}
          strokeWidth="14"
          strokeOpacity={unsafetyCarActive ? 0.6 : 0.4}
          className="track-outline-outer"
        />
        {/* Inner black stroke (creates empty interior) */}
        <path
          ref={trackPathRef}
          d={trackPath}
          fill="none"
          stroke="#000000"
          strokeWidth="10"
          className="track-outline"
        />

        {/* Pit lane - white edges with black interior (yellow during safety car) */}
        {pitLanePath && (
          <>
            {/* Outer stroke (edges) */}
            <path
              d={pitLanePath}
              fill="none"
              stroke={unsafetyCarActive ? "#FFD700" : "#ffffff"}
              strokeWidth="10"
              strokeOpacity={unsafetyCarActive ? 0.6 : 0.4}
              strokeLinecap="round"
              className="pit-lane-outer"
            />
            {/* Inner black stroke (empty interior) */}
            <path
              d={pitLanePath}
              fill="none"
              stroke="#000000"
              strokeWidth="6"
              strokeLinecap="round"
              className="pit-lane"
            />
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

        {/* Checkered pattern definition */}
        <defs>
          <pattern id="checkered" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="2" height="2" fill="#fff" />
            <rect x="2" y="2" width="2" height="2" fill="#fff" />
            <rect x="2" width="2" height="2" fill="#222" />
            <rect y="2" width="2" height="2" fill="#222" />
          </pattern>
        </defs>

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
              stroke="#FFD700"
              strokeWidth={2}
              opacity={0.6}
              className="safety-carl-glow"
            />
            {/* Main marker circle - bright yellow */}
            <circle
              cx={0}
              cy={0}
              r={14}
              fill="#FFD700"
              stroke="#FFA500"
              strokeWidth={2.5}
              className="safety-carl-circle"
            />
            {/* Emoji inside */}
            <text
              x={0}
              y={1}
              textAnchor="middle"
              dominantBaseline="central"
              className="safety-carl-emoji"
              style={{ fontSize: '14px' }}
            >
              🧍‍♂️
            </text>
            {/* SC label above */}
            <text
              x={0}
              y={-22}
              textAnchor="middle"
              className="safety-carl-label"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                fill: '#FFD700',
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              }}
            >
              SC
            </text>
          </g>
        )}

        {/* Driver markers */}
        {driverPositions.map(({ driver, x, y, isFocused, isHighlighted, isDNF, isPitting }) => {
          // Only FOCUSED drivers get full treatment (name label, large size)
          // Highlighted (bet) drivers just get a subtle glow, not full visibility
          const showNameLabel = isFocused;

          // Marker sizes: focused = large, highlighted = medium, normal = small
          const radius = isFocused ? 13 : isHighlighted ? 9 : isDNF ? 5 : 7;
          const strokeWidth = isFocused ? 2.5 : isHighlighted ? 2 : 2;
          // Non-focused drivers are dimmed
          const opacity = isDNF ? 0.3 : isPitting ? 0.8 : isFocused ? 1 : isHighlighted ? 0.9 : 0.7;

          return (
            <g
              key={driver.id}
              className={`driver-marker ${isFocused ? 'focused' : ''} ${isHighlighted ? 'highlighted' : ''} ${isDNF ? 'dnf' : ''} ${isPitting ? 'pitting' : ''}`}
              transform={`translate(${x}, ${y})`}
            >
              {/* Glow for focused driver */}
              {isFocused && (
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
              {isHighlighted && !isFocused && (
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

              {/* Main marker circle */}
              <circle
                cx={0}
                cy={0}
                r={radius}
                fill={driver.color}
                stroke={driver.accentColor || '#fff'}
                strokeWidth={strokeWidth}
                opacity={opacity}
                className="marker-circle"
              />

              {/* Emoji inside marker for focused drivers only */}
              {isFocused && !isDNF && (
                <text
                  x={0}
                  y={1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="marker-emoji"
                  style={{ fontSize: '12px' }}
                >
                  {driver.emoji}
                </text>
              )}

              {/* 3-letter code label above marker for focused drivers only */}
              {showNameLabel && !isDNF && (
                <text
                  x={0}
                  y={-radius - 6}
                  textAnchor="middle"
                  className="marker-label"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    fill: driver.color,
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  {getDriverCode(driver.name)}
                </text>
              )}

              {/* DNF indicator */}
              {isDNF && (isFocused || isHighlighted) && (
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="marker-dnf"
                  style={{ fontSize: '7px' }}
                >
                  {driver.dnfInfo?.reason === 'tire_failure' ? '💨' : driver.dnfInfo?.reason === 'mechanical' ? '⚙️' : '💥'}
                </text>
              )}

            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default TrackMap;
