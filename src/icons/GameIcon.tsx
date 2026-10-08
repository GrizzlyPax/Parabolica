// <GameIcon>, <TeamLogo> and the team theme (#350, docs/ICONS.md).
//
// <GameIcon name="weather.rain" size={16} fallback="🌧️" /> — asks for a
// meaning (or a raw icon id), renders the SVG inline in `currentColor`. A
// meaning with no icon yet renders `fallback` (the screen's old emoji), so
// screens migrate one at a time without breaking.
import type { CSSProperties } from 'react';
import { iconBody, iconViewBox, resolveIcon } from './registry';
import { teamInk } from './ink';
export { INK_DARK, INK_LIGHT, inkFor, teamInk } from './ink';
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
