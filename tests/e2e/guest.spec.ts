import { expect, test } from "@playwright/test";
import { axeViolations, fundIdByCode } from "./helpers";

test.describe("Guest (TC-01, FL-01/02)", () => {
  test("browses funds with separate NAV and market-price labels and SYNTHETIC badges", async ({ page }) => {
    await page.goto("/vi/funds");
    await expect(page.getByRole("heading", { name: "Danh sách quỹ" })).toBeVisible();
    await expect(page.getByText("Dữ liệu tổng hợp (SYNTHETIC)").first()).toBeVisible();
    const etf = page.getByRole("listitem").filter({ hasText: "SYN-ETF" });
    await expect(etf.getByText("NAV chính thức")).toBeVisible();
    await expect(etf.getByText("Giá thị trường")).toBeVisible();
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
