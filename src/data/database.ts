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
  category: 'Ministry' | 'Personal study' | 'Bible reading';
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

export type NoteCategory = 'Midweek' | 'Weekend' | 'Journal' | 'Prompter';
export type OrganizerNote = {
  id: number;
  category: NoteCategory;
  title: string;
  content: string;
  note_date: string;
  updated_at: string;
};

export type Reminder = {
  id: number;
  title: string;
  reminder_date: string;
  reminder_time: string;
  category: 'Ministry' | 'Personal study' | 'Return visit' | 'Other';
  details: string;
  notification_id: string;
  completed: number;
  created_at: string;
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
      CREATE TABLE IF NOT EXISTS organizer_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        note_date TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        reminder_date TEXT NOT NULL,
        reminder_time TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Other',
        details TEXT NOT NULL DEFAULT '',
        notification_id TEXT NOT NULL DEFAULT '',
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key TEXT PRIMARY KEY NOT NULL,
        setting_value TEXT NOT NULL
      );
      INSERT OR IGNORE INTO timer_state (id, started_at_ms, elapsed_seconds) VALUES (1, NULL, 0);
      INSERT OR IGNORE INTO app_settings (setting_key, setting_value) VALUES ('reminder_notifications_enabled', '1');
    `);
  }
  return database;
}

export async function getReminders() {
  const db = await getDatabase();
  return db.getAllAsync<Reminder>('SELECT * FROM reminders ORDER BY completed ASC, reminder_date ASC, reminder_time ASC');
}

export async function saveReminder(reminder: Omit<Reminder, 'id' | 'notification_id' | 'completed' | 'created_at'>, id?: number) {
  const db = await getDatabase();
  const createdAt = new Date().toISOString();
  if (id) {
    await db.runAsync('UPDATE reminders SET title = ?, reminder_date = ?, reminder_time = ?, category = ?, details = ?, notification_id = "" WHERE id = ?', reminder.title, reminder.reminder_date, reminder.reminder_time, reminder.category, reminder.details, id);
    return db.getFirstAsync<Reminder>('SELECT * FROM reminders WHERE id = ?', id);
  }
  const result = await db.runAsync('INSERT INTO reminders (title, reminder_date, reminder_time, category, details, created_at) VALUES (?, ?, ?, ?, ?, ?)', reminder.title, reminder.reminder_date, reminder.reminder_time, reminder.category, reminder.details, createdAt);
  return db.getFirstAsync<Reminder>('SELECT * FROM reminders WHERE id = ?', result.lastInsertRowId);
}

export async function setReminderNotificationId(id: number, notificationId: string) {
  const db = await getDatabase();
  await db.runAsync('UPDATE reminders SET notification_id = ? WHERE id = ?', notificationId, id);
}

export async function setReminderCompleted(id: number, completed: boolean) {
  const db = await getDatabase();
  await db.runAsync('UPDATE reminders SET completed = ?, notification_id = CASE WHEN ? = 1 THEN ? ELSE notification_id END WHERE id = ?', completed ? 1 : 0, completed ? 1 : 0, '', id);
  return getReminders();
}

export async function removeReminder(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM reminders WHERE id = ?', id);
  return getReminders();
}

export async function getAppSetting(key: string, defaultValue = '') {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ setting_value: string }>('SELECT setting_value FROM app_settings WHERE setting_key = ?', key);
  return row?.setting_value ?? defaultValue;
}

const backupTables = ['service_sessions', 'timer_state', 'plan_items', 'ministry_records', 'organizer_notes', 'reminders', 'app_settings'] as const;
const backupColumns: Record<(typeof backupTables)[number], string[]> = {
  service_sessions: ['id','service_date','started_at','duration_seconds','placements','videos','return_visits','bible_studies'],
  timer_state: ['id','started_at_ms','elapsed_seconds'],
  plan_items: ['id','title','plan_date','plan_time','category','notes','completed'],
  ministry_records: ['id','record_type','name','location','contact','material','progress','notes','next_date','updated_at'],
  organizer_notes: ['id','category','title','content','note_date','updated_at'],
  reminders: ['id','title','reminder_date','reminder_time','category','details','notification_id','completed','created_at'],
  app_settings: ['setting_key','setting_value'],
};

export async function createLocalBackup() {
  const db = await getDatabase();
  const tables: Record<string, unknown[]> = {};
  for (const table of backupTables) tables[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
  return { format: 'jw-organizer-backup', version: 1, createdAt: new Date().toISOString(), tables };
}

export async function restoreLocalBackup(value: unknown) {
  const backup = value as { format?: string; version?: number; tables?: Record<string, unknown[]> };
  if (backup?.format !== 'jw-organizer-backup' || backup.version !== 1 || !backup.tables) throw new Error('Invalid JW Organizer backup file.');
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const table of backupTables) {
      const rows = backup.tables?.[table];
      if (!Array.isArray(rows)) throw new Error(`Missing backup data: ${table}`);
      await db.runAsync(`DELETE FROM ${table}`);
      const columns = backupColumns[table];
      for (const raw of rows) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('The backup file contains an invalid record.');
        const row = raw as Record<string, unknown>;
        const present = columns.filter((column) => Object.prototype.hasOwnProperty.call(row, column));
        if (present.length !== columns.length) throw new Error(`Missing field in ${table}.`);
        const placeholders = present.map(() => '?').join(', ');
        await db.runAsync(`INSERT INTO ${table} (${present.join(', ')}) VALUES (${placeholders})`, ...present.map((column) => row[column] as SQLite.SQLiteBindValue));
      }
    }
  });
}

export async function setAppSetting(key: string, value: string) {
  const db = await getDatabase();
  await db.runAsync('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value', key, value);
}

export async function getOrganizerNotes(category: NoteCategory) {
  const db = await getDatabase();
  return db.getAllAsync<OrganizerNote>('SELECT * FROM organizer_notes WHERE category = ? ORDER BY note_date DESC, updated_at DESC', category);
}

export async function getAllOrganizerNotes() {
  const db = await getDatabase();
  return db.getAllAsync<OrganizerNote>('SELECT * FROM organizer_notes ORDER BY note_date DESC, updated_at DESC');
}

export async function saveOrganizerNote(note: Omit<OrganizerNote, 'id' | 'updated_at'>, id?: number) {
  const db = await getDatabase();
  const updatedAt = new Date().toISOString();
  if (id) {
    await db.runAsync('UPDATE organizer_notes SET category = ?, title = ?, content = ?, note_date = ?, updated_at = ? WHERE id = ?', note.category, note.title, note.content, note.note_date, updatedAt, id);
  } else {
    await db.runAsync('INSERT INTO organizer_notes (category, title, content, note_date, updated_at) VALUES (?, ?, ?, ?, ?)', note.category, note.title, note.content, note.note_date, updatedAt);
  }
  return getOrganizerNotes(note.category);
}

export async function removeOrganizerNote(id: number, category: NoteCategory) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM organizer_notes WHERE id = ?', id);
  return getOrganizerNotes(category);
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
