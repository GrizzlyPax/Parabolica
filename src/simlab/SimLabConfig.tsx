import { useState } from 'react';
import type { SimLabConfig } from './types';

interface Props {
  onStart: (config: SimLabConfig) => void;
}

export default function SimLabConfig({ onStart }: Props) {
  const [batchSize, setBatchSize] = useState(100);
  const [chaosLevel, setChaosLevel] = useState(0.3);
  const [trackSelection, setTrackSelection] = useState<'random' | 'all'>('all');

  const handleStart = () => {
    onStart({
      batchSize,
      chaosLevel,
      trackSelection,
    });
  };

  return (
    <div className="sim-lab-config">
      <div className="config-section">
        <h3>Simulation Size</h3>
        <div className="batch-buttons">
          {[100, 250, 500, 1000].map(size => (
            <button
              key={size}
              className={`batch-btn ${batchSize === size ? 'active' : ''}`}
              onClick={() => setBatchSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
        <p className="config-note">
          More races = more accurate results, but longer wait
        </p>
      </div>

      <div className="config-section">
        <h3>Race Settings</h3>

        <div className="config-row">
          <label>Chaos Level</label>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={chaosLevel}
              onChange={e => setChaosLevel(Number(e.target.value))}
            />
            <span className="slider-value">{Math.round(chaosLevel * 100)}%</span>
          </div>
          <p className="config-note">
            Affects random event magnitude. Default is 30%. Higher = more chaos events affect outcomes.
          </p>
        </div>

        <div className="config-row">
          <label>Track Selection</label>
          <div className="track-buttons">
            <button
              className={`track-btn ${trackSelection === 'random' ? 'active' : ''}`}
              onClick={() => setTrackSelection('random')}
            >
              Random
            </button>
            <button
              className={`track-btn ${trackSelection === 'all' ? 'active' : ''}`}
              onClick={() => setTrackSelection('all')}
            >
              Cycle All
            </button>
          </div>
          <p className="config-note">
            Each track has its own lap count (14-20 laps)
          </p>
        </div>
      </div>

      <div className="config-summary">
        <p>
          Will simulate <strong>{batchSize}</strong> races at{' '}
          <strong>{Math.round(chaosLevel * 100)}%</strong> chaos
        </p>
      </div>

      <button className="start-btn" onClick={handleStart}>
        Run Simulation
      </button>
    </div>
  );
}
