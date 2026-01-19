import { Driver, TickLog } from '../RaceEngine';

interface FactorBarsProps {
  drivers: Driver[];
  tickLogs: TickLog[];
}

interface DriverFactorStats {
  driverId: number;
  avgLuck: number;
  avgChaos: number;
  avgEndurance: number;
  avgConsistency: number;
  avgTireModifier: number;
  luckTriggers: number;
  chaosBoosts: number;
  chaosPenalties: number;
  tireDegradationTicks: number; // Ticks where tires were hurting performance
}

function calculateDriverStats(driverId: number, logs: TickLog[]): DriverFactorStats {
  const driverLogs = logs.filter(log => log.driverId === driverId);

  if (driverLogs.length === 0) {
    return {
      driverId,
      avgLuck: 1,
      avgChaos: 1,
      avgEndurance: 1,
      avgConsistency: 1,
      avgTireModifier: 1,
      luckTriggers: 0,
      chaosBoosts: 0,
      chaosPenalties: 0,
      tireDegradationTicks: 0,
    };
  }

  let totalLuck = 0;
  let totalChaos = 0;
  let totalEndurance = 0;
  let totalConsistency = 0;
  let totalTireModifier = 0;
  let luckTriggers = 0;
  let chaosBoosts = 0;
  let chaosPenalties = 0;
  let tireDegradationTicks = 0;

  for (const log of driverLogs) {
    totalLuck += log.factors.luckBonus;
    totalChaos += log.factors.chaosModifier;
    totalEndurance += log.factors.enduranceFactor;
    totalConsistency += log.factors.consistencyEffect;
    totalTireModifier += log.factors.tireModifier || 1;

    if (log.factors.luckBonus > 1) luckTriggers++;
    if (log.factors.chaosModifier > 1) chaosBoosts++;
    if (log.factors.chaosModifier < 1) chaosPenalties++;
    // Count ticks where tires were significantly hurting (below 95% performance)
    if ((log.factors.tireModifier || 1) < 0.95) tireDegradationTicks++;
  }

  const count = driverLogs.length;
  return {
    driverId,
    avgLuck: totalLuck / count,
    avgChaos: totalChaos / count,
    avgEndurance: totalEndurance / count,
    avgConsistency: totalConsistency / count,
    avgTireModifier: totalTireModifier / count,
    luckTriggers,
    chaosBoosts,
    chaosPenalties,
    tireDegradationTicks,
  };
}

function FactorBars({ drivers, tickLogs }: FactorBarsProps) {
  const driverStats = drivers.map(d => ({
    driver: d,
    stats: calculateDriverStats(d.id, tickLogs),
  }));

  // Find max values for scaling
  const maxLuck = Math.max(...driverStats.map(d => d.stats.avgLuck), 1.3);
  const maxChaos = Math.max(...driverStats.map(d => d.stats.avgChaos), 1.2);

  return (
    <div className="factor-bars">
      <h4>Factor Impact by Driver</h4>
      <div className="factor-legend">
        <span className="legend-item">
          <span className="legend-color" style={{ background: '#d8c898' }} />
          Luck
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ background: '#98c8d8' }} />
          Chaos+
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ background: '#d898a8' }} />
          Chaos-
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ background: '#a8d8a8' }} />
          Endurance
        </span>
        <span className="legend-item">
          <span className="legend-color" style={{ background: '#e74c3c' }} />
          Tire Deg
        </span>
      </div>

      <div className="factor-bars-list">
        {driverStats.map(({ driver, stats }) => (
          <div key={driver.id} className="driver-factor-row">
            <div className="driver-factor-info">
              <span className="driver-emoji">{driver.emoji}</span>
              <span className="driver-name" style={{ color: driver.color }}>
                {driver.shortName}
              </span>
            </div>

            <div className="factor-bar-group">
              <div className="factor-bar-container">
                <div
                  className="factor-bar luck-bar"
                  style={{ width: `${((stats.avgLuck - 1) / (maxLuck - 1)) * 100}%` }}
                  title={`Avg Luck: ${stats.avgLuck.toFixed(3)} (${stats.luckTriggers} triggers)`}
                />
              </div>
              <div className="factor-bar-container">
                <div
                  className="factor-bar chaos-boost-bar"
                  style={{ width: `${Math.max(0, ((stats.avgChaos - 1) / (maxChaos - 1)) * 100)}%` }}
                  title={`Chaos Boosts: ${stats.chaosBoosts}`}
                />
                <div
                  className="factor-bar chaos-penalty-bar"
                  style={{ width: `${Math.max(0, ((1 - stats.avgChaos) / 0.3) * 100)}%` }}
                  title={`Chaos Penalties: ${stats.chaosPenalties}`}
                />
              </div>
              <div className="factor-bar-container">
                <div
                  className="factor-bar endurance-bar"
                  style={{ width: `${stats.avgEndurance * 80}%` }}
                  title={`Avg Endurance Factor: ${stats.avgEndurance.toFixed(3)}`}
                />
              </div>
              <div className="factor-bar-container">
                <div
                  className="factor-bar tire-deg-bar"
                  style={{ width: `${Math.max(0, (1 - stats.avgTireModifier) / 0.4) * 100}%` }}
                  title={`Avg Tire Performance: ${(stats.avgTireModifier * 100).toFixed(1)}% (${stats.tireDegradationTicks} degraded ticks)`}
                />
              </div>
            </div>

            <div className="factor-counts">
              <span className="count luck-count" title="Luck triggers">
                {stats.luckTriggers}
              </span>
              <span className="count chaos-count" title="Chaos events">
                +{stats.chaosBoosts}/-{stats.chaosPenalties}
              </span>
              <span className="count tire-count" title="Ticks with degraded tires">
                {stats.tireDegradationTicks > 0 ? `${stats.tireDegradationTicks}` : '-'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FactorBars;
