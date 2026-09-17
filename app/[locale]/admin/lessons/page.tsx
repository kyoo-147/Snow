"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { fetchJson } from "@/components/api-client";

type Lesson = {
  id: number;
  title: string;
  description: string;
  content: string;
  active: number;
  createdAt: string;
};

export default function AdminLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Add form state
  const [isAdding, setIsAdding] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addContent, setAddContent] = useState("");
  const [addActive, setAddActive] = useState(true);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit form state
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Deleting / toggling state
  const [actionId, setActionId] = useState<number | null>(null);

  async function loadLessons() {
    setLoading(true);
    try {
      const data = await fetchJson<Lesson[]>("/api/admin/lessons");
      setLessons(data);
      setError("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load lessons.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLessons();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSubmittingAdd(true);
    setError("");
    setStatusMessage("");

    try {
      const created = await fetchJson<Lesson>("/api/admin/lessons", {
        method: "POST",
        body: JSON.stringify({
          title: addTitle.trim(),
          description: addDesc.trim(),
          content: addContent.trim(),
          active: addActive,
        }),
      });

      setLessons((prev) => [...prev, created]);
      setAddTitle("");
      setAddDesc("");
      setAddContent("");
      setAddActive(true);
      setIsAdding(false);
      setStatusMessage(`Lesson "${created.title}" added successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create lesson.";
      setError(msg);
    } finally {
      setSubmittingAdd(false);
    }
  }

  function startEdit(lesson: Lesson) {
    setEditingLesson(lesson);
    setEditTitle(lesson.title);
    setEditDesc(lesson.description || "");
    setEditContent(lesson.content || "");
    setEditActive(Boolean(lesson.active));
    setError("");
    setStatusMessage("");
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingLesson) return;
    setSubmittingEdit(true);
    setError("");
    setStatusMessage("");

    try {
      const updated = await fetchJson<Lesson>(`/api/admin/lessons/${editingLesson.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
          content: editContent.trim(),
          active: editActive,
        }),
      });

      setLessons((prev) =>
        prev.map((l) =>
          l.id === editingLesson.id
            ? {
                ...l,
                title: updated.title,
                description: updated.description,
                content: updated.content,
                active: updated.active ? 1 : 0,
              }
            : l
        )
      );
      setEditingLesson(null);
      setStatusMessage(`Lesson updated successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update lesson.";
      setError(msg);
    } finally {
      setSubmittingEdit(false);
    }
  }

  async function handleToggleActive(lesson: Lesson) {
    const nextActive = !lesson.active;
    setActionId(lesson.id);
    setError("");
    setStatusMessage("");

    try {
      await fetchJson(`/api/admin/lessons/${lesson.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: nextActive }),
      });

      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, active: nextActive ? 1 : 0 } : l))
      );
      setStatusMessage(
        `Lesson "${lesson.title}" ${nextActive ? "activated" : "disabled"} successfully.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle lesson status.";
      setError(msg);
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(lesson: Lesson) {
    if (!confirm(`Are you sure you want to delete lesson "${lesson.title}"?`)) return;
    setActionId(lesson.id);
    setError("");
    setStatusMessage("");

    try {
      await fetchJson(`/api/admin/lessons/${lesson.id}`, {
        method: "DELETE",
      });
      setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
      setStatusMessage(`Lesson "${lesson.title}" deleted.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete lesson.";
      setError(msg);
    } finally {
      setActionId(null);
    }
  }

  return (
    <AdminShell
      title="Curriculum Lessons"
      description="Create, edit, toggle active status, and remove lessons displayed to kids."
      actions={
        !isAdding && (
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingLesson(null);
            }}
            className="btn btn-primary"
          >
            + Create New Lesson
          </button>
        )
      }
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

      {/* Add form */}
      {isAdding && (
        <div className="card card-soft" style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2>Create New Lesson</h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="btn btn-sm"
              aria-label="Cancel adding lesson"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label className="form-label" htmlFor="add-title">
                Lesson Title *
              </label>
              <input
                id="add-title"
                type="text"
                className="input"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="e.g. Recognizing Calm Breathing"
                required
                maxLength={160}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="add-desc">
                Short Description
              </label>
              <input
                id="add-desc"
                type="text"
                className="input"
                value={addDesc}
                onChange={(e) => setAddDesc(e.target.value)}
                placeholder="Brief summary for parents"
                maxLength={1000}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="add-content">
                Lesson Content (Child-friendly text)
              </label>
              <textarea
                id="add-content"
                className="textarea"
                value={addContent}
                onChange={(e) => setAddContent(e.target.value)}
                placeholder="The text shown to the child..."
                maxLength={10000}
              />
            </div>

            <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
              <input
                id="add-active"
                type="checkbox"
                checked={addActive}
                onChange={(e) => setAddActive(e.target.checked)}
                style={{ width: "20px", height: "20px" }}
              />
              <label htmlFor="add-active" className="form-label" style={{ margin: 0, cursor: "pointer" }}>
                Make Active Immediately
              </label>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button type="submit" className="btn btn-primary" disabled={submittingAdd}>
                {submittingAdd ? "Saving…" : "Save Lesson"}
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit form */}
      {editingLesson && (
        <div className="card card-lilac" style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2>Edit Lesson: {editingLesson.title}</h2>
            <button
              type="button"
              onClick={() => setEditingLesson(null)}
              className="btn btn-sm"
              aria-label="Cancel editing lesson"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleEdit}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-title">
                Lesson Title *
              </label>
              <input
                id="edit-title"
                type="text"
                className="input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                maxLength={160}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-desc">
                Short Description
              </label>
              <input
                id="edit-desc"
                type="text"
                className="input"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                maxLength={1000}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-content">
                Lesson Content
              </label>
              <textarea
                id="edit-content"
                className="textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={10000}
              />
            </div>

            <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
              <input
                id="edit-active"
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                style={{ width: "20px", height: "20px" }}
              />
              <label htmlFor="edit-active" className="form-label" style={{ margin: 0, cursor: "pointer" }}>
                Active Status
              </label>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button type="submit" className="btn btn-primary" disabled={submittingEdit}>
                {submittingEdit ? "Updating…" : "Update Lesson"}
              </button>
              <button
                type="button"
                onClick={() => setEditingLesson(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lesson items */}
      {loading ? (
        <div className="empty-box">
          <p>Loading lesson records…</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="empty-box">
          <h3>No lessons defined yet</h3>
          <p className="text-muted">Click &ldquo;+ Create New Lesson&rdquo; to build your first module.</p>
        </div>
      ) : (
        <div className="grid-2">
          {lessons.map((lesson) => {
            const isActive = Boolean(lesson.active);
            return (
              <div
                key={lesson.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  opacity: isActive ? 1 : 0.75,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span
                      className={`badge ${isActive ? "badge-mint" : "badge-warning"}`}
                      style={{ marginBottom: "6px" }}
                    >
                      {isActive ? "Active" : "Disabled"}
                    </span>
                    <h3>{lesson.title}</h3>
                  </div>
                  <span className="badge">ID #{lesson.id}</span>
                </div>

                {lesson.description && (
                  <p style={{ fontSize: "0.95rem", color: "var(--muted)" }}>
                    {lesson.description}
                  </p>
                )}

                {lesson.content && (
                  <div
                    style={{
                      background: "var(--soft)",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.9rem",
                      lineHeight: 1.4,
                      maxHeight: "120px",
                      overflowY: "auto",
                    }}
                  >
                    {lesson.content}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(lesson)}
                    disabled={actionId === lesson.id}
                    className="btn btn-sm"
                    aria-label={`${isActive ? "Disable" : "Enable"} lesson ${lesson.title}`}
                  >
                    {actionId === lesson.id ? "Saving…" : isActive ? "Disable" : "Enable"}
                  </button>

                  <button
                    type="button"
                    onClick={() => startEdit(lesson)}
                    className="btn btn-sm"
                    aria-label={`Edit lesson ${lesson.title}`}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(lesson)}
                    disabled={actionId === lesson.id}
                    className="btn btn-danger btn-sm"
                    aria-label={`Delete lesson ${lesson.title}`}
                  >
                    {actionId === lesson.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
