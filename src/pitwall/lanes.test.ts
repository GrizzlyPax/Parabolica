import { describe, expect, it } from 'vitest';
import { applyMove, laneOf, linkedIssues, moveTo, sortForLane, type PwIssue } from './lanes';

const issue = (p: Partial<PwIssue>): PwIssue => ({
  number: 1, title: 't', body: '', url: '', state: 'open', labels: [], milestone: null,
  updatedAt: '2026-10-01T00:00:00Z', closedAt: null, comments: 0, prs: [], ...p,
});

describe('pit wall lanes', () => {
  it('reads the lane from labels and state', () => {
    expect(laneOf(issue({}))).toBe('inbox');
    expect(laneOf(issue({ labels: ['idea', 'world-deck'] }))).toBe('inbox');
    expect(laneOf(issue({ labels: ['next'] }))).toBe('next');
    expect(laneOf(issue({ labels: ['ready', 'bug'] }))).toBe('ready');
    expect(laneOf(issue({ labels: ['backlog'] }))).toBe('backlog');
    expect(laneOf(issue({ labels: ['in progress', 'ready'] }))).toBe('building');
    expect(laneOf(issue({ labels: ['ready'], prs: [300] }))).toBe('building');
    expect(laneOf(issue({ state: 'closed', labels: ['ready'] }))).toBe('done');
  });

  it('a move swaps exactly one lane label and keeps the rest', () => {
    const i = issue({ labels: ['bug', 'next'] });
    const m = moveTo(i, 'ready');
    expect(m).toEqual({ addLabels: ['ready'], removeLabels: ['next'] });
    expect(laneOf(applyMove(i, m))).toBe('ready');
    expect(applyMove(i, m).labels).toContain('bug');
  });

  it('moving to inbox strips lane labels; done closes; leaving done reopens', () => {
    expect(moveTo(issue({ labels: ['backlog', 'ui'] }), 'inbox')).toEqual({ addLabels: [], removeLabels: ['backlog'] });
    const closing = moveTo(issue({ labels: ['ready'] }), 'done');
    expect(closing.state).toBe('closed');
    expect(closing.removeLabels).toEqual(['ready']);
    const reopened = applyMove(issue({ state: 'closed', closedAt: 'x' }), moveTo(issue({ state: 'closed' }), 'next'));
    expect(reopened.state).toBe('open');
    expect(reopened.closedAt).toBeNull();
    expect(laneOf(reopened)).toBe('next');
  });

  it('counts only PRs that close an issue or are branched from it', () => {
    expect(linkedIssues({ title: 'Speed readout (#285)', body: 'Closes #285, see #246. Fixes: #277', head: 'fix/speed' }).sort()).toEqual([277, 285]);
    expect(linkedIssues({ title: 'Spike', body: 'Touches #171 #231 #232', head: 'spike/toss-in' })).toEqual([]);
    expect(linkedIssues({ title: 'x', body: null, head: 'phase-0/232-acquisition' })).toEqual([232]);
  });

  it('puts Needs Pax and bugs first in a lane', () => {
    const list = [
      issue({ number: 1, updatedAt: '2026-10-05' }),
      issue({ number: 2, labels: ['bug'] }),
      issue({ number: 3, labels: ['question'] }),
    ];
    expect(sortForLane('next', list).map(i => i.number)).toEqual([3, 2, 1]);
  });
});
