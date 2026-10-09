// The pack reveal (#320, mock-up approved by Pax Oct 8: "bigger"). Full screen
// over the Paddock: the sealed pack names its deck and tier ("Base deck ·
// Uncommon") but never its metal or slot; the build-up grows with the tier;
// the card arrives face down and flips to its Almanac Plate face. Rays stay
// white until the card turns, then take its metal. A tap skips to the card.
//
// Keep 1 of 3 (#533), picked right here (#552, Pax Oct 10): the pack's three
// cards come out together and flip side by side. Tap one to lift it, then
// Keep. Gear goes to your locker; a trait asks once who gets it (valid targets
// only). The other two go back.
//
// Display only: the cards are already dealt by the seed (pendingPack), so a
// refresh just brings the pack back sealed.
import { useEffect, useRef, useState } from 'react';
import { GameIcon } from '../../icons/GameIcon';
import { CardFace } from '../../cards/CardFace';
import type { Card } from '../../cards/types';
import type { PackTier } from '../pack';

const TIER_LABEL: Record<PackTier, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };

export type HolderKey = string; // a driver id as text, 'car' or 'team' (Paddock's HolderKey)

interface Props {
  cards: Card[];
  tier: PackTier;
  /** Where a picked trait can go (its own target type only). */
  traitTargets: (card: Card) => { key: HolderKey; label: string }[];
  /** Keep this card: gear to the locker; a trait onto `target`. */
  onKeep: (card: Card, target?: HolderKey) => void;
  /** Close without picking (the pack stays sealed). */
  onClose: () => void;
}

const METAL_RANK = { bronze: 0, silver: 1, gold: 2, iridium: 3 } as const;

export default function PackReveal({ cards, tier, traitTargets, onKeep, onClose }: Props) {
  const [pick, setPick] = useState<string | null>(null);
  const [askTrait, setAskTrait] = useState(false);
  // The rays take the best metal in the pack.
  const card = cards.reduce((best, c) => ((METAL_RANK[c.rarity ?? 'bronze'] ?? 0) > (METAL_RANK[best.rarity ?? 'bronze'] ?? 0) ? c : best), cards[0]);
  const stage = useRef<HTMLDivElement>(null);
  const pack = useRef<HTMLDivElement>(null);
  const cardBox = useRef<HTMLDivElement>(null);
  const rays = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const sheen = useRef<HTMLDivElement>(null);
  const [faceUp, setFaceUp] = useState(false);
  const [slowFlip, setSlowFlip] = useState(false);
  const [metal, setMetal] = useState(false);
  const [dim, setDim] = useState(0);
  const [done, setDone] = useState(false);
  const run = useRef<{ anims: Animation[]; timers: number[] }>({ anims: [], timers: [] });

  const finish = () => {
    run.current.anims.forEach(a => a.cancel());
    run.current.timers.forEach(t => clearTimeout(t));
    run.current = { anims: [], timers: [] };
    if (pack.current) pack.current.style.opacity = '0';
    if (cardBox.current) cardBox.current.style.opacity = '1';
    if (rays.current) rays.current.style.opacity = tier === 'rare' || tier === 'legendary' ? '0.75' : '0';
    setSlowFlip(false); setFaceUp(true); setMetal(true); setDim(tier === 'legendary' ? 0.55 : 0); setDone(true);
    if ((tier === 'rare' || tier === 'legendary') && rays.current?.animate) {
      run.current.anims.push(rays.current.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 24000, iterations: Infinity }));
    }
  };

  useEffect(() => {
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const p = pack.current, c = cardBox.current, r = rays.current, f = flash.current, s = sheen.current;
    if (reduce || !p || !c || !r || !f || !s || !p.animate) { finish(); return; }
    const anims = run.current.anims, timers = run.current.timers;
    const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
    const anim = (el: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions) => { anims.push(el.animate(frames, { fill: 'forwards', ...opts })); };
    const shake = (n: number, amp: number, dur: number) => anim(p, Array.from({ length: n * 2 + 1 }, (_, i) => ({ transform: `rotate(${i === n * 2 ? 0 : (i % 2 ? -1 : 1) * amp * (1 + i / (n * 2))}deg)` })), { duration: dur, easing: 'ease-in-out' });
    const pop = (t: number, zoom = false) => at(t, () => {
      anim(p, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.14)', opacity: 1, offset: 0.4 }, { transform: 'scale(0.2)', opacity: 0 }], { duration: 280, easing: 'ease-in' });
      anim(c, zoom
        ? [{ opacity: 0, transform: 'scale(0.55)' }, { opacity: 1, transform: 'scale(1.1)', offset: 0.7 }, { opacity: 1, transform: 'scale(1)' }]
        : [{ opacity: 0, transform: 'translateY(30px) scale(0.9)' }, { opacity: 1, transform: 'none' }], { duration: zoom ? 520 : 280, easing: 'ease-out', delay: 120 });
    });
    const flip = (t: number, slow = false) => at(t, () => { setSlowFlip(slow); setFaceUp(true); setMetal(true); });
    const end = (t: number) => at(t, () => setDone(true));
    const spinRays = (t: number, from: number) => at(t, () => anim(r, [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${from + 360}deg)` }], { duration: 22000, iterations: Infinity }));

    if (tier === 'common') { pop(80); flip(420); end(860); }
    if (tier === 'uncommon') { shake(2, 5, 400); pop(420); flip(760); end(1220); }
    if (tier === 'rare') {
      shake(3, 7, 760);
      at(760, () => shake(2, 10, 420));
      anim(r, [{ opacity: 0, transform: 'rotate(0deg) scale(0.6)' }, { opacity: 0.75, transform: 'rotate(50deg) scale(1)' }], { duration: 1100, delay: 300 });
      pop(1200); flip(1560, true); end(2500); spinRays(1450, 50);
    }
    if (tier === 'legendary') {
      setDim(0.75);
      [0, 450, 820, 1110].forEach((d, i) => anim(p, [
        { transform: 'scale(1)', boxShadow: '0 0 0 0 transparent' },
        { transform: `scale(${1.05 + i * 0.03})`, boxShadow: `0 0 ${24 + i * 18}px ${4 + i * 4}px color-mix(in srgb, var(--pw-text-1) 45%, transparent)` },
        { transform: 'scale(1)', boxShadow: '0 0 0 0 transparent' },
      ], { duration: 300, delay: d + 250, fill: 'none' }));
      anim(r, [{ opacity: 0, transform: 'rotate(0deg) scale(0.5)' }, { opacity: 0.9, transform: 'rotate(160deg) scale(1.15)' }], { duration: 1700, delay: 1100, easing: 'ease-in' });
      at(1750, () => shake(5, 10, 760));
      at(2550, () => anim(f, [{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0.1 }, { opacity: 0.95 }, { opacity: 0 }], { duration: 560 }));
      pop(2700, true);
      flip(3250, true);
      at(2800, () => setDim(0.55));
      spinRays(2800, 160);
      at(4250, () => anim(s, [{ transform: 'translateX(-120%)' }, { transform: 'translateX(120%)' }], { duration: 1200, easing: 'ease-in-out' }));
      end(4300);
    }
    return () => { run.current.anims.forEach(a => a.cancel()); run.current.timers.forEach(t => clearTimeout(t)); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = () => { if (!done) finish(); };
  const chosen = cards.find(c => c.id === pick) ?? null;

  return (
    <div
      ref={stage}
      className={`pr ${done ? 'done' : ''} ${metal ? `pr-metal-${card.rarity ?? 'none'}` : ''}`}
      role="dialog"
      aria-label={`${TIER_LABEL[tier]} pack`}
      onClick={skip}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !done) { e.preventDefault(); finish(); } }}
      tabIndex={0}
    >
      <div className="pr-dim" style={{ opacity: dim }} />
      <div className="pr-rays" ref={rays} />
      <div className="pr-hud"><span className="rs-k">Base deck</span><b>{TIER_LABEL[tier]} pack</b></div>
      <div className="pr-pack" ref={pack}>
        <div className="pr-plate"><GameIcon name="season.pack" size={34} /><b>{TIER_LABEL[tier].toUpperCase()}</b><span>Base deck</span></div>
      </div>
      <div className={`pr-card ${slowFlip ? 'slow' : ''}`} ref={cardBox}>
        <div className="pr-three" role="group" aria-label="Pick one of three">
          {cards.map(c => (
            <button
              key={c.id}
              type="button"
              className={`pr-pick ${pick === c.id ? 'on' : pick ? 'off' : ''}`}
              disabled={!done}
              aria-pressed={pick === c.id}
              onClick={e => { e.stopPropagation(); setPick(c.id); setAskTrait(false); }}
            >
              <CardFace card={c} size="full" className="pr-three-card" faceDown={!faceUp} flippable={false} />
            </button>
          ))}
        </div>
        <div className="pr-sheen" ref={sheen} />
      </div>
      <div className="pr-flash" ref={flash} />
      {!done && <span className="pr-skip">Tap to skip</span>}
      <div className="pr-cta" onClick={e => e.stopPropagation()}>
        {askTrait && chosen ? (
          <div className="pr-ask" role="group" aria-label="Who gets the trait">
            <span className="rs-k">{chosen.name} · trait</span>
            <b>Who gets it? It stays for good.</b>
            <span className="pr-ask-btns">
              {traitTargets(chosen).map(t => <button key={t.key} type="button" className="rs-btn" onClick={() => onKeep(chosen, t.key)}>{t.label}</button>)}
            </span>
            <button type="button" className="rs-link" onClick={() => setAskTrait(false)}>Back to the three</button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="rs-btn rs-btn-primary"
              disabled={!done || !chosen}
              onClick={() => { if (!chosen) return; if (chosen.kind === 'trait') setAskTrait(true); else onKeep(chosen); }}
            >{chosen ? `Keep ${chosen.name}` : 'Tap a card to pick it'}</button>
            <span className="rs-hint">{chosen ? (chosen.kind === 'trait' ? 'A trait goes on for good; next you choose who gets it.' : 'Gear goes to your locker; equip it from the Team table any time.') : 'Keep one of three. The other two go back.'} <button type="button" className="rs-link" onClick={onClose}>Later</button></span>
          </>
        )}
      </div>
    </div>
  );
}
