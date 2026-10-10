// The league ladder's view (#628, Pax picked A: the ladder). Pure: a run in,
// what the run's home screen shows out. Four rungs, bottom to top; the league
// in play is open (races run, you against the nemesis, how you go up); won
// leagues keep one line of memory; leagues ahead wait.
import { constructorStandings, seasonState, type SeasonFacts } from '../season/season';
import { teamsOf } from '../season/ui/teams';
import type { TeamLike } from '../icons/GameIcon';
import { LEAGUE_LADDER, runState, runnerUp, seasonFactsFor, type RunFacts, type RunPhase } from './run';
import { UNLOCKS, type MetaFacts, type UnlockId } from './meta';
import { nemesisTeam } from '../season/nemesis';

export interface Standing { team: TeamLike & { id: string }; place: number; points: number }

export interface RungView {
  index: number;
  name: string;
  status: 'won' | 'lost' | 'current' | 'ahead';
  /** Races run and the league's length (the last is the boss race). */
  races?: { done: number; total: number };
  you?: Standing;
  /** Who you're up against: the nemesis, or (no nemesis yet) the team nearest you. */
  rival?: Standing & { nemesis: boolean };
  /** One line for a finished league. */
  memory?: string;
}

export interface LadderView {
  phase: RunPhase;
  leagueIndex: number;
  you: TeamLike;
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

function rungFor(run: RunFacts, i: number, status: RungView['status']): RungView {
  const facts = seasonFactsFor(run, i);
  const youId = facts.setup.humans[0]?.teamId ?? '';
  const you = standingOf(facts, youId);
  // The nemesis: the carried-up runner-up, or the Juniors' voice-only rival (#635).
  const nemesisId = nemesisTeam(facts)?.id;
  const table = constructorStandings(facts);
  const nearestId = table.find(s => s.teamId !== youId)?.teamId;
  const rivalId = nemesisId ?? nearestId;
  const rival = rivalId ? standingOf(facts, rivalId) : undefined;
  const done = seasonState(facts).phase === 'finished' ? facts.setup.calendar.length : facts.results.length;
  const view: RungView = {
    index: i, name: LEAGUE_LADDER[i].name, status,
    races: { done, total: facts.setup.calendar.length },
    you, rival: rival && { ...rival, nemesis: rivalId === nemesisId },
  };
  if (status === 'won') {
    const up = i < run.leagues.length - 1 ? runnerUp(facts) : undefined;
    view.memory = up ? `${up.name} were runners-up and came up with you.` : 'Won.';
  } else if (status === 'lost' && you) {
    view.memory = `Finished ${ordinal(you.place)} with ${you.points} pts. The run ended here.`;
  }
  return view;
}

export function ladderView(run: RunFacts, meta: MetaFacts): LadderView {
  const state = runState(run);
  return {
    phase: state.phase,
    leagueIndex: state.leagueIndex,
    you: run.setup.team,
    rungs: state.ladder.map(r => (r.status === 'ahead' ? { index: r.index, name: r.name, status: r.status } : rungFor(run, r.index, r.status))),
    unlocks: (Object.keys(UNLOCKS) as UnlockId[]).map(id => ({ id, ...UNLOCKS[id], got: meta.unlocks.includes(id) })),
  };
}
