import { requireUser } from "@/lib/auth";
import { createChild, listChildren } from "@/lib/domain";
import { body, fail, ok } from "@/lib/http";
export async function GET() { try { return ok(listChildren(await requireUser())); } catch (error) { return fail(error); } }
export async function POST(request: Request) { try { return ok(createChild(await requireUser(), await body(request)), 201); } catch (error) { return fail(error); } }
