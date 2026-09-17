"use client";

import Link from "next/link";
import { use, useState } from "react";
import { KidShell } from "@/components/kid-shell";
import { fetchJson } from "@/components/api-client";

const EMOTIONS = [
  { label: "Happy", icon: "😊", bg: "card-lime" },
  { label: "Calm", icon: "😌", bg: "card-mint" },
  { label: "Tired", icon: "😴", bg: "card-aqua" },
  { label: "Sad", icon: "😢", bg: "card-lilac" },
  { label: "Frustrated", icon: "😤", bg: "card-soft" },
];

export default function KidEmotionPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<number>(3);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSaveEmotion() {
    if (!selectedEmotion || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      await fetchJson(`/api/children/${childId}/emotion`, {
        method: "POST",
        body: JSON.stringify({
          childId: Number(childId),
          emotion: selectedEmotion,
          intensity,
        }),
      });
      setSaved(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save your check-in.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setSelectedEmotion(null);
    setIntensity(3);
    setSaved(false);
  }

  return (
    <KidShell
      childId={childId}
      title="How are you feeling right now?"
      subtitle="All feelings are normal and welcome here. Choose how you feel inside."
    >
      <div aria-live="polite" aria-atomic="true">
        {error && (
          <div className="feedback-banner feedback-error" role="alert">
            {error}
          </div>
        )}
      </div>

      {saved ? (
        <div
          className="card card-mint"
          style={{
            border: "3px solid var(--ink)",
            textAlign: "center",
            padding: "36px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
          role="status"
        >
          <span style={{ fontSize: "3.5rem" }}>🌱</span>
          <h2 style={{ fontSize: "1.8rem" }}>Thank you for sharing!</h2>
          <p style={{ fontSize: "1.2rem", maxWidth: "480px", margin: "0 auto" }}>
            You shared that you are feeling <strong>{selectedEmotion}</strong>. It takes courage to
            notice your feelings.
          </p>

          <div className="kid-choices-grid" style={{ marginTop: "16px" }}>
            <Link
              href={`/kid/${childId}`}
              className="btn btn-kid btn-lime"
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              ← Back to Kid Home
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-kid"
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              Check in again ↺
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Emotion selection buttons (min 64px targets) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "14px",
            }}
            role="radiogroup"
            aria-label="Select your current emotion"
          >
            {EMOTIONS.map((item) => {
              const isSelected = selectedEmotion === item.label;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setSelectedEmotion(item.label)}
                  className={`card ${item.bg}`}
                  style={{
                    minHeight: "110px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: "pointer",
                    border: isSelected ? "4px solid var(--ink)" : "2px solid var(--ink)",
                    transform: isSelected ? "scale(1.04)" : "none",
                    boxShadow: isSelected ? "0 4px 0 var(--ink)" : "none",
                  }}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${item.label} emotion`}
                >
                  <span style={{ fontSize: "2.5rem" }}>{item.icon}</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Intensity slider if emotion is picked */}
          {selectedEmotion && (
            <div
              className="card card-soft"
              style={{
                border: "3px solid var(--ink)",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                textAlign: "center",
              }}
            >
              <h3 style={{ fontSize: "1.25rem" }}>
                How strong does that feeling feel? (1 = small, 5 = very strong)
              </h3>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setIntensity(lvl)}
                    className={`btn btn-kid ${intensity === lvl ? "btn-lime" : ""}`}
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      fontSize: "1.3rem",
                      fontWeight: 800,
                    }}
                    aria-label={`Intensity level ${lvl}`}
                    aria-pressed={intensity === lvl}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action button */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={handleSaveEmotion}
              disabled={!selectedEmotion || submitting}
              className="btn btn-kid btn-mint"
              style={{
                minHeight: "68px",
                width: "100%",
                maxWidth: "420px",
                fontSize: "1.25rem",
              }}
              aria-label="Save feeling check-in"
            >
              {submitting ? "Saving…" : "Save My Feeling ⭐"}
            </button>
          </div>

          {/* Return path */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Link
              href={`/kid/${childId}`}
              className="btn btn-kid"
              style={{ minHeight: "56px", fontSize: "1.05rem" }}
            >
              ← Back to Kid Home
            </Link>
          </div>
        </div>
      )}
    </KidShell>
  );
}
