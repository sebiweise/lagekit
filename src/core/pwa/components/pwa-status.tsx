"use client";

import { useEffect, useState } from "react";
import { CloudOff, HardDrive, RefreshCw, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activateWaitingWorker, registerServiceWorker, serviceWorkerSupported } from "../register";
import { requestPersistentStorage, type PersistenzStatus } from "../storage";
import { APP_COMMIT, APP_VERSION } from "@/core/version";
import { t } from "@/i18n";
import { useOnline } from "./use-online";

type OfflineStatus = "pruefen" | "bereit" | "nicht-verfuegbar" | "entwicklung";

/**
 * Zeigt, ob die App offline bereit ist, ob dauerhafter Speicher gewährt wurde,
 * die installierte Version und ein wartendes Update. Updates werden nur nach
 * Klick aktiviert, nie automatisch.
 */
export function PwaStatus() {
  const online = useOnline();
  const [offline, setOffline] = useState<OfflineStatus>("pruefen");
  const [persistenz, setPersistenz] = useState<PersistenzStatus | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateWartet, setUpdateWartet] = useState(false);

  useEffect(() => {
    let aktiv = true;

    void requestPersistentStorage().then((status) => {
      if (aktiv) setPersistenz(status);
    });

    if (!serviceWorkerSupported()) {
      queueMicrotask(() => aktiv && setOffline("nicht-verfuegbar"));
      return () => {
        aktiv = false;
      };
    }
    if (process.env.NODE_ENV !== "production") {
      queueMicrotask(() => aktiv && setOffline("entwicklung"));
      return () => {
        aktiv = false;
      };
    }

    const pruefeWartend = (reg: ServiceWorkerRegistration) => {
      // Nur ein Update, wenn bereits eine Version die Seite steuert.
      if (aktiv) setUpdateWartet(Boolean(reg.waiting && navigator.serviceWorker.controller));
    };

    registerServiceWorker()
      .then((reg) => {
        if (!reg || !aktiv) return;
        setRegistration(reg);
        pruefeWartend(reg);
        reg.addEventListener("updatefound", () => {
          const neu = reg.installing;
          neu?.addEventListener("statechange", () => {
            if (neu.state === "installed") pruefeWartend(reg);
          });
        });
        return navigator.serviceWorker.ready;
      })
      .then((reg) => {
        if (reg && aktiv) setOffline("bereit");
      })
      .catch(() => {
        if (aktiv) setOffline("nicht-verfuegbar");
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
          <OfflineBadge status={offline} />
          {online ? (
            <Badge variant="secondary">
              <Wifi /> {t.status.netzOnline}
            </Badge>
          ) : (
            <Badge variant="warn">
              <WifiOff /> {t.status.netzOffline}
            </Badge>
          )}
          <Badge variant="outline" data-testid="app-version">
            {t.status.version} {APP_VERSION} ({APP_COMMIT})
          </Badge>
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

        {updateWartet && registration && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warn bg-warn/10 p-3"
          >
            <div>
              <p className="font-medium">{t.status.updateVerfuegbar}</p>
              <p className="text-sm text-muted-foreground">{t.status.updateHinweis}</p>
            </div>
            <Button variant="outline" onClick={() => activateWaitingWorker(registration)}>
              <RefreshCw /> {t.status.updateAktivieren}
            </Button>
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
