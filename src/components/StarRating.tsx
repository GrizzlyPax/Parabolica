import './StarRating.css';

interface StarRatingProps {
  value: number;          // The raw stat value
  min: number;            // Minimum value in range
  max: number;            // Maximum value in range
  color?: string;         // Optional color for filled stars
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;    // Show numeric value on hover
}

function StarRating({
  value,
  min,
  max,
  color = '#ffd700',
  size = 'md',
  showValue = false
}: StarRatingProps) {
  // Normalize value to 0-1 range, then to 1-5 stars
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const stars = Math.max(1, Math.min(5, Math.round(normalized * 4) + 1));

  const sizes = {
    sm: '14px',
    md: '18px',
    lg: '24px'
  };

  return (
    <div
      className={`star-rating star-rating-${size}`}
      style={{ fontSize: sizes[size] }}
      title={showValue ? `${value.toFixed(2)}` : undefined}
    >
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`star ${i <= stars ? 'filled' : 'empty'}`}
          style={{ color: i <= stars ? color : undefined }}
        >
          {i <= stars ? '\u2605' : '\u2606'}
        </span>
      ))}
    </div>
  );
}

export default StarRating;
