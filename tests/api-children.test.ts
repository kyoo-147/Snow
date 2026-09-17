import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signSession, type AuthUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { del, isolatedDatabase, post, read } from "./helpers";

const auth = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (auth.token === undefined ? undefined : { name, value: auth.token }), set: () => {} }),
}));

import { GET as listLessons } from "@/app/api/children/[id]/lessons/route";
import { POST as completeLesson } from "@/app/api/children/[id]/lessons/[lessonId]/complete/route";
import { GET as listRoutines } from "@/app/api/children/[id]/routines/route";
import { POST as completeStep } from "@/app/api/children/[id]/routines/[routineId]/steps/[stepId]/complete/route";
import { POST as recordEmotion } from "@/app/api/children/[id]/emotion/route";
import { GET as listMemories } from "@/app/api/children/[id]/memories/route";
import { DELETE as deleteMemory } from "@/app/api/children/[id]/memories/[memoryId]/route";
import { GET as getProgress } from "@/app/api/children/[id]/progress/route";

let cleanup: () => void;
const child = { params: Promise.resolve({ id: "1" }) };
const lesson = { params: Promise.resolve({ id: "1", lessonId: "1" }) };
const step = { params: Promise.resolve({ id: "1", routineId: "1", stepId: "1" }) };
const memory = (memoryId: string) => ({ params: Promise.resolve({ id: "1", memoryId }) });

const base = "http://localhost/api/children/1";

beforeEach(() => { cleanup = isolatedDatabase(); auth.token = signSession(1); });
afterEach(() => { cleanup(); auth.token = undefined; });

function otherParent() {
  const db = getDatabase();
  db.prepare("INSERT INTO users(email,name,role,password_hash) VALUES ('other@example.com','Other Parent','parent','x:y')").run();
  const user = db.prepare("SELECT id,email,name,role FROM users WHERE email='other@example.com'").get() as AuthUser;
  const child = db.prepare("INSERT INTO children(parent_id,display_name) VALUES (?,'Other Kid')").run(user.id);
  return { user, childId: Number(child.lastInsertRowid) };
}

describe("children learning routes", () => {
  it("requires authentication", async () => {
    auth.token = undefined;
    expect((await read(await listLessons(new Request(`${base}/lessons`), child))).status).toBe(401);
  });

  it("lists active lessons with the child completion state", async () => {
    const result = await read(await listLessons(new Request(`${base}/lessons`), child));
    expect(result.status).toBe(200);
    const lessons = result.data as Array<{ id: number; status: string; title: string }>;
    expect(lessons).toHaveLength(1);
    expect(lessons[0]).toMatchObject({ id: 1, status: "not_started" });
  });

  it("completes a lesson idempotently", async () => {
    const first = await read(await completeLesson(new Request(`${base}/lessons/1/complete`, { method: "POST" }), lesson));
    expect(first.status).toBe(200);
    expect(first.data).toMatchObject({ lessonId: 1, status: "completed", alreadyCompleted: false });
    const updatedAt = (first.data as { updatedAt: string }).updatedAt;
    const second = await read(await completeLesson(new Request(`${base}/lessons/1/complete`, { method: "POST" }), lesson));
    expect(second.data).toMatchObject({ lessonId: 1, status: "completed", alreadyCompleted: true, updatedAt });
    const rows = getDatabase().prepare("SELECT count(*) AS count FROM lesson_progress WHERE child_id=1 AND lesson_id=1").get() as { count: number };
    expect(rows.count).toBe(1);
  });

  it("rejects unknown lessons and malformed ids", async () => {
    const missing = await read(await completeLesson(new Request(`${base}/lessons/999/complete`, { method: "POST" }), { params: Promise.resolve({ id: "1", lessonId: "999" }) }));
    expect(missing.status).toBe(404);
    const malformed = await read(await listLessons(new Request(`${base}/lessons`), { params: Promise.resolve({ id: "abc" }) }));
    expect(malformed.status).toBe(400);
  });

  it("keeps admins read-only on child action endpoints", async () => {
    auth.token = signSession(2);
    expect((await read(await listLessons(new Request(`${base}/lessons`), child))).status).toBe(200);
    expect((await read(await completeLesson(new Request(`${base}/lessons/1/complete`, { method: "POST" }), lesson))).status).toBe(404);
    expect((await read(await recordEmotion(post(`${base}/emotion`, { emotion: "happy" }), child))).status).toBe(404);
  });

  it("fails closed for another parent and for missing children without leaking existence", async () => {
    const { user: other } = otherParent();
    auth.token = signSession(other.id);
    const foreign = await read(await listLessons(new Request(`${base}/lessons`), child));
    const missing = await read(await listLessons(new Request(`${base}/lessons`), { params: Promise.resolve({ id: "999" }) }));
    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(foreign.error?.message).toBe(missing.error?.message);
    expect((await read(await completeLesson(new Request(`${base}/lessons/1/complete`, { method: "POST" }), lesson))).status).toBe(404);
  });

  it("lists routines with ordered steps and progress", async () => {
    const result = await read(await listRoutines(new Request(`${base}/routines`), child));
    const routines = result.data as Array<{ id: number; steps: Array<{ position: number }>; completedSteps: number; totalSteps: number; completed: boolean }>;
    expect(routines).toHaveLength(1);
    expect(routines[0].totalSteps).toBe(3);
    expect(routines[0].completedSteps).toBe(0);
    expect(routines[0].steps.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(routines[0].completed).toBe(false);
  });

  it("completes routine steps idempotently and reports routine completion", async () => {
    const stepContext = (stepId: string) => ({ params: Promise.resolve({ id: "1", routineId: "1", stepId }) });
    const first = await read(await completeStep(new Request(`${base}/routines/1/steps/1/complete`, { method: "POST" }), stepContext("1")));
    expect(first.data).toMatchObject({ routineId: 1, stepId: 1, completedSteps: 1, totalSteps: 3, routineCompleted: false });
    const again = await read(await completeStep(new Request(`${base}/routines/1/steps/1/complete`, { method: "POST" }), stepContext("1")));
    expect(again.data).toMatchObject({ completedSteps: 1, routineCompleted: false });
    await completeStep(new Request(`${base}/routines/1/steps/2/complete`, { method: "POST" }), stepContext("2"));
    const last = await read(await completeStep(new Request(`${base}/routines/1/steps/3/complete`, { method: "POST" }), stepContext("3")));
    expect(last.data).toMatchObject({ completedSteps: 3, totalSteps: 3, routineCompleted: true });
    const completedAt = (last.data as { completedAt: string }).completedAt;
    expect(completedAt).toBeTruthy();
    const repeat = await read(await completeStep(new Request(`${base}/routines/1/steps/3/complete`, { method: "POST" }), stepContext("3")));
    expect(repeat.data).toMatchObject({ routineCompleted: true, completedAt });
  });

  it("validates the routine-step relation", async () => {
    const db = getDatabase();
    const routine = db.prepare("INSERT INTO routines(title) VALUES ('Second routine')").run();
    const otherStep = db.prepare("INSERT INTO routine_steps(routine_id,position,title) VALUES (?,1,'Alien step')").run(Number(routine.lastInsertRowid));
    const mismatch = await read(await completeStep(new Request(`${base}/routines/1/steps/${Number(otherStep.lastInsertRowid)}/complete`, { method: "POST" }), { params: Promise.resolve({ id: "1", routineId: "1", stepId: String(Number(otherStep.lastInsertRowid)) }) }));
    expect(mismatch.status).toBe(404);
  });

  it("persists validated emotion check-ins", async () => {
    const created = await read(await recordEmotion(post(`${base}/emotion`, { emotion: "Calm", note: "After school" }), child));
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({ emotion: "calm", note: "After school" });
    const stored = getDatabase().prepare("SELECT emotion,note FROM emotion_events WHERE child_id=1").get();
    expect(stored).toMatchObject({ emotion: "calm", note: "After school" });
  });

  it("rejects invalid emotion payloads", async () => {
    expect((await read(await recordEmotion(post(`${base}/emotion`, { emotion: "furious" }), child))).status).toBe(400);
    expect((await read(await recordEmotion(post(`${base}/emotion`, {}), child))).status).toBe(400);
    expect((await read(await recordEmotion(post(`${base}/emotion`, "not-json"), child))).status).toBe(400);
  });

  it("lists and deletes only owned memories", async () => {
    const db = getDatabase();
    db.prepare("INSERT INTO memories(child_id,kind,content) VALUES (1,'note','Likes trains')").run();
    const { childId: foreignChildId } = otherParent();
    db.prepare("INSERT INTO memories(child_id,kind,content) VALUES (?,'note','Foreign memory')").run(foreignChildId);

    const listed = await read(await listMemories(new Request(`${base}/memories`), child));
    expect(listed.data).toHaveLength(1);
    expect((listed.data as Array<{ content: string }>)[0].content).toBe("Likes trains");

    const removed = await read(await deleteMemory(del(`${base}/memories/1`), memory("1")));
    expect(removed.status).toBe(200);
    expect((await read(await deleteMemory(del(`${base}/memories/1`), memory("1")))).status).toBe(404);

    const foreignId = (db.prepare("SELECT max(id) AS id FROM memories").get() as { id: number }).id;
    expect((await read(await deleteMemory(del(`${base}/memories/${foreignId}`), memory(String(foreignId))))).status).toBe(404);
  });

  it("aggregates progress from persisted records", async () => {
    const db = getDatabase();
    await completeLesson(new Request(`${base}/lessons/1/complete`, { method: "POST" }), lesson);
    await completeStep(new Request(`${base}/routines/1/steps/1/complete`, { method: "POST" }), step);
    await recordEmotion(post(`${base}/emotion`, { emotion: "happy" }), child);
    const session = db.prepare("INSERT INTO sessions(child_id) VALUES (1)").run();
    db.prepare("INSERT INTO messages(session_id,role,content) VALUES (?,'user','hello')").run(Number(session.lastInsertRowid));
    db.prepare("INSERT INTO safety_events(child_id,session_id,source,severity,content) VALUES (1,?,'input','warning','i am scared')").run(Number(session.lastInsertRowid));

    const result = await read(await getProgress(new Request(`${base}/progress`), child));
    expect(result.status).toBe(200);
    const progress = result.data as {
      lessons: Array<{ status: string }>;
      routines: Array<{ completedSteps: number }>;
      emotions: Array<{ emotion: string }>;
      sessions: Array<{ messageCount: number }>;
      alerts: { total: number; unacknowledged: number };
    };
    expect(progress.lessons[0].status).toBe("completed");
    expect(progress.routines[0].completedSteps).toBe(1);
    expect(progress.emotions[0].emotion).toBe("happy");
    expect(progress.sessions[0].messageCount).toBe(1);
    expect(progress.alerts).toMatchObject({ total: 1, unacknowledged: 1 });
  });

  it("isolates progress across parents", async () => {
    const { user: other, childId: foreignChildId } = otherParent();
    auth.token = signSession(other.id);
    expect((await read(await getProgress(new Request("http://localhost/api/children/x/progress"), { params: Promise.resolve({ id: String(foreignChildId) }) }))).status).toBe(200);
    expect((await read(await getProgress(new Request("http://localhost/api/children/1/progress"), child))).status).toBe(404);
  });
});
