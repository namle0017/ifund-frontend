"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "@/lib/i18n/client";

/** "yyyy-mm-dd" → "dd/mm/yyyy" (display/typing format everywhere, both locales). */
export function isoToDmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** "dd/mm/yyyy" (d/m/yyyy accepted) → "yyyy-mm-dd", or null when it is not a real calendar date. */
export function dmyToIso(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) {
    return null;
  }

  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (y < 1900 || date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    return null;
  }

  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Typing mask: digits fill dd → mm → yyyy and the "/" appears on its own; typing a separator early pads the part
 * ("1/" → "01/"). Deleting is left alone so the caret never fights the user.
 */
export function maskDmy(raw: string): string {
  const parts = ["", "", ""];
  let idx = 0;
  for (const ch of raw) {
    if (/\d/.test(ch)) {
      if (idx < 2 && parts[idx].length === 2) {
        idx++;
      }

      if (parts[idx].length < (idx === 2 ? 4 : 2)) {
        parts[idx] += ch;
      }

      if (idx < 2 && parts[idx].length === 2) {
        idx++;
      }
    } else if (/[/.\-\s]/.test(ch) && idx < 2 && parts[idx].length > 0) {
      parts[idx] = parts[idx].padStart(2, "0");
      idx++;
    }
  }

  return parts[0] + (idx >= 1 ? `/${parts[1]}` : "") + (idx >= 2 ? `/${parts[2]}` : "");
}

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
};
const addDays = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return toIso(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
};

interface DateInputProps {
  id?: string;
  /** ISO "yyyy-mm-dd" or "" when empty/invalid. */
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  "aria-describedby"?: string;
}

/**
 * Date field used for every date the user enters: type dd/mm/yyyy directly or pick from the calendar pop-up —
 * both stay in sync. The parent only ever sees a valid ISO date or "".
 */
export function DateInput({ id, value, onChange, required, disabled, min, max, "aria-describedby": describedBy }: DateInputProps) {
  const { t, locale } = useI18n();
  const autoId = useId();
  const inputId = id ?? autoId;
  const popupId = `${inputId}-calendar`;
  const [text, setText] = useState(() => isoToDmy(value));
  const [prevValue, setPrevValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Adopt a value set from outside (e.g. a default or a calculated date) unless the text already means it.
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== (dmyToIso(text) ?? "")) {
      setText(isoToDmy(value));
      setInvalid(false);
    }
  }

  const outOfRange = (iso: string) => (!!min && iso < min) || (!!max && iso > max);

  const commitText = (next: string) => {
    setText(next);
    const iso = dmyToIso(next);
    const bad = next.length > 0 && (iso === null || outOfRange(iso));
    setInvalid(bad && next.length >= 10);
    input.current?.setCustomValidity(bad && next.length > 0 ? t("dateInput.invalid") : "");
    const nextValue = iso && !outOfRange(iso) ? iso : "";
    setPrevValue(nextValue);
    if (nextValue !== value) {
      onChange(nextValue);
    }
  };

  const pick = (iso: string) => {
    commitText(isoToDmy(iso));
    setOpen(false);
    input.current?.focus();
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const onDown = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <div className="flex">
        <input
          ref={input}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t("dateInput.placeholder")}
          maxLength={10}
          required={required}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            const deleting = (e.nativeEvent as InputEvent).inputType?.startsWith("delete");
            commitText(deleting ? raw.replace(/[^\d/]/g, "") : maskDmy(raw));
          }}
          onBlur={() => {
            // Normalise "1/2/2026" to "01/02/2026" once the user leaves the field.
            const iso = dmyToIso(text);
            if (iso) {
              setText(isoToDmy(iso));
            } else if (text) {
              setInvalid(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && e.altKey) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className={`field min-w-0 flex-1 rounded-r-none ${invalid ? "border-danger" : ""}`}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={t("dateInput.openCalendar")}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={popupId}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-10 w-11 shrink-0 items-center justify-center rounded-r-md border border-l-0 border-border-input bg-surface text-text-secondary hover:bg-surface-muted hover:text-primary disabled:opacity-50"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
            <path d="M3 8.5h14M7 3v3M13 3v3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {invalid && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {t("dateInput.invalid")}
        </p>
      )}
      {open && <CalendarPopup id={popupId} selected={dmyToIso(text) ?? ""} locale={locale} min={min} max={max} onPick={pick} onClose={() => (setOpen(false), input.current?.focus())} t={t} />}
    </div>
  );
}

function CalendarPopup({
  id,
  selected,
  locale,
  min,
  max,
  onPick,
  onClose,
  t,
}: {
  id: string;
  selected: string;
  locale: "vi" | "en";
  min?: string;
  max?: string;
  onPick: (iso: string) => void;
  onClose: () => void;
  t: (k: string) => string;
}) {
  const today = todayIso();
  const [focus, setFocus] = useState(selected || today);
  const [year, month] = focus.split("-").map(Number);
  const grid = useRef<HTMLDivElement>(null);
  const disabled = (iso: string) => (!!min && iso < min) || (!!max && iso > max);

  useEffect(() => {
    grid.current?.querySelector<HTMLButtonElement>(`[data-iso="${focus}"]`)?.focus();
  }, [focus]);

  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first weeks
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => toIso(year, month - 1, i + 1))];
  while (cells.length % 7) {
    cells.push(null);
  }

  const monthName = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { month: "long", timeZone: "UTC" }).format(first);
  const weekdays = locale === "vi" ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const shiftMonth = (delta: number) => {
    const target = new Date(Date.UTC(year, month - 1 + delta, 1));
    const dim = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    const day = Math.min(Number(focus.slice(8, 10)), dim);
    setFocus(toIso(target.getUTCFullYear(), target.getUTCMonth(), day));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in moves) {
      e.preventDefault();
      setFocus(addDays(focus, moves[e.key]));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      shiftMonth((e.key === "PageUp" ? -1 : 1) * (e.shiftKey ? 12 : 1));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const dow = (new Date(`${focus}T00:00:00Z`).getUTCDay() + 6) % 7;
      setFocus(addDays(focus, e.key === "Home" ? -dow : 6 - dow));
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const years = Array.from({ length: 121 }, (_, i) => new Date().getFullYear() + 10 - i);

  return (
    <div id={id} role="dialog" aria-label={t("dateInput.calendar")} onKeyDown={onKey} className="absolute left-0 top-full z-40 mt-2 w-[19rem] rounded-xl border border-border bg-surface-raised p-3 text-text shadow-float">
      <div className="mb-2 flex items-center justify-between gap-1">
        <button type="button" onClick={() => shiftMonth(-1)} aria-label={t("dateInput.prevMonth")} className="flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-surface-muted">
          ‹
        </button>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium capitalize">{monthName}</span>
          <label className="sr-only" htmlFor={`${id}-year`}>
            {t("dateInput.year")}
          </label>
          <select id={`${id}-year`} value={year} onChange={(e) => setFocus(`${e.target.value}${focus.slice(4, 8)}${pad(Math.min(Number(focus.slice(8, 10)), new Date(Date.UTC(Number(e.target.value), month, 0)).getUTCDate()))}`)} className="rounded-md border border-border bg-surface px-1 py-0.5 text-sm">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => shiftMonth(1)} aria-label={t("dateInput.nextMonth")} className="flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-surface-muted">
          ›
        </button>
      </div>
      <div ref={grid}>
        <table className="w-full border-collapse text-center text-sm">
          <thead>
            <tr>
              {weekdays.map((w) => (
                <th key={w} scope="col" className="pb-1 text-xs font-normal text-text-muted">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cells.length / 7 }, (_, r) => (
              <tr key={r}>
                {cells.slice(r * 7, r * 7 + 7).map((iso, c) => (
                  <td key={c} className="p-0.5">
                    {iso && (
                      <button
                        type="button"
                        data-iso={iso}
                        tabIndex={iso === focus ? 0 : -1}
                        disabled={disabled(iso)}
                        aria-pressed={iso === selected}
                        aria-label={isoToDmy(iso)}
                        aria-current={iso === today ? "date" : undefined}
                        onClick={() => onPick(iso)}
                        className={`num h-9 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                          iso === selected ? "bg-primary text-primary-contrast" : iso === today ? "border border-primary text-primary hover:bg-info-bg" : "hover:bg-surface-muted"
                        }`}
                      >
                        {Number(iso.slice(8, 10))}
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
        <button type="button" disabled={disabled(today)} onClick={() => onPick(today)} className="rounded-full px-3 py-1 text-primary hover:bg-info-bg disabled:opacity-40">
          {t("dateInput.today")}
        </button>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-text-secondary hover:bg-surface-muted">
          {t("dateInput.close")}
        </button>
      </div>
    </div>
  );
}
