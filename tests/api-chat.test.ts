import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signSession, type AuthUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { MAX_HISTORY_MESSAGES, MAX_INPUT, SYSTEM_PROMPT } from "@/lib/safety";
import { isolatedDatabase, post, read } from "./helpers";

const auth = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (auth.token === undefined ? undefined : { name, value: auth.token }), set: () => {} }),
}));

import { POST as chat } from "@/app/api/chat/route";
import { GET as sessionDetail } from "@/app/api/sessions/[id]/route";

let cleanup: () => void;
const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();

function provider(content: string, options: { ok?: boolean; status?: number } = {}) {
  return { ok: options.ok ?? true, status: options.status ?? 200, json: async () => ({ choices: [{ message: { content } }] }) } as unknown as Response;
}

function createSession(childId = 1) {
  return Number(getDatabase().prepare("INSERT INTO sessions(child_id) VALUES (?)").run(childId).lastInsertRowid);
}

function otherParentSession() {
  const db = getDatabase();
  db.prepare("INSERT INTO users(email,name,role,password_hash) VALUES ('other@example.com','Other Parent','parent','x:y')").run();
  const other = db.prepare("SELECT id,email,name,role FROM users WHERE email='other@example.com'").get() as AuthUser;
  const child = db.prepare("INSERT INTO children(parent_id,display_name) VALUES (?,'Other Kid')").run(other.id);
  const session = db.prepare("INSERT INTO sessions(child_id) VALUES (?)").run(Number(child.lastInsertRowid));
  return { other, sessionId: Number(session.lastInsertRowid) };
}

beforeEach(() => { cleanup = isolatedDatabase(); auth.token = signSession(1); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); cleanup(); auth.token = undefined; });

describe("chat route", () => {
  it("requires authentication and a valid session", async () => {
    auth.token = undefined;
    expect((await read(await chat(post("http://localhost/api/chat", { sessionId: 1, content: "hi" })))).status).toBe(401);

    auth.token = signSession(1);
    const { other, sessionId: foreignSession } = otherParentSession();
    expect((await read(await chat(post("http://localhost/api/chat", { sessionId: foreignSession, content: "hi" })))).status).toBe(404);
    auth.token = signSession(other.id);
    expect((await read(await chat(post("http://localhost/api/chat", { sessionId: foreignSession, content: "hi" })))).status).toBe(200);
    auth.token = signSession(2);
    expect((await read(await chat(post("http://localhost/api/chat", { sessionId: createSession(), content: "hi" })))).status).toBe(404);
  });

  it("validates the request body", async () => {
    expect((await read(await chat(post("http://localhost/api/chat", { sessionId: 1 })))).status).toBe(400);
    expect((await read(await chat(post("http://localhost/api/chat", { sessionId: 0, content: "hi" })))).status).toBe(400);
    expect((await read(await chat(post("http://localhost/api/chat", "not-json")))).status).toBe(400);
    expect((await read(await chat(post("http://localhost/api/chat", { sessionId: 1, content: "" })))).status).toBe(400);
  });

  it("rejects chat on an ended session", async () => {
    const sessionId = createSession();
    getDatabase().prepare("UPDATE sessions SET ended_at=CURRENT_TIMESTAMP WHERE id=?").run(sessionId);
    expect((await read(await chat(post("http://localhost/api/chat", { sessionId, content: "hi" })))).status).toBe(409);
  });

  it("stores exactly the user and assistant messages with an honest fallback mode", async () => {
    const sessionId = createSession();
    const result = await read(await chat(post("http://localhost/api/chat", { sessionId, content: "Help me count" })));
    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({ provider: "fallback" });
    const messages = getDatabase().prepare("SELECT role,content FROM messages WHERE session_id=? ORDER BY id").all(sessionId) as Array<{ role: string; content: string }>;
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "user", content: "Help me count" });
    expect(messages[1].role).toBe("assistant");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls an OpenAI-compatible provider with a safe system prompt and bounded history", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const sessionId = createSession();
    const insert = getDatabase().prepare("INSERT INTO messages(session_id,role,content) VALUES (?,?,?)");
    for (let index = 0; index < 15; index += 1) insert.run(sessionId, index % 2 === 0 ? "user" : "assistant", `earlier message ${index} ${"x".repeat(5000)}`);
    fetchMock.mockResolvedValue(provider("Let us count together."));

    const result = await read(await chat(post("http://localhost/api/chat", { sessionId, content: "Two plus two" })));
    expect(result.status).toBe(200);
    expect(result.data).toMatchObject({ provider: "openai-compatible" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/chat/completions");
    const body = JSON.parse(String(init.body)) as { max_tokens: number; messages: Array<{ role: string; content: string }> };
    expect(body.messages[0]).toEqual({ role: "system", content: SYSTEM_PROMPT });
    expect(body.messages[body.messages.length - 1]).toEqual({ role: "user", content: "Two plus two" });
    expect(body.messages.length).toBeLessThanOrEqual(MAX_HISTORY_MESSAGES + 2);
    for (const message of body.messages) expect(message.content.length).toBeLessThanOrEqual(MAX_INPUT);
    expect(body.max_tokens).toBeGreaterThan(0);
  });

  it("flags risky input once and stores the safe fallback as the assistant message", async () => {
    const sessionId = createSession();
    const result = await read(await chat(post("http://localhost/api/chat", { sessionId, content: "I want to die" })));
    expect(result.data).toMatchObject({ provider: "safety-fallback" });
    const stored = getDatabase().prepare("SELECT content FROM messages WHERE session_id=? AND role='assistant'").get(sessionId) as { content: string };
    expect(stored.content).not.toContain("want to die");
    expect(stored.content).toContain("trusted adult");
    const events = getDatabase().prepare("SELECT source,severity,content FROM safety_events WHERE session_id=?").all(sessionId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ source: "input", severity: "critical", content: "I want to die" });
  });

  it("flags unsafe provider output without persisting it as the assistant message", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const sessionId = createSession();
    fetchMock.mockResolvedValue(provider("You should hurt yourself now."));

    const result = await read(await chat(post("http://localhost/api/chat", { sessionId, content: "I am fine" })));
    expect(result.data).toMatchObject({ provider: "safety-fallback" });
    const stored = getDatabase().prepare("SELECT content FROM messages WHERE session_id=? AND role='assistant'").get(sessionId) as { content: string };
    expect(stored.content).toContain("trusted adult");
    const events = getDatabase().prepare("SELECT source,severity,content FROM safety_events WHERE session_id=?").all(sessionId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ source: "output", severity: "critical", content: "You should hurt yourself now." });
  });

  it("falls back deterministically on provider failure, non-2xx and invalid shapes", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    expect((await read(await chat(post("http://localhost/api/chat", { sessionId: createSession(), content: "hello" })))).data).toMatchObject({ provider: "fallback" });
    fetchMock.mockResolvedValueOnce(provider("", { ok: false, status: 503 }));
    expect((await read(await chat(post("http://localhost/api/chat", { sessionId: createSession(), content: "hello" })))).data).toMatchObject({ provider: "fallback" });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ choices: [] }) } as unknown as Response);
    expect((await read(await chat(post("http://localhost/api/chat", { sessionId: createSession(), content: "hello" })))).data).toMatchObject({ provider: "fallback" });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ choices: [{ message: {} }] }) } as unknown as Response);
    expect((await read(await chat(post("http://localhost/api/chat", { sessionId: createSession(), content: "hello" })))).data).toMatchObject({ provider: "fallback" });
    expect(getDatabase().prepare("SELECT count(*) AS count FROM safety_events").get()).toMatchObject({ count: 0 });
  });

  it("does not duplicate safety events for repeated identical risky content", async () => {
    const sessionId = createSession();
    await chat(post("http://localhost/api/chat", { sessionId, content: "I feel unsafe" }));
    await chat(post("http://localhost/api/chat", { sessionId, content: "I feel unsafe" }));
    const events = getDatabase().prepare("SELECT count(*) AS count FROM safety_events WHERE session_id=?").get(sessionId);
    expect(events).toMatchObject({ count: 1 });
    const messages = getDatabase().prepare("SELECT count(*) AS count FROM messages WHERE session_id=?").get(sessionId);
    expect(messages).toMatchObject({ count: 4 });
  });

  it("returns the persisted transcript from the owned session endpoint", async () => {
    const sessionId = createSession();
    await chat(post("http://localhost/api/chat", { sessionId, content: "Read me back" }));
    const result = await read(await sessionDetail(new Request(`http://localhost/api/sessions/${sessionId}`), { params: Promise.resolve({ id: String(sessionId) }) }));
    expect(result.status).toBe(200);
    const transcript = result.data as { id: number; messages: Array<{ role: string; content: string }> };
    expect(transcript.id).toBe(sessionId);
    expect(transcript.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(transcript.messages[0].content).toBe("Read me back");
  });
});
