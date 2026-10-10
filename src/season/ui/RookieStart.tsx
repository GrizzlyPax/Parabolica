// The rookie start (#660, Apex) with Hub's designed pick (#661): six rookie
// cards, pick two, one free re-roll, three car setups, Start. Your team (the
// team creator, the run's first step) heads the screen. Reads and writes the
// run through the facade; Start lands on the ladder.
import { useMemo, useState } from 'react';
import { TeamLogo, teamThemeVars } from '../../icons/GameIcon';
import { OFFER_PICKS, type CarSetupId } from '../rookies';
import RookiePick from './RookiePick';
import { offerOf } from '../rookieView';
import { loadRun, rookieOfferFor, type RunFacts } from '../../run/run';
import { pickCurrentRookies, rerollCurrentRookies } from '../../run/current';
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
          <span className="rs-sub rl-team"><TeamLogo team={you} size={20} /> {you.name} · pick {OFFER_PICKS} rookies and a car setup</span>
        </div>
      </header>
      {/* The designed pick (#661): 6 cards, pick 2, one free re-roll, 3 car setups, Start. */}
      <RookiePick
        league="Juniors"
        offer={offer.map(offerOf)}
        picked={picked}
        rerollsLeft={run.rookies.rerolled ? 0 : 1}
        setup={setup}
        onToggle={toggle}
        onReroll={reroll}
        onSetup={setSetup}
        onStart={start}
      />
    </div>
  );
}
