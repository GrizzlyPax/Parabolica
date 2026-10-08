// Current Conditions panel — the F1 broadcast "CURRENT CONDITIONS" block:
// the track's favoured stats and the weather's, with what each is doing to
// the field (Tracks & Weather v2, docs/TRACKS_WEATHER.md).
import type { WeatherState } from '../../data/weather';
import { isNeutralWeather } from '../../data/weather';
import type { CardStat } from '../../cards/types';
import { favourText } from '../../cards/favourText';

interface ConditionsPanelProps {
  weather: WeatherState | null;
  trackFavours: CardStat[];
}

function intensityLabel(i: number): string {
  if (i >= 0.8) return 'heavy';
  if (i >= 0.55) return 'moderate';
  return 'light';
}

function ConditionsPanel({ weather, trackFavours }: ConditionsPanelProps) {
  const items: { key: string; emoji: string; name: string; sub: string }[] = [];

  if (trackFavours.length) {
    items.push({ key: 'track', emoji: '🏁', name: 'Track favours', sub: favourText(trackFavours) });
  }
  if (weather && !isNeutralWeather(weather)) {
    const detail = [intensityLabel(weather.intensity), favourText(weather.favours)].filter(Boolean).join(' · ');
    items.push({ key: `w-${weather.id}`, emoji: weather.emoji, name: weather.name, sub: detail });
  }
  if (items.length === 0) {
    items.push({ key: 'neutral', emoji: '☀️', name: 'Neutral', sub: 'no favours' });
  }

  return (
    <div className="conditions-panel">
      <span className="conditions-panel-label">Current Conditions</span>
      <div className="conditions-panel-items">
        {items.map(it => (
          <span key={it.key} className="conditions-panel-item">
            <span className="conditions-panel-emoji">{it.emoji}</span>
            <span className="conditions-panel-text">
              <span className="conditions-panel-name">{it.name}</span>
              {it.sub && <span className="conditions-panel-sub">{it.sub}</span>}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default ConditionsPanel;
