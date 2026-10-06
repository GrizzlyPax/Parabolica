import { useState, useMemo } from 'react';
import { SimVariables, CANON_VARIABLES, cloneVariables } from './types';

interface SimLabVariablesProps {
  hereticVariables: SimVariables;
  onVariablesChange: (variables: SimVariables) => void;
  onReset: () => void;
}

// Variable metadata for display
interface VarDef {
  category: string;
  categoryEmoji: string;
  path: string;           // e.g., "tires.soft.speedBonus" or "crashes.baseCrashChance"
  label: string;
  description: string;
  format: 'percent' | 'decimal' | 'integer' | 'multiplier';
  min: number;
  max: number;
  step: number;
}

// Build flat list of all variables
function buildVariableList(): VarDef[] {
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
    const emoji = compound === 'soft' ? '🔴' : compound === 'medium' ? '🟡' : '⚪';
    for (const v of tireCompoundVars) {
      vars.push({
        category: `Tires (${compound})`,
        categoryEmoji: emoji,
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
    { key: 'teamTireMgmtWearPerStar', label: 'Tire Mgmt Wear/Star', desc: 'Team tire mgmt wear scaling, 3★ neutral (0 = dormant)', format: 'decimal' as const, min: 0, max: 0.15, step: 0.01 },
  ];
  for (const v of tireGeneralVars) {
    vars.push({ category: 'Tires (general)', categoryEmoji: '🛞', path: `tires.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
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
    vars.push({ category: 'Crashes', categoryEmoji: '💥', path: `crashes.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Mechanical
  const mechVars = [
    { key: 'baseFailureChance', label: 'Base Failure', desc: 'Mechanical failure/tick', format: 'decimal' as const, min: 0, max: 0.002, step: 0.0001 },
    { key: 'reliabilityBase', label: 'Reliability Base', desc: 'Base protection', format: 'decimal' as const, min: 0.1, max: 0.8, step: 0.05 },
    { key: 'reliabilityPerStar', label: 'Reliability/Star', desc: 'Protection per star', format: 'decimal' as const, min: 0.05, max: 0.4, step: 0.05 },
    { key: 'luckBase', label: 'Luck Base', desc: 'Base luck factor', format: 'decimal' as const, min: 1, max: 2, step: 0.1 },
    { key: 'luckMultiplier', label: 'Luck Multiplier', desc: 'Luck reduction mult', format: 'decimal' as const, min: 0.25, max: 1, step: 0.05 },
  ];
  for (const v of mechVars) {
    vars.push({ category: 'Mechanical', categoryEmoji: '🔧', path: `mechanical.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Pits
  const pitVars = [
    { key: 'basePitDuration', label: 'Base Duration', desc: 'Stationary pit work, ticks', format: 'integer' as const, min: 10, max: 120, step: 2 },
    { key: 'minStops', label: 'Min Stops', desc: 'Stop rule: stops required (0 = no rule)', format: 'integer' as const, min: 0, max: 4, step: 1 },
    { key: 'penaltyLapFraction', label: 'Rule Penalty', desc: 'Per unmet stop, in laps', format: 'decimal' as const, min: 0, max: 2, step: 0.1 },
    { key: 'slowStopMultiplier', label: 'Slow Stop Mult', desc: 'Slow stop time mult', format: 'multiplier' as const, min: 1.1, max: 2.5, step: 0.1 },
    { key: 'quickStopMultiplier', label: 'Quick Stop Mult', desc: 'Quick stop time mult', format: 'multiplier' as const, min: 0.5, max: 0.95, step: 0.05 },
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
    vars.push({ category: 'Pit Stops', categoryEmoji: '🏁', path: `pits.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Performance
  const perfVars = [
    { key: 'luckProcChance', label: 'Luck Proc Chance', desc: 'Luck boost chance/tick', format: 'percent' as const, min: 0, max: 0.1, step: 0.005 },
    { key: 'luckMinBoostBase', label: 'Luck Min Base', desc: 'Base min luck boost', format: 'percent' as const, min: 0, max: 0.15, step: 0.01 },
    { key: 'luckMinBoostPerStat', label: 'Luck Min/Stat', desc: 'Min boost per luck point', format: 'decimal' as const, min: 0.05, max: 0.3, step: 0.025 },
    { key: 'luckMaxBoostBase', label: 'Luck Max Base', desc: 'Base max luck boost', format: 'percent' as const, min: 0.05, max: 0.3, step: 0.01 },
    { key: 'luckMaxBoostPerStat', label: 'Luck Max/Stat', desc: 'Max boost per luck point', format: 'decimal' as const, min: 0.1, max: 0.4, step: 0.025 },
    { key: 'enduranceDecay', label: 'Endurance Decay', desc: 'Base fatigue rate', format: 'percent' as const, min: 0, max: 0.3, step: 0.02 },
    { key: 'enduranceMaxPenalty', label: 'Max Fatigue', desc: 'Max fatigue penalty', format: 'percent' as const, min: 0.05, max: 0.3, step: 0.01 },
    { key: 'endurancePenaltyMultiplier', label: 'Endurance Mult', desc: 'Endurance penalty factor', format: 'decimal' as const, min: 0.2, max: 1, step: 0.1 },
    { key: 'damageSpeedPenalty', label: 'Damage Penalty', desc: 'Speed when damaged', format: 'percent' as const, min: 0.6, max: 0.95, step: 0.05 },
    { key: 'accelLaunchTicks', label: 'Accel Window', desc: 'Ticks accel matters (launch/pit exit/SC restart)', format: 'decimal' as const, min: 0, max: 300, step: 10 },
    { key: 'accelEffect', label: 'Accel Effect', desc: 'Accel stat strength in windows (0 = dormant)', format: 'decimal' as const, min: 0, max: 2, step: 0.1 },
    { key: 'aggressionTrafficBoost', label: 'Aggro Traffic Boost', desc: 'Aggression speed reward in traffic (0 = dormant)', format: 'percent' as const, min: 0, max: 0.15, step: 0.005 },
    { key: 'mistakeBaseChance', label: 'Mistake Chance', desc: '#82 per-tick error roll (0 = dormant)', format: 'decimal' as const, min: 0, max: 0.001, step: 0.00005 },
    { key: 'mistakeConsistencyWeight', label: 'Mistake Cons Wt', desc: 'Low consistency → more mistakes', format: 'decimal' as const, min: 0, max: 3, step: 0.25 },
    { key: 'mistakeAggressionWeight', label: 'Mistake Aggro Wt', desc: 'Aggression → more mistakes', format: 'decimal' as const, min: 0, max: 2, step: 0.25 },
    { key: 'mistakeDamageWeight', label: 'Mistake Damage Wt', desc: 'Damaged car → scrappier', format: 'decimal' as const, min: 0, max: 2, step: 0.25 },
    { key: 'mistakeSpeedPenalty', label: 'Mistake Penalty', desc: 'Speed multiplier while recovering', format: 'percent' as const, min: 0.6, max: 1, step: 0.05 },
    { key: 'mistakeDurationTicks', label: 'Mistake Duration', desc: 'Recovery window (ticks)', format: 'decimal' as const, min: 0, max: 400, step: 25 },
    { key: 'mistakeCooldownTicks', label: 'Mistake Cooldown', desc: 'Refractory window (ticks)', format: 'decimal' as const, min: 0, max: 600, step: 50 },
  ];
  for (const v of perfVars) {
    vars.push({ category: 'Performance', categoryEmoji: '⚡', path: `performance.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Car Stats
  const carStatVars = [
    { key: 'powerBase', label: 'Power Base', desc: 'Base power multiplier', format: 'decimal' as const, min: 0.7, max: 1, step: 0.02 },
    { key: 'powerPerStar', label: 'Power/Star', desc: 'Power added per star', format: 'decimal' as const, min: 0.01, max: 0.1, step: 0.01 },
    { key: 'gripBase', label: 'Grip Base', desc: 'Base grip multiplier', format: 'decimal' as const, min: 0.6, max: 0.9, step: 0.025 },
    { key: 'gripPerStar', label: 'Grip/Star', desc: 'Grip added per star', format: 'decimal' as const, min: 0.025, max: 0.15, step: 0.025 },
    { key: 'reliabilityBase', label: 'Reliability Base', desc: 'Base reliability', format: 'decimal' as const, min: 0.2, max: 0.6, step: 0.05 },
    { key: 'reliabilityPerStar', label: 'Reliability/Star', desc: 'Reliability per star', format: 'decimal' as const, min: 0.1, max: 0.3, step: 0.05 },
    { key: 'tireManagementBase', label: 'Tire Mgmt Base', desc: 'Base tire management', format: 'decimal' as const, min: 0.6, max: 0.9, step: 0.025 },
    { key: 'tireManagementPerStar', label: 'Tire Mgmt/Star', desc: 'Tire mgmt per star', format: 'decimal' as const, min: 0.025, max: 0.15, step: 0.025 },
    { key: 'pitCrewBase', label: 'Pit Crew Base', desc: 'Base pit crew factor', format: 'decimal' as const, min: 0.3, max: 0.7, step: 0.02 },
    { key: 'pitCrewPerStar', label: 'Pit Crew/Star', desc: 'Pit crew per star', format: 'decimal' as const, min: 0.04, max: 0.15, step: 0.02 },
  ];
  for (const v of carStatVars) {
    vars.push({ category: 'Car Stats', categoryEmoji: '🏎️', path: `carStats.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Safety Car
  const scVars = [
    { key: 'targetGap', label: 'Target Gap', desc: 'Spacing between cars', format: 'percent' as const, min: 0.05, max: 0.3, step: 0.02 },
    { key: 'cruiseSpeed', label: 'Cruise Speed', desc: 'Normal SC speed', format: 'percent' as const, min: 0.3, max: 0.7, step: 0.05 },
    { key: 'catchUpSpeed', label: 'Catch Up Speed', desc: 'Speed catching SC', format: 'percent' as const, min: 0.5, max: 0.85, step: 0.05 },
    { key: 'unsafetyCarSpeed', label: 'Unsafety Speed', desc: 'Per-tick movement', format: 'decimal' as const, min: 0.001, max: 0.01, step: 0.0005 },
  ];
  for (const v of scVars) {
    vars.push({ category: 'Safety Car', categoryEmoji: '🚨', path: `safetyCar.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Blowouts
  const blowoutVars = [
    { key: 'riskExponent', label: 'Risk Exponent', desc: 'Curve steepness', format: 'integer' as const, min: 1, max: 4, step: 1 },
    { key: 'riskMultiplier', label: 'Risk Multiplier', desc: 'Max risk mult', format: 'integer' as const, min: 1, max: 10, step: 1 },
    { key: 'aggressionBonus', label: 'Aggression Bonus', desc: 'Aggression blowout risk', format: 'percent' as const, min: 0, max: 1, step: 0.1 },
    { key: 'safetyCarReduction', label: 'SC Reduction', desc: 'Blowout reduction under SC', format: 'percent' as const, min: 0.01, max: 0.2, step: 0.01 },
  ];
  for (const v of blowoutVars) {
    vars.push({ category: 'Blowouts', categoryEmoji: '💨', path: `blowouts.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Driver Speed (Field Compression)
  const speedVars = [
    { key: 'speedStatMultiplier', label: 'Speed Stat Effect', desc: 'How much speed stat matters (lower = compressed field)', format: 'decimal' as const, min: 0.1, max: 1.0, step: 0.05 },
    { key: 'consistencyWeight', label: 'Consistency Weight', desc: 'How much consistency reduces variance', format: 'decimal' as const, min: 0.1, max: 1.0, step: 0.05 },
    { key: 'baseSpeedMin', label: 'Base Speed Min', desc: 'Min random speed/tick', format: 'integer' as const, min: 1, max: 10, step: 1 },
    { key: 'baseSpeedMax', label: 'Base Speed Max', desc: 'Max random speed/tick', format: 'integer' as const, min: 5, max: 20, step: 1 },
  ];
  for (const v of speedVars) {
    vars.push({ category: 'Field Spread', categoryEmoji: '📊', path: `driverSpeed.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Betting Odds (Marble Mode) - Strength Weights
  const bettingStrengthVars = [
    { key: 'carPower', label: 'Car Power Weight', desc: 'How much car power affects odds ranking', format: 'decimal' as const, min: 0, max: 0.5, step: 0.01 },
    { key: 'consistency', label: 'Consistency Weight', desc: 'How much consistency affects odds ranking', format: 'decimal' as const, min: 0, max: 0.5, step: 0.01 },
    { key: 'speed', label: 'Speed Weight', desc: 'How much speed affects odds ranking', format: 'decimal' as const, min: 0, max: 0.5, step: 0.01 },
    { key: 'pitCrew', label: 'Pit Crew Weight', desc: 'How much pit crew affects odds ranking', format: 'decimal' as const, min: 0, max: 0.3, step: 0.01 },
    { key: 'carGrip', label: 'Car Grip Weight', desc: 'How much car grip affects odds ranking', format: 'decimal' as const, min: 0, max: 0.3, step: 0.01 },
    { key: 'luck', label: 'Luck Weight', desc: 'How much luck affects odds ranking', format: 'decimal' as const, min: 0, max: 0.3, step: 0.01 },
    { key: 'carReliability', label: 'Reliability Weight', desc: 'How much car reliability affects odds ranking', format: 'decimal' as const, min: 0, max: 0.3, step: 0.01 },
  ];
  for (const v of bettingStrengthVars) {
    vars.push({ category: 'Betting (Strength)', categoryEmoji: '🎲', path: `betting.strengthWeights.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Betting Odds - Base Multipliers
  const bettingMultiplierVars = [
    { key: 'win', label: 'Win Base', desc: 'Base payout for picking the winner', format: 'multiplier' as const, min: 5, max: 20, step: 1 },
    { key: 'podium', label: 'Podium Base', desc: 'Base payout for top 3 finish', format: 'multiplier' as const, min: 2, max: 10, step: 0.5 },
    { key: 'points', label: 'Points Base', desc: 'Base payout for top 10 finish', format: 'multiplier' as const, min: 1, max: 5, step: 0.25 },
    { key: 'finishes', label: 'Finishes Base', desc: 'Base payout for completing race', format: 'multiplier' as const, min: 1, max: 3, step: 0.1 },
    { key: 'dnf', label: 'DNF Base', desc: 'Base payout for calling a DNF', format: 'multiplier' as const, min: 1, max: 8, step: 0.5 },
  ];
  for (const v of bettingMultiplierVars) {
    vars.push({ category: 'Betting (Payouts)', categoryEmoji: '🪙', path: `betting.baseMultipliers.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  // Betting Odds - Driver Rating Weights
  const bettingRatingVars = [
    { key: 'consistency', label: 'Rating: Consistency', desc: 'Consistency weight for vibe rating', format: 'decimal' as const, min: 0, max: 0.7, step: 0.05 },
    { key: 'speed', label: 'Rating: Speed', desc: 'Speed weight for vibe rating', format: 'decimal' as const, min: 0, max: 0.7, step: 0.05 },
    { key: 'luck', label: 'Rating: Luck', desc: 'Luck weight for vibe rating', format: 'decimal' as const, min: 0, max: 0.5, step: 0.05 },
  ];
  for (const v of bettingRatingVars) {
    vars.push({ category: 'Betting (Rating)', categoryEmoji: '⭐', path: `betting.driverRatingWeights.${v.key}`, label: v.label, description: v.desc, format: v.format, min: v.min, max: v.max, step: v.step });
  }

  return vars;
}

const ALL_VARIABLES = buildVariableList();

// Get unique categories
const CATEGORIES = [...new Set(ALL_VARIABLES.map(v => v.category))];

// Helper to get value from nested path
function getValueByPath(obj: SimVariables, path: string): number {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    current = (current as Record<string, unknown>)[part];
  }
  return current as number;
}

// Helper to set value by nested path
function setValueByPath(obj: SimVariables, path: string, value: number): SimVariables {
  const clone = cloneVariables(obj);
  const parts = path.split('.');
  let current: Record<string, unknown> = clone as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
  return clone;
}

function formatValue(value: number, format: VarDef['format']): string {
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

export function SimLabVariables({ hereticVariables, onVariablesChange, onReset }: SimLabVariablesProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showChangedOnly, setShowChangedOnly] = useState(false);

  // Calculate which variables have changed
  const changedPaths = useMemo(() => {
    const changed = new Set<string>();
    for (const v of ALL_VARIABLES) {
      const canonVal = getValueByPath(CANON_VARIABLES, v.path);
      const hereticVal = getValueByPath(hereticVariables, v.path);
      if (Math.abs(canonVal - hereticVal) > 0.0000001) {
        changed.add(v.path);
      }
    }
    return changed;
  }, [hereticVariables]);

  const totalChanges = changedPaths.size;

  // Filter variables
  const filteredVars = useMemo(() => {
    return ALL_VARIABLES.filter(v => {
      // Category filter
      if (categoryFilter !== 'all' && v.category !== categoryFilter) return false;
      // Search filter
      if (search) {
        const s = search.toLowerCase();
        if (!v.label.toLowerCase().includes(s) &&
            !v.description.toLowerCase().includes(s) &&
            !v.path.toLowerCase().includes(s) &&
            !v.category.toLowerCase().includes(s)) {
          return false;
        }
      }
      // Changed only filter
      if (showChangedOnly && !changedPaths.has(v.path)) return false;
      return true;
    });
  }, [categoryFilter, search, showChangedOnly, changedPaths]);

  // Export heretic as JSON
  const handleExport = () => {
    const json = JSON.stringify(hereticVariables, null, 2);
    navigator.clipboard.writeText(json);
    alert('Heretic variables copied to clipboard as JSON!');
  };

  // Import heretic from JSON (deep merge to support partial presets)
  const handleImport = () => {
    const json = prompt('Paste JSON variables:');
    if (json) {
      try {
        const parsed = JSON.parse(json) as Partial<SimVariables>;
        // Deep merge: start with current heretic, overlay imported values
        const merged = cloneVariables(hereticVariables);
        for (const [section, values] of Object.entries(parsed)) {
          if (typeof values === 'object' && values !== null && section in merged) {
            const target = merged[section as keyof SimVariables];
            if (typeof target === 'object' && target !== null) {
              Object.assign(target, values);
            }
          }
        }
        onVariablesChange(merged);
      } catch {
        alert('Invalid JSON!');
      }
    }
  };

  // Export changes only as compact format
  const handleExportChanges = () => {
    const changes: Record<string, number> = {};
    for (const path of changedPaths) {
      changes[path] = getValueByPath(hereticVariables, path);
    }
    navigator.clipboard.writeText(JSON.stringify(changes, null, 2));
    alert(`${changedPaths.size} changes copied to clipboard!`);
  };

  // Count changes per category
  const categoryChangeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of ALL_VARIABLES) {
      if (!counts[v.category]) counts[v.category] = 0;
      if (changedPaths.has(v.path)) counts[v.category]++;
    }
    return counts;
  }, [changedPaths]);

  return (
    <div className="simlab-variables spreadsheet">
      <div className="variables-header">
        <h2>Simulation Variables</h2>
        <div className="variables-actions">
          {totalChanges > 0 && (
            <span className="total-changes">{totalChanges} changed</span>
          )}
          <button className="action-btn" onClick={handleExportChanges} disabled={totalChanges === 0} title="Copy changes only">
            📋 Copy Changes
          </button>
          <button className="action-btn" onClick={handleExport} title="Copy full Heretic config">
            💾 Export
          </button>
          <button className="action-btn" onClick={handleImport} title="Import Heretic config">
            📂 Import
          </button>
          <button className="reset-btn" onClick={onReset} disabled={totalChanges === 0}>
            Reset
          </button>
        </div>
      </div>

      <div className="variables-filters">
        <input
          type="text"
          className="search-input"
          placeholder="Search variables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showChangedOnly}
              onChange={(e) => setShowChangedOnly(e.target.checked)}
            />
            Changed only
          </label>
          <select
            className="category-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories ({ALL_VARIABLES.length})</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat} ({ALL_VARIABLES.filter(v => v.category === cat).length})
                {categoryChangeCounts[cat] > 0 ? ` [${categoryChangeCounts[cat]} changed]` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="variables-table-container">
        <table className="variables-table">
          <thead>
            <tr>
              <th className="col-category">Category</th>
              <th className="col-variable">Variable</th>
              <th className="col-desc">Description</th>
              <th className="col-canon">Canon</th>
              <th className="col-heretic">Heretic</th>
              <th className="col-delta">Δ</th>
            </tr>
          </thead>
          <tbody>
            {filteredVars.map(v => {
              const canonVal = getValueByPath(CANON_VARIABLES, v.path);
              const hereticVal = getValueByPath(hereticVariables, v.path);
              const isChanged = changedPaths.has(v.path);
              const delta = canonVal !== 0 ? ((hereticVal - canonVal) / canonVal) * 100 : 0;

              return (
                <tr key={v.path} className={isChanged ? 'changed' : ''}>
                  <td className="col-category">
                    <span className="category-badge">{v.categoryEmoji} {v.category}</span>
                  </td>
                  <td className="col-variable">{v.label}</td>
                  <td className="col-desc">{v.description}</td>
                  <td className="col-canon">{formatValue(canonVal, v.format)}</td>
                  <td className="col-heretic">
                    <input
                      type="number"
                      value={hereticVal}
                      onChange={(e) => {
                        const newVal = parseFloat(e.target.value);
                        if (!isNaN(newVal)) {
                          onVariablesChange(setValueByPath(hereticVariables, v.path, newVal));
                        }
                      }}
                      min={v.min}
                      max={v.max}
                      step={v.step}
                      className="heretic-input"
                    />
                  </td>
                  <td className={`col-delta ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : ''}`}>
                    {isChanged ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredVars.length === 0 && (
          <div className="no-results">No variables match your filters</div>
        )}
      </div>
      <div className="variables-footer">
        Showing {filteredVars.length} of {ALL_VARIABLES.length} variables
      </div>
    </div>
  );
}
