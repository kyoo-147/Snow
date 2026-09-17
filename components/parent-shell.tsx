"use client";

import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useEffect, useState } from "react";
import { fetchJson } from "./api-client";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";

type User = {
  id: number;
  email: string;
  name: string;
  role: "parent" | "admin";
};

type Child = {
  id: number;
  displayName: string;
};

export function ParentShell({
  children,
  title,
  description,
  actions,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const t = useTranslations("common.parentShell");
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [kids, setKids] = useState<Child[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchJson<User>("/api/auth/me")
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        router.push("/login");
      });

    fetchJson<Child[]>("/api/children")
      .then((data) => setKids(data))
      .catch(() => {});
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const navItems = [
    { href: "/parent", label: t("navOverview") },
    { href: "/parent/children", label: t("navChildren") },
    { href: "/parent/progress", label: t("navProgress") },
    { href: "/parent/alerts", label: t("navAlerts") },
    { href: "/parent/memories", label: t("navMemories") },
  ];

  return (
    <div className="app-layout">
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Link href="/parent" className="header-brand">
            <span className="brand-dot">AK</span>
            <span>AgentKid</span>
          </Link>
          <nav className="header-nav">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${isActive ? "active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="header-actions">
          <LanguageSwitcher />
          {kids.length > 0 && (
            <Link
              href={`/kid/${kids[0].id}`}
              className="btn btn-mint btn-sm"
              title={t("titleKidMode", { name: kids[0].displayName })}
            >
              {t("kidMode")} ({kids[0].displayName})
            </Link>
          )}

          {user?.role === "admin" && (
            <Link href="/admin" className="btn btn-sm">
              {t("adminConsole")}
            </Link>
          )}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-sm"
            aria-label={t("logOut")}
          >
            {loggingOut ? t("signingOut") : t("logOut")}
          </button>
        </div>
      </header>

      <main className="main-content">
        {(title || description || actions) && (
          <div className="page-header">
            <div className="page-title-group">
              {title && <h1>{title}</h1>}
              {description && <p className="page-desc">{description}</p>}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
