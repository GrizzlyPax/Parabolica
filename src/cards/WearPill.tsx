// The track's tyre wear, where players plan (#547): a small pill next to the
// priority stats on Run Setup, the Paddock and the race header. Reads the
// track's wear dial (deckTracks.tyreWear, #536: 0.85 gentle … 1.25 hungry).
import { GameIcon } from '../icons/GameIcon';
import './WearPill.css';

export type WearBand = 'low' | 'normal' | 'high';
export function wearBand(tyreWear: number): WearBand {
  return tyreWear < 0.95 ? 'low' : tyreWear > 1.05 ? 'high' : 'normal';
}
const LABEL: Record<WearBand, string> = { low: 'Low tyre wear', normal: 'Normal tyre wear', high: 'High tyre wear' };

export function WearPill({ tyreWear, className }: { tyreWear: number | undefined; className?: string }) {
  if (tyreWear === undefined) return null;
  const band = wearBand(tyreWear);
  return (
    <span className={`wear-pill wear-${band} ${className ?? ''}`.trim()} title={`Tyres wear ×${tyreWear.toFixed(2)} here`}>
      <GameIcon name="stat.tyre_management" size={12} />
      {LABEL[band]} <b>×{tyreWear.toFixed(2)}</b>
    </span>
  );
}
