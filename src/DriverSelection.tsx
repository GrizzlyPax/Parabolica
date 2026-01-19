import { useState, useMemo } from 'react';
import { Driver } from './RaceEngine';
import { RacePowerSet } from './powers';
import { KINGDOMS } from './data/kingdoms';
import './DriverSelection.css';

interface DriverSelectionProps {
  drivers: Driver[];
  onSelectionComplete: (favoriteKingdomId: string, rivalKingdomId: string) => void;
  powers: RacePowerSet;
}

function DriverSelection({ drivers, onSelectionComplete, powers }: DriverSelectionProps) {
  const [favoriteKingdomId, setFavoriteKingdomId] = useState<string | null>(null);
  const [rivalKingdomId, setRivalKingdomId] = useState<string | null>(null);
  const [step, setStep] = useState<'favorite' | 'rival' | 'confirm'>('favorite');

  // Get drivers for a kingdom
  const getKingdomDrivers = (kingdomId: string): Driver[] => {
    return drivers.filter(d => d.kingdomId === kingdomId);
  };

  // Get unique kingdoms that have drivers in this race
  const activeKingdoms = useMemo(() => {
    const kingdomIds = new Set(drivers.map(d => d.kingdomId).filter(Boolean));
    return KINGDOMS.filter(k => kingdomIds.has(k.id));
  }, [drivers]);

  const handleKingdomClick = (kingdomId: string) => {
    if (step === 'favorite') {
      setFavoriteKingdomId(kingdomId);
      setStep('rival');
    } else if (step === 'rival' && kingdomId !== favoriteKingdomId) {
      setRivalKingdomId(kingdomId);
      setStep('confirm');
    }
  };

  const handleConfirm = () => {
    if (favoriteKingdomId !== null && rivalKingdomId !== null) {
      onSelectionComplete(favoriteKingdomId, rivalKingdomId);
    }
  };

  const handleBack = () => {
    if (step === 'rival') {
      setStep('favorite');
      setFavoriteKingdomId(null);
    } else if (step === 'confirm') {
      setStep('rival');
      setRivalKingdomId(null);
    }
  };

  const favoriteKingdom = activeKingdoms.find(k => k.id === favoriteKingdomId);
  const rivalKingdom = activeKingdoms.find(k => k.id === rivalKingdomId);
  const favoriteDrivers = favoriteKingdomId ? getKingdomDrivers(favoriteKingdomId) : [];
  const rivalDrivers = rivalKingdomId ? getKingdomDrivers(rivalKingdomId) : [];

  return (
    <div className="driver-selection-overlay">
      <div className="driver-selection-modal">
        <div className="selection-header">
          <h2>
            {step === 'favorite' && 'Choose Your Kingdom'}
            {step === 'rival' && 'Choose Your Rival Kingdom'}
            {step === 'confirm' && 'Confirm Selections'}
          </h2>
          <p className="selection-subtitle">
            {step === 'favorite' && 'Both drivers from this kingdom will receive your blessings'}
            {step === 'rival' && 'Both drivers from this kingdom will suffer your curses'}
            {step === 'confirm' && 'Ready to race?'}
          </p>
        </div>

        {step !== 'confirm' ? (
          <div className="kingdom-grid">
            {activeKingdoms.map(kingdom => {
              const isSelected = kingdom.id === favoriteKingdomId || kingdom.id === rivalKingdomId;
              const isFavorite = kingdom.id === favoriteKingdomId;
              const isDisabled = step === 'rival' && kingdom.id === favoriteKingdomId;
              const kingdomDrivers = getKingdomDrivers(kingdom.id);

              return (
                <div
                  key={kingdom.id}
                  className={`kingdom-selection-card ${isSelected ? 'selected' : ''} ${isFavorite ? 'favorite' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => !isDisabled && handleKingdomClick(kingdom.id)}
                  style={{ '--kingdom-color': kingdom.color } as React.CSSProperties}
                >
                  <div className="kingdom-selection-header">
                    <span className="kingdom-selection-emoji">{kingdom.emoji}</span>
                    <span className="kingdom-selection-name" style={{ color: kingdom.color }}>
                      {kingdom.name}
                    </span>
                  </div>
                  <div className="kingdom-selection-drivers">
                    {kingdomDrivers.map(driver => (
                      <span key={driver.id} className="kingdom-driver-name">{driver.name}</span>
                    ))}
                  </div>
                  {isFavorite && <span className="selection-badge favorite-badge">⭐</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="confirmation-view">
            <div className="selected-teams">
              <div className="selected-team favorite">
                <div className="selected-label">Your Kingdom</div>
                <div className="selected-emoji">{favoriteKingdom?.emoji}</div>
                <div className="selected-name" style={{ color: favoriteKingdom?.color }}>
                  {favoriteKingdom?.name}
                </div>
                <div className="selected-drivers-list">
                  {favoriteDrivers.map(d => (
                    <span key={d.id} className="selected-driver-name">{d.name}</span>
                  ))}
                </div>
                <span className="champion-star">⭐</span>
              </div>

              <div className="vs-divider">VS</div>

              <div className="selected-team rival">
                <div className="selected-label">Rival Kingdom</div>
                <div className="selected-emoji">{rivalKingdom?.emoji}</div>
                <div className="selected-name" style={{ color: rivalKingdom?.color }}>
                  {rivalKingdom?.name}
                </div>
                <div className="selected-drivers-list">
                  {rivalDrivers.map(d => (
                    <span key={d.id} className="selected-driver-name">{d.name}</span>
                  ))}
                </div>
                <span className="rival-skull">💀</span>
              </div>
            </div>

            <div className="powers-preview">
              <h3>Your Powers This Race</h3>
              <div className="power-cards">
                <div className="power-card blessing-card">
                  <span className="power-emoji">{powers.blessing.emoji}</span>
                  <span className="power-name">{powers.blessing.name}</span>
                  <span className="power-desc">{powers.blessing.description}</span>
                  <span className="power-target">Target: {favoriteKingdom?.name} (both drivers)</span>
                </div>
                <div className="power-card curse-card">
                  <span className="power-emoji">{powers.curse.emoji}</span>
                  <span className="power-name">{powers.curse.name}</span>
                  <span className="power-desc">{powers.curse.description}</span>
                  <span className="power-target">Target: {rivalKingdom?.name} (both drivers)</span>
                </div>
                <div className="power-card god-card">
                  <span className="power-emoji">{powers.godPower.emoji}</span>
                  <span className="power-name">{powers.godPower.name}</span>
                  <span className="power-desc">{powers.godPower.description}</span>
                  <span className="power-target">Chaos Effect</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="selection-actions">
          {step !== 'favorite' && (
            <button className="back-btn" onClick={handleBack}>
              Back
            </button>
          )}
          {step === 'confirm' && (
            <button className="confirm-btn" onClick={handleConfirm}>
              Start Race
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DriverSelection;
