import { requireUser } from "@/lib/auth";
import { parseId } from "@/lib/domain";
import { body, fail, ok } from "@/lib/http";
import { recordEmotion } from "@/lib/learning";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    return ok(recordEmotion(user, parseId((await params).id), await body(request)), 201);
  } catch (error) { return fail(error); }
}
