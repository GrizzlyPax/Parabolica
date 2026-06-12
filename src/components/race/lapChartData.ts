// Shared builder: engine lap history + driver state → LapChart inputs.
// Used by the live Lap view (WatchMode) and the completed-race trace (#173),
// so both render the identical chart from the identical data shape.
import type { Driver } from '../../RaceEngine';
import type { LapChartSeries } from './LapChart';

export interface LapSample { lap: number; order: number[]; sc: boolean }

export interface LapChartData {
  series: LapChartSeries[];
  laps: number[];
  scSampleIdx: Set<number>;
}

const NAME_SUFFIXES = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V']);

function surnameCode(name: string): string {
  const parts = name.split(' ').filter(p => p.length > 0);
  const filtered = parts.filter(p => !NAME_SUFFIXES.has(p.toUpperCase()));
  return (filtered[filtered.length - 1] || parts[parts.length - 1] || '').slice(0, 3).toUpperCase();
}

export function buildLapChartData(samples: LapSample[], drivers: Driver[]): LapChartData {
  const laps = samples.map(s => s.lap);
  const scSampleIdx = new Set<number>();
  samples.forEach((s, i) => { if (s.sc) scSampleIdx.add(i); });

  const series: LapChartSeries[] = drivers.map(d => {
    const dnfLap = d.status === 'dnf' ? (d.dnfInfo?.lap ?? Infinity) : Infinity;
    const positions = samples.map(s => {
      // The line ends at the last lap they were racing — no dive through the
      // field on the way out; the chart marks the spot with an ✗.
      if (s.lap >= dnfLap) return null;
      const idx = s.order.indexOf(d.id);
      return idx >= 0 ? idx + 1 : null;
    });
    return {
      id: d.id,
      name: d.name,
      color: d.color,
      accentColor: d.accentColor,
      dashed: d.driverSlot === 2,
      code: surnameCode(d.name),
      emoji: d.emoji,
      positions,
      pitLaps: (d.pitStops ?? []).map(p => p.lap),
      dnf: d.status === 'dnf',
    };
  });

  return { series, laps, scSampleIdx };
}
