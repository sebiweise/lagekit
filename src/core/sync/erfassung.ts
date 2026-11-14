import type { Transaction } from "dexie";
import type { LagekitDB } from "@/core/db/db";
import type { Aenderung } from "./protokoll";
import { einsatzIdVon, istFernTransaktion, syncTabellen } from "./daten";

type Wurzel = Transaction & { parent?: Transaction };

function wurzel(tx: Transaction): Wurzel {
  let t = tx as Wurzel;
  while (t.parent) t = t.parent as Wurzel;
  return t;
}

/**
 * Meldet lokale Änderungen eines Einsatzes, sobald ihre Transaktion abgeschlossen ist.
 * Änderungen aus dem Abgleich selbst werden nicht gemeldet. Gibt eine Abmeldefunktion zurück.
 *
 * Wird der Einsatz selbst gelöscht, meldet die Funktion die Löschungen nicht als
 * Änderungen, sondern ruft `geloescht` auf: Ein Gerät, das seine Kopie aufräumt,
 * darf nicht den Einsatz auf allen anderen Geräten löschen.
 */
export function aenderungenBeobachten(
  db: LagekitDB,
  einsatzId: string,
  melden: (liste: Aenderung[]) => void,
  geloescht?: () => void,
): () => void {
  const offen = new Map<Wurzel, Aenderung[]>();

  function vormerken(tx: Transaction, aenderung: Aenderung) {
    const w = wurzel(tx);
    let liste = offen.get(w);
    if (!liste) {
      liste = [];
      offen.set(w, liste);
      w.on("complete", () => {
        offen.delete(w);
        if (liste!.some((a) => a.art === "loeschen" && a.tabelle === "einsaetze")) geloescht?.();
        else if (liste!.length > 0) melden(liste!);
      });
      w.on("abort", () => offen.delete(w));
      w.on("error", () => offen.delete(w));
    }
    liste.push(aenderung);
  }

  const abmelden: (() => void)[] = [];
  for (const name of syncTabellen().keys()) {
    const tabelle = db.table(name);
    const betrifft = (zeile: unknown) =>
      typeof zeile === "object" && zeile !== null && einsatzIdVon(name, zeile as { id: string }) === einsatzId;

    const creating = function (this: { onsuccess?: () => void }, _pk: unknown, obj: unknown, tx: Transaction) {
      if (istFernTransaktion(tx) || !betrifft(obj)) return;
      const zeile = structuredClone(obj) as { id: string };
      this.onsuccess = () => vormerken(tx, { art: "put", tabelle: name, zeile });
    };
    const updating = function (
      this: { onsuccess?: (neu: unknown) => void },
      _mods: unknown,
      _pk: unknown,
      _obj: unknown,
      tx: Transaction,
    ) {
      if (istFernTransaktion(tx)) return;
      this.onsuccess = (neu) => {
        if (betrifft(neu)) vormerken(tx, { art: "put", tabelle: name, zeile: structuredClone(neu) as { id: string } });
      };
    };
    const deleting = function (this: { onsuccess?: () => void }, pk: unknown, obj: unknown, tx: Transaction) {
      if (istFernTransaktion(tx) || !betrifft(obj)) return;
      this.onsuccess = () => vormerken(tx, { art: "loeschen", tabelle: name, id: String(pk) });
    };

    tabelle.hook("creating", creating as never);
    tabelle.hook("updating", updating as never);
    tabelle.hook("deleting", deleting as never);
    abmelden.push(() => {
      tabelle.hook("creating").unsubscribe(creating as never);
      tabelle.hook("updating").unsubscribe(updating as never);
      tabelle.hook("deleting").unsubscribe(deleting as never);
    });
  }
  return () => abmelden.forEach((f) => f());
}
