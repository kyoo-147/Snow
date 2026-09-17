import { ApiError, requireUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { contentInput, parseId } from "@/lib/domain";
import { body, fail, ok } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try {
    await requireUser("admin");
    const id = parseId((await params).id);
    const input = contentInput(await body(request), false, true);
    const fields: string[] = [];
    const values: Array<string | number> = [];
    for (const [key, column] of [["title", "title"], ["description", "description"], ["content", "content"], ["active", "active"]] as const) {
      if (input[key] !== undefined) { fields.push(`${column}=?`); values.push(key === "active" ? (input[key] ? 1 : 0) : input[key] as string); }
    }
    const result = getDatabase().prepare(`UPDATE lessons SET ${fields.join(",")} WHERE id=?`).run(...values, id);
    if (!result.changes) throw new ApiError(404, "Lesson not found.");
    return ok({ id, ...input });
  } catch (error) { return fail(error); }
}
export async function DELETE(_: Request, { params }: Context) {
  try { await requireUser("admin"); const id = parseId((await params).id); const result = getDatabase().prepare("DELETE FROM lessons WHERE id=?").run(id); if (!result.changes) throw new ApiError(404, "Lesson not found."); return ok({ deleted: true }); } catch (error) { return fail(error); }
}
