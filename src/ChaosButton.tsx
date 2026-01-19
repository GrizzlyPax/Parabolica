import { useState } from 'react';
import RaceEngine from './RaceEngine';
import './ChaosButton.css';

const ELDRITCH_PROMPTS = [
  "Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn... The standings shift as reality bends!",
  "Iä! Iä! The stars align wrongly and the race order is unmade and remade!",
  "You gazed into the void, and the void shuffled the leaderboard.",
  "The Black Goat of the Woods has blessed this race with a thousand young... positions.",
  "Azathoth stirs in his nuclear chaos, and so do the standings!",
  "The Crawling Chaos whispers, and drivers find themselves... elsewhere.",
  "Time is a flat circle, and so is this race track. Nothing matters. Everything changes.",
  "Hastur! Hastur! Has-- *static* --the rankings are corrupted beyond mortal repair.",
  "Through non-Euclidean geometry, first becomes last and last becomes first!",
  "The Elder Things have recalculated. Your understanding of 'winning' was always flawed.",
];

function ChaosButton() {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const engine = RaceEngine.getInstance();

  const handleChaos = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    const randomPrompt = ELDRITCH_PROMPTS[Math.floor(Math.random() * ELDRITCH_PROMPTS.length)];
    setPrompt(randomPrompt);

    engine.invokeEldritch();

    setTimeout(() => {
      setIsAnimating(false);
    }, 2000);

    setTimeout(() => {
      setPrompt(null);
    }, 5000);
  };

  return (
    <div className="chaos-container">
      <button
        onClick={handleChaos}
        className={`chaos-btn ${isAnimating ? 'animating' : ''}`}
        disabled={isAnimating}
      >
        <span className="chaos-icon">☠</span>
        <span className="chaos-text">INVOKE CHAOS</span>
        <span className="chaos-icon">☠</span>
      </button>

      {prompt && (
        <div className={`eldritch-prompt ${isAnimating ? 'visible' : 'fading'}`}>
          <p>{prompt}</p>
        </div>
      )}
    </div>
  );
}

export default ChaosButton;
