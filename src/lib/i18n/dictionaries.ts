import vi from "./dictionaries/vi.json";
import en from "./dictionaries/en.json";
import type { Locale } from "./config";

export type Dictionary = typeof vi;

// Both dictionaries are small; the EN file is type-checked against VI so a missing key fails the build.
const dictionaries: Record<Locale, Dictionary> = { vi, en: en satisfies Dictionary };

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];

/** Looks up "section.key" paths; falls back to the key itself so a missing translation is visible, never blank. */
export function translate(dict: Dictionary, path: string, fallback?: string): string {
  const value = path.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), dict);
  return typeof value === "string" ? value : (fallback ?? path);
}
