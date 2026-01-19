// Utility functions for converting ticks to race-friendly time/distance displays

const TICK_INTERVAL_MS = 100; // Each tick is 100ms

/**
 * Convert ticks to a race time string (e.g., "1:23.4")
 */
export function ticksToTime(ticks: number): string {
  const totalSeconds = (ticks * TICK_INTERVAL_MS) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
  }
  return `${seconds.toFixed(1)}s`;
}

/**
 * Convert ticks to a short time string for compact displays
 */
export function ticksToShortTime(ticks: number): string {
  const totalSeconds = (ticks * TICK_INTERVAL_MS) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
  }
  return `${seconds.toFixed(2)}s`;
}

/**
 * Format a tick number as a race timestamp (e.g., "@0:45.2")
 */
export function tickToTimestamp(tick: number): string {
  return `@${ticksToTime(tick)}`;
}

/**
 * Convert speed (distance per tick) to a more intuitive units display
 * Uses "units/sec" which feels more like real racing
 */
export function speedToDisplay(speedPerTick: number): string {
  const speedPerSecond = speedPerTick * (1000 / TICK_INTERVAL_MS);
  return `${speedPerSecond.toFixed(0)} u/s`;
}

/**
 * Format a time gap between two tick counts
 */
export function formatGap(ticksDifference: number): string {
  const secondsDiff = (ticksDifference * TICK_INTERVAL_MS) / 1000;
  if (secondsDiff < 0.1) {
    return '-';
  }
  if (secondsDiff < 1) {
    return `+${secondsDiff.toFixed(2)}s`;
  }
  return `+${secondsDiff.toFixed(1)}s`;
}

/**
 * Format distance in race-appropriate terms
 */
export function formatDistance(distance: number, lapLength: number): string {
  const laps = Math.floor(distance / lapLength);
  const inLap = distance % lapLength;
  const lapPercent = (inLap / lapLength) * 100;

  if (laps === 0) {
    return `${lapPercent.toFixed(0)}% of lap 1`;
  }
  return `Lap ${laps + 1}, ${lapPercent.toFixed(0)}%`;
}
