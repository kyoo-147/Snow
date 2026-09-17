"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/components/api-client";

type Child = {
  id: number;
  displayName: string;
};

export default function KidRootSelectorPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<Child[]>("/api/children")
      .then((data) => {
        setChildren(data);
        if (data.length === 1) {
          router.replace(`/kid/${data[0].id}`);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--soft)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "520px",
          textAlign: "center",
          border: "3px solid var(--ink)",
          padding: "36px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <span style={{ fontSize: "3rem" }}>✨</span>
        <h1 style={{ fontSize: "2rem" }}>Who is learning today?</h1>
        <p className="text-muted" style={{ fontSize: "1.1rem" }}>
          Choose your profile to enter your calm learning space.
        </p>

        {loading ? (
          <p>Loading profiles…</p>
        ) : children.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p>No child profiles found.</p>
            <Link href="/parent/children" className="btn btn-kid btn-primary">
              Set Up Child Profile
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/kid/${child.id}`}
                className="btn btn-kid btn-lime"
                style={{ fontSize: "1.3rem" }}
              >
                {child.displayName} →
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: "12px" }}>
          <Link href="/parent" className="btn btn-sm">
            ← Return to Parent Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
