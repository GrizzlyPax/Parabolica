import { describe, it, expect } from 'vitest';
import { conditionsSections, sectionsToTsvRows } from './reportSections';
import { SimLabResults } from './types';

// Minimal fixture: only the fields conditionsSections reads.
function fixture(): SimLabResults {
  return {
    totalRaces: 100,
    weatherResults: {
      weathers: [
        { weatherId: 'clear', weatherName: 'Clear', weatherEmoji: '☀️', races: 60, driverRaces: 1320, dnfs: 290, crashes: 80, totalTicks: 135000 },
        { weatherId: 'rain', weatherName: 'Rain', weatherEmoji: '🌧️', races: 6, driverRaces: 132, dnfs: 35, crashes: 12, totalTicks: 14400 },
      ],
      reactiveTags: [
        { tagId: 'rain-dancer', tagName: 'Rain Dancer', tagEmoji: '🌧️', conditionId: 'rain', inAppearances: 10, inWins: 4, outAppearances: 90, outWins: 3 },
      ],
      tagWeatherMatrix: [
        { tagId: 'rain-dancer', tagName: 'Rain Dancer', tagEmoji: '🌧️', byWeather: [
          { weatherId: 'clear', appearances: 90, wins: 3 },
          { weatherId: 'rain', appearances: 10, wins: 4 },
        ] },
      ],
    },
    trackTagResults: {
      trackTags: [
        { tagId: 'hazardous', tagName: 'Hazardous', tagEmoji: '⚠️', races: 30, driverRaces: 660, dnfs: 160, crashes: 55, totalTicks: 69000, totalLeadChanges: 420 },
      ],
    },
  } as unknown as SimLabResults;
}

describe('conditions report sections (shared UI + export source)', () => {
  it('produces every conditions-layer section with consistent shape', () => {
    const sections = conditionsSections(fixture());
    const titles = sections.map(s => s.title);
    expect(titles).toEqual([
      'WEATHER DISTRIBUTION',
      'CONDITION-REACTIVE TAGS (in-condition vs out)',
      'TAG × WEATHER WIN%',
      'TRACK TAG PERFORMANCE',
    ]);
    // Every row matches its section's column count (table integrity)
    for (const s of sections) {
      for (const row of s.rows) {
        expect(row.length, `${s.title} row width`).toBe(s.columns.length);
      }
    }
  });

  it('computes the reactive swing and matrix cells correctly', () => {
    const sections = conditionsSections(fixture());
    const reactive = sections.find(s => s.title.startsWith('CONDITION-REACTIVE'))!;
    // in 4/10 = 40%, out 3/90 = 3.3%, swing +36.7%
    expect(reactive.rows[0]).toContain('40.0%');
    expect(reactive.rows[0]).toContain('+36.7%');

    const matrix = sections.find(s => s.title === 'TAG × WEATHER WIN%')!;
    expect(matrix.columns).toEqual(['Tag', 'clear', 'rain']);
    expect(matrix.rows[0]).toEqual(['🌧️ Rain Dancer', '3.3%', '40.0%']);
  });

  it('serializes to TSV with title, header, rows, and a blank separator', () => {
    const tsv = sectionsToTsvRows(conditionsSections(fixture()));
    expect(tsv).toContain('WEATHER DISTRIBUTION');
    expect(tsv).toContain('Weather\tRaces\t% of Races\tDNF%\tCrashes/Race\tAvg Ticks');
    expect(tsv.filter(r => r === '').length).toBe(4); // one blank per section
  });

  it('omits empty optional sections, keeps the distribution', () => {
    const empty = fixture();
    empty.weatherResults.reactiveTags = [];
    empty.weatherResults.tagWeatherMatrix = [];
    empty.trackTagResults.trackTags = [];
    const titles = conditionsSections(empty).map(s => s.title);
    expect(titles).toEqual(['WEATHER DISTRIBUTION']);
  });
});
