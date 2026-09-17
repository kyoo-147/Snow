import { requireUser } from "@/lib/auth";
import { getDatabase, transaction } from "@/lib/db";
import { contentInput } from "@/lib/domain";
import { body, fail, ok } from "@/lib/http";
export async function GET() { try { await requireUser("admin"); const db = getDatabase(); const routines = db.prepare("SELECT id,title,description,active,created_at AS createdAt FROM routines ORDER BY id").all() as Array<Record<string, unknown>>; return ok(routines.map((routine) => ({ ...routine, steps: db.prepare("SELECT id,position,title FROM routine_steps WHERE routine_id=? ORDER BY position").all(routine.id as number) }))); } catch (error) { return fail(error); } }
export async function POST(request: Request) {
  try {
    await requireUser("admin"); const input = contentInput(await body(request), true); const db = getDatabase(); let id = 0;
    transaction(db, () => { const result = db.prepare("INSERT INTO routines(title,description,active) VALUES (?,?,?)").run(input.title!, input.description ?? "", input.active === false ? 0 : 1); id = Number(result.lastInsertRowid); const insert = db.prepare("INSERT INTO routine_steps(routine_id,position,title) VALUES (?,?,?)"); input.steps!.forEach((step, index) => insert.run(id, index + 1, step)); });
    return ok({ id, ...input }, 201);
  } catch (error) { return fail(error); }
}
