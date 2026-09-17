"use client";

import Link from "next/link";
import { use, useEffect, useState, useCallback } from "react";
import { KidShell } from "@/components/kid-shell";
import { fetchJson } from "@/components/api-client";

type Step = {
  id: number;
  position: number;
  title: string;
  completed?: boolean;
};

type Routine = {
  id: number;
  title: string;
  description?: string;
  steps: Step[];
  currentStep?: number;
};

export default function KidRoutinePage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completingStepId, setCompletingStepId] = useState<number | null>(null);
  const [celebration, setCelebration] = useState("");

  const loadRoutines = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // First attempt canonical GET /api/children/{childId}/routines
      let data: Routine[] = [];
      try {
        data = await fetchJson<Routine[]>(`/api/children/${childId}/routines`);
      } catch {
        // Fallback: fetch routines from progress or admin if not yet wired
        const prog = await fetchJson<{ routines: Array<{ id: number; title: string; currentStep: number; totalSteps: number }> }>(
          `/api/children/${childId}/progress`
        );
        data = prog.routines.map((r) => ({
          id: r.id,
          title: r.title,
          steps: Array.from({ length: r.totalSteps }, (_, i) => ({
            id: i + 1,
            position: i + 1,
            title: `Step ${i + 1}`,
            completed: i + 1 <= r.currentStep,
          })),
          currentStep: r.currentStep,
        }));
      }

      setRoutines(data);
      if (data.length > 0) {
        setSelectedRoutine(data[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load routines.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  async function handleCompleteStep(routineId: number, stepId: number, stepTitle: string) {
    setCompletingStepId(stepId);
    setError("");
    setCelebration("");

    try {
      await fetchJson(
        `/api/children/${childId}/routines/${routineId}/steps/${stepId}/complete`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      // Update local step state immediately
      setRoutines((prev) =>
        prev.map((r) => {
          if (r.id !== routineId) return r;
          return {
            ...r,
            steps: r.steps.map((s) => (s.id === stepId ? { ...s, completed: true } : s)),
          };
        })
      );

      if (selectedRoutine && selectedRoutine.id === routineId) {
        setSelectedRoutine((prev) =>
          prev
            ? {
                ...prev,
                steps: prev.steps.map((s) => (s.id === stepId ? { ...s, completed: true } : s)),
              }
            : null
        );
      }

      setCelebration(`Great job! You finished: "${stepTitle}" ⭐`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save step completion.";
      setError(msg);
    } finally {
      setCompletingStepId(null);
    }
  }

  return (
    <KidShell
      childId={childId}
      title="Daily Routines"
      subtitle="Follow your gentle steps one at a time. Press the green button when you finish each one!"
    >
      <div aria-live="polite" aria-atomic="true">
        {error && (
          <div className="feedback-banner feedback-error" role="alert">
            {error}
          </div>
        )}
        {celebration && (
          <div
            className="feedback-banner feedback-success"
            style={{ fontSize: "1.2rem", textAlign: "center", padding: "18px" }}
            role="status"
          >
            {celebration}
          </div>
        )}
      </div>

      {loading ? (
        <div className="empty-box">
          <p style={{ fontSize: "1.2rem" }}>Loading your routines…</p>
        </div>
      ) : routines.length === 0 ? (
        <div className="empty-box">
          <p style={{ fontSize: "1.2rem" }}>No routines set up yet.</p>
          <Link href={`/kid/${childId}`} className="btn btn-kid btn-mint" style={{ marginTop: "12px" }}>
            Return to Kid Home
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {routines.length > 1 && (
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              {routines.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoutine(r)}
                  className={`btn btn-kid ${selectedRoutine?.id === r.id ? "btn-lime" : ""}`}
                  style={{ minHeight: "64px", fontSize: "1.1rem" }}
                  aria-pressed={selectedRoutine?.id === r.id}
                >
                  {r.title}
                </button>
              ))}
            </div>
          )}

          {selectedRoutine && (
            <div className="card" style={{ border: "3px solid var(--ink)", padding: "28px" }}>
              <h2 style={{ fontSize: "1.6rem", marginBottom: "8px", textAlign: "center" }}>
                {selectedRoutine.title}
              </h2>
              {selectedRoutine.description && (
                <p style={{ textAlign: "center", color: "var(--muted)", marginBottom: "20px" }}>
                  {selectedRoutine.description}
                </p>
              )}

              {/* Steps list with large targets */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {selectedRoutine.steps.map((step, idx) => {
                  const isDone = Boolean(step.completed);
                  return (
                    <div
                      key={step.id}
                      className={`card ${isDone ? "card-mint" : "card-soft"}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "18px 24px",
                        border: "2px solid var(--ink)",
                        gap: "16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <span
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            border: "2px solid var(--ink)",
                            display: "grid",
                            placeItems: "center",
                            background: isDone ? "var(--mint)" : "var(--paper)",
                            fontWeight: 800,
                            fontSize: "1.1rem",
                          }}
                        >
                          {isDone ? "✓" : idx + 1}
                        </span>
                        <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>{step.title}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCompleteStep(selectedRoutine.id, step.id, step.title)}
                        disabled={isDone || completingStepId === step.id}
                        className={`btn btn-kid ${isDone ? "" : "btn-lime"}`}
                        style={{ minHeight: "64px", minWidth: "120px", fontSize: "1.1rem" }}
                        aria-label={isDone ? `Step "${step.title}" finished` : `Mark "${step.title}" as complete`}
                      >
                        {completingStepId === step.id
                          ? "Saving…"
                          : isDone
                          ? "Done! ✓"
                          : "Complete ⭐"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Maximum two primary options */}
          <div className="kid-choices-grid" style={{ marginTop: "12px" }}>
            <Link
              href={`/kid/${childId}`}
              className="btn btn-kid card-aqua"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "68px" }}
            >
              ← Done with Routines
            </Link>
            <Link
              href={`/kid/${childId}/lesson`}
              className="btn btn-kid card-lilac"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "68px" }}
            >
              Go to Mini Lesson 📘
            </Link>
          </div>
        </div>
      )}
    </KidShell>
  );
}
