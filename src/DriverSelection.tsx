import { useState, useMemo } from 'react';
import { Driver } from './RaceEngine';
import { RacePowerSet } from './powers';
import { ALL_TEAMS } from './data/teams';
import './DriverSelection.css';

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
                <div className="selected-label">Your Team</div>
                <div className="selected-emoji">{favoriteTeam?.emoji}</div>
                <div className="selected-name" style={{ color: favoriteTeam?.color }}>
                  {favoriteTeam?.name}
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
                <div className="selected-label">Rival Team</div>
                <div className="selected-emoji">{rivalTeam?.emoji}</div>
                <div className="selected-name" style={{ color: rivalTeam?.color }}>
                  {rivalTeam?.name}
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
