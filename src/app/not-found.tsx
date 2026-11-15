import Link from "next/link";
import { ALTE_ADRESSE_SKRIPT, APP_PFAD } from "@/core/pwa/adressen";
import { t } from "@/i18n";

/** Wird als 404.html exportiert; der Service Worker zeigt sie offline für unbekannte Adressen. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
      {/* Alte Adressen (vor `/app/`) leitet das Skript sofort in die App weiter. */}
      <script dangerouslySetInnerHTML={{ __html: ALTE_ADRESSE_SKRIPT }} />
      <h1 className="text-3xl font-bold">{t.nichtGefunden.titel}</h1>
      <p className="text-lg">{t.nichtGefunden.text}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-lg">
        <Link href={APP_PFAD} className="underline underline-offset-4">
          Zur App
        </Link>
        <Link href="/docs/" className="underline underline-offset-4">
          Dokumentation
        </Link>
        <Link href="/?ueber" className="underline underline-offset-4">
          Über Lagekit
        </Link>
      </div>
    </main>
  );
}
