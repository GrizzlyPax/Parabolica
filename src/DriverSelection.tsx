import { useState, useMemo } from 'react';
import { Driver } from './RaceEngine';
import { RacePowerSet } from './powers';
import { ALL_TEAMS } from './data/teams';
import './DriverSelection.css';

// Calculate driver overall rating (50-99)
function calculateDriverRating(driver: Driver): number {
  const speedNorm = (driver.stats.baseSpeed - 0.85) / 0.30;
  const consistencyNorm = (driver.stats.consistency - 0.3) / 0.50;
  const luckNorm = (driver.stats.luck - 0.3) / 0.50;
  const accelNorm = (driver.stats.acceleration - 0.85) / 0.30;
  const enduranceNorm = (driver.stats.endurance - 0.85) / 0.30;
  const aggressionNorm = (driver.stats.aggression - 0.3) / 0.50;

  const driverScore = (
    speedNorm * 0.25 +
    consistencyNorm * 0.20 +
    accelNorm * 0.15 +
    enduranceNorm * 0.15 +
    luckNorm * 0.15 +
    (1 - Math.abs(aggressionNorm - 0.5) * 2) * 0.10
  );

  return Math.round(50 + driverScore * 49);
}

// Calculate car overall rating (50-99)
function calculateCarRating(driver: Driver): number {
  if (!driver.carStats) return 50;

  const carPower = (driver.carStats.power - 1) / 4;
  const carGrip = (driver.carStats.grip - 1) / 4;
  const carReliability = (driver.carStats.reliability - 1) / 4;

  const carScore = (
    carPower * 0.45 +
    carGrip * 0.35 +
    carReliability * 0.20
  );

  return Math.round(50 + carScore * 49);
}

// Get color for rating (F1 style: red < yellow < green < purple)
function getRatingColor(rating: number): string {
  if (rating >= 90) return '#a855f7';  // Purple - elite
  if (rating >= 80) return '#22c55e';  // Green - great
  if (rating >= 70) return '#eab308';  // Yellow - good
  return '#ef4444';                     // Red - below average
}

interface DriverSelectionProps {
  drivers: Driver[];
  onSelectionComplete: (favoriteTeamId: string, rivalTeamId: string) => void;
  powers: RacePowerSet;
}

function DriverSelection({ drivers, onSelectionComplete, powers }: DriverSelectionProps) {
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);
  const [rivalTeamId, setRivalTeamId] = useState<string | null>(null);
  const [step, setStep] = useState<'favorite' | 'rival' | 'confirm'>('favorite');

  // Get drivers for a team
  const getTeamDrivers = (teamId: string): Driver[] => {
    return drivers.filter(d => d.kingdomId === teamId);
  };

  // Get unique teams that have drivers in this race
  const activeTeams = useMemo(() => {
    const teamIds = new Set(drivers.map(d => d.kingdomId).filter(Boolean));
    return ALL_TEAMS.filter(t => teamIds.has(t.id));
  }, [drivers]);

  const handleTeamClick = (teamId: string) => {
    if (step === 'favorite') {
      setFavoriteTeamId(teamId);
      setStep('rival');
    } else if (step === 'rival' && teamId !== favoriteTeamId) {
      setRivalTeamId(teamId);
      setStep('confirm');
    }
  };

  const handleConfirm = () => {
    if (favoriteTeamId !== null && rivalTeamId !== null) {
      onSelectionComplete(favoriteTeamId, rivalTeamId);
    }
  };

  const handleBack = () => {
    if (step === 'rival') {
      setStep('favorite');
      setFavoriteTeamId(null);
    } else if (step === 'confirm') {
      setStep('rival');
      setRivalTeamId(null);
    }
  };

  const favoriteTeam = activeTeams.find(t => t.id === favoriteTeamId);
  const rivalTeam = activeTeams.find(t => t.id === rivalTeamId);
  const favoriteDrivers = favoriteTeamId ? getTeamDrivers(favoriteTeamId) : [];
  const rivalDrivers = rivalTeamId ? getTeamDrivers(rivalTeamId) : [];

  return (
    <div className="driver-selection-overlay">
      <div className="driver-selection-modal">
        <div className="selection-header">
          <h2>
            {step === 'favorite' && 'Choose Your Team'}
            {step === 'rival' && 'Choose Your Rival'}
            {step === 'confirm' && 'Confirm Selections'}
          </h2>
          <p className="selection-subtitle">
            {step === 'favorite' && 'Both drivers from this team will receive your blessings'}
            {step === 'rival' && 'Both drivers from this team will suffer your curses'}
            {step === 'confirm' && 'Ready to race?'}
          </p>
        </div>

        {step !== 'confirm' ? (
          <div className="kingdom-grid">
            {activeTeams.map(team => {
              const isSelected = team.id === favoriteTeamId || team.id === rivalTeamId;
              const isFavorite = team.id === favoriteTeamId;
              const isDisabled = step === 'rival' && team.id === favoriteTeamId;
              const teamDrivers = getTeamDrivers(team.id);

              return (
                <div
                  key={team.id}
                  className={`kingdom-selection-card ${isSelected ? 'selected' : ''} ${isFavorite ? 'favorite' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => !isDisabled && handleTeamClick(team.id)}
                  style={{ '--kingdom-color': team.color } as React.CSSProperties}
                >
                  <div className="kingdom-selection-header">
                    <span className="kingdom-selection-emoji">{team.emoji}</span>
                    <span className="kingdom-selection-name" style={{ color: team.color }}>
                      {team.name}
                    </span>
                  </div>
                  <div className="kingdom-selection-drivers">
                    {teamDrivers.map(driver => (
                      <div key={driver.id} className="kingdom-driver-row">
                        <span className="kingdom-driver-name">{driver.name}</span>
                        <span className="kingdom-driver-rating" style={{ color: getRatingColor(calculateDriverRating(driver)) }}>
                          {calculateDriverRating(driver)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="kingdom-car-rating">
                    <span className="kingdom-car-label">Car</span>
                    <span className="kingdom-car-value" style={{ color: getRatingColor(calculateCarRating(teamDrivers[0])) }}>
                      {calculateCarRating(teamDrivers[0])}
                    </span>
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
                <div className="selected-label">Your Team</div>
                <div className="selected-emoji">{favoriteTeam?.emoji}</div>
                <div className="selected-name" style={{ color: favoriteTeam?.color }}>
                  {favoriteTeam?.name}
                </div>
                <div className="selected-drivers-list">
                  {favoriteDrivers.map(d => (
                    <div key={d.id} className="selected-driver-row">
                      <span className="selected-driver-name">{d.name}</span>
                      <span className="selected-driver-rating" style={{ color: getRatingColor(calculateDriverRating(d)) }}>
                        {calculateDriverRating(d)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="selected-car-rating">
                  <span className="selected-car-label">Car</span>
                  <span className="selected-car-value" style={{ color: getRatingColor(calculateCarRating(favoriteDrivers[0])) }}>
                    {favoriteDrivers[0] && calculateCarRating(favoriteDrivers[0])}
                  </span>
                </div>
                <span className="champion-star">⭐</span>
              </div>

              <div className="vs-divider">VS</div>

              <div className="selected-team rival">
                <div className="selected-label">Rival Team</div>
                <div className="selected-emoji">{rivalTeam?.emoji}</div>
                <div className="selected-name" style={{ color: rivalTeam?.color }}>
                  {rivalTeam?.name}
                </div>
                <div className="selected-drivers-list">
                  {rivalDrivers.map(d => (
                    <div key={d.id} className="selected-driver-row">
                      <span className="selected-driver-name">{d.name}</span>
                      <span className="selected-driver-rating" style={{ color: getRatingColor(calculateDriverRating(d)) }}>
                        {calculateDriverRating(d)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="selected-car-rating">
                  <span className="selected-car-label">Car</span>
                  <span className="selected-car-value" style={{ color: getRatingColor(calculateCarRating(rivalDrivers[0])) }}>
                    {rivalDrivers[0] && calculateCarRating(rivalDrivers[0])}
                  </span>
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
                  <span className="power-target">Target: {favoriteTeam?.name} (both drivers)</span>
                </div>
                <div className="power-card curse-card">
                  <span className="power-emoji">{powers.curse.emoji}</span>
                  <span className="power-name">{powers.curse.name}</span>
                  <span className="power-desc">{powers.curse.description}</span>
                  <span className="power-target">Target: {rivalTeam?.name} (both drivers)</span>
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
