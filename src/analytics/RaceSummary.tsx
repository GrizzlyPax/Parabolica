import { Driver, RaceEvent, RaceState, TickLog } from '../RaceEngine';
import { ticksToTime, formatGap, tickToTimestamp } from '../utils/raceTime';

interface RaceSummaryProps {
  drivers: Driver[];
  raceState: RaceState;
  events: RaceEvent[];
  tickLogs: TickLog[];
}

interface DriverSummary {
  driver: Driver;
  finishPosition: number;
  totalTime: number;
  luckTriggers: number;
  chaosBoosts: number;
  chaosPenalties: number;
  keyMoment: RaceEvent | null;
  avgSpeed: number;
  avgTireModifier: number;
  tireDegradationTicks: number;
  pitStopCount: number;
  hadTireWarning: boolean;
  hadTireFailure: boolean;
}

function analyzeDriver(
  driver: Driver,
  finishPosition: number,
  events: RaceEvent[],
  tickLogs: TickLog[]
): DriverSummary {
  const driverEvents = events.filter(e => e.driverId === driver.id);
  const driverLogs = tickLogs.filter(l => l.driverId === driver.id);

  const luckTriggers = driverEvents.filter(e => e.type === 'luck_trigger').length;
  const chaosBoosts = driverEvents.filter(e => e.type === 'chaos_boost').length;
  const chaosPenalties = driverEvents.filter(e => e.type === 'chaos_penalty').length;

  // Tire strategy analysis
  const hadTireWarning = driverEvents.some(e => e.type === 'tire_warning');
  const hadTireFailure = driverEvents.some(e => e.type === 'tire_failure');
  const pitStopCount = driver.pitStops?.length || 0;

  // Calculate tire performance impact
  let totalTireModifier = 0;
  let tireDegradationTicks = 0;
  for (const log of driverLogs) {
    const tireMod = log.factors.tireModifier || 1;
    totalTireModifier += tireMod;
    if (tireMod < 0.95) tireDegradationTicks++;
  }
  const avgTireModifier = driverLogs.length > 0 ? totalTireModifier / driverLogs.length : 1;

  // Find the most significant event for this driver
  const keyMoment = driverEvents
    .filter(e => e.type !== 'lap_complete')  // Exclude routine lap completions
    .sort((a, b) => b.magnitude - a.magnitude)[0] || null;

  const avgSpeed = driverLogs.length > 0
    ? driverLogs.reduce((sum, l) => sum + l.factors.finalSpeed, 0) / driverLogs.length
    : 0;

  const totalTime = driver.lapTimes.reduce((sum, t) => sum + t, 0);

  return {
    driver,
    finishPosition,
    totalTime,
    luckTriggers,
    chaosBoosts,
    chaosPenalties,
    keyMoment,
    avgSpeed,
    avgTireModifier,
    tireDegradationTicks,
    pitStopCount,
    hadTireWarning,
    hadTireFailure,
  };
}

function generateNarrative(
  winner: DriverSummary,
  summaries: DriverSummary[],
  events: RaceEvent[]
): string[] {
  const narrative: string[] = [];

  // Opening
  narrative.push(
    `After ${ticksToTime(winner.totalTime)} of cosmic competition, ${winner.driver.emoji} ${winner.driver.name} claims victory!`
  );

  // Winner analysis - check tire strategy first
  if (winner.avgTireModifier > 0.98 && winner.pitStopCount >= 2) {
    narrative.push(
      `Smart tire strategy paid off - ${winner.driver.name} kept rubber fresh and fast throughout.`
    );
  } else if (winner.tireDegradationTicks < 20 && winner.pitStopCount >= 2) {
    narrative.push(
      `Textbook pit timing minimized tire degradation and kept ${winner.driver.name} competitive.`
    );
  } else if (winner.luckTriggers > 3) {
    narrative.push(
      `Fortune favored the winner with ${winner.luckTriggers} luck triggers throughout the race.`
    );
  } else if (winner.chaosBoosts > winner.chaosPenalties) {
    narrative.push(
      `The void smiled upon ${winner.driver.name}, granting more boons than curses.`
    );
  } else if (winner.driver.stats.consistency > 0.8) {
    narrative.push(
      `Steady and consistent driving proved to be the winning strategy.`
    );
  } else if (winner.driver.stats.endurance > 1.1) {
    narrative.push(
      `Superior endurance allowed ${winner.driver.name} to maintain speed through the final laps.`
    );
  }

  // Tire drama - check for blowouts
  const tireFailures = events.filter(e => e.type === 'tire_failure');

  if (tireFailures.length > 0) {
    const failedDrivers = tireFailures.map(e => e.emoji).join(' ');
    narrative.push(
      `Tire blowouts claimed ${tireFailures.length} victim${tireFailures.length > 1 ? 's' : ''}: ${failedDrivers}`
    );
  }

  // Find drivers who suffered most from tire degradation
  const worstTireStrategy = summaries
    .filter(s => s.finishPosition > 1 && s.tireDegradationTicks > 50)
    .sort((a, b) => b.tireDegradationTicks - a.tireDegradationTicks)[0];

  if (worstTireStrategy) {
    const lostPerformance = ((1 - worstTireStrategy.avgTireModifier) * 100).toFixed(0);
    narrative.push(
      `${worstTireStrategy.driver.emoji} ${worstTireStrategy.driver.name} suffered from worn rubber, losing ~${lostPerformance}% average pace.`
    );
  }

  // Key moments from the race
  const keyMoments = events
    .filter(e => e.magnitude > 0.6 || e.type === 'lead_change')
    .sort((a, b) => a.tick - b.tick)
    .slice(0, 3);

  if (keyMoments.length > 0) {
    narrative.push('');  // Spacer
    narrative.push('Key moments:');
    for (const moment of keyMoments) {
      narrative.push(
        `  ${tickToTimestamp(moment.tick)}: ${moment.emoji} ${moment.description}`
      );
    }
  }

  // Close competition check
  const topTwo = summaries.slice(0, 2);
  if (topTwo.length === 2 && topTwo[0].totalTime - topTwo[1].totalTime < 10) {
    const gap = formatGap(topTwo[1].totalTime - topTwo[0].totalTime);
    narrative.push('');
    narrative.push(
      `A ${gap === 'photo finish' ? 'photo finish' : `close finish - only ${gap}`} separated first and second place!`
    );
  }

  return narrative;
}

function RaceSummary({ drivers, raceState, events, tickLogs }: RaceSummaryProps) {
  if (!raceState.raceFinished) {
    return null;
  }

  // Build driver summaries in finish order
  const summaries: DriverSummary[] = raceState.finishOrder.map((driverId, index) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return null;
    return analyzeDriver(driver, index + 1, events, tickLogs);
  }).filter((s): s is DriverSummary => s !== null);

  const winner = summaries[0];
  if (!winner) return null;

  const narrative = generateNarrative(winner, summaries, events);

  return (
    <div className="race-summary-compact">
      <div className="summary-winner">
        <span className="winner-emoji">{winner.driver.emoji}</span>
        <div className="winner-details">
          <span className="winner-label">Winner</span>
          <span className="winner-name" style={{ color: winner.driver.color }}>
            {winner.driver.name}
          </span>
        </div>
        <span className="winner-time">{ticksToTime(winner.totalTime)}</span>
      </div>

      <div className="summary-narrative">
        {narrative.slice(0, 3).map((line, i) => (
          line && <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  );
}

export default RaceSummary;
