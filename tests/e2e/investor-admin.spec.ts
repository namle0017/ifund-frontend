import { expect, test } from "@playwright/test";
import { ADMIN, DEMO_PASSWORD, fundIdByCode, INVESTOR, login } from "./helpers";

test("signed-in bar: brand navigation and account menu with sign-out", async ({ page }) => {
  await login(page, INVESTOR);
  const nav = page.getByRole("navigation", { name: "Menu" });
  await expect(nav.getByRole("link", { name: "Quản lý tài sản" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Menu tài khoản" }).click();
  await expect(page.getByRole("link", { name: "Báo cáo" })).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.waitForURL("**/vi");
  await expect(page.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
});

/**
 * FL-05 / NAV-05..07 / AC-REC-001..002: a mismatched declaration goes to the Admin queue; the Admin decision (with
 * step-up) never completes it; holdings change only after the investor confirms completion.
 */
test("mismatch → Admin accepts with evidence → investor completes → holdings updated once", async ({ browser }) => {
  const investor = await browser.newPage();
  await login(investor, INVESTOR);
  const portfolioName = `E2E ${Date.now()}`;
  await investor.getByLabel("Tên danh mục").fill(portfolioName);
  await investor.getByRole("button", { name: "Tạo danh mục" }).click();
  await investor.getByRole("link", { name: portfolioName }).click();
  await investor.waitForURL(/\/app\/portfolios\//);
  const portfolioUrl = investor.url();

  const fundId = await fundIdByCode(investor, "SYN-BOND");
  await investor.getByRole("link", { name: "Thêm giao dịch" }).click();
  await investor.getByLabel("Quỹ").selectOption(fundId);
  const yesterday = new Date(Date.now() - 86_400_000);
  while ([0, 6].includes(yesterday.getDay())) {
    yesterday.setDate(yesterday.getDate() - 1);
  }

  await investor.getByLabel("Ngày giao dịch").fill(yesterday.toISOString().slice(0, 10));
  await investor.getByLabel("Giá/NAV áp dụng").fill("99999");
  await investor.getByLabel("Số CCQ", { exact: true }).fill("10");
  await investor.getByLabel("Phí", { exact: true }).fill("0");
  await investor.getByLabel("Tiền thanh toán/thực nhận").fill("999990");
  await investor.getByRole("button", { name: "Lưu" }).click();
  await investor.waitForURL(/\/app\/transactions\/[0-9a-f-]{36}$/);

  await expect(investor.getByText("Chờ Admin xử lý")).toBeVisible();
  await expect(investor.getByText("Chưa thể hoàn tất")).toBeVisible();
  await expect(investor.getByText("Lệch").first()).toBeVisible();
  const txUrl = investor.url();

  // Admin (separate session) resolves with evidence after step-up.
  const admin = await browser.newPage();
  await login(admin, ADMIN, "/vi/admin/reconciliation");
  await admin.getByLabel("Mật khẩu").fill(DEMO_PASSWORD);
  await admin.getByRole("button", { name: "Xác nhận" }).click();
  const card = admin.locator("section").filter({ hasText: "SYN-BOND" }).first();
  await card.getByLabel("Lý do").fill("Statement reviewed (E2E synthetic)");
  await card.getByLabel("Bằng chứng / tài liệu nguồn").fill("SYN-E2E");
  await card.getByRole("button", { name: "Chấp nhận có bằng chứng" }).click();
  await admin.close();

  // Still not completed; holdings unchanged (TC-12).
  await investor.goto(portfolioUrl);
  await expect(investor.getByText("Chưa có tài sản.")).toBeVisible();
  await investor.goto(txUrl);
  await expect(investor.getByText("Admin đã xử lý")).toBeVisible();
  await investor.getByRole("link", { name: "Xác nhận hoàn tất" }).click();
  const confirm = investor.getByRole("button", { name: "Xác nhận hoàn tất" });
  await expect(confirm).toBeDisabled();
  await investor.getByLabel("Tôi hiểu đây không phải là lệnh giao dịch thật").check();
  await confirm.click();
  await expect(investor.getByText("Đã hoàn tất — danh mục đã được cập nhật.")).toBeVisible();

  await investor.goto(portfolioUrl);
  await expect(investor.getByRole("cell", { name: "10,00" }).first()).toBeVisible();
});
