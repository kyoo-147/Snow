import { assertChildAccess, requireUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { parseId } from "@/lib/domain";
import { fail, ok } from "@/lib/http";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{const user=await requireUser();const id=parseId((await params).id);assertChildAccess(user,id);const db=getDatabase();return ok({lessons:db.prepare("SELECT l.id,l.title,COALESCE(p.status,'not_started') AS status,p.score,p.updated_at AS updatedAt FROM lessons l LEFT JOIN lesson_progress p ON p.lesson_id=l.id AND p.child_id=? WHERE l.active=1 ORDER BY l.id").all(id),routines:db.prepare("SELECT r.id,r.title,COALESCE(p.current_step,0) AS currentStep,p.completed_at AS completedAt,(SELECT count(*) FROM routine_steps s WHERE s.routine_id=r.id) AS totalSteps FROM routines r LEFT JOIN routine_progress p ON p.routine_id=r.id AND p.child_id=? WHERE r.active=1 ORDER BY r.id").all(id)});}catch(error){return fail(error);}}
