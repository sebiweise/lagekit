import type { LagekitDB } from "@/core/db/db";
import { aktivenEinsatzSetzen } from "@/core/einsatz/repository";
import type { Einsatz } from "@/core/einsatz/schema";
import { ablage, type GastAblage, type HostAblage } from "./ablage";
import { AbgleichFehler, aenderungenAnwenden, standAnwenden, standErstellen } from "./daten";
import { aenderungenBeobachten } from "./erfassung";
import { ichLesen } from "./ich";
import { angebotBeantworten, angebotErstellen, type Verbindung } from "./peer";
import {
  anfrageSchema,
  antwortSchema,
  PRAEFIX_ANFRAGE,
  PRAEFIX_ANTWORT,
  PROTOKOLL_VERSION,
  type Aenderung,
  type Nachricht,
  type Teilnehmer,
} from "./protokoll";
import { ZodError } from "zod";
import { codeErstellen, codeLesen, type KompaktesSdp } from "./verbindungscode";
import { VermittlungFehler, type Vermittlung } from "./vermittlung";

/** Einfache Beobachtbarkeit für `useSyncExternalStore`. */
class Beobachtbar {
  private hoerer = new Set<() => void>();
  version = 0;
  abonnieren = (f: () => void) => {
    this.hoerer.add(f);
    return () => this.hoerer.delete(f);
  };
  protected melden() {
    this.version++;
    for (const f of this.hoerer) f();
  }
}

const ABHOL_INTERVALL_MS = 2_000;
const gleich = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Ungültige Daten: Erneut senden hilft nicht, die Änderung wird verworfen. */
const istDatenfehler = (e: unknown) => e instanceof AbgleichFehler || e instanceof ZodError;

/** Führt Aufgaben nacheinander aus, damit Nachrichten in ihrer Reihenfolge verarbeitet werden. */
class Reihe {
  private letzte: Promise<void> = Promise.resolve();
  einreihen(aufgabe: () => Promise<void>, beschreibung: string) {
    this.letzte = this.letzte.then(aufgabe).catch((e) => console.warn(`Lagekit: ${beschreibung}`, e));
    return this.letzte;
  }
}

// ---------------------------------------------------------------- Host

export type GastStatus = "wartet-auf-freigabe" | "verbindet" | "verbunden" | "getrennt" | "abgelehnt";

export interface HostGast {
  anfrageId: string;
  teilnehmer: Teilnehmer;
  status: GastStatus;
  quelle: "qr" | "kurzcode";
  angekommenAm: Date;
  /** Schon früher zugelassen und automatisch wieder aufgenommen. */
  wiederverbunden: boolean;
  /** Antwortcode zum Scannen (nur Weg mit QR-Code). */
  antwortCode?: string;
  angebot: KompaktesSdp;
  verbindung?: Verbindung;
  /** Nachrichten dieses Geräts, in Reihenfolge verarbeitet. */
  eingang: Reihe;
  /**
   * Während der Übergabe des Stands: Änderungen, die in dieser Zeit entstehen. Sie
   * folgen direkt nach dem Stand, damit dem Gerät nichts entgeht.
   */
  puffer?: Aenderung[][];
}

export class HostSitzung extends Beobachtbar {
  readonly rolle = "host" as const;
  gaeste: HostGast[] = [];
  kurzcode: string | null;
  kurzcodeFehler: string | null = null;
  private schluessel: string | null;
  private bekannt: Set<string>;
  private abmelden: () => void;
  private abholen?: ReturnType<typeof setInterval>;
  private beendet = false;
  /** Wird aufgerufen, sobald die Sitzung beendet ist. */
  onBeendet: (() => void) | null = null;
  /** Kennung des Hosts in der Teilnehmerliste; die echte Geräte-Kennung bleibt auf dem Gerät. */
  private readonly sitzungsKennung = crypto.randomUUID();

  constructor(
    private readonly db: LagekitDB,
    readonly einsatz: Einsatz,
    readonly ich: Teilnehmer,
    private readonly dienst?: Vermittlung,
    gespeichert?: HostAblage,
  ) {
    super();
    this.kurzcode = gespeichert?.kurzcode ?? null;
    this.schluessel = gespeichert?.schluessel ?? null;
    this.bekannt = new Set(gespeichert?.bekannt ?? []);
    this.abmelden = aenderungenBeobachten(
      db,
      einsatz.id,
      (liste) => this.verteilen(liste),
      // Wer den Einsatz auf dem Host löscht, beendet die Sitzung; die Gäste behalten ihre Kopie.
      () => this.beenden("Der Einsatz wurde auf dem Host gelöscht."),
    );
    void this.speichern();
  }

  private speichern() {
    if (this.beendet) return ablage.hostSchreiben(this.db, null);
    return ablage.hostSchreiben(this.db, {
      einsatzId: this.einsatz.id,
      kurzcode: this.kurzcode,
      schluessel: this.schluessel,
      bekannt: [...this.bekannt],
    });
  }

  /**
   * Meldet die Sitzung beim Vermittlungsdienst an, damit Geräte per Kurzcode beitreten
   * können. Ein gespeicherter Kurzcode (nach Neuladen) bleibt erhalten.
   */
  async kurzcodeAnfordern() {
    if (!this.dienst || this.beendet) return;
    if (!this.kurzcode || !this.schluessel) {
      try {
        const { kurzcode, schluessel } = await this.dienst.sitzungAnlegen();
        if (this.beendet) return;
        this.kurzcode = kurzcode;
        this.schluessel = schluessel;
        this.kurzcodeFehler = null;
        await this.speichern();
      } catch (e) {
        this.kurzcodeFehler = e instanceof Error ? e.message : String(e);
        this.melden();
        return;
      }
    }
    clearInterval(this.abholen);
    this.abholen = setInterval(() => void this.anfragenAbholen(), ABHOL_INTERVALL_MS);
    void this.anfragenAbholen();
    this.melden();
  }

  private async anfragenAbholen() {
    if (!this.dienst || !this.kurzcode || !this.schluessel) return;
    try {
      const neu = await this.dienst.anfragenAbholen(this.kurzcode, this.schluessel);
      for (const { anfrageId, anfrage } of neu) {
        await this.anfrageAufnehmen(anfrage, "kurzcode", anfrageId).catch(() => {});
      }
    } catch (e) {
      if (e instanceof VermittlungFehler && e.status === 403) {
        // Kurzcode abgelaufen: neuen anfordern.
        this.kurzcode = null;
        this.schluessel = null;
        clearInterval(this.abholen);
        await this.kurzcodeAnfordern();
      }
      // Sonst: kurzzeitige Netzprobleme, beim nächsten Durchlauf erneut versuchen.
    }
  }

  /**
   * Nimmt eine Beitrittsanfrage auf. Unbekannte Geräte muss der Host zulassen;
   * ein Gerät, das er in dieser Sitzung schon zugelassen hat, kommt direkt wieder rein.
   */
  async anfrageAufnehmen(code: string, quelle: HostGast["quelle"] = "qr", anfrageId = crypto.randomUUID()) {
    const anfrage = await codeLesen(PRAEFIX_ANFRAGE, code, anfrageSchema);
    for (const alt of this.gaeste.filter((g) => g.teilnehmer.geraetId === anfrage.t.geraetId)) {
      alt.verbindung?.schliessen();
    }
    this.gaeste = this.gaeste.filter((g) => g.teilnehmer.geraetId !== anfrage.t.geraetId);
    const gast: HostGast = {
      anfrageId,
      teilnehmer: anfrage.t,
      status: "wartet-auf-freigabe",
      quelle,
      angekommenAm: new Date(),
      wiederverbunden: this.bekannt.has(anfrage.t.geraetId),
      angebot: anfrage.s,
      eingang: new Reihe(),
    };
    this.gaeste = [...this.gaeste, gast];
    this.melden();
    if (gast.wiederverbunden) await this.zulassen(anfrageId);
    return gast;
  }

  async zulassen(anfrageId: string) {
    const gast = this.finden(anfrageId);
    if (!gast || gast.status !== "wartet-auf-freigabe") return;
    gast.status = "verbindet";
    this.melden();
    let verbindung: Verbindung | undefined;
    let antwort: string;
    try {
      const beantwortet = await angebotBeantworten(gast.angebot);
      verbindung = beantwortet.verbindung;
      antwort = await codeErstellen(PRAEFIX_ANTWORT, { v: PROTOKOLL_VERSION, s: beantwortet.sdp });
      if (gast.quelle === "kurzcode" && this.dienst && this.kurzcode && this.schluessel) {
        await this.dienst.antworten(this.kurzcode, this.schluessel, anfrageId, antwort);
      }
    } catch (e) {
      // Zurück auf „wartet“, damit der Host es erneut versuchen kann.
      verbindung?.schliessen();
      if (gast.status === "verbindet") gast.status = "wartet-auf-freigabe";
      this.melden();
      throw e;
    }
    if (gast.status !== "verbindet") {
      verbindung.schliessen(); // Inzwischen abgelehnt oder ersetzt.
      return;
    }
    this.bekannt.add(gast.teilnehmer.geraetId);
    void this.speichern();
    gast.verbindung = verbindung;
    verbindung.onNachricht = (n) => void gast.eingang.einreihen(() => this.empfangen(gast, n), "Nachricht eines Geräts");
    verbindung.onZustand = (z) => {
      if (z === "getrennt" && gast.status !== "abgelehnt") {
        gast.status = "getrennt";
        this.teilnehmerVerteilen();
        this.melden();
      }
    };
    if (gast.quelle === "qr") gast.antwortCode = antwort;
    this.melden();
  }

  async ablehnen(anfrageId: string) {
    const gast = this.finden(anfrageId);
    if (!gast) return;
    gast.status = "abgelehnt";
    gast.verbindung?.schliessen();
    this.bekannt.delete(gast.teilnehmer.geraetId);
    void this.speichern();
    if (gast.quelle === "kurzcode" && this.dienst && this.kurzcode && this.schluessel) {
      await this.dienst.antworten(this.kurzcode, this.schluessel, anfrageId, null).catch(() => {});
    }
    this.melden();
  }

  /** Trennt ein verbundenes Gerät; es muss danach erneut zugelassen werden. */
  trennen(anfrageId: string) {
    const gast = this.finden(anfrageId);
    if (!gast?.verbindung) return;
    gast.verbindung.senden({ typ: "ende", grund: "Der Host hat die Verbindung getrennt." });
    gast.status = "abgelehnt";
    gast.verbindung.schliessen();
    this.bekannt.delete(gast.teilnehmer.geraetId);
    void this.speichern();
    this.teilnehmerVerteilen();
    this.melden();
  }

  /** Beendet die Sitzung für alle Geräte. */
  beenden(grund = "Der Host hat die Sitzung beendet.") {
    if (this.beendet) return;
    this.beendet = true;
    queueMicrotask(() => this.onBeendet?.());
    this.schliessen();
    for (const g of this.gaeste) {
      g.verbindung?.senden({ typ: "ende", grund });
      g.verbindung?.schliessen();
    }
    if (this.dienst && this.kurzcode && this.schluessel) {
      void this.dienst.sitzungBeenden(this.kurzcode, this.schluessel).catch(() => {});
    }
    void this.speichern();
    this.melden();
  }

  /** Gibt Beobachter und Abfragen frei, ohne die gespeicherte Sitzung zu löschen. */
  schliessen() {
    clearInterval(this.abholen);
    this.abmelden();
  }

  get verbunden() {
    return this.gaeste.filter((g) => g.status === "verbunden");
  }

  get offeneAnfragen() {
    return this.gaeste.filter((g) => g.status === "wartet-auf-freigabe");
  }

  private finden(anfrageId: string) {
    return this.gaeste.find((g) => g.anfrageId === anfrageId);
  }

  private async empfangen(gast: HostGast, n: Nachricht) {
    if (gast.status === "abgelehnt") return;
    if (n.typ === "hallo") {
      if (n.geraetId !== gast.teilnehmer.geraetId) {
        gast.verbindung?.senden({ typ: "ende", grund: "Gerät passt nicht zur Anfrage." });
        gast.verbindung?.schliessen();
        return;
      }
      // Ab jetzt entstehende Änderungen sammeln, bis der Stand übergeben ist.
      gast.puffer = [];
      // Was das Gerät noch nicht bestätigt bekommen hat (z. B. während einer Trennung), zuerst übernehmen.
      if (n.ausstehend?.einsatzId === this.einsatz.id && n.ausstehend.liste.length > 0) {
        try {
          const gespeichert = await aenderungenAnwenden(this.db, this.einsatz.id, n.ausstehend.liste, {
            konflikteLoesen: true,
          });
          this.verteilen(gespeichert, gast);
        } catch (e) {
          if (!istDatenfehler(e)) {
            // Nicht gespeichert: Verbindung neu aufbauen, das Gerät schickt die Änderungen dann erneut.
            gast.puffer = undefined;
            gast.verbindung?.schliessen();
            throw e;
          }
          console.warn("Lagekit: nachgereichte Änderungen abgelehnt", e);
        }
      }
      try {
        gast.verbindung?.senden(await standErstellen(this.db, this.einsatz.id));
      } catch (e) {
        gast.puffer = undefined;
        gast.verbindung?.schliessen();
        throw e;
      }
      for (const liste of gast.puffer) gast.verbindung?.senden({ typ: "aenderungen", liste });
      gast.puffer = undefined;
      gast.status = "verbunden";
      this.teilnehmerVerteilen();
      this.melden();
      return;
    }
    if (n.typ === "aenderungen" && gast.status === "verbunden") {
      let gespeichert: Aenderung[];
      try {
        gespeichert = await aenderungenAnwenden(this.db, this.einsatz.id, n.liste, { konflikteLoesen: true });
      } catch (e) {
        if (istDatenfehler(e)) {
          console.warn("Lagekit: Änderung eines Geräts abgelehnt", e);
          gast.verbindung?.senden({ typ: "quittung", anzahl: n.liste.length });
        } else {
          // Unerwarteter Fehler: neu verbinden, dann schickt das Gerät die Änderungen erneut.
          console.warn("Lagekit: Änderung eines Geräts nicht gespeichert, Verbindung wird neu aufgebaut", e);
          gast.verbindung?.schliessen();
        }
        return;
      }
      gast.verbindung?.senden({ typ: "quittung", anzahl: n.liste.length });
      this.verteilen(gespeichert, gast);
      // Hat die Konfliktlösung etwas geändert (z. B. eine Nummer), bekommt auch der Absender die Fassung des Hosts.
      const korrigiert = gespeichert.filter((a, i) => !gleich(a, n.liste[i]));
      if (korrigiert.length > 0) gast.verbindung?.senden({ typ: "aenderungen", liste: korrigiert });
    }
  }

  private verteilen(liste: Aenderung[], ausser?: HostGast) {
    if (liste.length === 0) return;
    for (const g of this.gaeste) {
      if (g === ausser) continue;
      if (g.puffer) g.puffer.push(liste);
      else if (g.status === "verbunden") g.verbindung?.senden({ typ: "aenderungen", liste });
    }
  }

  private teilnehmerVerteilen() {
    // Gäste sehen nur Sitzungs-Kennungen, nie die Geräte-Kennungen der anderen:
    // Mit einer fremden Geräte-Kennung käme ein Gerät sonst ohne Freigabe wieder herein.
    const liste = [
      { ...this.ich, geraetId: this.sitzungsKennung },
      ...this.verbunden.map((g) => ({ ...g.teilnehmer, geraetId: g.anfrageId })),
    ];
    for (const g of this.verbunden) g.verbindung?.senden({ typ: "teilnehmer", liste });
  }
}

// ---------------------------------------------------------------- Gast

export type GastSitzungStatus =
  | "anfrage"
  | "wartet-auf-host"
  | "verbindet"
  | "verbunden"
  | "getrennt"
  | "abgelehnt";

export class GastSitzung extends Beobachtbar {
  readonly rolle = "gast" as const;
  status: GastSitzungStatus = "anfrage";
  einsatz: Einsatz | null = null;
  teilnehmer: Teilnehmer[] = [];
  meldung: string | null = null;
  /** Wird aufgerufen, wenn die Verbindung unerwartet abreißt (nicht durch den Host). */
  onVerloren: (() => void) | null = null;
  private einsatzId: string | null;
  private abmelden: (() => void) | null = null;
  private abholen?: ReturnType<typeof setInterval>;
  /** Einträge des Ausgangs, die mit dem Hallo verschickt wurden. */
  private imHallo = 0;
  /** Eingehende Nachrichten und der Ausgang laufen je in fester Reihenfolge. */
  private eingang = new Reihe();
  private ausgang = new Reihe();

  private constructor(
    private readonly db: LagekitDB,
    readonly ich: Teilnehmer,
    private readonly verbindung: Verbindung,
    /** Beitrittscode zum Zeigen (QR) oder zum Senden an den Vermittlungsdienst. */
    readonly anfrageCode: string,
    readonly gespeichert: GastAblage,
    private readonly dienst?: Vermittlung,
  ) {
    super();
    this.einsatzId = gespeichert.einsatzId;
    // Schon einmal verbunden: Änderungen sofort erfassen, auch solange die Verbindung fehlt.
    if (this.einsatzId) this.beobachten(this.einsatzId);
    verbindung.onZustand = (z) => {
      if (z === "offen") {
        this.status = "verbindet";
        void this.halloSenden();
      } else if (z === "getrennt" && this.status !== "abgelehnt" && this.status !== "getrennt") {
        this.status = "getrennt";
        this.meldung = "Verbindung zum Host verloren.";
        clearInterval(this.abholen);
        this.onVerloren?.();
      }
      this.melden();
    };
    verbindung.onNachricht = (n) => void this.eingang.einreihen(() => this.empfangen(n), "Nachricht des Hosts");
  }

  static async starten(
    db: LagekitDB,
    ich: Teilnehmer,
    gespeichert: GastAblage,
    dienst?: Vermittlung,
  ): Promise<GastSitzung> {
    const { verbindung, sdp } = await angebotErstellen();
    const code = await codeErstellen(PRAEFIX_ANFRAGE, { v: PROTOKOLL_VERSION, t: ich, s: sdp });
    await ablage.gastSchreiben(db, gespeichert);
    return new GastSitzung(db, ich, verbindung, code, gespeichert, dienst);
  }

  /**
   * Jede lokale Änderung kommt zuerst in den dauerhaften Ausgang und wird dann gesendet.
   * Erst die Quittung des Hosts entfernt sie wieder; reißt die Verbindung vorher ab,
   * geht sie beim nächsten Verbinden erneut mit.
   */
  private beobachten(einsatzId: string) {
    this.abmelden?.();
    this.abmelden = aenderungenBeobachten(
      this.db,
      einsatzId,
      (liste) =>
        void this.ausgang.einreihen(async () => {
          await ablage.ausstehendAnhaengen(this.db, einsatzId, liste);
          if (this.status === "verbunden" && this.verbindung.zustand === "offen") {
            this.verbindung.senden({ typ: "aenderungen", liste });
          }
        }, "Änderung nicht vorgemerkt"),
      () => {
        // Eigene Kopie gelöscht: Sitzung verlassen, beim Host bleibt alles erhalten.
        void ablage.ausstehendSchreiben(this.db, null);
        this.beenden("Der Einsatz wurde auf diesem Gerät gelöscht. Die Sitzung wurde verlassen.");
      },
    );
  }

  private halloSenden() {
    return this.ausgang.einreihen(async () => {
      const ausstehend = await ablage.ausstehendLesen(this.db);
      this.imHallo = ausstehend?.liste.length ?? 0;
      this.verbindung.senden({ typ: "hallo", geraetId: this.ich.geraetId, ausstehend });
    }, "Hallo nicht gesendet");
  }

  /** Weg mit QR-Code: Antwortcode des Hosts übernehmen. */
  async antwortSetzen(code: string) {
    const antwort = await codeLesen(PRAEFIX_ANTWORT, code, antwortSchema);
    await this.verbindung.antwortSetzen(antwort.s);
    this.status = "verbindet";
    this.melden();
  }

  /** Kurzcode-Weg: Anfrage über den Vermittlungsdienst stellen und auf die Freigabe warten. */
  async perKurzcode(kurzcode: string) {
    if (!this.dienst) throw new Error("Kein Vermittlungsdienst");
    const anfrageId = await this.dienst.anfrageSenden(kurzcode.replace(/\D/g, ""), this.anfrageCode);
    this.status = "wartet-auf-host";
    this.melden();
    this.abholen = setInterval(async () => {
      try {
        const r = await this.dienst!.antwortAbholen(anfrageId);
        if (r.status === "wartet") return;
        clearInterval(this.abholen);
        if (r.status === "abgelehnt" || !r.antwort) {
          this.beenden("Der Host hat den Beitritt abgelehnt.");
          return;
        }
        await this.antwortSetzen(r.antwort);
      } catch (e) {
        if (e instanceof VermittlungFehler && e.status === 404) {
          // Anfrage abgelaufen (z. B. Host neu geladen): neu anfragen.
          clearInterval(this.abholen);
          this.status = "getrennt";
          this.meldung = "Anfrage abgelaufen.";
          this.melden();
          this.onVerloren?.();
        }
        // Sonst beim nächsten Durchlauf erneut versuchen.
      }
    }, ABHOL_INTERVALL_MS);
  }

  /** Verlässt die Sitzung auf eigenen Wunsch. */
  verlassen() {
    this.beenden("Sitzung verlassen.");
  }

  /** Gibt Verbindung und Beobachter frei (z. B. wenn eine neue Verbindung diese ersetzt). */
  schliessen() {
    this.onVerloren = null;
    clearInterval(this.abholen);
    this.abmelden?.();
    this.abmelden = null;
    this.verbindung.schliessen();
  }

  private beenden(grund: string) {
    this.status = "abgelehnt";
    this.meldung = grund;
    this.schliessen();
    void ablage.gastSchreiben(this.db, null);
    this.melden();
  }

  private async empfangen(n: Nachricht) {
    switch (n.typ) {
      case "stand": {
        this.einsatz = await standAnwenden(this.db, n);
        await aktivenEinsatzSetzen(this.db, this.einsatz.id);
        if (this.einsatzId !== this.einsatz.id) {
          this.einsatzId = this.einsatz.id;
          this.beobachten(this.einsatz.id);
          await ablage.gastSchreiben(this.db, { ...this.gespeichert, einsatzId: this.einsatz.id });
        }
        const einsatzId = this.einsatz.id;
        await this.ausgang.einreihen(async () => {
          // Was mit dem Hallo ging, hat der Host übernommen. Was seitdem dazukam, hat der
          // Stand eben überschrieben: hier wieder anwenden und gleich nachschicken.
          await ablage.ausstehendKuerzen(this.db, this.imHallo);
          this.imHallo = 0;
          const rest = await ablage.ausstehendLesen(this.db);
          if (rest && rest.einsatzId !== einsatzId) await ablage.ausstehendSchreiben(this.db, null);
          else if (rest && rest.liste.length > 0) {
            await aenderungenAnwenden(this.db, einsatzId, rest.liste).catch(() => {});
            this.verbindung.senden({ typ: "aenderungen", liste: rest.liste });
          }
          this.status = "verbunden";
          this.meldung = null;
        }, "Ausgang nach dem Stand nicht gesendet");
        break;
      }
      case "quittung":
        await this.ausgang.einreihen(() => ablage.ausstehendKuerzen(this.db, n.anzahl), "Quittung nicht verarbeitet");
        return;
      case "aenderungen":
        if (!this.einsatz) return;
        try {
          await aenderungenAnwenden(this.db, this.einsatz.id, n.liste);
        } catch (e) {
          console.warn("Lagekit: Änderung des Hosts nicht übernommen", e);
        }
        return;
      case "teilnehmer":
        this.teilnehmer = n.liste;
        break;
      case "ende":
        this.beenden(n.grund);
        return;
      default:
        return;
    }
    this.melden();
  }
}

// ---------------------------------------------------------------- Aktuelle Sitzung

export type Sitzung = HostSitzung | GastSitzung;

let aktuell: Sitzung | null = null;
const hoerer = new Set<() => void>();
let abmeldenAktuell: (() => void) | null = null;
let stand = 0;

function melden() {
  stand++;
  for (const f of hoerer) f();
}

function setzen(sitzung: Sitzung | null) {
  if (aktuell && aktuell !== sitzung) aktuell.schliessen();
  abmeldenAktuell?.();
  aktuell = sitzung;
  abmeldenAktuell = sitzung ? sitzung.abonnieren(melden) : null;
  if (sitzung?.rolle === "gast") sitzung.onVerloren = () => void wiederverbinden(sitzung);
  if (sitzung?.rolle === "host") sitzung.onBeendet = () => aktuell === sitzung && setzen(null);
  if (sitzung) kanal()?.postMessage("gestartet");
  else {
    // Erst freigeben, wenn das Ende gespeichert ist; sonst stellt ein wartender Tab die Sitzung wieder her.
    const frei = sperreFreigeben;
    void ablage.fertig().then(() => {
      if (!aktuell) frei?.();
    });
  }
  melden();
}

// ---------------------------------------------------------------- Mehrere Tabs

/**
 * Nur ein Tab pro Gerät führt die Sitzung. Zwei Tabs mit derselben Geräte-Kennung
 * würden sich beim Host gegenseitig verdrängen, und jeder Tab sieht nur seine
 * eigenen Änderungen. Die Web-Locks-API sorgt dafür, dass genau ein Tab die Sitzung
 * hält; die anderen zeigen einen Hinweis und übernehmen, sobald der Tab geschlossen wird.
 */
const SPERRE = "lagekit-sitzung";
let sperreFreigeben: (() => void) | null = null;
let andererTab = false;
let tabKanal: BroadcastChannel | null | undefined;

function kanal(): BroadcastChannel | null {
  if (tabKanal === undefined) {
    tabKanal = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(SPERRE);
  }
  return tabKanal;
}

/** Holt die Sperre. Mit `warten` erst, wenn der andere Tab sie freigibt. */
function sperreHolen(warten: boolean): Promise<boolean> {
  if (sperreFreigeben) return Promise.resolve(true);
  if (typeof navigator === "undefined" || !navigator.locks) return Promise.resolve(true);
  return new Promise((ergebnis) => {
    void navigator.locks.request(SPERRE, { ifAvailable: !warten }, (sperre) => {
      if (!sperre) {
        ergebnis(false);
        return;
      }
      return new Promise<void>((frei) => {
        sperreFreigeben = () => {
          sperreFreigeben = null;
          frei();
        };
        ergebnis(true);
      });
    });
  });
}

class AndererTabFehler extends Error {
  constructor() {
    super("„Gemeinsam arbeiten“ läuft bereits in einem anderen Tab dieser App. Bitte dort weiterarbeiten.");
  }
}

const WARTEZEITEN_MS = [1_000, 3_000, 5_000, 10_000, 20_000, 30_000];

/** Kurzcode-Weg: nach einem Abriss selbstständig neu verbinden, bis es klappt oder der Nutzer aufgibt. */
async function wiederverbinden(alt: GastSitzung, versuch = 0): Promise<void> {
  const { gespeichert } = alt;
  if (gespeichert.weg !== "kurzcode" || !gespeichert.kurzcode || !dienstFuerWiederverbinden) {
    alt.meldung = "Verbindung zum Host verloren. Bitte unter „Gemeinsam“ erneut beitreten.";
    melden();
    return;
  }
  alt.meldung = "Verbindung zum Host verloren. Verbinde neu …";
  melden();
  await new Promise((r) => setTimeout(r, WARTEZEITEN_MS[Math.min(versuch, WARTEZEITEN_MS.length - 1)]));
  if (aktuell !== alt) return; // Inzwischen verlassen oder ersetzt.
  try {
    const neu = await GastSitzung.starten(alt["db"], alt.ich, gespeichert, dienstFuerWiederverbinden);
    if (aktuell !== alt) {
      neu.schliessen();
      return;
    }
    neu.meldung = "Verbindung zum Host verloren. Verbinde neu …";
    setzen(neu);
    await neu.perKurzcode(gespeichert.kurzcode);
  } catch {
    if (aktuell === alt) await wiederverbinden(alt, versuch + 1);
    else if (aktuell?.rolle === "gast" && aktuell.status !== "verbunden") await wiederverbinden(aktuell, versuch + 1);
  }
}

let dienstFuerWiederverbinden: Vermittlung | undefined;

export const sitzungen = {
  abonnieren(f: () => void) {
    hoerer.add(f);
    return () => hoerer.delete(f);
  },
  /** Ändert sich bei jedem Ereignis der aktuellen Sitzung. */
  stand: () => stand,
  aktuell: () => aktuell,
  setzen,

  /** Läuft die Sitzung in einem anderen Tab? Dann wird hier nichts abgeglichen. */
  andererTab: () => andererTab,

  /** Startet als Host. */
  async leiten(db: LagekitDB, einsatz: Einsatz, ich: Teilnehmer, dienst?: Vermittlung) {
    if (!(await sperreHolen(false))) throw new AndererTabFehler();
    const host = new HostSitzung(db, einsatz, ich, dienst);
    setzen(host);
    void host.kurzcodeAnfordern();
    return host;
  },

  /** Tritt bei; beim Kurzcode-Weg wird die Anfrage gleich gesendet. */
  async beitreten(db: LagekitDB, ich: Teilnehmer, weg: "kurzcode" | "qr", kurzcode: string, dienst?: Vermittlung) {
    if (!(await sperreHolen(false))) throw new AndererTabFehler();
    dienstFuerWiederverbinden = dienst;
    const bisher = await ablage.gastLesen(db);
    const gast = await GastSitzung.starten(
      db,
      ich,
      { weg, kurzcode: weg === "kurzcode" ? kurzcode.replace(/\D/g, "") : null, einsatzId: bisher?.einsatzId ?? null },
      dienst,
    );
    if (weg === "kurzcode") {
      try {
        await gast.perKurzcode(kurzcode);
      } catch (e) {
        gast.verlassen();
        throw e;
      }
    }
    setzen(gast);
    return gast;
  },

  /** Stellt nach dem Laden der Seite eine gespeicherte Sitzung wieder her. */
  async wiederherstellen(db: LagekitDB, dienst?: Vermittlung): Promise<void> {
    if (aktuell || andererTab) return;
    dienstFuerWiederverbinden = dienst;
    // Startet ein anderer Tab eine Sitzung, prüft dieser Tab erneut (und zeigt den Hinweis).
    const k = kanal();
    if (k && !k.onmessage) k.onmessage = () => void sitzungen.wiederherstellen(db, dienst);
    if (!(await ablage.hostLesen(db)) && !(await ablage.gastLesen(db))) return;
    if (!(await sperreHolen(false))) {
      andererTab = true;
      melden();
      await sperreHolen(true);
      andererTab = false;
      melden();
    }
    if (aktuell) return;
    const host = await ablage.hostLesen(db);
    if (host) {
      const einsatz = await db.einsaetze.get(host.einsatzId);
      if (!einsatz) {
        await ablage.hostSchreiben(db, null);
      } else {
        const sitzung = new HostSitzung(db, einsatz, await ichLesen(db), dienst, host);
        setzen(sitzung);
        void sitzung.kurzcodeAnfordern();
        return;
      }
    }
    const gast = await ablage.gastLesen(db);
    if (!gast) {
      sperreFreigeben?.(); // Die Sitzung im anderen Tab wurde beendet.
      return;
    }
    const ich = await ichLesen(db);
    try {
      const sitzung = await GastSitzung.starten(db, ich, gast, dienst);
      if (aktuell) {
        sitzung.schliessen();
        return;
      }
      setzen(sitzung);
      if (gast.weg === "kurzcode" && gast.kurzcode) {
        sitzung.meldung = "Verbinde wieder mit dem Host …";
        await sitzung.perKurzcode(gast.kurzcode).catch(() => sitzung.onVerloren?.());
      } else {
        sitzung.meldung = "Nach dem Neuladen: Beitrittscode erneut beim Host scannen lassen.";
      }
      melden();
    } catch {
      // Kein Netz: beim nächsten Laden erneut versuchen.
      if (!aktuell) sperreFreigeben?.();
    }
  },
};
