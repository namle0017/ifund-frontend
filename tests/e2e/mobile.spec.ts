import { expect, test } from "@playwright/test";

/** 04 §10: mobile menu collapses and key public pages stay usable without horizontal page scroll. */
test("mobile: menu toggle and no horizontal overflow on catalog and calculator", async ({ page }) => {
  await page.goto("/vi/funds");
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: "Calculator" })).toBeVisible();

  for (const path of ["/vi/funds", "/vi/calculator"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
