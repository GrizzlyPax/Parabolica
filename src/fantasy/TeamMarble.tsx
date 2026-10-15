import './Fantasy.css';
// The team marble: the driver's racing number in the team's ink on the team
// colour (docs/ICONS.md → colour system; #381). Teammates share the colour and
// are told apart by their number. Use it everywhere a driver appears so the
// grid reads as people, not text. Without a number it falls back to the emoji.

interface TeamMarbleProps {
  color?: string;
  ink?: string;
  number?: number | string;
  emoji?: string;
  size?: number;
  /** Second driver of a team gets a dashed ring, like the tower's slot mark. */
  slot?: 1 | 2;
}

export function TeamMarble({ color, ink, number, emoji, size = 22, slot = 1 }: TeamMarbleProps) {
  const label = number !== undefined ? String(number) : emoji;
  return (
    <span
      className="lg-marble"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * (number !== undefined ? 0.5 : 0.55)),
        background: color ?? '#333',
        color: ink ?? '#fff',
        borderColor: ink ?? '#fff',
        borderStyle: slot === 2 ? 'dashed' : 'solid',
        fontFamily: number !== undefined ? 'var(--look-data, monospace)' : undefined,
        fontWeight: number !== undefined ? 600 : undefined,
      }}
    >
      {label}
    </span>
  );
}
