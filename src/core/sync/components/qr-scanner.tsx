"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

interface BarcodeDetectorLike {
  detect(quelle: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

/** Liest einen QR-Code über die Kamera. Nutzt BarcodeDetector, sonst jsQR (z. B. auf dem iPhone). */
export function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    let strom: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let aktiv = true;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const Detector = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike })
      .BarcodeDetector;
    const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;

    async function lesen() {
      const v = video.current;
      if (!aktiv || !v) return;
      if (v.readyState >= 2 && v.videoWidth > 0) {
        try {
          let wert: string | undefined;
          if (detector) {
            wert = (await detector.detect(v))[0]?.rawValue;
          } else if (ctx) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            wert = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data;
          }
          if (wert && aktiv) {
            aktiv = false;
            onCode(wert);
            return;
          }
        } catch {
          // Einzelbild nicht lesbar: nächstes versuchen.
        }
      }
      timer = setTimeout(() => void lesen(), 200);
    }

    const medien: Promise<MediaStream> = navigator.mediaDevices
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      : Promise.reject(new Error("keine Kamera"));
    medien
      .then((s) => {
        strom = s;
        if (!aktiv || !video.current) return;
        video.current.srcObject = s;
        void video.current.play();
        void lesen();
      })
      .catch(() => setFehler("Kamera nicht verfügbar. Code bitte einfügen oder als Datei öffnen."));

    return () => {
      aktiv = false;
      clearTimeout(timer);
      strom?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  return fehler ? (
    <p role="alert" className="text-sm text-destructive">
      {fehler}
    </p>
  ) : (
    <video ref={video} muted playsInline className="aspect-square w-full max-w-72 rounded-md bg-black object-cover" />
  );
}
