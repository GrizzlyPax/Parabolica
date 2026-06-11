// The team marble: emoji on team color, ringed in the team's accent color —
// the same identity mark the timing tower uses. Use it everywhere a driver
// appears so the grid reads as people, not text.

interface TeamMarbleProps {
  color?: string;
  accentColor?: string;
  emoji?: string;
  size?: number;
  /** Second driver of a team gets a dashed ring, like the tower's slot mark. */
  slot?: 1 | 2;
}

export function TeamMarble({ color, accentColor, emoji, size = 22, slot = 1 }: TeamMarbleProps) {
  return (
    <span
      className="lg-marble"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.55),
        background: color ?? '#333',
        borderColor: accentColor || '#fff',
        borderStyle: slot === 2 ? 'dashed' : 'solid',
      }}
    >
      {emoji}
    </span>
  );
}
