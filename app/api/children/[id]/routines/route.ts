import { requireUser } from "@/lib/auth";
import { parseId } from "@/lib/domain";
import { fail, ok } from "@/lib/http";
import { listChildRoutines } from "@/lib/learning";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const user = await requireUser();
    return ok(listChildRoutines(user, parseId((await params).id)));
  } catch (error) { return fail(error); }
}
