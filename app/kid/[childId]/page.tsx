"use client";

import Link from "next/link";
import { use } from "react";
import { KidShell } from "@/components/kid-shell";

export default function KidHomePage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = use(params);

  return (
    <KidShell
      childId={childId}
      title="What would you like to do?"
      subtitle="Choose one thing to work on today. Take your time."
    >
      {/* Maximum two primary choices per screen with 64px+ targets */}
      <div className="kid-choices-grid">
        <Link
          href={`/kid/${childId}/chat`}
          className="kid-choice-card card-mint"
          aria-label="Talk with Buddy - Start or continue a friendly text chat"
        >
          <span style={{ fontSize: "3rem" }}>💬</span>
          <span>Talk with Buddy</span>
          <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--muted)" }}>
            Chat, ask questions, or tell a story
          </span>
        </Link>

        <Link
          href={`/kid/${childId}/routine`}
          className="kid-choice-card card-lime"
          aria-label="Today's Routine - View and complete daily steps"
        >
          <span style={{ fontSize: "3rem" }}>⭐</span>
          <span>Today&apos;s Routine</span>
          <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--muted)" }}>
            Check off your daily steps one by one
          </span>
        </Link>
      </div>

      {/* Secondary focused options */}
      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ textAlign: "center", fontWeight: 700, fontSize: "1rem", color: "var(--muted)" }}>
          More quiet activities
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <Link
            href={`/kid/${childId}/lesson`}
            className="btn btn-kid card-aqua"
            style={{ minHeight: "72px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontSize: "1.15rem" }}
            aria-label="Mini Lesson - Explore a gentle learning topic"
          >
            <span style={{ fontSize: "1.8rem" }}>📘</span>
            <span>Mini Lesson</span>
          </Link>

          <Link
            href={`/kid/${childId}/emotion`}
            className="btn btn-kid card-lilac"
            style={{ minHeight: "72px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontSize: "1.15rem" }}
            aria-label="How I Feel - Share your emotion check-in"
          >
            <span style={{ fontSize: "1.8rem" }}>💛</span>
            <span>How I Feel</span>
          </Link>
        </div>
      </div>
    </KidShell>
  );
}
