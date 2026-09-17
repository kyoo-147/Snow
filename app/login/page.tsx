import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function Login() {
  const user = await currentUser();
  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/parent");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <span className="eyebrow" style={{ marginBottom: "12px" }}>
            AgentKid Platform
          </span>
          <h1>A calm space to learn and grow.</h1>
          <p className="text-muted" style={{ marginTop: "8px" }}>
            Sign in to manage learning sessions, routines, and safety alerts.
          </p>
        </div>

        <div className="card" style={{ padding: "32px" }}>
          <h2 style={{ marginBottom: "6px" }}>Welcome back</h2>
          <p className="text-muted" style={{ marginBottom: "20px", fontSize: "0.9rem" }}>
            Select a role to test or enter your credentials.
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
