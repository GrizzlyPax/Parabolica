// Credits (moved out of the World Deck, Pax Oct 8): asset attribution. The
// icons are game-icons.net, CC BY 3.0, which requires visible credit; this
// list is generated from the icon registry, so it stays complete.
import { GameIcon } from './icons/GameIcon';
import { ICONS, ICON_LICENSE, iconCredits } from './icons/registry';
import './RunSetup.css';
import './Glossary.css';

export default function Credits({ onBack }: { onBack: () => void }) {
  return (
    <div className="run-setup credits">
      <header className="rs-top">
        <div className="rs-title-block">
          <button type="button" className="rs-back" onClick={onBack}>← Menu</button>
          <h1 className="rs-title">Credits</h1>
          <span className="rs-sub">The people whose work is in the game.</span>
        </div>
      </header>
      <section className="rs-row">
        <div className="rs-row-head"><span className="rs-k">Icons <span className="gl-count">{ICONS.length}</span></span></div>
        <p className="gl-desc">
          Icons by the <a href={ICON_LICENSE.source} target="_blank" rel="noreferrer">game-icons.net</a> contributors below,
          licensed under <a href={ICON_LICENSE.url} target="_blank" rel="noreferrer">{ICON_LICENSE.name}</a>.
        </p>
        <div className="gl-list">
          {iconCredits().map(c => (
            <div key={c.author} className="gl-credit">
              <span className="gl-credit-author">{c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.name}</a> : c.name}</span>
              <span className="gl-credit-icons">
                {c.icons.map(id => (
                  <span key={id} className="gl-credit-icon" title={id}><GameIcon name={id} size={24} /><code>{id}</code></span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
