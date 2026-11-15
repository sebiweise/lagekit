"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { Toast } from "@base-ui/react/toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Einblendungen am Bildschirmrand nach shadcn/ui „Toast“ (Base-UI-Variante).
 * Base UI liefert Live-Region (Screenreader), F6 zum Anspringen, Wischen zum
 * Schließen und Pausieren bei Hover oder Fokus. Alles ist im eigenen Bundle,
 * es wird nichts aus dem Netz nachgeladen.
 */

export interface ToastDaten {
  icon?: LucideIcon;
  /** Ziel in der App; als Link unter dem Text. */
  href?: string;
  linkText?: string;
}

/** Fügt Einblendungen hinzu, auch außerhalb von React. */
export const toast = Toast.createToastManager<ToastDaten>();

/**
 * Bereich für die Einblendungen; einmal im Layout. Am PC unten rechts, auf Handy
 * und Tablet über der unteren Navigationsleiste.
 * `pfad`: aktuelle Seite; ein Link auf genau diese Seite wird weggelassen.
 */
export function Toaster({ pfad, limit = 3 }: { pfad?: string; limit?: number }) {
  return (
    <Toast.Provider toastManager={toast} limit={limit}>
      <Toast.Portal>
        <Toast.Viewport
          aria-label="Benachrichtigungen"
          className="toast-viewport fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-50 mx-auto w-auto max-w-sm outline-none sm:left-auto sm:w-96 lg:right-6 lg:bottom-6 print:hidden"
        >
          <ToastListe pfad={pfad} />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastListe({ pfad }: { pfad?: string }) {
  const { toasts } = Toast.useToastManager<ToastDaten>();
  return toasts.map((t) => {
    const Icon = t.data?.icon;
    const href = t.data?.href && t.data.href !== pfad ? t.data.href : undefined;
    return (
      <Toast.Root
        key={t.id}
        toast={t}
        swipeDirection={["right", "down"]}
        className={cn(
          "toast-root rounded-lg border bg-popover text-popover-foreground shadow-lg",
          t.type === "wichtig" && "border-2 border-warn",
        )}
        data-testid="toast"
      >
        <Toast.Content className="toast-content flex items-start gap-3 py-3 pr-2 pl-4">
          {Icon && <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Toast.Title className="text-base leading-snug font-semibold" />
            <Toast.Description className="text-sm break-words text-muted-foreground" />
            {href && (
              <Link
                href={href}
                onClick={() => toast.close(t.id)}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1 h-9 self-start px-3")}
              >
                {t.data?.linkText ?? "Öffnen"}
              </Link>
            )}
          </div>
          <Toast.Close
            aria-label="Schließen"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "-mt-1 size-10 shrink-0")}
          >
            <X />
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    );
  });
}
