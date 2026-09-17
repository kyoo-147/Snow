"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import { useEffect, useState } from "react";
import { fetchJson } from "./api-client";

type Child = {
  id: number;
  displayName: string;
};

export function KidShell({
  childId,
  title,
  children,
  subtitle,
}: {
  childId: string | number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [child, setChild] = useState<Child | null>(null);
  const t = useTranslations("common.kidShell");

  useEffect(() => {
    fetchJson<Child>(`/api/children/${childId}`)
      .then((data) => setChild(data))
      .catch(() => {});
  }, [childId]);

  return (
    <div className="kid-container">
      <header className="kid-header">
        <Link
          href="/parent"
          className="btn btn-kid"
          style={{ minHeight: "56px", padding: "8px 20px", fontSize: "1.1rem" }}
          
        >
          ← {t("switchProfile")}
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <LanguageSwitcher />
          <span
            className="badge badge-mint"
            style={{ fontSize: "1rem", padding: "8px 16px", border: "2px solid var(--ink)" }}
          >
            {child?.displayName || "Friend"}
          </span>
        </div>
      </header>

      <main className="kid-main">
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>{title}</h1>
          {subtitle && (
            <p style={{ fontSize: "1.25rem", color: "var(--muted)", maxWidth: "560px", margin: "0 auto" }}>
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </main>
    </div>
  );
}

