"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchJson } from "./api-client";

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
    { href: "/parent", label: "Overview" },
    { href: "/parent/children", label: "Children" },
    { href: "/parent/progress", label: "Progress" },
    { href: "/parent/alerts", label: "Safety Alerts" },
    { href: "/parent/memories", label: "Memories" },
  ];

  return (
    <div className="app-layout">
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Link href="/parent" className="header-brand">
            <span className="brand-dot">AK</span>
            <span>AgentKid</span>
          </Link>
          <nav className="header-nav" aria-label="Parent navigation">
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
          {kids.length > 0 && (
            <Link
              href={`/kid/${kids[0].id}`}
              className="btn btn-mint btn-sm"
              title={`Switch to Kid Mode as ${kids[0].displayName}`}
            >
              Kid Mode ({kids[0].displayName})
            </Link>
          )}

          {user?.role === "admin" && (
            <Link href="/admin" className="btn btn-sm">
              Admin Console
            </Link>
          )}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-sm"
            aria-label="Log out"
          >
            {loggingOut ? "Signing out…" : "Log out"}
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
