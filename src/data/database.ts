import * as SQLite from 'expo-sqlite';

export type ServiceSession = {
  id: number;
  service_date: string;
  started_at: string;
  duration_seconds: number;
  placements: number;
  videos: number;
  return_visits: number;
  bible_studies: number;
};

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase() {
  if (!database) {
    database = await SQLite.openDatabaseAsync('jw-organizer.db');
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS service_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_date TEXT NOT NULL,
        started_at TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        placements INTEGER NOT NULL DEFAULT 0,
        videos INTEGER NOT NULL DEFAULT 0,
        return_visits INTEGER NOT NULL DEFAULT 0,
        bible_studies INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS timer_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        started_at_ms INTEGER,
        elapsed_seconds INTEGER NOT NULL DEFAULT 0
      );
      INSERT OR IGNORE INTO timer_state (id, started_at_ms, elapsed_seconds) VALUES (1, NULL, 0);
    `);
  }
  return database;
}

export async function getSessions() {
  const db = await getDatabase();
  return db.getAllAsync<ServiceSession>('SELECT * FROM service_sessions ORDER BY started_at DESC');
}

export async function getTimerState() {
  const db = await getDatabase();
  return db.getFirstAsync<{ started_at_ms: number | null; elapsed_seconds: number }>(
    'SELECT started_at_ms, elapsed_seconds FROM timer_state WHERE id = 1',
  );
}

export async function updateTimerState(startedAtMs: number | null, elapsedSeconds: number) {
  const db = await getDatabase();
  await db.runAsync('UPDATE timer_state SET started_at_ms = ?, elapsed_seconds = ? WHERE id = 1', startedAtMs, elapsedSeconds);
}

export async function saveSession(session: Omit<ServiceSession, 'id'>) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO service_sessions (service_date, started_at, duration_seconds, placements, videos, return_visits, bible_studies)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    session.service_date,
    session.started_at,
    session.duration_seconds,
    session.placements,
    session.videos,
    session.return_visits,
    session.bible_studies,
  );
  return getSessions();
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
