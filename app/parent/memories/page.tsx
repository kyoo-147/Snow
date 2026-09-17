"use client";

import { useEffect, useState, useCallback } from "react";
import { ParentShell } from "@/components/parent-shell";
import { fetchJson } from "@/components/api-client";

type Child = {
  id: number;
  displayName: string;
};

type Memory = {
  id: number;
  childId: number;
  childName?: string;
  kind: string;
  content: string;
  createdAt: string;
};

export default function ParentMemoriesPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadMemories = useCallback(async (childId: number) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson<Memory[]>(`/api/children/${childId}/memories`);
      setMemories(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load memories.";
      setError(msg);
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJson<Child[]>("/api/children")
      .then((data) => {
        setChildren(data);
        if (data.length > 0) {
          setSelectedChildId(data[0].id);
          loadMemories(data[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load children.");
        setLoading(false);
      });
  }, [loadMemories]);

  function handleSelectChild(id: number) {
    setSelectedChildId(id);
    loadMemories(id);
  }

  async function handleDeleteMemory(memoryId: number) {
    if (!selectedChildId) return;
    if (!confirm("Are you sure you want to delete this memory?")) return;

    setDeletingId(memoryId);
    setError("");
    setStatusMessage("");

    try {
      await fetchJson(`/api/children/${selectedChildId}/memories/${memoryId}`, {
        method: "DELETE",
      });
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      setStatusMessage("Memory deleted successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete memory.";
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <ParentShell
      title="Child Memories & Preferences"
      description="Review captured preferences, interests, and milestones curated from conversations and routines."
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

      {children.length > 1 && (
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", alignItems: "center", flexWrap: "wrap" }}>
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
          <p>Loading memories for {selectedChild?.displayName || "child"}…</p>
        </div>
      ) : children.length === 0 ? (
        <div className="empty-box">
          <h3>No children profiles found</h3>
          <p className="text-muted">Add a child profile first to manage memories.</p>
        </div>
      ) : memories.length === 0 ? (
        <div className="empty-box">
          <h3>No memories recorded yet</h3>
          <p className="text-muted">
            As {selectedChild?.displayName || "your child"} chats and interacts, key interests and
            preferences will be saved here.
          </p>
        </div>
      ) : (
        <div className="grid-2">
          {memories.map((mem) => (
            <div
              key={mem.id}
              className="card card-soft"
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span className="badge badge-lilac">{mem.kind}</span>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                  {new Date(mem.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p style={{ fontSize: "1rem", flex: 1 }}>{mem.content}</p>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleDeleteMemory(mem.id)}
                  disabled={deletingId === mem.id}
                  className="btn btn-danger btn-sm"
                  aria-label={`Delete memory #${mem.id}`}
                >
                  {deletingId === mem.id ? "Deleting…" : "Delete Memory"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ParentShell>
  );
}
