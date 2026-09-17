import { requireUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { getSessionForUser, parseId } from "@/lib/domain";
import { fail, ok } from "@/lib/http";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const user=await requireUser();const session=getSessionForUser(user,parseId((await params).id));const messages=getDatabase().prepare("SELECT id,role,content,created_at AS createdAt FROM messages WHERE session_id=? ORDER BY id").all(session.id as number);return ok({...session,messages});}catch(error){return fail(error);}}
