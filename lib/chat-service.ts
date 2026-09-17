import type { AuthUser } from "./auth";
import { ApiError } from "./auth";
import { getDatabase, transaction } from "./db";
import { getOwnedSessionForUser } from "./domain";
import { MAX_HISTORY_MESSAGES, chatResponse, type ChatHistoryMessage } from "./safety";

export async function persistChat(user: AuthUser, sessionId: number, content: string, options: { signal?: AbortSignal } = {}) {
  const session = getOwnedSessionForUser(user, sessionId);
  if (session.endedAt) throw new ApiError(409, "Session has ended.");
  const db = getDatabase();
  const history = db.prepare("SELECT role,content FROM messages WHERE session_id=? ORDER BY id DESC LIMIT ?").all(sessionId, MAX_HISTORY_MESSAGES) as ChatHistoryMessage[];
  history.reverse();
  const response = await chatResponse(content, { history, signal: options.signal });
  transaction(db, () => {
    db.prepare("INSERT INTO messages(session_id,role,content) VALUES (?,'user',?)").run(sessionId, content);
    db.prepare("INSERT INTO messages(session_id,role,content) VALUES (?,'assistant',?)").run(sessionId, response.content);
    const safety = db.prepare("INSERT OR IGNORE INTO safety_events(child_id,session_id,source,severity,content) VALUES (?,?,?,?,?)");
    if (!response.inputRisk.safe) safety.run(session.childId, sessionId, "input", response.inputRisk.severity, content);
    if (response.outputRisk) safety.run(session.childId, sessionId, "output", response.outputRisk.severity, response.outputRisk.content);
  });
  return { content: response.content, provider: response.provider };
}
