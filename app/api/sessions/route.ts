import { assertChildAccess, requireUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { body, fail, ok } from "@/lib/http";
import { integer, record } from "@/lib/validation";
export async function POST(request: Request){try{const user=await requireUser();const data=record(await body(request));const childId=integer(data.childId,"childId");assertChildAccess(user,childId);const result=getDatabase().prepare("INSERT INTO sessions(child_id) VALUES (?)").run(childId);return ok({id:Number(result.lastInsertRowid),childId},201);}catch(error){return fail(error);}}
