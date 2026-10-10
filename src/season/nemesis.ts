// The nemesis talks (#635; Radio + Pax, docs/story/nemesis.md). A Pokémon-
// style rival team: one line per Paddock visit, picked by the moment, from
// the speaking driver's personality. Flavour only: every roll here is on its
// own seeded stream ('nemesis-voice'), never the sim's, and nothing is saved.
//
// Personalities belong to the nemesis team's seats, not its drivers (#665).
//
// Who the nemesis is: from the Regional up, the team flagged
// CompetitorTeam.nemesis (last league's runner-up, #626). The Juniors has no
// last league, so a rival is picked for its voice only (no level bump; the
// sim doesn't know) and says the "first meeting" lines.
import { deriveSeed, mulberry32 } from '../engine/rng';
import { draftState } from './draft';
import { constructorStandings, poolFor, seasonState, type SeasonFacts } from './season';
import type { CompetitorTeam } from './genesis';

export type Personality = 'brat' | 'show-off' | 'old-hand' | 'brooder' | 'spanish';
export const PERSONALITIES: readonly Personality[] = ['brat', 'show-off', 'old-hand', 'brooder', 'spanish'];
export const PERSONALITY_NAMES: Record<Personality, string> = {
  brat: 'The Brat', 'show-off': 'The Show-off', 'old-hand': 'The Old Hand', brooder: 'The Brooder', spanish: 'The Spanish speaker',
};

export type Moment = 'first' | 'return' | 'lead' | 'trail' | 'beat' | 'beaten' | 'boss' | 'bossYouWin' | 'bossYouWinTop' | 'bossTheyWin';

/** A line; Spanish lines carry their English underneath. */
export interface Line { text: string; en?: string }
type Pool = Partial<Record<Moment, Line[]>>;

const l = (...texts: string[]): Line[] => texts.map(text => ({ text }));
const es = (...pairs: [string, string][]): Line[] => pairs.map(([text, en]) => ({ text, en }));

/** Every line, verbatim from docs/story/nemesis.md. */
export const NEMESIS_LINES: Record<Personality, Pool> = {
  brat: {
    first: l('So you\'re the new kid. I\'m faster.', 'Hi. I\'m going to beat you all year.'),
    return: l('Oh. You got promoted too? Cute.', 'Took you long enough.', 'Look who followed me up.'),
    lead: l('{gap} points ahead. Try to keep up.', 'Still behind me? Classic.', 'I\'d slow down for you, but I don\'t know how.'),
    trail: l('Enjoy it. It won\'t last.', '{gap} points? That\'s one race.', 'Lucky. Everyone saw it.'),
    beat: l('Smell you later, {you}.', 'Did you even see which way I went?', 'I\'ll wait for you at the finish next time too.'),
    beaten: l('Whatever. My car was set up wrong.', 'I let you have that one.', 'Fine. FINE.'),
    boss: l('Last race. Try not to cry.', 'Win this and you go up. Spoiler: you won\'t.'),
    bossYouWin: l('...I\'ll be back. And I\'ll be better.', 'See you in the next league. Obviously.'),
    bossYouWinTop: l('...Fine. You\'re the best. For now.'),
    bossTheyWin: l('Told you. Smell you later!', 'Better luck next run, {you}.'),
  },
  'show-off': {
    first: l('You must be new. You\'ll want my autograph.', 'Hello! Yes, it\'s me.'),
    return: l('Did you miss me? Everyone misses me.', 'New league, new helmet, same incredible {driver}.', 'Back, and twice as shiny.'),
    lead: l('{gap} points clear. Smile for the cameras. Oh, they\'re pointing at me.', 'Top of the table looks good on me. Everything does.'),
    trail: l('A temporary setback. Great for ratings.', '{gap} points behind? I call that a comeback story.', 'I\'m saving the good bit for later.'),
    beat: l('And THAT is how it\'s done. Wave to the crowd!', 'Another one for the highlights reel.'),
    beaten: l('I meant to do that. It\'s called a plot twist.', 'The crowd loves an underdog. Enjoy your moment.'),
    boss: l('The final! Lights, cameras, me!', 'I\'ve rehearsed the celebration.'),
    bossYouWin: l('This isn\'t over. It\'s barely the second act.'),
    bossYouWinTop: l('A finale worthy of me. Congratulations, I suppose.'),
    bossTheyWin: l('And scene! Thank you, you\'ve been wonderful.'),
  },
  'old-hand': {
    first: l('Rookies. Every year.', 'Keep out of my mirrors, kid.'),
    return: l('Second last time. Not happening twice.', 'Promoted with you. Don\'t make a thing of it.'),
    lead: l('{gap} points. That\'s experience.', 'Steady wins it. Always has.'),
    trail: l('Long season. Don\'t count your points yet.', 'Fast car. Young team. Seen it before.'),
    beat: l('Told you. Experience.', 'Nice try, kid.', 'That\'s racing.'),
    beaten: l('Fair enough. Good drive.', 'Hm. You\'re getting better.'),
    boss: l('Last race. Let\'s see what you\'ve learned.', 'Been here before. Have you?'),
    bossYouWin: l('Good race. You earned that.', 'See you in the next league. I\'m not done.'),
    bossYouWinTop: l('Champion. You earned every inch.'),
    bossTheyWin: l('That\'s experience, kid.', 'Well raced. Come back when you\'re ready.'),
  },
  brooder: {
    first: l('Hmph.', '...'),
    return: l('Hmph.', '...', 'You again.'),
    lead: l('Hmph.', 'Expected.', '...'),
    trail: l('Hmph.', 'Not for long.', '...'),
    beat: l('Hmph.', 'Obviously.'),
    beaten: l('...', 'Hmph.', 'Next time.'),
    boss: l('Hmph.', 'Finally.'),
    bossYouWin: l('...Hmph.', 'Next league.'),
    bossYouWinTop: l('...Hmph. Well driven.'),
    bossTheyWin: l('Hmph.', 'As expected.'),
  },
  spanish: {
    first: es(['¿Y tú quién eres?', 'And who are you?'], ['Bienvenido, novato.', 'Welcome, rookie.']),
    return: es(['¿Otra vez tú?', 'You again?'], ['Hola de nuevo, {you}.', 'Hello again, {you}.'], ['Subimos juntos. Qué casualidad.', 'We came up together. What a coincidence.']),
    lead: es(['{gap} puntos. Tranquilo, que aún queda temporada.', '{gap} points. Relax, there\'s still a season left.'], ['Vamos bien. Muy bien.', 'We\'re doing well. Very well.']),
    trail: es(['Esto no ha terminado.', 'This isn\'t over.'], ['Paciencia. La temporada es larga.', 'Patience. The season is long.']),
    beat: es(['¡Hasta luego, {you}!', 'See you later, {you}!'], ['¡Vamos!', 'Let\'s go!'], ['Así se hace.', 'That\'s how it\'s done.']),
    beaten: es(['Bah. Suerte.', 'Bah. Luck.'], ['Bien hecho. Esta vez.', 'Well done. This time.']),
    boss: es(['Última carrera. Que gane el mejor.', 'Last race. May the best one win.'], ['Hoy no, amigo.', 'Not today, friend.']),
    bossYouWin: es(['Nos vemos en la próxima liga.', 'See you in the next league.']),
    bossYouWinTop: es(['Campeón. Te lo has ganado.', 'Champion. You\'ve earned it.']),
    bossTheyWin: es(['¡Adiós, {you}!', 'Goodbye, {you}!'], ['Te lo dije.', 'I told you.']),
  },
};

/** Two Show-offs speak as "we" where these exist; elsewhere the speaker's own Show-off line. */
export const DOUBLE_ACT_LINES: Pool = {
  first: l('Hello! Yes, it\'s us.'),
  return: l('Did you miss us? Everyone misses us.', 'Prepare for a proper season. {nemesis} are back, and twice as shiny.'),
  beat: l('And THAT is how it\'s done. Wave to the crowd, both of us!'),
  boss: l('The final! Lights, cameras, {nemesis}!'),
  bossYouWinTop: l('A finale worthy of us. Fine. You can have a bow too.'),
  bossTheyWin: l('We\'re blasting off to the next league! Bye!'),
};

const voice = (seed: number, ...keys: (string | number)[]) => mulberry32(deriveSeed(seed, 'nemesis-voice', ...keys));

/**
 * Each nemesis seat's personality: equal odds, doubles allowed, its own stream.
 * Keyed to the run, the nemesis team's look and the seat (0 or 1), never the
 * driver id (#665, Pax Oct 10): the nemesis rolls fresh drivers each league,
 * but the same Brat and Old Hand come back. "They're back."
 */
export function personalityOf(runKey: string, look: string, seat: number): Personality {
  return PERSONALITIES[Math.floor(mulberry32(deriveSeed(0, 'nemesis-voice', 'personality', runKey, look, seat))() * PERSONALITIES.length)];
}

/** A run-stable key: your own drivers' names (rolled from the run seed and
 * carried up league to league), so personalities hold within a run and vary
 * between runs. */
export function runKeyOf(names: readonly string[]): string {
  return [...names].sort().join('|');
}

/** The look a team carries up (#626): the deck team, else its name. */
const lookOf = (t: CompetitorTeam) => t.deckTeamId ?? t.name;

/** The nemesis team in this league: the flagged one, or (Juniors) a rival picked for its voice. Null outside a run. */
export function nemesisTeam(facts: SeasonFacts): CompetitorTeam | null {
  if (!facts.setup.league) return null;
  const pool = poolFor(facts);
  const flagged = pool.teams.find(t => t.nemesis);
  if (flagged) return flagged;
  if (facts.setup.league.index !== 0) return null;
  const you = new Set(facts.setup.humans.map(h => h.teamId));
  const cpu = pool.teams.filter(t => !you.has(t.id));
  return cpu.length ? cpu[Math.floor(voice(facts.setup.seed, 'juniors-rival')() * cpu.length)] : null;
}

export interface Spoken { lines: (Line & { who: string })[]; moment: Moment; teamId: string }

const fill = (s: string, t: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => t[k] ?? m);

/** This Paddock visit's line(s): one, or both drivers before the boss race. Null outside a run or before the draft. */
export function nemesisLine(facts: SeasonFacts): Spoken | null {
  const team = nemesisTeam(facts);
  const youTeam = facts.setup.humans[0];
  const state = seasonState(facts);
  if (!team || !youTeam || state.phase === 'draft') return null;
  const pool = poolFor(facts);
  const rosters = draftState(pool, facts.draftPicks).rosters;
  const theirs = (rosters[team.id]?.driverIds ?? []).slice(0, 2);
  const mine = rosters[youTeam.teamId]?.driverIds ?? [];
  if (theirs.length < 2) return null;
  const seed = facts.setup.seed;
  const total = facts.setup.calendar.length;
  const finished = state.phase === 'finished';
  const round = finished ? total : state.round;
  const last = facts.results[round - 1];
  const pos = (id: number) => { const i = last?.finishOrder.indexOf(id) ?? -1; return i < 0 ? Infinity : i; };
  const table = constructorStandings(facts);
  const pts = (id: string) => table.find(s => s.teamId === id)?.points ?? 0;
  const gap = Math.abs(pts(team.id) - pts(youTeam.teamId));
  const top = facts.setup.league!.index >= 3;

  // The moment (docs/story/nemesis.md → The moments).
  let moment: Moment;
  const yourBest = Math.min(...mine.map(pos));
  const theirBest = Math.min(...theirs.map(pos));
  if (finished) {
    const youWon = table[0]?.teamId === youTeam.teamId;
    moment = youWon ? (top ? 'bossYouWinTop' : 'bossYouWin') : 'bossTheyWin';
  } else if (round === total - 1) moment = 'boss';
  else if (round === 0) moment = facts.setup.league!.index === 0 ? 'first' : 'return';
  else if (theirBest < yourBest) moment = 'beat';
  else if (yourBest < theirBest) moment = 'beaten';
  else moment = pts(team.id) > pts(youTeam.teamId) ? 'lead' : 'trail';

  // Who speaks: whoever finished ahead of you; else their higher-placed driver; at a start, the first.
  const ahead = theirs.filter(id => pos(id) < yourBest).sort((a, b) => pos(a) - pos(b));
  const speaker = ahead[0] ?? (last ? [...theirs].sort((a, b) => pos(a) - pos(b))[0] : theirs[0]);
  const names = new Map(pool.drivers.map(d => [d.id, d.fullName]));
  const surname = (id: number) => (names.get(id) ?? '').split(' ').slice(-1)[0];
  const tokens = (id: number) => ({ you: youTeam.name, nemesis: team.name, driver: names.get(id) ?? '', gap: String(gap) });
  const runKey = runKeyOf(mine.map(id => names.get(id) ?? String(id)));
  const look = lookOf(team);
  const personalityAt = (id: number) => personalityOf(runKey, look, Math.max(0, theirs.indexOf(id)));
  const personalities = theirs.map(personalityAt);
  const doubleAct = personalities.every(p => p === 'show-off');

  // One line from a pool, seeded per round, never the same line twice in a row.
  const pickFrom = (lines: Line[], key: string, r: number): number => {
    const i = Math.floor(voice(seed, 'line', key, r)() * lines.length);
    if (r > 0 && lines.length > 1 && i === pickFrom(lines, key, r - 1)) return (i + 1) % lines.length;
    return i;
  };
  const say = (id: number): Line & { who: string } => {
    const p = personalityAt(id);
    const lines = NEMESIS_LINES[p][moment] ?? NEMESIS_LINES[p][moment === 'first' ? 'return' : moment === 'bossYouWinTop' ? 'bossYouWin' : 'lead']!;
    const line = lines[pickFrom(lines, `${p}:${moment}:${id}`, round)];
    return { text: fill(line.text, tokens(id)), en: line.en && fill(line.en, tokens(id)), who: `${names.get(id)} · ${team.name}` };
  };
  const we = doubleAct ? DOUBLE_ACT_LINES[moment] : undefined;
  if (we) {
    const line = we[pickFrom(we, `we:${moment}`, round)];
    return { moment, teamId: team.id, lines: [{ text: fill(line.text, tokens(speaker)), who: `${surname(theirs[0])} & ${surname(theirs[1])} · ${team.name}` }] };
  }
  // Before the boss race both drivers speak.
  const spoken = moment === 'boss' ? theirs.map(say) : [say(speaker)];
  return { moment, teamId: team.id, lines: spoken };
}
