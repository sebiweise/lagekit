"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Öffnet den Druckdialog; dort lässt sich auch „Als PDF sichern“ wählen. */
export function DruckenKnopf({ text = "Drucken oder als PDF speichern" }: { text?: string }) {
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <Printer /> {text}
    </Button>
  );
}
