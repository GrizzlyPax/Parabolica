// The fantasy draft: name a few teams, pick colours, then snake-draft squads
// from the grid. One device, before a league is founded or a quick race
// starts. What drafters see is deliberately rough: a driver's and car's
// third of the field, and that a driver carries tags of a given rarity —
// not which tags. The inference is the game.
import { useMemo, useState } from 'react';
import type { RosterDriver } from '../RaceEngine';
import { rosterRanks, type RankTone } from '../betting/utils';
import { TeamMarble } from '../league/ui/TeamMarble';
import { FANTASY_COLORS, MAX_FANTASY_TEAMS, MIN_FANTASY_TEAMS, SQUAD_SIZE, draftComplete, fantasyHex, fantasyOwners, onTheClock, snakeOrder, type FantasyColorId, type FantasyConfig, type FantasyTeam } from './types';
import './Fantasy.css';

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Thirds of the field, in words. "Front" includes 1st. */
export function thirdOf(tone: RankTone | undefined): { label: string; cls: string } {
  if (tone === 'best' || tone === 'high') return { label: 'front third', cls: 'front' };
  if (tone === 'mid') return { label: 'midfield', cls: 'mid' };
  return { label: 'back third', cls: 'back' };
}

export function emptyFantasy(): FantasyConfig {
  return { squadSize: SQUAD_SIZE, teams: [
    { id: newId(), name: '', color: FANTASY_COLORS[0].id, driverIds: [] },
    { id: newId(), name: '', color: FANTASY_COLORS[1].id, driverIds: [] },
  ] };
}

interface DraftPanelProps {
  roster: RosterDriver[];
  value: FantasyConfig;
  onChange: (cfg: FantasyConfig) => void;
  /** Where this draft lives, for the copy. */
  context: 'league' | 'race';
}

export function DraftPanel({ roster, value, onChange, context }: DraftPanelProps) {
  const [phase, setPhase] = useState<'teams' | 'draft'>(value.teams.some(t => t.driverIds.length) ? 'draft' : 'teams');
  const ranks = useMemo(() => rosterRanks(roster), [roster]);
  const owners = useMemo(() => fantasyOwners(value), [value]);
  const clock = onTheClock(value);
  const complete = draftComplete(value);

  const set = (teams: FantasyTeam[]) => onChange({ ...value, teams });
  const usedColors = new Set(value.teams.map(t => t.color));
  const namesOk = value.teams.every(t => t.name.trim().length > 0) && new Set(value.teams.map(t => t.name.trim().toLowerCase())).size === value.teams.length;

  const addTeam = () => {
    if (value.teams.length >= MAX_FANTASY_TEAMS) return;
    const color = FANTASY_COLORS.find(c => !usedColors.has(c.id))?.id ?? FANTASY_COLORS[0].id;
    set([...value.teams, { id: newId(), name: '', color, driverIds: [] }]);
  };
  const removeTeam = (id: string) => { if (value.teams.length > MIN_FANTASY_TEAMS) set(value.teams.filter(t => t.id !== id)); };
  const update = (id: string, patch: Partial<FantasyTeam>) => set(value.teams.map(t => t.id === id ? { ...t, ...patch } : t));

  const pick = (driverId: number) => {
    if (!clock || owners.has(driverId)) return;
    set(value.teams.map((t, i) => i === clock.teamIndex ? { ...t, driverIds: [...t.driverIds, driverId] } : t));
  };
  const undo = () => {
    const order = snakeOrder(value.teams.length, value.squadSize);
    const made = value.teams.reduce((n, t) => n + t.driverIds.length, 0);
    if (made === 0) return;
    const last = order[made - 1];
    set(value.teams.map((t, i) => i === last ? { ...t, driverIds: t.driverIds.slice(0, -1) } : t));
  };
  const clearPicks = () => set(value.teams.map(t => ({ ...t, driverIds: [] })));

  // Grid grouped by constructor, in roster order.
  const byTeam = useMemo(() => {
    const m = new Map<string, RosterDriver[]>();
    for (const d of roster) { const k = d.kingdomId ?? String(d.id); m.set(k, [...(m.get(k) ?? []), d]); }
    return [...m.values()];
  }, [roster]);

  if (phase === 'teams') {
    return (
      <div className="fd">
        <div className="fd-head">
          <span className="rs-k">Fantasy teams</span>
          <span className="rs-hint">{MIN_FANTASY_TEAMS}–{MAX_FANTASY_TEAMS} teams, {value.squadSize} drivers each, snake draft. A team scores its drivers' race points (the top-10 table). {context === 'league' ? 'The teams travel with the league to every device.' : 'Your drivers are highlighted in the timing tower.'}</span>
        </div>
        <div className="fd-teams">
          {value.teams.map((t, i) => (
            <div key={t.id} className="fd-team-row">
              <span className="fd-swatch" style={{ background: fantasyHex(t.color) }} />
              <input className="fd-name" value={t.name} placeholder={`Team ${i + 1}`} maxLength={24} onChange={e => update(t.id, { name: e.target.value })} aria-label={`Team ${i + 1} name`} />
              <span className="fd-colors">
                {FANTASY_COLORS.map(c => (
                  <button key={c.id} type="button" className={`fd-color ${t.color === c.id ? 'on' : ''}`} style={{ background: c.hex }} title={c.name} disabled={usedColors.has(c.id) && t.color !== c.id} onClick={() => update(t.id, { color: c.id as FantasyColorId })} aria-label={c.name} />
                ))}
              </span>
              <button type="button" className="rs-link fd-remove" disabled={value.teams.length <= MIN_FANTASY_TEAMS} onClick={() => removeTeam(t.id)}>remove</button>
            </div>
          ))}
        </div>
        <div className="fd-actions">
          <button type="button" className="rs-btn rs-btn-ghost" onClick={addTeam} disabled={value.teams.length >= MAX_FANTASY_TEAMS}>+ Add a team</button>
          <button type="button" className="rs-btn rs-btn-primary" disabled={!namesOk} onClick={() => setPhase('draft')}>Start the draft →</button>
          {!namesOk && <span className="rs-hint">Every team needs its own name.</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="fd">
      <div className="fd-head">
        <span className="rs-k">The draft</span>
        {clock ? (
          <span className="fd-clock"><span className="fd-swatch" style={{ background: fantasyHex(value.teams[clock.teamIndex].color) }} /> <b>{value.teams[clock.teamIndex].name}</b> is on the clock · pick {clock.pick} of {clock.of}</span>
        ) : (
          <span className="fd-clock fd-done">✓ Draft complete</span>
        )}
        <span className="fd-head-actions">
          <button type="button" className="rs-link" onClick={undo} disabled={value.teams.every(t => t.driverIds.length === 0)}>undo pick</button>
          <button type="button" className="rs-link" onClick={clearPicks} disabled={value.teams.every(t => t.driverIds.length === 0)}>clear</button>
          <button type="button" className="rs-link" onClick={() => setPhase('teams')}>edit teams</button>
        </span>
      </div>
      <div className="fd-hint rs-hint">What you can see: each driver's and car's third of the field, and the rarity of any tags they carry — not what the tags do. Pick well.</div>
      <div className="fd-body">
        <div className="fd-squads">
          {value.teams.map((t, i) => (
            <div key={t.id} className={`fd-squad ${clock?.teamIndex === i ? 'on-clock' : ''}`} style={{ '--fc': fantasyHex(t.color) } as React.CSSProperties}>
              <div className="fd-squad-name"><span className="fd-swatch" style={{ background: fantasyHex(t.color) }} />{t.name}</div>
              {Array.from({ length: value.squadSize }, (_, k) => {
                const d = roster.find(x => x.id === t.driverIds[k]);
                return <div key={k} className={`fd-squad-slot ${d ? '' : 'empty'}`}>{d ? <><TeamMarble color={d.color} accentColor={d.accentColor} emoji={d.emoji} size={16} slot={d.driverSlot} /> {d.fullName}</> : `pick ${k + 1}`}</div>;
              })}
            </div>
          ))}
        </div>
        <div className="fd-board">
          {byTeam.map(group => (
            <div key={group[0].kingdomId ?? group[0].id} className="fd-constructor">
              <div className="fd-constructor-name" style={{ color: group[0].color }}>{group[0].teamName ?? 'Independent'}</div>
              {group.map(d => {
                const owner = owners.get(d.id);
                const dr = thirdOf(ranks.driver.get(d.id)?.tone);
                const cr = thirdOf(ranks.car.get(d.id)?.tone);
                return (
                  <button key={d.id} type="button" className={`fd-card ${owner ? 'taken' : ''} ${complete ? 'locked' : ''}`} disabled={!!owner || !clock} onClick={() => pick(d.id)} style={owner ? { '--fc': fantasyHex(owner.color) } as React.CSSProperties : undefined} title={owner ? `Drafted by ${owner.name}` : `Draft ${d.fullName}`}>
                    <TeamMarble color={d.color} accentColor={d.accentColor} emoji={d.emoji} size={20} slot={d.driverSlot} />
                    <span className="fd-card-name">{d.fullName}</span>
                    <span className="fd-card-hints">
                      <span className={`fd-third ${dr.cls}`} title={`Driver: ${dr.label} of the grid`}>D · {dr.label}</span>
                      <span className={`fd-third ${cr.cls}`} title={`Car: ${cr.label} of the field`}>C · {cr.label}</span>
                    </span>
                    <span className="fd-card-tags" title={d.tags.length ? `${d.tags.length} tag${d.tags.length > 1 ? 's' : ''} — rarity shown, not what they do` : 'No tags'}>
                      {d.tags.map((t, i) => <span key={i} className={`fd-tag-dot rarity-${t.rarity}`} />)}
                      {d.tags.length === 0 && <span className="fd-no-tags">—</span>}
                    </span>
                    {owner && <span className="fd-owner">{owner.name}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
