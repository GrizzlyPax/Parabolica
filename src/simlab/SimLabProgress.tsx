interface Props {
  completed: number;
  total: number;
  currentTrack: string;
  onAbort: () => void;
}

export default function SimLabProgress({ completed, total, currentTrack, onAbort }: Props) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="sim-lab-progress">
      <div className="progress-display">
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="progress-text">
          <span className="progress-count">{completed} / {total}</span>
          <span className="progress-percent">{percentage}%</span>
        </div>
        {currentTrack && (
          <p className="current-track">Racing at: {currentTrack}</p>
        )}
      </div>

      <button className="abort-btn" onClick={onAbort}>
        Abort
      </button>

      <p className="progress-note">
        Simulation runs in background - UI stays responsive
      </p>
    </div>
  );
}
