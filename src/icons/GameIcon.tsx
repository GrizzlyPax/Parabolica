// <GameIcon>, <TeamLogo> and the team theme (#350, docs/ICONS.md).
//
// <GameIcon name="weather.rain" size={16} fallback="🌧️" /> — asks for a
// meaning (or a raw icon id), renders the SVG inline in `currentColor`. A
// meaning with no icon yet renders `fallback` (the screen's old emoji), so
// screens migrate one at a time without breaking.
import type { CSSProperties } from 'react';
import { iconBody, iconViewBox, resolveIcon } from './registry';
import './icons.css';

export interface GameIconProps {
  /** A meaning ('race.crash') or a raw icon id ('spiky-explosion'). */
  name?: string;
  /** Pixel size (square). */
  size?: number;
  /** A CSS colour or var(); defaults to the surrounding text colour. */
  color?: string;
  /** Shown when `name` has no icon yet — normally the old emoji. */
  fallback?: string;
  /** Accessible label. Omit for decorative icons (hidden from screen readers). */
  title?: string;
  className?: string;
}

export function GameIcon({ name, size = 16, color, fallback, title, className }: GameIconProps) {
  const entry = resolveIcon(name);
  const body = entry && iconBody(entry);
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const };
  const cls = `game-icon ${className ?? ''}`.trim();

  if (!body) {
    if (!fallback) return null;
    return (
      <span className={`${cls} game-icon-fallback`} style={{ fontSize: size, ...(color ? { color } : {}) }} {...a11y}>
        {fallback}
      </span>
    );
  }
  return (
    <svg
      className={cls}
      width={size}
      height={size}
      viewBox={iconViewBox(entry)}
      fill="currentColor"
      focusable="false"
      style={color ? { color } : undefined}
      {...a11y}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

/** Anything with a livery: a Team, or a roster driver. One colour (docs/ICONS.md). */
export interface TeamLike {
  name?: string;
  emoji?: string;
  /** The team's one colour (the primary). */
  color: string;
  /** Text/icon colour drawn on the primary; picked automatically when absent. */
  ink?: string;
  /** Icon id or meaning for the logo; falls back to the team's emoji. */
  iconId?: string;
}

/** The neutral ink: near-black, matching --pw-ground. */
export const INK_DARK = '#0b0b0c';
export const INK_LIGHT = '#ffffff';

function luminance(hex: string): number | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or near-black, whichever contrasts more with `color` (WCAG ratio). */
export function inkFor(color: string): string {
  const l = luminance(color);
  if (l === null) return INK_LIGHT;
  const vsWhite = 1.05 / (l + 0.05);
  const vsDark = (l + 0.05) / ((luminance(INK_DARK) ?? 0) + 0.05);
  return vsDark > vsWhite ? INK_DARK : INK_LIGHT;
}

export function teamInk(team: TeamLike): string {
  return team.ink ?? inkFor(team.color);
}

/** A team logo: a white or near-black icon on a primary-colour tile, square.
 * Without a `team`, it wears the surrounding theme (--team-primary/ink). */
export function TeamLogo({ team, size = 24, title }: { team?: TeamLike; size?: number; title?: string }) {
  const style: CSSProperties = {
    width: size,
    height: size,
    background: team ? team.color : 'var(--team-primary)',
    color: team ? teamInk(team) : 'var(--team-ink)',
  };
  const label = title ?? team?.name;
  return (
    <span className="team-logo" style={style} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      <GameIcon name={team?.iconId} size={Math.round(size * 0.72)} fallback={team?.emoji} />
    </span>
  );
}

/** CSS variables that theme a subtree in a team's colour. Put the result on
 * a screen's root `style` (in Season Mode: your team; hotseat: whoever's
 * turn it is). Null = neutral (the :root defaults in App.css). */
export function teamThemeVars(team: TeamLike | null | undefined): CSSProperties {
  if (!team) return {};
  return { '--team-primary': team.color, '--team-ink': teamInk(team) } as CSSProperties;
}
