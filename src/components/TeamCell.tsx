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

interface TeamCellProps {
  team: Team;
  isSelected: boolean;
  onClick: () => void;
  showCheckmark?: boolean; // For multi-select mode (season setup)
}

function TeamCell({ team, isSelected, onClick, showCheckmark = false }: TeamCellProps) {
  const displayName = team.name.startsWith('The ')
    ? team.name.slice(4)
    : team.name;
  const primaryIsLight = isLightColor(team.color);

  return (
    <button
      className={`team-cell-unified ${isSelected ? 'selected' : ''} ${team.isHistoric ? 'historic' : ''} ${primaryIsLight ? 'light-primary' : 'dark-primary'}`}
      onClick={onClick}
      style={{
        '--team-color': team.color,
        '--team-accent': team.accentColor,
      } as React.CSSProperties}
    >
      <span className="team-badge">
        {team.emoji}
      </span>
      <span className="cell-name">{displayName}</span>
      {showCheckmark && isSelected && <span className="cell-check">✓</span>}
    </button>
  );
}

export default TeamCell;
