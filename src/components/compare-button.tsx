"use client";

import { useState } from "react";
import { addToCompare, removeFromCompare, useCompareIds, MAX_COMPARE } from "@/lib/compare-store";
import { useI18n } from "@/lib/i18n/client";

export function CompareButton({ fundId }: { fundId: string }) {
  const { t } = useI18n();
  const ids = useCompareIds();
  const [full, setFull] = useState(false);
  const selected = ids.includes(fundId);
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        aria-pressed={selected}
        className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
        onClick={() => {
          if (selected) {
            removeFromCompare(fundId);
            setFull(false);
          } else {
            setFull(!addToCompare(fundId));
          }
        }}
      >
        {selected ? `✓ ${t("funds.inCompare")}` : t("funds.addCompare")} ({ids.length}/{MAX_COMPARE})
      </button>
      {full && (
        <span role="alert" className="text-xs text-danger">
          {t("funds.compareLimit")}
        </span>
      )}
    </span>
  );
}
