import { requireUser } from "@/lib/auth";
import { parseId } from "@/lib/domain";
import { fail, ok } from "@/lib/http";
import { completeLesson } from "@/lib/learning";

type Context = { params: Promise<{ id: string; lessonId: string }> };

export async function POST(_: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id, lessonId } = await params;
    return ok(completeLesson(user, parseId(id), parseId(lessonId)));
  } catch (error) { return fail(error); }
}
