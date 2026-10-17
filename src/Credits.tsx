// Credits (moved out of the World Deck, Pax Oct 8; on the race program since
// #778): asset attribution. The icons are game-icons.net, CC BY 3.0, which
// requires visible credit; this list is generated from the icon registry, so
// it stays complete.
import { GameIcon } from './icons/GameIcon';
import { ICONS, ICON_LICENSE, iconCredits } from './icons/registry';
import { Bunting, Chequer, ProgramLine, StepTheme } from './look/Look';
import { programNo } from './MainMenu';
import { version } from '../package.json';
import './Glossary.css';

export default function Credits({ onBack }: { onBack: () => void }) {
  return (
    <StepTheme step="nationals" className="ace-page narrow credits">
      <Bunting />
      <ProgramLine left="Credits" right={`No. ${programNo(version)} · 10¢`} />
      <div className="rh-row"><button type="button" className="ace-link" onClick={onBack}>Menu</button></div>
      <h1 className="ace-h1">Credits</h1>
      <Chequer />
      <p className="ace-sub">The people whose work is in the game.</p>
      <section className="credits-icons">
        <span className="ace-k">Icons · {ICONS.length}</span>
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
    </StepTheme>
  );
}
