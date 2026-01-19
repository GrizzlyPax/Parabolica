import './DriverBadge.css';

interface DriverBadgeProps {
  emoji: string;
  color: string;
  driverSlot?: 1 | 2;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * DriverBadge - Displays a driver's team badge with slot-based styling
 *
 * Primary driver (slot 1): Team color background with white ring
 * Secondary driver (slot 2): Team color background with dark ring
 */
function DriverBadge({ emoji, color, driverSlot = 1, size = 'md', className = '' }: DriverBadgeProps) {
  return (
    <div
      className={`driver-badge driver-badge--${size} ${className}`}
      data-slot={driverSlot}
      style={{ '--team-color': color } as React.CSSProperties}
    >
      <span className="driver-badge__emoji">{emoji}</span>
    </div>
  );
}

export default DriverBadge;
