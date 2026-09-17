import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDatabase } from "@/lib/db";

export function isolatedDatabase() {
  const directory = mkdtempSync(join(tmpdir(), "agentkid-test-"));
  process.env.AGENTKID_DB_PATH = join(directory, "agentkid.db");
  process.env.SESSION_SECRET = "test-secret-that-is-long-enough";
  delete process.env.OPENAI_API_KEY;
  return () => { closeDatabase(); delete process.env.AGENTKID_DB_PATH; rmSync(directory, { recursive: true, force: true }); };
}

export type ApiResponse = { status: number; data?: unknown; error?: { message?: string } };

export async function read(response: Response): Promise<ApiResponse> {
  const parsed = (await response.json()) as { data?: unknown; error?: { message?: string } };
  return { status: response.status, ...parsed };
}

export function post(url: string, body: unknown) {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
}

export function del(url: string) {
  return new Request(url, { method: "DELETE" });
}
