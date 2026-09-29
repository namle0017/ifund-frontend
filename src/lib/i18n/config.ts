export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "vi";

export const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

/** B1: temporary product name, not an approved brand. */
export const PRODUCT_NAME = "iFund";
