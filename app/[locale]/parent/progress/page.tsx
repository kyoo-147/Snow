"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ParentShell } from "@/components/parent-shell";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("parent.progress");
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
      const msg = err instanceof Error ? err.message : t("failedLoadProgress");
      setError(msg);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

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
        setError(err.message || t("failedLoadChildren"));
        setLoading(false);
      });
  }, [queryChildId, loadProgress, t]);

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
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{t("selectChild")}</span>
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
          <p>{t("loadingProgress", { name: selectedChild?.displayName || t("childFallback") })}</p>
        </div>
      ) : children.length === 0 ? (
        <div className="empty-box">
          <h3>{t("noChildrenProfiles")}</h3>
          <p className="text-muted">{t("noChildrenDesc")}</p>
        </div>
      ) : !progress ? (
        <div className="empty-box">
          <p>{t("noProgressData")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
          {/* Routines section */}
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2>{t("routinesProgress")}</h2>
              <span className="badge badge-aqua">{t("trackedCount", { count: progress.routines.length })}</span>
            </div>

            {progress.routines.length === 0 ? (
              <div className="card card-soft">
                <p className="text-muted">{t("noRoutines")}</p>
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
                        <strong>{t("stepProgress")}</strong> {t("stepOf", { current: r.currentStep, total: r.totalSteps })}
                      </p>

                      {r.completedAt && (
                        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                          {t("completedOn", { date: new Date(r.completedAt).toLocaleDateString() })}
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
                        aria-label={t("progressBarAria", { current: r.currentStep, total: r.totalSteps })}
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
              <h2>{t("lessonsProgress")}</h2>
              <span className="badge badge-lilac">{t("trackedCount", { count: progress.lessons.length })}</span>
            </div>

            {progress.lessons.length === 0 ? (
              <div className="card card-soft">
                <p className="text-muted">{t("noLessons")}</p>
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
                        <strong>{t("scorePrefix")}</strong> {t("scoreSuffix", { score: l.score })}
                      </p>
                    )}

                    {l.updatedAt && (
                      <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                        {t("lastActivity", { date: new Date(l.updatedAt).toLocaleString() })}
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
  const t = useTranslations("parent.progress");
  return (
    <ParentShell
      title={t("title")}
      description={t("description")}
    >
      <Suspense fallback={<div className="empty-box"><p>{t("loadingFallback")}</p></div>}>
        <ProgressContent />
      </Suspense>
    </ParentShell>
  );
}
