import { z } from "zod";
import { einsatzSchema } from "@/core/einsatz/schema";
import { kompaktSchema } from "./verbindungscode";

/** Version des Sitzungsprotokolls; Geräte mit anderer Version werden abgewiesen. */
export const PROTOKOLL_VERSION = 2;

/** Präfixe der Verbindungscodes. */
export const PRAEFIX_ANFRAGE = "LKA1";
export const PRAEFIX_ANTWORT = "LKB1";

export const teilnehmerSchema = z.object({
  /** Zufällige Kennung des Geräts, bleibt auf dem Gerät gespeichert. */
  geraetId: z.uuid(),
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(60, "Höchstens 60 Zeichen."),
  funktion: z.string().trim().max(60, "Höchstens 60 Zeichen.").default(""),
  fahrzeug: z.string().trim().max(60, "Höchstens 60 Zeichen.").default(""),
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
  /**
   * Gast → Host direkt nach dem Verbinden, mit den Änderungen, die das Gerät
   * während einer Trennung gemacht hat.
   */
  z.object({
    typ: z.literal("hallo"),
    geraetId: z.uuid(),
    ausstehend: z.object({ einsatzId: z.uuid(), liste: z.array(aenderungSchema) }).nullable().default(null),
  }),
  /** Host → Gast: vollständiger Stand des Einsatzes. */
  z.object({
    typ: z.literal("stand"),
    einsatz: einsatzSchema,
    tabellen: z.record(z.string(), z.array(zeileSchema)),
  }),
  /** In beide Richtungen: einzelne Änderungen. */
  z.object({ typ: z.literal("aenderungen"), liste: z.array(aenderungSchema) }),
  /**
   * Host → Gast: Die nächsten `anzahl` Änderungen des Gasts sind verarbeitet. Erst dann
   * entfernt der Gast sie aus seinem Ausgang; was unterwegs verloren geht, schickt er beim
   * nächsten Verbinden erneut.
   */
  z.object({ typ: z.literal("quittung"), anzahl: z.number().int().min(0) }),
  /** Host → Gäste: wer gerade verbunden ist. */
  z.object({ typ: z.literal("teilnehmer"), liste: z.array(teilnehmerSchema) }),
  /** In beide Richtungen alle paar Sekunden, damit ein Abriss schnell auffällt. */
  z.object({ typ: z.literal("ping") }),
  /** Host → Gast: Verbindung wird beendet. */
  z.object({ typ: z.literal("ende"), grund: z.string() }),
]);
export type Nachricht = z.infer<typeof nachrichtSchema>;
