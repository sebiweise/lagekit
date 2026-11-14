import type { LagekitDB } from "@/core/db/db";
import { aktivenEinsatzSetzen } from "@/core/einsatz/repository";
import type { Einsatz } from "@/core/einsatz/schema";
import { aenderungenAnwenden, standAnwenden, standErstellen } from "./daten";
import { aenderungenBeobachten } from "./erfassung";
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
import { codeErstellen, codeLesen, type KompaktesSdp } from "./verbindungscode";
import type { Vermittlung } from "./vermittlung";

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

// ---------------------------------------------------------------- Host

export type GastStatus = "wartet-auf-freigabe" | "verbindet" | "verbunden" | "getrennt" | "abgelehnt";

export interface HostGast {
  anfrageId: string;
  teilnehmer: Teilnehmer;
  status: GastStatus;
  quelle: "qr" | "kurzcode";
  angekommenAm: Date;
  /** Antwortcode zum Scannen (nur Weg mit QR-Code). */
  antwortCode?: string;
  angebot: KompaktesSdp;
  verbindung?: Verbindung;
}

export class HostSitzung extends Beobachtbar {
  readonly rolle = "host" as const;
  gaeste: HostGast[] = [];
  kurzcode: string | null = null;
  kurzcodeFehler: string | null = null;
  private schluessel: string | null = null;
  private abmelden: () => void;
  private abholen?: ReturnType<typeof setInterval>;
  private beendet = false;

  constructor(
    private readonly db: LagekitDB,
    readonly einsatz: Einsatz,
    readonly ich: Teilnehmer,
    private readonly dienst?: Vermittlung,
  ) {
    super();
    this.abmelden = aenderungenBeobachten(db, einsatz.id, (liste) => this.verteilen(liste));
  }

  /** Meldet die Sitzung beim Vermittlungsdienst an, damit Geräte per Kurzcode beitreten können. */
  async kurzcodeAnfordern() {
    if (!this.dienst || this.kurzcode) return;
    try {
      const { kurzcode, schluessel } = await this.dienst.sitzungAnlegen();
      if (this.beendet) return;
      this.kurzcode = kurzcode;
      this.schluessel = schluessel;
      this.kurzcodeFehler = null;
      this.abholen = setInterval(() => void this.anfragenAbholen(), ABHOL_INTERVALL_MS);
    } catch (e) {
      this.kurzcodeFehler = e instanceof Error ? e.message : String(e);
    }
    this.melden();
  }

  private async anfragenAbholen() {
    if (!this.dienst || !this.kurzcode || !this.schluessel) return;
    try {
      const neu = await this.dienst.anfragenAbholen(this.kurzcode, this.schluessel);
      for (const { anfrageId, anfrage } of neu) await this.anfrageAufnehmen(anfrage, "kurzcode", anfrageId);
    } catch {
      // Kurzzeitige Netzprobleme: beim nächsten Durchlauf erneut versuchen.
    }
  }

  /** Nimmt eine Beitrittsanfrage auf; der Host muss sie danach zulassen oder ablehnen. */
  async anfrageAufnehmen(code: string, quelle: HostGast["quelle"] = "qr", anfrageId = crypto.randomUUID()) {
    const anfrage = await codeLesen(PRAEFIX_ANFRAGE, code, anfrageSchema);
    // Ein Gerät, das erneut beitritt, ersetzt seinen alten Eintrag.
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
      angebot: anfrage.s,
    };
    this.gaeste = [...this.gaeste, gast];
    this.melden();
    return gast;
  }

  async zulassen(anfrageId: string) {
    const gast = this.finden(anfrageId);
    if (!gast || gast.status !== "wartet-auf-freigabe") return;
    const { verbindung, sdp } = await angebotBeantworten(gast.angebot);
    gast.verbindung = verbindung;
    gast.status = "verbindet";
    const antwort = await codeErstellen(PRAEFIX_ANTWORT, { v: PROTOKOLL_VERSION, s: sdp });
    verbindung.onNachricht = (n) => void this.empfangen(gast, n);
    verbindung.onZustand = (z) => {
      if (z === "getrennt" && gast.status !== "abgelehnt") {
        gast.status = "getrennt";
        this.teilnehmerVerteilen();
        this.melden();
      }
    };
    if (gast.quelle === "kurzcode" && this.dienst && this.kurzcode && this.schluessel) {
      await this.dienst.antworten(this.kurzcode, this.schluessel, anfrageId, antwort);
    } else {
      gast.antwortCode = antwort;
    }
    this.melden();
  }

  async ablehnen(anfrageId: string) {
    const gast = this.finden(anfrageId);
    if (!gast) return;
    gast.status = "abgelehnt";
    gast.verbindung?.schliessen();
    if (gast.quelle === "kurzcode" && this.dienst && this.kurzcode && this.schluessel) {
      await this.dienst.antworten(this.kurzcode, this.schluessel, anfrageId, null).catch(() => {});
    }
    this.melden();
  }

  /** Trennt ein verbundenes Gerät. */
  trennen(anfrageId: string) {
    const gast = this.finden(anfrageId);
    if (!gast?.verbindung) return;
    gast.verbindung.senden({ typ: "ende", grund: "Der Host hat die Verbindung getrennt." });
    gast.status = "abgelehnt";
    gast.verbindung.schliessen();
    this.teilnehmerVerteilen();
    this.melden();
  }

  beenden() {
    this.beendet = true;
    clearInterval(this.abholen);
    this.abmelden();
    for (const g of this.gaeste) {
      g.verbindung?.senden({ typ: "ende", grund: "Der Host hat die Sitzung beendet." });
      g.verbindung?.schliessen();
    }
    if (this.dienst && this.kurzcode && this.schluessel) {
      void this.dienst.sitzungBeenden(this.kurzcode, this.schluessel).catch(() => {});
    }
    this.melden();
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
      gast.verbindung?.senden(await standErstellen(this.db, this.einsatz.id));
      gast.status = "verbunden";
      this.teilnehmerVerteilen();
      this.melden();
      return;
    }
    if (n.typ === "aenderungen" && gast.status === "verbunden") {
      try {
        await aenderungenAnwenden(this.db, this.einsatz.id, n.liste);
      } catch (e) {
        console.warn("Lagekit: Änderung eines Geräts abgelehnt", e);
        return;
      }
      this.verteilen(n.liste, gast);
    }
  }

  private verteilen(liste: Aenderung[], ausser?: HostGast) {
    for (const g of this.verbunden) {
      if (g !== ausser) g.verbindung?.senden({ typ: "aenderungen", liste });
    }
  }

  private teilnehmerVerteilen() {
    const liste = [this.ich, ...this.verbunden.map((g) => g.teilnehmer)];
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
  private abmelden: (() => void) | null = null;
  private abholen?: ReturnType<typeof setInterval>;

  private constructor(
    private readonly db: LagekitDB,
    readonly ich: Teilnehmer,
    private readonly verbindung: Verbindung,
    /** Beitrittscode zum Zeigen (QR) oder zum Senden an den Vermittlungsdienst. */
    readonly anfrageCode: string,
    private readonly dienst?: Vermittlung,
  ) {
    super();
    verbindung.onZustand = (z) => {
      if (z === "offen") {
        this.status = "verbindet";
        verbindung.senden({ typ: "hallo", geraetId: ich.geraetId });
      } else if (z === "getrennt" && this.status !== "abgelehnt") {
        this.status = "getrennt";
        this.meldung ??= "Verbindung zum Host verloren. Bitte erneut beitreten.";
        this.aufraeumen();
      }
      this.melden();
    };
    verbindung.onNachricht = (n) => void this.empfangen(n);
  }

  static async starten(db: LagekitDB, ich: Teilnehmer, dienst?: Vermittlung): Promise<GastSitzung> {
    const { verbindung, sdp } = await angebotErstellen();
    const code = await codeErstellen(PRAEFIX_ANFRAGE, { v: PROTOKOLL_VERSION, t: ich, s: sdp });
    return new GastSitzung(db, ich, verbindung, code, dienst);
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
          this.status = "abgelehnt";
          this.meldung = "Der Host hat den Beitritt abgelehnt.";
          this.aufraeumen();
          this.melden();
          return;
        }
        await this.antwortSetzen(r.antwort);
      } catch {
        // Beim nächsten Durchlauf erneut versuchen.
      }
    }, ABHOL_INTERVALL_MS);
  }

  verlassen() {
    this.status = "getrennt";
    this.meldung = "Sitzung verlassen.";
    this.aufraeumen();
    this.melden();
  }

  private aufraeumen() {
    clearInterval(this.abholen);
    this.abmelden?.();
    this.abmelden = null;
    this.verbindung.schliessen();
  }

  private async empfangen(n: Nachricht) {
    switch (n.typ) {
      case "stand": {
        this.abmelden?.();
        this.einsatz = await standAnwenden(this.db, n);
        await aktivenEinsatzSetzen(this.db, this.einsatz.id);
        this.abmelden = aenderungenBeobachten(this.db, this.einsatz.id, (liste) =>
          this.verbindung.senden({ typ: "aenderungen", liste }),
        );
        this.status = "verbunden";
        break;
      }
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
        this.status = "abgelehnt";
        this.meldung = n.grund;
        this.aufraeumen();
        break;
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

export const sitzungen = {
  abonnieren(f: () => void) {
    hoerer.add(f);
    return () => hoerer.delete(f);
  },
  /** Ändert sich bei jedem Ereignis der aktuellen Sitzung. */
  stand: () => stand,
  aktuell: () => aktuell,
  setzen(sitzung: Sitzung | null) {
    abmeldenAktuell?.();
    aktuell = sitzung;
    abmeldenAktuell = sitzung ? sitzung.abonnieren(melden) : null;
    melden();
  },
};
