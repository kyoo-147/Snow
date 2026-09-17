import { ApiError, assertChildAccess, requireUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { childInput, parseId } from "@/lib/domain";
import { body, fail, ok } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, context: Context) { try { const user = await requireUser(); return ok(assertChildAccess(user, parseId((await context.params).id))); } catch (error) { return fail(error); } }
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser(); const id = parseId((await context.params).id); assertChildAccess(user, id); const input = childInput(await body(request), true); const fields: string[] = []; const values: Array<string | null> = [];
    for (const [key, column] of [["displayName", "display_name"], ["dateOfBirth", "date_of_birth"], ["supportNeeds", "support_needs"]] as const) if (input[key] !== undefined) { fields.push(`${column}=?`); values.push(input[key] ?? null); }
    getDatabase().prepare(`UPDATE children SET ${fields.join(",")} WHERE id=?`).run(...values, id); return ok(assertChildAccess(user, id));
  } catch (error) { return fail(error); }
}
export async function DELETE(_: Request, context: Context) { try { const user = await requireUser(); if (user.role !== "parent") throw new ApiError(403, "Only parents can delete children."); const id = parseId((await context.params).id); assertChildAccess(user, id); getDatabase().prepare("DELETE FROM children WHERE id=?").run(id); return ok({ deleted: true }); } catch (error) { return fail(error); } }
