// Pit Wall lanes. GitHub is the only store: a card's lane IS its labels and
// state, so Pit, Hub and the board can never disagree. Moving a card swaps
// one lane label (or closes / reopens the issue). Pure, no I/O — tested.

export type LaneId = 'inbox' | 'next' | 'ready' | 'building' | 'backlog' | 'done';

export interface Lane {
  id: LaneId;
  name: string;
  /** Who acts on cards in this lane. */
  sub: string;
  /** The label that puts an open issue in this lane (inbox = none of them; done = closed). */
  label?: string;
}

export const LANES: Lane[] = [
  { id: 'inbox', name: 'Inbox', sub: 'New. Pax or Pit sorts it' },
  { id: 'next', name: 'Next', sub: 'Pit scopes it', label: 'next' },
  { id: 'ready', name: 'Ready', sub: 'Hub builds it', label: 'ready' },
  { id: 'building', name: 'Building', sub: 'Open PR or in progress', label: 'in progress' },
  { id: 'backlog', name: 'Backlog', sub: 'Not now', label: 'backlog' },
  { id: 'done', name: 'Done', sub: 'Closed, last 3 weeks' },
];

export const LANE_LABELS = LANES.flatMap(l => (l.label ? [l.label] : []));
/** Label that flags a card as waiting on Pax's call. */
export const NEEDS_PAX = 'question';
export const EPIC = 'epic';

/** The slice of a GitHub issue the board uses. */
export interface PwIssue {
  number: number;
  title: string;
  body: string;
  url: string;
  state: 'open' | 'closed';
  stateReason?: string | null;
  labels: string[];
  milestone: string | null;
  updatedAt: string;
  closedAt: string | null;
  comments: number;
  /** Open PRs that mention this issue (#N in title, body or branch). */
  prs: number[];
}

export function laneOf(i: Pick<PwIssue, 'state' | 'labels' | 'prs'>): LaneId {
  if (i.state === 'closed') return 'done';
  // Most-advanced label wins if an issue somehow carries two.
  if (i.labels.includes('in progress') || i.prs.length > 0) return 'building';
  if (i.labels.includes('ready')) return 'ready';
  if (i.labels.includes('next')) return 'next';
  if (i.labels.includes('backlog')) return 'backlog';
  return 'inbox';
}

export interface Move {
  addLabels: string[];
  removeLabels: string[];
  /** Set when the move changes open/closed. */
  state?: 'open' | 'closed';
}

/** What GitHub has to change to put this issue in `to`. */
export function moveTo(i: Pick<PwIssue, 'state' | 'labels'>, to: LaneId): Move {
  const target = LANES.find(l => l.id === to)!;
  const removeLabels = i.labels.filter(l => LANE_LABELS.includes(l) && l !== target.label);
  const addLabels = target.label && !i.labels.includes(target.label) ? [target.label] : [];
  const move: Move = { addLabels, removeLabels };
  if (to === 'done' && i.state === 'open') move.state = 'closed';
  if (to !== 'done' && i.state === 'closed') move.state = 'open';
  return move;
}

/** Apply a move locally (optimistic update). */
export function applyMove<T extends PwIssue>(i: T, m: Move): T {
  const labels = i.labels.filter(l => !m.removeLabels.includes(l)).concat(m.addLabels);
  const state = m.state ?? i.state;
  return { ...i, labels, state, closedAt: state === 'closed' ? (i.closedAt ?? new Date().toISOString()) : null };
}

/** Issues an open PR is building: "closes/fixes/resolves #N" in its title or body, or a branch named for the issue ("phase-0/232-acquisition"). Bare "#N" mentions don't count. */
export function linkedIssues(pr: { title: string; body: string | null; head: string }): number[] {
  const nums = new Set<number>();
  for (const m of `${pr.title}\n${pr.body ?? ''}`.matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s*#(\d{1,6})\b/gi)) nums.add(Number(m[1]));
  const b = pr.head.match(/(?:^|\/)(\d{1,6})(?:-|$)/);
  if (b) nums.add(Number(b[1]));
  return [...nums];
}

export function needsPax(i: Pick<PwIssue, 'labels' | 'state'>): boolean {
  return i.state === 'open' && i.labels.includes(NEEDS_PAX);
}

const PRIORITY = (labels: string[]) =>
  labels.includes('priority: high') ? 0 : labels.includes('bug') ? 1 : labels.includes('priority: low') ? 3 : 2;

/** In-lane order: Needs Pax first, then high priority / bugs, then most recently touched. Done: newest closed first. */
export function sortForLane(lane: LaneId, list: PwIssue[]): PwIssue[] {
  const out = [...list];
  if (lane === 'done') return out.sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));
  return out.sort((a, b) =>
    Number(needsPax(b)) - Number(needsPax(a)) ||
    PRIORITY(a.labels) - PRIORITY(b.labels) ||
    b.updatedAt.localeCompare(a.updatedAt));
}
