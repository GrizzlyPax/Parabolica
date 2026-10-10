// The rookie start (#660): six rookies, pick two, one free re-roll, three car
// setups, Start. A plain working screen in the house table style; Hub's #661
// is the designed one (6 cards, flavour lines). Reads and writes the run
// through the facade; Start lands on the ladder.
import { useMemo, useState } from 'react';
import { Avatar } from '../../icons/Avatar';
import { RaceNumber } from '../../icons/RaceNumber';
import { TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import { STAT_LABELS } from '../../cards/deck';
import { portraitFor } from '../../generators/avatars';
import { overall, readStat } from '../grades';
import { DRIVER_STATS, GradeCell, STAT_ABBR } from './RosterTable';
import { ARCHETYPE_INFO, CAR_SETUPS, CAR_SETUP_IDS, OFFER_PICKS, describeNudge, type CarSetupId } from '../rookies';
import { loadRun, rookieOfferFor, type RunFacts } from '../../run/run';
import { pickCurrentRookies, rerollCurrentRookies } from '../../run/current';
import { seasonName } from '../setup';
import '../../RunSetup.css';
import './Season.css';

interface Props {
  onBack: () => void;
  onStarted: () => void;
}

export default function RookieStart({ onBack, onStarted }: Props) {
  const [run, setRun] = useState<RunFacts | null>(() => loadRun());
  const [picked, setPicked] = useState<number[]>([]);
  const [setup, setSetup] = useState<CarSetupId | null>(null);
  const offer = useMemo(() => (run ? rookieOfferFor(run) : []), [run]);

  if (!run || run.rookies.pick) {
    return (
      <div className="run-setup season-setup">
        <header className="rs-top"><div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onBack}>← The run</button>
          <h1 className="rs-title">{run ? 'Your rookies are picked' : 'No run'}</h1>
          <span className="rs-sub">{run ? 'The league is on. Back to the run.' : 'There’s no run saved on this device.'}</span>
        </div></header>
      </div>
    );
  }
  const you = run.setup.team;
  const seed = run.setup.seed;
  const toggle = (id: number) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : p.length < OFFER_PICKS ? [...p, id] : [...p.slice(1), id]));
  const reroll = () => { const next = rerollCurrentRookies(); if (next) { setRun(next); setPicked([]); } };
  const ready = picked.length === OFFER_PICKS && setup !== null;
  const start = () => {
    if (!ready) return;
    if (pickCurrentRookies({ driverIds: [picked[0], picked[1]], setup: setup! })) onStarted();
  };

  return (
    <div className="run-setup season-setup rk" style={teamThemeVars(you)}>
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onBack}>← The run</button>
          <h1 className="rs-title">Your rookies</h1>
          <span className="rs-sub">{seasonName({ seed, league: { index: 0, name: 'Juniors', fieldShift: 0, nemesisShift: 0, bossRound: 0 } })} · pick {OFFER_PICKS} of {offer.length}, then a car setup</span>
        </div>
      </header>

      <section className="rs-row">
        <div className="rs-row-head">
          <span className="rs-k">The offer <span className="ss-roster-logo"><TeamLogo team={you} size={20} /></span></span>
          <button type="button" className="rs-link" onClick={reroll} disabled={run.rookies.rerolled}>{run.rookies.rerolled ? 'Re-roll used' : 'Re-roll (once, free)'}</button>
        </div>
        <p className="rs-hint">Every rookie is level 5 or so; the archetype is the nudge, and the trait path they rank up along. Tap two.</p>
        <div className="rt-scroll">
          <table className="rt rk-offer">
            <thead>
              <tr>
                <th className="rt-name">Rookie</th>
                <th className="rt-arch">Archetype</th>
                <th className="rt-oc">OVR</th>
                {DRIVER_STATS.map(st => <th key={st} className="rt-stat" title={STAT_LABELS[st]}>{STAT_ABBR[st]}</th>)}
              </tr>
            </thead>
            <tbody>
              {offer.map(d => {
                const on = picked.includes(d.id);
                const reads = DRIVER_STATS.map(st => readStat(st, d.stats[st as keyof typeof d.stats], []));
                const a = d.archetype ? ARCHETYPE_INFO[d.archetype] : null;
                return (
                  <tr key={d.id} className={on ? 'picked' : ''}>
                    <th className="rt-name" scope="row">
                      <button type="button" className="rt-pick" onClick={() => toggle(d.id)} aria-pressed={on}>
                        <RaceNumber n={d.number} color={on ? you.color : 'var(--pw-ground)'} ink={on ? you.ink : 'var(--pw-text-1)'} ring={!on} size={22} shape="square" className="rt-numsq" />
                        <Avatar icon={portraitFor(seed, d.id)} color={on ? you.color : undefined} size={20} />
                        <span className="rt-nm">{d.fullName}</span>
                      </button>
                    </th>
                    <td className="rt-arch">{a && d.archetype && <><b>{a.name}</b><small>{describeNudge(d.archetype)}</small></>}</td>
                    <GradeCell value={overall(reads).total} strong />
                    {reads.map(r => <GradeCell key={r.stat} value={r.total} />)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rs-row">
        <div className="rs-row-head"><span className="rs-k">Car setup</span></div>
        <p className="rs-hint">A two-star car, set up one way. Pick one.</p>
        <div className="rk-setups" role="radiogroup" aria-label="Car setup">
          {CAR_SETUP_IDS.map(id => {
            const s = CAR_SETUPS[id];
            return (
              <button key={id} type="button" role="radio" aria-checked={setup === id} className={`rk-setup ${setup === id ? 'on' : ''}`} onClick={() => setSetup(id)}>
                <b>{s.name}</b>
                <span>{STAT_LABELS[s.stat]} +{s.points / 5} levels</span>
                <small>{s.blurb}</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className="ss-dock">
        <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" disabled={!ready} onClick={start}>
          {picked.length < OFFER_PICKS ? `Tap ${OFFER_PICKS - picked.length} more rookie${OFFER_PICKS - picked.length === 1 ? '' : 's'}` : setup === null ? 'Pick a car setup' : 'Start the run'}
        </button>
      </div>
    </div>
  );
}
