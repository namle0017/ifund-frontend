# fund-platform-frontend (iFund — tên tạm)

Next.js 16 (App Router) + TypeScript strict + Tailwind 4, UI song ngữ VI/EN cho nền tảng tra cứu, mô phỏng và theo dõi CCQ.
**Không đặt lệnh thật.** FE không tự tính NAV/phí/thuế/holdings: mọi con số và mọi quyết định làm tròn đến từ BE (AGENTS.md, A1–A3).

## Chạy local
1. BE: `dotnet run --project ../BE/src/FundPlatform.Api --launch-profile http` (Development: InMemory + seed SYNTHETIC + tài khoản demo).
2. FE: `npm ci && npm run build && npm run start -- -p 3001` (hoặc `npm run dev`).
3. Mở http://localhost:3001/vi. Tài khoản demo chỉ tồn tại ở Development (mật khẩu: `Dev:DemoPassword` trong appsettings.Development của BE).

## Kiểm thử
| Lệnh | Nội dung |
|---|---|
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npx eslint src` | Lint |
| `npm test` | Vitest: định dạng số không qua float, từ điển VI/EN đầy đủ, CalculationResult (incomplete, ETF), open-redirect, giỏ so sánh ≤5 |
| `npm run e2e` | Playwright (Edge có sẵn) với BE + FE đang chạy: guest, ETF giá thị trường, luồng Investor→Admin→hoàn tất, axe WCAG A/AA, mobile |

## Hợp đồng API (C8, ADR-004)
`node scripts/sync-contract.mjs <artifact BE>` kiểm SHA-256 và ghim vào `contracts/contract.lock.json`; `npm run contract:gen` sinh `src/lib/api/schema.d.ts`. Không viết tay DTO.

## Quyết định kỹ thuật riêng của FE
- i18n dùng dictionary theo hướng dẫn chính thức Next 16 (`app/[lang]`) thay cho `next-intl` để tránh rủi ro tương thích (C3 "sau khi kiểm tra tương thích").
- PDF render ở trình duyệt từ report snapshot của BE (`@react-pdf/renderer`, ADR-005). **Hạn chế đã biết:** font PDF mặc định chưa có đủ glyph tiếng Việt; cần đăng ký font Unicode trước khi phát hành.
