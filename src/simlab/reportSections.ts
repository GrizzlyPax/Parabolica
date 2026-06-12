// Shared report sections — the single source of truth for conditions-layer
// reporting (weather, tag × weather, track tags). Both the on-screen
// Conditions tab (SimLabResults) and the copy-to-clipboard TSV (SimLab)
// render from these definitions, so a new section added here appears in both.
// Pure functions of SimLabResults; no React, no DOM.

import { SimLabResults } from './types';

export interface ReportSection {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  /** Shown under the title in the UI (omitted from the TSV). */
  note?: string;
}

const pct = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : '—');

/** All conditions-layer sections, in display order. */
export function conditionsSections(data: SimLabResults): ReportSection[] {
  const sections: ReportSection[] = [];

  // --- Weather distribution ---
  sections.push({
    title: 'WEATHER DISTRIBUTION',
    note: 'How often each weather rolled, and how it bent the field.',
    columns: ['Weather', 'Races', '% of Races', 'DNF%', 'Crashes/Race', 'Avg Ticks'],
    rows: data.weatherResults.weathers.map(w => [
      `${w.weatherEmoji} ${w.weatherName}`,
      w.races,
      pct(w.races, data.totalRaces),
      pct(w.dnfs, w.driverRaces),
      w.races > 0 ? (w.crashes / w.races).toFixed(2) : '—',
      w.races > 0 ? Math.round(w.totalTicks / w.races) : '—',
    ]),
  });

  // --- Condition-reactive tags (in vs out of their condition) ---
  if (data.weatherResults.reactiveTags.length > 0) {
    sections.push({
      title: 'CONDITION-REACTIVE TAGS (in-condition vs out)',
      note: 'Tags gated on a condition (weather- or track-stamped): win rate with the gate open vs closed.',
      columns: ['Tag', 'Condition', 'In Appear', 'In Win%', 'Out Appear', 'Out Win%', 'Swing'],
      rows: data.weatherResults.reactiveTags.map(rt => {
        const inWin = rt.inAppearances > 0 ? (rt.inWins / rt.inAppearances) * 100 : 0;
        const outWin = rt.outAppearances > 0 ? (rt.outWins / rt.outAppearances) * 100 : 0;
        return [
          `${rt.tagEmoji} ${rt.tagName}`,
          rt.conditionId,
          rt.inAppearances,
          `${inWin.toFixed(1)}%`,
          rt.outAppearances,
          `${outWin.toFixed(1)}%`,
          `${inWin - outWin >= 0 ? '+' : ''}${(inWin - outWin).toFixed(1)}%`,
        ];
      }),
    });
  }

  // --- Tag × weather win% matrix ---
  if (data.weatherResults.tagWeatherMatrix.length > 0) {
    const cols = data.weatherResults.weathers.map(w => w.weatherId); // frequency order
    sections.push({
      title: 'TAG × WEATHER WIN%',
      note: 'Every tag\'s win rate by weather. Rare-weather cells are small-sample.',
      columns: ['Tag', ...cols],
      rows: data.weatherResults.tagWeatherMatrix.map(tw => {
        const byId = new Map(tw.byWeather.map(c => [c.weatherId, c]));
        return [
          `${tw.tagEmoji} ${tw.tagName}`,
          ...cols.map(id => {
            const c = byId.get(id);
            return c && c.appearances > 0 ? pct(c.wins, c.appearances) : '—';
          }),
        ];
      }),
    });
  }

  // --- Track tag performance (race-level: field-wide character) ---
  if (data.trackTagResults.trackTags.length > 0) {
    sections.push({
      title: 'TRACK TAG PERFORMANCE',
      note: 'Track tags are field-wide — the signal is how they bend whole races, not who wins.',
      columns: ['Track Tag', 'Races', 'DNF%', 'Crashes/Race', 'Lead Changes/Race', 'Avg Ticks'],
      rows: data.trackTagResults.trackTags.map(tt => [
        `${tt.tagEmoji} ${tt.tagName}`,
        tt.races,
        pct(tt.dnfs, tt.driverRaces),
        tt.races > 0 ? (tt.crashes / tt.races).toFixed(2) : '—',
        tt.races > 0 ? (tt.totalLeadChanges / tt.races).toFixed(1) : '—',
        tt.races > 0 ? Math.round(tt.totalTicks / tt.races) : '—',
      ]),
    });
  }

  return sections;
}

/** Serialize sections to TSV rows (for the clipboard export). */
export function sectionsToTsvRows(sections: ReportSection[], prefix = ''): string[] {
  const rows: string[] = [];
  for (const s of sections) {
    rows.push(`${prefix}${s.title}`);
    rows.push(s.columns.join('\t'));
    for (const r of s.rows) rows.push(r.join('\t'));
    rows.push('');
  }
  return rows;
}
