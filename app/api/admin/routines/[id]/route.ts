import { ApiError, requireUser } from "@/lib/auth";
import { getDatabase, transaction } from "@/lib/db";
import { contentInput, parseId } from "@/lib/domain";
import { body, fail, ok } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try {
    await requireUser("admin"); const id = parseId((await params).id); const input = contentInput(await body(request), true, true); const db = getDatabase();
    transaction(db, () => {
      if (!db.prepare("SELECT id FROM routines WHERE id=?").get(id)) throw new ApiError(404, "Routine not found.");
      const fields: string[] = []; const values: Array<string | number> = [];
      for (const [key, column] of [["title", "title"], ["description", "description"], ["active", "active"]] as const) if (input[key] !== undefined) { fields.push(`${column}=?`); values.push(key === "active" ? (input[key] ? 1 : 0) : input[key] as string); }
      if (fields.length) db.prepare(`UPDATE routines SET ${fields.join(",")} WHERE id=?`).run(...values, id);
      if (input.steps) { db.prepare("DELETE FROM routine_steps WHERE routine_id=?").run(id); const insert = db.prepare("INSERT INTO routine_steps(routine_id,position,title) VALUES (?,?,?)"); input.steps.forEach((step, index) => insert.run(id, index + 1, step)); }
    });
    return ok({ id, ...input });
  } catch (error) { return fail(error); }
}
export async function DELETE(_: Request, { params }: Context) { try { await requireUser("admin"); const id = parseId((await params).id); const result = getDatabase().prepare("DELETE FROM routines WHERE id=?").run(id); if (!result.changes) throw new ApiError(404, "Routine not found."); return ok({ deleted: true }); } catch (error) { return fail(error); } }
