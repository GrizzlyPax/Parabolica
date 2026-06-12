// Current Conditions panel — the F1 broadcast "CURRENT CONDITIONS" block.
// A calm, permanent home for the weather + track-character layers on the data
// screen, rather than only transient header chips.
import type { ConditionChip } from './types';

interface ConditionsBarProps {
  conditions: ConditionChip[];
}

function ConditionsBar({ conditions }: ConditionsBarProps) {
  return (
    <div className="conditions-bar">
      <span className="conditions-bar-label">Current Conditions</span>
      <div className="conditions-bar-items">
        {conditions.length === 0 ? (
          <span className="conditions-bar-item">
            <span className="conditions-bar-emoji">☀️</span>
            <span className="conditions-bar-name">Clear</span>
          </span>
        ) : (
          conditions.map(c => (
            <span key={c.label} className="conditions-bar-item">
              <span className="conditions-bar-emoji">{c.emoji}</span>
              <span className="conditions-bar-name">{c.label}</span>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export default ConditionsBar;
