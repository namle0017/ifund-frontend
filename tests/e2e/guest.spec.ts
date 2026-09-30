import { expect, test } from "@playwright/test";
import { axeViolations, fundIdByCode } from "./helpers";

test.describe("Guest (TC-01, FL-01/02)", () => {
  test("browses funds with separate NAV and market-price labels and SYNTHETIC badges", async ({ page }) => {
    await page.goto("/vi/funds");
    await expect(page.getByRole("heading", { name: "Danh sách quỹ" })).toBeVisible();
    await expect(page.getByRole("row").getByText("Dữ liệu tổng hợp (SYNTHETIC)").first()).toBeVisible();
    const etf = page.getByRole("row").filter({ hasText: "SYN-ETF" });
    await expect(etf.getByText("Giá thị trường tại")).toBeVisible();
    await expect(etf.getByText("NAV chính thức:")).toBeVisible();
    const open = page.getByRole("row").filter({ hasText: "SYN-OPEN" });
    await expect(open.getByText("Theo NAV chính thức tại")).toBeVisible();
    await expect(open.getByRole("link", { name: "Tính giao dịch" })).toBeVisible();
  });

  test("fund table sorts by 1-year return (values come from the BE)", async ({ page }) => {
    await page.goto("/vi/funds");
    await page.getByRole("link", { name: /Sắp xếp giảm dần theo Lợi nhuận 1 năm/ }).click();
    await expect(page).toHaveURL(/sort=return1y/);
    await expect(page.getByRole("columnheader", { name: /Lợi nhuận 1 năm/ })).toHaveAttribute("aria-sort", "descending");
  });

  test("redirects paths without a locale and serves English", async ({ page }) => {
    await page.goto("/funds");
    await expect(page).toHaveURL(/\/(vi|en)\/funds/);
    await page.goto("/en/funds");
    await expect(page.getByRole("heading", { name: "Funds" })).toBeVisible();
  });

  test("open-fund buy estimate shows units, fees and milestones without saving (NAV-04)", async ({ page }) => {
    const id = await fundIdByCode(page, "SYN-OPEN");
    await page.goto(`/vi/calculator?fundId=${id}`);
    await page.getByLabel("Số tiền (VNĐ)").fill("10.000.000");
    await page.getByRole("button", { name: "Tính", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Kết quả ước tính" })).toBeVisible();
    await expect(page.getByText("Số CCQ mô phỏng")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Phí mua" })).toBeVisible();
    await expect(page.getByText("Ngày thanh toán")).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng nhập để lưu" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Đặt lệnh|Place order/ })).toHaveCount(0);
  });

  test("order time is date + 24h hour:minute only; partial input is rejected", async ({ page }) => {
    const id = await fundIdByCode(page, "SYN-OPEN");
    await page.goto(`/vi/calculator?fundId=${id}`);
    await page.getByLabel("Số tiền (VNĐ)").fill("10.000.000");
    await expect(page.locator('input[type="time"]')).toHaveCount(0);
    await expect(page.getByLabel("Giờ", { exact: true }).locator("option")).toHaveCount(25);
    await expect(page.getByLabel("Phút", { exact: true }).locator("option")).toHaveCount(61);

    await page.getByLabel("Giờ", { exact: true }).selectOption("14");
    await page.getByRole("button", { name: "Tính", exact: true }).click();
    await expect(page.getByText("Vui lòng chọn đủ ngày, giờ và phút đặt lệnh.")).toBeVisible();

    await page.getByRole("button", { name: "Chọn ngày từ lịch" }).first().click();
    await page.getByRole("dialog", { name: "Lịch chọn ngày" }).getByRole("button", { name: "Hôm nay" }).click();
    await expect(page.getByLabel("Ngày", { exact: true })).toHaveValue(/^\d{2}\/\d{2}\/\d{4}$/);
    await page.getByLabel("Ngày", { exact: true }).fill("30/09/2026");
    await page.getByLabel("Phút", { exact: true }).selectOption("30");
    await page.getByRole("button", { name: "Tính", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Kết quả ước tính" })).toBeVisible();
    await expect(page.getByText(/\d{2}:\d{2} \d{2}\/\d{2}\/2026 \(GMT\+7\)/).first()).toBeVisible();
  });

  test("ETF estimate requires a market price and never uses NAV as the trade price (NAV-02, AC-FUND-002)", async ({ page }) => {
    const id = await fundIdByCode(page, "SYN-ETF");
    await page.goto(`/vi/calculator?fundId=${id}`);
    await expect(page.getByText("ETF/quỹ đóng giao dịch trên sàn theo giá thị trường")).toBeVisible();
    await page.getByLabel("Số tiền (VNĐ) / Số CCQ").fill("10.000.000");
    await page.getByRole("button", { name: "Tính", exact: true }).click();
    await expect(page.getByText("Kết quả chưa đầy đủ")).toBeVisible();
    await expect(page.getByText("Giá thị trường", { exact: true }).first()).toBeVisible();

    await page.getByLabel("Giá thị trường giả định (VNĐ)").fill("15.000");
    await page.getByLabel("Phí môi giới giả định (%)").fill("0,15");
    await page.getByRole("button", { name: "Tính", exact: true }).click();
    await expect(page.getByText("Giá thị trường không phải NAV.")).toBeVisible();
    await expect(page.getByText("NAV tham chiếu")).toBeVisible();
  });

  test("fund sheet opens over the list with dealing schedule and verified fee tiers; Escape closes it", async ({ page }) => {
    await page.goto("/vi/funds");
    await page.getByRole("row").filter({ hasText: "SYN-OPEN" }).getByRole("link", { name: "SYN-OPEN" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /SYN-OPEN/ })).toBeVisible();
    await expect(dialog.getByText("Phiên khớp lệnh tiếp theo")).toBeVisible();
    await expect(dialog.getByText("Đặt lệnh và chuyển tiền mua")).toBeVisible();
    await expect(dialog.getByRole("table", { name: "Phí mua" })).toBeVisible();
    await expect(dialog.getByRole("table", { name: "Phí bán" })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "1 năm" })).toHaveAttribute("aria-selected", "true");
    expect(await axeViolations(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/vi\/funds$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("investor pages require sign-in (SR-AUTH-001)", async ({ page }) => {
    await page.goto("/vi/app");
    await expect(page).toHaveURL(/\/vi\/auth\/login\?returnUrl=%2Fvi%2Fapp/);
  });

  for (const path of ["/vi", "/vi/funds", "/vi/calculator", "/vi/compare", "/vi/auth/login", "/vi/methodology"]) {
    test(`accessibility: no serious/critical axe violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await axeViolations(page)).toEqual([]);
    });
  }
});
