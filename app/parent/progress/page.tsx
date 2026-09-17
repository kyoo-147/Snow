"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ParentShell } from "@/components/parent-shell";
import { fetchJson } from "@/components/api-client";

type Child = {
  id: number;
  displayName: string;
};

type LessonProgress = {
  id: number;
  title: string;
  status: "not_started" | "in_progress" | "completed";
  score: number | null;
  updatedAt: string | null;
};

type RoutineProgress = {
  id: number;
  title: string;
  currentStep: number;
  completedAt: string | null;
  totalSteps: number;
};

type ProgressData = {
  lessons: LessonProgress[];
  routines: RoutineProgress[];
};

function ProgressContent() {
  const searchParams = useSearchParams();
  const queryChildId = searchParams.get("childId");

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProgress = useCallback(async (childId: number) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson<ProgressData>(`/api/children/${childId}/progress`);
      setProgress(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load progress records.";
      setError(msg);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJson<Child[]>("/api/children")
      .then((data) => {
        setChildren(data);
        if (data.length > 0) {
          const initialId = queryChildId ? Number(queryChildId) : data[0].id;
          const exists = data.some((c) => c.id === initialId);
          const targetId = exists ? initialId : data[0].id;
          setSelectedChildId(targetId);
          loadProgress(targetId);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load children.");
        setLoading(false);
      });
  }, [queryChildId, loadProgress]);

  function handleSelectChild(id: number) {
    setSelectedChildId(id);
    loadProgress(id);
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <>
      <div aria-live="polite">
        {error && (
          <div className="feedback-banner feedback-error" role="alert">
            {error}
          </div>
        )}
      </div>

      {children.length > 1 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "28px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Select Child:</span>
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectChild(c.id)}
              className={`btn btn-sm ${c.id === selectedChildId ? "btn-lime" : ""}`}
              aria-pressed={c.id === selectedChildId}
            >
              {c.displayName}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="empty-box">
          <p>Loading real progress data for {selectedChild?.displayName || "child"}…</p>
        </div>
      ) : children.length === 0 ? (
        <div className="empty-box">
          <h3>No children profiles found</h3>
          <p className="text-muted">Add a child profile first to track progress records.</p>
        </div>
      ) : !progress ? (
        <div className="empty-box">
          <p>No progress data could be retrieved.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
          {/* Routines section */}
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2>Routines Progress</h2>
              <span className="badge badge-aqua">{progress.routines.length} Tracked</span>
            </div>

            {progress.routines.length === 0 ? (
              <div className="card card-soft">
                <p className="text-muted">No routines assigned or available yet.</p>
              </div>
            ) : (
              <div className="grid-2">
                {progress.routines.map((r) => {
                  const isCompleted = Boolean(r.completedAt);
                  return (
                    <div key={r.id} className="card card-soft" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <h3>{r.title}</h3>
                        {isCompleted ? (
                          <span className="badge badge-mint">Completed</span>
                        ) : (
                          <span className="badge">In Progress</span>
                        )}
                      </div>

                      <p style={{ fontSize: "0.95rem" }}>
                        <strong>Step Progress:</strong> Step {r.currentStep} of {r.totalSteps} steps
                      </p>

                      {r.completedAt && (
                        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                          Completed on: {new Date(r.completedAt).toLocaleDateString()}
                        </p>
                      )}

                      <div
                        style={{
                          width: "100%",
                          height: "12px",
                          background: "var(--paper)",
                          border: "1.5px solid var(--line)",
                          borderRadius: "999px",
                          overflow: "hidden",
                          marginTop: "6px",
                        }}
                        aria-label={`Progress bar: ${r.currentStep} of ${r.totalSteps} steps`}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${r.totalSteps > 0 ? Math.min(100, Math.round((r.currentStep / r.totalSteps) * 100)) : 0}%`,
                            background: isCompleted ? "var(--mint)" : "var(--lime)",
                            transition: "width 0.2s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Lessons section */}
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2>Lessons Progress</h2>
              <span className="badge badge-lilac">{progress.lessons.length} Tracked</span>
            </div>

            {progress.lessons.length === 0 ? (
              <div className="card card-soft">
                <p className="text-muted">No lessons available yet.</p>
              </div>
            ) : (
              <div className="grid-2">
                {progress.lessons.map((l) => (
                  <div key={l.id} className="card card-soft" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h3>{l.title}</h3>
                      <span
                        className={`badge ${
                          l.status === "completed"
                            ? "badge-mint"
                            : l.status === "in_progress"
                            ? "badge-lime"
                            : ""
                        }`}
                      >
                        {l.status === "completed"
                          ? "Completed"
                          : l.status === "in_progress"
                          ? "In Progress"
                          : "Not Started"}
                      </span>
                    </div>

                    {l.score !== null && (
                      <p style={{ fontSize: "0.95rem" }}>
                        <strong>Score:</strong> {l.score} pts
                      </p>
                    )}

                    {l.updatedAt && (
                      <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                        Last activity: {new Date(l.updatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default function ParentProgressPage() {
  return (
    <ParentShell
      title="Learning & Routine Progress"
      description="Real-time, persisted progress on routines and mini-lessons recorded directly from kid activities."
    >
      <Suspense fallback={<div className="empty-box"><p>Loading progress…</p></div>}>
        <ProgressContent />
      </Suspense>
    </ParentShell>
  );
}
