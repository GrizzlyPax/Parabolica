// Horizontal strip — drivers as dots along a line. Two modes:
//   'race' — full race distance (0 → 100%): where everyone is in the race.
//   'lap'  — a single straightened lap: where cars sit on the track right now,
//            with pit-lane traffic shown on a sub-line.
// The F1 broadcast bottom element; seeds the #19 timeline view.
import type { Driver } from '../../RaceEngine';

interface TrackStripProps {
  drivers: Driver[];
  totalLaps: number;
  lapLength: number;
  mode: 'race' | 'lap';
  label: string;
  focusedDriverIds?: Set<number>;
}

function TrackStrip({ drivers, totalLaps, lapLength, mode, label, focusedDriverIds }: TrackStripProps) {
  const racing = drivers.filter(d => d.status === 'racing' || d.status === 'pitting');

  // 0–1 position along the strip for a driver in the current mode.
  const pos = (d: Driver) => {
    if (mode === 'race') {
      return Math.max(0, Math.min(1, (d.currentLap + (d.position % lapLength) / lapLength) / totalLaps));
    }
    return Math.max(0, Math.min(1, (d.position % lapLength) / lapLength));
  };

  const onTrack = mode === 'lap' ? racing.filter(d => d.status !== 'pitting') : racing;
  const inPits = mode === 'lap' ? racing.filter(d => d.status === 'pitting') : [];

  const dot = (d: Driver) => (
    <span
      key={d.id}
      className={`track-strip-dot ${focusedDriverIds?.has(d.id) ? 'focused' : ''}`}
      style={{ left: `${pos(d) * 100}%`, background: d.color, borderColor: d.accentColor || '#fff' }}
      title={d.name}
    />
  );

  return (
    <div className={`track-strip track-strip-${mode}`}>
      <span className="track-strip-label">{label}</span>
      <div className="track-strip-track">
        <div className="track-strip-line">
          <span className="track-strip-flag track-strip-finish">🏁</span>
          {onTrack.map(dot)}
        </div>
        {mode === 'lap' && (
          <div className="track-strip-pitline">
            <span className="track-strip-pit-label">🔧</span>
            {inPits.map(dot)}
          </div>
        )}
      </div>
    </div>
  );
}

export default TrackStrip;
