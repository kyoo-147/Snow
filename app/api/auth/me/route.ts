import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
export async function GET() { try { return ok(await requireUser()); } catch (error) { return fail(error); } }
