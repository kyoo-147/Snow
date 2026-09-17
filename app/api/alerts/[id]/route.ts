import { ApiError, requireUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { parseId } from "@/lib/domain";
import { fail, ok } from "@/lib/http";
export async function PATCH(_:Request,{params}:{params:Promise<{id:string}>}){try{const user=await requireUser();const id=parseId((await params).id);const result=getDatabase().prepare("UPDATE safety_events SET acknowledged_at=COALESCE(acknowledged_at,CURRENT_TIMESTAMP),acknowledged_by=COALESCE(acknowledged_by,?) WHERE id=? AND (?='admin' OR child_id IN (SELECT id FROM children WHERE parent_id=?))").run(user.id,id,user.role,user.id);if(!result.changes)throw new ApiError(404,"Alert not found.");return ok({id,acknowledged:true});}catch(error){return fail(error);}}
