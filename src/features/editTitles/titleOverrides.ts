/**
 * Edit Titles → app-wide label overrides (frontend only; backend unchanged).
 *
 * The backend stores each company's titles as `{ _id, name }` with no record
 * of the original text. But every list is created from the backend seed
 * (`seedEditTitles`) in order, and Reset rewrites it in that same order, so
 * title N's original text is seed title N. `defaultTitles.json` is a copy of
 * that seed list — regenerate it if the backend seed changes. If a company's
 * list doesn't line up with it (e.g. an older seed), overrides are skipped
 * rather than applied to the wrong labels.
 */
import { fetchMyEditTitles, type EditTitleItem } from "@/services/editTitlesApi";

export type KeyedTitle = EditTitleItem & { key: string };

/** Share of positions that must still equal the seed to trust the alignment. */
const MIN_ALIGNMENT = 0.6;

let defaultsPromise: Promise<string[]> | null = null;

export function loadDefaultTitles(): Promise<string[]> {
  defaultsPromise ??= import("./defaultTitles.json").then((m) => m.default as string[]);
  return defaultsPromise;
}

/** Attach each saved title's original text (`key`). */
export function keyTitles(rows: EditTitleItem[], defaults: string[]): KeyedTitle[] {
  const n = Math.min(rows.length, defaults.length);
  let same = 0;
  for (let i = 0; i < n; i++) if (rows[i].name === defaults[i]) same++;
  const aligned = n > 0 && same / n >= MIN_ALIGNMENT;
  if (!aligned && rows.length > 0) {
    console.warn("[edit-titles] saved titles don't match the default list order — overrides skipped");
  }
  // Rows past the seed length were appended by the backend's login sync and
  // still hold their original text, so they key to themselves.
  return rows.map((r, i) => ({
    ...r,
    key: aligned && i < defaults.length ? defaults[i] : r.name,
  }));
}

/**
 * original text → custom text. Unedited rows are skipped, so an edited title
 * wins over the unedited copy the backend sync re-adds after a rename.
 */
export function buildOverrideMap(keyed: KeyedTitle[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of keyed) {
    const value = t.name.trim();
    if (value && value !== t.key) map.set(t.key, value);
  }
  return map;
}

// ── Store ────────────────────────────────────────────────────────────────────

let overrides = new Map<string, string>();
const listeners = new Set<(m: Map<string, string>) => void>();

export const getTitleOverrides = () => overrides;

export function subscribeTitleOverrides(listener: (m: Map<string, string>) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setOverrides(next: Map<string, string>) {
  overrides = next;
  listeners.forEach((l) => l(next));
}

/** Re-fetch titles and re-apply. Failures keep the current overrides. */
export async function refreshTitleOverrides(): Promise<void> {
  try {
    const [rows, defaults] = await Promise.all([
      fetchMyEditTitles({ skipGlobalLoading: true, skipUnauthorized: true }),
      loadDefaultTitles(),
    ]);
    setOverrides(buildOverrideMap(keyTitles(rows, defaults)));
  } catch (err) {
    console.warn("[edit-titles] couldn't load title overrides", err);
  }
}

export function clearTitleOverrides(): void {
  setOverrides(new Map());
}
