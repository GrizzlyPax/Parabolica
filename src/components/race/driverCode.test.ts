// #621: accented letters fold to their base letter instead of vanishing.
import { describe, it, expect } from 'vitest';
import { driverCode } from './driverCode';

describe('driver codes', () => {
  it('folds accents, drops apostrophes, takes the last word', () => {
    expect(driverCode('Diego López')).toBe('LOP');
    expect(driverCode('Ayşe Şahin')).toBe('SAH');
    expect(driverCode('Emre Yılmaz')).toBe('YIL');
    expect(driverCode("Niamh O'Neill")).toBe('ONE');
    expect(driverCode('Daan de Vries')).toBe('VRI');
    expect(driverCode('Piotr Wójcik')).toBe('WOJ');
    expect(driverCode('Zofia Kowałski')).toBe('KOW');
  });

  it('a short surname borrows from the word before; suffixes are skipped', () => {
    expect(driverCode('Hao Li')).toBe('OLI');
    expect(driverCode('Tyler Brooks Jr')).toBe('BRO');
    expect(driverCode('Ottoman')).toBe('OTT');
  });
});
