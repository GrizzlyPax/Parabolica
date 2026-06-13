// The Founding: where the Commissionary names a league, kneels to a god, and
// fixes the calendar. Everything chosen here is sealed into the league seed.

import { useState } from 'react';
import { GODS } from '../gods';
import './League.css';

export interface FoundingChoices {
  name: string;
  godId: string;
  raceCount: number;
  raceIntervalMs: number;
}

interface FoundingScreenProps {
  onFound: (choices: FoundingChoices) => void;
  onBack: () => void;
}

const MINUTE = 60_000;
const HOUR = 3_600_000;

const CADENCES = [
  { label: 'Frantic', emoji: '⚡', detail: 'back-to-back broadcasts, non-stop', ms: 2 * MINUTE },
  { label: 'Brisk', emoji: '☕', detail: 'a race every 30 minutes', ms: 30 * MINUTE },
  { label: 'Classic', emoji: '🕰️', detail: 'a race every 3 hours', ms: 3 * HOUR },
];

const SEASON_LENGTHS = [8, 12, 16];
const MIN_RACES = 1;
const MAX_RACES = 24;

function FoundingScreen({ onFound, onBack }: FoundingScreenProps) {
  const [name, setName] = useState('');
  const [godId, setGodId] = useState<string | null>(null);
  const [raceCount, setRaceCount] = useState(12);
  // Free-form season length (e.g. a 2-race test run); '' = using a preset
  const [customCount, setCustomCount] = useState('');
  const [cadenceIdx, setCadenceIdx] = useState(1);

  const god = GODS.find(g => g.id === godId);
  const canFound = godId !== null;

  const handleFound = () => {
    if (!canFound) return;
    onFound({
      // Blank → App fills a procedural name seeded from the league (#185).
      name: name.trim(),
      godId: godId!,
      raceCount,
      raceIntervalMs: CADENCES[cadenceIdx].ms,
    });
  };

  return (
    <div className="league-screen founding-screen">
      <div className="league-content">
        <button className="league-back-btn" onClick={onBack}>← Menu</button>

        <header className="founding-header">
          <h1>Found a League</h1>
          <p className="founding-subtitle">
            One seed births the drivers, the cars, and the calendar. The races
            run on the clock — whether you are watching or not.
          </p>
        </header>

        <section className="founding-section">
          <h2 className="founding-label">Name it</h2>
          <input
            className="founding-name-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Leave blank to be named by the seed…"
            maxLength={40}
          />
        </section>

        <section className="founding-section">
          <h2 className="founding-label">Kneel to a god</h2>
          <div className="god-cards">
            {GODS.map(g => (
              <button
                key={g.id}
                className={`god-card ${godId === g.id ? 'selected' : ''}`}
                onClick={() => setGodId(g.id)}
              >
                <span className="god-emoji">{g.emoji}</span>
                <span className="god-name">{g.name}</span>
                <span className="god-epithet">{g.epithet}</span>
                <span className="god-appetite">{g.appetite}</span>
              </button>
            ))}
          </div>
          {god && <p className="god-hunger">“{god.hunger}”</p>}
        </section>

        <section className="founding-section">
          <h2 className="founding-label">Season length</h2>
          <div className="founding-options">
            {SEASON_LENGTHS.map(n => (
              <button
                key={n}
                className={`founding-option ${customCount === '' && raceCount === n ? 'selected' : ''}`}
                onClick={() => { setRaceCount(n); setCustomCount(''); }}
              >
                {n} races
              </button>
            ))}
            <label className={`founding-option founding-custom-count ${customCount !== '' ? 'selected' : ''}`}>
              <input
                type="number"
                min={MIN_RACES}
                max={MAX_RACES}
                value={customCount}
                placeholder="#"
                onChange={e => {
                  const raw = e.target.value;
                  setCustomCount(raw);
                  const n = parseInt(raw, 10);
                  if (!Number.isNaN(n)) {
                    setRaceCount(Math.max(MIN_RACES, Math.min(MAX_RACES, n)));
                  }
                }}
              />
              <span className="founding-option-detail">custom</span>
            </label>
          </div>
        </section>

        <section className="founding-section">
          <h2 className="founding-label">Cadence</h2>
          <div className="founding-options">
            {CADENCES.map((c, i) => (
              <button
                key={c.label}
                className={`founding-option ${cadenceIdx === i ? 'selected' : ''}`}
                onClick={() => setCadenceIdx(i)}
              >
                <span>{c.emoji} {c.label}</span>
                <span className="founding-option-detail">{c.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <button
          className="found-league-btn"
          disabled={!canFound}
          onClick={handleFound}
        >
          {canFound ? '⚜️ Found it — the inaugural race runs now' : 'Choose a god to continue'}
        </button>
      </div>
    </div>
  );
}

export default FoundingScreen;
