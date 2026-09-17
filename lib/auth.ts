import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDatabase } from "./db";

export type Role = "parent" | "admin";
export type AuthUser = { id: number; email: string; name: string; role: Role };
export const COOKIE_NAME = "agentkid_session";
const maxAge = 60 * 60 * 24 * 7;

function secret() {
  return process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "agentkid-local-development-secret");
}

export function signSession(userId: number, now = Date.now()) {
  if (!secret()) throw new ApiError(500, "SESSION_SECRET is required in production.");
  const payload = `${userId}.${Math.floor(now / 1000) + maxAge}`;
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}

export function verifySession(token: string | undefined, now = Date.now()) {
  if (!token || !secret()) return null;
  const [id, expiry, signature] = token.split(".");
  if (!id || !expiry || !signature || Number(expiry) <= now / 1000) return null;
  const expected = createHmac("sha256", secret()).update(`${id}.${expiry}`).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return Number.isSafeInteger(Number(id)) ? Number(id) : null;
}

export function findUser(userId: number): AuthUser | null {
  return (getDatabase().prepare("SELECT id,email,name,role FROM users WHERE id = ?").get(userId) as AuthUser | undefined) ?? null;
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const id = verifySession(token);
  return id ? findUser(id) : null;
}

export async function requireUser(role?: Role) {
  const user = await currentUser();
  if (!user) throw new ApiError(401, "Authentication required.");
  if (role && user.role !== role) throw new ApiError(403, "Insufficient permission.");
  return user;
}

function childRecord(childId: number) {
  return getDatabase().prepare("SELECT id,parent_id AS parentId,display_name AS displayName,date_of_birth AS dateOfBirth,support_needs AS supportNeeds,created_at AS createdAt FROM children WHERE id = ?").get(childId) as Record<string, unknown> | undefined;
}

export function assertChildAccess(user: AuthUser, childId: number) {
  const child = childRecord(childId);
  if (!child) throw new ApiError(404, "Child not found.");
  if (user.role !== "admin" && child.parentId !== user.id) throw new ApiError(404, "Child not found.");
  return child;
}

// Stricter than assertChildAccess: only the owning parent may act on child-derived records.
// Admins are intentionally rejected (fail closed, 404) so they can never act as an arbitrary child.
export function assertChildOwnership(user: AuthUser, childId: number) {
  const child = childRecord(childId);
  if (!child || user.role !== "parent" || child.parentId !== user.id) throw new ApiError(404, "Child not found.");
  return child;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}

export const sessionCookie = { name: COOKIE_NAME, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge };
