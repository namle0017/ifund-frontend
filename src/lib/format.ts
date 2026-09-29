import type { Locale } from "./i18n/config";

/**
 * Display formatting only. All rounding decisions are made by the BE (doc 14 §2, AGENTS: FE never invents NAV/fees);
 * values arrive as decimal strings and are grouped here without converting through binary floating point.
 */
const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;

export function formatDecimal(value: string | null | undefined, locale: Locale, opts: { fractionDigits?: number; trimZeros?: boolean } = {}): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const m = DECIMAL.exec(value.trim());
  if (!m) {
    return value;
  }

  const [, sign, int, frac = ""] = m;
  const groupSep = locale === "vi" ? "." : ",";
  const decimalSep = locale === "vi" ? "," : ".";
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
  let fraction = frac;
  if (opts.fractionDigits !== undefined) {
    // Pad or cut for display width only; never used to round an amount (BE already sent the rounded value).
    fraction = fraction.padEnd(opts.fractionDigits, "0").slice(0, opts.fractionDigits);
  }

  if (opts.trimZeros) {
    fraction = fraction.replace(/0+$/, "");
  }

  return `${sign}${grouped}${fraction ? decimalSep + fraction : ""}`;
}

/** VND: BE supplies đồng-rounded display amounts (A3). */
export const formatVnd = (value: string | null | undefined, locale: Locale) => (value == null ? "—" : `${formatDecimal(value, locale)} ₫`);

/** NAV and units are shown with 2 decimals (BR-004/005). */
export const formatNav = (value: string | null | undefined, locale: Locale) => formatDecimal(value, locale, { fractionDigits: 2 });
export const formatUnits = (value: string | null | undefined, locale: Locale) => formatDecimal(value, locale, { fractionDigits: 2 });

/** Moves the decimal point of a decimal string by `places` (positive = right) without floating point. */
export function shiftDecimal(value: string, places: number): string | null {
  const m = DECIMAL.exec(value.trim());
  if (!m) {
    return null;
  }

  const [, sign, int, frac = ""] = m;
  let digits = int + frac;
  let point = int.length + places;
  if (point < 0) {
    digits = "0".repeat(-point) + digits;
    point = 0;
  }

  digits = digits.padEnd(point, "0");
  const newInt = digits.slice(0, point).replace(/^0+(?=\d)/, "") || "0";
  const newFrac = digits.slice(point).replace(/0+$/, "");
  return `${sign}${newInt}${newFrac ? "." + newFrac : ""}`;
}

/** Ratio string (e.g. "0.0345") → "3,45 %" (display only; truncates extra digits, BE rounds ratios to 8 places). */
export function formatRatioPercent(value: string | null | undefined, locale: Locale, digits = 2): string {
  if (value == null) {
    return "—";
  }

  const shifted = shiftDecimal(value, 2);
  return shifted === null ? value : `${formatDecimal(shifted, locale, { fractionDigits: digits })} %`;
}

export function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) {
    return "—";
  }

  const [y, m, d] = value.slice(0, 10).split("-");
  return locale === "vi" ? `${d}/${m}/${y}` : `${y}-${m}-${d}`;
}

/** Timestamps are shown in the product time zone with an explicit label (SRS §1.2). */
export function formatDateTime(value: string | null | undefined, locale: Locale): string {
  if (!value) {
    return "—";
  }

  // Always a 4-digit year and 24h hh:mm in Vietnam time (dateStyle "short" renders a 2-digit year in vi-VN).
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Ho_Chi_Minh" })
      .formatToParts(new Date(value))
      .map((p) => [p.type, p.value]),
  );
  const date = locale === "vi" ? `${parts.day}/${parts.month}/${parts.year}` : `${parts.year}-${parts.month}-${parts.day}`;
  return `${parts.hour}:${parts.minute} ${date} (GMT+7)`;
}

/** Percent input "0.15" (%) → ratio string "0.0015" using string arithmetic. */
export function percentToRatio(percent: string): string | null {
  return shiftDecimal(percent.trim().replace(",", "."), -2);
}

/** Normalises a user-typed amount ("10.000.000" or "10,000,000") into a plain decimal string for the API. */
export function parseAmountInput(input: string, locale: Locale): string | null {
  const trimmed = input.trim().replace(/\s|₫/g, "");
  const normalized = locale === "vi" ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed.replace(/,/g, "");
  return DECIMAL.test(normalized) ? normalized : null;
}

/** Exact sum of decimal strings (BigInt scaled), for presenting totals of BE-provided lines. */
export function sumDecimals(values: (string | null | undefined)[]): string {
  const parsed = values.filter((v): v is string => !!v && DECIMAL.test(v.trim())).map((v) => DECIMAL.exec(v.trim())!);
  const scale = Math.max(0, ...parsed.map((m) => (m[3] ?? "").length));
  let total = BigInt(0);
  for (const [, sign, int, frac = ""] of parsed) {
    const n = BigInt(int + frac.padEnd(scale, "0"));
    total += sign === "-" ? -n : n;
  }

  const negative = total < BigInt(0);
  const digits = (negative ? -total : total).toString().padStart(scale + 1, "0");
  const intPart = digits.slice(0, digits.length - scale);
  const fracPart = scale ? digits.slice(-scale).replace(/0+$/, "") : "";
  return `${negative ? "-" : ""}${intPart}${fracPart ? "." + fracPart : ""}`;
}
