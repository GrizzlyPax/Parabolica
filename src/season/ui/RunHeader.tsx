// The run header (#778): the same top on every run screen, so "where am I,
// what's next" reads at a glance. Under the bunting, the state bar says the
// title you hold and the title you're going for, then the race you're on and
// your place; the row below it is the way out (Menu), the garage small, and
// the links (The road, End run). Identity is your title, not your garage.
import type { ReactNode } from 'react';
import { ordinal } from '../../run/ladderView';
import { runWhere, type RunWhere } from '../../run/where';
import type { SeasonFacts } from '../season';
import EndSeason from './EndSeason';
import { Bunting, Chequer, Pennant, ProgramLine, StateBar, TitleRibbon } from '../../look/Look';
import { programNumber } from '../../look/step';

interface Props {
  facts: SeasonFacts;
  /** The screen's name under the chequer; none for a screen whose title is the sash. */
  title?: string;
  onMenu: () => void;
  /** The ladder: the whole road. Absent on the ladder itself. */
  onRoad?: () => void;
  /** End the run (one save slot); absent where the run is already over. */
  onEndRun?: () => void;
  /** Replaces the race / place part of the state bar. */
  status?: ReactNode;
  /** The step is won: the title it was for is held now. */
  won?: boolean;
}

/** The state bar's words: the title held leads, worn as its ribbon (#778, the pageant); else the one you're going for. */
export function whereWords(w: RunWhere, won = false): ReactNode {
  if (won) return <TitleRibbon step={w.step} state={w.state}>{w.goingFor}</TitleRibbon>;
  return w.latest ? <><TitleRibbon step={w.latest.step} state={w.state}>{w.latest.name}</TitleRibbon> · going for {w.goingFor}</> : <><b>Going for {w.goingFor}</b></>;
}

export function raceWords(w: RunWhere): string {
  const race = w.finished ? `all ${w.total} races run` : `race ${w.round + 1} of ${w.total}`;
  return w.place ? `${race} · ${ordinal(w.place.rank)} on ${w.place.points} pts` : race;
}

export default function RunHeader({ facts, title, onMenu, onRoad, onEndRun, status, won }: Props) {
  const w = runWhere(facts);
  const garage = facts.setup.humans[0]?.name ?? '';
  return (
    <>
      <Bunting />
      <ProgramLine right={`No. ${programNumber(facts.setup.seed)} · 10¢`} />
      <StateBar pennant={<Pennant name={w.town} width={72} />}>{whereWords(w, won)} · {status ?? raceWords(w)}</StateBar>
      <div className="rh-row">
        <button type="button" className="ace-link" onClick={onMenu}>Menu</button>
        <span className="ace-where rh-garage">{w.step === 'locals' ? `${garage} · ` : ''}{w.town}, {w.state.name}</span>
        <span className="rh-links">
          {onRoad && <button type="button" className="ace-link" onClick={onRoad}>The road</button>}
          {onEndRun && <EndSeason onEnded={onEndRun} />}
        </span>
      </div>
      {title && <h1 className="ace-h1">{title}</h1>}
      {title && <Chequer />}
    </>
  );
}
