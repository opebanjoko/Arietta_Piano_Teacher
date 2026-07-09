/**
 * SQLite storage (SR-BCK-01): households, devices, progress documents.
 * Nothing else — no audio, no events, no analytics.
 */
import Database from 'better-sqlite3'

export function openDb(path) {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS devices (
      token_hash TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS progress_docs (
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      profile_id TEXT NOT NULL,
      doc TEXT,
      deleted_at INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (household_id, profile_id)
    );
  `)
  return db
}
