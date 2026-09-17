"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ParentShell } from "@/components/parent-shell";
import { fetchJson } from "@/components/api-client";

type Child = {
  id: number;
  displayName: string;
  dateOfBirth?: string | null;
  supportNeeds?: string | null;
  createdAt?: string;
};

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add child form state
  const [isAdding, setIsAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDob, setAddDob] = useState("");
  const [addSupport, setAddSupport] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit child state
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [editName, setEditName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editSupport, setEditSupport] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Deleting child ID
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadChildren() {
    setLoading(true);
    try {
      const data = await fetchJson<Child[]>("/api/children");
      setChildren(data);
      setError("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load children.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChildren();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSubmittingAdd(true);
    setError("");
    setSuccess("");

    try {
      const body: Record<string, string> = { displayName: addName.trim() };
      if (addDob) body.dateOfBirth = addDob;
      if (addSupport) body.supportNeeds = addSupport.trim();

      const newChild = await fetchJson<Child>("/api/children", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setChildren((prev) => [...prev, newChild]);
      setAddName("");
      setAddDob("");
      setAddSupport("");
      setIsAdding(false);
      setSuccess(`Child profile for "${newChild.displayName}" created successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create child.";
      setError(msg);
    } finally {
      setSubmittingAdd(false);
    }
  }

  function startEdit(child: Child) {
    setEditingChild(child);
    setEditName(child.displayName);
    setEditDob(child.dateOfBirth || "");
    setEditSupport(child.supportNeeds || "");
    setError("");
    setSuccess("");
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingChild) return;
    setSubmittingEdit(true);
    setError("");
    setSuccess("");

    try {
      const body: Record<string, string> = { displayName: editName.trim() };
      body.dateOfBirth = editDob || "";
      body.supportNeeds = editSupport.trim();

      const updated = await fetchJson<Child>(`/api/children/${editingChild.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      setChildren((prev) => prev.map((c) => (c.id === editingChild.id ? updated : c)));
      setEditingChild(null);
      setSuccess(`Profile for "${updated.displayName}" updated successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update child.";
      setError(msg);
    } finally {
      setSubmittingEdit(false);
    }
  }

  async function handleDelete(child: Child) {
    if (!confirm(`Are you sure you want to delete profile for "${child.displayName}"?`)) {
      return;
    }
    setDeletingId(child.id);
    setError("");
    setSuccess("");

    try {
      await fetchJson(`/api/children/${child.id}`, {
        method: "DELETE",
      });
      setChildren((prev) => prev.filter((c) => c.id !== child.id));
      setSuccess(`Profile for "${child.displayName}" removed.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete child.";
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ParentShell
      title="Children Profiles"
      description="Manage child profiles, learning accommodations, and launch personalized Kid Mode sessions."
      actions={
        !isAdding && (
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingChild(null);
            }}
            className="btn btn-primary"
          >
            + Add New Child
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
        {success && (
          <div className="feedback-banner feedback-success" role="status">
            {success}
          </div>
        )}
      </div>

      {/* Add child form */}
      {isAdding && (
        <div className="card card-soft" style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2>Add Child Profile</h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="btn btn-sm"
              aria-label="Cancel adding child"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label className="form-label" htmlFor="add-name">
                Child Name *
              </label>
              <input
                id="add-name"
                type="text"
                className="input"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Maya"
                required
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="add-dob">
                Date of Birth (YYYY-MM-DD)
              </label>
              <input
                id="add-dob"
                type="date"
                className="input"
                value={addDob}
                onChange={(e) => setAddDob(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="add-support">
                Support Needs & Learning Style
              </label>
              <textarea
                id="add-support"
                className="textarea"
                value={addSupport}
                onChange={(e) => setAddSupport(e.target.value)}
                placeholder="e.g. Prefers short questions, sensory breaks, visual prompts"
                maxLength={1000}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" className="btn btn-primary" disabled={submittingAdd}>
                {submittingAdd ? "Saving Profile…" : "Save Child Profile"}
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

      {/* Edit child form */}
      {editingChild && (
        <div className="card card-lilac" style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2>Edit Profile: {editingChild.displayName}</h2>
            <button
              type="button"
              onClick={() => setEditingChild(null)}
              className="btn btn-sm"
              aria-label="Cancel editing child"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleEdit}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-name">
                Child Name *
              </label>
              <input
                id="edit-name"
                type="text"
                className="input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-dob">
                Date of Birth (YYYY-MM-DD)
              </label>
              <input
                id="edit-dob"
                type="date"
                className="input"
                value={editDob}
                onChange={(e) => setEditDob(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-support">
                Support Needs & Learning Style
              </label>
              <textarea
                id="edit-support"
                className="textarea"
                value={editSupport}
                onChange={(e) => setEditSupport(e.target.value)}
                maxLength={1000}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" className="btn btn-primary" disabled={submittingEdit}>
                {submittingEdit ? "Updating…" : "Update Profile"}
              </button>
              <button
                type="button"
                onClick={() => setEditingChild(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Children list */}
      {loading ? (
        <div className="empty-box">
          <p>Loading children profiles…</p>
        </div>
      ) : children.length === 0 ? (
        <div className="empty-box">
          <h3>No children profiles registered</h3>
          <p className="text-muted">Click &ldquo;+ Add New Child&rdquo; to create your first profile.</p>
        </div>
      ) : (
        <div className="grid-2">
          {children.map((child) => (
            <div
              key={child.id}
              className="card"
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span className="badge badge-mint" style={{ marginBottom: "6px" }}>
                    Child Profile
                  </span>
                  <h3>{child.displayName}</h3>
                </div>
                <span className="badge">ID #{child.id}</span>
              </div>

              {child.dateOfBirth && (
                <p style={{ fontSize: "0.9rem" }}>
                  <strong>Date of birth:</strong> {child.dateOfBirth}
                </p>
              )}

              <p style={{ fontSize: "0.95rem", color: "var(--muted)", flex: 1 }}>
                {child.supportNeeds || "No specific support needs specified."}
              </p>

              <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                <Link
                  href={`/kid/${child.id}`}
                  className="btn btn-lime btn-sm"
                  title={`Launch Kid Mode as ${child.displayName}`}
                >
                  Enter Kid Mode
                </Link>
                <button
                  type="button"
                  onClick={() => startEdit(child)}
                  className="btn btn-sm"
                  aria-label={`Edit ${child.displayName}`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(child)}
                  disabled={deletingId === child.id}
                  className="btn btn-danger btn-sm"
                  aria-label={`Delete ${child.displayName}`}
                >
                  {deletingId === child.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ParentShell>
  );
}
