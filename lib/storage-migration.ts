/**
 * One-time migration: copy stoicsips_* localStorage keys to vigil_* and remove old keys.
 * Preserves existing user preferences when renaming the app to Vigil.
 */
const KEYS = ["sleepBy", "mode", "profileUnits"] as const;

export function migrateStoicSipsToVigil(): void {
  if (typeof window === "undefined") return;
  for (const key of KEYS) {
    const oldKey = `stoicsips_${key}`;
    const newKey = `vigil_${key}`;
    const value = localStorage.getItem(oldKey);
    if (value !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, value);
      localStorage.removeItem(oldKey);
    }
  }
}
