import { requireUser } from "@/lib/auth";
import { persistChat } from "@/lib/chat-service";
import { body, fail, ok } from "@/lib/http";
import { MAX_INPUT } from "@/lib/safety";
import { integer, record, text } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const data = record(await body(request));
    const sessionId = integer(data.sessionId, "sessionId");
    const content = text(data.content, "content", { max: MAX_INPUT })!;
    return ok(await persistChat(user, sessionId, content, { signal: request.signal }));
  } catch (error) { return fail(error); }
}
