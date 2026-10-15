import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import './RaceStartCountdown.css';
import { GameIcon } from './icons/GameIcon';
import { lightsOutLine } from './feed/commentary';
import type { Step } from './look/step';

interface RaceStartCountdownProps {
  onCountdownComplete: () => void;
  trackName?: string;
  trackEmoji?: string;
  /** The race's step: the lights-out line is its caller's (#749); absent = The Network. */
  step?: Step;
  /** The state raced for at State ({state} in Radio's lines). */
  stateName?: string;
}

function RaceStartCountdown({ onCountdownComplete, trackName, trackEmoji, step, stateName }: RaceStartCountdownProps) {
  const [phase, setPhase] = useState<'intro' | 'lights' | 'go' | 'done'>('intro');
  const [lightsOn, setLightsOn] = useState(0);
  // The caller's lights-out line (#749): The PA, {State} Radio or The Network.
  const [goMessage] = useState(() => lightsOutLine({ step, stateName, trackName: trackName ?? '' }, Math.floor(Math.random() * 1e6)));

  // Store callback in a ref to avoid dependency issues
  const onCompleteRef = useRef(onCountdownComplete);

  // Keep the ref updated with latest callback
  useEffect(() => {
    onCompleteRef.current = onCountdownComplete;
  }, [onCountdownComplete]);

  // Use layout effect + requestAnimationFrame for timing
  // Key insight: use LOCAL variables that get properly captured in closure
  // This handles StrictMode properly - each mount gets its own independent timing
  useLayoutEffect(() => {
    // All timing state is LOCAL to this effect instance
    const startTime = Date.now();
    const lightsOutDelay = 800 + Math.random() * 600;
    let hasCompleted = false;
    let frameId: number;

    const tick = () => {
      if (hasCompleted) return;

      const elapsed = Date.now() - startTime;
      const totalDuration = 1500 + 5 * 800 + lightsOutDelay + 800;

      // Phase transitions based on elapsed time
      if (elapsed < 1500) {
        setPhase('intro');
      } else if (elapsed < 1500 + 5 * 800 + lightsOutDelay) {
        setPhase('lights');
        const lightsElapsed = elapsed - 1500;
        const currentLight = Math.min(5, Math.floor(lightsElapsed / 800) + 1);
        setLightsOn(currentLight);
      } else if (elapsed < totalDuration) {
        setPhase('go');
        setLightsOn(0);
      } else {
        // Done - start the race
        if (!hasCompleted) {
          hasCompleted = true;
          setPhase('done');
          onCompleteRef.current();
          return;
        }
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      hasCompleted = true;
      cancelAnimationFrame(frameId);
    };
  }, []); // Empty deps - each mount gets fresh local state

  if (phase === 'done') return null;

  return (
    <div className="race-start-countdown">
      <div className="countdown-content">
        {phase === 'intro' && (
          <div className="intro-phase">
            <span className="track-emoji-large">{trackEmoji || <GameIcon name="race.finish" size={48} />}</span>
            <h1 className="track-name-large">{trackName || 'Grand Prix'}</h1>
            <p className="formation-text">Formation Lap Complete</p>
          </div>
        )}

        {phase === 'lights' && (
          <div className="lights-phase">
            <div className="lights-array">
              {[1, 2, 3, 4, 5].map(num => (
                <div
                  key={num}
                  className={`light-column ${lightsOn >= num ? 'on' : ''}`}
                >
                  <div className="light red" />
                  <div className="light red" />
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'go' && (
          <div className="go-phase">
            <span className="go-text">{goMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default RaceStartCountdown;
