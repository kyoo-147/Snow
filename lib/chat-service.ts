import type { AuthUser } from "./auth";
import { ApiError } from "./auth";
import { getDatabase, transaction } from "./db";
import { getSessionForUser } from "./domain";
import { chatResponse } from "./safety";

export async function persistChat(user: AuthUser, sessionId: number, content: string) {
  const session = getSessionForUser(user, sessionId);
  if (session.endedAt) throw new ApiError(409, "Session has ended.");
  const response = await chatResponse(content);
  const db = getDatabase();
  transaction(db, () => {
    db.prepare("INSERT INTO messages(session_id,role,content) VALUES (?,'user',?)").run(sessionId, content);
    db.prepare("INSERT INTO messages(session_id,role,content) VALUES (?,'assistant',?)").run(sessionId, response.content);
    if (!response.inputRisk.safe) db.prepare("INSERT INTO safety_events(child_id,session_id,source,severity,content) VALUES (?,?,'input',?,?)").run(session.childId, sessionId, response.inputRisk.severity, content);
    if (response.outputRisk && !response.outputRisk.safe) db.prepare("INSERT INTO safety_events(child_id,session_id,source,severity,content) VALUES (?,?,'output',?,?)").run(session.childId, sessionId, response.outputRisk.severity, response.content);
  });
  return { content: response.content, provider: response.provider };
}
