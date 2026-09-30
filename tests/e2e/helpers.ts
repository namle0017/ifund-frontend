import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Demo accounts exist only in the Development seed (Dev:DemoPassword); never in production. */
export const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "Demo!Passw0rd#2026";
export const INVESTOR = "investor@demo.invalid";
export const ADMIN = "admin@demo.invalid";

export async function login(page: Page, email: string, returnUrl = "/vi/app") {
  await page.goto(`/vi/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(`**${returnUrl}`);
}

export async function fundIdByCode(page: Page, code: string): Promise<string> {
  const res = await page.request.get(`/api/v1/funds?q=${code}`);
  const body = (await res.json()) as { items: { id: string; code: string }[] };
  const fund = body.items.find((f) => f.code === code);
  expect(fund, `fund ${code} seeded`).toBeTruthy();
  return fund!.id;
}

const axeSource = readFileSync(join(process.cwd(), "node_modules", "axe-core", "axe.min.js"), "utf8");

/** Runs axe-core (WCAG 2.x A/AA rules) and returns serious/critical violations. */
export async function axeViolations(page: Page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const result = await (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<{ violations: { id: string; impact: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return result.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target.join(" ")).slice(0, 3) }));
  });
}
