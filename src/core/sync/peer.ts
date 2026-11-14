import { nachrichtSchema, type Nachricht } from "./protokoll";
import { sdpAufbauen, sdpVerdichten, type KompaktesSdp } from "./verbindungscode";

/**
 * Direkte Verbindung zweier Geräte über WebRTC (Datenkanal).
 *
 * Bewusst ohne STUN/TURN: Beide Geräte müssen im selben Netz sein, die Einsatzdaten
 * verlassen das lokale Netz nie. Der Kanal ist ausgehandelt (`negotiated`), damit
 * beide Seiten ihn ohne zusätzliche Signalisierung kennen.
 */

const TEIL_GROESSE = 16_000;
const PING_MS = 2_000;
/** Ohne Lebenszeichen so lange gilt die Verbindung als abgerissen (WebRTC selbst merkt es oft erst nach 30 s). */
const STILLE_MS = 8_000;
const WARTEZEIT_KANDIDATEN_MS = 2_500;

export type VerbindungsZustand = "aufbau" | "offen" | "getrennt";

interface Teil {
  teil: string;
  i: number;
  n: number;
  d: string;
}

export class Verbindung {
  zustand: VerbindungsZustand = "aufbau";
  onNachricht: (n: Nachricht) => void = () => {};
  onZustand: (z: VerbindungsZustand) => void = () => {};
  private teile = new Map<string, string[]>();
  private zuletzt = Date.now();
  private takt?: ReturnType<typeof setInterval>;

  constructor(
    private readonly pc: RTCPeerConnection,
    private readonly kanal: RTCDataChannel,
  ) {
    kanal.onopen = () => {
      this.zuletzt = Date.now();
      this.setzen("offen");
      this.takt = setInterval(() => {
        if (Date.now() - this.zuletzt > STILLE_MS) {
          this.schliessen();
          return;
        }
        this.senden({ typ: "ping" });
      }, PING_MS);
    };
    kanal.onclose = () => this.setzen("getrennt");
    kanal.onmessage = (e) => this.empfangen(String(e.data));
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) this.setzen("getrennt");
    };
  }

  private setzen(zustand: VerbindungsZustand) {
    if (this.zustand === zustand || this.zustand === "getrennt") return;
    if (zustand === "getrennt") clearInterval(this.takt);
    this.zustand = zustand;
    this.onZustand(zustand);
  }

  private empfangen(text: string) {
    this.zuletzt = Date.now();
    let roh: unknown;
    try {
      roh = JSON.parse(text);
    } catch {
      return;
    }
    if (typeof roh === "object" && roh !== null && "teil" in roh) {
      const t = roh as Teil;
      const liste = this.teile.get(t.teil) ?? new Array<string>(t.n);
      liste[t.i] = t.d;
      this.teile.set(t.teil, liste);
      if (liste.filter((x) => x !== undefined).length < t.n) return;
      this.teile.delete(t.teil);
      this.empfangen(liste.join(""));
      return;
    }
    const ergebnis = nachrichtSchema.safeParse(roh);
    if (!ergebnis.success) console.warn("Lagekit: ungültige Nachricht verworfen", ergebnis.error);
    else if (ergebnis.data.typ !== "ping") this.onNachricht(ergebnis.data);
  }

  senden(nachricht: Nachricht) {
    if (this.kanal.readyState !== "open") return;
    const text = JSON.stringify(nachricht);
    if (text.length <= TEIL_GROESSE) {
      this.kanal.send(text);
      return;
    }
    const id = crypto.randomUUID();
    const n = Math.ceil(text.length / TEIL_GROESSE);
    for (let i = 0; i < n; i++) {
      const teil: Teil = { teil: id, i, n, d: text.slice(i * TEIL_GROESSE, (i + 1) * TEIL_GROESSE) };
      this.kanal.send(JSON.stringify(teil));
    }
  }

  async antwortSetzen(antwort: KompaktesSdp) {
    await this.pc.setRemoteDescription({ type: "answer", sdp: sdpAufbauen(antwort, "answer") });
  }

  schliessen() {
    this.setzen("getrennt");
    this.kanal.close();
    this.pc.close();
  }
}

function neu(): { pc: RTCPeerConnection; kanal: RTCDataChannel } {
  const pc = new RTCPeerConnection({ iceServers: [] });
  const kanal = pc.createDataChannel("lagekit", { negotiated: true, id: 0, ordered: true });
  return { pc, kanal };
}

/** Wartet, bis alle lokalen Kandidaten bekannt sind (kein Nachreichen möglich). */
async function kandidatenSammeln(pc: RTCPeerConnection): Promise<KompaktesSdp> {
  if (pc.iceGatheringState !== "complete") {
    await new Promise<void>((fertig) => {
      const zeit = setTimeout(fertig, WARTEZEIT_KANDIDATEN_MS);
      pc.addEventListener("icegatheringstatechange", () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(zeit);
          fertig();
        }
      });
    });
  }
  const sdp = pc.localDescription?.sdp;
  if (!sdp) throw new Error("Keine Verbindungsdaten erzeugt.");
  const kompakt = sdpVerdichten(sdp);
  if (kompakt.k.length === 0) throw new Error("Kein Netzwerk gefunden. Ist das Gerät mit einem WLAN verbunden?");
  return kompakt;
}

/** Gast: erzeugt ein Angebot. */
export async function angebotErstellen(): Promise<{ verbindung: Verbindung; sdp: KompaktesSdp }> {
  const { pc, kanal } = neu();
  await pc.setLocalDescription(await pc.createOffer());
  return { verbindung: new Verbindung(pc, kanal), sdp: await kandidatenSammeln(pc) };
}

/** Host: beantwortet das Angebot eines Gasts. */
export async function angebotBeantworten(angebot: KompaktesSdp): Promise<{ verbindung: Verbindung; sdp: KompaktesSdp }> {
  const { pc, kanal } = neu();
  await pc.setRemoteDescription({ type: "offer", sdp: sdpAufbauen(angebot, "offer") });
  await pc.setLocalDescription(await pc.createAnswer());
  return { verbindung: new Verbindung(pc, kanal), sdp: await kandidatenSammeln(pc) };
}
