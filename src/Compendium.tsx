import { useState } from 'react';
import { DRIVER_TAGS, CAR_TAGS, TEAM_TAGS, Tag } from './data/tags';
import { ALL_TRACKS, TrackEventTrigger, TrackEventEffect } from './generators/tracks';
import { DEFAULT_CONFIG } from './RaceEngine';
import SimLab from './simlab/SimLab';
import BetLab from './betlab/BetLab';
import './Compendium.css';

// Helper to format trigger descriptions
function formatTrigger(trigger: TrackEventTrigger): string {
  switch (trigger.type) {
    case 'lap':
      const laps = trigger.laps.map(l => l < 0 ? `final${l === -1 ? '' : ` ${Math.abs(l)}`}` : l);
      return `Lap${laps.length > 1 ? 's' : ''} ${laps.join(', ')}`;
    case 'interval':
      return `Every ${trigger.every} laps`;
    case 'random':
      return `${trigger.chance}% per lap`;
    case 'halfway':
      return 'Halfway point';
    case 'condition':
      return trigger.condition.replace(/_/g, ' ');
    case 'final_laps':
      return `Final ${trigger.count} lap${trigger.count > 1 ? 's' : ''}`;
    default:
      return 'Unknown';
  }
}

// Helper to format effect descriptions - all effects use apply_tag
function formatEffect(effect: TrackEventEffect): string {
  const targetDesc = effect.targets === 'leader' ? 'Leader'
    : effect.targets === 'last' ? `Last ${effect.count}`
    : effect.targets === 'top' ? `Top ${effect.count}`
    : effect.targets === 'bottom' ? `Bottom ${effect.count}`
    : `${effect.count} random`;
  return `${targetDesc} get ${effect.triggerTag.replace(/-/g, ' ')}`;
}

// Format tag effects as a compact string
function formatTagEffects(tag: Tag): string {
  const effects: string[] = [];
  if (tag.effects.speedModifier && tag.effects.speedModifier !== 1) {
    const pct = Math.round((tag.effects.speedModifier - 1) * 100);
    effects.push(`Speed ${pct > 0 ? '+' : ''}${pct}%`);
  }
  if (tag.effects.consistencyModifier && tag.effects.consistencyModifier !== 1) {
    const pct = Math.round((tag.effects.consistencyModifier - 1) * 100);
    effects.push(`Consistency ${pct > 0 ? '+' : ''}${pct}%`);
  }
  if (tag.effects.luckModifier && tag.effects.luckModifier !== 1) {
    const pct = Math.round((tag.effects.luckModifier - 1) * 100);
    effects.push(`Luck ${pct > 0 ? '+' : ''}${pct}%`);
  }
  if (tag.effects.crashResistance) {
    const pct = Math.round(tag.effects.crashResistance * 100);
    effects.push(`Crash Resist ${pct > 0 ? '+' : ''}${pct}%`);
  }
  if (tag.effects.pitSpeedModifier && tag.effects.pitSpeedModifier !== 1) {
    const pct = Math.round((1 - tag.effects.pitSpeedModifier) * 100);
    effects.push(`Pit Speed ${pct > 0 ? '+' : ''}${pct}%`);
  }
  return effects.join(', ') || 'No stat effects';
}

interface CompendiumProps {
  onBack: () => void;
}

type TabId = 'mechanics' | 'events' | 'tags' | 'tracks' | 'simlab' | 'betlab';

// Collapsible section component
function CollapsibleSection({
  title,
  icon,
  count,
  defaultOpen = false,
  children
}: {
  title: string;
  icon: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`collapsible-section ${isOpen ? 'open' : ''}`}>
      <button className="collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="collapsible-icon">{icon}</span>
        <span className="collapsible-title">{title}</span>
        {count !== undefined && <span className="collapsible-count">{count}</span>}
        <span className="collapsible-arrow">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className="collapsible-content">{children}</div>}
    </div>
  );
}

function Compendium({ onBack }: CompendiumProps) {
  const [activeTab, setActiveTab] = useState<TabId>('mechanics');

  return (
    <div className="compendium">
      <div className="compendium-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>📜 Compendium</h1>
        <p className="compendium-subtitle">All active systems, tags, and mechanics</p>
      </div>

      <div className="compendium-tabs">
        <button
          className={`tab-btn ${activeTab === 'mechanics' ? 'active' : ''}`}
          onClick={() => setActiveTab('mechanics')}
        >
          ⚙️ Mechanics
        </button>
        <button
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          ⚡ Events
        </button>
        <button
          className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          🏷️ Tags
        </button>
        <button
          className={`tab-btn ${activeTab === 'tracks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracks')}
        >
          🏁 Tracks
        </button>
        <button
          className={`tab-btn ${activeTab === 'simlab' ? 'active' : ''}`}
          onClick={() => setActiveTab('simlab')}
        >
          🔬 Sim Lab
        </button>
        <button
          className={`tab-btn ${activeTab === 'betlab' ? 'active' : ''}`}
          onClick={() => setActiveTab('betlab')}
        >
          🎲 Bet Lab
        </button>
      </div>

      <div className="compendium-content">
        {activeTab === 'mechanics' && (
          <div className="mechanics-section">
            <CollapsibleSection title="Speed Calculation" icon="🏃" defaultOpen={true}>
              <div className="compact-list">
                <div className="compact-row">
                  <span className="compact-label">Base Speed Range</span>
                  <span className="compact-value">{DEFAULT_CONFIG.baseSpeedMin} - {DEFAULT_CONFIG.baseSpeedMax} per tick</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Lap Length</span>
                  <span className="compact-value">{DEFAULT_CONFIG.lapLength} units</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Formula</span>
                  <span className="compact-value formula">Base × Driver × Car × Luck × Endurance</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Tire System" icon="🛞">
              <div className="compact-list">
                <div className="compact-row">
                  <span className="compact-label">Wear Rate</span>
                  <span className="compact-value">{DEFAULT_CONFIG.tireWearRate * 100}% per lap</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Mandatory Stops</span>
                  <span className="compact-value">{DEFAULT_CONFIG.mandatoryPitStops}</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Soft</span>
                  <span className="compact-value">Fast, wears quick</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Medium</span>
                  <span className="compact-value">Balanced</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Hard</span>
                  <span className="compact-value">Slow, durable</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Pit Stops" icon="🔧">
              <div className="compact-list">
                <div className="compact-row">
                  <span className="compact-label">Pit Lane Speed</span>
                  <span className="compact-value">{DEFAULT_CONFIG.pitLaneSpeedLimit} units/tick</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Pit Work Duration</span>
                  <span className="compact-value">{DEFAULT_CONFIG.pitWorkBaseDuration} ticks</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Slow Stop</span>
                  <span className="compact-value negative">+50% work time</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Quick Stop</span>
                  <span className="compact-value positive">-25% work time</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Pit Crew Stat</span>
                  <span className="compact-value">1★: 35%/8% slow/quick, 5★: 7%/28%</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Crashes" icon="💥">
              <div className="compact-list">
                <div className="compact-row">
                  <span className="compact-label">Enabled</span>
                  <span className="compact-value">{DEFAULT_CONFIG.enableCrashes ? 'Yes' : 'No'}</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Proximity Threshold</span>
                  <span className="compact-value">{DEFAULT_CONFIG.crashProximityThreshold * 100}% of track</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Base Chance</span>
                  <span className="compact-value">{DEFAULT_CONFIG.baseCrashChance * 100}%</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Aggression</span>
                  <span className="compact-value">Increases crash risk</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Driver Stats" icon="📊">
              <div className="compact-list">
                <div className="compact-row">
                  <span className="compact-label">Speed (0.85-1.15)</span>
                  <span className="compact-value">Raw pace multiplier</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Consistency (0.3-0.8)</span>
                  <span className="compact-value">Reduces variance</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Luck (0.3-0.8)</span>
                  <span className="compact-value">Random boost chance</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Acceleration (0.85-1.15)</span>
                  <span className="compact-value">Start/restart speed</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Endurance (0.85-1.15)</span>
                  <span className="compact-value">Late-race performance</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Aggression (0.3-0.8)</span>
                  <span className="compact-value">Risk/reward balance</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Car Stats" icon="🏎️">
              <div className="compact-list">
                <div className="compact-row">
                  <span className="compact-label">Power (1-5★)</span>
                  <span className="compact-value">Multiplies driver speed</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Grip (1-5★)</span>
                  <span className="compact-value">Multiplies consistency</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Reliability (1-5★)</span>
                  <span className="compact-value">Reduces failure chance</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Team Stats" icon="🏢">
              <div className="compact-list">
                <div className="compact-row">
                  <span className="compact-label">Tire Management (1-5★)</span>
                  <span className="compact-value">Strategy aggression</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Pit Crew (1-5★)</span>
                  <span className="compact-value">Fast/slow stop chances</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Overall Ratings" icon="🎯">
              <div className="compact-list">
                <div className="compact-row">
                  <span className="compact-label">Scale</span>
                  <span className="compact-value">50-99 (EA Sports style)</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label"><span className="rating-dot red">●</span> Below Average</span>
                  <span className="compact-value">&lt;70</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label"><span className="rating-dot yellow">●</span> Good</span>
                  <span className="compact-value">70-79</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label"><span className="rating-dot green">●</span> Great</span>
                  <span className="compact-value">80-89</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label"><span className="rating-dot purple">●</span> Elite</span>
                  <span className="compact-value">90+</span>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="events-section">
            <CollapsibleSection title="Track Events" icon="🌍" count={ALL_TRACKS.filter(t => t.event).length} defaultOpen={true}>
              <div className="compact-list">
                {ALL_TRACKS.filter(t => t.event).length === 0 ? (
                  <div className="compact-row">
                    <span className="compact-label">No track events configured yet</span>
                  </div>
                ) : (
                  ALL_TRACKS.filter(t => t.event).map(track => (
                    <div key={track.event!.id} className="compact-row expandable">
                      <span className="compact-label">
                        <span className="item-emoji">{track.event!.emoji}</span>
                        {track.event!.name}
                        <span className="item-source">{track.funEmoji} {track.name}</span>
                      </span>
                      <span className="compact-value">{formatTrigger(track.event!.trigger)} → {formatEffect(track.event!.effect)}</span>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Random Events" icon="🎲" count={3}>
              <div className="compact-list">
                <div className="compact-row">
                  <span className="compact-label">Enabled</span>
                  <span className="compact-value">{DEFAULT_CONFIG.enableRandomEvents ? 'Yes' : 'No'}</span>
                </div>
                <div className="compact-row">
                  <span className="compact-label">Base Chance</span>
                  <span className="compact-value">{DEFAULT_CONFIG.randomEventChance * 100}% per tick</span>
                </div>
                <div className="compact-row expandable">
                  <span className="compact-label"><span className="item-emoji">🔥</span>Mechanical Failure</span>
                  <span className="compact-value">Engine/gearbox issues → DNF</span>
                </div>
                <div className="compact-row expandable">
                  <span className="compact-label"><span className="item-emoji">💨</span>Tire Blowout</span>
                  <span className="compact-value">Sudden failure on worn tires</span>
                </div>
                <div className="compact-row expandable">
                  <span className="compact-label"><span className="item-emoji">💥</span>Collision</span>
                  <span className="compact-value">Contact in close proximity</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Tag Triggers" icon="🏷️" count={6}>
              <div className="compact-list">
                <div className="compact-row expandable">
                  <span className="compact-label"><span className="item-emoji">🔄</span>Passive</span>
                  <span className="compact-value">Always active throughout race</span>
                </div>
                <div className="compact-row expandable">
                  <span className="compact-label"><span className="item-emoji">🏁</span>Race Start</span>
                  <span className="compact-value">Beginning of race</span>
                </div>
                <div className="compact-row expandable">
                  <span className="compact-label"><span className="item-emoji">🔧</span>Pit Stop</span>
                  <span className="compact-value">During pit stops</span>
                </div>
                <div className="compact-row expandable">
                  <span className="compact-label"><span className="item-emoji">🏎️</span>Overtake</span>
                  <span className="compact-value">When passing another car</span>
                </div>
                <div className="compact-row expandable">
                  <span className="compact-label"><span className="item-emoji">⚠️</span>Crash Proximity</span>
                  <span className="compact-value">When close to another car</span>
                </div>
                <div className="compact-row expandable">
                  <span className="compact-label"><span className="item-emoji">🏆</span>Final Lap</span>
                  <span className="compact-value">Last lap of race</span>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="tags-section">
            <CollapsibleSection title="Driver Tags" icon="👤" count={DRIVER_TAGS.length} defaultOpen={true}>
              <p className="section-note">15% chance on driver generation</p>
              <div className="compact-list">
                {DRIVER_TAGS.map(tag => (
                  <div key={tag.id} className="compact-row expandable">
                    <span className="compact-label">
                      <span className="item-emoji">{tag.emoji}</span>
                      {tag.name}
                      <span className="item-trigger">{tag.trigger.replace('_', ' ')}</span>
                    </span>
                    <span className="compact-value">{formatTagEffects(tag)}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Car Tags" icon="🏎️" count={CAR_TAGS.length}>
              <p className="section-note">15% chance on car generation. Affects both drivers.</p>
              <div className="compact-list">
                {CAR_TAGS.map(tag => (
                  <div key={tag.id} className="compact-row expandable">
                    <span className="compact-label">
                      <span className="item-emoji">{tag.emoji}</span>
                      {tag.name}
                      <span className="item-trigger">{tag.trigger.replace('_', ' ')}</span>
                    </span>
                    <span className="compact-value">{formatTagEffects(tag)}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Team Tags" icon="🏢" count={TEAM_TAGS.length}>
              <p className="section-note">15% chance on team generation. Affects entire team.</p>
              <div className="compact-list">
                {TEAM_TAGS.map(tag => (
                  <div key={tag.id} className="compact-row expandable">
                    <span className="compact-label">
                      <span className="item-emoji">{tag.emoji}</span>
                      {tag.name}
                      <span className="item-trigger">{tag.trigger.replace('_', ' ')}</span>
                    </span>
                    <span className="compact-value">{formatTagEffects(tag)}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {activeTab === 'tracks' && (
          <div className="tracks-section">
            <CollapsibleSection title="All Tracks" icon="🏁" count={ALL_TRACKS.length} defaultOpen={true}>
              <div className="compact-list">
                {ALL_TRACKS.map(track => (
                  <div key={track.id} className="compact-row expandable">
                    <span className="compact-label">
                      <span className="item-emoji">{track.funEmoji}</span>
                      {track.name}
                      <span className="item-trigger">{track.laps} laps</span>
                    </span>
                    <span className="compact-value">{track.event ? `${track.event.emoji} ${track.event.name}` : 'No event'}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {activeTab === 'simlab' && (
          <SimLab />
        )}

        {activeTab === 'betlab' && (
          <BetLab />
        )}
      </div>
    </div>
  );
}

export default Compendium;
