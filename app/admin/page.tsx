"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { fetchJson } from "@/components/api-client";

type Lesson = { id: number; title: string; active: number };
type Routine = { id: number; title: string; active: number };

export default function AdminOverviewPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetchJson<Lesson[]>("/api/admin/lessons"),
      fetchJson<Routine[]>("/api/admin/routines"),
    ])
      .then(([lessonsData, routinesData]) => {
        setLessons(lessonsData);
        setRoutines(routinesData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load admin resources.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <AdminShell
      title="Admin Management Console"
      description="Create, curate, edit, and organize curriculum lessons and structured daily routines."
    >
      <div aria-live="polite">
        {error && (
          <div className="feedback-banner feedback-error" role="alert">
            {error}
          </div>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: "36px" }}>
        <div className="card card-soft" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="badge badge-lilac">Curriculum</span>
            <span className="badge">{loading ? "…" : `${lessons.length} Total`}</span>
          </div>
          <h2>Learning Lessons</h2>
          <p className="text-muted" style={{ fontSize: "0.95rem" }}>
            Manage gentle, bite-sized socio-emotional and learning modules presented to children.
          </p>
          <div style={{ marginTop: "auto", paddingTop: "12px" }}>
            <Link href="/admin/lessons" className="btn btn-primary btn-sm">
              Manage Lessons →
            </Link>
          </div>
        </div>

        <div className="card card-soft" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="badge badge-lime">Structure</span>
            <span className="badge">{loading ? "…" : `${routines.length} Total`}</span>
          </div>
          <h2>Daily Routines</h2>
          <p className="text-muted" style={{ fontSize: "0.95rem" }}>
            Configure ordered step-by-step routines for transitions, after-school habits, and calm resets.
          </p>
          <div style={{ marginTop: "auto", paddingTop: "12px" }}>
            <Link href="/admin/routines" className="btn btn-primary btn-sm">
              Manage Routines →
            </Link>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
