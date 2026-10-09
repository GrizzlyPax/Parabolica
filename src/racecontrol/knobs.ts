// The simulation knobs, as a flat registry: path into SimVariables, label,
// one-line meaning, format and a sane range. Race Control's Physics tab lists
// these; the engine reads the values through resolveRuleset → simVars.
import { SimVariables, CANON_VARIABLES, cloneVariables } from '../simlab/types';

// Variable metadata for display
export interface VarDef {
  category: string;
  /** Icon meaning for the category heading (docs/ICONS.md). */
  categoryIcon: string;
  path: string;           // e.g., "tires.soft.speedBonus" or "crashes.baseCrashChance"
  label: string;
  description: string;
  format: 'percent' | 'decimal' | 'integer' | 'multiplier';
  min: number;
  max: number;
  step: number;
}

// Build flat list of all variables
export function buildVariableList(): VarDef[] {
  const vars: VarDef[] = [];

  // Tire compounds
  const tireCompoundVars = [
    { key: 'speedBonus', label: 'Speed Bonus', desc: 'Speed multiplier', format: 'multiplier' as const, min: 0.8, max: 1.2, step: 0.01 },
    { key: 'lifeLaps', label: 'Life (laps)', desc: 'Laps from fresh to the cliff', format: 'decimal' as const, min: 2, max: 20, step: 0.5 },
    { key: 'criticalAt', label: 'Cliff Start', desc: 'Wear % when cliff begins', format: 'integer' as const, min: 50, max: 95, step: 1 },
    { key: 'cliffSeverity', label: 'Cliff Severity', desc: 'How harsh the cliff is', format: 'decimal' as const, min: 0.1, max: 1.0, step: 0.05 },
    { key: 'blowoutRisk', label: 'Blowout Risk', desc: 'Base blowout chance/tick', format: 'decimal' as const, min: 0, max: 0.01, step: 0.0001 },
  ];

  for (const compound of ['soft', 'medium', 'hard'] as const) {
    const icon = 'stat.tyre_management';
    for (const v of tireCompoundVars) {
      vars.push({
        category: `Tires (${compound})`,
        categoryIcon: icon,
        path: `tires.${compound}.${v.key}`,
        label: v.label,
        description: v.desc,
        format: v.format,
        min: v.min,
        max: v.max,
        step: v.step,
      });
    }
  }

  // Tire general
  const tireGeneralVars = [
    { key: 'precliffStart', label: 'Pre-cliff Start', desc: 'Wear % when pre-cliff begins', format: 'integer' as const, min: 20, max: 60, step: 5 },
    { key: 'precliffMaxPenalty', label: 'Pre-cliff Penalty', desc: 'Max speed loss before cliff', format: 'percent' as const, min: 0, max: 0.15, step: 0.01 },
    { key: 'cliffExponent', label: 'Cliff Exponent', desc: 'Curve steepness', format: 'decimal' as const, min: 1, max: 3, step: 0.1 },
    { key: 'cliffMultiplier', label: 'Cliff Multiplier', desc: 'Cliff severity mult', format: 'decimal' as const, min: 0.1, max: 1, step: 0.05 },
    { key: 'flatPenalty', label: 'Flat Penalty', desc: 'Immediate penalty at critical', format: 'percent' as const, min: 0, max: 0.15, step: 0.01 },
    { key: 'minSpeedFloor', label: 'Min Speed Floor', desc: 'Min speed with dead tires', format: 'percent' as const, min: 0.4, max: 0.8, step: 0.05 },
    { key: 'aggressionWearMultiplier', label: 'Aggression Wear', desc: 'Aggression wear impact', format: 'decimal' as const, min: 0, max: 1, step: 0.05 },
    { key: 'teamTireMgmtWearPerStar', label: 'Tire Mgmt Wear/Star', desc: 'Team tire mgmt wear scaling, 3★ neutral (0 = dormant)', format: 'decimal' as const, min: 0, max: 0.4, step: 0.01 },
  ];
  for (const v of tireGeneralVars) {
    vars.push({ category: 'Tires (general)', categoryIcon: 'stat.tyre_management', path: `tires.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Crashes
  const crashVars = [
    { key: 'baseCrashChance', label: 'Base Crash Chance', desc: 'Probability per tick in proximity', format: 'decimal' as const, min: 0, max: 0.002, step: 0.0001 },
    { key: 'crashProximityThreshold', label: 'Proximity Threshold', desc: 'Distance for crash risk', format: 'percent' as const, min: 0.01, max: 0.1, step: 0.005 },
    { key: 'crashGracePeriod', label: 'Grace Period', desc: 'Ticks before crashes', format: 'integer' as const, min: 0, max: 200, step: 10 },
    { key: 'initialSurvivalChance', label: 'Survival Chance', desc: 'Survive initial collision', format: 'percent' as const, min: 0.1, max: 0.9, step: 0.05 },
    { key: 'pileupParticipationChance', label: 'Pileup Chance', desc: 'Chance to join pileup', format: 'percent' as const, min: 0, max: 0.6, step: 0.05 },
    { key: 'pileupSurvivalChance', label: 'Pileup Survival', desc: 'Survive pileup w/ damage', format: 'percent' as const, min: 0.1, max: 0.9, step: 0.05 },
    { key: 'secondaryAccidentMultiplier', label: 'Secondary Mult', desc: 'Secondary accident mult', format: 'integer' as const, min: 1, max: 30, step: 1 },
    { key: 'consistencyFactor', label: 'Consistency Factor', desc: 'Low consistency risk boost', format: 'decimal' as const, min: 0, max: 1, step: 0.1 },
    { key: 'tireWearFactor', label: 'Tire Wear Factor', desc: 'Tire wear crash divisor', format: 'integer' as const, min: 50, max: 500, step: 25 },
    { key: 'luckReduction', label: 'Luck Reduction', desc: 'Max luck crash reduction', format: 'percent' as const, min: 0, max: 0.6, step: 0.05 },
    { key: 'safetyCarsReduction', label: 'SC Reduction', desc: 'Crash reduction under SC', format: 'percent' as const, min: 0.01, max: 0.3, step: 0.01 },
  ];
  for (const v of crashVars) {
    vars.push({ category: 'Crashes', categoryIcon: 'race.crash', path: `crashes.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Mechanical
  const mechVars = [
    { key: 'baseFailureChance', label: 'Base Failure', desc: 'Mechanical failure/tick', format: 'decimal' as const, min: 0, max: 0.002, step: 0.0001 },
    { key: 'reliabilityBase', label: 'Reliability Base', desc: 'Base protection', format: 'decimal' as const, min: 0, max: 0.8, step: 0.05 },
    { key: 'reliabilityPerStar', label: 'Reliability/Star', desc: 'Protection per star', format: 'decimal' as const, min: 0.05, max: 0.6, step: 0.05 },
    { key: 'luckBase', label: 'Luck Base', desc: 'Base luck factor', format: 'decimal' as const, min: 1, max: 2, step: 0.1 },
    { key: 'luckMultiplier', label: 'Luck Multiplier', desc: 'Luck reduction mult', format: 'decimal' as const, min: 0.25, max: 1, step: 0.05 },
  ];
  for (const v of mechVars) {
    vars.push({ category: 'Mechanical', categoryIcon: 'race.mechanical', path: `mechanical.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Pits
  const pitVars = [
    { key: 'basePitDuration', label: 'Base Duration', desc: 'Stationary pit work, ticks', format: 'integer' as const, min: 10, max: 120, step: 2 },
    { key: 'minStops', label: 'Min Stops', desc: 'Stop rule: stops required (0 = no rule)', format: 'integer' as const, min: 0, max: 4, step: 1 },
    { key: 'penaltyLapFraction', label: 'Rule Penalty', desc: 'Per unmet stop, in laps', format: 'decimal' as const, min: 0, max: 2, step: 0.1 },
    { key: 'slowStopMultiplier', label: 'Slow Stop Mult', desc: 'Slow stop time mult', format: 'multiplier' as const, min: 1.1, max: 4, step: 0.1 },
    { key: 'quickStopMultiplier', label: 'Quick Stop Mult', desc: 'Quick stop time mult', format: 'multiplier' as const, min: 0.3, max: 0.95, step: 0.05 },
    { key: 'slowStopBase', label: 'Slow Stop Base', desc: 'Base slow stop chance', format: 'percent' as const, min: 0.1, max: 0.7, step: 0.02 },
    { key: 'slowStopPerStar', label: 'Slow Stop/Star', desc: 'Slow stop reduction/star', format: 'decimal' as const, min: 0.02, max: 0.15, step: 0.01 },
    { key: 'quickStopBase', label: 'Quick Stop Base', desc: 'Base quick stop chance', format: 'percent' as const, min: 0, max: 0.2, step: 0.01 },
    { key: 'quickStopPerStar', label: 'Quick Stop/Star', desc: 'Quick stop bonus/star', format: 'decimal' as const, min: 0.02, max: 0.15, step: 0.01 },
    { key: 'lastPitLapBuffer', label: 'Last Pit Buffer', desc: 'No stop within N laps of finish', format: 'decimal' as const, min: 1, max: 4, step: 1 },
    { key: 'strategyWearLean', label: 'Strategy Lean', desc: 'Archetype wear-trigger lean (0=off)', format: 'percent' as const, min: 0, max: 0.25, step: 0.01 },
    { key: 'scPitChance', label: 'SC Pit Chance', desc: 'Cheap-stop roll under SC (0=off)', format: 'percent' as const, min: 0, max: 0.5, step: 0.02 },
    { key: 'scPitMinWear', label: 'SC Pit Min Wear', desc: 'Wear floor for an SC stop', format: 'decimal' as const, min: 5, max: 50, step: 5 },
  ];
  for (const v of pitVars) {
    vars.push({ category: 'Pit Stops', categoryIcon: 'race.pit_stop', path: `pits.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Performance
  const perfVars = [
    { key: 'luckProcChance', label: 'Luck Proc Chance', desc: 'Luck boost chance/tick', format: 'percent' as const, min: 0, max: 0.3, step: 0.005 },
    { key: 'luckMinBoostBase', label: 'Luck Min Base', desc: 'Base min luck boost', format: 'percent' as const, min: 0, max: 0.15, step: 0.01 },
    { key: 'luckMinBoostPerStat', label: 'Luck Min/Stat', desc: 'Min boost per luck point', format: 'decimal' as const, min: 0.05, max: 0.6, step: 0.025 },
    { key: 'luckMaxBoostBase', label: 'Luck Max Base', desc: 'Base max luck boost', format: 'percent' as const, min: 0.05, max: 0.3, step: 0.01 },
    { key: 'luckMaxBoostPerStat', label: 'Luck Max/Stat', desc: 'Max boost per luck point', format: 'decimal' as const, min: 0.1, max: 1.2, step: 0.025 },
    { key: 'enduranceDecay', label: 'Endurance Decay', desc: 'Base fatigue rate', format: 'percent' as const, min: 0, max: 0.3, step: 0.02 },
    { key: 'enduranceMaxPenalty', label: 'Max Fatigue', desc: 'Max fatigue penalty', format: 'percent' as const, min: 0.05, max: 0.5, step: 0.01 },
    { key: 'endurancePenaltyMultiplier', label: 'Endurance Mult', desc: 'Endurance penalty factor', format: 'decimal' as const, min: 0.2, max: 4, step: 0.1 },
    { key: 'damageSpeedPenalty', label: 'Damage Penalty', desc: 'Speed when damaged', format: 'percent' as const, min: 0.6, max: 0.95, step: 0.05 },
    { key: 'accelLaunchTicks', label: 'Accel Window', desc: 'Ticks accel matters (launch/pit exit/SC restart)', format: 'decimal' as const, min: 0, max: 300, step: 10 },
    { key: 'accelEffect', label: 'Accel Effect', desc: 'Accel stat strength in windows (0 = dormant)', format: 'decimal' as const, min: 0, max: 2, step: 0.1 },
    { key: 'aggressionTrafficBoost', label: 'Aggro Traffic Boost', desc: 'Aggression speed reward in traffic (0 = dormant)', format: 'percent' as const, min: 0, max: 0.3, step: 0.005 },
    { key: 'mistakeBaseChance', label: 'Mistake Chance', desc: '#82 per-tick error roll (0 = dormant)', format: 'decimal' as const, min: 0, max: 0.001, step: 0.00005 },
    { key: 'mistakeConsistencyWeight', label: 'Mistake Cons Wt', desc: 'Low consistency → more mistakes', format: 'decimal' as const, min: 0, max: 3, step: 0.25 },
    { key: 'mistakeAggressionWeight', label: 'Mistake Aggro Wt', desc: 'Aggression → more mistakes', format: 'decimal' as const, min: 0, max: 2, step: 0.25 },
    { key: 'mistakeDamageWeight', label: 'Mistake Damage Wt', desc: 'Damaged car → scrappier', format: 'decimal' as const, min: 0, max: 2, step: 0.25 },
    { key: 'mistakeSpeedPenalty', label: 'Mistake Penalty', desc: 'Speed multiplier while recovering', format: 'percent' as const, min: 0.6, max: 1, step: 0.05 },
    { key: 'mistakeDurationTicks', label: 'Mistake Duration', desc: 'Recovery window (ticks)', format: 'decimal' as const, min: 0, max: 400, step: 25 },
    { key: 'mistakeCooldownTicks', label: 'Mistake Cooldown', desc: 'Refractory window (ticks)', format: 'decimal' as const, min: 0, max: 600, step: 50 },
  ];
  for (const v of perfVars) {
    vars.push({ category: 'Performance', categoryIcon: 'stat.speed', path: `performance.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Car Stats
  const carStatVars = [
    { key: 'powerBase', label: 'Power Base', desc: 'Base power multiplier', format: 'decimal' as const, min: 0.7, max: 1, step: 0.02 },
    { key: 'powerPerStar', label: 'Power/Star', desc: 'Power added per star', format: 'decimal' as const, min: 0.005, max: 0.1, step: 0.0005 },
    { key: 'gripBase', label: 'Grip Base', desc: 'Base grip multiplier', format: 'decimal' as const, min: 0.3, max: 0.9, step: 0.025 },
    { key: 'gripPerStar', label: 'Grip/Star', desc: 'Grip added per star', format: 'decimal' as const, min: 0.025, max: 0.25, step: 0.01 },
    { key: 'reliabilityBase', label: 'Reliability Base', desc: 'Base reliability', format: 'decimal' as const, min: 0.2, max: 0.6, step: 0.05 },
    { key: 'reliabilityPerStar', label: 'Reliability/Star', desc: 'Reliability per star', format: 'decimal' as const, min: 0.1, max: 0.3, step: 0.05 },
    { key: 'tireManagementBase', label: 'Tire Mgmt Base', desc: 'Base tire management', format: 'decimal' as const, min: 0.6, max: 0.9, step: 0.025 },
    { key: 'tireManagementPerStar', label: 'Tire Mgmt/Star', desc: 'Tire mgmt per star', format: 'decimal' as const, min: 0.025, max: 0.15, step: 0.025 },
    { key: 'pitCrewBase', label: 'Pit Crew Base', desc: 'Base pit crew factor', format: 'decimal' as const, min: 0.3, max: 0.7, step: 0.02 },
    { key: 'pitCrewPerStar', label: 'Pit Crew/Star', desc: 'Pit crew per star', format: 'decimal' as const, min: 0.04, max: 0.15, step: 0.02 },
  ];
  for (const v of carStatVars) {
    vars.push({ category: 'Car Stats', categoryIcon: 'stat.power', path: `carStats.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Safety Car
  const scVars = [
    { key: 'targetGap', label: 'Target Gap', desc: 'Spacing between cars', format: 'percent' as const, min: 0.05, max: 0.3, step: 0.02 },
    { key: 'cruiseSpeed', label: 'Cruise Speed', desc: 'Normal SC speed', format: 'percent' as const, min: 0.3, max: 0.7, step: 0.05 },
    { key: 'catchUpSpeed', label: 'Catch Up Speed', desc: 'Speed catching SC', format: 'percent' as const, min: 0.5, max: 0.85, step: 0.05 },
    { key: 'unsafetyCarSpeed', label: 'Unsafety Speed', desc: 'Per-tick movement', format: 'decimal' as const, min: 0.001, max: 0.01, step: 0.0005 },
  ];
  for (const v of scVars) {
    vars.push({ category: 'Safety Car', categoryIcon: 'race.safety_car', path: `safetyCar.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Blowouts
  const blowoutVars = [
    { key: 'riskExponent', label: 'Risk Exponent', desc: 'Curve steepness', format: 'integer' as const, min: 1, max: 4, step: 1 },
    { key: 'riskMultiplier', label: 'Risk Multiplier', desc: 'Max risk mult', format: 'integer' as const, min: 1, max: 10, step: 1 },
    { key: 'aggressionBonus', label: 'Aggression Bonus', desc: 'Aggression blowout risk', format: 'percent' as const, min: 0, max: 1, step: 0.1 },
    { key: 'safetyCarReduction', label: 'SC Reduction', desc: 'Blowout reduction under SC', format: 'percent' as const, min: 0.01, max: 0.2, step: 0.01 },
  ];
  for (const v of blowoutVars) {
    vars.push({ category: 'Blowouts', categoryIcon: 'race.tire_failure', path: `blowouts.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Driver Speed (Field Compression)
  const speedVars = [
    { key: 'speedStatMultiplier', label: 'Speed Stat Effect', desc: 'How much speed stat matters (lower = compressed field)', format: 'decimal' as const, min: 0.05, max: 1.0, step: 0.005 },
    { key: 'consistencyWeight', label: 'Consistency Weight', desc: 'How much consistency reduces variance', format: 'decimal' as const, min: 0.1, max: 1.0, step: 0.05 },
    { key: 'baseSpeedMin', label: 'Base Speed Min', desc: 'Min random speed/tick', format: 'integer' as const, min: 1, max: 10, step: 1 },
    { key: 'baseSpeedMax', label: 'Base Speed Max', desc: 'Max random speed/tick', format: 'integer' as const, min: 5, max: 20, step: 1 },
  ];
  for (const v of speedVars) {
    vars.push({ category: 'Field Spread', categoryIcon: 'view.lapchart', path: `driverSpeed.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Grid (#246 pass 2)
  const gridVars = [
    { key: 'slotSpacing', label: 'Slot Spacing', desc: 'Stagger between grid slots (share of a lap)', format: 'decimal' as const, min: 0.001, max: 0.02, step: 0.001 },
    { key: 'qualiNoise', label: 'Quali Noise', desc: 'Qualifying lap noise (sd, share of pace)', format: 'decimal' as const, min: 0, max: 0.1, step: 0.005 },
    { key: 'qualiFlubChance', label: 'Quali Flub', desc: 'Chance a qualifying is ruined', format: 'percent' as const, min: 0, max: 0.3, step: 0.01 },
  ];
  for (const v of gridVars) {
    vars.push({ category: 'Grid', categoryIcon: 'race.finish', path: `grid.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Overtaking (#246 pass 3)
  const otVars = [
    { key: 'followGap', label: 'Follow Gap', desc: 'How close (share of a lap) counts as "on" the car ahead', format: 'decimal' as const, min: 0.001, max: 0.03, step: 0.001 },
    { key: 'dirtyAir', label: 'Dirty Air', desc: 'Pace lost sitting behind a car', format: 'percent' as const, min: 0, max: 0.1, step: 0.005 },
    { key: 'attemptBase', label: 'Pass Chance', desc: 'Per-tick chance of a pass at equal pace', format: 'decimal' as const, min: 0, max: 0.05, step: 0.001 },
    { key: 'paceWeight', label: 'Pace Weight', desc: 'How much a pace edge helps a pass', format: 'integer' as const, min: 0, max: 40, step: 1 },
    { key: 'tyreWeight', label: 'Tyre Weight', desc: 'How much fresher tyres help a pass', format: 'decimal' as const, min: 0, max: 3, step: 0.1 },
    { key: 'aggressionSwing', label: 'Aggression Swing', desc: 'How much aggression changes pass chance', format: 'decimal' as const, min: 0, max: 2, step: 0.1 },
    { key: 'defenderWeight', label: 'Defender Weight', desc: 'How much a consistent defender resists', format: 'decimal' as const, min: 0, max: 3, step: 0.1 },
    { key: 'battleTicks', label: 'Battle Ticks', desc: 'Ticks held up before it counts as a battle', format: 'integer' as const, min: 5, max: 60, step: 5 },
    { key: 'heldCrashFactor', label: 'Held Crash Factor', desc: 'Crash chance scale for a held-up pair', format: 'decimal' as const, min: 0, max: 1, step: 0.05 },
  ];
  for (const v of otVars) {
    vars.push({ category: 'Overtaking', categoryIcon: 'race.battle', path: `overtaking.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  return vars;
}

// Helper to get value from nested path
export function getValueByPath(obj: SimVariables, path: string): number {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    current = (current as Record<string, unknown>)[part];
  }
  return current as number;
}

// Helper to set value by nested path
export function setValueByPath(obj: SimVariables, path: string, value: number): SimVariables {
  const clone = cloneVariables(obj);
  const parts = path.split('.');
  let current: Record<string, unknown> = clone as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
  return clone;
}

export function formatValue(value: number, format: VarDef['format']): string {
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'multiplier':
      return `${value.toFixed(2)}x`;
    case 'integer':
      return Math.round(value).toString();
    case 'decimal':
    default:
      return value.toFixed(4).replace(/\.?0+$/, '');
  }
}

export const ALL_KNOBS: VarDef[] = buildVariableList();
export const KNOB_CATEGORIES = [...new Set(ALL_KNOBS.map(v => v.category))];
export function canonValue(path: string): number { return getValueByPath(CANON_VARIABLES, path); }
export { cloneVariables };
