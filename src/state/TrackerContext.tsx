import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { getSessions, getTimerState, localDateKey, saveSession, ServiceSession, updateTimerState } from '../data/database';

type SessionCounts = { placements: number; videos: number; returnVisits: number; bibleStudies: number };
type TrackerValue = {
  sessions: ServiceSession[];
  elapsedSeconds: number;
  isRunning: boolean;
  ready: boolean;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  finish: (counts: SessionCounts) => Promise<void>;
  refreshSessions: () => Promise<void>;
};

const TrackerContext = createContext<TrackerValue | null>(null);

export function TrackerProvider({ children }: React.PropsWithChildren) {
  const [sessions, setSessions] = useState<ServiceSession[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [baseElapsed, setBaseElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const refreshSessions = useCallback(async () => setSessions(await getSessions()), []);

  useEffect(() => {
    let alive = true;
    Promise.all([getSessions(), getTimerState()]).then(([storedSessions, timer]) => {
      if (!alive) return;
      setSessions(storedSessions);
      const nextStart = timer?.started_at_ms ?? null;
      setStartedAt(nextStart);
      const storedElapsed = timer?.elapsed_seconds ?? 0;
      setBaseElapsed(storedElapsed);
      setElapsedSeconds(storedElapsed + (nextStart ? Math.floor((Date.now() - nextStart) / 1000) : 0));
      setReady(true);
    }).catch((error) => console.warn('Could not open local organizer data', error));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!startedAt) return;
    const update = () => setElapsedSeconds(baseElapsed + Math.floor((Date.now() - startedAt) / 1000));
    const timer = setInterval(update, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void getTimerState().then((saved) => {
          if (!saved?.started_at_ms) return;
          setBaseElapsed(saved.elapsed_seconds);
          setElapsedSeconds(saved.elapsed_seconds + Math.floor((Date.now() - saved.started_at_ms) / 1000));
        });
      }
    });
    update();
    return () => { clearInterval(timer); subscription.remove(); };
  }, [startedAt]);

  const start = useCallback(async () => {
    const now = Date.now();
    setStartedAt(now);
    setBaseElapsed(elapsedSeconds);
    await updateTimerState(now, elapsedSeconds);
  }, [elapsedSeconds]);

  const pause = useCallback(async () => {
    if (!startedAt) return;
    const nextSeconds = baseElapsed + Math.floor((Date.now() - startedAt) / 1000);
    setStartedAt(null);
    setBaseElapsed(nextSeconds);
    setElapsedSeconds(nextSeconds);
    await updateTimerState(null, nextSeconds);
  }, [baseElapsed, startedAt]);

  const finish = useCallback(async (counts: SessionCounts) => {
    const duration = elapsedSeconds;
    const startTime = startedAt ? new Date(startedAt - (duration - Math.floor((Date.now() - startedAt) / 1000)) * 1000) : new Date(Date.now() - duration * 1000);
    const updated = await saveSession({
      service_date: localDateKey(),
      started_at: startTime.toISOString(),
      duration_seconds: duration,
      placements: counts.placements,
      videos: counts.videos,
      return_visits: counts.returnVisits,
      bible_studies: counts.bibleStudies,
    });
    setSessions(updated);
    setStartedAt(null);
    setBaseElapsed(0);
    setElapsedSeconds(0);
    await updateTimerState(null, 0);
  }, [elapsedSeconds, startedAt]);

  const value = useMemo(() => ({ sessions, elapsedSeconds, isRunning: startedAt !== null, ready, start, pause, finish, refreshSessions }), [sessions, elapsedSeconds, startedAt, ready, start, pause, finish, refreshSessions]);
  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

export function useTracker() {
  const value = useContext(TrackerContext);
  if (!value) throw new Error('useTracker must be used within TrackerProvider');
  return value;
}
