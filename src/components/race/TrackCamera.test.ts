// The grandstand camera's frame (#778): where each car sits, which fold the rest, who it follows.
import { describe, it, expect } from 'vitest';
import type { Driver } from '../../RaceEngine';
import { CAMERA, cameraFrame, raceDistance } from './TrackCamera';

const LAP = 1000;
const car = (id: number, lap: number, position: number, status: Driver['status'] = 'racing', speedSmooth = 10): Driver =>
  ({ id, name: `Driver ${id}`, currentLap: lap, position, status, speedSmooth, color: 'var(--ace-ink)' } as unknown as Driver);

describe('raceDistance', () => {
  it('counts whole laps plus the way round this one', () => {
    expect(raceDistance(car(1, 2, 10), 100)).toBe(210);
    expect(raceDistance(car(1, 0, 0), 100)).toBe(0);
  });
});

describe('cameraFrame', () => {
  it('holds the followed car at the camera mark with no gap', () => {
    const f = cameraFrame([car(1, 3, 500), car(2, 3, 520)], LAP, 1);
    const me = f.cars.find(c => c.driver.id === 1)!;
    expect(me.x).toBeCloseTo(CAMERA.followAt * CAMERA.w);
    expect(me.gap).toBe(0);
    expect(f.follow?.id).toBe(1);
    expect(f.leaderId).toBe(2);
  });

  it('places the field by distance from the followed car and folds what is out of frame', () => {
    const f = cameraFrame([car(1, 3, 500), car(2, 3, 600), car(3, 3, 800), car(4, 3, 450), car(5, 2, 900)], LAP, 1);
    const at = (id: number) => f.cars.find(c => c.driver.id === id);
    // 100 units ahead is half a window: half the frame to the right.
    expect(at(2)!.x).toBeCloseTo(CAMERA.followAt * CAMERA.w + CAMERA.w / 2);
    expect(at(2)!.ahead).toBe(true);
    expect(at(2)!.gap).toBeCloseTo(100 / 10 / 10);
    // 300 ahead and 600 behind (a lap back) are out of frame; 50 behind is in.
    expect(at(3)).toBeUndefined();
    expect(at(5)).toBeUndefined();
    expect(f.aheadOut).toBe(1);
    expect(f.behindOut).toBe(1);
    expect(at(4)!.ahead).toBe(false);
  });

  it('gives a car on top of another the next lane back, and the pits their own', () => {
    const f = cameraFrame([car(1, 3, 500), car(2, 3, 502), car(3, 3, 504), car(4, 3, 530, 'pitting')], LAP, 1);
    const lanes = Object.fromEntries(f.cars.map(c => [c.driver.id, c.lane]));
    expect(lanes[3]).toBe(0); // the front of the field takes the near lane first
    expect(lanes[2]).toBe(1);
    expect(lanes[1]).toBe(2);
    expect(lanes[4]).toBe(4);
    // Drawn back to front: the pit road first, the near lane last.
    expect(f.cars[0].driver.id).toBe(4);
    expect(f.cars[f.cars.length - 1].lane).toBe(0);
  });

  it('falls back to your first running car, then the leader, and ignores cars out of the race', () => {
    const field = [car(1, 3, 100), car(2, 3, 900), car(3, 3, 950, 'dnf'), car(4, 3, 300)];
    expect(cameraFrame(field, LAP, undefined, [3, 4]).follow?.id).toBe(4);
    expect(cameraFrame(field, LAP, undefined, []).follow?.id).toBe(2);
    expect(cameraFrame(field, LAP, 3).follow?.id).toBe(2);
    expect(cameraFrame(field, LAP, 1).cars.some(c => c.driver.id === 3)).toBe(false);
    expect(cameraFrame([], LAP, 1).follow).toBeNull();
  });
});
