import { useState } from 'react';
import { RaceEvent, RaceEventType } from '../RaceEngine';
import { ticksToShortTime } from '../utils/raceTime';

// "significant" filters to only show important events
export type EventFilterType = RaceEventType | 'all' | 'significant';

interface EventTimelineProps {
  events: RaceEvent[];
  filter: EventFilterType;
  onFilterChange: (filter: EventFilterType) => void;
}

// Events that are always significant (not noise)
const SIGNIFICANT_EVENT_TYPES: RaceEventType[] = [
  'lead_change',
  'overtake',
  'race_finish',
  'crash',
  'dnf',
  'pit_exit',
  'slow_pit_stop',
  'quick_pit_stop',
  'tire_failure',
];

// Determines if an event is significant enough to show in filtered view
function isSignificantEvent(event: RaceEvent): boolean {
  // Always show these event types
  if (SIGNIFICANT_EVENT_TYPES.includes(event.type)) {
    return true;
  }

  // Show lap completions only for final lap
  if (event.type === 'lap_complete' && event.description.includes('final')) {
    return true;
  }

  // Show high-magnitude luck/chaos events (bigger impact)
  if (
    (event.type === 'luck_trigger' || event.type === 'chaos_boost' || event.type === 'chaos_penalty') &&
    event.magnitude >= 0.5
  ) {
    return true;
  }

  // Show significant endurance decay
  if (event.type === 'endurance_decay' && event.magnitude >= 0.6) {
    return true;
  }

  return false;
}

const IMPACT_EXPLANATIONS: Record<RaceEventType, (event: RaceEvent) => string> = {
  luck_trigger: (e) => `${e.driverName}'s luck stat triggered a speed boost. High luck drivers get these more often.`,
  chaos_boost: (e) => `A random positive chaos event gave ${e.driverName} extra speed. Chaos Level setting affects how often this happens.`,
  chaos_penalty: (e) => `A random negative chaos event slowed ${e.driverName} down. Higher Chaos Level means bigger swings.`,
  endurance_decay: (e) => `${e.driverName}'s endurance is wearing down in late laps. Low endurance drivers struggle as races go on.`,
  lap_complete: (e) => `${e.driverName} completed a lap. Lap times factor into final race standings.`,
  lead_change: (e) => `${e.driverName} took the lead! Lead changes indicate a competitive race.`,
  overtake: (e) => `${e.driverName} passed multiple opponents. Quick position gains often come from luck or chaos boosts.`,
  race_finish: (e) => `${e.driverName} crossed the finish line! Final position locked in.`,
  // New tire/pit/crash events
  pit_entry: (e) => `${e.driverName} entered the pit lane for a tire change. Pit stops are mandatory once per race.`,
  pit_exit: (e) => `${e.driverName} exited the pits with fresh tires. New rubber means better grip and speed.`,
  slow_pit_stop: (e) => `${e.driverName}'s pit crew fumbled! Doubled pit stop time. Better pit crews have this happen less often.`,
  quick_pit_stop: (e) => `${e.driverName}'s pit crew nailed it! Faster pit stop. Better pit crews have higher chances of quick stops.`,
  tire_warning: (e) => `${e.driverName}'s tires are critically worn. They should pit soon or risk a blowout!`,
  tire_failure: (e) => `${e.driverName} suffered a catastrophic tire failure! Out of the race.`,
  mechanical_failure: (e) => `${e.driverName} suffered a mechanical failure! Car reliability and driver luck affect this.`,
  crash: (e) => `${e.driverName} was involved in a collision! Racing too close to other drivers is risky.`,
  dnf: (e) => `${e.driverName} has retired from the race. They won't be finishing today.`,
  close_call: (e) => `${e.driverName} narrowly avoided a collision! Close racing is thrilling but dangerous.`,
  track_event: () => `A track event has been triggered! The race dynamics are about to change.`,
  track_event_effect: (e) => `${e.driverName} was affected by a track event! This could impact their race.`,
  tag_activation: (e) => `${e.driverName}'s tag activated! Tags give drivers unique abilities and effects.`,
};

const EVENT_LABELS: Record<RaceEventType, string> = {
  luck_trigger: 'LUCK',
  chaos_boost: 'CHAOS+',
  chaos_penalty: 'CHAOS-',
  endurance_decay: 'FATIGUE',
  lap_complete: 'LAP',
  lead_change: 'LEAD',
  overtake: 'OVERTAKE',
  race_finish: 'FINISH',
  // New event labels
  pit_entry: 'PIT IN',
  pit_exit: 'PIT OUT',
  slow_pit_stop: 'SLOW!',
  quick_pit_stop: 'FAST!',
  tire_warning: 'TIRES',
  tire_failure: 'BLOWOUT',
  mechanical_failure: 'ENGINE',
  crash: 'CRASH',
  dnf: 'DNF',
  close_call: 'CLOSE!',
  track_event: 'TRACK',
  track_event_effect: 'EFFECT',
  tag_activation: 'TAG',
};

const EVENT_COLORS: Record<RaceEventType, string> = {
  luck_trigger: '#d8c898',
  chaos_boost: '#98c8d8',
  chaos_penalty: '#d898a8',
  endurance_decay: '#d8a898',
  lap_complete: '#a8a8a8',
  lead_change: '#c9a8e9',
  overtake: '#a8d8a8',
  race_finish: '#ffd700',
  // New event colors
  pit_entry: '#f1c40f',
  pit_exit: '#27ae60',
  slow_pit_stop: '#e74c3c',
  quick_pit_stop: '#2ecc71',
  tire_warning: '#e67e22',
  tire_failure: '#c0392b',
  mechanical_failure: '#8e44ad',
  crash: '#e74c3c',
  dnf: '#7f8c8d',
  close_call: '#f39c12',
  track_event: '#9b59b6',
  track_event_effect: '#8e44ad',
  tag_activation: '#3498db',
};

function EventTimeline({ events, filter, onFilterChange }: EventTimelineProps) {
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);

  const filteredEvents = filter === 'all'
    ? events
    : filter === 'significant'
      ? events.filter(isSignificantEvent)
      : events.filter(e => e.type === filter);

  // Show most recent events first
  const displayEvents = [...filteredEvents].reverse().slice(0, 100);

  const filterOptions: Array<{ value: EventFilterType; label: string }> = [
    { value: 'significant', label: 'Key Events' },
    { value: 'all', label: 'All Events' },
    { value: 'lead_change', label: 'Lead Changes' },
    { value: 'overtake', label: 'Overtakes' },
    { value: 'luck_trigger', label: 'Luck' },
    { value: 'chaos_boost', label: 'Chaos+' },
    { value: 'chaos_penalty', label: 'Chaos-' },
    { value: 'race_finish', label: 'Finishes' },
  ];

  const renderMagnitudePips = (magnitude: number) => {
    const filled = Math.round(magnitude * 5);
    return (
      <div className="tooltip-magnitude">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={`magnitude-pip ${i < filled ? 'filled' : ''}`} />
        ))}
      </div>
    );
  };

  return (
    <div className="event-timeline">
      <div className="timeline-header">
        <h4>Event Timeline</h4>
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as EventFilterType)}
          className="timeline-filter"
        >
          {filterOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="timeline-stats">
        <span className="event-count">{filteredEvents.length} events</span>
        {filter !== 'all' && (
          <span className="filter-active">filtered</span>
        )}
      </div>

      <div className="timeline-list">
        {displayEvents.length === 0 ? (
          <div className="no-events">No events yet...</div>
        ) : (
          displayEvents.map((event, index) => (
            <div
              key={`${event.tick}-${event.driverId}-${event.type}-${index}`}
              className={`timeline-event impact-${event.impact}`}
              onMouseEnter={() => setHoveredEvent(index)}
              onMouseLeave={() => setHoveredEvent(null)}
              style={{ position: 'relative' }}
            >
              <span className="event-tick">{ticksToShortTime(event.tick)}</span>
              <span className="event-emoji">{event.emoji}</span>
              <span
                className="event-type"
                style={{ color: EVENT_COLORS[event.type] }}
              >
                {EVENT_LABELS[event.type]}
              </span>
              <span className="event-driver">{event.driverName}</span>
              <span className="event-description">{event.description}</span>
              {event.magnitude > 0.5 && (
                <span className="event-magnitude">!</span>
              )}

              {hoveredEvent === index && (
                <div className="event-tooltip">
                  <div className="tooltip-header">
                    <span className="tooltip-emoji">{event.emoji}</span>
                    <span className="tooltip-title">{event.driverName}</span>
                    <span className="tooltip-time">{ticksToShortTime(event.tick)}</span>
                  </div>
                  <div className="tooltip-description">
                    {IMPACT_EXPLANATIONS[event.type](event)}
                  </div>
                  <div className="tooltip-impact">
                    <span className="tooltip-impact-label">Impact:</span>
                    <span className={`tooltip-impact-value ${event.impact}`}>
                      {event.impact === 'positive' ? 'Beneficial' :
                       event.impact === 'negative' ? 'Harmful' : 'Neutral'}
                    </span>
                    {renderMagnitudePips(event.magnitude)}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default EventTimeline;
