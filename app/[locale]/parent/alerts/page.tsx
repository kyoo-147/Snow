"use client";

import { useEffect, useState } from "react";
import { ParentShell } from "@/components/parent-shell";
import { fetchJson } from "@/components/api-client";

type Alert = {
  id: number;
  childId: number;
  childName: string;
  sessionId: number | null;
  source: "input" | "output";
  severity: "warning" | "critical";
  content: string;
  acknowledgedAt: string | null;
  createdAt: string;
};

export default function ParentAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unack">("all");
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  async function loadAlerts() {
    setLoading(true);
    try {
      const data = await fetchJson<Alert[]>("/api/alerts");
      setAlerts(data);
      setError("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load safety alerts.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  async function handleAcknowledge(alertId: number) {
    setAcknowledgingId(alertId);
    setError("");
    setStatusMessage("");

    try {
      await fetchJson(`/api/alerts/${alertId}`, {
        method: "PATCH",
      });

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, acknowledgedAt: new Date().toISOString() } : a
        )
      );
      setStatusMessage(`Alert #${alertId} has been acknowledged.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to acknowledge alert.";
      setError(msg);
    } finally {
      setAcknowledgingId(null);
    }
  }

  const displayedAlerts = alerts.filter((a) => {
    if (filter === "unack") return !a.acknowledgedAt;
    return true;
  });

  const unackCount = alerts.filter((a) => !a.acknowledgedAt).length;

  return (
    <ParentShell
      title="Safety Alerts"
      description="Review flagged content and safety triggers detected during child chat sessions."
    >
      <div aria-live="polite" aria-atomic="true">
        {error && (
          <div className="feedback-banner feedback-error" role="alert">
            {error}
          </div>
        )}
        {statusMessage && (
          <div className="feedback-banner feedback-success" role="status">
            {statusMessage}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setFilter("all")}
            className={`btn btn-sm ${filter === "all" ? "btn-primary" : ""}`}
            aria-pressed={filter === "all"}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setFilter("unack")}
            className={`btn btn-sm ${filter === "unack" ? "btn-primary" : ""}`}
            aria-pressed={filter === "unack"}
          >
            Unacknowledged ({unackCount})
          </button>
        </div>

        <button onClick={loadAlerts} className="btn btn-sm" aria-label="Refresh alerts">
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="empty-box">
          <p>Loading safety events…</p>
        </div>
      ) : displayedAlerts.length === 0 ? (
        <div className="empty-box">
          <h3>No safety alerts to display</h3>
          <p className="text-muted">
            {filter === "unack"
              ? "All safety events have been reviewed and acknowledged."
              : "No safety incidents or triggers have been recorded."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {displayedAlerts.map((alert) => {
            const isAck = Boolean(alert.acknowledgedAt);
            const isCritical = alert.severity === "critical";

            return (
              <article
                key={alert.id}
                className={`card ${isCritical && !isAck ? "card-soft" : ""}`}
                style={{
                  borderLeft: isCritical ? "6px solid var(--danger)" : "6px solid var(--warning)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      className={`badge ${isCritical ? "badge-danger" : "badge-warning"}`}
                    >
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="badge badge-mint">Child: {alert.childName}</span>
                    <span className="badge">Source: {alert.source}</span>
                    {alert.sessionId && <span className="badge">Session #{alert.sessionId}</span>}
                  </div>

                  <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </div>

                <div
                  style={{
                    background: "var(--paper)",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                    fontSize: "0.95rem",
                  }}
                >
                  <p style={{ fontWeight: 600, color: "var(--muted)", fontSize: "0.8rem", marginBottom: "4px" }}>
                    Trigger Content:
                  </p>
                  <p style={{ fontStyle: "italic" }}>&ldquo;{alert.content}&rdquo;</p>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "4px",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    {isAck ? (
                      <span className="badge badge-mint">
                        ✓ Acknowledged {alert.acknowledgedAt ? `(${new Date(alert.acknowledgedAt).toLocaleDateString()})` : ""}
                      </span>
                    ) : (
                      <span className="badge badge-warning">Pending Review</span>
                    )}
                  </div>

                  {!isAck && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledgingId === alert.id}
                      className="btn btn-sm btn-primary"
                      aria-label={`Acknowledge alert #${alert.id} for ${alert.childName}`}
                    >
                      {acknowledgingId === alert.id ? "Acknowledging…" : "Acknowledge Alert"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ParentShell>
  );
}
