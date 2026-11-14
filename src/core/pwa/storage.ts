/**
 * Dauerhafter Speicher: Ohne ihn darf der Browser IndexedDB bei Platzmangel
 * oder nach längerer Nichtnutzung leeren (v. a. Safari).
 */
export type PersistenzStatus = "gewaehrt" | "abgelehnt" | "nicht-unterstuetzt";

export async function requestPersistentStorage(): Promise<PersistenzStatus> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return "nicht-unterstuetzt";
  }
  if (await navigator.storage.persisted()) return "gewaehrt";
  return (await navigator.storage.persist()) ? "gewaehrt" : "abgelehnt";
}
