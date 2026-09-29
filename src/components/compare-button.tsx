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
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        aria-pressed={selected}
        className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${selected ? "border-primary bg-info-bg text-primary" : "border-border-input text-text-secondary hover:border-primary hover:text-primary"}`}
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
