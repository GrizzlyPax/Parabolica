// The Ladder's view (#628, #696). Pure: a run in, what the run's home screen
// shows out. Three rungs, Locals at the bottom; the step in play is open
// (races run, you against the garage nearest you, how you go up); a won rung
// keeps its title; a lost one says where it ended; Nationals waits (#694).
import { constructorStandings, seasonState, type SeasonFacts } from '../season/season';
import { teamsOf } from '../season/ui/teams';
import type { TeamLike } from '../icons/GameIcon';
import { runState, seasonFactsFor, titlesOf, type RunFacts, type RunPhase } from './run';
import type { Step } from '../look/step';
import { UNLOCKS, type MetaFacts, type UnlockId } from './meta';
import { nemesisTeam } from '../season/nemesis';
import { aliveAt, stageOf } from '../season/format';

export interface Standing { team: TeamLike & { id: string }; place: number; points: number }

export interface RungView {
  index: number;
  step: Step;
  name: string;
  /** The title this rung is for ("Ace Toledo"). */
  title: string;
  status: 'won' | 'lost' | 'current' | 'ahead';
  /** Not built yet (Nationals). */
  later?: boolean;
  /** Races run and the step's length (the last is the boss race). */
  races?: { done: number; total: number };
  you?: Standing;
  /** Who you're up against: the nemesis (parked), else the garage nearest you. */
  rival?: Standing & { nemesis: boolean };
  /** One line for a finished step. */
  memory?: string;
  /** A format step (Nationals, #694): the stage in play and who is still in. */
  stage?: { name: string; alive: number; total: number; decides: string };
}

export interface LadderView {
  phase: RunPhase;
  leagueIndex: number;
  you: TeamLike;
  /** Your state and town. */
  stateId: string;
  town: string;
  /** Titles held, bottom first. */
  titles: { step: Step; name: string }[];
  rungs: RungView[];
  unlocks: { id: UnlockId; name: string; blurb: string; got: boolean }[];
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
export { ordinal };

function standingOf(facts: SeasonFacts, teamId: string): Standing | undefined {
  const table = constructorStandings(facts);
  const row = table.find(s => s.teamId === teamId);
  const team = teamsOf(facts)[teamId];
  return row && team ? { team: { ...team, id: teamId }, place: row.rank, points: row.points } : undefined;
}

function rungFor(run: RunFacts, rung: RungView): RungView {
  const facts = seasonFactsFor(run, rung.index);
  const youId = facts.setup.humans[0]?.teamId ?? '';
  const you = standingOf(facts, youId);
  const nemesisId = nemesisTeam(facts)?.id;
  const table = constructorStandings(facts);
  const nearestId = table.find(s => s.teamId !== youId)?.teamId;
  const rivalId = nemesisId ?? nearestId;
  const rival = rivalId ? standingOf(facts, rivalId) : undefined;
  const done = seasonState(facts).phase === 'finished' ? facts.setup.calendar.length : facts.results.length;
  const view: RungView = { ...rung, races: { done, total: facts.setup.calendar.length }, you, rival: rival && { ...rival, nemesis: rivalId === nemesisId } };
  const stage = stageOf(facts, Math.min(done, facts.setup.calendar.length - 1));
  if (stage) view.stage = { ...stage, total: facts.setup.teamCount };
  const outAt = aliveAt(facts).outAt[youId];
  if (rung.status === 'won') view.memory = `${rung.title}: yours.`;
  else if (rung.status === 'lost' && outAt !== undefined) view.memory = `Out after ${stageOf(facts, outAt)?.name ?? `race ${outAt + 1}`}, with ${aliveAt(facts, outAt + 1).teams.length} states still in. The run ended here.`;
  else if (rung.status === 'lost' && you) view.memory = `Finished ${ordinal(you.place)} with ${you.points} pts. The run ended here.`;
  return view;
}

export function ladderView(run: RunFacts, meta: MetaFacts): LadderView {
  const state = runState(run);
  const ctx = state.league.setup.league!;
  return {
    phase: state.phase,
    leagueIndex: state.leagueIndex,
    you: run.setup.garage,
    stateId: ctx.locale?.stateId ?? run.setup.stateId,
    town: ctx.locale?.town ?? '',
    titles: titlesOf(run),
    rungs: state.ladder.map(r => (r.status === 'ahead' ? { ...r } : rungFor(run, { ...r }))),
    unlocks: (Object.keys(UNLOCKS) as UnlockId[]).map(id => ({ id, ...UNLOCKS[id], got: meta.unlocks.includes(id) })),
  };
}
