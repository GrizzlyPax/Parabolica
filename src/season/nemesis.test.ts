// #635: the nemesis talks. Lines mirror docs/story/nemesis.md; personalities
// roll per driver on their own stream; the moment and speaker follow the doc.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NEMESIS_LINES, DOUBLE_ACT_LINES, PERSONALITIES, PERSONALITY_NAMES, personalityOf, runKeyOf, nemesisLine, nemesisTeam, type Moment } from './nemesis';
import { currentLeague, withCurrentLeague, runState, promote, type RunFacts } from '../run/run';
import { seasonState, setLineup, settleRound, poolFor, newSeason } from './season';
import { draftState } from './draft';
import { openParcelQuick } from './testHelpers';
import { testRun } from '../run/testHelpers';

const TEAMS = 5;
const runFor = (seed: number): RunFacts => testRun(seed, 'vt');
function playRounds(run: RunFacts, n = Infinity): RunFacts {
  let f = currentLeague(run); let done = 0;
  while (seasonState(f).phase !== 'finished' && done < n) {
    const s = seasonState(f);
    if (s.phase === 'paddock') { const r = draftState(poolFor(f), f.draftPicks).rosters[s.whoseTurn!]; f = openParcelQuick(setLineup(f, { round: s.round, teamId: s.whoseTurn!, driverIds: [r.driverIds[0], r.driverIds[1]] })); }
    else { f = settleRound(f); done++; }
  }
  return withCurrentLeague(run, f);
}
const flat = (pool: Partial<Record<Moment, { text: string; en?: string }[]>>) => Object.values(pool).flat().map(x => x!.text);

describe('nemesis lines (#635)', () => {
  it('every line is verbatim from docs/story/nemesis.md, and every personality covers every moment', () => {
    const md = readFileSync(join(__dirname, '../../docs/story/nemesis.md'), 'utf8').replace(/\\'/g, "'");
    for (const p of PERSONALITIES) {
      expect(md).toContain(`### ${PERSONALITY_NAMES[p]}`);
      for (const m of ['first', 'return', 'lead', 'trail', 'beat', 'beaten', 'boss', 'bossYouWin', 'bossYouWinTop', 'bossTheyWin'] as Moment[]) {
        expect(NEMESIS_LINES[p][m]?.length, `${p} ${m}`).toBeGreaterThan(0);
      }
      for (const line of Object.values(NEMESIS_LINES[p]).flat()) {
        expect(md, line!.text).toContain(line!.text);
        if (line!.en) expect(md, line!.en).toContain(`_(${line!.en})_`);
      }
    }
    for (const t of flat(DOUBLE_ACT_LINES)) expect(md).toContain(t);
    expect(Object.values(NEMESIS_LINES.spanish).flat().every(x => !!x!.en)).toBe(true);
    expect(JSON.stringify(NEMESIS_LINES)).not.toContain('Harbour Streets');
  });

  it('personalities belong to the nemesis seat, keyed to the run and the look (#665): all five turn up, doubles allowed', () => {
    const seen = new Set(Array.from({ length: 200 }, (_, i) => personalityOf('run-a', `look-${i}`, i % 2)));
    expect(seen.size).toBe(5);
    expect(personalityOf('run-a', 'kanzaki', 0)).toBe(personalityOf('run-a', 'kanzaki', 0));
    // Different runs roll their own.
    const differs = Array.from({ length: 40 }, (_, i) => personalityOf(`run-${i}`, 'kanzaki', 0));
    expect(new Set(differs).size).toBeGreaterThan(1);
  });

  it('the run key holds across a promotion: your drivers carry up with their names', () => {
    let won: RunFacts | null = null;
    for (let s = 11; s < 300 && !won; s++) { const r = playRounds(runFor(s)); if (runState(r).phase === 'league-won') won = r; }
    const keyOf = (f: ReturnType<typeof currentLeague>) => {
      const you = f.setup.humans[0].teamId;
      const ids = draftState(poolFor(f), f.draftPicks).rosters[you].driverIds;
      const names = new Map(poolFor(f).drivers.map(d => [d.id, d.fullName]));
      return runKeyOf(ids.map(id => names.get(id)!));
    };
    expect(keyOf(currentLeague(promote(won!)))).toBe(keyOf(currentLeague(won!)));
  });

  it('parked in Ace America\'s run (#696, NEMESIS_IN_RUN): no garage is flagged, nobody talks; the seam returns with multi-season play', () => {
    const run = runFor(7);
    const facts = currentLeague(run);
    expect(nemesisTeam(facts)).toBeNull();
    expect(nemesisLine(facts)).toBeNull();
    expect(nemesisLine(newSeason({ seed: 7, teamCount: TEAMS, humans: facts.setup.humans, calendar: facts.setup.calendar }))).toBeNull();
    let won: RunFacts | null = null;
    for (let s = 11; s < 300 && !won; s++) { const r = playRounds(runFor(s)); if (runState(r).phase === 'league-won') won = r; }
    const up = currentLeague(promote(won!));
    expect(up.setup.carry?.nemesis).toBeUndefined();
    expect(nemesisTeam(up)).toBeNull();
  });

});
