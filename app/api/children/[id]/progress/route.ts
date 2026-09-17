import { requireUser } from "@/lib/auth";
import { parseId } from "@/lib/domain";
import { fail, ok } from "@/lib/http";
import { childProgress } from "@/lib/learning";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    return ok(childProgress(user, parseId((await params).id)));
  } catch (error) { return fail(error); }
}
