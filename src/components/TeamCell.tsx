import { useState } from 'react';
import { Team } from '../data/teams';
import './TeamCell.css';

// Calculate relative luminance of a color (0 = dark, 1 = light)
function getLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // sRGB luminance formula
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Check if a color is considered "light" (luminance > 0.4)
function isLightColor(hexColor: string): boolean {
  return getLuminance(hexColor) > 0.4;
}

// Driver info for back of card
export interface CardDriver {
  name: string;
  slot: number;
  rating?: string;
  ratingTier?: string;
}

// Car info for back of card
export interface CardCar {
  name: string;
  rating?: string;
  ratingTier?: string;
}

interface TeamCellProps {
  team: Team;
  isSelected: boolean;
  onClick: () => void;
  showCheckmark?: boolean; // For multi-select mode (season setup)
  // Card flip data (optional - if provided, enables flip)
  car?: CardCar;
  drivers?: CardDriver[];
}

function TeamCell({ team, isSelected, onClick, showCheckmark = false, car, drivers }: TeamCellProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const displayName = team.name.startsWith('The ')
    ? team.name.slice(4)
    : team.name;
  const primaryIsLight = isLightColor(team.color);

  // Can flip if we have car/driver data
  const canFlip = !!car && !!drivers && drivers.length > 0;

  const handleClick = () => {
    if (canFlip) {
      setIsFlipped(!isFlipped);
    }
    onClick();
  };

  return (
    <div
      className={`team-cell-wrapper ${canFlip ? 'flippable' : ''} ${isFlipped ? 'flipped' : ''}`}
      style={{
        '--team-color': team.color,
        '--team-accent': team.accentColor,
      } as React.CSSProperties}
    >
      <button
        className={`team-cell-unified ${isSelected ? 'selected' : ''} ${team.isHistoric ? 'historic' : ''} ${primaryIsLight ? 'light-primary' : 'dark-primary'}`}
        onClick={handleClick}
      >
        {/* Front of card */}
        <div className="card-front">
          <span className="team-badge">
            {team.emoji}
          </span>
          <span className="cell-name">{displayName}</span>
        </div>

        {/* Back of card - only if flippable */}
        {canFlip && (
          <div className="card-back">
            <div className="card-back-header">
              <span className="back-badge">{team.emoji}</span>
              <span className="back-team-name">{displayName}</span>
            </div>

            {car && (
              <div className="back-car">
                <div className="back-car-left">
                  <span className="back-car-icon">🏎️</span>
                  <span className="back-car-name">{car.name}</span>
                </div>
                {car.rating && (
                  <span className={`back-rating tier-${car.ratingTier}`}>{car.rating}</span>
                )}
              </div>
            )}

            <div className="back-drivers">
              {drivers?.map((driver) => (
                <div key={driver.slot} className="back-driver">
                  <div className="back-driver-left">
                    <span className="back-driver-slot">👤</span>
                    <span className="back-driver-name">{driver.name}</span>
                  </div>
                  {driver.rating && (
                    <span className={`back-rating tier-${driver.ratingTier}`}>{driver.rating}</span>
                  )}
                </div>
              ))}
            </div>

            <p className="back-flavor">{team.description}</p>
          </div>
        )}

        {showCheckmark && isSelected && <span className="cell-check">✓</span>}
      </button>
    </div>
  );
}

export default TeamCell;
