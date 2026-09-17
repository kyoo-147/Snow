import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
export default async function Login(){if(await currentUser())redirect("/dashboard");return <main className="login"><section><p className="eyebrow">AgentKid MVP</p><h1>A calm place to learn and grow.</h1><p>Sign in to manage a child’s learning sessions, routines, and safety alerts.</p></section><div className="card"><h2>Welcome back</h2><p>Use a demo account to explore the foundation.</p><LoginForm/><small>Parent: parent@agentkid.local / Parent123!<br/>Admin: admin@agentkid.local / Admin123!</small></div></main>;}
