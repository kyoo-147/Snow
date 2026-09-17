import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findUser } from "@/lib/auth";
import { closeDatabase, getDatabase } from "@/lib/db";
import { childProgress, completeLesson, completeRoutineStep, listChildRoutines, recordEmotion } from "@/lib/learning";
import { MAX_OUTPUT, PROVIDER_TIMEOUT_MS, chatResponse } from "@/lib/safety";
import { isolatedDatabase } from "./helpers";

let cleanup: () => void;
beforeEach(() => { cleanup = isolatedDatabase(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

function columns(table: string) {
  return (getDatabase().prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((column) => column.name);
}

describe("learning services", () => {
  it("applies the v2 migration without disturbing the foundation schema", () => {
    const db = getDatabase();
    expect(columns("emotion_events")).toContain("note");
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='routine_step_progress'").get()).toBeTruthy();
    const versions = (db.prepare("SELECT version FROM migrations ORDER BY version").all() as Array<{ version: number }>).map((row) => row.version);
    expect(versions).toEqual([1, 2]);
    expect(db.prepare("SELECT count(*) AS count FROM routine_steps").get()).toMatchObject({ count: 3 });
  });

  it("persists child learning state across a database close and reopen", () => {
    const parent = findUser(1)!;
    expect(completeLesson(parent, 1, 1)).toMatchObject({ status: "completed", alreadyCompleted: false });
    expect(completeRoutineStep(parent, 1, 1, 1)).toMatchObject({ completedSteps: 1, totalSteps: 3, routineCompleted: false });
    expect(recordEmotion(parent, 1, { emotion: "calm", note: "Good day" })).toMatchObject({ emotion: "calm", note: "Good day" });

    closeDatabase();
    const db = getDatabase();

    expect(db.prepare("SELECT status FROM lesson_progress WHERE child_id=1 AND lesson_id=1").get()).toMatchObject({ status: "completed" });
    expect(db.prepare("SELECT count(*) AS count FROM routine_step_progress WHERE child_id=1").get()).toMatchObject({ count: 1 });
    expect(db.prepare("SELECT note FROM emotion_events WHERE child_id=1").get()).toMatchObject({ note: "Good day" });

    const routines = listChildRoutines(parent, 1);
    expect(routines[0].steps.map((step) => step.completedAt !== null)).toEqual([true, false, false]);
    expect(childProgress(parent, 1)).toMatchObject({ alerts: { total: 0, unacknowledged: 0 } });
  });

  it("enforces the safety-event uniqueness constraint", () => {
    const db = getDatabase();
    db.prepare("INSERT INTO sessions(child_id) VALUES (1)").run();
    const insert = db.prepare("INSERT OR IGNORE INTO safety_events(child_id,session_id,source,severity,content) VALUES (1,1,'input','warning','i feel unsafe')");
    insert.run();
    insert.run();
    expect(db.prepare("SELECT count(*) AS count FROM safety_events WHERE session_id=1").get()).toMatchObject({ count: 1 });
  });
});

describe("provider transport", () => {
  it("uses a deterministic fallback when no key is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await chatResponse("hello");
    expect(result.provider).toBe("fallback");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bounds provider output length", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const long = "a".repeat(MAX_OUTPUT + 500);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: long } }] }) }) as unknown as Response));
    const result = await chatResponse("hello");
    expect(result.provider).toBe("openai-compatible");
    expect(result.content).toHaveLength(MAX_OUTPUT);
  });

  it("aborts a stalled provider request after the timeout", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = chatResponse("hello");
    await vi.advanceTimersByTimeAsync(PROVIDER_TIMEOUT_MS);
    const result = await pending;

    expect(result.provider).toBe("fallback");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("honours an already-aborted request signal", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    let abortedAtFetch: boolean | undefined;
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>((_url, init) => {
      abortedAtFetch = init.signal?.aborted;
      return Promise.reject(new Error("aborted"));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await chatResponse("hello", { signal: AbortSignal.abort() });
    expect(abortedAtFetch).toBe(true);
    expect(result.provider).toBe("fallback");
  });
});
