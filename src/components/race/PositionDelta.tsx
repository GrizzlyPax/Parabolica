// Position change indicator with animation

interface PositionDeltaProps {
  delta: number;
  className?: string;
}

function PositionDelta({ delta, className = '' }: PositionDeltaProps) {
  if (delta === 0) {
    return null;
  }

  const isGain = delta > 0;
  const arrow = isGain ? '▲' : '▼';
  const directionClass = isGain ? 'delta-up' : 'delta-down';

  return (
    <span className={`position-delta ${directionClass} ${className}`}>
      {arrow}{Math.abs(delta)}
    </span>
  );
}

export default PositionDelta;
