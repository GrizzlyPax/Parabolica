import { useState, useEffect, useRef } from 'react';
import SimLabConfig from './SimLabConfig';
import SimLabProgress from './SimLabProgress';
import SimLabResults from './SimLabResults';
import type { SimLabConfig as Config, SimLabResults as Results, WorkerOutMessage } from './types';
import './SimLab.css';

type SimLabPhase = 'config' | 'running' | 'results';

export default function SimLab() {
  const [phase, setPhase] = useState<SimLabPhase>('config');
  const [progress, setProgress] = useState({ completed: 0, total: 0, currentTrack: '' });
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create worker on mount
    workerRef.current = new Worker(
      new URL('./simLabWorker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      switch (e.data.type) {
        case 'PROGRESS':
          setProgress({
            completed: e.data.completed,
            total: e.data.total,
            currentTrack: e.data.currentTrack,
          });
          break;
        case 'COMPLETE':
          setResults(e.data.results);
          setPhase('results');
          break;
        case 'ERROR':
          console.error('Sim Lab error:', e.data.message);
          setError(e.data.message);
          setPhase('config');
          break;
      }
    };

    workerRef.current.onerror = (e) => {
      console.error('Worker error:', e);
      setError('Worker crashed unexpectedly');
      setPhase('config');
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleStartSimulation = (config: Config) => {
    setError(null);
    setPhase('running');
    setProgress({ completed: 0, total: config.batchSize, currentTrack: '' });
    workerRef.current?.postMessage({ type: 'START', config });
  };

  const handleAbort = () => {
    workerRef.current?.postMessage({ type: 'ABORT' });
    setPhase('config');
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
    setPhase('config');
  };

  const handleExportJSON = () => {
    if (!results) return;

    const json = JSON.stringify(results, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simlab-results-${results.totalRaces}-races.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    if (!results) return;

    const dnfRate = results.dnfResults.totalDriverRaces > 0
      ? (results.dnfResults.totalDNFs / results.dnfResults.totalDriverRaces) * 100
      : 0;
    const avgPitStops = results.pitStopResults.totalRaces > 0
      ? results.pitStopResults.totalPitStops / results.pitStopResults.totalRaces / 20
      : 0;
    const scRate = results.totalRaces > 0
      ? (results.dnfResults.safetyCars.racesWithSafetyCar / results.totalRaces) * 100
      : 0;

    // Helper to get rate from bucket
    const getBucketRate = (bucket: { entries: number; wins: number; podiums: number; pointsFinishes: number; dnfs: number }, metric: 'win' | 'podium' | 'points' | 'finish') => {
      if (bucket.entries === 0) return 0;
      switch (metric) {
        case 'win': return (bucket.wins / bucket.entries) * 100;
        case 'podium': return (bucket.podiums / bucket.entries) * 100;
        case 'points': return (bucket.pointsFinishes / bucket.entries) * 100;
        case 'finish': return ((bucket.entries - bucket.dnfs) / bucket.entries) * 100;
      }
    };

    // Build TSV rows (tab-separated for easy paste into sheets)
    const rows: string[] = [];
    const addRow = (...cols: (string | number)[]) => rows.push(cols.join('\t'));
    const addBlank = () => rows.push('');

    // === OVERVIEW ===
    addRow('OVERVIEW');
    addRow('Metric', 'Value');
    addRow('Total Races', results.totalRaces);
    addRow('Driver-Races', results.totalDriverRaces);
    addRow('Execution Time (s)', (results.executionTimeMs / 1000).toFixed(1));
    addRow('Races/Second', (results.totalRaces / (results.executionTimeMs / 1000)).toFixed(0));
    addBlank();

    // === DNF STATS ===
    addRow('DNF STATS');
    addRow('Metric', 'Value', '%');
    addRow('Total DNFs', results.dnfResults.totalDNFs, `${Math.round(dnfRate)}%`);
    addRow('DNFs per Race', (results.dnfResults.totalDNFs / results.totalRaces).toFixed(1));
    addRow('Crash DNFs', results.dnfResults.byReason.crash, `${Math.round((results.dnfResults.byReason.crash / results.dnfResults.totalDNFs) * 100)}%`);
    addRow('Mechanical DNFs', results.dnfResults.byReason.mechanical, `${Math.round((results.dnfResults.byReason.mechanical / results.dnfResults.totalDNFs) * 100)}%`);
    addRow('Tire Failure DNFs', results.dnfResults.byReason.tire_failure, `${Math.round((results.dnfResults.byReason.tire_failure / results.dnfResults.totalDNFs) * 100)}%`);
    addRow('Early Phase (0-33%)', results.dnfResults.byRacePhase.early, `${Math.round((results.dnfResults.byRacePhase.early / results.dnfResults.totalDNFs) * 100)}%`);
    addRow('Mid Phase (33-67%)', results.dnfResults.byRacePhase.mid, `${Math.round((results.dnfResults.byRacePhase.mid / results.dnfResults.totalDNFs) * 100)}%`);
    addRow('Late Phase (67-100%)', results.dnfResults.byRacePhase.late, `${Math.round((results.dnfResults.byRacePhase.late / results.dnfResults.totalDNFs) * 100)}%`);
    addRow('Safety Cars', results.dnfResults.safetyCars.totalDeployments);
    addRow('Races with SC', results.dnfResults.safetyCars.racesWithSafetyCar, `${Math.round(scRate)}%`);
    addBlank();

    // === PIT STOP STATS ===
    addRow('PIT STOP STATS');
    addRow('Metric', 'Value');
    addRow('Total Pit Stops', results.pitStopResults.totalPitStops);
    addRow('Avg per Driver', avgPitStops.toFixed(2));
    addRow('Winner Avg Pits', results.pitStopResults.winnerRaces > 0
      ? (results.pitStopResults.winnerTotalPitStops / results.pitStopResults.winnerRaces).toFixed(2)
      : '0');
    addRow('Quick Stops', results.pitStopResults.quickStops);
    addRow('Slow Stops', results.pitStopResults.slowStops);
    addBlank();

    // === TIRE STATS ===
    addRow('TIRE STATS');
    addRow('Compound', 'Usage', 'Stints', 'Avg Laps', 'Blowouts', 'Blowout %');
    const ts = results.pitStopResults.tireStints;
    const cu = results.pitStopResults.compoundUsage;
    addRow('Soft', cu.soft, ts.soft.stintCount, ts.soft.stintCount > 0 ? (ts.soft.totalLaps / ts.soft.stintCount).toFixed(1) : 0, ts.soft.blowouts, ts.soft.stintCount > 0 ? `${((ts.soft.blowouts / ts.soft.stintCount) * 100).toFixed(1)}%` : '0%');
    addRow('Medium', cu.medium, ts.medium.stintCount, ts.medium.stintCount > 0 ? (ts.medium.totalLaps / ts.medium.stintCount).toFixed(1) : 0, ts.medium.blowouts, ts.medium.stintCount > 0 ? `${((ts.medium.blowouts / ts.medium.stintCount) * 100).toFixed(1)}%` : '0%');
    addRow('Hard', cu.hard, ts.hard.stintCount, ts.hard.stintCount > 0 ? (ts.hard.totalLaps / ts.hard.stintCount).toFixed(1) : 0, ts.hard.blowouts, ts.hard.stintCount > 0 ? `${((ts.hard.blowouts / ts.hard.stintCount) * 100).toFixed(1)}%` : '0%');
    addBlank();

    // === STARTING TIRE PERFORMANCE ===
    addRow('STARTING TIRE PERFORMANCE');
    addRow('Compound', 'Starts', 'Win %', 'Podium %', 'Points %', 'Finish %');
    const sp = results.pitStopResults.startingTirePerformance;
    for (const [name, data] of [['Soft', sp.soft], ['Medium', sp.medium], ['Hard', sp.hard]] as const) {
      const d = data as typeof sp.soft;
      addRow(name, d.starts,
        d.starts > 0 ? `${((d.wins / d.starts) * 100).toFixed(1)}%` : '0%',
        d.starts > 0 ? `${((d.podiums / d.starts) * 100).toFixed(1)}%` : '0%',
        d.starts > 0 ? `${((d.pointsFinishes / d.starts) * 100).toFixed(1)}%` : '0%',
        d.starts > 0 ? `${(((d.starts - d.dnfs) / d.starts) * 100).toFixed(1)}%` : '0%'
      );
    }
    addBlank();

    // === STAT IMPACT (Q1 vs Q5) ===
    addRow('STAT IMPACT (Q1 vs Q5)');
    addRow('Stat', 'Q1 Win%', 'Q5 Win%', 'Δ Win', 'Q1 Podium%', 'Q5 Podium%', 'Δ Podium', 'Q1 Points%', 'Q5 Points%', 'Δ Points', 'Q1 Finish%', 'Q5 Finish%', 'Δ Finish');
    const statLabels: Record<string, string> = {
      speed: 'Speed', consistency: 'Consistency', luck: 'Luck',
      acceleration: 'Acceleration', endurance: 'Endurance', aggression: 'Aggression',
      carPower: 'Car Power', carGrip: 'Car Grip', carReliability: 'Car Reliability',
      pitCrew: 'Pit Crew', tireManagement: 'Tire Mgmt'
    };
    for (const [statName, buckets] of Object.entries(results.statBucketResults)) {
      const q1 = buckets[0];
      const q5 = buckets[4];
      const q1Win = getBucketRate(q1, 'win');
      const q5Win = getBucketRate(q5, 'win');
      const q1Pod = getBucketRate(q1, 'podium');
      const q5Pod = getBucketRate(q5, 'podium');
      const q1Pts = getBucketRate(q1, 'points');
      const q5Pts = getBucketRate(q5, 'points');
      const q1Fin = getBucketRate(q1, 'finish');
      const q5Fin = getBucketRate(q5, 'finish');
      addRow(
        statLabels[statName] || statName,
        `${q1Win.toFixed(1)}%`, `${q5Win.toFixed(1)}%`, `${(q5Win - q1Win).toFixed(1)}%`,
        `${q1Pod.toFixed(1)}%`, `${q5Pod.toFixed(1)}%`, `${(q5Pod - q1Pod).toFixed(1)}%`,
        `${q1Pts.toFixed(1)}%`, `${q5Pts.toFixed(1)}%`, `${(q5Pts - q1Pts).toFixed(1)}%`,
        `${q1Fin.toFixed(1)}%`, `${q5Fin.toFixed(1)}%`, `${(q5Fin - q1Fin).toFixed(1)}%`
      );
    }
    addBlank();

    // === DRIVER TAGS ===
    if (results.tagResults.driverTags.length > 0) {
      addRow('DRIVER TAGS');
      addRow('Tag', 'Appearances', 'Wins', 'Win %', 'Podiums', 'Podium %', 'Points', 'Points %', 'DNFs', 'Finish %');
      for (const tag of results.tagResults.driverTags.sort((a, b) => b.appearances - a.appearances)) {
        const winRate = tag.appearances > 0 ? ((tag.wins / tag.appearances) * 100).toFixed(1) : '0';
        const podRate = tag.appearances > 0 ? ((tag.podiums / tag.appearances) * 100).toFixed(1) : '0';
        const ptsRate = tag.appearances > 0 ? ((tag.pointsFinishes / tag.appearances) * 100).toFixed(1) : '0';
        const finRate = tag.appearances > 0 ? (((tag.appearances - tag.dnfs) / tag.appearances) * 100).toFixed(1) : '0';
        addRow(`${tag.tagEmoji} ${tag.tagName}`, tag.appearances, tag.wins, `${winRate}%`, tag.podiums, `${podRate}%`, tag.pointsFinishes, `${ptsRate}%`, tag.dnfs, `${finRate}%`);
      }
      addBlank();
    }

    // === CAR TAGS ===
    if (results.tagResults.carTags.length > 0) {
      addRow('CAR TAGS');
      addRow('Tag', 'Appearances', 'Wins', 'Win %', 'Podiums', 'Podium %', 'Points', 'Points %', 'DNFs', 'Finish %');
      for (const tag of results.tagResults.carTags.sort((a, b) => b.appearances - a.appearances)) {
        const winRate = tag.appearances > 0 ? ((tag.wins / tag.appearances) * 100).toFixed(1) : '0';
        const podRate = tag.appearances > 0 ? ((tag.podiums / tag.appearances) * 100).toFixed(1) : '0';
        const ptsRate = tag.appearances > 0 ? ((tag.pointsFinishes / tag.appearances) * 100).toFixed(1) : '0';
        const finRate = tag.appearances > 0 ? (((tag.appearances - tag.dnfs) / tag.appearances) * 100).toFixed(1) : '0';
        addRow(`${tag.tagEmoji} ${tag.tagName}`, tag.appearances, tag.wins, `${winRate}%`, tag.podiums, `${podRate}%`, tag.pointsFinishes, `${ptsRate}%`, tag.dnfs, `${finRate}%`);
      }
      addBlank();
    }

    // === TEAM TAGS ===
    if (results.tagResults.teamTags.length > 0) {
      addRow('TEAM TAGS');
      addRow('Tag', 'Appearances', 'Wins', 'Win %', 'Podiums', 'Podium %', 'Points', 'Points %', 'DNFs', 'Finish %');
      for (const tag of results.tagResults.teamTags.sort((a, b) => b.appearances - a.appearances)) {
        const winRate = tag.appearances > 0 ? ((tag.wins / tag.appearances) * 100).toFixed(1) : '0';
        const podRate = tag.appearances > 0 ? ((tag.podiums / tag.appearances) * 100).toFixed(1) : '0';
        const ptsRate = tag.appearances > 0 ? ((tag.pointsFinishes / tag.appearances) * 100).toFixed(1) : '0';
        const finRate = tag.appearances > 0 ? (((tag.appearances - tag.dnfs) / tag.appearances) * 100).toFixed(1) : '0';
        addRow(`${tag.tagEmoji} ${tag.tagName}`, tag.appearances, tag.wins, `${winRate}%`, tag.podiums, `${podRate}%`, tag.pointsFinishes, `${ptsRate}%`, tag.dnfs, `${finRate}%`);
      }
      addBlank();
    }

    // === TRACKS ===
    if (results.trackResults.tracks.length > 0) {
      addRow('TRACKS');
      addRow('Track', 'Races', 'DNFs', 'Crash', 'Mechanical', 'Tire Fail', 'Finish %', 'Lead Changes', 'Avg Leads/Race');
      for (const track of results.trackResults.tracks.sort((a, b) => a.trackName.localeCompare(b.trackName))) {
        const totalDrivers = track.racesRun * 20;
        const finishRate = totalDrivers > 0 ? ((track.totalFinishers / totalDrivers) * 100).toFixed(1) : '0';
        const avgLeads = track.racesRun > 0 ? (track.totalLeadChanges / track.racesRun).toFixed(1) : '0';
        addRow(
          `${track.trackEmoji} ${track.trackName}`,
          track.racesRun,
          track.totalDNFs,
          track.dnfBreakdown.crash,
          track.dnfBreakdown.mechanical,
          track.dnfBreakdown.tire_failure,
          `${finishRate}%`,
          track.totalLeadChanges,
          avgLeads
        );
      }
      addBlank();
    }

    // === TRACK EVENTS ===
    if (results.eventResults.trackEvents.length > 0) {
      addRow('TRACK EVENTS');
      addRow('Event', 'Races', 'Triggers', 'Affected', 'Aff Win%', 'Unaff Win%', 'Δ Win', 'Aff Finish%', 'Unaff Finish%', 'Δ Finish');
      for (const event of results.eventResults.trackEvents.sort((a, b) => b.racesTriggered - a.racesTriggered)) {
        const affWin = event.affectedDriverRaces > 0 ? ((event.affectedWins / event.affectedDriverRaces) * 100) : 0;
        const unaffWin = event.unaffectedDriverRaces > 0 ? ((event.unaffectedWins / event.unaffectedDriverRaces) * 100) : 0;
        const affFin = event.affectedDriverRaces > 0 ? (((event.affectedDriverRaces - event.affectedDNFs) / event.affectedDriverRaces) * 100) : 0;
        const unaffFin = event.unaffectedDriverRaces > 0 ? (((event.unaffectedDriverRaces - event.unaffectedDNFs) / event.unaffectedDriverRaces) * 100) : 0;
        addRow(
          `${event.eventEmoji} ${event.eventName}`,
          event.racesTriggered,
          event.totalTriggers,
          event.affectedDriverRaces,
          `${affWin.toFixed(1)}%`,
          `${unaffWin.toFixed(1)}%`,
          `${(affWin - unaffWin).toFixed(1)}%`,
          `${affFin.toFixed(1)}%`,
          `${unaffFin.toFixed(1)}%`,
          `${(affFin - unaffFin).toFixed(1)}%`
        );
      }
      addBlank();
    }

    // === CONFIG ===
    addRow('CONFIG');
    addRow('Setting', 'Value');
    addRow('Batch Size', results.config.batchSize);
    addRow('Chaos Level', `${Math.round(results.config.chaosLevel * 100)}%`);
    addRow('Track Selection', results.config.trackSelection);

    // Copy to clipboard
    const tsv = rows.join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 2000);
    } catch {
      // Fallback: create a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = tsv;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 2000);
    }
  };

  return (
    <div className="sim-lab">
      <div className="sim-lab-header">
        <h2>Sim Lab</h2>
        <p className="sim-lab-subtitle">Monte Carlo simulation analysis</p>
      </div>

      {error && (
        <div className="sim-lab-error">
          <span>Error: {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {phase === 'config' && (
        <SimLabConfig onStart={handleStartSimulation} />
      )}

      {phase === 'running' && (
        <SimLabProgress
          completed={progress.completed}
          total={progress.total}
          currentTrack={progress.currentTrack}
          onAbort={handleAbort}
        />
      )}

      {phase === 'results' && results && (
        <SimLabResults
          results={results}
          onReset={handleReset}
          onExportJSON={handleExportJSON}
          onExportCSV={handleExportCSV}
          copyConfirmed={copyConfirmed}
        />
      )}
    </div>
  );
}
