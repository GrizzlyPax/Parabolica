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
 * Note: Sim resolution is 100ms (tenths), so we only show one decimal place
 */
export function ticksToShortTime(ticks: number): string {
  const totalSeconds = (ticks * TICK_INTERVAL_MS) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
  }
  return `${seconds.toFixed(1)}s`;
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
 * Note: Sim resolution is 100ms (tenths), so we only show one decimal place
 */
export function formatGap(ticksDifference: number): string {
  const secondsDiff = (ticksDifference * TICK_INTERVAL_MS) / 1000;
  // Show +0.0s for very small gaps so users know there IS data
  // (previously showed "-" which looked like missing data)
  if (secondsDiff < 60) {
    return `+${secondsDiff.toFixed(1)}s`;
  }
  // Over 60 seconds: format as minutes
  const minutes = Math.floor(secondsDiff / 60);
  const seconds = secondsDiff % 60;
  return `+${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
}

/**
 * Format a lap gap (e.g., "+1 LAP", "+2 LAPS")
 */
export function formatLapGap(lapsDown: number): string {
  if (lapsDown <= 0) return '-';
  return `+${lapsDown} LAP${lapsDown > 1 ? 'S' : ''}`;
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
