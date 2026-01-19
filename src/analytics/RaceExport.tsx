import { useState } from 'react';
import { Driver, RaceEvent, RaceState, TickLog } from '../RaceEngine';
import { ticksToTime, ticksToShortTime } from '../utils/raceTime';

interface RaceExportProps {
  drivers: Driver[];
  raceState: RaceState;
  events: RaceEvent[];
  tickLogs: TickLog[];
}

function generateTextReport(
  drivers: Driver[],
  raceState: RaceState,
  events: RaceEvent[],
  tickLogs: TickLog[]
): string {
  const lines: string[] = [];

  // Header
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('          THE ELDRITCH GRAND PRIX - RACE RESULTS');
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('');

  // Race summary
  lines.push(`Race Duration: ${ticksToTime(raceState.totalTicks)}`);
  lines.push(`Total Drivers: ${drivers.length}`);
  lines.push(`Lead Changes: ${raceState.leadChanges}`);
  lines.push('');

  // Final standings
  lines.push('FINAL STANDINGS');
  lines.push('───────────────────────────────────────────────────────');
  lines.push('Pos  Driver              Time        Best Lap    Events');
  lines.push('───────────────────────────────────────────────────────');

  raceState.finishOrder.forEach((driverId, index) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    const totalTime = driver.lapTimes.reduce((sum, t) => sum + t, 0);
    const bestLap = driver.lapTimes.length > 0 ? Math.min(...driver.lapTimes) : 0;
    const driverEvents = events.filter(e => e.driverId === driverId);
    const luckCount = driverEvents.filter(e => e.type === 'luck_trigger').length;
    const chaosBoosts = driverEvents.filter(e => e.type === 'chaos_boost').length;
    const chaosPenalties = driverEvents.filter(e => e.type === 'chaos_penalty').length;

    const pos = `${index + 1}`.padStart(2);
    const name = `${driver.emoji} ${driver.shortName || driver.name}`.padEnd(18);
    const time = ticksToTime(totalTime).padStart(10);
    const best = ticksToTime(bestLap).padStart(10);
    const eventStr = `L:${luckCount} C+:${chaosBoosts} C-:${chaosPenalties}`;

    lines.push(`${pos}   ${name} ${time}  ${best}    ${eventStr}`);
  });

  lines.push('───────────────────────────────────────────────────────');
  lines.push('');

  // Key moments
  const keyMoments = events.filter(
    e => e.type === 'lead_change' || e.type === 'race_finish' || e.magnitude >= 0.6
  ).sort((a, b) => a.tick - b.tick);

  if (keyMoments.length > 0) {
    lines.push('KEY MOMENTS');
    lines.push('───────────────────────────────────────────────────────');
    keyMoments.slice(0, 15).forEach(event => {
      const time = ticksToShortTime(event.tick).padStart(7);
      lines.push(`${time}  ${event.emoji} ${event.driverName}: ${event.description}`);
    });
    lines.push('');
  }

  // Driver stats breakdown
  lines.push('DRIVER STATISTICS');
  lines.push('───────────────────────────────────────────────────────');

  raceState.finishOrder.forEach((driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    const driverLogs = tickLogs.filter(l => l.driverId === driverId);
    const avgSpeed = driverLogs.length > 0
      ? driverLogs.reduce((sum, l) => sum + l.factors.finalSpeed, 0) / driverLogs.length
      : 0;

    lines.push(`${driver.emoji} ${driver.name}`);
    lines.push(`  Stats: Speed=${driver.stats.baseSpeed.toFixed(2)} Consistency=${driver.stats.consistency.toFixed(2)} Luck=${driver.stats.luck.toFixed(2)} Endurance=${driver.stats.endurance.toFixed(2)}`);
    lines.push(`  Avg Race Speed: ${avgSpeed.toFixed(2)}`);
    lines.push(`  Lap Times: ${driver.lapTimes.map(t => ticksToShortTime(t)).join(', ')}`);
    lines.push('');
  });

  lines.push('═══════════════════════════════════════════════════════');

  return lines.join('\n');
}

function generateCSV(
  drivers: Driver[],
  raceState: RaceState,
  events: RaceEvent[]
): string {
  const lines: string[] = [];

  // Header
  lines.push('Position,Emoji,Name,Total Time,Best Lap,Luck Events,Chaos Boosts,Chaos Penalties,Base Speed,Consistency,Luck,Endurance');

  // Data rows
  raceState.finishOrder.forEach((driverId, index) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    const totalTime = driver.lapTimes.reduce((sum, t) => sum + t, 0);
    const bestLap = driver.lapTimes.length > 0 ? Math.min(...driver.lapTimes) : 0;
    const driverEvents = events.filter(e => e.driverId === driverId);
    const luckCount = driverEvents.filter(e => e.type === 'luck_trigger').length;
    const chaosBoosts = driverEvents.filter(e => e.type === 'chaos_boost').length;
    const chaosPenalties = driverEvents.filter(e => e.type === 'chaos_penalty').length;

    lines.push([
      index + 1,
      driver.emoji,
      `"${driver.name}"`,
      ticksToTime(totalTime),
      ticksToTime(bestLap),
      luckCount,
      chaosBoosts,
      chaosPenalties,
      driver.stats.baseSpeed.toFixed(3),
      driver.stats.consistency.toFixed(3),
      driver.stats.luck.toFixed(3),
      driver.stats.endurance.toFixed(3),
    ].join(','));
  });

  return lines.join('\n');
}

function RaceExport({ drivers, raceState, events, tickLogs }: RaceExportProps) {
  const [copied, setCopied] = useState<'text' | 'csv' | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  if (!raceState.raceFinished) {
    return null;
  }

  const textReport = generateTextReport(drivers, raceState, events, tickLogs);
  const csvReport = generateCSV(drivers, raceState, events);

  const copyToClipboard = async (content: string, type: 'text' | 'csv') => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="race-export">
      <div className="export-buttons">
        <button
          className="export-btn"
          onClick={() => copyToClipboard(textReport, 'text')}
        >
          {copied === 'text' ? 'Copied!' : 'Copy Report'}
        </button>
        <button
          className="export-btn"
          onClick={() => copyToClipboard(csvReport, 'csv')}
        >
          {copied === 'csv' ? 'Copied!' : 'Copy CSV'}
        </button>
        <button
          className="export-btn"
          onClick={() => downloadFile(csvReport, 'race-results.csv', 'text/csv')}
        >
          Download CSV
        </button>
        <button
          className="export-btn preview-btn"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? 'Hide Preview' : 'Preview'}
        </button>
      </div>

      {showPreview && (
        <pre className="export-preview">
          {textReport}
        </pre>
      )}
    </div>
  );
}

export default RaceExport;
