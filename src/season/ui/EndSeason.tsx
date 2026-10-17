// End the run early (Pax, Oct 9: "no way to quit a league and start a new
// one"). One save slot, so ending clears it; it asks first, in place.
import { useState } from 'react';
import { clearRun } from '../../run/current';
import { AceButton } from '../../look/Look';

export default function EndSeason({ onEnded }: { onEnded: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" className="ace-link" onClick={() => setAsking(true)}>End run</button>;
  return (
    <span className="rh-end" role="alert">
      <span>End this run? It's deleted and can't be undone.</span>
      <AceButton tone="ghost" className="rh-end-btn" onClick={() => setAsking(false)}>Keep playing</AceButton>
      <AceButton className="rh-end-btn" onClick={() => { clearRun(); onEnded(); }}>End run</AceButton>
    </span>
  );
}
