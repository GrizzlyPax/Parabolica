// 4px vertical team color stripe for timing tower rows

interface TeamStripeProps {
  color: string;
  className?: string;
}

function TeamStripe({ color, className = '' }: TeamStripeProps) {
  return (
    <div
      className={`team-stripe ${className}`}
      style={{
        backgroundColor: color,
      }}
    />
  );
}

export default TeamStripe;
