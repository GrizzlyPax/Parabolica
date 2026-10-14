// The run's start (#696): pick your state, name your garage, go. A plain
// working page on the design system; Hub's #697 designs the map. One save
// slot: starting over a run in progress asks first, on the page. The
// rookies are dealt (no pick): the Ladder shows them once the run starts.
import { useMemo, useState } from 'react';
import { GameIcon, TeamLogo } from '../../icons/GameIcon';
import { US_PLACES, fieldLine, placeById } from '../../data/states';
import { TEAM_COLOURS, TEAM_LOGOS, TEAM_NAME_MAX, wearBuiltTeam, type BuiltTeam } from '../teamCreator';
import { randomSeasonSeed } from '../setup';
import { currentRunState, startRun } from '../../run/current';
import { STEP_PLAN } from '../../run/run';
import { AceButton, Bunting, Chequer, ProgramLine, StateBar, StepTheme } from '../../look/Look';
import { programNumber, stateLook } from '../../look/step';
import './Season.css';

interface Props {
  onBack: () => void;
  /** The run is saved; go to the ladder. */
  onStarted: () => void;
}

const DEFAULT_GARAGE = 'Kettle Street Garage';

export default function StartRun({ onBack, onStarted }: Props) {
  const [seed, setSeed] = useState(() => randomSeasonSeed());
  const [stateId, setStateId] = useState('oh');
  const [built, setBuilt] = useState<BuiltTeam>(() => {
    const logos = TEAM_LOGOS.flatMap(g => g.ids);
    return { name: '', colour: TEAM_COLOURS[seed % TEAM_COLOURS.length].hex, logo: logos[Math.floor(seed / 7) % logos.length] };
  });
  const [confirming, setConfirming] = useState(false);
  const place = placeById(stateId)!;
  const garage = useMemo(() => wearBuiltTeam({ teamId: 'you', name: DEFAULT_GARAGE, color: built.colour }, { ...built, name: built.name || DEFAULT_GARAGE }), [built]);
  const saved = useMemo(() => { const s = currentRunState(); return s && s.phase === 'league' ? s : null; }, []);
  const town = place.cities[Math.abs(seed) % place.cities.length];

  const start = () => {
    if (saved && !confirming) { setConfirming(true); return; }
    const { teamId: _t, ...look } = garage;
    startRun({ seed, stateId, garage: look });
    onStarted();
  };

  return (
    <StepTheme step="state" state={stateLook(place.abbr)} className="ace-page">
      <Bunting />
      <ProgramLine right={`No. ${programNumber(seed)} · 10¢`} />
      <StateBar><b>A new season</b> · {place.name} · {fieldLine(place)}</StateBar>
      <div className="rl-head-row">
        <button type="button" className="ace-link" onClick={onBack}>Menu</button>
        <button type="button" className="ace-link" onClick={() => setSeed(randomSeasonSeed())}>Another town</button>
      </div>
      <h1 className="ace-h1">Pick your state</h1>
      <Chequer />

      <div className="ace-panel">
        <label className="ace-k" htmlFor="sr-state">Your state · the size is the difficulty</label>
        <select id="sr-state" className="sr-select" value={stateId} onChange={e => setStateId(e.target.value)}>
          {US_PLACES.map(p => <option key={p.id} value={p.id}>{p.name} · {fieldLine(p)}</option>)}
        </select>
        <p className="ace-note">Your town: <b>{town}</b>. Win it and you are Ace {town}; win the state and you are Ace {place.name}. Locals {STEP_PLAN[0].races} races, State {STEP_PLAN[1].races}.</p>
      </div>

      <div className="ace-panel">
        <div className="rl-head-row"><span className="ace-k">Your garage</span><TeamLogo team={garage} size={28} /></div>
        <label className="sr-name">
          <span className="sr-only">Garage name</span>
          <input id="sr-name" type="text" value={built.name} maxLength={TEAM_NAME_MAX} placeholder={DEFAULT_GARAGE} autoComplete="off" onChange={e => setBuilt(b => ({ ...b, name: e.target.value }))} />
        </label>
        <div className="tc-colours" role="radiogroup" aria-label="Colour">
          {TEAM_COLOURS.map(c => (
            <button key={c.hex} type="button" role="radio" aria-checked={built.colour === c.hex} aria-label={c.name} title={c.name}
              className={`tc-colour ${built.colour === c.hex ? 'on' : ''}`} style={{ background: c.hex }} onClick={() => setBuilt(b => ({ ...b, colour: c.hex }))} />
          ))}
        </div>
        <div className="tc-logos" role="radiogroup" aria-label="Logo">
          {TEAM_LOGOS.flatMap(g => g.ids).map(id => (
            <button key={id} type="button" role="radio" aria-checked={built.logo === id} aria-label={id.replace(/-/g, ' ')}
              className={`tc-logo ${built.logo === id ? 'on' : ''}`} style={{ background: garage.color, color: garage.ink }} onClick={() => setBuilt(b => ({ ...b, logo: id }))}>
              <GameIcon name={id} size={22} />
            </button>
          ))}
        </div>
        <p className="ace-note">Two rookies and a car are dealt to you. Everyone starts the same; the road up makes the difference.</p>
      </div>

      {confirming && saved && (
        <div className="ace-panel" role="alert">
          <b>This replaces the run in play.</b> One run is saved at a time.
          <button type="button" className="ace-link" onClick={() => setConfirming(false)}>Keep it</button>
        </div>
      )}
      <div className="ace-dock">
        <AceButton onClick={start}>{confirming ? 'Replace and start' : 'Start the season'}</AceButton>
      </div>
    </StepTheme>
  );
}
