import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db";
import { body, fail, ok } from "@/lib/http";
import { record, text } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";
import { ApiError, sessionCookie, signSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const data = record(await body(request));
    const email = text(data.email, "email", { max: 320 })!.toLowerCase();
    const password = text(data.password, "password", { max: 200 })!;
    const user = getDatabase().prepare("SELECT id,email,name,role,password_hash AS passwordHash FROM users WHERE email=?").get(email) as { id: number; email: string; name: string; role: string; passwordHash: string } | undefined;
    if (!user || !verifyPassword(password, user.passwordHash)) throw new ApiError(401, "Invalid email or password.");
    (await cookies()).set({ ...sessionCookie, value: signSession(user.id) });
    return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error) { return fail(error); }
}
