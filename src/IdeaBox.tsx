// The idea inbox (World Deck capture): a floating idea button on every screen. Type or
// dictate a few sentences, tag what kind of thing it is, and either send it
// straight to GitHub as an `idea` issue (prefilled; you press Submit there) or
// keep it in this browser's inbox to send later. The screen you were on, the
// race seed and the track ride along as context so an agent can act on it.
import { useEffect, useRef, useState } from 'react';
import { GameIcon } from './icons/GameIcon';
import './IdeaBox.css';

export interface IdeaContext {
  /** Where the user was: 'world-deck', 'quick-race', 'watch', 'league', … */
  screen: string;
  seed?: number | null;
  track?: string;
  extra?: string;
}

export interface Idea {
  id: string;
  text: string;
  kind: IdeaKind;
  context: IdeaContext;
  at: number;
  sent?: boolean;
}

export type IdeaKind = 'tag' | 'team' | 'track' | 'card' | 'rule' | 'commentary' | 'bug' | 'other';
const KINDS: { id: IdeaKind; label: string; labels: string[] }[] = [
  { id: 'tag', label: 'Tag', labels: ['idea', 'world-deck'] },
  { id: 'team', label: 'Team', labels: ['idea', 'world-deck'] },
  { id: 'track', label: 'Track', labels: ['idea', 'world-deck'] },
  { id: 'card', label: 'Rule card', labels: ['idea', 'world-deck'] },
  { id: 'rule', label: 'Rule / mechanic', labels: ['idea', 'balance'] },
  { id: 'commentary', label: 'Commentary', labels: ['idea', 'world-deck'] },
  { id: 'bug', label: 'Bug', labels: ['bug'] },
  { id: 'other', label: 'Other', labels: ['idea'] },
];

const REPO = 'GrizzlyPax/Parabolica';
export const INBOX_KEY = 'parabolica.ideas';

export function loadIdeas(): Idea[] { try { return JSON.parse(localStorage.getItem(INBOX_KEY) ?? '[]'); } catch { return []; } }
export function saveIdeas(ideas: Idea[]) { try { localStorage.setItem(INBOX_KEY, JSON.stringify(ideas)); } catch { /* private window */ } }

/** The GitHub "new issue" URL, prefilled. Opens in a tab; the user submits. */
export function issueUrl(idea: Idea): string {
  const kind = KINDS.find(k => k.id === idea.kind) ?? KINDS[KINDS.length - 1];
  const first = idea.text.trim().split(/\n|\. /)[0].slice(0, 70);
  const title = `${idea.kind === 'bug' ? 'Bug' : 'Idea'}: ${first}`;
  const ctx = [`screen: ${idea.context.screen}`, idea.context.track ? `track: ${idea.context.track}` : '', idea.context.seed ? `seed: \`${idea.context.seed}\`` : '', idea.context.extra ?? ''].filter(Boolean).join(' · ');
  const body = `${idea.text.trim()}\n\n---\n**Kind:** ${kind.label}\n**Context:** ${ctx}\n**Captured:** ${new Date(idea.at).toLocaleString()} from the game's idea box.\n\nTriage: turn this into a World Deck record (docs/WORLD_DECK.md) or an engine task, link it, and close this.`;
  const p = new URLSearchParams({ title, body, labels: kind.labels.join(',') });
  return `https://github.com/${REPO}/issues/new?${p.toString()}`;
}

/** One line per idea, for pasting a batch to an agent. */
export function ideasAsPrompt(ideas: Idea[]): string {
  return `These are ideas captured in Parabolica's idea box. For each: decide whether it is a World Deck record (docs/WORLD_DECK.md), an engine task, or a bug; build the small ones, file the big ones as issues, and report what you did.\n\n` +
    ideas.map((i, n) => `${n + 1}. [${i.kind}] ${i.text.trim()}  (${i.context.screen}${i.context.track ? `, ${i.context.track}` : ''}${i.context.seed ? `, seed ${i.context.seed}` : ''})`).join('\n');
}

type SpeechRecognitionLike = { start(): void; stop(): void; lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
function getSpeech(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function IdeaBox({ context }: { context: IdeaContext }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<IdeaKind>('other');
  const [count, setCount] = useState(() => loadIdeas().filter(i => !i.sent).length);
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const canSpeak = !!getSpeech();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'i' && (e.metaKey || e.ctrlKey) && e.shiftKey) { e.preventDefault(); setOpen(o => !o); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 1800); };
  const make = (): Idea => ({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, text, kind, context, at: Date.now() });
  const keep = () => {
    if (!text.trim()) return;
    const ideas = [make(), ...loadIdeas()]; saveIdeas(ideas); setCount(ideas.filter(i => !i.sent).length);
    setText(''); say('Kept in your inbox');
  };
  const send = () => {
    if (!text.trim()) return;
    const idea = { ...make(), sent: true };
    saveIdeas([idea, ...loadIdeas()]);
    window.open(issueUrl(idea), '_blank', 'noopener');
    setText(''); say('Opened on GitHub — press Submit there (a copy is in your inbox)');
  };
  const dictate = () => {
    const S = getSpeech(); if (!S) return;
    if (listening) { rec.current?.stop(); return; }
    const r = new S(); r.lang = 'en-US'; r.continuous = true; r.interimResults = false;
    r.onresult = e => { const chunk = Array.from(e.results as ArrayLike<ArrayLike<{ transcript: string }>>).map(x => x[0].transcript).join(' '); setText(t => (t ? t + ' ' : '') + chunk.trim()); };
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };

  return (
    <>
      <button type="button" className="idea-fab" onClick={() => setOpen(o => !o)} title="Capture an idea (⌘⇧I)" aria-label="Capture an idea">
        <GameIcon name="ui.idea" size={22} />{count > 0 && <span className="idea-fab-count">{count}</span>}
      </button>
      {toast && <div className="idea-toast">{toast}</div>}
      {open && (
        <div className="idea-panel" role="dialog" aria-label="Idea box">
          <div className="idea-head">
            <span className="rs-k">Idea box</span>
            <span className="idea-ctx">{context.screen}{context.track ? ` · ${context.track}` : ''}{context.seed ? ` · seed ${context.seed}` : ''}</span>
            <button type="button" className="idea-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <textarea
            className="idea-text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="A few sentences is plenty. “A car tag that's faster when it's raining but the pit crew hates it.” — the seed and track come along."
            rows={4}
            autoFocus
          />
          <div className="idea-kinds">
            {KINDS.map(k => <button key={k.id} type="button" className={`idea-kind ${kind === k.id ? 'on' : ''}`} onClick={() => setKind(k.id)}>{k.label}</button>)}
          </div>
          <div className="idea-actions">
            {canSpeak && <button type="button" className={`rs-btn rs-btn-ghost ${listening ? 'idea-listening' : ''}`} onClick={dictate}>{listening ? '● Listening… tap to stop' : <><GameIcon name="ui.dictate" size={16} /> Dictate</>}</button>}
            <span className="idea-spacer" />
            <button type="button" className="rs-btn rs-btn-ghost" disabled={!text.trim()} onClick={keep}>Keep for later</button>
            <button type="button" className="rs-btn rs-btn-primary" disabled={!text.trim()} onClick={send}>Send to GitHub →</button>
          </div>
          <div className="idea-foot">Send opens a prefilled issue with the <code>idea</code> label; you press Submit. The repo is private, so that tab needs to be signed in to GitHub — if it shows a 404, sign in and use <em>resend</em> from World Deck → Inbox. Kept ideas live there too.</div>
        </div>
      )}
    </>
  );
}
