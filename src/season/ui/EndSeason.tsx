// End the season early (Pax, Oct 9: "no way to quit a league and start a new
// one"). One save slot, so ending clears it; it asks first, on the page.
import { useState } from 'react';
import { clearRun } from '../../run/current';

export default function EndSeason({ onEnded }: { onEnded: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" className="rs-link ss-end" onClick={() => setAsking(true)}>End run</button>;
  return (
    <div className="ss-end-confirm" role="alert">
      <span>End this run? It's deleted and can't be undone.</span>
      <span className="ss-end-btns">
        <button type="button" className="rs-btn" onClick={() => { clearRun(); onEnded(); }}>End run</button>
        <button type="button" className="rs-btn rs-btn-ghost" onClick={() => setAsking(false)}>Keep playing</button>
      </span>
    </div>
  );
}
