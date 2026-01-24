import React, { useState } from 'react';
import { SimVariables, CANON_VARIABLES, cloneVariables, TireCompoundConfig } from './types';

interface SimLabVariablesProps {
  hereticVariables: SimVariables;
  onVariablesChange: (variables: SimVariables) => void;
  onReset: () => void;
}

// Variable metadata for display
interface VarMeta {
  key: string;
  label: string;
  description: string;
  format: 'percent' | 'decimal' | 'integer' | 'multiplier';
  min?: number;
  max?: number;
  step?: number;
}

// Tire compound variable definitions
const TIRE_VARS: VarMeta[] = [
  { key: 'speedBonus', label: 'Speed Bonus', description: 'Speed multiplier (1.0 = baseline)', format: 'multiplier', min: 0.8, max: 1.2, step: 0.01 },
  { key: 'wearRate', label: 'Wear Rate', description: 'Higher = faster degradation', format: 'decimal', min: 1, max: 8, step: 0.1 },
  { key: 'criticalAt', label: 'Cliff Start %', description: 'Wear % when tire cliff begins', format: 'integer', min: 50, max: 95, step: 1 },
  { key: 'cliffSeverity', label: 'Cliff Severity', description: 'How harsh the performance cliff is', format: 'decimal', min: 0.1, max: 1.0, step: 0.05 },
  { key: 'blowoutRisk', label: 'Blowout Risk', description: 'Base blowout chance per tick', format: 'decimal', min: 0, max: 0.01, step: 0.0001 },
];

const TIRE_GENERAL_VARS: VarMeta[] = [
  { key: 'precliffStart', label: 'Pre-cliff Start', description: 'Wear % when pre-cliff penalty begins', format: 'integer', min: 20, max: 60, step: 5 },
  { key: 'precliffMaxPenalty', label: 'Pre-cliff Max Penalty', description: 'Max speed loss before cliff', format: 'percent', min: 0, max: 0.15, step: 0.01 },
  { key: 'cliffExponent', label: 'Cliff Exponent', description: 'Exponential curve steepness', format: 'decimal', min: 1, max: 3, step: 0.1 },
  { key: 'cliffMultiplier', label: 'Cliff Multiplier', description: 'Cliff severity multiplier', format: 'decimal', min: 0.1, max: 1, step: 0.05 },
  { key: 'flatPenalty', label: 'Flat Penalty', description: 'Immediate penalty at critical', format: 'percent', min: 0, max: 0.15, step: 0.01 },
  { key: 'minSpeedFloor', label: 'Min Speed Floor', description: 'Minimum speed even with dead tires', format: 'percent', min: 0.4, max: 0.8, step: 0.05 },
  { key: 'aggressionWearMultiplier', label: 'Aggression Wear', description: 'How much aggression affects wear', format: 'decimal', min: 0, max: 1, step: 0.05 },
];

const CRASH_VARS: VarMeta[] = [
  { key: 'baseCrashChance', label: 'Base Crash Chance', description: 'Base probability per tick when in proximity', format: 'decimal', min: 0, max: 0.002, step: 0.0001 },
  { key: 'crashProximityThreshold', label: 'Proximity Threshold', description: 'Distance for crash risk (% of lap)', format: 'percent', min: 0.01, max: 0.1, step: 0.005 },
  { key: 'crashGracePeriod', label: 'Grace Period', description: 'Ticks before crashes can happen', format: 'integer', min: 0, max: 200, step: 10 },
  { key: 'initialSurvivalChance', label: 'Survival Chance', description: 'Chance to survive initial collision', format: 'percent', min: 0.1, max: 0.9, step: 0.05 },
  { key: 'pileupParticipationChance', label: 'Pileup Chance', description: 'Chance to join a pileup', format: 'percent', min: 0, max: 0.6, step: 0.05 },
  { key: 'pileupSurvivalChance', label: 'Pileup Survival', description: 'Chance to survive pileup with damage', format: 'percent', min: 0.1, max: 0.9, step: 0.05 },
  { key: 'secondaryAccidentMultiplier', label: 'Secondary Crash Mult', description: 'Multiplier for secondary accidents', format: 'integer', min: 1, max: 30, step: 1 },
  { key: 'consistencyFactor', label: 'Consistency Factor', description: 'Low consistency crash risk boost', format: 'decimal', min: 0, max: 1, step: 0.1 },
  { key: 'tireWearFactor', label: 'Tire Wear Factor', description: 'Divisor for tire wear crash modifier', format: 'integer', min: 50, max: 500, step: 25 },
  { key: 'luckReduction', label: 'Luck Reduction', description: 'Max luck crash reduction', format: 'percent', min: 0, max: 0.6, step: 0.05 },
  { key: 'safetyCarsReduction', label: 'SC Reduction', description: 'Crash reduction during safety car', format: 'percent', min: 0.01, max: 0.3, step: 0.01 },
];

const MECHANICAL_VARS: VarMeta[] = [
  { key: 'baseFailureChance', label: 'Base Failure Chance', description: 'Mechanical failure per tick', format: 'decimal', min: 0, max: 0.002, step: 0.0001 },
  { key: 'reliabilityBase', label: 'Reliability Base', description: 'Base reliability protection', format: 'decimal', min: 0.1, max: 0.8, step: 0.05 },
  { key: 'reliabilityPerStar', label: 'Reliability Per Star', description: 'Protection added per star', format: 'decimal', min: 0.05, max: 0.4, step: 0.05 },
  { key: 'luckBase', label: 'Luck Base', description: 'Base luck factor for failures', format: 'decimal', min: 1, max: 2, step: 0.1 },
  { key: 'luckMultiplier', label: 'Luck Multiplier', description: 'Luck reduction multiplier', format: 'decimal', min: 0.25, max: 1, step: 0.05 },
];

const PIT_VARS: VarMeta[] = [
  { key: 'basePitDuration', label: 'Base Pit Duration', description: 'Base pit stop ticks', format: 'integer', min: 30, max: 120, step: 5 },
  { key: 'slowStopMultiplier', label: 'Slow Stop Mult', description: 'Time multiplier for slow stops', format: 'multiplier', min: 1.1, max: 2.5, step: 0.1 },
  { key: 'quickStopMultiplier', label: 'Quick Stop Mult', description: 'Time multiplier for quick stops', format: 'multiplier', min: 0.5, max: 0.95, step: 0.05 },
  { key: 'slowStopBase', label: 'Slow Stop Base %', description: 'Base slow stop chance', format: 'percent', min: 0.1, max: 0.7, step: 0.02 },
  { key: 'slowStopPerStar', label: 'Slow Stop Per Star', description: 'Slow stop reduction per crew star', format: 'decimal', min: 0.02, max: 0.15, step: 0.01 },
  { key: 'quickStopBase', label: 'Quick Stop Base %', description: 'Base quick stop chance', format: 'percent', min: 0, max: 0.2, step: 0.01 },
  { key: 'quickStopPerStar', label: 'Quick Stop Per Star', description: 'Quick stop bonus per crew star', format: 'decimal', min: 0.02, max: 0.15, step: 0.01 },
  { key: 'basePitChance', label: 'Base Pit Chance', description: 'Base chance to pit in window', format: 'percent', min: 0.05, max: 0.5, step: 0.05 },
  { key: 'wearPitBonus', label: 'Wear Pit Bonus', description: 'Additional pit chance from wear', format: 'percent', min: 0.1, max: 0.6, step: 0.05 },
  { key: 'luckPitAdjustment', label: 'Luck Pit Adjust', description: 'Luck pit timing adjustment', format: 'decimal', min: 0.1, max: 0.8, step: 0.05 },
];

const PERFORMANCE_VARS: VarMeta[] = [
  { key: 'luckProcChance', label: 'Luck Proc Chance', description: 'Chance for luck boost per tick', format: 'percent', min: 0, max: 0.1, step: 0.005 },
  { key: 'luckMinBoostBase', label: 'Luck Min Boost Base', description: 'Base minimum luck boost', format: 'percent', min: 0, max: 0.15, step: 0.01 },
  { key: 'luckMinBoostPerStat', label: 'Luck Min Per Stat', description: 'Min boost per luck point', format: 'decimal', min: 0.05, max: 0.3, step: 0.025 },
  { key: 'luckMaxBoostBase', label: 'Luck Max Boost Base', description: 'Base maximum luck boost', format: 'percent', min: 0.05, max: 0.3, step: 0.01 },
  { key: 'luckMaxBoostPerStat', label: 'Luck Max Per Stat', description: 'Max boost per luck point', format: 'decimal', min: 0.1, max: 0.4, step: 0.025 },
  { key: 'enduranceDecay', label: 'Endurance Decay', description: 'Base fatigue rate', format: 'percent', min: 0, max: 0.3, step: 0.02 },
  { key: 'enduranceMaxPenalty', label: 'Max Fatigue Penalty', description: 'Maximum fatigue penalty', format: 'percent', min: 0.05, max: 0.3, step: 0.01 },
  { key: 'endurancePenaltyMultiplier', label: 'Endurance Penalty Mult', description: 'Endurance penalty factor', format: 'decimal', min: 0.2, max: 1, step: 0.1 },
  { key: 'damageSpeedPenalty', label: 'Damage Speed Penalty', description: 'Speed when damaged', format: 'percent', min: 0.6, max: 0.95, step: 0.05 },
];

const CAR_STAT_VARS: VarMeta[] = [
  { key: 'powerBase', label: 'Power Base', description: 'Base power multiplier', format: 'decimal', min: 0.7, max: 1, step: 0.02 },
  { key: 'powerPerStar', label: 'Power Per Star', description: 'Power added per star', format: 'decimal', min: 0.01, max: 0.1, step: 0.01 },
  { key: 'gripBase', label: 'Grip Base', description: 'Base grip multiplier', format: 'decimal', min: 0.6, max: 0.9, step: 0.025 },
  { key: 'gripPerStar', label: 'Grip Per Star', description: 'Grip added per star', format: 'decimal', min: 0.025, max: 0.15, step: 0.025 },
  { key: 'reliabilityBase', label: 'Reliability Base', description: 'Base reliability protection', format: 'decimal', min: 0.2, max: 0.6, step: 0.05 },
  { key: 'reliabilityPerStar', label: 'Reliability Per Star', description: 'Reliability per star', format: 'decimal', min: 0.1, max: 0.3, step: 0.05 },
  { key: 'tireManagementBase', label: 'Tire Mgmt Base', description: 'Base tire management', format: 'decimal', min: 0.6, max: 0.9, step: 0.025 },
  { key: 'tireManagementPerStar', label: 'Tire Mgmt Per Star', description: 'Tire management per star', format: 'decimal', min: 0.025, max: 0.15, step: 0.025 },
  { key: 'pitCrewBase', label: 'Pit Crew Base', description: 'Base pit crew factor', format: 'decimal', min: 0.3, max: 0.7, step: 0.02 },
  { key: 'pitCrewPerStar', label: 'Pit Crew Per Star', description: 'Pit crew per star reduction', format: 'decimal', min: 0.04, max: 0.15, step: 0.02 },
];

const SAFETY_CAR_VARS: VarMeta[] = [
  { key: 'targetGap', label: 'Target Gap', description: 'Target spacing between cars', format: 'percent', min: 0.05, max: 0.3, step: 0.02 },
  { key: 'cruiseSpeed', label: 'Cruise Speed', description: 'Normal SC speed', format: 'percent', min: 0.3, max: 0.7, step: 0.05 },
  { key: 'catchUpSpeed', label: 'Catch Up Speed', description: 'Speed when catching SC', format: 'percent', min: 0.5, max: 0.85, step: 0.05 },
  { key: 'unsafetyCarSpeed', label: 'Unsafety Car Speed', description: 'Per-tick movement speed', format: 'decimal', min: 0.001, max: 0.01, step: 0.0005 },
];

const BLOWOUT_VARS: VarMeta[] = [
  { key: 'riskExponent', label: 'Risk Exponent', description: 'Exponential curve steepness', format: 'integer', min: 1, max: 4, step: 1 },
  { key: 'riskMultiplier', label: 'Risk Multiplier', description: 'Max risk multiplier', format: 'integer', min: 1, max: 10, step: 1 },
  { key: 'aggressionBonus', label: 'Aggression Bonus', description: 'Aggression blowout risk boost', format: 'percent', min: 0, max: 1, step: 0.1 },
  { key: 'safetyCarReduction', label: 'SC Reduction', description: 'Blowout reduction during SC', format: 'percent', min: 0.01, max: 0.2, step: 0.01 },
];

function formatValue(value: number, format: VarMeta['format']): string {
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'multiplier':
      return `${value.toFixed(2)}x`;
    case 'integer':
      return value.toString();
    case 'decimal':
    default:
      return value.toFixed(4).replace(/\.?0+$/, '');
  }
}

interface VariableRowProps {
  meta: VarMeta;
  canonValue: number;
  hereticValue: number;
  onChange: (value: number) => void;
}

function VariableRow({ meta, canonValue, hereticValue, onChange }: VariableRowProps) {
  const isChanged = Math.abs(canonValue - hereticValue) > 0.0000001;
  const percentChange = canonValue !== 0 ? ((hereticValue - canonValue) / canonValue) * 100 : 0;

  return (
    <div className={`variable-row ${isChanged ? 'changed' : ''}`}>
      <div className="variable-info">
        <span className="variable-label">{meta.label}</span>
        <span className="variable-desc">{meta.description}</span>
      </div>
      <div className="variable-canon">
        <span className="canon-label">Canon</span>
        <span className="canon-value">{formatValue(canonValue, meta.format)}</span>
      </div>
      <div className="variable-heretic">
        <span className="heretic-label">Heretic</span>
        <input
          type="number"
          value={hereticValue}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={meta.min}
          max={meta.max}
          step={meta.step}
          className="heretic-input"
        />
      </div>
      <div className="variable-delta">
        {isChanged && (
          <span className={`delta-value ${percentChange > 0 ? 'positive' : 'negative'}`}>
            {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

interface TireCompoundPanelProps {
  label: string;
  emoji: string;
  canonConfig: TireCompoundConfig;
  hereticConfig: TireCompoundConfig;
  onChange: (key: keyof TireCompoundConfig, value: number) => void;
}

function TireCompoundPanel({ label, emoji, canonConfig, hereticConfig, onChange }: TireCompoundPanelProps) {
  return (
    <div className="tire-compound-panel">
      <h4>{emoji} {label}</h4>
      {TIRE_VARS.map(meta => (
        <VariableRow
          key={meta.key}
          meta={meta}
          canonValue={canonConfig[meta.key as keyof TireCompoundConfig]}
          hereticValue={hereticConfig[meta.key as keyof TireCompoundConfig]}
          onChange={(value) => onChange(meta.key as keyof TireCompoundConfig, value)}
        />
      ))}
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  emoji: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  changedCount?: number;
}

function CollapsibleSection({ title, emoji, children, defaultOpen = false, changedCount = 0 }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <button className="section-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="section-title">{emoji} {title}</span>
        {changedCount > 0 && <span className="changed-badge">{changedCount} changed</span>}
        <span className="section-toggle">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className="section-content">{children}</div>}
    </div>
  );
}

export function SimLabVariables({ hereticVariables, onVariablesChange, onReset }: SimLabVariablesProps) {
  const canon = CANON_VARIABLES;

  // Helper to update a nested value
  const updateValue = <K extends keyof SimVariables>(
    category: K,
    key: string,
    value: number
  ) => {
    const updated = cloneVariables(hereticVariables);
    (updated[category] as Record<string, unknown>)[key] = value;
    onVariablesChange(updated);
  };

  // Helper to update tire compound values
  const updateTireValue = (
    compound: 'soft' | 'medium' | 'hard',
    key: keyof TireCompoundConfig,
    value: number
  ) => {
    const updated = cloneVariables(hereticVariables);
    updated.tires[compound][key] = value;
    onVariablesChange(updated);
  };

  // Count changes per section
  const countChanges = <K extends keyof SimVariables>(category: K, vars: VarMeta[]): number => {
    return vars.filter(v => {
      const c = (canon[category] as Record<string, number>)[v.key];
      const h = (hereticVariables[category] as Record<string, number>)[v.key];
      return Math.abs(c - h) > 0.0000001;
    }).length;
  };

  const countTireChanges = (): number => {
    let count = 0;
    for (const compound of ['soft', 'medium', 'hard'] as const) {
      for (const meta of TIRE_VARS) {
        const c = canon.tires[compound][meta.key as keyof TireCompoundConfig];
        const h = hereticVariables.tires[compound][meta.key as keyof TireCompoundConfig];
        if (Math.abs(c - h) > 0.0000001) count++;
      }
    }
    // Count general tire vars (non-compound properties)
    for (const meta of TIRE_GENERAL_VARS) {
      const c = (canon.tires as unknown as Record<string, number>)[meta.key];
      const h = (hereticVariables.tires as unknown as Record<string, number>)[meta.key];
      if (Math.abs(c - h) > 0.0000001) count++;
    }
    return count;
  };

  const totalChanges = countTireChanges() +
    countChanges('crashes', CRASH_VARS) +
    countChanges('mechanical', MECHANICAL_VARS) +
    countChanges('pits', PIT_VARS) +
    countChanges('performance', PERFORMANCE_VARS) +
    countChanges('carStats', CAR_STAT_VARS) +
    countChanges('safetyCar', SAFETY_CAR_VARS) +
    countChanges('blowouts', BLOWOUT_VARS);

  return (
    <div className="simlab-variables">
      <div className="variables-header">
        <h2>Simulation Variables</h2>
        <div className="variables-actions">
          {totalChanges > 0 && (
            <span className="total-changes">{totalChanges} variable{totalChanges !== 1 ? 's' : ''} modified</span>
          )}
          <button className="reset-btn" onClick={onReset} disabled={totalChanges === 0}>
            Reset to Canon
          </button>
        </div>
      </div>

      <div className="variables-intro">
        <p>Edit values below to create your <strong>Heretic</strong> simulation. The sim will run both Canon (current game values) and Heretic (your changes) side-by-side for comparison.</p>
      </div>

      <div className="variables-sections">
        <CollapsibleSection title="Tire System" emoji="🛞" defaultOpen={true} changedCount={countTireChanges()}>
          <div className="tire-compounds">
            <TireCompoundPanel
              label="Soft"
              emoji="🔴"
              canonConfig={canon.tires.soft}
              hereticConfig={hereticVariables.tires.soft}
              onChange={(k, v) => updateTireValue('soft', k, v)}
            />
            <TireCompoundPanel
              label="Medium"
              emoji="🟡"
              canonConfig={canon.tires.medium}
              hereticConfig={hereticVariables.tires.medium}
              onChange={(k, v) => updateTireValue('medium', k, v)}
            />
            <TireCompoundPanel
              label="Hard"
              emoji="⚪"
              canonConfig={canon.tires.hard}
              hereticConfig={hereticVariables.tires.hard}
              onChange={(k, v) => updateTireValue('hard', k, v)}
            />
          </div>
          <div className="tire-general">
            <h4>General Tire Settings</h4>
            {TIRE_GENERAL_VARS.map(meta => (
              <VariableRow
                key={meta.key}
                meta={meta}
                canonValue={(canon.tires as unknown as Record<string, number>)[meta.key]}
                hereticValue={(hereticVariables.tires as unknown as Record<string, number>)[meta.key]}
                onChange={(v) => updateValue('tires', meta.key, v)}
              />
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Crash System" emoji="💥" changedCount={countChanges('crashes', CRASH_VARS)}>
          {CRASH_VARS.map(meta => (
            <VariableRow
              key={meta.key}
              meta={meta}
              canonValue={(canon.crashes as Record<string, number>)[meta.key]}
              hereticValue={(hereticVariables.crashes as Record<string, number>)[meta.key]}
              onChange={(v) => updateValue('crashes', meta.key, v)}
            />
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Mechanical Failures" emoji="🔧" changedCount={countChanges('mechanical', MECHANICAL_VARS)}>
          {MECHANICAL_VARS.map(meta => (
            <VariableRow
              key={meta.key}
              meta={meta}
              canonValue={(canon.mechanical as Record<string, number>)[meta.key]}
              hereticValue={(hereticVariables.mechanical as Record<string, number>)[meta.key]}
              onChange={(v) => updateValue('mechanical', meta.key, v)}
            />
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Pit Stops" emoji="🏁" changedCount={countChanges('pits', PIT_VARS)}>
          {PIT_VARS.map(meta => (
            <VariableRow
              key={meta.key}
              meta={meta}
              canonValue={(canon.pits as Record<string, number>)[meta.key]}
              hereticValue={(hereticVariables.pits as Record<string, number>)[meta.key]}
              onChange={(v) => updateValue('pits', meta.key, v)}
            />
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Performance Factors" emoji="⚡" changedCount={countChanges('performance', PERFORMANCE_VARS)}>
          {PERFORMANCE_VARS.map(meta => (
            <VariableRow
              key={meta.key}
              meta={meta}
              canonValue={(canon.performance as Record<string, number>)[meta.key]}
              hereticValue={(hereticVariables.performance as Record<string, number>)[meta.key]}
              onChange={(v) => updateValue('performance', meta.key, v)}
            />
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Car Stat Formulas" emoji="🏎️" changedCount={countChanges('carStats', CAR_STAT_VARS)}>
          {CAR_STAT_VARS.map(meta => (
            <VariableRow
              key={meta.key}
              meta={meta}
              canonValue={(canon.carStats as Record<string, number>)[meta.key]}
              hereticValue={(hereticVariables.carStats as Record<string, number>)[meta.key]}
              onChange={(v) => updateValue('carStats', meta.key, v)}
            />
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Safety Car" emoji="🚨" changedCount={countChanges('safetyCar', SAFETY_CAR_VARS)}>
          {SAFETY_CAR_VARS.map(meta => (
            <VariableRow
              key={meta.key}
              meta={meta}
              canonValue={(canon.safetyCar as Record<string, number>)[meta.key]}
              hereticValue={(hereticVariables.safetyCar as Record<string, number>)[meta.key]}
              onChange={(v) => updateValue('safetyCar', meta.key, v)}
            />
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Blowout System" emoji="💨" changedCount={countChanges('blowouts', BLOWOUT_VARS)}>
          {BLOWOUT_VARS.map(meta => (
            <VariableRow
              key={meta.key}
              meta={meta}
              canonValue={(canon.blowouts as Record<string, number>)[meta.key]}
              hereticValue={(hereticVariables.blowouts as Record<string, number>)[meta.key]}
              onChange={(v) => updateValue('blowouts', meta.key, v)}
            />
          ))}
        </CollapsibleSection>
      </div>
    </div>
  );
}
