import { ApiError, requireUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { getSessionForUser, parseId } from "@/lib/domain";
import { fail, ok } from "@/lib/http";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){try{const user=await requireUser();const id=parseId((await params).id);const session=getSessionForUser(user,id);if(session.endedAt)throw new ApiError(409,"Session has already ended.");getDatabase().prepare("UPDATE sessions SET ended_at=CURRENT_TIMESTAMP WHERE id=?").run(id);return ok(getSessionForUser(user,id));}catch(error){return fail(error);}}
