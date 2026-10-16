// The main menu as the program's cover (#705; the locked look): bunting, the
// Official Program line, the sash as the title, the racer, a chequer, then the
// contents rows; on a desktop the cover and the contents sit side by side
// (#722, desktop first). Wears Americana (the menus' theme). The game's name on the
// sash says Ace America (#701). On the old domain it offers to move your
// save to playaceamerica.com (storage/carry.ts).
import { AceButton, Bunting, Chequer, ProgramLine, Racer, Sash, StepTheme } from './look/Look';
import './MainMenu.css';
import { carryLink, onOldDomain } from './storage/carry';
import { version } from '../package.json';

/** The saved Season, if there is one (one save slot). */
export interface SeasonCardSummary {
  name: string;
  /** 0-based round in progress. */
  round: number;
  total: number;
  finished: boolean;
}

interface MainMenuProps {
  onSingleRace: () => void;
  /** Play a Season: continue the saved one, or League Setup. */
  onSeason: () => void;
  season?: SeasonCardSummary | null;
  onCompendium: () => void;
  onGlossary: () => void;
  onCredits: () => void;
}

/** The cover's Official Program number: the version's digits after the major ("0.7.4" → 74). */
export function programNo(v: string): string {
  return v.split('.').slice(1).join('') || '1';
}

function MainMenu({ onSingleRace, onSeason, season, onCompendium, onGlossary, onCredits }: MainMenuProps) {
  const live = season && !season.finished ? season : null;
  return (
    <StepTheme step="nationals" className="ace-page mm">
      <Bunting />
      {onOldDomain() && (
        <div className="ace-strip mm-moved" role="status">
          <span><b>Ace America has moved</b> to playaceamerica.com. Your save stays on this address unless you bring it.</span>
          <a className="ace-btn" href={carryLink()}>Move my save</a>
        </div>
      )}
      <ProgramLine right={`No. ${programNo(version)} · 10¢`} />
      <div className="mm-body">
      <header className="mm-cover">
        <Sash text="Ace America" title="Ace America" className="mm-sash" fontSize={23} />
        <Racer number={16} width={210} className="mm-racer" />
        <Chequer tall />
        <span className="ace-where">{live ? `${live.name} · race ${live.round + 1} of ${live.total}` : 'Race day'}</span>
      </header>

      <nav className="ace-menu mm-menu" aria-label="Main menu">
        <span className="ace-k mm-contents">Contents</span>
        <button type="button" className="ace-mi on" onClick={onSeason}>
          <span>{live ? 'Continue' : 'New season'}</span>
          <small>{live ? `${live.name} · race ${live.round + 1}` : 'Pick your state, name your garage, then climb'}</small>
        </button>
        <button type="button" className="ace-mi" onClick={onSingleRace}><span>Quick race</span><small>One random race, right now</small></button>
        <button type="button" className="ace-mi" onClick={onGlossary}><span>The World Deck</span><small>Every card, team, track and weather</small></button>
        <button type="button" className="ace-mi" onClick={onCompendium}><span>Race Control</span><small>The lab, seeded and replicable</small></button>
      </nav>
      </div>

      <footer className="mm-foot">
        <span className="ace-note">Somebody is always watching. Race well.</span>
        <span className="mm-foot-line">
          <span>v{version} · {new Date(__BUILD_TIME__).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          <AceButton tone="ghost" onClick={onCredits} className="mm-credits">Credits</AceButton>
          <span>playaceamerica.com</span>
        </span>
      </footer>
    </StepTheme>
  );
}

export default MainMenu;
