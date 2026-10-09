// "Priority stats" in plain words (#361): what the track and the weather
// favour, +N% for everyone. One sentence, shared by the Paddock and Run Setup.
import { STAT_LABELS } from './deck';
import type { CardStat } from './types';
import './PriorityLine.css';

interface Source { name: string; favours: readonly CardStat[] }

export function PriorityLine({ label, track, weather, className }: { label: string; track: Source; weather?: Source | null; className?: string }) {
  // Deck tracks and weathers are named for their stats ("Speed + Power"), so
  // the name only shows when it says something the stats don't.
  const part = (s: Source, kind: string) => {
    const stats = s.favours.map(f => STAT_LABELS[f.stat]).join(' + ');
    return <><b>{stats}</b> ({s.name && s.name !== stats ? `${s.name} ` : ''}{kind}, +{Math.round(s.favours[0].pct)}%)</>;
  };
  const hasTrack = track.favours.length > 0;
  const hasWeather = !!weather && weather.favours.length > 0;
  if (!hasTrack && !hasWeather) return null;
  return (
    <p className={`pk-priority ${className ?? ''}`.trim()}>
      <span className="rs-k">{label}</span>{' '}
      {hasTrack && part(track, 'track')}
      {hasWeather && <>{hasTrack && ' and '}{part(weather!, 'weather')}</>}
      , for everyone.
    </p>
  );
}
