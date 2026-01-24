# Parabolica Tag System - Creative Brief

**Purpose:** Guide for designing new tags across all categories (Driver, Car, Team, Condition)

---

## How the Simulation Works

Every 100ms, each driver gets a speed calculation:

```
FINAL SPEED = Base Roll × Driver Stats × Car Stats × Tires × Tags × Track Effects
```

Tags modify this formula by adjusting **5 effect variables**:

| Effect | What It Does | Example |
|--------|--------------|---------|
| `speedModifier` | Direct speed multiplier | 1.08 = +8% faster |
| `consistencyModifier` | Reduces variance in lap times | 1.10 = +10% more consistent |
| `luckModifier` | Affects magnitude of luck boosts | 0.7 = -30% luck boost power |
| `crashResistance` | Additive crash chance modifier | -0.20 = +20% crash risk |
| `pitSpeedModifier` | Pit stop duration multiplier | 0.75 = 25% faster pits |

---

## Driver Stats (0.3 - 1.15 range)

| Stat | Range | What It Does |
|------|-------|--------------|
| **Base Speed** | 0.85-1.15 | Raw speed multiplier. The most direct stat. |
| **Consistency** | 0.3-0.8 | How reliable lap times are. High = steady, low = wildly variable. Also affects tire wear and crash risk. |
| **Luck** | 0.3-0.8 | Magnitude of luck boosts when they proc (3% chance per tick). High luck = bigger boosts. |
| **Acceleration** | 0.85-1.15 | Speed from rest and corner exits. Helps in traffic. |
| **Endurance** | 0.85-1.15 | Maintains speed over race distance. High = strong late. |
| **Aggression** | 0.3-0.8 | Risk-taking. Affects tire wear and crash probability. |

**Key insight:** Consistency and Luck are inverted - high consistency = predictable, high luck = high ceiling for random boosts.

---

## Car Stats (1-5 stars)

| Stat | Formula | Effect |
|------|---------|--------|
| **Power** | 0.88 + (stars × 0.04) | 1★=0.92x, 5★=1.08x speed |
| **Grip** | 0.775 + (stars × 0.075) | Multiplies driver consistency |
| **Reliability** | 0.4 + (stars × 0.2) | Reduces mechanical failure chance |

**Note:** Both drivers on a team share the same car stats.

---

## Team Stats (1-5 stars)

| Stat | Effect |
|------|--------|
| **Tire Management** | Pit window aggressiveness. Higher = faster but riskier strategy. |
| **Pit Crew** | 1★ = 35% slow stop / 8% quick stop. 5★ = 7% slow / 28% quick. |

---

## Tag Categories

### 1. Driver Tags
Personal abilities tied to the driver themselves. Currently 3, need more.

**Current:**
- Clutch Performer (final_lap): +8% speed, +15% consistency
- Rain Dancer (passive): +12% consistency, +30% crash resist
- Sunday Driver (passive): -5% speed early, builds over race

### 2. Car Tags
Vehicle characteristics shared by teammates. Currently 3, need more.

**Current:**
- Glass Cannon (passive): +6% speed, -25% crash resist
- Cursed Chassis (passive): -30% luck, -10% consistency
- Pit Lane Special (pit_stop): +25% faster pits

### 3. Team Tags
Organizational traits affecting both drivers. Currently 3, need more.

**Current:**
- Underdog Spirit (passive): +4% speed, +15% luck when behind
- Front Runners (passive): +10% consistency, +20% crash resist in top 5
- Chaotic Energy (race_start): -20% consistency, random speed modifier

### 4. Condition Tags
Applied by track events to specific drivers. Temporary. Currently 17.

**Categories:**
- **Hazard:** Low Visibility, Slippery Surface, Debris Hazard, Dust Cloud
- **Speed:** Adrenaline Surge, Slipstream Boost, Track Evolution, Headwind, Cooling Issues, Tire Graining
- **Focus:** Distracted, In The Zone, Rattled, Desperate Push
- **Pit:** Pit Congestion, Equipment Malfunction, Fast Hands

---

## Tag Triggers

| Trigger | When It Fires | Duration | Notes |
|---------|---------------|----------|-------|
| `passive` | Always active | Entire race | Logged once at start |
| `race_start` | First tick | ~200 ticks (~20 sec) | Good for "today's mood" effects |
| `pit_stop` | Enter pit lane | ~200 ticks | Pit-related bonuses |
| `overtake` | Gain positions | ~200 ticks | **UNUSED - design opportunity** |
| `crash_proximity` | Within 3% of another driver | ~200 ticks | **UNUSED - design opportunity** |
| `final_lap` | Enter final lap | ~200 ticks | Clutch moments |
| `track_event` | Applied by track | Variable (1-3 laps) | For condition tags only |

---

## Track Event System

Each track has one event that applies condition tags to drivers.

**Event Triggers:**
- `lap`: Specific laps (e.g., laps 5, 10)
- `interval`: Every N laps (e.g., every 4 laps)
- `random`: % chance per lap (e.g., 20% per lap)
- `halfway`: At race midpoint
- `final_laps`: Last N laps

**Event Targets:**
- `random`: N random drivers
- `leader`: P1 only
- `last`: Last place (or last N)
- `top`: Top N drivers
- `bottom`: Bottom N drivers

**Example:** The Mall track has "AC Breakdown" - every 4 laps, top 3 drivers get `cooling-issues` tag (-8% speed) for 2 laps.

---

## Simulation Variables Reference

These are the tunable constants that control race outcomes. From SimLab's Canon values:

### Tire System
| Compound | Speed Bonus | Wear Rate | Cliff At | Cliff Severity | Blowout Risk |
|----------|-------------|-----------|----------|----------------|--------------|
| Soft | +8% | 4.0 | 70% | 0.85 | 0.0015/tick |
| Medium | baseline | 2.8 | 75% | 0.50 | 0.0008/tick |
| Hard | -6% | 2.2 | 80% | 0.30 | 0.0003/tick |

### Crash System
- Base crash chance: 0.03% per tick when in proximity
- Proximity threshold: 3% of lap
- Survival chance: 40% to survive initial collision
- Luck can reduce crash chance by up to 30%

### Mechanical Failures
- Base failure: 0.04% per tick
- Reliability protects: 0.4 + (stars × 0.2)

### Pit Stops
- Base duration: 60 ticks
- Slow stop: 1.5x duration
- Quick stop: 0.75x duration

### Performance
- Luck proc: 3% per tick
- Luck boost range: 5-30% based on luck stat
- Max endurance penalty: 15%
- Damage speed penalty: 15%

---

## Design Guidelines

### What Makes a Good Tag

1. **Implies backstory** - "Cursed Chassis" makes you wonder *what happened*
2. **Creates decisions** - Glass Cannon forces risk/reward choices
3. **Synergizes or conflicts** - High aggression driver + Glass Cannon car = drama
4. **Has a moment** - Clutch Performer has a clear activation narrative

### Effect Ranges to Use

| Effect | Minor | Moderate | Major |
|--------|-------|----------|-------|
| Speed | ±3-4% | ±5-8% | ±10-15% |
| Consistency | ±5-8% | ±10-15% | ±20% |
| Luck | ±10-15% | ±20-30% | ±40% |
| Crash Resist | ±8-12% | ±15-20% | ±25-30% |
| Pit Speed | ±10-15% | ±20-25% | ±30-40% |

### Unexplored Design Space

**Unused triggers:**
- `overtake` - activate when passing someone
- `crash_proximity` - activate when near danger

**Combo effects not used:**
- Speed + negative pit speed (fast but bad pit stops)
- Luck + negative crash resist (lucky but fragile)
- Conditional effects based on position (different when leading vs chasing)

**Missing archetypes:**
- **Driver:** The veteran (endurance focus), the rookie (high variance), the strategist (pit timing)
- **Car:** The tank (crash resistant, slow), the fuel saver (endurance), the qualifier (fast early, fades)
- **Team:** The strategists (pit timing bonuses), the risk takers (all-or-nothing), the consistent (reduced variance)

---

## Current Tag Count

| Category | Count | Target |
|----------|-------|--------|
| Driver | 3 | 8-12 |
| Car | 3 | 8-12 |
| Team | 3 | 8-12 |
| Condition | 17 | 15-20 |

**Total tags needed: ~40-50**

---

## Deliverables Needed

For each new tag, provide:

1. **ID** (kebab-case): `calculated-risk`
2. **Name**: "Calculated Risk"
3. **Emoji**: Single emoji that captures the vibe
4. **Description**: One sentence explaining the effect
5. **Target**: driver / car / team
6. **Trigger**: When it activates
7. **Effects**: Which variables and by how much
8. **Trigger Chance** (optional): 0-1 probability
9. **Activation Text**: Flavor text for notifications

---

## Tone Reference

Parabolica is Blaseball-inspired absurdism meets racing. Tags should feel:

- **Evocative** - imply a story
- **Slightly ominous** - something's not quite right
- **Specific** - proper nouns, numbers, particulars
- **Racing-adjacent** - use the language of motorsport but twist it

Good: "The Incident at Turn 3", "Borrowed Chassis #7", "The Understeer Prophecy"
Bad: "Fast Car", "Good Driver", "Lucky Team"
