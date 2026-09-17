"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations("common.loginForm");
  const router = useRouter();
  const [email, setEmail] = useState("parent@agentkid.local");
  const [password, setPassword] = useState("Parent123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function performLogin(loginEmail: string, loginPass: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message || t("errorInvalid"));
        setBusy(false);
        return;
      }
      if (data?.data?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/parent");
      }
      router.refresh();
    } catch {
      setError(t("errorNetwork"));
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performLogin(email, password);
  }

  function setParentDemo() {
    setEmail("parent@agentkid.local");
    setPassword("Parent123!");
  }

  function setAdminDemo() {
    setEmail("admin@agentkid.local");
    setPassword("Admin123!");
  }

  return (
    <form onSubmit={submit} aria-label="Sign in form">
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          type="button"
          onClick={setParentDemo}
          className="btn btn-sm btn-mint"
          style={{ flex: 1 }}
        >
          {t("fillDemoParent")}
        </button>
        <button
          type="button"
          onClick={setAdminDemo}
          className="btn btn-sm btn-lilac"
          style={{ flex: 1 }}
        >
          {t("fillDemoAdmin")}
        </button>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="email">
          {t("emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          {t("passwordLabel")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <div className="feedback-banner feedback-error" role="alert">
            {error}
          </div>
        )}
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
        {busy ? t("signingIn") : t("signInButton")}
      </button>
    </form>
  );
}
