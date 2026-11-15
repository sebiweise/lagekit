"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloudOff, HardDrive, RefreshCw, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestPersistentStorage, type PersistenzStatus } from "../storage";
import { usePwaZustand, type OfflineStatus } from "../update";
import { APP_COMMIT, APP_VERSION } from "@/core/version";
import { t } from "@/i18n";
import { useOnline } from "./use-online";

/**
 * Zeigt, ob die App offline bereit ist, ob dauerhafter Speicher gewährt wurde,
 * die installierte Version und ein wartendes Update. Updates werden nur nach
 * Klick aktiviert, nie automatisch, und erst nach Ansicht der Änderungen.
 */
export function PwaStatus() {
  const online = useOnline();
  const pwa = usePwaZustand();
  const [persistenz, setPersistenz] = useState<PersistenzStatus | null>(null);

  useEffect(() => {
    let aktiv = true;
    void requestPersistentStorage().then((status) => {
      if (aktiv) setPersistenz(status);
    });
    return () => {
      aktiv = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.status.titel}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <OfflineBadge status={pwa.offline} />
          {online ? (
            <Badge variant="secondary">
              <Wifi /> {t.status.netzOnline}
            </Badge>
          ) : (
            <Badge variant="warn">
              <WifiOff /> {t.status.netzOffline}
            </Badge>
          )}
          <Link href="/aenderungen/" title={t.aenderungen.link}>
            <Badge variant="outline" data-testid="app-version" className="hover:bg-accent">
              {t.status.version} {APP_VERSION} ({APP_COMMIT})
            </Badge>
          </Link>
        </div>

        {persistenz && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <HardDrive className="mt-0.5 size-4 shrink-0" />
            {persistenz === "gewaehrt"
              ? t.status.speicherGewaehrt
              : persistenz === "abgelehnt"
                ? t.status.speicherAbgelehnt
                : t.status.speicherNichtUnterstuetzt}
          </p>
        )}

        {pwa.updateWartet && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warn bg-warn/10 p-3"
          >
            <div>
              <p className="font-medium">
                {pwa.neueVersion
                  ? t.aenderungen.neueVersionTitel(pwa.neueVersion.version)
                  : t.status.updateVerfuegbar}
              </p>
              <p className="text-sm text-muted-foreground">{t.status.updateHinweis}</p>
            </div>
            <Link href="/aenderungen/" className={buttonVariants({ variant: "outline" })}>
              <RefreshCw /> {t.status.updateAnsehen}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OfflineBadge({ status }: { status: OfflineStatus }) {
  switch (status) {
    case "bereit":
      return (
        <Badge variant="ok" data-testid="offline-status" data-status="bereit">
          <ShieldCheck /> {t.status.offlineBereit}
        </Badge>
      );
    case "pruefen":
      return (
        <Badge variant="secondary" data-testid="offline-status" data-status="pruefen">
          {t.status.offlineWirdVorbereitet}
        </Badge>
      );
    case "entwicklung":
      return (
        <Badge variant="outline" data-testid="offline-status" data-status="entwicklung">
          {t.status.offlineNurProduktion}
        </Badge>
      );
    default:
      return (
        <Badge variant="destructive" data-testid="offline-status" data-status="nicht-verfuegbar">
          <CloudOff /> {t.status.offlineNichtVerfuegbar}
        </Badge>
      );
  }
}
