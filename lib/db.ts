import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { hashPassword } from "./password";

let database: DatabaseSync | undefined;

const schemaV1 = `
CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('parent','admin')), password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS children (id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, display_name TEXT NOT NULL, date_of_birth TEXT, support_needs TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY, child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE, started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, ended_at TEXT);
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK(role IN ('user','assistant')), content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS lesson_progress (id INTEGER PRIMARY KEY, child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE, lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed')), score INTEGER, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(child_id, lesson_id));
CREATE TABLE IF NOT EXISTS routines (id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS routine_steps (id INTEGER PRIMARY KEY, routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE, position INTEGER NOT NULL, title TEXT NOT NULL, UNIQUE(routine_id, position));
CREATE TABLE IF NOT EXISTS routine_progress (id INTEGER PRIMARY KEY, child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE, routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE, current_step INTEGER NOT NULL DEFAULT 0, completed_at TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(child_id, routine_id));
CREATE TABLE IF NOT EXISTS emotion_events (id INTEGER PRIMARY KEY, child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE, session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL, emotion TEXT NOT NULL, intensity INTEGER CHECK(intensity BETWEEN 1 AND 5), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY, child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE, kind TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS safety_events (id INTEGER PRIMARY KEY, child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE, session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL, source TEXT NOT NULL CHECK(source IN ('input','output')), severity TEXT NOT NULL CHECK(severity IN ('warning','critical')), content TEXT NOT NULL, acknowledged_at TEXT, acknowledged_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_child ON sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_safety_child ON safety_events(child_id);
`;

const schemaV2 = `
ALTER TABLE emotion_events ADD COLUMN note TEXT;
CREATE TABLE IF NOT EXISTS routine_step_progress (id INTEGER PRIMARY KEY, child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE, routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE, step_id INTEGER NOT NULL REFERENCES routine_steps(id) ON DELETE CASCADE, completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(child_id, step_id));
CREATE INDEX IF NOT EXISTS idx_routine_step_progress_child ON routine_step_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_routine_step_progress_routine ON routine_step_progress(child_id, routine_id);
DELETE FROM safety_events WHERE session_id IS NOT NULL AND id NOT IN (SELECT min(id) FROM safety_events WHERE session_id IS NOT NULL GROUP BY session_id, source, content);
CREATE UNIQUE INDEX IF NOT EXISTS idx_safety_events_dedup ON safety_events(session_id, source, content) WHERE session_id IS NOT NULL;
`;

const migrations: Array<{ version: number; apply: (db: DatabaseSync) => void }> = [
  { version: 1, apply: (db) => db.exec(schemaV1) },
  { version: 2, apply: (db) => db.exec(schemaV2) },
];

export function openDatabase(path = process.env.AGENTKID_DB_PATH ?? resolve(process.cwd(), ".data", "agentkid.db")) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  migrate(db);
  seed(db);
  return db;
}

export function getDatabase() {
  database ??= openDatabase();
  return database;
}

export function closeDatabase() {
  database?.close();
  database = undefined;
}

export function transaction<T>(db: DatabaseSync, operation: () => T) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function migrate(db: DatabaseSync) {
  db.exec("CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const applied = new Set((db.prepare("SELECT version FROM migrations").all() as Array<{ version: number }>).map((row) => row.version));
  const insert = db.prepare("INSERT INTO migrations(version) VALUES (?)");
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    migration.apply(db);
    insert.run(migration.version);
  }
}

function seed(db: DatabaseSync) {
  const insertUser = db.prepare("INSERT OR IGNORE INTO users(email,name,role,password_hash) VALUES (?,?,?,?)");
  insertUser.run("parent@agentkid.local", "Demo Parent", "parent", hashPassword("Parent123!"));
  insertUser.run("admin@agentkid.local", "Demo Admin", "admin", hashPassword("Admin123!"));
  const parent = db.prepare("SELECT id FROM users WHERE email = ?").get("parent@agentkid.local") as { id: number };
  db.prepare("INSERT OR IGNORE INTO children(id,parent_id,display_name,date_of_birth,support_needs) VALUES (1,?,?,?,?)").run(parent.id, "Minh", "2018-05-12", "Practice calm, clear communication");
  db.prepare("INSERT OR IGNORE INTO lessons(id,title,description,content) VALUES (1,?,?,?)").run("Naming feelings", "Recognize and name common feelings.", "Notice the feeling, name it, and ask for help.");
  db.prepare("INSERT OR IGNORE INTO routines(id,title,description) VALUES (1,?,?)").run("After-school reset", "A short routine for transitioning home.");
  const step = db.prepare("INSERT OR IGNORE INTO routine_steps(routine_id,position,title) VALUES (1,?,?)");
  step.run(1, "Put away school bag");
  step.run(2, "Drink water");
  step.run(3, "Choose a quiet activity");
}
