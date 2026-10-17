// Where a step stands on the road (#778): what every run screen says first.
// Read from the step's own facts (its locale and index), so a screen needs no
// run load: the title you hold, the title you're going for, the race you're
// on and your place in the table.
import { stateLook, type StateLook, type Step } from '../look/step';
import { constructorStandings, seasonState, type SeasonFacts } from '../season/season';
import { STEP_PLAN, titleName } from './run';

export interface RunWhere {
  step: Step;
  index: number;
  state: StateLook;
  town: string;
  /** Titles held coming into this step, bottom first ("Ace Toledo"). */
  held: string[];
  /** The same, with their steps: ribbons and rosettes wear them (#778). */
  titles: { step: Step; name: string }[];
  /** The latest title held, with its step (the ribbon your rows wear, #769). */
  latest?: { step: Step; name: string };
  /** The title this step is for. */
  goingFor: string;
  /** The next title up, and its step's name, when a step waits above. */
  next?: string;
  nextStep?: string;
  /** 0-based round in progress (= races run). */
  round: number;
  total: number;
  finished: boolean;
  /** Your place in the garages' table, once a race has run. */
  place?: { rank: number; points: number };
}

export function runWhere(facts: SeasonFacts): RunWhere {
  const league = facts.setup.league;
  const index = league?.index ?? 0;
  const step = league?.step ?? STEP_PLAN[Math.min(index, STEP_PLAN.length - 1)].id;
  const stateId = league?.locale?.stateId ?? 'oh';
  const state = stateLook(stateId);
  const town = league?.locale?.town ?? '';
  const title = (s: Step) => titleName(s, town, state.name);
  const held = STEP_PLAN.slice(0, index).map(s => title(s.id));
  const titles = STEP_PLAN.slice(0, index).map(s => ({ step: s.id, name: title(s.id) }));
  const above = STEP_PLAN[index + 1];
  const st = seasonState(facts);
  const you = facts.setup.humans[0]?.teamId;
  const line = you ? constructorStandings(facts).find(s => s.teamId === you) : undefined;
  const latestStep = STEP_PLAN[index - 1];
  return {
    step, index, state, town, held, titles, goingFor: title(step),
    ...(latestStep ? { latest: { step: latestStep.id, name: title(latestStep.id) } } : {}),
    ...(above && above.races ? { next: title(above.id), nextStep: above.name } : {}),
    round: st.round, total: facts.setup.calendar.length, finished: st.phase === 'finished',
    ...(facts.results.length && line ? { place: { rank: line.rank, points: line.points } } : {}),
  };
}

/** The titles to wear: the ones held, plus this step's once it is won. */
export function heldTitles(w: RunWhere, won = false): { step: Step; name: string }[] {
  return won ? [...w.titles, { step: w.step, name: w.goingFor }] : w.titles;
}

/** One line for the menu and the holding screens: "Ace Toledo · going for Ace Ohio" / "Going for Ace Toledo". */
export function whereLine(w: RunWhere): string {
  return w.held.length ? `${w.held[w.held.length - 1]} · going for ${w.goingFor}` : `Going for ${w.goingFor}`;
}
