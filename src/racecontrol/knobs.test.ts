// #733: every knob on Physics calibration reads a live sim variable. A knob
// whose variable was retired (tyre lifeLaps, v0.6) made canonValue undefined
// and crashed the tab.
import { describe, it, expect } from 'vitest';
import { ALL_KNOBS, canonValue, formatValue } from './knobs';

describe('knobs (#733)', () => {
  it('every knob has a number canon value and formats', () => {
    for (const k of ALL_KNOBS) {
      expect(typeof canonValue(k.path), k.path).toBe('number');
      expect(() => formatValue(canonValue(k.path), k.format)).not.toThrow();
    }
  });
});
