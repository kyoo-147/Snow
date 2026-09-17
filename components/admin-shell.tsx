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
    { href: "/admin", label: "Overview" },
    { href: "/admin/lessons", label: "Lessons" },
    { href: "/admin/routines", label: "Routines" },
  ];

  return (
    <div className="app-layout">
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Link href="/admin" className="header-brand">
            <span className="brand-dot" style={{ background: "var(--lilac)" }}>AD</span>
            <span>AgentKid Admin</span>
          </Link>
          <nav className="header-nav" aria-label="Admin navigation">
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
          <Link href="/parent" className="btn btn-sm btn-lime">
            Switch to Parent Mode
          </Link>
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
