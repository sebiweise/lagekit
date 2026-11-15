"use client";

// Sitzungen sind veränderliche Objekte; der React Compiler darf hier nichts zwischenspeichern.
"use no memo";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Zeigt einen Code als QR-Code, dazu Kopieren und Speichern als Datei für Geräte ohne Kamera. */
export function QrAnzeige({ code, dateiname, testId }: { code: string; dateiname: string; testId?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => {
    let aktiv = true;
    void QRCode.toString(code, { type: "svg", errorCorrectionLevel: "L", margin: 2 }).then((s) => aktiv && setSvg(s));
    return () => {
      aktiv = false;
    };
  }, [code]);

  function speichern() {
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = dateiname;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-full max-w-72 rounded-md bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
        role="img"
        aria-label="QR-Code"
        // Von der QR-Bibliothek erzeugtes SVG, enthält nur Pfade.
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      <Textarea
        readOnly
        value={code}
        data-testid={testId}
        aria-label="Code als Text"
        className="h-20 min-h-0 resize-none bg-muted p-2 font-mono text-xs break-all"
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void navigator.clipboard.writeText(code).then(() => {
              setKopiert(true);
              setTimeout(() => setKopiert(false), 2000);
            })
          }
        >
          <Copy /> {kopiert ? "Kopiert" : "Kopieren"}
        </Button>
        <Button type="button" variant="outline" onClick={speichern}>
          <Download /> Als Datei speichern
        </Button>
      </div>
    </div>
  );
}
