"use client";

import { useSyncExternalStore } from "react";

/** Comparison basket (max 5, AC-FUND-001). Kept in sessionStorage — public fund ids only, no personal data. */
export const MAX_COMPARE = 5;
const KEY = "ifund.compare";
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) {
    return cache;
  }

  try {
    cache = JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    cache = [];
  }

  return cache;
}

function write(ids: string[]) {
  cache = ids;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // storage unavailable (private mode): keep in memory only
  }

  listeners.forEach((l) => l());
}

/** Returns false when the basket is full, so the UI can explain the limit without dropping existing picks (NAV-01). */
export function addToCompare(id: string): boolean {
  const ids = read();
  if (ids.includes(id)) {
    return true;
  }

  if (ids.length >= MAX_COMPARE) {
    return false;
  }

  write([...ids, id]);
  return true;
}

export const removeFromCompare = (id: string) => write(read().filter((x) => x !== id));
export const clearCompare = () => write([]);

const EMPTY: string[] = [];

export function useCompareIds(): string[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => EMPTY,
  );
}
