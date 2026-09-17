import { NextResponse } from "next/server";
import { ApiError } from "./auth";
import { getTranslations } from "next-intl/server";
import enCommon from "../messages/en/common.json";

async function getApiTranslations() {
  try {
    return await getTranslations("common.api");
  } catch {
    return (key: "internalError" | "invalidBody") => enCommon.api[key] || key;
  }
}

export function ok(data: unknown, status = 200) { return NextResponse.json({ data }, { status }); }
export async function fail(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: { message: error.message, details: error.details } }, { status: error.status });
  console.error(error);
  const t = await getApiTranslations();
  return NextResponse.json({ error: { message: t("internalError") } }, { status: 500 });
}
export async function body(request: Request) {
  try { return await request.json() as unknown; } catch { 
    const t = await getApiTranslations();
    throw new ApiError(400, t("invalidBody")); 
  }
}
