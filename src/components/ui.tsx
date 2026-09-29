"use client";

import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const buttonStyles: Record<Variant, string> = {
  primary: "bg-primary text-primary-contrast hover:opacity-90",
  secondary: "border border-border bg-surface-raised text-text hover:bg-surface-muted",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-primary hover:underline",
};

export function Button({ variant = "primary", busy, className = "", children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant]} ${className}`}
    >
      {busy && <Spinner small />}
      {children}
    </button>
  );
}

export function Card({ title, actions, children, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-surface-raised p-4 shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/** Accessible label + hint + error wiring (14 §3: labelled inputs, errors attached to fields). */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id, describedBy)}
      {hint && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = "min-h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text";

export function TextInput({ invalid, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...rest} aria-invalid={invalid || undefined} className={`${inputClass} ${invalid ? "border-danger" : ""} ${className}`} />;
}

export function SelectInput({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${inputClass} ${className}`}>
      {children}
    </select>
  );
}

export function Checkbox({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2">
      <input id={id} type="checkbox" className="mt-1 h-4 w-4" {...rest} />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  );
}

type Tone = "info" | "warning" | "danger" | "success";

const alertStyles: Record<Tone, string> = {
  info: "border-primary/40 bg-info-bg",
  warning: "border-warning/50 bg-warning-bg",
  danger: "border-danger/50 bg-danger-bg",
  success: "border-success/50 bg-surface-muted",
};

export function Alert({ tone = "info", title, children, live }: { tone?: Tone; title?: ReactNode; children?: ReactNode; live?: boolean }) {
  return (
    <div role={live ? "status" : undefined} className={`rounded-md border px-3 py-2 text-sm ${alertStyles[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children}
    </div>
  );
}

export function Badge({ tone = "neutral", children, title }: { tone?: "neutral" | "official" | "market" | "forecast" | "warning" | "danger" | "success"; children: ReactNode; title?: string }) {
  const styles = {
    neutral: "border-border text-text-muted",
    official: "border-primary text-primary",
    market: "border-market text-market",
    forecast: "border-forecast text-forecast border-dashed",
    warning: "border-warning text-warning",
    danger: "border-danger text-danger",
    success: "border-success text-success",
  }[tone];
  return (
    <span title={title} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
}

export function Spinner({ small }: { small?: boolean }) {
  return <span aria-hidden className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${small ? "h-3 w-3" : "h-5 w-5"}`} />;
}

export function Loading({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-6 text-text-muted">
      <Spinner /> {label}
    </div>
  );
}

export function DataTable({ caption, headers, rows, emptyLabel }: { caption: ReactNode; headers: ReactNode[]; rows: ReactNode[][]; emptyLabel?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-left">
            {headers.map((h, i) => (
              <th key={i} scope="col" className="px-2 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyLabel ? (
            <tr>
              <td colSpan={headers.length} className="px-2 py-4 text-center text-text-muted">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-b border-border/60">
                {r.map((c, j) => (
                  <td key={j} className="num px-2 py-2 align-top">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
