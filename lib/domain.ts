import type { AuthUser } from "./auth";
import { ApiError, assertChildAccess } from "./auth";
import { getDatabase } from "./db";
import { boolean, integer, record, text } from "./validation";

export function childInput(value: unknown, partial = false) {
  const data = record(value);
  const displayName = text(data.displayName, "displayName", { max: 100, optional: partial });
  const dateOfBirth = text(data.dateOfBirth, "dateOfBirth", { max: 10, optional: true });
  const supportNeeds = text(data.supportNeeds, "supportNeeds", { max: 1000, optional: true });
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) throw new ApiError(400, "dateOfBirth must use YYYY-MM-DD format.");
  if (partial && displayName === undefined && dateOfBirth === undefined && supportNeeds === undefined) throw new ApiError(400, "At least one editable field is required.");
  return { displayName, dateOfBirth, supportNeeds };
}

export function listChildren(user: AuthUser) {
  const db = getDatabase();
  const sql = "SELECT id,parent_id AS parentId,display_name AS displayName,date_of_birth AS dateOfBirth,support_needs AS supportNeeds,created_at AS createdAt FROM children";
  return user.role === "admin" ? db.prepare(`${sql} ORDER BY id`).all() : db.prepare(`${sql} WHERE parent_id = ? ORDER BY id`).all(user.id);
}

export function createChild(user: AuthUser, value: unknown) {
  if (user.role !== "parent") throw new ApiError(403, "Only parents can create children.");
  const input = childInput(value);
  const result = getDatabase().prepare("INSERT INTO children(parent_id,display_name,date_of_birth,support_needs) VALUES (?,?,?,?)").run(user.id, input.displayName!, input.dateOfBirth ?? null, input.supportNeeds ?? "");
  return assertChildAccess(user, Number(result.lastInsertRowid));
}

export function contentInput(value: unknown, routine = false, partial = false) {
  const data = record(value);
  const title = text(data.title, "title", { max: 160, optional: partial });
  const description = text(data.description, "description", { max: 1000, optional: true });
  const content = routine ? undefined : text(data.content, "content", { max: 10000, optional: true });
  const active = boolean(data.active, "active", true);
  let steps: string[] | undefined;
  if (routine && data.steps !== undefined) {
    if (!Array.isArray(data.steps) || data.steps.length < 1 || data.steps.length > 30) throw new ApiError(400, "steps must contain 1 to 30 items.");
    steps = data.steps.map((step, index) => text(step, `steps[${index}]`, { max: 200 })!);
  }
  if (routine && !partial && !steps) throw new ApiError(400, "steps is required.");
  if (partial && title === undefined && description === undefined && content === undefined && active === undefined && steps === undefined) throw new ApiError(400, "At least one editable field is required.");
  return { title, description, content, active, steps };
}

export function getSessionForUser(user: AuthUser, sessionId: number) {
  const row = getDatabase().prepare("SELECT s.id,s.child_id AS childId,s.started_at AS startedAt,s.ended_at AS endedAt FROM sessions s JOIN children c ON c.id=s.child_id WHERE s.id=? AND (?='admin' OR c.parent_id=?)").get(sessionId, user.role, user.id) as { id: number; childId: number; startedAt: string; endedAt: string | null } | undefined;
  if (!row) throw new ApiError(404, "Session not found.");
  return row;
}

export function parseId(value: string) { return integer(value, "id"); }
