// Hotseat hand-off (docs/SEASON_MODE.md, "Decided"): a full screen in the next
// player's team colour, so whoever holds the phone knows to pass it on.
import { TeamLogo, teamThemeVars, type TeamLike } from '../../icons/GameIcon';

export default function Handoff({ team, label, what, onReady }: { team: TeamLike & { name: string }; label: string; what: string; onReady: () => void }) {
  return (
    <button type="button" className="ss-handoff" style={teamThemeVars(team)} onClick={onReady}>
      <span className="ss-handoff-k">{label} · {what}</span>
      <TeamLogo team={team} size={72} />
      <span className="ss-handoff-name">Pass to {team.name}</span>
      <span className="ss-handoff-tap">Tap when ready</span>
    </button>
  );
}
