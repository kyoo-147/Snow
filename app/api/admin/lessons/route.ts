import { requireUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { contentInput } from "@/lib/domain";
import { body, fail, ok } from "@/lib/http";
export async function GET(){try{await requireUser("admin");return ok(getDatabase().prepare("SELECT id,title,description,content,active,created_at AS createdAt FROM lessons ORDER BY id").all());}catch(error){return fail(error);}}
export async function POST(request:Request){try{await requireUser("admin");const input=contentInput(await body(request));const result=getDatabase().prepare("INSERT INTO lessons(title,description,content,active) VALUES (?,?,?,?)").run(input.title!,input.description??"",input.content??"",input.active===false?0:1);return ok({id:Number(result.lastInsertRowid),...input},201);}catch(error){return fail(error);}}
