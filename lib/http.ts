import { NextResponse } from "next/server";
import { ApiError } from "./auth";

export function ok(data: unknown, status = 200) { return NextResponse.json({ data }, { status }); }
export function fail(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: { message: error.message, details: error.details } }, { status: error.status });
  console.error(error);
  return NextResponse.json({ error: { message: "Internal server error." } }, { status: 500 });
}
export async function body(request: Request) {
  try { return await request.json() as unknown; } catch { throw new ApiError(400, "Request body must be valid JSON."); }
}
