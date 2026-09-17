"use client";

import Link from "next/link";
import { use, useEffect, useState, useCallback } from "react";
import { KidShell } from "@/components/kid-shell";
import { fetchJson } from "@/components/api-client";

type Lesson = {
  id: number;
  title: string;
  description?: string;
  content?: string;
  status?: "not_started" | "in_progress" | "completed";
  score?: number | null;
};

export default function KidLessonPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);
  const [celebration, setCelebration] = useState("");

  const loadLessons = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let data: Lesson[] = [];
      try {
        data = await fetchJson<Lesson[]>(`/api/children/${childId}/lessons`);
      } catch {
        // Fallback to progress endpoint
        const prog = await fetchJson<{ lessons: Lesson[] }>(
          `/api/children/${childId}/progress`
        );
        data = prog.lessons;
      }

      setLessons(data);
      if (data.length > 0) {
        setSelectedLesson(data[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load lessons.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  async function handleCompleteLesson(lessonId: number) {
    setCompleting(true);
    setError("");
    setCelebration("");

    try {
      await fetchJson(`/api/children/${childId}/lessons/${lessonId}/complete`, {
        method: "POST",
        body: JSON.stringify({ score: 100 }),
      });

      setLessons((prev) =>
        prev.map((l) => (l.id === lessonId ? { ...l, status: "completed", score: 100 } : l))
      );

      if (selectedLesson && selectedLesson.id === lessonId) {
        setSelectedLesson((prev) =>
          prev ? { ...prev, status: "completed", score: 100 } : null
        );
      }

      setCelebration("Hooray! You completed this lesson! You did wonderful! 🌟");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save lesson completion.";
      setError(msg);
    } finally {
      setCompleting(false);
    }
  }

  const isCompleted = selectedLesson?.status === "completed";

  return (
    <KidShell
      childId={childId}
      title="Mini Lessons"
      subtitle="Read, explore, and learn something new at your own gentle pace."
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
          <p style={{ fontSize: "1.2rem" }}>Loading lessons…</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="empty-box">
          <p style={{ fontSize: "1.2rem" }}>No lessons available right now.</p>
          <Link href={`/kid/${childId}`} className="btn btn-kid btn-mint" style={{ marginTop: "12px" }}>
            Return to Kid Home
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {lessons.length > 1 && (
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              {lessons.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setSelectedLesson(l);
                    setCelebration("");
                  }}
                  className={`btn btn-kid ${selectedLesson?.id === l.id ? "btn-lime" : ""}`}
                  style={{ minHeight: "64px", fontSize: "1.1rem" }}
                  aria-pressed={selectedLesson?.id === l.id}
                >
                  {l.title}
                </button>
              ))}
            </div>
          )}

          {selectedLesson && (
            <div
              className="card card-soft"
              style={{
                border: "3px solid var(--ink)",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="badge badge-aqua" style={{ fontSize: "1rem", padding: "6px 14px" }}>
                  Lesson Topic
                </span>
                {isCompleted && (
                  <span className="badge badge-mint" style={{ fontSize: "1rem", padding: "6px 14px" }}>
                    ✓ Completed
                  </span>
                )}
              </div>

              <h2 style={{ fontSize: "1.8rem" }}>{selectedLesson.title}</h2>

              {selectedLesson.description && (
                <p style={{ fontSize: "1.15rem", color: "var(--muted)", fontStyle: "italic" }}>
                  {selectedLesson.description}
                </p>
              )}

              <div
                style={{
                  background: "var(--paper)",
                  padding: "24px",
                  borderRadius: "var(--radius-md)",
                  border: "2px solid var(--line)",
                  fontSize: "1.25rem",
                  lineHeight: 1.6,
                }}
              >
                {selectedLesson.content ||
                  "Take a moment to breathe in deeply, notice how your body feels, and know that you are doing great today."}
              </div>

              <div style={{ marginTop: "12px", display: "flex", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => handleCompleteLesson(selectedLesson.id)}
                  disabled={isCompleted || completing}
                  className={`btn btn-kid ${isCompleted ? "" : "btn-lime"}`}
                  style={{ minHeight: "68px", width: "100%", maxWidth: "420px", fontSize: "1.3rem" }}
                  aria-label={
                    isCompleted
                      ? `Lesson ${selectedLesson.title} already completed`
                      : `Complete lesson ${selectedLesson.title}`
                  }
                >
                  {completing
                    ? "Saving…"
                    : isCompleted
                    ? "Lesson Completed! ✓"
                    : "I Finished This Lesson! 🎉"}
                </button>
              </div>
            </div>
          )}

          {/* Maximum two choices */}
          <div className="kid-choices-grid" style={{ marginTop: "12px" }}>
            <Link
              href={`/kid/${childId}`}
              className="btn btn-kid card-mint"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "68px" }}
            >
              ← Back to Kid Home
            </Link>
            <Link
              href={`/kid/${childId}/emotion`}
              className="btn btn-kid card-lilac"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "68px" }}
            >
              How do you feel now? 💛
            </Link>
          </div>
        </div>
      )}
    </KidShell>
  );
}
