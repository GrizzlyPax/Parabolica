// The run's start (#697, on #696's placeholder): two pages, desktop first.
// 1 · Pick your state on a tile map of all 52 (each in its own colours, with
//     the honest number and a difficulty word); the panel beside it shows the
//     sash you'd race for, your town and the steps.
// 2 · The flavour page (Pax, #693): name the garage, pick its colour (it shows
//     at Locals; at State you wear the state's), rename your two dealt drivers
//     and the chassis. No real strategic choices: all flavour. No logo (#778):
//     identity is your title, not your garage.
// One save slot: starting over a run in progress asks first, on the page.
import { useMemo, useState } from 'react';
import { Avatar } from '../../icons/Avatar';
import { portraitFor, vehicleFor } from '../../generators/avatars';
import { fieldLine, fieldSize, placeById, type FieldSize } from '../../data/states';
import { TEAM_COLOURS, TEAM_NAME_MAX, wearBuiltTeam, type BuiltTeam } from '../teamCreator';
import { randomSeasonSeed } from '../setup';
import { dealRookies } from '../rookies';
import { currentRunState, startRun } from '../../run/current';
import { STEP_PLAN } from '../../run/run';
import { AceButton, Bunting, Chequer, ProgramLine, Sash, StateBar, StepTheme } from '../../look/Look';
import { programNumber, stateLook } from '../../look/step';
import { STATE_TILES, TILE_COLS, TILE_ROWS } from './stateMap';
import './Season.css';

interface Props {
  onBack: () => void;
  /** The run is saved; go to the ladder. */
  onStarted: () => void;
}

const DEFAULT_GARAGE = 'Kettle Street Garage';
const NAME_MAX = 28;

/** The size is the difficulty (Pax, #693; Steward's fit: you win 83 / 74 / 49% of States if alive). */
export const DIFFICULTY: Record<FieldSize, string> = { 5: 'Easy', 10: 'Medium', 20: 'Hard' };

export default function StartRun({ onBack, onStarted }: Props) {
  const [page, setPage] = useState<'state' | 'garage'>('state');
  const [seed, setSeed] = useState(() => randomSeasonSeed());
  const [stateId, setStateId] = useState('oh');
  const [built, setBuilt] = useState<BuiltTeam>(() => ({ name: '', colour: TEAM_COLOURS[seed % TEAM_COLOURS.length].hex }));
  const [drivers, setDrivers] = useState<[string, string]>(['', '']);
  const [car, setCar] = useState('');
  const [confirming, setConfirming] = useState(false);
  const place = placeById(stateId)!;
  const look = stateLook(place.abbr);
  const garage = useMemo(() => wearBuiltTeam({ teamId: 'you', name: DEFAULT_GARAGE, color: built.colour }, { ...built, name: built.name || DEFAULT_GARAGE }), [built]);
  const dealt = useMemo(() => dealRookies(seed), [seed]);
  const saved = useMemo(() => { const s = currentRunState(); return s && s.phase === 'league' ? s : null; }, []);
  const town = place.cities[Math.abs(seed) % place.cities.length];
  const size = fieldSize(place);

  const anotherTown = () => { setSeed(randomSeasonSeed()); setDrivers(['', '']); setCar(''); };
  const start = () => {
    if (saved && !confirming) { setConfirming(true); return; }
    const { teamId: _t, ...wear } = garage;
    startRun({ seed, stateId, garage: wear, names: { drivers, car } });
    onStarted();
  };

  const head = (title: string, bar: JSX.Element) => (
    <>
      <Bunting />
      <ProgramLine right={`No. ${programNumber(seed)} · 10¢`} />
      <StateBar>{bar}</StateBar>
      <div className="sr-links">
        <button type="button" className="ace-link" onClick={page === 'state' ? onBack : () => setPage('state')}>{page === 'state' ? 'Menu' : 'Back to the map'}</button>
        <span className="ace-where">Step {page === 'state' ? 1 : 2} of 2</span>
      </div>
      <h1 className="ace-h1">{title}</h1>
      <Chequer />
    </>
  );

  if (page === 'state') {
    return (
      <StepTheme step="state" state={look} className="ace-page sr">
        {head('Pick your state', <><b>A new season</b> · {place.name} · {fieldLine(place)}</>)}
        <div className="sr-grid">
          <section className="sr-map-wrap" aria-label="The map: 50 states, DC and Puerto Rico">
            <div className="sr-map" role="radiogroup" aria-label="Your state" style={{ gridTemplateColumns: `repeat(${TILE_COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${TILE_ROWS}, auto)` }}>
              {STATE_TILES.map(t => {
                const p = placeById(t.id)!;
                const l = stateLook(p.abbr);
                const n = fieldSize(p);
                return (
                  <button
                    key={t.id} type="button" role="radio" aria-checked={stateId === t.id}
                    aria-label={`${p.name}: ${fieldLine(p)}, ${DIFFICULTY[n].toLowerCase()}`} title={`${p.name} · ${fieldLine(p)}`}
                    className={`sr-tile ${stateId === t.id ? 'on' : ''}`}
                    style={{ gridColumn: t.x + 1, gridRow: t.y + 1, background: l.primary, color: l.ink, borderColor: l.secondary }}
                    onClick={() => setStateId(t.id)}
                  >
                    <b>{p.abbr}</b>
                    <span className={`sr-size s${n}`} aria-hidden="true">{Array.from({ length: n === 5 ? 1 : n === 10 ? 2 : 3 }, (_, i) => <i key={i} />)}</span>
                  </button>
                );
              })}
            </div>
            <p className="ace-note sr-legend">
              <span className="sr-size s5" aria-hidden="true"><i /></span> 5 towns · easy
              <span className="sr-size s10" aria-hidden="true"><i /><i /></span> 10 · medium
              <span className="sr-size s20" aria-hidden="true"><i /><i /><i /></span> 20 · hard.
              {' '}The size is the difficulty: a big state fields more towns, and tougher Aces.
            </p>
          </section>

          <aside className="ace-panel sr-pick" aria-live="polite">
            <span className="ace-k">{place.kind === 'state' ? 'The state' : place.kind === 'district' ? 'The district' : 'The territory'} · {place.abbr}</span>
            <h2 className="ace-h2 sr-pick-name">{place.name}</h2>
            <div className="ace-sash-wrap"><Sash text={`Ace ${place.name}`} className="sr-sash" fontSize={place.name.length > 12 ? 19 : 23} /></div>
            <div className="sr-facts">
              <span><b>{size}</b> towns compete</span>
              <span className={`sr-diff d${size}`}>{DIFFICULTY[size]}</span>
            </div>
            <p className="sr-town">Your town: <b>{town}</b> <button type="button" className="ace-link" onClick={anotherTown}>Another town</button></p>
            <ol className="sr-steps">
              {STEP_PLAN.map((s, i) => (
                <li key={s.id}><b>{s.name}</b> · {i === 0 ? `Ace ${town}` : i === 1 ? `Ace ${place.name}` : 'Ace America'}{s.races ? ` · ${s.races} races` : ' · later'}</li>
              ))}
            </ol>
            <p className="ace-note">{place.look?.flag.note}</p>
          </aside>
        </div>
        <div className="ace-dock">
          <AceButton onClick={() => setPage('garage')}>Next: your garage</AceButton>
        </div>
      </StepTheme>
    );
  }

  return (
    <StepTheme step="locals" className="ace-page sr">
      {head('Your garage', <><b>Locals</b> · going for Ace {town} · {place.name}</>)}
      <div className="sr-grid sr-grid-garage">
        <div className="ace-panel">
          <div className="sr-row"><span className="ace-k">The garage</span><i className="sr-swatch" style={{ background: garage.color }} aria-hidden="true" /></div>
          <label className="sr-field">
            <span className="ace-k">Name</span>
            <input id="sr-name" type="text" value={built.name} maxLength={TEAM_NAME_MAX} placeholder={DEFAULT_GARAGE} autoComplete="off" onChange={e => setBuilt(b => ({ ...b, name: e.target.value }))} />
          </label>
          <span className="ace-k">Colour · it shows at Locals; at State you wear {place.name}'s</span>
          <div className="tc-colours" role="radiogroup" aria-label="Colour">
            {TEAM_COLOURS.map(c => (
              <button key={c.hex} type="button" role="radio" aria-checked={built.colour === c.hex} aria-label={c.name} title={c.name}
                className={`tc-colour ${built.colour === c.hex ? 'on' : ''}`} style={{ background: c.hex }} onClick={() => setBuilt(b => ({ ...b, colour: c.hex }))} />
            ))}
          </div>
        </div>

        <div className="ace-panel">
          <span className="ace-k">Your two rookies and the chassis · dealt, not picked</span>
          {dealt.drivers.map((d, i) => (
            <label key={d.id} className="sr-field sr-person">
              <Avatar icon={portraitFor(seed, d.id)} color={garage.color} size={34} />
              <span className="ace-k">Driver {i + 1}</span>
              <input id={`sr-driver-${i}`} type="text" value={drivers[i]} maxLength={NAME_MAX} placeholder={d.fullName} autoComplete="off"
                onChange={e => { const v = e.target.value; setDrivers(ds => (i === 0 ? [v, ds[1]] : [ds[0], v])); }} />
            </label>
          ))}
          <label className="sr-field sr-person">
            <Avatar icon={vehicleFor(seed, dealt.car.id)} color={garage.color} size={34} />
            <span className="ace-k">Chassis</span>
            <input id="sr-car" type="text" value={car} maxLength={NAME_MAX} placeholder={dealt.car.name} autoComplete="off" onChange={e => setCar(e.target.value)} />
          </label>
          <p className="ace-note">Everyone starts the same: rookies near-identical, a plain car. The road up makes the difference. Leave a name blank to keep the one dealt.</p>
        </div>
      </div>

      {confirming && saved && (
        <div className="ace-panel" role="alert">
          <b>This replaces the run in play.</b> One run is saved at a time.
          <button type="button" className="ace-link" onClick={() => setConfirming(false)}>Keep it</button>
        </div>
      )}
      <div className="ace-dock">
        <AceButton onClick={start}>{confirming ? 'Replace and start' : `Start in ${town}`}</AceButton>
      </div>
    </StepTheme>
  );
}
