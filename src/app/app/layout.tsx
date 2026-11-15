import { AppHeader } from "@/components/layout/app-header";
import { Seitenleiste } from "@/components/layout/seitenleiste";
import { UntereLeiste } from "@/components/layout/untere-leiste";
import { Benachrichtigungen } from "@/core/benachrichtigungen/components/benachrichtigungen";
import { DateiVorschau } from "@/core/dateien/components/datei-vorschau";
import { OrdnerHinweis } from "@/core/dateien/components/ordner-hinweis";
import { AppGenutzt } from "@/core/pwa/components/app-genutzt";
import { UpdateHinweis } from "@/core/pwa/components/update-hinweis";
import { SitzungHinweis } from "@/core/sync/components/sitzung-hinweis";

/** Die App unter `/app/`: Kopfzeile, Navigation, Hinweise und Benachrichtigungen. */
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    // Unten Platz für die feste Navigationsleiste auf Handy und Tablet.
    <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 print:pb-0">
      <AppHeader />
      <div className="flex flex-1">
        <Seitenleiste />
        <div className="flex min-w-0 flex-1 flex-col">
          <UpdateHinweis />
          <SitzungHinweis />
          <OrdnerHinweis />
          {children}
        </div>
      </div>
      <UntereLeiste />
      <DateiVorschau />
      <Benachrichtigungen />
      <AppGenutzt />
    </div>
  );
}
