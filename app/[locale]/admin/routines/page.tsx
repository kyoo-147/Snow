"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { fetchJson } from "@/components/api-client";

type RoutineStep = {
  id: number;
  position: number;
  title: string;
};

type Routine = {
  id: number;
  title: string;
  description: string;
  active: number;
  createdAt: string;
  steps: RoutineStep[];
};

export default function AdminRoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Add routine state
  const [isAdding, setIsAdding] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addActive, setAddActive] = useState(true);
  const [addSteps, setAddSteps] = useState<string[]>([""]);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit routine state
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editSteps, setEditSteps] = useState<string[]>([""]);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Action ID for loading states
  const [actionId, setActionId] = useState<number | null>(null);

  async function loadRoutines() {
    setLoading(true);
    try {
      const data = await fetchJson<Routine[]>("/api/admin/routines");
      setRoutines(data);
      setError("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load routines.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoutines();
  }, []);

  // Helpers for add steps
  function handleAddStepRow() {
    if (addSteps.length < 30) {
      setAddSteps((prev) => [...prev, ""]);
    }
  }

  function handleRemoveAddStepRow(index: number) {
    if (addSteps.length > 1) {
      setAddSteps((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function handleAddStepChange(index: number, val: string) {
    setAddSteps((prev) => prev.map((s, i) => (i === index ? val : s)));
  }

  // Helpers for edit steps
  function handleEditStepRow() {
    if (editSteps.length < 30) {
      setEditSteps((prev) => [...prev, ""]);
    }
  }

  function handleRemoveEditStepRow(index: number) {
    if (editSteps.length > 1) {
      setEditSteps((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function handleEditStepChange(index: number, val: string) {
    setEditSteps((prev) => prev.map((s, i) => (i === index ? val : s)));
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const cleanSteps = addSteps.map((s) => s.trim()).filter(Boolean);
    if (cleanSteps.length === 0) {
      setError("Please add at least one routine step.");
      return;
    }

    setSubmittingAdd(true);
    setError("");
    setStatusMessage("");

    try {
      await fetchJson("/api/admin/routines", {
        method: "POST",
        body: JSON.stringify({
          title: addTitle.trim(),
          description: addDesc.trim(),
          active: addActive,
          steps: cleanSteps,
        }),
      });

      await loadRoutines();
      setAddTitle("");
      setAddDesc("");
      setAddActive(true);
      setAddSteps([""]);
      setIsAdding(false);
      setStatusMessage("New routine with steps created successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create routine.";
      setError(msg);
    } finally {
      setSubmittingAdd(false);
    }
  }

  function startEdit(routine: Routine) {
    setEditingRoutine(routine);
    setEditTitle(routine.title);
    setEditDesc(routine.description || "");
    setEditActive(Boolean(routine.active));
    setEditSteps(
      routine.steps && routine.steps.length > 0
        ? routine.steps.map((s) => s.title)
        : [""]
    );
    setError("");
    setStatusMessage("");
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingRoutine) return;
    const cleanSteps = editSteps.map((s) => s.trim()).filter(Boolean);
    if (cleanSteps.length === 0) {
      setError("Please provide at least one routine step.");
      return;
    }

    setSubmittingEdit(true);
    setError("");
    setStatusMessage("");

    try {
      await fetchJson(`/api/admin/routines/${editingRoutine.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
          active: editActive,
          steps: cleanSteps,
        }),
      });

      await loadRoutines();
      setEditingRoutine(null);
      setStatusMessage("Routine and steps updated successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update routine.";
      setError(msg);
    } finally {
      setSubmittingEdit(false);
    }
  }

  async function handleToggleActive(routine: Routine) {
    const nextActive = !routine.active;
    setActionId(routine.id);
    setError("");
    setStatusMessage("");

    try {
      await fetchJson(`/api/admin/routines/${routine.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: nextActive }),
      });

      setRoutines((prev) =>
        prev.map((r) => (r.id === routine.id ? { ...r, active: nextActive ? 1 : 0 } : r))
      );
      setStatusMessage(
        `Routine "${routine.title}" ${nextActive ? "activated" : "disabled"} successfully.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle routine status.";
      setError(msg);
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(routine: Routine) {
    if (!confirm(`Are you sure you want to delete routine "${routine.title}"?`)) return;
    setActionId(routine.id);
    setError("");
    setStatusMessage("");

    try {
      await fetchJson(`/api/admin/routines/${routine.id}`, {
        method: "DELETE",
      });
      setRoutines((prev) => prev.filter((r) => r.id !== routine.id));
      setStatusMessage(`Routine "${routine.title}" deleted.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete routine.";
      setError(msg);
    } finally {
      setActionId(null);
    }
  }

  return (
    <AdminShell
      title="Daily Routines & Steps"
      description="Design ordered routines, add step-by-step guidance, and configure active transitions for kids."
      actions={
        !isAdding && (
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingRoutine(null);
            }}
            className="btn btn-primary"
          >
            + Create New Routine
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

      {/* Add Routine Form */}
      {isAdding && (
        <div className="card card-soft" style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2>Create New Routine</h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="btn btn-sm"
              aria-label="Cancel adding routine"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label className="form-label" htmlFor="routine-title">
                Routine Title *
              </label>
              <input
                id="routine-title"
                type="text"
                className="input"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="e.g. Morning Reset"
                required
                maxLength={160}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="routine-desc">
                Description
              </label>
              <input
                id="routine-desc"
                type="text"
                className="input"
                value={addDesc}
                onChange={(e) => setAddDesc(e.target.value)}
                placeholder="Brief description of the routine"
                maxLength={1000}
              />
            </div>

            <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
              <input
                id="routine-active"
                type="checkbox"
                checked={addActive}
                onChange={(e) => setAddActive(e.target.checked)}
                style={{ width: "20px", height: "20px" }}
              />
              <label htmlFor="routine-active" className="form-label" style={{ margin: 0, cursor: "pointer" }}>
                Make Active Immediately
              </label>
            </div>

            <div style={{ marginTop: "16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span className="form-label">Ordered Routine Steps *</span>
                <button
                  type="button"
                  onClick={handleAddStepRow}
                  className="btn btn-sm btn-mint"
                  disabled={addSteps.length >= 30}
                >
                  + Add Step
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {addSteps.map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: "1.5px solid var(--line)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        background: "var(--paper)",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      className="input"
                      value={step}
                      onChange={(e) => handleAddStepChange(idx, e.target.value)}
                      placeholder={`Step ${idx + 1} description`}
                      required
                      maxLength={200}
                      aria-label={`Step ${idx + 1}`}
                    />
                    {addSteps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAddStepRow(idx)}
                        className="btn btn-danger btn-sm"
                        aria-label={`Remove step ${idx + 1}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button type="submit" className="btn btn-primary" disabled={submittingAdd}>
                {submittingAdd ? "Saving Routine…" : "Save Routine"}
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

      {/* Edit Routine Form */}
      {editingRoutine && (
        <div className="card card-lilac" style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2>Edit Routine: {editingRoutine.title}</h2>
            <button
              type="button"
              onClick={() => setEditingRoutine(null)}
              className="btn btn-sm"
              aria-label="Cancel editing routine"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleEdit}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-routine-title">
                Routine Title *
              </label>
              <input
                id="edit-routine-title"
                type="text"
                className="input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                maxLength={160}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-routine-desc">
                Description
              </label>
              <input
                id="edit-routine-desc"
                type="text"
                className="input"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                maxLength={1000}
              />
            </div>

            <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
              <input
                id="edit-routine-active"
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                style={{ width: "20px", height: "20px" }}
              />
              <label htmlFor="edit-routine-active" className="form-label" style={{ margin: 0, cursor: "pointer" }}>
                Active Status
              </label>
            </div>

            <div style={{ marginTop: "16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span className="form-label">Ordered Steps *</span>
                <button
                  type="button"
                  onClick={handleEditStepRow}
                  className="btn btn-sm btn-mint"
                  disabled={editSteps.length >= 30}
                >
                  + Add Step
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {editSteps.map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: "1.5px solid var(--line)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        background: "var(--paper)",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      className="input"
                      value={step}
                      onChange={(e) => handleEditStepChange(idx, e.target.value)}
                      required
                      maxLength={200}
                      aria-label={`Step ${idx + 1}`}
                    />
                    {editSteps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEditStepRow(idx)}
                        className="btn btn-danger btn-sm"
                        aria-label={`Remove step ${idx + 1}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button type="submit" className="btn btn-primary" disabled={submittingEdit}>
                {submittingEdit ? "Updating Routine…" : "Update Routine"}
              </button>
              <button
                type="button"
                onClick={() => setEditingRoutine(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Routine list */}
      {loading ? (
        <div className="empty-box">
          <p>Loading routines…</p>
        </div>
      ) : routines.length === 0 ? (
        <div className="empty-box">
          <h3>No routines defined yet</h3>
          <p className="text-muted">Click &ldquo;+ Create New Routine&rdquo; to build your first step sequence.</p>
        </div>
      ) : (
        <div className="grid-2">
          {routines.map((routine) => {
            const isActive = Boolean(routine.active);
            return (
              <div
                key={routine.id}
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
                    <h3>{routine.title}</h3>
                  </div>
                  <span className="badge">ID #{routine.id}</span>
                </div>

                {routine.description && (
                  <p style={{ fontSize: "0.95rem", color: "var(--muted)" }}>
                    {routine.description}
                  </p>
                )}

                <div style={{ marginTop: "4px" }}>
                  <p style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "6px" }}>
                    Steps ({routine.steps?.length || 0}):
                  </p>
                  <ol style={{ paddingLeft: "20px", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {routine.steps?.map((step) => (
                      <li key={step.id}>{step.title}</li>
                    ))}
                  </ol>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(routine)}
                    disabled={actionId === routine.id}
                    className="btn btn-sm"
                    aria-label={`${isActive ? "Disable" : "Enable"} routine ${routine.title}`}
                  >
                    {actionId === routine.id ? "Saving…" : isActive ? "Disable" : "Enable"}
                  </button>

                  <button
                    type="button"
                    onClick={() => startEdit(routine)}
                    className="btn btn-sm"
                    aria-label={`Edit routine ${routine.title}`}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(routine)}
                    disabled={actionId === routine.id}
                    className="btn btn-danger btn-sm"
                    aria-label={`Delete routine ${routine.title}`}
                  >
                    {actionId === routine.id ? "Deleting…" : "Delete"}
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
