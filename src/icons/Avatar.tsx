// A driver portrait or car vehicle (#489, docs/story/vehicles-portraits.md):
// the icon alone, no tile, in the owning team's colour. Undrafted = white.
import { GameIcon } from './GameIcon';
import type { IconId } from './registry';

export function Avatar({ icon, color, size = 22, title }: { icon: IconId; color?: string; size?: number; title?: string }) {
  return (
    <span className="avatar" style={{ color: color ?? 'var(--pw-text-1)', display: 'inline-flex', flexShrink: 0, lineHeight: 0 }}>
      <GameIcon name={icon} size={size} title={title} />
    </span>
  );
}
