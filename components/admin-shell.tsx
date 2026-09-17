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

export function AdminShell({
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
  const t = useTranslations("common.adminShell");
  const pathname = usePathname();
  const router = useRouter();
  const [, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchJson<User>("/api/auth/me")
      .then((data) => {
        if (data.role !== "admin") {
          router.push("/parent");
        } else {
          setUser(data);
        }
      })
      .catch(() => {
        router.push("/login");
      });
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
    { href: "/admin", label: t("navOverview") },
    { href: "/admin/lessons", label: t("navLessons") },
    { href: "/admin/routines", label: t("navRoutines") },
  ];

  return (
    <div className="app-layout">
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Link href="/admin" className="header-brand">
            <span className="brand-dot" style={{ background: "var(--lilac)" }}>AD</span>
            <span>{t("brandText")}</span>
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
          <Link href="/parent" className="btn btn-sm btn-lime">
            {t("parentPortal")}
          </Link>
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
