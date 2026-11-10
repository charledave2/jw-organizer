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

export type PlanItem = {
  id: number;
  title: string;
  plan_date: string;
  plan_time: string;
  category: 'Ministry' | 'Personal study';
  notes: string;
  completed: number;
};

export type MinistryRecord = {
  id: number;
  record_type: 'Bible study' | 'Return visit';
  name: string;
  location: string;
  contact: string;
  material: string;
  progress: string;
  notes: string;
  next_date: string;
  updated_at: string;
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
      CREATE TABLE IF NOT EXISTS plan_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        plan_date TEXT NOT NULL,
        plan_time TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        completed INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS ministry_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_type TEXT NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL DEFAULT '',
        contact TEXT NOT NULL DEFAULT '',
        material TEXT NOT NULL DEFAULT '',
        progress TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        next_date TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL
      );
      INSERT OR IGNORE INTO timer_state (id, started_at_ms, elapsed_seconds) VALUES (1, NULL, 0);
    `);
  }
  return database;
}

export async function getPlanItems() {
  const db = await getDatabase();
  return db.getAllAsync<PlanItem>('SELECT * FROM plan_items ORDER BY completed ASC, plan_date ASC, plan_time ASC');
}

export async function savePlanItem(item: Omit<PlanItem, 'id' | 'completed'>) {
  const db = await getDatabase();
  await db.runAsync('INSERT INTO plan_items (title, plan_date, plan_time, category, notes) VALUES (?, ?, ?, ?, ?)', item.title, item.plan_date, item.plan_time, item.category, item.notes);
  return getPlanItems();
}

export async function togglePlanItem(item: PlanItem) {
  const db = await getDatabase();
  await db.runAsync('UPDATE plan_items SET completed = ? WHERE id = ?', item.completed ? 0 : 1, item.id);
  return getPlanItems();
}

export async function removePlanItem(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM plan_items WHERE id = ?', id);
  return getPlanItems();
}

export async function getMinistryRecords(type?: MinistryRecord['record_type']) {
  const db = await getDatabase();
  if (type) return db.getAllAsync<MinistryRecord>(`SELECT * FROM ministry_records WHERE record_type = ? ORDER BY COALESCE(NULLIF(next_date, ''), updated_at) ASC`, type);
  return db.getAllAsync<MinistryRecord>('SELECT * FROM ministry_records ORDER BY updated_at DESC');
}

export async function saveMinistryRecord(record: Omit<MinistryRecord, 'id' | 'updated_at'>, id?: number) {
  const db = await getDatabase();
  const updatedAt = new Date().toISOString();
  if (id) {
    await db.runAsync('UPDATE ministry_records SET record_type = ?, name = ?, location = ?, contact = ?, material = ?, progress = ?, notes = ?, next_date = ?, updated_at = ? WHERE id = ?', record.record_type, record.name, record.location, record.contact, record.material, record.progress, record.notes, record.next_date, updatedAt, id);
  } else {
    await db.runAsync('INSERT INTO ministry_records (record_type, name, location, contact, material, progress, notes, next_date, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', record.record_type, record.name, record.location, record.contact, record.material, record.progress, record.notes, record.next_date, updatedAt);
  }
  return getMinistryRecords();
}

export async function removeMinistryRecord(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM ministry_records WHERE id = ?', id);
  return getMinistryRecords();
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
