import { useState } from 'react';
import { Driver, RaceEvent, RaceState, TickLog, PositionSnapshot } from '../RaceEngine';
import EventTimeline, { EventFilterType } from './EventTimeline';
import FactorBars from './FactorBars';
import PositionChart from './PositionChart';
import RaceSummary from './RaceSummary';
import './AnalyticsTab.css';

interface AnalyticsTabProps {
  drivers: Driver[];
  raceState: RaceState;
  events: RaceEvent[];
  tickLogs: TickLog[];
  positionHistory: PositionSnapshot[];
}

function AnalyticsTab({ drivers, raceState, events, tickLogs, positionHistory }: AnalyticsTabProps) {
  const [eventFilter, setEventFilter] = useState<EventFilterType>('significant');

  return (
    <div className="analytics-tab">
      {raceState.raceFinished && (
        <RaceSummary
          drivers={drivers}
          raceState={raceState}
          events={events}
          tickLogs={tickLogs}
        />
      )}

      <div className="analytics-grid">
        <div className="analytics-section chart-section">
          <PositionChart
            drivers={drivers}
            positionHistory={positionHistory}
            totalDrivers={drivers.length}
          />
        </div>

        <div className="analytics-section factor-section">
          <FactorBars
            drivers={drivers}
            tickLogs={tickLogs}
          />
        </div>
      </div>

      <div className="analytics-section timeline-section">
        <EventTimeline
          events={events}
          filter={eventFilter}
          onFilterChange={setEventFilter}
        />
      </div>
    </div>
  );
}

export default AnalyticsTab;
