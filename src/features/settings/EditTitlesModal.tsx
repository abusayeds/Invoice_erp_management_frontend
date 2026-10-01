/**
 * Settings → Edit Titles modal.
 * Left column: the title's original (default) text. Right column: what the
 * app shows instead. Nothing is written until Save; Cancel discards. The
 * circular-arrow button resets every title to the server default list.
 * Saved titles are applied app-wide by TitleOverrideLayer.
 * Uses /edit-titles/my + /edit-titles/update (no backend changes).
 */
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Search, X } from "lucide-react";
import { showToast } from "@/utils/toast";
import Swal from "@/utils/alert";
import { ApiError } from "@/lib/api/ApiError";
import {
  fetchMyEditTitles,
  resetEditTitles,
  updateEditTitle,
} from "@/services/editTitlesApi";
import {
  keyTitles,
  loadDefaultTitles,
  refreshTitleOverrides,
  type KeyedTitle,
} from "@/features/editTitles/titleOverrides";

const MULTILINE_AT = 40; // longer titles get a resizable textarea
const SAVE_CONCURRENCY = 5;

const errMsg = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.message ? err.message : fallback;

// keep-box ua-field: opt out of the app-wide underline "de-box" input style.
const fieldClass =
  "keep-box ua-field w-full rounded-md px-3 py-2.5 text-sm focus:outline-none";
const searchClass = "w-full px-3 py-2.5 text-sm text-gray-900 bg-transparent";

const TitleRow = memo(function TitleRow({
  item,
  value,
  onChange,
}: {
  item: KeyedTitle;
  value: string;
  onChange: (id: string, value: string) => void;
}) {
  const multiline = Math.max(item.key.length, value.length) > MULTILINE_AT;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 items-start">
      <p className="text-sm text-gray-700 leading-relaxed pt-2 break-words">{item.key}</p>
      {multiline ? (
        <textarea
          value={value}
          rows={2}
          onChange={(e) => onChange(item.id, e.target.value)}
          className={`${fieldClass} resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(item.id, e.target.value)}
          className={fieldClass}
        />
      )}
    </div>
  );
});

export const EditTitlesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [rows, setRows] = useState<KeyedTitle[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [saved, defaults] = await Promise.all([fetchMyEditTitles(), loadDefaultTitles()]);
      setRows(keyTitles(saved, defaults));
      setDrafts({});
    } catch (err) {
      setRows([]);
      showToast(errMsg(err, "Couldn't load titles."), "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onChange = useCallback((id: string, value: string) => {
    setDrafts((d) => ({ ...d, [id]: value }));
  }, []);

  const changed = useMemo(
    () => rows.filter((r) => drafts[r.id] !== undefined && drafts[r.id].trim() !== r.name),
    [rows, drafts],
  );
  const dirty = changed.length > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.key.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (drafts[r.id] ?? "").toLowerCase().includes(q),
    );
  }, [rows, drafts, search]);

  const confirmDiscard = async () => {
    if (!dirty) return true;
    const res = await Swal.fire({
      icon: "warning",
      title: "Discard changes?",
      text: `You have ${changed.length} unsaved title change${changed.length === 1 ? "" : "s"}.`,
      showCancelButton: true,
      confirmButtonText: "Discard",
      cancelButtonText: "Keep editing",
      confirmButtonColor: "#dc2626",
    });
    return res.isConfirmed;
  };

  const handleCancel = async () => {
    if (saving) return;
    if (await confirmDiscard()) onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Swal handles its own Escape while a dialog is open.
      if (e.key === "Escape" && !Swal.isVisible()) void handleCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const handleSave = async () => {
    if (!dirty) {
      onClose();
      return;
    }
    if (changed.some((r) => !drafts[r.id].trim())) {
      showToast("Titles cannot be empty.", "warning");
      return;
    }
    setSaving(true);
    const failed: KeyedTitle[] = [];
    const saved = new Map<string, string>();
    for (let i = 0; i < changed.length; i += SAVE_CONCURRENCY) {
      const chunk = changed.slice(i, i + SAVE_CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map((r) => updateEditTitle(r.id, drafts[r.id])),
      );
      results.forEach((res, j) => {
        const row = chunk[j];
        if (res.status === "fulfilled") saved.set(row.id, drafts[row.id].trim());
        else failed.push(row);
      });
    }
    setSaving(false);
    if (saved.size > 0) void refreshTitleOverrides();

    if (failed.length === 0) {
      showToast(`${saved.size} title${saved.size === 1 ? "" : "s"} saved.`, "success");
      onClose();
      return;
    }
    // Keep the failed edits in place so the user can retry.
    setRows((list) => list.map((r) => (saved.has(r.id) ? { ...r, name: saved.get(r.id)! } : r)));
    setDrafts((d) => {
      const next = { ...d };
      saved.forEach((_, id) => delete next[id]);
      return next;
    });
    showToast(
      `${failed.length} title${failed.length === 1 ? "" : "s"} couldn't be saved. Please try again.`,
      "error",
    );
  };

  const handleReset = async () => {
    const res = await Swal.fire({
      icon: "warning",
      title: "Reset all titles?",
      text: "Every title goes back to its default text. This can't be undone.",
      showCancelButton: true,
      confirmButtonText: "Reset",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });
    if (!res.isConfirmed) return;
    setResetting(true);
    try {
      await resetEditTitles();
      showToast("Titles reset to defaults.", "success");
      void refreshTitleOverrides();
      await load();
    } catch (err) {
      showToast(errMsg(err, "Couldn't reset titles."), "error");
    } finally {
      setResetting(false);
    }
  };

  const closeSearch = () => {
    setSearch("");
    setSearchOpen(false);
  };

  const busy = loading || saving || resetting;
  const iconBtn =
    "p-2 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    // data-no-title-override: show original titles here, not their replacements.
    <div
      data-no-title-override
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-300">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-300 shrink-0 min-h-[64px]">
          {searchOpen ? (
            <div className="relative fl-wrap flex-1 min-w-0">
              <label className="fl-label">Search</label>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder=" "
                className={searchClass}
              />
            </div>
          ) : (
            <h2 className="flex-1 text-lg font-semibold text-gray-900">Edit Titles</h2>
          )}

          <div className="flex items-center gap-1 shrink-0">
            {searchOpen ? (
              <button type="button" onClick={closeSearch} className={iconBtn} title="Close search">
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className={iconBtn}
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={busy}
              className={iconBtn}
              title="Reset to defaults"
            >
              <RotateCcw className={`w-5 h-5 ${resetting ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={saving}
              className="px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading titles…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500">
              {rows.length === 0
                ? "No titles yet. Use the reset button to load the default list."
                : "No titles match your search."}
            </p>
          ) : (
            <div className="space-y-4">
              {filtered.map((row) => (
                <TitleRow
                  key={row.id}
                  item={row}
                  value={drafts[row.id] ?? row.name}
                  onChange={onChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditTitlesModal;
