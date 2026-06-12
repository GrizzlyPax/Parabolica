// Current Conditions panel — the F1 broadcast "CURRENT CONDITIONS" block,
// expanded: weather + track character with a plain-language readout of what
// each is doing to the race. A permanent home for the conditions layer.
import type { WeatherState } from '../../data/weather';
import type { TrackTag } from '../../data/trackTags';

interface ConditionsPanelProps {
  weather: WeatherState | null;
  trackTags: TrackTag[];
}

type Effects = { speedModifier?: number; consistencyModifier?: number; crashResistance?: number };

/** Plain-language summary of what an effect set does to the field. */
function describe(e: Effects | undefined): string {
  if (!e) return '';
  const parts: string[] = [];
  if (e.speedModifier && e.speedModifier > 1) parts.push('faster pace');
  if (e.speedModifier && e.speedModifier < 1) parts.push('slower pace');
  if (e.consistencyModifier && e.consistencyModifier < 1) parts.push('more variance');
  if (e.crashResistance && e.crashResistance < 0) parts.push('more crashes');
  if (e.crashResistance && e.crashResistance > 0) parts.push('safer');
  return parts.join(' · ');
}

function intensityLabel(i: number): string {
  if (i >= 0.8) return 'heavy';
  if (i >= 0.55) return 'moderate';
  return 'light';
}

function ConditionsPanel({ weather, trackTags }: ConditionsPanelProps) {
  const items: { key: string; emoji: string; name: string; sub: string }[] = [];

  if (weather && weather.id !== 'clear') {
    const detail = [intensityLabel(weather.intensity), describe(weather.effects)]
      .filter(Boolean).join(' · ');
    items.push({ key: `w-${weather.id}`, emoji: weather.emoji, name: weather.name, sub: detail });
  }
  for (const t of trackTags) {
    items.push({ key: `t-${t.id}`, emoji: t.emoji, name: t.name, sub: describe(t.passive) });
  }
  if (items.length === 0) {
    items.push({ key: 'clear', emoji: '☀️', name: 'Clear', sub: 'no effects' });
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
