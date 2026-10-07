// Pit Wall: the team's live work board, read straight from GitHub issues.
// Lanes are labels (see lanes.ts), so Pit, Hub and this screen share one
// source of truth. Anyone can watch; a token on this device lets you add,
// move and edit tasks in place. docs/PIT_WALL.md has the label rules.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LANES, NEEDS_PAX, EPIC, LANE_LABELS, laneOf, moveTo, applyMove, needsPax, sortForLane,
  type LaneId, type PwIssue,
} from './lanes';
import {
  REPO, loadBoard, loadComments, createIssue, updateIssue, applyMoveRemote, addComment, checkToken,
  loadToken, saveToken, unlock, rateInfo, GitHubError, type Snapshot, type PwComment,
} from './github';
import './PitWall.css';

const POLL_MS = 60_000;
const COLLAPSED = 6;

function ago(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}
const shortDate = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
const errText = (e: unknown) => (e instanceof GitHubError ? e.message : 'Could not reach GitHub. Check your connection.');

interface Props { onBack: () => void }

export default function PitWall({ onBack }: Props) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setTokenState] = useState<string | null>(() => loadToken());
  const [, setTick] = useState(0);
  const [filter, setFilter] = useState<{ lane: LaneId | 'pax' | null; q: string; milestone: string }>({ lane: null, q: '', milestone: '' });
  const [expanded, setExpanded] = useState<Partial<Record<LaneId, boolean>>>({});
  const [openNum, setOpenNum] = useState<number | null>(null);
  const [adding, setAdding] = useState<LaneId | null>(null);
  const [settings, setSettings] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LaneId | null>(null);
  const dragNum = useRef<number | null>(null);
  const toastTimer = useRef<number>();

  const say = useCallback((t: string) => {
    setToast(t);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => { unlock(); }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setSnap(await loadBoard()); setLoadError(null); }
    catch (e) { setLoadError(errText(e)); }
    finally { setLoading(false); }
  }, []);

  // Live: poll while visible, refresh when the tab comes back.
  useEffect(() => {
    refresh();
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, POLL_MS);
    const clock = window.setInterval(() => setTick(t => t + 1), 15_000);
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearInterval(id); window.clearInterval(clock); document.removeEventListener('visibilitychange', onVis); };
  }, [refresh]);

  const replace = (i: PwIssue) => setSnap(s => s && ({ ...s, issues: s.issues.some(x => x.number === i.number) ? s.issues.map(x => (x.number === i.number ? { ...i, prs: x.prs } : x)) : [i, ...s.issues] }));

  const work = useMemo(() => (snap?.issues ?? []).filter(i => !i.labels.includes(EPIC)), [snap]);
  const milestones = useMemo(() => [...new Set(work.map(i => i.milestone).filter((m): m is string => !!m))].sort(), [work]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { pax: work.filter(needsPax).length };
    for (const l of LANES) c[l.id] = work.filter(i => laneOf(i) === l.id).length;
    return c;
  }, [work]);

  const shown = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    return work.filter(i =>
      (filter.lane !== 'pax' || needsPax(i)) &&
      (!filter.milestone || i.milestone === filter.milestone) &&
      (!q || `#${i.number} ${i.title} ${i.labels.join(' ')}`.toLowerCase().includes(q)));
  }, [work, filter]);

  const move = async (n: number, to: LaneId) => {
    const i = snap?.issues.find(x => x.number === n);
    if (!i || laneOf(i) === to) return;
    if (!token) { setSettings(true); return; }
    const m = moveTo(i, to);
    replace(applyMove(i, m));
    try { replace(await applyMoveRemote(i, m)); say(`#${n} → ${LANES.find(l => l.id === to)!.name}`); }
    catch (e) { replace(i); say(errText(e)); }
  };

  const open = snap?.issues.find(i => i.number === openNum) ?? null;
  const lanesToShow = filter.lane && filter.lane !== 'pax' ? LANES.filter(l => l.id === filter.lane) : LANES;
  const rate = rateInfo();

  return (
    <div className="pitwall">
      <header className="pw-top">
        <button type="button" className="pw-back" onClick={onBack} aria-label="Back to menu">‹ Menu</button>
        <div className="pw-title">
          <div className="pw-k">{REPO} · issues</div>
          <h1>Pit Wall</h1>
        </div>
        <div className="pw-status">
          <span className={`pw-live ${loadError ? 'off' : ''}`}><span className="pw-livedot" />{loadError ? 'Offline' : snap ? `Live · ${ago(snap.at)}` : 'Loading…'}</span>
          <button type="button" className="pw-icon" onClick={refresh} disabled={loading} aria-label="Refresh now">{loading ? '…' : '↻'}</button>
          <button type="button" className={`pw-icon ${token ? 'on' : ''}`} onClick={() => setSettings(true)} aria-label="Editing settings">{token ? '✎' : '🔒'}</button>
        </div>
      </header>

      {loadError && <div className="pw-banner">{loadError}</div>}

      <nav className="pw-strip" aria-label="Lanes">
        {[{ id: 'pax' as const, name: 'Needs Pax' }, ...LANES].map(l => (
          <button key={l.id} type="button" aria-pressed={filter.lane === l.id}
            className={`${l.id === 'pax' && counts.pax ? 'warn' : ''} ${l.id === 'ready' && snap && !counts.ready ? 'zero' : ''}`}
            onClick={() => setFilter(f => ({ ...f, lane: f.lane === l.id ? null : l.id }))}>
            <span className="pw-k">{l.name}</span>
            <span className="pw-n">{snap ? counts[l.id] : '–'}</span>
          </button>
        ))}
      </nav>

      <div className="pw-bar">
        <input type="search" placeholder="Search title, #number or label" value={filter.q} aria-label="Search tasks"
          onChange={e => setFilter(f => ({ ...f, q: e.target.value }))} />
        <select value={filter.milestone} aria-label="Phase" onChange={e => setFilter(f => ({ ...f, milestone: e.target.value }))}>
          <option value="">All phases</option>
          {milestones.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button type="button" className="pw-btn primary" onClick={() => (token ? setAdding('inbox') : setSettings(true))}>+ New task</button>
      </div>

      <div className="pw-lanes">
        <div className="pw-lanes-in" style={{ '--cols': lanesToShow.length } as React.CSSProperties}>
          {lanesToShow.map(l => {
            const list = sortForLane(l.id, shown.filter(i => laneOf(i) === l.id));
            const cap = (l.id === 'done' || l.id === 'backlog') && !expanded[l.id] ? COLLAPSED : Infinity;
            return (
              <section key={l.id} className={`pw-lane lane-${l.id} ${dragOver === l.id ? 'over' : ''}`}
                onDragOver={e => { if (token && dragNum.current !== null) { e.preventDefault(); setDragOver(l.id); } }}
                onDragLeave={() => setDragOver(d => (d === l.id ? null : d))}
                onDrop={e => { e.preventDefault(); setDragOver(null); const n = dragNum.current; dragNum.current = null; if (n !== null) move(n, l.id); }}>
                <div className="pw-lane-h">
                  <div><h2>{l.name}</h2><div className="pw-sub">{l.sub}</div></div>
                  <div className="pw-lane-r">
                    <span className="pw-num">{list.length}</span>
                    {l.id !== 'done' && l.id !== 'building' && (
                      <button type="button" className="pw-add" aria-label={`Add a task to ${l.name}`} onClick={() => (token ? setAdding(l.id) : setSettings(true))}>+</button>
                    )}
                  </div>
                </div>
                {!snap && !loadError && <div className="pw-empty">Loading from GitHub…</div>}
                {snap && list.length === 0 && (
                  <div className="pw-empty">{l.id === 'ready' ? 'Nothing ready. Hub has no queue.' : 'Nothing here.'}</div>
                )}
                {list.slice(0, cap).map(i => (
                  <Card key={i.number} issue={i} draggable={!!token}
                    onOpen={() => setOpenNum(i.number)}
                    onDragStart={() => { dragNum.current = i.number; }}
                    onDragEnd={() => { dragNum.current = null; setDragOver(null); }} />
                ))}
                {list.length > cap && (
                  <button type="button" className="pw-more" onClick={() => setExpanded(x => ({ ...x, [l.id]: true }))}>Show all {list.length} →</button>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {snap && (snap.pulls.length > 0 || snap.merged.length > 0) && (
        <section className="pw-shipped">
          <div className="pw-k">Pull requests</div>
          <ul>
            {snap.pulls.map(p => (
              <li key={p.number}><span className="pw-num open">#{p.number}</span><a href={p.url} target="_blank" rel="noreferrer">{p.title}</a><span className="pw-when">{p.draft ? 'draft' : 'open'}</span></li>
            ))}
            {snap.merged.slice(0, 8).map(p => (
              <li key={p.number}><span className="pw-num merged">#{p.number}</span><a href={p.url} target="_blank" rel="noreferrer">{p.title}</a><span className="pw-when">merged {shortDate(p.mergedAt!)}</span></li>
            ))}
          </ul>
        </section>
      )}

      <footer className="pw-foot">
        <span>Lanes are labels: next · ready · in progress · backlog. Closed = Done. "{NEEDS_PAX}" = Needs Pax.</span>
        {rate && <span>GitHub reads left this hour: {rate.remaining}/{rate.limit}</span>}
      </footer>

      {open && (
        <Detail key={open.number} issue={open} token={token} onClose={() => setOpenNum(null)}
          onMove={to => move(open.number, to)} onSaved={replace} say={say} onNeedToken={() => setSettings(true)} />
      )}
      {adding && <NewTask lane={adding} onClose={() => setAdding(null)} onCreated={i => { replace(i); setAdding(null); say(`Added #${i.number}`); }} say={say} />}
      {settings && <Settings token={token} onClose={() => setSettings(false)} onSave={t => { saveToken(t); setTokenState(t); }} />}
      {toast && <div className="pw-toast" role="status">{toast}</div>}
    </div>
  );
}

function Card({ issue: i, draggable, onOpen, onDragStart, onDragEnd }: { issue: PwIssue; draggable: boolean; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const labels = i.labels.filter(l => !LANE_LABELS.includes(l) && l !== NEEDS_PAX);
  const pax = needsPax(i);
  return (
    <button type="button" className={`pw-card ${pax ? 'pax' : ''}`} onClick={onOpen} draggable={draggable}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i.number)); onDragStart(); }}
      onDragEnd={onDragEnd}>
      <span className="pw-card-1">
        <span className="pw-num">#{i.number}</span>
        {pax && <span className="pw-chip pax">Needs Pax</span>}
        {i.labels.includes('bug') && <span className="pw-chip bug">bug</span>}
        <span className="pw-sp" />
        {i.prs.length > 0 && <span className="pw-chip pr">PR #{i.prs[0]}</span>}
        {i.comments > 0 && <span className="pw-meta">💬 {i.comments}</span>}
        {i.state === 'closed' && i.closedAt && <span className="pw-meta">{shortDate(i.closedAt)}</span>}
      </span>
      <span className="pw-card-t">{i.title}</span>
      {(labels.filter(l => l !== 'bug').length > 0 || i.milestone) && (
        <span className="pw-card-1">
          {labels.filter(l => l !== 'bug').slice(0, 3).map(l => <span key={l} className="pw-chip">{l}</span>)}
          {i.milestone && <span className="pw-meta pw-ms">{i.milestone.split(' —')[0]}</span>}
        </span>
      )}
    </button>
  );
}

function Detail({ issue: i, token, onClose, onMove, onSaved, say, onNeedToken }: {
  issue: PwIssue; token: string | null; onClose: () => void; onMove: (to: LaneId) => void;
  onSaved: (i: PwIssue) => void; say: (t: string) => void; onNeedToken: () => void;
}) {
  const [title, setTitle] = useState(i.title);
  const [body, setBody] = useState(i.body);
  const [editingBody, setEditingBody] = useState(false);
  const [comments, setComments] = useState<PwComment[] | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const lane = laneOf(i);

  useEffect(() => { loadComments(i.number).then(setComments).catch(() => setComments([])); }, [i.number, i.comments]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  const save = async (patch: Parameters<typeof updateIssue>[1], done: string) => {
    if (!token) { onNeedToken(); return; }
    setBusy(true);
    try { onSaved(await updateIssue(i.number, patch)); say(done); return true; }
    catch (e) { say(errText(e)); return false; }
    finally { setBusy(false); }
  };
  const togglePax = () => save({ labels: needsPax(i) ? i.labels.filter(l => l !== NEEDS_PAX) : [...i.labels, NEEDS_PAX] }, needsPax(i) ? 'Cleared Needs Pax' : 'Flagged for Pax');
  const sendReply = async () => {
    if (!token) { onNeedToken(); return; }
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await addComment(i.number, reply.trim());
      setReply('');
      setComments(await loadComments(i.number));
      onSaved({ ...i, comments: i.comments + 1 });
      say('Comment posted');
    } catch (e) { say(errText(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="pw-scrim" onClick={onClose}>
      <aside className="pw-drawer" role="dialog" aria-modal="true" aria-label={`Issue #${i.number}`} onClick={e => e.stopPropagation()}>
        <div className="pw-drawer-h">
          <a className="pw-num" href={i.url} target="_blank" rel="noreferrer">#{i.number} on GitHub ↗</a>
          <button type="button" className="pw-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <textarea className="pw-title-edit" value={title} rows={2} readOnly={!token} aria-label="Title"
          onChange={e => setTitle(e.target.value)}
          onBlur={() => { if (title.trim() && title.trim() !== i.title) save({ title: title.trim() }, 'Title saved'); }} />

        <div className="pw-k">Lane</div>
        <div className="pw-seg" role="group" aria-label="Move to lane">
          {LANES.map(l => (
            <button key={l.id} type="button" aria-pressed={lane === l.id} className={`lane-${l.id}`} disabled={busy}
              onClick={() => onMove(l.id)}>{l.name}</button>
          ))}
        </div>

        <div className="pw-row">
          <button type="button" className={`pw-btn ${needsPax(i) ? 'warn' : ''}`} disabled={busy || i.state === 'closed'} onClick={togglePax}>
            {needsPax(i) ? '✓ Needs Pax' : 'Flag: needs Pax'}
          </button>
          <span className="pw-meta">{[i.milestone, ...i.labels.filter(l => !LANE_LABELS.includes(l) && l !== NEEDS_PAX)].filter(Boolean).join(' · ')}</span>
        </div>

        <div className="pw-row spread">
          <div className="pw-k">Notes</div>
          {token && !editingBody && <button type="button" className="pw-link" onClick={() => setEditingBody(true)}>Edit</button>}
        </div>
        {editingBody ? (
          <>
            <textarea className="pw-body-edit" value={body} rows={12} onChange={e => setBody(e.target.value)} aria-label="Notes" />
            <div className="pw-row">
              <button type="button" className="pw-btn primary" disabled={busy} onClick={async () => { if (await save({ body }, 'Notes saved')) setEditingBody(false); }}>Save notes</button>
              <button type="button" className="pw-btn" onClick={() => { setBody(i.body); setEditingBody(false); }}>Cancel</button>
            </div>
          </>
        ) : (
          <div className="pw-body">{i.body.trim() || <span className="pw-meta">No notes yet.</span>}</div>
        )}

        <div className="pw-k">Comments {comments ? `(${comments.length})` : ''}</div>
        <div className="pw-comments">
          {comments === null && <span className="pw-meta">Loading…</span>}
          {comments?.map(c => (
            <div key={c.id} className="pw-comment">
              <div className="pw-meta"><b>{c.author}</b> · {shortDate(c.at)}</div>
              <div className="pw-body">{c.body}</div>
            </div>
          ))}
        </div>
        <textarea className="pw-reply" rows={3} placeholder={token ? 'Add a comment. Pit and Hub read these.' : 'Add a token in settings to comment.'}
          value={reply} onChange={e => setReply(e.target.value)} disabled={!token || busy} aria-label="New comment" />
        <div className="pw-row">
          <button type="button" className="pw-btn primary" disabled={!token || busy || !reply.trim()} onClick={sendReply}>Comment</button>
        </div>
      </aside>
    </div>
  );
}

function NewTask({ lane, onClose, onCreated, say }: { lane: LaneId; onClose: () => void; onCreated: (i: PwIssue) => void; say: (t: string) => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [to, setTo] = useState<LaneId>(lane === 'done' || lane === 'building' ? 'inbox' : lane);
  const [pax, setPax] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const target = LANES.find(l => l.id === to)!;
      const labels = [target.label, pax ? NEEDS_PAX : undefined].filter((l): l is string => !!l);
      onCreated(await createIssue(title.trim(), body.trim() ? `${body.trim()}\n\n_Added from the Pit Wall._` : '_Added from the Pit Wall._', labels));
    } catch (err) { say(errText(err)); setBusy(false); }
  };
  return (
    <div className="pw-scrim" onClick={onClose}>
      <form className="pw-modal" onSubmit={submit} onClick={e => e.stopPropagation()} aria-label="New task">
        <h2>New task</h2>
        <input id="pw-new-title" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs doing?" aria-label="Title" />
        <textarea id="pw-new-body" value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="Notes (optional). Pit fills in the rest." aria-label="Notes" />
        <div className="pw-k">Lane</div>
        <div className="pw-seg" role="group" aria-label="Lane">
          {LANES.filter(l => l.id !== 'done' && l.id !== 'building').map(l => (
            <button key={l.id} type="button" aria-pressed={to === l.id} className={`lane-${l.id}`} onClick={() => setTo(l.id)}>{l.name}</button>
          ))}
        </div>
        <label className="pw-check"><input type="checkbox" checked={pax} onChange={e => setPax(e.target.checked)} /> Needs Pax's call</label>
        <div className="pw-row">
          <button type="submit" className="pw-btn primary" disabled={busy || !title.trim()}>{busy ? 'Adding…' : 'Add task'}</button>
          <button type="button" className="pw-btn" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function Settings({ token, onClose, onSave }: { token: string | null; onClose: () => void; onSave: (t: string | null) => void }) {
  const [value, setValue] = useState('');
  const [state, setState] = useState<{ busy?: boolean; ok?: string; err?: string }>({});
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = value.trim();
    if (!t) return;
    setState({ busy: true });
    try { const login = await checkToken(t); onSave(t); setValue(''); setState({ ok: `Editing as ${login} on this device.` }); }
    catch (err) { setState({ err: errText(err) }); }
  };
  return (
    <div className="pw-scrim" onClick={onClose}>
      <form className="pw-modal" onSubmit={submit} onClick={e => e.stopPropagation()} aria-label="Editing settings">
        <h2>Edit from this device</h2>
        <p className="pw-meta">Watching needs nothing. To add, move and edit tasks, paste a GitHub token. It stays in this browser only.</p>
        <ol className="pw-steps">
          <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">GitHub → new fine-grained token</a>.</li>
          <li>Repository access: <b>Only select repositories</b> → {REPO}.</li>
          <li>Permissions → Repository → <b>Issues: Read and write</b>. Nothing else.</li>
          <li>Generate, copy, paste below.</li>
        </ol>
        <input id="pw-token" type="password" autoComplete="off" spellCheck={false} value={value} onChange={e => setValue(e.target.value)}
          placeholder={token ? 'A token is saved. Paste a new one to replace it' : 'github_pat_…'} aria-label="GitHub token" />
        {state.err && <div className="pw-err">{state.err}</div>}
        {state.ok && <div className="pw-ok">{state.ok}</div>}
        <div className="pw-row">
          <button type="submit" className="pw-btn primary" disabled={state.busy || !value.trim()}>{state.busy ? 'Checking…' : 'Save token'}</button>
          {token && <button type="button" className="pw-btn danger" onClick={() => { onSave(null); setState({ ok: 'Token removed from this device.' }); }}>Remove token</button>}
          <button type="button" className="pw-btn" onClick={onClose}>Done</button>
        </div>
      </form>
    </div>
  );
}
