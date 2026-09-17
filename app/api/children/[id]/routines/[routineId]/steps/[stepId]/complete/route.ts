import { requireUser } from "@/lib/auth";
import { parseId } from "@/lib/domain";
import { fail, ok } from "@/lib/http";
import { completeRoutineStep } from "@/lib/learning";

type Context = { params: Promise<{ id: string; routineId: string; stepId: string }> };

export async function POST(_: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id, routineId, stepId } = await params;
    return ok(completeRoutineStep(user, parseId(id), parseId(routineId), parseId(stepId)));
  } catch (error) { return fail(error); }
}
