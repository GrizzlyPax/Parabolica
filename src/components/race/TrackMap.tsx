// TrackMap - Simplified track visualization
// Single thin path, no lanes, marker hierarchy for emphasis
import { useMemo, useRef, useEffect, useState } from 'react';
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
function getPointAlongPath(pathElement: SVGPathElement | null, percentage: number): { x: number; y: number } {
  if (!pathElement) return { x: 300, y: 150 };
  const length = pathElement.getTotalLength();
  const point = pathElement.getPointAtLength(percentage * length);
  return { x: point.x, y: point.y };
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
  // Ref for pit lane path (for positioning pitting drivers)
  const pitLanePathRef = useRef<SVGPathElement>(null);
  // Combine focused and highlighted drivers for visibility
  const visibleDriverIds = useMemo(() => {
    return new Set([...focusedDriverIds, ...highlightedDriverIds]);
  }, [focusedDriverIds, highlightedDriverIds]);
  const trackPathRef = useRef<SVGPathElement>(null);
  const [pathsReady, setPathsReady] = useState(false);

  // Initialize path reference
  useEffect(() => {
    if (trackPathRef.current) {
      setPathsReady(true);
    }
  }, []);

  // Calculate driver positions on track
  const driverPositions = useMemo(() => {
    if (!pathsReady || !trackPathRef.current) return [];

    // Separate by status
    const racing = drivers.filter(d => d.status !== 'finished' && d.status !== 'dnf' && d.status !== 'pitting');
    const pitting = drivers.filter(d => d.status === 'pitting');
    const dnf = drivers.filter(d => d.status === 'dnf');
    const finished = drivers.filter(d => d.status === 'finished');

    // Calculate positions for racing drivers
    const racingPositions = racing.map(driver => {
      const normalizedPosition = ((driver.position % trackLength) + trackLength) % trackLength;
      const lapProgress = normalizedPosition / trackLength;
      const point = getPointAlongPath(trackPathRef.current, lapProgress);

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
      };
    });

    // DNF drivers at their crash position
    const dnfPositions = dnf.map(driver => {
      const lapProgress = driver.position / trackLength;
      const point = getPointAlongPath(trackPathRef.current, lapProgress);

      return {
        driver,
        x: point.x,
        y: point.y,
        isFocused: focusedDriverIds.includes(driver.id),
        isHighlighted: visibleDriverIds.has(driver.id),
        isDNF: true,
        isPitting: false,
      };
    });

    // Pitting drivers - show on pit lane if available, else on track
    const pittingPositions = pitting.map((driver, index) => {
      let point: { x: number; y: number };

      if (pitLanePathRef.current) {
        // Use pit lane path - spread drivers along it based on pit progress
        // Estimate progress through pit (0 = just entered, 1 = about to exit)
        const pitProgress = 0.3 + (index * 0.15); // Spread them out
        point = getPointAlongPath(pitLanePathRef.current, Math.min(pitProgress, 0.9));
      } else {
        // Fallback: show at pit entry area on track
        const lapProgress = 0.85;
        point = getPointAlongPath(trackPathRef.current, lapProgress);
      }

      return {
        driver,
        x: point.x,
        y: point.y,
        isFocused: focusedDriverIds.includes(driver.id),
        isHighlighted: visibleDriverIds.has(driver.id),
        isDNF: false,
        isPitting: true,
      };
    });

    // Finished drivers at finish line
    const finishedPositions = finished.map(driver => {
      const point = getPointAlongPath(trackPathRef.current, 0);

      return {
        driver,
        x: point.x,
        y: point.y,
        isFocused: focusedDriverIds.includes(driver.id),
        isHighlighted: visibleDriverIds.has(driver.id),
        isDNF: false,
        isPitting: false,
      };
    });

    // Order: DNF first (background), then regular, then highlighted, then focused (foreground)
    const allPositions = [
      ...dnfPositions,
      ...pittingPositions,
      ...finishedPositions.filter(p => !p.isFocused && !p.isHighlighted),
      ...racingPositions.filter(p => !p.isFocused && !p.isHighlighted),
      ...racingPositions.filter(p => p.isHighlighted && !p.isFocused),
      ...finishedPositions.filter(p => p.isHighlighted && !p.isFocused),
      ...racingPositions.filter(p => p.isFocused),
      ...finishedPositions.filter(p => p.isFocused),
    ];

    return allPositions;
  }, [drivers, trackLength, focusedDriverIds, visibleDriverIds, pathsReady]);

  // Calculate start/finish line position
  const startFinish = useMemo(() => {
    if (!pathsReady || !trackPathRef.current) return null;
    return getPointAlongPath(trackPathRef.current, 0);
  }, [pathsReady]);

  // Calculate sector boundary positions (S1/S2 at 33%, S2/S3 at 66%)
  const sectorMarkers = useMemo(() => {
    if (!pathsReady || !trackPathRef.current) return [];
    return [
      { position: 0.333, label: 'S1' },
      { position: 0.666, label: 'S2' },
    ].map(sector => ({
      ...sector,
      point: getPointAlongPath(trackPathRef.current, sector.position),
    }));
  }, [pathsReady]);

  // Calculate Safety Carl's position
  const safetyCarlPosition = useMemo(() => {
    if (!unsafetyCarActive || !pathsReady || !trackPathRef.current) return null;
    return getPointAlongPath(trackPathRef.current, unsafetyCarPosition);
  }, [unsafetyCarActive, unsafetyCarPosition, pathsReady]);

  return (
    <div className={`track-map ${className}`}>
      <svg
        viewBox="0 0 600 360"
        preserveAspectRatio="xMidYMid meet"
        className="track-svg"
      >
        {/* Track outline - thin path */}
        <path
          ref={trackPathRef}
          d={trackPath}
          fill="none"
          stroke="#3a3a40"
          strokeWidth="12"
          className="track-outline"
        />

        {/* Track centerline */}
        <path
          d={trackPath}
          fill="none"
          stroke="#2a2a30"
          strokeWidth="1"
          strokeDasharray="8 8"
          className="track-centerline"
        />

        {/* Pit lane path (if provided) */}
        {pitLanePath && (
          <>
            <path
              ref={pitLanePathRef}
              d={pitLanePath}
              fill="none"
              stroke="#2a2a30"
              strokeWidth="8"
              className="pit-lane-outline"
            />
            <path
              d={pitLanePath}
              fill="none"
              stroke="#3d3d20"
              strokeWidth="6"
              className="pit-lane-surface"
            />
            {/* PIT label */}
            <text
              x={300}
              y={310}
              textAnchor="middle"
              fill="#666"
              fontSize="10"
              fontWeight="600"
              letterSpacing="2"
              className="pit-label"
            >
              PIT
            </text>
          </>
        )}

        {/* Sector boundary markers */}
        {sectorMarkers.map(({ label, point }) => (
          <g key={label} transform={`translate(${point.x}, ${point.y})`}>
            {/* Sector line across track */}
            <line
              x1={-10}
              y1={-10}
              x2={10}
              y2={10}
              stroke="#666"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            {/* Sector label */}
            <text
              x={14}
              y={-8}
              fill="#888"
              fontSize="9"
              fontWeight="600"
              className="sector-label"
            >
              {label}
            </text>
          </g>
        ))}

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
            {/* S3/Finish label */}
            <text
              x={14}
              y={-14}
              fill="#888"
              fontSize="9"
              fontWeight="600"
              className="sector-label"
            >
              S3
            </text>
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
          // Only highlighted/focused drivers are fully visible
          const isVisible = isFocused || isHighlighted;

          // Marker sizes based on hierarchy
          const radius = isFocused ? 13 : isHighlighted ? 11 : isDNF ? 5 : 7;
          const strokeWidth = isFocused ? 2.5 : isHighlighted ? 2 : 1;
          // Non-visible drivers are dimmed but still visible
          const opacity = isDNF ? 0.2 : isPitting ? 0.5 : isVisible ? 1 : 0.4;

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

              {/* Main marker circle */}
              <circle
                cx={0}
                cy={0}
                r={radius}
                fill={driver.color}
                stroke={isVisible ? (driver.accentColor || '#fff') : '#333'}
                strokeWidth={strokeWidth}
                opacity={opacity}
                className="marker-circle"
              />

              {/* Emoji inside marker for visible drivers */}
              {isVisible && !isDNF && (
                <text
                  x={0}
                  y={1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="marker-emoji"
                  style={{
                    fontSize: isFocused ? '12px' : '10px',
                  }}
                >
                  {driver.emoji}
                </text>
              )}

              {/* 3-letter code label above marker for visible drivers */}
              {isVisible && !isDNF && (
                <text
                  x={0}
                  y={-radius - 6}
                  textAnchor="middle"
                  className="marker-label"
                  style={{
                    fontSize: isFocused ? '10px' : '8px',
                    fontWeight: 700,
                    fill: driver.color,
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  {getDriverCode(driver.name)}
                </text>
              )}

              {/* DNF indicator */}
              {isDNF && isVisible && (
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
