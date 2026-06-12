// Horizontal track strip — drivers as dots along a 0→100% race-progress line.
// The F1 broadcast "track pulse" bottom element; seeds the #19 timeline view.
// Cheap to render, reads only live driver state.
import type { Driver } from '../../RaceEngine';

interface TrackStripProps {
  drivers: Driver[];
  totalLaps: number;
  lapLength: number;
  focusedDriverIds?: Set<number>;
}

function TrackStrip({ drivers, totalLaps, lapLength, focusedDriverIds }: TrackStripProps) {
  const racing = drivers.filter(d => d.status === 'racing' || d.status === 'pitting');
  const progress = (d: Driver) =>
    Math.max(0, Math.min(1, (d.currentLap + (d.position % lapLength) / lapLength) / totalLaps));

  return (
    <div className="track-strip" aria-hidden>
      <div className="track-strip-line">
        <span className="track-strip-flag track-strip-start">▕</span>
        <span className="track-strip-flag track-strip-finish">🏁</span>
        {racing.map(d => {
          const focused = focusedDriverIds?.has(d.id);
          return (
            <span
              key={d.id}
              className={`track-strip-dot ${focused ? 'focused' : ''} ${d.status === 'pitting' ? 'pitting' : ''}`}
              style={{
                left: `${progress(d) * 100}%`,
                background: d.color,
                borderColor: d.accentColor || '#fff',
              }}
              title={d.name}
            />
          );
        })}
      </div>
    </div>
  );
}

export default TrackStrip;
