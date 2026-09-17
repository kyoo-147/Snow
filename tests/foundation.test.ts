import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiError, assertChildAccess, findUser, signSession, verifySession } from "@/lib/auth";
import { persistChat } from "@/lib/chat-service";
import { closeDatabase, getDatabase, openDatabase } from "@/lib/db";
import { childInput, contentInput, createChild, listChildren } from "@/lib/domain";
import { verifyPassword } from "@/lib/password";

let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "agentkid-test-"));
  process.env.AGENTKID_DB_PATH = join(directory, "agentkid.db");
  process.env.SESSION_SECRET = "test-secret-that-is-long-enough";
  delete process.env.OPENAI_API_KEY;
});
afterEach(() => { closeDatabase(); delete process.env.AGENTKID_DB_PATH; rmSync(directory, { recursive: true, force: true }); });

describe("foundation", () => {
  it("creates a persistent database and seeds idempotently", () => {
    const path = process.env.AGENTKID_DB_PATH!;
    let db = openDatabase(path);
    expect(existsSync(path)).toBe(true);
    expect((db.prepare("SELECT count(*) count FROM users").get() as { count: number }).count).toBe(2);
    db.close();
    db = openDatabase(path);
    expect((db.prepare("SELECT count(*) count FROM users").get() as { count: number }).count).toBe(2);
    expect((db.prepare("SELECT count(*) count FROM routine_steps").get() as { count: number }).count).toBe(3);
    db.close();
  });

  it("rejects invalid credentials and tampered or expired sessions", () => {
    const db = getDatabase();
    const user = db.prepare("SELECT password_hash passwordHash FROM users WHERE email=?").get("parent@agentkid.local") as { passwordHash: string };
    expect(verifyPassword("wrong", user.passwordHash)).toBe(false);
    const token = signSession(1, 1_700_000_000_000);
    expect(verifySession(`${token}x`, 1_700_000_000_000)).toBeNull();
    expect(verifySession(token, 1_800_000_000_000)).toBeNull();
  });

  it("enforces parent ownership and admin visibility", () => {
    const db = getDatabase();
    const first = findUser(1)!;
    db.prepare("INSERT INTO users(email,name,role,password_hash) VALUES ('other@example.com','Other','parent','x:y')").run();
    const other = db.prepare("SELECT id,email,name,role FROM users WHERE email='other@example.com'").get() as typeof first;
    const admin = db.prepare("SELECT id,email,name,role FROM users WHERE role='admin'").get() as typeof first;
    expect(listChildren(first)).toHaveLength(1);
    expect(listChildren(other)).toHaveLength(0);
    expect(() => assertChildAccess(other, 1)).toThrowError(ApiError);
    expect(assertChildAccess(admin, 1)).toMatchObject({ id: 1 });
  });

  it("validates CRUD input and persists child creation", () => {
    const parent = findUser(1)!;
    expect(() => childInput({ displayName: "", dateOfBirth: "01/01/2020" })).toThrowError(ApiError);
    expect(() => contentInput({ title: "Routine" }, true)).toThrowError(ApiError);
    const child = createChild(parent, { displayName: "A very real child", dateOfBirth: "2020-01-02", supportNeeds: "Short prompts" });
    expect(child).toMatchObject({ displayName: "A very real child", parentId: parent.id });
    closeDatabase();
    expect((getDatabase().prepare("SELECT display_name name FROM children WHERE display_name=?").get("A very real child") as { name: string }).name).toBe("A very real child");
  });

  it("persists both chat messages and creates a safety event for risky input", async () => {
    const parent = findUser(1)!;
    const db = getDatabase();
    const session = db.prepare("INSERT INTO sessions(child_id) VALUES (1)").run();
    const result = await persistChat(parent, Number(session.lastInsertRowid), "I want to hurt myself");
    expect(result.provider).toBe("safety-fallback");
    expect((db.prepare("SELECT count(*) count FROM messages WHERE session_id=?").get(session.lastInsertRowid) as { count: number }).count).toBe(2);
    expect(db.prepare("SELECT source,severity FROM safety_events WHERE session_id=?").get(session.lastInsertRowid)).toMatchObject({ source: "input", severity: "critical" });
  });
});
