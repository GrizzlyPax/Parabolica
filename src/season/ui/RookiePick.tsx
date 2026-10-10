// The rookie pick (#661; Steward's 10/10 Rookie Pick Report, Pax picked all
// four steers): one screen starts a run. 6 rookies, pick 2, one free re-roll,
// 1 of 3 car setups, Start. The team creator (#346) sits on top (`children`).
// Presentational: the host owns the offer and the picks (Apex's #660 makes
// them facts); this draws them in stat levels (#623).
import type { ReactNode } from 'react';
import { STAT_LABELS } from '../../cards/deck';
import { levelTone } from '../grades';
import { SETUPS, rookieCard, setupView, type CarSetupId, type RookieOffer } from '../rookieView';
import { OFFER_PICKS } from '../rookies';
import './Season.css';

export const PICKS = OFFER_PICKS;

interface Props {
  /** "Juniors". */
  league: string;
  offer: readonly RookieOffer[];
  picked: readonly number[];
  rerollsLeft: number;
  setup: CarSetupId | null;
  onToggle: (rookieId: number) => void;
  onReroll: () => void;
  onSetup: (id: CarSetupId) => void;
  onStart: () => void;
  /** The team creator, above the rookies. */
  children?: ReactNode;
}

const Lv = ({ n }: { n: number }) => <span className={`rp-lv tone-${levelTone(n)}`}>{n}</span>;

export default function RookiePick({ league, offer, picked, rerollsLeft, setup, onToggle, onReroll, onSetup, onStart, children }: Props) {
  const full = picked.length >= PICKS;
  const ready = picked.length === PICKS && setup !== null;
  return (
    <div className="rp">
      {children}
      <section className="rs-row rp-block" aria-label="Your rookies">
        <div className="rs-row-head">
          <span className="rs-k">New run · {league}</span>
          <span className="rp-count">Pick {PICKS} of {offer.length} · {rerollsLeft} re-roll{rerollsLeft === 1 ? '' : 's'} left</span>
        </div>
        <div className="rp-rookies">
          {offer.map(r => {
            const v = rookieCard(r);
            const on = picked.includes(r.id);
            return (
              <button key={r.id} type="button" className={`rp-rookie ${on ? 'on' : ''}`} aria-pressed={on} disabled={!on && full} onClick={() => onToggle(r.id)}>
                <span className="rp-arch">{v.archetype}</span>
                <b className="rp-name">{v.name}</b>
                <span className="rp-stats">
                  {v.lean.map(l => <span key={l.stat} className="rp-stat"><span>{STAT_LABELS[l.stat]}</span><Lv n={l.level} /></span>)}
                  {v.others && <span className="rp-stat rp-others"><span>Others</span><span>{v.others.min === v.others.max ? v.others.min : `${v.others.min}–${v.others.max}`}</span></span>}
                </span>
                {v.flavour && <span className="rp-flav">“{v.flavour}”</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rs-row rp-block" aria-label="Car setup">
        <div className="rs-row-head"><span className="rs-k">Car setup · pick 1</span></div>
        <div className="rp-setups" role="radiogroup" aria-label="Car setup">
          {SETUPS.map(s => {
            const v = setupView(s.id);
            return (
              <button key={s.id} type="button" role="radio" aria-checked={setup === s.id} className={`rp-setup ${setup === s.id ? 'on' : ''}`} onClick={() => onSetup(s.id)}>
                <b>{s.name}</b>
                <span>{STAT_LABELS[v.stat]} <Lv n={v.level} /> · others <Lv n={v.others} /></span>
                <small className="rp-setup-blurb">{s.blurb}</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className="ss-dock rp-dock">
        <button type="button" className="rs-btn rs-btn-ghost" onClick={onReroll} disabled={rerollsLeft <= 0}>Re-roll rookies</button>
        <button type="button" className="rs-btn rs-btn-primary ss-dock-btn" onClick={onStart} disabled={!ready}>
          {ready ? 'Start the run →' : picked.length < PICKS ? `Pick ${PICKS - picked.length} more` : 'Pick a car setup'}
        </button>
      </div>
    </div>
  );
}
