import { requireUser } from "@/lib/auth";
import { parseId } from "@/lib/domain";
import { fail, ok } from "@/lib/http";
import { deleteChildMemory } from "@/lib/learning";

type Context = { params: Promise<{ id: string; memoryId: string }> };

export async function DELETE(_: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id, memoryId } = await params;
    return ok(deleteChildMemory(user, parseId(id), parseId(memoryId)));
  } catch (error) { return fail(error); }
}
