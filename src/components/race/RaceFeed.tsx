import { FeedItem } from '../../feed/commentary';
import './RaceFeed.css';
import { GameIcon } from '../../icons/GameIcon';

interface RaceFeedProps {
  items: FeedItem[];
  className?: string;
}

/**
 * The race's narrator: a persistent, persona-voiced feed of race moments.
 * Newest on top. Items accumulate for the whole race (capped upstream).
 */
function RaceFeed({ items, className = '' }: RaceFeedProps) {
  return (
    <div className={`story-feed ${className}`}>
      <div className="story-feed-header">
        <span className="story-feed-label"><GameIcon name="ui.feed" size={14} /> Race Feed</span>
        <span className="story-feed-count">{items.length}</span>
      </div>
      <div className="story-feed-list">
        {items.length === 0 ? (
          <div className="story-feed-empty">
            <span className="story-feed-empty-text">The caller clears their throat...</span>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className={`story-item story-${item.persona} ${item.emphasis === 'big' ? 'story-big' : ''}`}
              style={item.color ? ({ '--story-accent': item.color } as React.CSSProperties) : undefined}
            >
              <span className="story-avatar"><GameIcon name={item.personaEmoji} fallback={item.personaEmoji} size={18} /></span>
              <div className="story-body">
                <div className="story-meta">
                  <span className="story-persona">{item.personaName}</span>
                  <span className="story-lap">LAP {item.frame ? '—' : item.lap}</span>
                </div>
                {item.frame && <p className="story-frame">{item.frame.before}</p>}
                <p className="story-text">
                  {item.drivers?.length ? (
                    withDriverHighlights(item.text, item.drivers)
                  ) : (
                    item.text
                  )}
                </p>
                {item.frame && <p className="story-frame">{item.frame.after}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Wrap driver names in the text in chip spans: the name alone, no emoji (#763, docs/ICONS.md)
function withDriverHighlights(
  text: string,
  drivers: Array<{ id: number; name: string; emoji: string }>
): React.ReactNode {
  // Split on the first matching driver name only when present; keep it simple
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    let earliest: { idx: number; driver: (typeof drivers)[0] } | null = null;
    for (const d of drivers) {
      const idx = remaining.indexOf(d.name);
      if (idx !== -1 && (earliest === null || idx < earliest.idx)) {
        earliest = { idx, driver: d };
      }
    }
    if (!earliest) {
      parts.push(remaining);
      break;
    }
    if (earliest.idx > 0) parts.push(remaining.slice(0, earliest.idx));
    parts.push(
      <span key={key++} className="story-driver-chip">{earliest.driver.name}</span>
    );
    remaining = remaining.slice(earliest.idx + earliest.driver.name.length);
  }

  return parts;
}

export default RaceFeed;
