import Link from "next/link";
import { t } from "@/i18n";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
      <h1 className="text-3xl font-bold">{t.nichtGefunden.titel}</h1>
      <p className="text-lg">{t.nichtGefunden.text}</p>
      <Link href="/" className="underline underline-offset-4">
        {t.hinweise.zurueck}
      </Link>
    </main>
  );
}
