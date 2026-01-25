// Formatted lap time display with color coding
import { ticksToShortTime } from '../../utils/raceTime';
import type { LapTimeClass } from './types';

interface LapTimeProps {
  time: number | null;
  className?: LapTimeClass;
}

function LapTime({ time, className = '' }: LapTimeProps) {
  if (time === null) {
    return <span className="lap-time lap-time-empty">—</span>;
  }

  return (
    <span className={`lap-time ${className ? `lap-${className}` : ''}`}>
      {ticksToShortTime(time)}
    </span>
  );
}

export default LapTime;
