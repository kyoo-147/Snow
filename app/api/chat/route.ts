import { requireUser } from "@/lib/auth";
import { persistChat } from "@/lib/chat-service";
import { body, fail, ok } from "@/lib/http";
import { integer, record, text } from "@/lib/validation";
export async function POST(request:Request){try{const user=await requireUser();const data=record(await body(request));const sessionId=integer(data.sessionId,"sessionId");const content=text(data.content,"content",{max:4000})!;return ok(await persistChat(user,sessionId,content));}catch(error){return fail(error);}}
