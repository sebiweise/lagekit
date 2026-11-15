"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type * as Leaflet from "leaflet";
import { Crosshair, LoaderCircle, LocateFixed, MapPin, Navigation, Search, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDb } from "@/core/db/db";
import { useAktiverEinsatz } from "@/core/einsatz/hooks";
import { einsatzOrtSetzen } from "@/core/einsatz/repository";
import { useOnline } from "@/core/pwa/components/use-online";
import { adresseSuchen, type Fundstelle } from "@/core/standort/adresse";
import { entfernungText, koordinatenText, standortMeldung, type Koordinaten } from "@/core/standort/standort";
import { ortZuKoordinaten } from "@/core/standort/standort-ort";
import { utmref } from "@/core/standort/utmref";
import { cn } from "@/lib/utils";
import { KACHEL_NAMENSNENNUNG, KACHEL_URL, MAX_ZOOM } from "../kacheln";

type Punkt = Pick<Koordinaten, "lat" | "lon">;

/** Mitte Deutschlands, wenn noch kein Punkt bekannt ist. */
const START: Punkt = { lat: 51.16, lon: 10.45 };

const FARBE_EINSATZ = "#b91c1c";
const FARBE_ICH = "#2563eb";
const FARBE_AUSWAHL = "#111827";

/**
 * Karte mit OpenStreetMap: Einsatzort, eigener Standort, ein angetippter Punkt.
 * Leaflet wird erst im Browser geladen (die Seite ist statisch vorgerendert).
 */
export function Karte({ className }: { className?: string }) {
  const einsatz = useAktiverEinsatz();
  const online = useOnline();
  const behaelter = useRef<HTMLDivElement>(null);
  const karte = useRef<Leaflet.Map | null>(null);
  const lib = useRef<typeof Leaflet | null>(null);
  const ebenen = useRef<{ einsatz?: Leaflet.Layer; ich?: Leaflet.LayerGroup; auswahl?: Leaflet.Layer }>({});
  const [bereit, setBereit] = useState(false);

  const [ich, setIch] = useState<Koordinaten | null>(null);
  const [verfolgen, setVerfolgen] = useState(false);
  const [ichFehler, setIchFehler] = useState<string | null>(null);
  const [auswahl, setAuswahl] = useState<Punkt | null>(null);
  const [setzt, setSetzt] = useState(false);

  const [suche, setSuche] = useState("");
  const [treffer, setTreffer] = useState<Fundstelle[] | null>(null);
  const [sucheLaeuft, setSucheLaeuft] = useState(false);
  const [sucheFehler, setSucheFehler] = useState<string | null>(null);

  const einsatzort = einsatz?.koordinaten ?? null;

  // Karte einmal aufbauen.
  useEffect(() => {
    let abgebrochen = false;
    void import("leaflet").then((L) => {
      if (abgebrochen || !behaelter.current) return;
      lib.current = L;
      const m = L.map(behaelter.current, { zoomControl: true, attributionControl: true }).setView(
        [START.lat, START.lon],
        6,
      );
      m.attributionControl.setPrefix(false);
      L.tileLayer(KACHEL_URL, { maxZoom: MAX_ZOOM, attribution: KACHEL_NAMENSNENNUNG }).addTo(m);
      m.on("click", (e: Leaflet.LeafletMouseEvent) => setAuswahl({ lat: e.latlng.lat, lon: e.latlng.lng }));
      karte.current = m;
      setBereit(true);
    });
    return () => {
      abgebrochen = true;
      karte.current?.remove();
      karte.current = null;
    };
  }, []);

  // Größe neu messen, wenn der Behälter sich ändert (z. B. im Arbeitsbereich).
  useEffect(() => {
    if (!bereit || !behaelter.current || typeof ResizeObserver === "undefined") return;
    const beobachter = new ResizeObserver(() => karte.current?.invalidateSize());
    beobachter.observe(behaelter.current);
    return () => beobachter.disconnect();
  }, [bereit]);

  // Einsatzort zeichnen; beim ersten Mal dorthin springen.
  const gesprungen = useRef(false);
  useEffect(() => {
    const L = lib.current;
    const m = karte.current;
    if (!bereit || !L || !m) return;
    ebenen.current.einsatz?.remove();
    ebenen.current.einsatz = undefined;
    if (!einsatzort) return;
    ebenen.current.einsatz = L.circleMarker([einsatzort.lat, einsatzort.lon], {
      radius: 11,
      color: "#fff",
      weight: 3,
      fillColor: FARBE_EINSATZ,
      fillOpacity: 1,
    })
      .bindTooltip(`Einsatzort${einsatz?.ort ? `: ${einsatz.ort}` : ""}`, { direction: "top", offset: [0, -10] })
      .addTo(m);
    if (!gesprungen.current) {
      gesprungen.current = true;
      m.setView([einsatzort.lat, einsatzort.lon], 16);
    }
  }, [bereit, einsatzort, einsatz?.ort]);

  // Eigener Standort fortlaufend, solange eingeschaltet.
  useEffect(() => {
    if (!verfolgen) return;
    let erster = true;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const neu = { lat: p.coords.latitude, lon: p.coords.longitude, genauigkeit: Math.round(p.coords.accuracy) };
        setIch(neu);
        setIchFehler(null);
        if (erster) {
          erster = false;
          karte.current?.setView([neu.lat, neu.lon], Math.max(karte.current.getZoom(), 16));
        }
      },
      (e) => {
        setIchFehler(standortMeldung(e));
        if (e.code === e.PERMISSION_DENIED) setVerfolgen(false);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [verfolgen]);

  useEffect(() => {
    const L = lib.current;
    const m = karte.current;
    if (!bereit || !L || !m) return;
    ebenen.current.ich?.remove();
    ebenen.current.ich = undefined;
    if (!ich || !verfolgen) return;
    ebenen.current.ich = L.layerGroup([
      L.circle([ich.lat, ich.lon], {
        radius: ich.genauigkeit ?? 0,
        color: FARBE_ICH,
        weight: 1,
        fillOpacity: 0.1,
        interactive: false,
      }),
      L.circleMarker([ich.lat, ich.lon], {
        radius: 8,
        color: "#fff",
        weight: 3,
        fillColor: FARBE_ICH,
        fillOpacity: 1,
      }).bindTooltip("Mein Standort", { direction: "top", offset: [0, -8] }),
    ]).addTo(m);
  }, [bereit, ich, verfolgen]);

  useEffect(() => {
    const L = lib.current;
    const m = karte.current;
    if (!bereit || !L || !m) return;
    ebenen.current.auswahl?.remove();
    ebenen.current.auswahl = undefined;
    if (!auswahl) return;
    ebenen.current.auswahl = L.circleMarker([auswahl.lat, auswahl.lon], {
      radius: 9,
      color: "#fff",
      weight: 3,
      fillColor: FARBE_AUSWAHL,
      fillOpacity: 1,
    }).addTo(m);
  }, [bereit, auswahl]);

  function hin(p: Punkt, zoom = 17) {
    karte.current?.setView([p.lat, p.lon], zoom);
  }

  async function alsEinsatzort(p: Punkt) {
    if (!einsatz) return;
    setSetzt(true);
    try {
      const r = await ortZuKoordinaten(p);
      await einsatzOrtSetzen(getDb(), einsatz.id, r.ort, r.koordinaten);
      setAuswahl(null);
    } finally {
      setSetzt(false);
    }
  }

  async function suchen(e: FormEvent) {
    e.preventDefault();
    setSucheLaeuft(true);
    setSucheFehler(null);
    try {
      const r = await adresseSuchen(suche);
      setTreffer(r);
    } catch {
      setSucheFehler("Adresssuche nicht erreichbar.");
    } finally {
      setSucheLaeuft(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)} data-testid="karte">
      <form onSubmit={suchen} className="flex gap-2" role="search">
        <Input
          aria-label="Adresse oder Ort suchen"
          placeholder="Adresse oder Ort suchen"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          enterKeyHint="search"
        />
        <Button type="submit" variant="outline" disabled={!online || sucheLaeuft || !suche.trim()} aria-label="Suchen">
          {sucheLaeuft ? <LoaderCircle className="animate-spin" /> : <Search />}
        </Button>
      </form>
      {sucheFehler && <p className="text-sm text-destructive">{sucheFehler}</p>}
      {treffer && (
        <ul className="flex flex-col rounded-md border text-sm" aria-label="Suchergebnisse">
          {treffer.length === 0 && <li className="p-3 text-muted-foreground">Nichts gefunden.</li>}
          {treffer.map((t) => (
            <li key={`${t.lat},${t.lon}`} className="border-b last:border-b-0">
              <button
                type="button"
                className="w-full p-3 text-left hover:bg-accent"
                onClick={() => {
                  setAuswahl({ lat: t.lat, lon: t.lon });
                  hin(t);
                  setTreffer(null);
                }}
              >
                <span className="font-medium">{t.text}</span>
                <span className="block truncate text-xs text-muted-foreground">{t.lang}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative isolate">
        <div
          ref={behaelter}
          className="h-[55vh] min-h-72 w-full overflow-hidden rounded-xl border bg-muted"
          aria-label="Karte"
          role="application"
        />
        <div className="absolute top-2 right-2 z-[500] flex flex-col gap-2">
          <Button
            type="button"
            size="icon"
            variant={verfolgen ? "default" : "outline"}
            aria-pressed={verfolgen}
            aria-label={verfolgen ? "Eigenen Standort ausblenden" : "Eigenen Standort zeigen"}
            onClick={() => {
              if (!verfolgen && !navigator.geolocation) {
                setIchFehler("Dieses Gerät kann den Standort nicht bestimmen.");
                return;
              }
              setVerfolgen(!verfolgen);
            }}
            data-testid="karte-ich"
          >
            <LocateFixed />
          </Button>
          {einsatzort && (
            <Button type="button" size="icon" variant="outline" aria-label="Zum Einsatzort" onClick={() => hin(einsatzort)}>
              <Crosshair />
            </Button>
          )}
        </div>
        {!online && (
          <p className="absolute bottom-6 left-2 z-[500] flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs shadow">
            <WifiOff className="size-3.5" /> Offline: nur schon angesehene Kartenausschnitte
          </p>
        )}
      </div>
      {ichFehler && (
        <p role="alert" className="text-sm text-destructive">
          {ichFehler}
        </p>
      )}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <PunktAngabe titel="Einsatzort" farbe={FARBE_EINSATZ} punkt={einsatzort} text={einsatz?.ort}>
          {!einsatz ? (
            <p className="text-muted-foreground">
              Kein Einsatz aktiv. <Link href="/einsatz/" className="underline">Einsatz anlegen</Link>
            </p>
          ) : (
            !einsatzort && <p className="text-muted-foreground">Noch kein Punkt. Auf die Karte tippen und als Einsatzort setzen.</p>
          )}
        </PunktAngabe>
        {verfolgen && (
          <PunktAngabe
            titel="Mein Standort"
            farbe={FARBE_ICH}
            punkt={ich}
            zusatz={
              ich
                ? [ich.genauigkeit !== undefined ? `± ${ich.genauigkeit} m` : null, einsatzort ? `Einsatzort ${entfernungText(ich, einsatzort)}` : null]
                    .filter(Boolean)
                    .join(" · ")
                : "Standort wird bestimmt …"
            }
          >
            {ich && einsatz && (
              <Button type="button" size="sm" variant="outline" disabled={setzt} onClick={() => void alsEinsatzort(ich)}>
                <MapPin /> Hier ist der Einsatzort
              </Button>
            )}
          </PunktAngabe>
        )}
        {auswahl && (
          <PunktAngabe
            titel="Gewählter Punkt"
            farbe={FARBE_AUSWAHL}
            punkt={auswahl}
            zusatz={[
              einsatzort ? `vom Einsatzort ${entfernungText(einsatzort, auswahl)}` : null,
              ich && verfolgen ? `von mir ${entfernungText(ich, auswahl)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            <div className="flex flex-wrap gap-2">
              {einsatz && (
                <Button
                  type="button"
                  size="sm"
                  disabled={setzt}
                  onClick={() => void alsEinsatzort(auswahl)}
                  data-testid="als-einsatzort"
                >
                  {setzt ? <LoaderCircle className="animate-spin" /> : <MapPin />} Als Einsatzort setzen
                </Button>
              )}
              <a
                href={navigationsLink(auswahl)}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                <Navigation /> Navigation
              </a>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAuswahl(null)} aria-label="Auswahl aufheben">
                <X />
              </Button>
            </div>
          </PunktAngabe>
        )}
      </dl>
      <p className="text-xs text-muted-foreground">
        Kartenbild und Adressen von OpenStreetMap; die Suche fragt nur auf Knopfdruck. Ohne Internet bleiben Standort,
        UTMREF und Entfernungen nutzbar.
      </p>
    </div>
  );
}

function PunktAngabe({
  titel,
  farbe,
  punkt,
  text,
  zusatz,
  children,
}: {
  titel: string;
  farbe: string;
  punkt: Punkt | null;
  text?: string;
  zusatz?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-3" data-testid={`punkt-${titel}`}>
      <dt className="flex items-center gap-2 font-medium">
        <span className="inline-block size-3 rounded-full" style={{ backgroundColor: farbe }} aria-hidden />
        {titel}
      </dt>
      <dd className="flex flex-col gap-1">
        {text && <span>{text}</span>}
        {punkt && (
          <>
            <span className="font-mono text-base" data-testid="utmref">
              {utmref(punkt.lat, punkt.lon)}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{koordinatenText(punkt)}</span>
          </>
        )}
        {zusatz && <span className="text-muted-foreground">{zusatz}</span>}
        {children}
      </dd>
    </div>
  );
}

/** Öffnet die Navigation des Geräts (Apple Karten auf iOS, sonst Google Maps). */
function navigationsLink(p: Punkt): string {
  const ziel = `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
  if (typeof navigator !== "undefined" && /iPhone|iPad|Macintosh/.test(navigator.userAgent)) {
    return `https://maps.apple.com/?daddr=${ziel}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${ziel}`;
}
