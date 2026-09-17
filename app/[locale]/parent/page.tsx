"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ParentShell } from "@/components/parent-shell";
import { fetchJson } from "@/components/api-client";

type Child = {
  id: number;
  displayName: string;
  dateOfBirth?: string;
  supportNeeds?: string;
};

export default function ParentDashboard() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchJson<Child[]>("/api/children")
      .then((data) => {
        setChildren(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load children.");
        setLoading(false);
      });
  }, []);

  return (
    <ParentShell
      title="Parent Workspace"
      description="Monitor learning activities, manage child profiles, review safety alerts, and launch Kid Mode."
    >
      <div aria-live="polite">
        {error && (
          <div className="feedback-banner feedback-error" role="alert">
            {error}
          </div>
        )}
      </div>

      <section style={{ marginBottom: "36px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2>Your Children</h2>
          <Link href="/parent/children" className="btn btn-sm btn-primary">
            + Manage Children
          </Link>
        </div>

        {loading ? (
          <div className="empty-box">
            <p>Loading children profiles…</p>
          </div>
        ) : children.length === 0 ? (
          <div className="empty-box">
            <h3>No child profiles added yet</h3>
            <p className="text-muted">
              Create your child’s profile to unlock personalized routines, lessons, and safe chat.
            </p>
            <Link href="/parent/children" className="btn btn-primary" style={{ marginTop: "12px" }}>
              Add Your First Child
            </Link>
          </div>
        ) : (
          <div className="grid-2">
            {children.map((child) => (
              <div key={child.id} className="card card-soft" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span className="badge badge-mint" style={{ marginBottom: "6px" }}>
                      Active Profile
                    </span>
                    <h3>{child.displayName}</h3>
                  </div>
                  <span className="badge">ID #{child.id}</span>
                </div>

                {child.dateOfBirth && (
                  <p style={{ fontSize: "0.9rem" }}>
                    <strong>Date of Birth:</strong> {child.dateOfBirth}
                  </p>
                )}

                <p style={{ fontSize: "0.95rem", color: "var(--muted)", flex: 1 }}>
                  {child.supportNeeds || "No specific support needs documented."}
                </p>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap" }}>
                  <Link href={`/kid/${child.id}`} className="btn btn-lime btn-sm">
                    Enter Kid Mode →
                  </Link>
                  <Link href={`/parent/progress?childId=${child.id}`} className="btn btn-sm">
                    View Progress
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: "16px" }}>Quick Hub</h2>
        <div className="grid-3">
          <Link href="/parent/progress" className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span className="badge badge-aqua" style={{ width: "fit-content" }}>
              Activity
            </span>
            <h3>Learning Progress</h3>
            <p className="text-muted" style={{ fontSize: "0.9rem" }}>
              Track completed routines, routine steps, and lesson scores for each child.
            </p>
          </Link>

          <Link href="/parent/alerts" className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span className="badge badge-warning" style={{ width: "fit-content" }}>
              Guardrails
            </span>
            <h3>Safety Alerts</h3>
            <p className="text-muted" style={{ fontSize: "0.9rem" }}>
              Review input/output flags from chat sessions and acknowledge safety events.
            </p>
          </Link>

          <Link href="/parent/memories" className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span className="badge badge-lilac" style={{ width: "fit-content" }}>
              Personalization
            </span>
            <h3>Memories</h3>
            <p className="text-muted" style={{ fontSize: "0.9rem" }}>
              Inspect and curate child-specific memory snippets and observations.
            </p>
          </Link>
        </div>
      </section>
    </ParentShell>
  );
}
