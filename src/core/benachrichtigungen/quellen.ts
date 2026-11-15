// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { liveQuery, type Transaction } from "dexie";
import type { LagekitDB } from "@/core/db/db";
import { aktiverEinsatzId } from "@/core/einsatz/repository";
import { istFernTransaktion } from "@/core/sync/daten";
import { sitzungen, type Sitzung } from "@/core/sync/sitzung";
import type { Teilnehmer } from "@/core/sync/protokoll";
import { eintraege } from "@/tools/einsatztagebuch/repository";
import type { Eintrag } from "@/tools/einsatztagebuch/schema";
import { AKTUELLE_VERSION } from "@/core/aenderungen/aktuell";
import { updateUebersicht } from "@/core/aenderungen/version-info";
import { pwa, type PwaZustand } from "@/core/pwa/update";
import { tagebuchMeldung, updateMeldung } from "./texte";
import { benachrichtigen, type BenachrichtigungEingabe } from "./verlauf";

/** Wartezeit, damit Einträge aus einem Abgleich zu einer Meldung werden. */
export const SAMMEL_WARTEZEIT_MS = 400;
const KANAL = "lagekit.benachrichtigungen";

type Melden = (eingabe: BenachrichtigungEingabe) => void;

/**
 * Ermittelt neue Einträge seit dem letzten Stand. Beim ersten Stand und beim
 * Wechsel des Einsatzes gilt alles Vorhandene als bekannt.
 */
export class TagebuchAbgleich {
  private einsatzId: string | null | undefined = undefined;
  private bekannt = new Set<string>();

  neue(einsatzId: string | null, liste: readonly Eintrag[]): Eintrag[] {
    if (einsatzId !== this.einsatzId) {
      this.einsatzId = einsatzId;
      this.bekannt = new Set(liste.map((e) => e.id));
      return [];
    }
    const neu = liste.filter((e) => !this.bekannt.has(e.id));
    for (const e of neu) this.bekannt.add(e.id);
    return neu;
  }
}

/**
 * Meldet neue Tagebucheinträge des aktiven Einsatzes, die nicht auf diesem
 * Gerät geschrieben wurden: von anderen Geräten der gemeinsamen Sitzung.
 * Einträge aus anderen Tabs desselben Geräts meldet der andere Tab als eigene.
 */
export function tagebuchBeobachten(db: LagekitDB, melden: Melden = benachrichtigen): () => void {
  const tabelle = eintraege(db);
  const eigene = new Set<string>();
  const kanal = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(KANAL);
  if (kanal) {
    kanal.onmessage = (event: MessageEvent<{ typ?: string; id?: string }>) => {
      if (event.data?.typ === "eigener-eintrag" && typeof event.data.id === "string") eigene.add(event.data.id);
    };
  }

  // Läuft nur für Schreibvorgänge in diesem Tab; der Abgleich mit anderen Geräten zählt nicht als eigen.
  const erfassen = (_pk: unknown, obj: unknown, tx: Transaction) => {
    if (istFernTransaktion(tx)) return;
    const id = (obj as Partial<Eintrag>).id;
    if (typeof id !== "string") return;
    eigene.add(id);
    kanal?.postMessage({ typ: "eigener-eintrag", id });
  };
  tabelle.hook("creating", erfassen);

  const abgleich = new TagebuchAbgleich();
  let offen: Eintrag[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const abo = liveQuery(async () => {
    const einsatzId = await aktiverEinsatzId(db);
    const liste = einsatzId ? await tabelle.where("einsatzId").equals(einsatzId).toArray() : [];
    return { einsatzId, liste };
  }).subscribe({
    next: ({ einsatzId, liste }) => {
      const neu = abgleich.neue(einsatzId, liste);
      if (neu.length === 0) return;
      offen.push(...neu);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const fremd = offen.filter((e) => !eigene.has(e.id)).sort((a, b) => a.nr - b.nr);
        offen = [];
        const meldung = tagebuchMeldung(fremd);
        if (meldung) melden(meldung);
      }, SAMMEL_WARTEZEIT_MS);
    },
    error: () => undefined,
  });

  return () => {
    abo.unsubscribe();
    tabelle.hook("creating").unsubscribe(erfassen);
    if (timer) clearTimeout(timer);
    kanal?.close();
  };
}

function nameVon(t: Teilnehmer): string {
  const zusatz = [t.funktion, t.fahrzeug].filter(Boolean).join(", ");
  return `${t.name || t.geraet}${zusatz ? ` (${zusatz})` : ""}`;
}

export interface SitzungStand {
  sitzung: Sitzung | null;
  /** Host: verbundene Geräte (Anfrage-Id → Name). */
  verbunden: Map<string, string>;
  /** Gast: Status der Verbindung zum Host. */
  gastStatus: string | null;
  /** Gast: war schon verbunden (auch über ein Neuverbinden mit neuem Sitzungsobjekt hinweg). */
  warVerbunden: boolean;
}

export function standLesen(s: Sitzung | null, vorher?: SitzungStand): SitzungStand {
  if (!s) return { sitzung: null, verbunden: new Map(), gastStatus: null, warVerbunden: false };
  if (s.rolle === "host") {
    return {
      sitzung: s,
      verbunden: new Map(s.verbunden.map((g) => [g.anfrageId, nameVon(g.teilnehmer)])),
      gastStatus: null,
      warVerbunden: false,
    };
  }
  const weiter = vorher?.sitzung?.rolle === "gast" && vorher.warVerbunden;
  return { sitzung: s, verbunden: new Map(), gastStatus: s.status, warVerbunden: weiter || s.status === "verbunden" };
}

/** Vergleicht zwei Stände einer Sitzung und liefert die Meldungen dazu. */
export function sitzungMeldungen(alt: SitzungStand, neu: SitzungStand): BenachrichtigungEingabe[] {
  if (!neu.sitzung || !alt.sitzung || alt.sitzung.rolle !== neu.sitzung.rolle) return [];
  const basis = { art: "sitzung" as const, href: "/app/sitzung/", linkText: "Sitzung ansehen" };
  const meldungen: BenachrichtigungEingabe[] = [];
  if (neu.sitzung.rolle === "host") {
    if (alt.sitzung !== neu.sitzung) return [];
    for (const [id, name] of neu.verbunden) {
      if (!alt.verbunden.has(id)) meldungen.push({ ...basis, titel: "Gerät verbunden", text: name });
    }
    for (const [id, name] of alt.verbunden) {
      if (!neu.verbunden.has(id)) meldungen.push({ ...basis, titel: "Gerät getrennt", text: name });
    }
    return meldungen;
  }
  if (alt.gastStatus === neu.gastStatus) return [];
  if (neu.gastStatus === "verbunden") {
    meldungen.push({ ...basis, titel: alt.warVerbunden ? "Wieder verbunden" : "Mit dem Host verbunden" });
  } else if (neu.gastStatus === "getrennt" && alt.gastStatus === "verbunden") {
    meldungen.push({
      ...basis,
      titel: "Verbindung zum Host verloren",
      text: "Einträge bleiben auf diesem Gerät und werden beim Wiederverbinden abgeglichen.",
      wichtig: true,
    });
  } else if (neu.gastStatus === "abgelehnt") {
    meldungen.push({ ...basis, titel: "Sitzung beendet", text: neu.sitzung.meldung ?? undefined, wichtig: true });
  }
  return meldungen;
}

/** Meldet, wenn Geräte der gemeinsamen Sitzung dazukommen oder die Verbindung abreißt. */
export function sitzungBeobachten(melden: Melden = benachrichtigen): () => void {
  let stand = standLesen(sitzungen.aktuell());
  return sitzungen.abonnieren(() => {
    const neu = standLesen(sitzungen.aktuell(), stand);
    for (const m of sitzungMeldungen(stand, neu)) melden(m);
    stand = neu;
  });
}

const UPDATE_GEMELDET = "lagekit.update-gemeldet";

function updateKennung(z: PwaZustand): string {
  return z.neueVersion ? `${z.neueVersion.version}+${z.neueVersion.commit}` : "unbekannt";
}

/**
 * Meldet eine wartende neue Version einmal je Tab-Sitzung, sobald ihre Angaben
 * gelesen sind. Die Leiste oben bleibt, bis aktualisiert oder „Später“ gewählt ist.
 */
export function updateBeobachten(melden: Melden = benachrichtigen): () => void {
  const pruefen = () => {
    const z = pwa.zustand();
    if (!z.updateWartet || !z.neueVersionGeladen) return;
    const kennung = updateKennung(z);
    try {
      if (sessionStorage.getItem(UPDATE_GEMELDET) === kennung) return;
      sessionStorage.setItem(UPDATE_GEMELDET, kennung);
    } catch {
      // ohne Speicher wird höchstens nach dem Neuladen erneut gemeldet
    }
    const uebersicht = z.neueVersion ? updateUebersicht(AKTUELLE_VERSION, z.neueVersion) : null;
    const umbau = uebersicht !== null && (uebersicht.migrationen.length > 0 || uebersicht.datenHinweise.length > 0);
    melden({ ...updateMeldung(z.neueVersion?.version ?? null, umbau), kennung: `update:${kennung}` });
  };
  pruefen();
  return pwa.abonnieren(pruefen);
}
