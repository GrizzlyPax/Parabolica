// Race Control → Style (#705): every component of the race program in every
// step theme, side by side, so Hub copies and never guesses. Locals · State
// (pick a state) · Nationals. Pure display; nothing here touches the sim.
import { useState, type ReactNode } from 'react';
import { AceButton, AceCard, Bunting, CarCard, Chequer, Confetti, Level, Parcel, ParcelStrip, Pennant, ProgramLine, Racer, Rosette, Roundel, Sash, Stamp, StateBar, StepTheme, TitleRibbon, Wheel } from '../look/Look';
import { STATE_CODES, STEPS, stateLook, type Step } from '../look/step';
import { placeById } from '../data/states';
import { GradeCell, STAT_ABBR } from '../season/ui/RosterTable';
import './StyleTab.css';

const SHOWN: Step[] = ['locals', 'state', 'nationals'];
const TOKENS = ['ground', 'paper', 'ink', 'accent', 'accent-ink', 'navy-2', 'gold', 'sash-edge', 'sash-ink', 'wheel', 'btn', 'btn-ink', 'muted', 'hair'];
const TITLE: Record<Step, string> = { locals: 'Ace Toledo', state: 'Ace Ohio', nationals: 'Ace America', globals: 'Ace Earth', galacticals: 'Ace Universe' };

/** One component in the three themes. */
function Row({ title, note, children }: { title: string; note?: string; children: (step: Step) => ReactNode }) {
  return (
    <section className="st-row">
      <div className="st-row-head"><h2 className="ace-h2">{title}</h2>{note && <p className="ace-sub">{note}</p>}</div>
      <div className="st-cols">{SHOWN.map(step => <div key={step} className="st-col">{children(step)}</div>)}</div>
    </section>
  );
}

export function StyleTab() {
  const [code, setCode] = useState('OH');
  const state = stateLook(code);
  const themed = (step: Step, children: ReactNode, cls = '') => (
    <StepTheme step={step} state={state} className={`st-pane ${cls}`.trim()}>
      <span className="st-pane-k">{STEPS.find(s => s.id === step)!.name}{step === 'state' ? ` · ${state.name}` : ''}</span>
      {children}
    </StepTheme>
  );
  return (
    <div className="st">
      <div className="st-intro">
        <p className="ace-sub">The race program (the locked look, Oct 10): red, white and blue first, gold the highlight; a navy ground, cream panels; one theme per step. Components read <code>--ace-*</code> tokens (<code>src/look/tokens.css</code>); a screen wears a step with <code>&lt;StepTheme step state?&gt;</code> (<code>src/look/Look.tsx</code>). Guide: <code>docs/LOOK.md</code>.</p>
        <label className="st-pick">State for the middle column
          <select value={code} onChange={e => setCode(e.target.value)}>{STATE_CODES.map(c => <option key={c} value={c}>{placeById(c)?.name ?? c}{placeById(c)?.look ? '' : ' (default look)'}</option>)}</select>
        </label>
      </div>

      <Row title="Tokens" note="The roles every component reads. Locals re-point them to black and white; a state supplies --ace-state-* (primary · secondary · accent · ink from inkFor) and the tokens take them as accents only.">
        {step => themed(step, (
          <div className="st-tokens">{TOKENS.map(t => <span key={t} className="st-token"><i style={{ background: `var(--ace-${t})` }} /><code>--ace-{t}</code></span>)}</div>
        ))}
      </Row>

      <Row title="Type" note="Alfa Slab One for display · Playball for script (the sash, ribbons) · Oswald condensed for labels and buttons · Old Standard TT for body · Special Elite for numbers and stamps. Stored with the app (src/look/fonts.ts).">
        {step => themed(step, (
          <div className="st-type">
            <span className="ace-logo">Ace</span>
            <span className="ace-h1">The road to Ace America</span>
            <span className="ace-script" style={{ fontSize: 26 }}>Ace Ohio</span>
            <span className="ace-cond" style={{ fontSize: 15, letterSpacing: '.14em', textTransform: 'uppercase' }}>Locals · going for Ace Toledo</span>
            <span>Body: Somebody is always watching. <i>Race well.</i></span>
            <span className="ace-mono">No. 51 · 10¢ · LAP 9 / 16</span>
            <span className="ace-k">A label · the K</span>
          </div>
        ))}
      </Row>

      <Row title="The sash" note="It IS the title. One centre curve: the band and pinstripes are offsets of it, a gold wheel sits on it at each end, and the words are set straight across its middle and shrink to fit between the wheels (src/look/sash.ts). Any width; the state colours its edge and ink.">
        {step => themed(step, (
          <div className="st-stack">
            <Sash text={TITLE[step]} />
            <Sash text="Ace Fredericksburg" />
            <Sash text={TITLE[step]} className="small" />
            <Sash text="Kettle Street Garage" className="wide" fontSize={18} />
          </div>
        ))}
      </Row>

      <Row title="The pageant: rosettes, the drape, confetti" note="A rosette per title in its step's look, over its ribbon (the honours); the title moment's sash lands askew, once; drawn confetti in the bunting's colours falls through whatever box it sits in.">
        {step => themed(step, (
          <div className="st-stack">
            <div className="ace-honours">
              <span className="ace-honour"><Rosette step="locals" /><TitleRibbon step="locals">Ace Toledo</TitleRibbon></span>
              <span className="ace-honour"><Rosette step="state" state={state} /><TitleRibbon step="state" state={state}>Ace {state.name}</TitleRibbon></span>
              <span className="ace-honour"><Rosette step="nationals" /><TitleRibbon step="nationals">Ace America</TitleRibbon></span>
            </div>
            <div className="ace-stage"><Confetti count={30} /><Sash text={TITLE[step]} className="drape" /></div>
          </div>
        ))}
      </Row>

      <Row title="Title ribbons" note="Under a driver's name: Ace Toledo (Locals, white) · Ace Ohio (the state's colours) · Ace America (navy and gold). Playball, a swallow-tail.">
        {step => themed(step, (
          <div className="ace-ribbons"><TitleRibbon step="locals">Ace Toledo</TitleRibbon><TitleRibbon step="state" state={state}>Ace {state.name}</TitleRibbon><TitleRibbon step="nationals">Ace America</TitleRibbon></div>
        ))}
      </Row>

      <Row title="Bunting, the program line, the state bar, rules" note="Bunting along the top edge in the step's three colours; the Official Program number; the bar names the step and the title you're going for; a chequer rule, a gold rule, a double rule.">
        {step => themed(step, (
          <div className="st-stack st-flush">
            <Bunting />
            <ProgramLine right="No. 51 · 10¢" />
            <StateBar pennant={<Pennant name="Toledo" width={60} />}>{STEPS.find(s => s.id === step)!.name} · going for <b>{TITLE[step]}</b></StateBar>
            <Chequer />
            <hr className="ace-rule-gold" />
            <div className="ace-panel"><hr className="ace-rule-double" /><span className="ace-where">Toledo Speedway · Race Day</span></div>
          </div>
        ))}
      </Row>

      <Row title="Buttons, links, tabs" note="The accent block with a hard shadow; ghost, paper and gold tones; the gold-underlined link; paper tabs on a gold rule.">
        {step => themed(step, (
          <div className="st-stack">
            <AceButton block>To the Paddock</AceButton>
            <div className="st-inline"><AceButton tone="ghost">Later</AceButton><AceButton tone="paper">Open the garage</AceButton><AceButton tone="gold">Take the title</AceButton><AceButton disabled>Pick 1 more</AceButton></div>
            <button type="button" className="ace-link">Re-roll rookies</button>
            <div className="ace-tabs"><button type="button" className="ace-tab on">Team</button><button type="button" className="ace-tab">League</button><button type="button" className="ace-tab">Almanac</button></div>
          </div>
        ))}
      </Row>

      <Row title="Panels, sheets, the data table" note="Cream panels on the ground (dim for what's ahead, outlined for what's now); a sheet for a quick read; the house .rt table re-pointed onto paper (.ace-panel .rt-scroll).">
        {step => themed(step, (
          <div className="st-stack">
            <div className="ace-panel now"><div className="ace-rung-head"><Roundel n={16} /><b>Ace Toledo</b><span className="ace-tag">Race 4 of 6</span></div><div className="ace-sq"><i className="d" /><i className="d" /><i className="d" /><i /><i /><i className="last" /></div><div className="ace-row2"><span>Kettle Street · <b>2nd · 43</b></span><span className="dim">Leader 47</span></div><p className="ace-note">Win the table, win the title.</p></div>
            <div className="ace-panel dim"><div className="ace-rung-head"><Wheel r={8} /><b>Nationals</b><span className="ace-tag">50 states · 100 cars</span></div></div>
            <div className="ace-sheet">
              <div className="ace-th"><span /><span>Driver</span><span>SPD</span><span>CON</span><span>LCK</span><span>ACC</span></div>
              <div className="ace-tr"><Roundel n={16} /><b>Ricky Doormat</b><Level n={16} /><Level n={22} /><Level n={9} /><Level n={14} /></div>
              <div className="ace-tr"><Roundel n={12} /><b>Henry Okafor</b><Level n={9} /><Level n={6} /><Level n={11} /><Level n={8} /></div>
            </div>
            <div className="ace-panel flat"><div className="rt-scroll"><table className="rt rt-compact"><thead><tr><th className="rt-name">Driver</th><th className="rt-oc">OVR</th>{(['baseSpeed', 'consistency', 'luck'] as const).map(st => <th key={st} className="rt-stat">{STAT_ABBR[st]}</th>)}</tr></thead><tbody><tr><th className="rt-name" scope="row"><span className="rt-nm">Ricky Doormat</span></th><GradeCell value={58} strong /><GradeCell value={78} notch /><GradeCell value={44} /><GradeCell value={26} /></tr></tbody></table></div></div>
          </div>
        ))}
      </Row>

      <Row title="The card: the art slot, ribbons, stats, stamps" note="The face is a slot for commissioned art (a placeholder car until then); titles sit under the name as ribbons; stamps (#704) are inked squares, a little askew. The car's card is one line.">
        {step => themed(step, (
          <div className="st-stack st-center">
            <AceCard garage="Kettle Street Garage" number={16} name="Ricky Doormat" sub="Qualifier · Pro · 181 / 220 XP"
              titles={<><TitleRibbon step="locals">Ace Toledo</TitleRibbon><TitleRibbon step="state" state={state}>Ace {state.name}</TitleRibbon><TitleRibbon step="nationals">Ace America</TitleRibbon></>}
              stats={[{ label: 'SPD', level: 16 }, { label: 'CON', level: 22 }, { label: 'LCK', level: 25 }, { label: 'ACC', level: 9 }]}
              stamps={<><Stamp slot={0}>Rain king</Stamp><Stamp slot={1}>Iron lungs</Stamp><Stamp slot={2} gold>Brickyard</Stamp><Stamp slot={3} empty>open</Stamp></>} />
            <AceCard garage="Lone Pine Motor Co." number={7} name="June Haller" art={<Racer number={7} width={160} />} titles={<TitleRibbon step="locals">Ace Montpelier</TitleRibbon>} stats={[{ label: 'SPD', level: 6 }, { label: 'CON', level: 8 }, { label: 'LCK', level: 5 }, { label: 'ACC', level: 7 }]} />
            <CarCard name={'"Little Ivy"'} stamps={<><Stamp slot={1}>Twisty</Stamp><Stamp slot={2}>New brakes</Stamp></>} />
          </div>
        ))}
      </Row>

      <Row title="A Parcel" note="League issue in brown paper and white string; the rare gift from a friend upstairs in midnight paper with gold string. The strip announces one in the Paddock.">
        {step => themed(step, (
          <div className="st-stack">
            <ParcelStrip><b>A Parcel has come</b><br /><small>League issue · open before the race</small></ParcelStrip>
            <Parcel to={<>Kettle Street Garage<br />Toledo, O.</>} />
            <Parcel gift issue="From a friend upstairs" to={<>Kettle Street Garage<br />Toledo, O.</>} />
            <div className="ace-stamps big"><Stamp slot={0}>Rain king</Stamp><Stamp slot={1}>Steady hand</Stamp><Stamp slot={2}>Late braker</Stamp></div>
          </div>
        ))}
      </Row>

      <Row title="Marks" note="The gold wheel (the Accord's mark), the city pennant, the placeholder racer in the accent, a roundel.">
        {step => themed(step, (
          <div className="st-inline st-center"><Wheel r={14} /><Pennant name="Toledo" /><Racer number={16} width={150} /><Roundel n={44} big /></div>
        ))}
      </Row>
    </div>
  );
}
