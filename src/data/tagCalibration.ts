// The committed tag calibration (src/data/tagCalibration.json), typed.
// Regenerate with `npm run calibrate`; src/data/worldDeck.test.ts fails when a
// genesis tag is missing, its effects changed since the run, or it sits out
// of band. The World Deck and Race Control read it from here.
import raw from './tagCalibration.json';
import type { CalibrationFile, TagCalibration } from '../racecontrol/calibrate';

export const TAG_CALIBRATION: CalibrationFile = raw as CalibrationFile;

const byId = new Map(TAG_CALIBRATION.tags.map(t => [t.tagId, t]));

export function calibrationFor(tagId: string): TagCalibration | undefined {
  return byId.get(tagId);
}
