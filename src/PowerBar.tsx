import { RacePowerSet, RacePower } from './powers';
import { Driver } from './RaceEngine';
import './PowerBar.css';

interface PowerBarProps {
  powers: RacePowerSet;
  usedPowers: { blessing: boolean; curse: boolean; godPower: boolean };
  onUsePower: (powerType: 'blessing' | 'curse' | 'godPower') => void;
  favoriteTeamDrivers: Driver[];
  rivalTeamDrivers: Driver[];
  disabled?: boolean; // Disable during race finish, etc.
}

function PowerBar({ powers, usedPowers, onUsePower, favoriteTeamDrivers, rivalTeamDrivers, disabled }: PowerBarProps) {
  const renderPowerButton = (
    power: RacePower,
    powerType: 'blessing' | 'curse' | 'godPower',
    used: boolean,
    targetDrivers: Driver[] | 'chaos'
  ) => {
    const categoryClass = power.category;
    // Show both driver names for team powers
    const targetName = targetDrivers === 'chaos'
      ? 'Chaos'
      : targetDrivers.length > 0
        ? targetDrivers.map(d => d.name).join(' & ')
        : '???';

    return (
      <button
        className={`power-button ${categoryClass} ${used ? 'used' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !used && !disabled && onUsePower(powerType)}
        disabled={used || disabled}
        title={power.description}
      >
        <span className="power-btn-emoji">{power.emoji}</span>
        <div className="power-btn-info">
          <span className="power-btn-name">{power.name}</span>
          <span className="power-btn-target">
            {power.category === 'god' ? '✨ Chaos' : `→ ${targetName}`}
          </span>
        </div>
        {used && <span className="power-used-badge">USED</span>}
      </button>
    );
  };

  return (
    <div className="power-bar">
      <div className="power-bar-label">POWERS</div>
      <div className="power-buttons">
        {renderPowerButton(powers.blessing, 'blessing', usedPowers.blessing, favoriteTeamDrivers)}
        {renderPowerButton(powers.curse, 'curse', usedPowers.curse, rivalTeamDrivers)}
        {renderPowerButton(powers.godPower, 'godPower', usedPowers.godPower, 'chaos')}
      </div>
      <div className="selected-drivers-mini">
        {favoriteTeamDrivers.length > 0 && (
          <div className="mini-team favorite">
            <span className="mini-star">⭐</span>
            {favoriteTeamDrivers.map(d => (
              <span key={d.id} className="mini-emoji">{d.emoji}</span>
            ))}
          </div>
        )}
        {rivalTeamDrivers.length > 0 && (
          <div className="mini-team rival">
            <span className="mini-skull">💀</span>
            {rivalTeamDrivers.map(d => (
              <span key={d.id} className="mini-emoji">{d.emoji}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PowerBar;
