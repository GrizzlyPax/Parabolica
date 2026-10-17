// A garage's name as a screen says it (#778, Pax Oct 17): plain at Locals,
// its title's ribbon after (Ace Akron at State, Ace Vermont at Nationals).
import { TitleRibbon } from '../../look/Look';
import { stateLook } from '../../look/step';
import type { GarageLabel } from './teams';

export function GarageName({ label, className = 'rt-nm' }: { label: GarageLabel | undefined; className?: string }) {
  if (!label) return null;
  if (!label.ribbon) return <span className={className}>{label.name}</span>;
  return <TitleRibbon step={label.ribbon.step} state={label.ribbon.stateId ? stateLook(label.ribbon.stateId) : undefined}>{label.name}</TitleRibbon>;
}
