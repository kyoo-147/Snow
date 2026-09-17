import { closeDatabase, getDatabase } from "../lib/db";

const db = getDatabase();
const tables = (db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type='table'").get() as { count: number }).count;
console.log(`AgentKid database ready with ${tables} tables.`);
closeDatabase();
