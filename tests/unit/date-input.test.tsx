import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DateInput, dmyToIso, isoToDmy, maskDmy } from "@/components/date-input";
import { I18nProvider } from "@/lib/i18n/client";

describe("date helpers (dd/mm/yyyy ↔ ISO)", () => {
  it("parses only real calendar dates", () => {
    expect(dmyToIso("30/09/2026")).toBe("2026-09-30");
    expect(dmyToIso("1/2/2026")).toBe("2026-02-01");
    expect(dmyToIso("29/02/2028")).toBe("2028-02-29");
    expect(dmyToIso("29/02/2026")).toBeNull();
    expect(dmyToIso("31/04/2026")).toBeNull();
    expect(dmyToIso("2026-09-30")).toBeNull();
    expect(isoToDmy("2026-09-30")).toBe("30/09/2026");
    expect(isoToDmy("")).toBe("");
  });

  it("masks typing: slashes appear on their own and early separators pad", () => {
    expect(maskDmy("30092026")).toBe("30/09/2026");
    expect(maskDmy("3009")).toBe("30/09/");
    expect(maskDmy("1/2/2026")).toBe("01/02/2026");
    expect(maskDmy("30-09-2026")).toBe("30/09/2026");
    expect(maskDmy("300920261")).toBe("30/09/2026");
  });
});

function Harness({ initial = "" }: { initial?: string }) {
  const [v, setV] = useState(initial);
  return (
    <I18nProvider locale="vi">
      <label htmlFor="d">Ngày</label>
      <DateInput id="d" value={v} onChange={setV} />
      <output data-testid="iso">{v}</output>
    </I18nProvider>
  );
}

describe("DateInput", () => {
  it("accepts typed dd/mm/yyyy and reports ISO", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Ngày"), "30092026");
    expect(screen.getByLabelText("Ngày")).toHaveValue("30/09/2026");
    expect(screen.getByTestId("iso")).toHaveTextContent("2026-09-30");
  });

  it("rejects an impossible date instead of guessing", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Ngày"), "31022026");
    expect(screen.getByTestId("iso")).toHaveTextContent("");
    expect(screen.getByRole("alert")).toHaveTextContent("Ngày không hợp lệ");
  });

  it("picks from the calendar pop-up and keeps the text in sync", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-09-30" />);
    await user.click(screen.getByRole("button", { name: "Chọn ngày từ lịch" }));
    expect(screen.getByRole("dialog", { name: "Lịch chọn ngày" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "15/09/2026" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ngày")).toHaveValue("15/09/2026");
    expect(screen.getByTestId("iso")).toHaveTextContent("2026-09-15");
  });

  it("moves with the keyboard inside the calendar", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-09-30" />);
    await user.click(screen.getByRole("button", { name: "Chọn ngày từ lịch" }));
    await user.keyboard("{ArrowRight}{Enter}");
    expect(screen.getByTestId("iso")).toHaveTextContent("2026-10-01");
  });
});
