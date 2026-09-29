"use client";

import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const buttonStyles: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
  ghost: "text-primary hover:bg-info-bg",
};

export function Button({ variant = "primary", busy, className = "", children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`btn ${buttonStyles[variant]} ${className}`}
    >
      {busy && <Spinner small />}
      {children}
    </button>
  );
}

export function Card({ title, actions, children, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 md:p-6 ${className}`}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="heading-lg">{title}</h2>}
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
      <label htmlFor={id} className="text-sm font-normal text-text-secondary">
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

const inputClass = "field";

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
      <input id={id} type="checkbox" className="mt-1 h-4 w-4 accent-primary" {...rest} />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  );
}

type Tone = "info" | "warning" | "danger" | "success";

const alertStyles: Record<Tone, string> = {
  info: "border-primary/30 bg-info-bg",
  warning: "border-warning/40 bg-warning-bg",
  danger: "border-danger/40 bg-danger-bg",
  success: "border-success/40 bg-surface-muted",
};

export function Alert({ tone = "info", title, children, live }: { tone?: Tone; title?: ReactNode; children?: ReactNode; live?: boolean }) {
  return (
    <div role={live ? "status" : undefined} className={`rounded-lg border px-4 py-3 text-sm ${alertStyles[tone]}`}>
      {title && <p className="font-medium">{title}</p>}
      {children}
    </div>
  );
}

export function Badge({ tone = "neutral", children, title }: { tone?: "neutral" | "official" | "market" | "forecast" | "warning" | "danger" | "success"; children: ReactNode; title?: string }) {
  const styles = {
    neutral: "border-border bg-surface-muted text-text-muted",
    official: "border-transparent bg-primary-subdued/60 text-primary-deep dark:text-primary",
    market: "border-market/40 bg-market/10 text-market",
    forecast: "border-forecast/60 bg-forecast/10 text-forecast border-dashed",
    warning: "border-warning/40 bg-warning-bg text-warning",
    danger: "border-danger/40 bg-danger-bg text-danger",
    success: "border-success/40 bg-success/10 text-success",
  }[tone];
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-normal normal-case tracking-normal ${styles}`}>
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
              <th key={i} scope="col" className="px-3 py-2 text-xs font-normal text-text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyLabel ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-6 text-center text-text-muted">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-b-0 hover:bg-surface-muted">
                {r.map((c, j) => (
                  <td key={j} className="num px-3 py-2.5 align-top">
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
