// Bet status indicator for timing tower
import type { BetInfo } from './types';

interface BetIndicatorProps {
  betInfo: BetInfo;
  compact?: boolean;
}

function BetIndicator({ betInfo, compact = false }: BetIndicatorProps) {
  const { bets, totalAmount, overallStatus } = betInfo;

  if (compact) {
    // Compact mode: just show marble count and status
    return (
      <span className={`bet-indicator-compact ${overallStatus}`}>
        {totalAmount}
      </span>
    );
  }

  return (
    <div className={`bet-indicator ${overallStatus}`}>
      <span className="bet-types">
        {bets.map((bet, i) => (
          <span
            key={i}
            className={`bet-type-tag ${bet.isWinning ? 'winning' : 'losing'}`}
            title={`${bet.type}: ${bet.amount} marbles`}
          >
            {bet.type}
          </span>
        ))}
      </span>
      <span className="bet-amount">{totalAmount}</span>
    </div>
  );
}

export default BetIndicator;
