import type { AuthUser } from "./auth";
import { ApiError, assertChildAccess, assertChildOwnership } from "./auth";
import { getDatabase, transaction } from "./db";
import { record, text } from "./validation";

export const EMOTIONS = ["happy", "calm", "sad", "angry", "worried", "tired", "scared", "excited"] as const;
export type Emotion = (typeof EMOTIONS)[number];

const PROGRESS_WINDOW = 10;

export function listChildLessons(user: AuthUser, childId: number) {
  assertChildAccess(user, childId);
  return getDatabase().prepare("SELECT l.id,l.title,l.description,l.content,COALESCE(p.status,'not_started') AS status,p.score,p.updated_at AS updatedAt FROM lessons l LEFT JOIN lesson_progress p ON p.lesson_id=l.id AND p.child_id=? WHERE l.active=1 ORDER BY l.id").all(childId);
}

export function completeLesson(user: AuthUser, childId: number, lessonId: number) {
  assertChildOwnership(user, childId);
  const db = getDatabase();
  if (!db.prepare("SELECT id FROM lessons WHERE id=? AND active=1").get(lessonId)) throw new ApiError(404, "Lesson not found.");
  const before = db.prepare("SELECT status FROM lesson_progress WHERE child_id=? AND lesson_id=?").get(childId, lessonId) as { status: string } | undefined;
  db.prepare("INSERT INTO lesson_progress(child_id,lesson_id,status,updated_at) VALUES (?,?,'completed',CURRENT_TIMESTAMP) ON CONFLICT(child_id,lesson_id) DO UPDATE SET status='completed',updated_at=CASE WHEN lesson_progress.status='completed' THEN lesson_progress.updated_at ELSE CURRENT_TIMESTAMP END").run(childId, lessonId);
  const row = db.prepare("SELECT status,score,updated_at AS updatedAt FROM lesson_progress WHERE child_id=? AND lesson_id=?").get(childId, lessonId) as { status: string; score: number | null; updatedAt: string };
  return { lessonId, status: row.status, score: row.score, updatedAt: row.updatedAt, alreadyCompleted: before?.status === "completed" };
}

type RoutineStepRow = { id: number; position: number; title: string; completedAt: string | null };
type RoutineRow = { id: number; title: string; description: string; createdAt: string; completedAt: string | null };

function routineSteps(db = getDatabase(), childId: number, routineId: number) {
  return db.prepare("SELECT s.id,s.position,s.title,sp.completed_at AS completedAt FROM routine_steps s LEFT JOIN routine_step_progress sp ON sp.step_id=s.id AND sp.child_id=? WHERE s.routine_id=? ORDER BY s.position").all(childId, routineId) as RoutineStepRow[];
}

export function listChildRoutines(user: AuthUser, childId: number) {
  assertChildAccess(user, childId);
  const db = getDatabase();
  const routines = db.prepare("SELECT r.id,r.title,r.description,r.created_at AS createdAt,p.completed_at AS completedAt FROM routines r LEFT JOIN routine_progress p ON p.routine_id=r.id AND p.child_id=? WHERE r.active=1 ORDER BY r.id").all(childId) as RoutineRow[];
  return routines.map((routine) => {
    const steps = routineSteps(db, childId, routine.id);
    const completedSteps = steps.filter((step) => step.completedAt !== null).length;
    return { ...routine, steps, completedSteps, totalSteps: steps.length, completed: steps.length > 0 && completedSteps === steps.length };
  });
}

export function completeRoutineStep(user: AuthUser, childId: number, routineId: number, stepId: number) {
  assertChildOwnership(user, childId);
  const db = getDatabase();
  if (!db.prepare("SELECT id FROM routines WHERE id=? AND active=1").get(routineId)) throw new ApiError(404, "Routine not found.");
  if (!db.prepare("SELECT id FROM routine_steps WHERE id=? AND routine_id=?").get(stepId, routineId)) throw new ApiError(404, "Routine step not found.");
  let summary = { completedSteps: 0, totalSteps: 0, routineCompleted: false, completedAt: null as string | null };
  transaction(db, () => {
    db.prepare("INSERT OR IGNORE INTO routine_step_progress(child_id,routine_id,step_id) VALUES (?,?,?)").run(childId, routineId, stepId);
    const totalSteps = (db.prepare("SELECT count(*) AS count FROM routine_steps WHERE routine_id=?").get(routineId) as { count: number }).count;
    const completedSteps = (db.prepare("SELECT count(*) AS count FROM routine_step_progress WHERE child_id=? AND routine_id=?").get(childId, routineId) as { count: number }).count;
    const routineCompleted = totalSteps > 0 && completedSteps >= totalSteps;
    if (routineCompleted) {
      db.prepare("INSERT INTO routine_progress(child_id,routine_id,current_step,completed_at,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(child_id,routine_id) DO UPDATE SET current_step=excluded.current_step,completed_at=COALESCE(routine_progress.completed_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP").run(childId, routineId, completedSteps);
    } else {
      db.prepare("INSERT INTO routine_progress(child_id,routine_id,current_step,completed_at,updated_at) VALUES (?,?,?,NULL,CURRENT_TIMESTAMP) ON CONFLICT(child_id,routine_id) DO UPDATE SET current_step=excluded.current_step,updated_at=CURRENT_TIMESTAMP").run(childId, routineId, completedSteps);
    }
    const progress = db.prepare("SELECT completed_at AS completedAt FROM routine_progress WHERE child_id=? AND routine_id=?").get(childId, routineId) as { completedAt: string | null };
    summary = { completedSteps, totalSteps, routineCompleted, completedAt: progress.completedAt };
  });
  return { routineId, stepId, ...summary };
}

export function recordEmotion(user: AuthUser, childId: number, value: unknown) {
  assertChildOwnership(user, childId);
  const data = record(value);
  const emotion = text(data.emotion, "emotion", { max: 32 })!.toLowerCase();
  if (!(EMOTIONS as readonly string[]).includes(emotion)) throw new ApiError(400, `emotion must be one of: ${EMOTIONS.join(", ")}.`);
  const note = text(data.note, "note", { max: 500, optional: true });
  const db = getDatabase();
  const result = db.prepare("INSERT INTO emotion_events(child_id,emotion,note) VALUES (?,?,?)").run(childId, emotion, note ?? null);
  return db.prepare("SELECT id,child_id AS childId,emotion,note,created_at AS createdAt FROM emotion_events WHERE id=?").get(Number(result.lastInsertRowid));
}

export function listChildMemories(user: AuthUser, childId: number) {
  assertChildAccess(user, childId);
  return getDatabase().prepare("SELECT id,child_id AS childId,kind,content,created_at AS createdAt FROM memories WHERE child_id=? ORDER BY id DESC").all(childId);
}

export function deleteChildMemory(user: AuthUser, childId: number, memoryId: number) {
  assertChildOwnership(user, childId);
  const result = getDatabase().prepare("DELETE FROM memories WHERE id=? AND child_id=?").run(memoryId, childId);
  if (!result.changes) throw new ApiError(404, "Memory not found.");
  return { id: memoryId, deleted: true };
}

export function childProgress(user: AuthUser, childId: number) {
  assertChildAccess(user, childId);
  const db = getDatabase();
  const lessons = db.prepare("SELECT l.id,l.title,COALESCE(p.status,'not_started') AS status,p.score,p.updated_at AS updatedAt FROM lessons l LEFT JOIN lesson_progress p ON p.lesson_id=l.id AND p.child_id=? WHERE l.active=1 ORDER BY l.id").all(childId);
  const routines = (db.prepare("SELECT r.id,r.title,COALESCE(p.current_step,0) AS currentStep,p.completed_at AS completedAt,(SELECT count(*) FROM routine_steps s WHERE s.routine_id=r.id) AS totalSteps,(SELECT count(*) FROM routine_step_progress sp WHERE sp.child_id=? AND sp.routine_id=r.id) AS completedSteps FROM routines r LEFT JOIN routine_progress p ON p.routine_id=r.id AND p.child_id=? WHERE r.active=1 ORDER BY r.id").all(childId, childId) as Array<{ totalSteps: number; completedSteps: number }>).map((routine) => ({ ...routine, completed: routine.totalSteps > 0 && routine.completedSteps === routine.totalSteps }));
  const emotions = db.prepare("SELECT id,emotion,note,created_at AS createdAt FROM emotion_events WHERE child_id=? ORDER BY id DESC LIMIT ?").all(childId, PROGRESS_WINDOW);
  const sessions = db.prepare("SELECT s.id,s.started_at AS startedAt,s.ended_at AS endedAt,(SELECT count(*) FROM messages m WHERE m.session_id=s.id) AS messageCount FROM sessions s WHERE s.child_id=? ORDER BY s.id DESC LIMIT ?").all(childId, PROGRESS_WINDOW);
  const alerts = db.prepare("SELECT count(*) AS total,COALESCE(sum(CASE WHEN acknowledged_at IS NULL THEN 1 ELSE 0 END),0) AS unacknowledged FROM safety_events WHERE child_id=?").get(childId);
  return { lessons, routines, emotions, sessions, alerts };
}
