import { requireUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
export async function GET(){try{const user=await requireUser();const base="SELECT e.id,e.child_id AS childId,c.display_name AS childName,e.session_id AS sessionId,e.source,e.severity,e.content,e.acknowledged_at AS acknowledgedAt,e.created_at AS createdAt FROM safety_events e JOIN children c ON c.id=e.child_id";return ok(user.role==="admin"?getDatabase().prepare(`${base} ORDER BY e.id DESC`).all():getDatabase().prepare(`${base} WHERE c.parent_id=? ORDER BY e.id DESC`).all(user.id));}catch(error){return fail(error);}}
