import { z } from "zod";
import { einsatzSchema } from "@/core/einsatz/schema";
import { kompaktSchema } from "./verbindungscode";

/** Version des Sitzungsprotokolls; Geräte mit anderer Version werden abgewiesen. */
export const PROTOKOLL_VERSION = 1;

/** Präfixe der Verbindungscodes. */
export const PRAEFIX_ANFRAGE = "LKA1";
export const PRAEFIX_ANTWORT = "LKB1";

export const teilnehmerSchema = z.object({
  /** Zufällige Kennung des Geräts, bleibt auf dem Gerät gespeichert. */
  geraetId: z.uuid(),
  name: z.string().trim().min(1, "Name fehlt").max(60),
  funktion: z.string().trim().max(60).default(""),
  fahrzeug: z.string().trim().max(60).default(""),
  /** Kurzbeschreibung des Geräts, z. B. „iPhone · Safari“. */
  geraet: z.string().trim().max(80).default(""),
});
export type Teilnehmer = z.infer<typeof teilnehmerSchema>;

/** Inhalt des Beitrittscodes, den ein Gerät dem Host zeigt. */
export const anfrageSchema = z.object({
  v: z.literal(PROTOKOLL_VERSION),
  t: teilnehmerSchema,
  s: kompaktSchema,
});
export type Anfrage = z.infer<typeof anfrageSchema>;

/** Inhalt des Antwortcodes des Hosts. */
export const antwortSchema = z.object({
  v: z.literal(PROTOKOLL_VERSION),
  s: kompaktSchema,
});
export type Antwort = z.infer<typeof antwortSchema>;

const zeileSchema = z.looseObject({ id: z.string(), einsatzId: z.string() });

export const aenderungSchema = z.discriminatedUnion("art", [
  z.object({ art: z.literal("put"), tabelle: z.string(), zeile: z.looseObject({ id: z.string() }) }),
  z.object({ art: z.literal("loeschen"), tabelle: z.string(), id: z.string() }),
]);
export type Aenderung = z.infer<typeof aenderungSchema>;

export const nachrichtSchema = z.discriminatedUnion("typ", [
  /** Gast → Host direkt nach dem Verbinden. */
  z.object({ typ: z.literal("hallo"), geraetId: z.uuid() }),
  /** Host → Gast: vollständiger Stand des Einsatzes. */
  z.object({
    typ: z.literal("stand"),
    einsatz: einsatzSchema,
    tabellen: z.record(z.string(), z.array(zeileSchema)),
  }),
  /** In beide Richtungen: einzelne Änderungen. */
  z.object({ typ: z.literal("aenderungen"), liste: z.array(aenderungSchema) }),
  /** Host → Gäste: wer gerade verbunden ist. */
  z.object({ typ: z.literal("teilnehmer"), liste: z.array(teilnehmerSchema) }),
  /** Host → Gast: Verbindung wird beendet. */
  z.object({ typ: z.literal("ende"), grund: z.string() }),
]);
export type Nachricht = z.infer<typeof nachrichtSchema>;
