import { serverI18n } from "@/lib/i18n/server";

/** SF-09 — how numbers are produced (NFR-UX-002). Content mirrors APPROVED_DECISIONS A1–A9; legal text pending review. */
export default async function MethodologyPage({ params }: PageProps<"/[lang]/methodology">) {
  const { locale, t } = await serverI18n(params);
  const vi = locale === "vi";
  const items = vi
    ? [
        "NAV dùng trong tính toán = NAV gốc từ nguồn làm tròn 2 chữ số thập phân theo HALF_UP; NAV gốc luôn được lưu và hiển thị để đối chiếu.",
        "Số CCQ mô phỏng khi mua theo số tiền được làm tròn xuống bước 0,01 để không vượt số tiền đầu tư, trừ khi quỹ có quy tắc phân bổ đã xác minh khác.",
        "Tiền VNĐ: mỗi dòng phí/thuế làm tròn HALF_UP đến đồng; các giá trị trung gian giữ độ chính xác đầy đủ.",
        "Phí đã phản ánh trong NAV chỉ để thông tin, không bị trừ lần hai. Thiếu biểu phí hoặc quy tắc thuế đã xác minh thì kết quả được gắn “chưa đầy đủ”, không giả định bằng 0.",
        "ETF và quỹ đóng giao dịch trên sàn được tính theo giá thị trường do bạn nhập; NAV chỉ là tham chiếu.",
        "Chỉ số hiệu suất dùng lợi nhuận đơn giản trên dữ liệu đã xác minh, không nội suy dữ liệu thiếu; chỉ số thiếu dữ liệu hiển thị “chưa xác định”.",
        "Dự báo NAV là ước tính của mô hình, được đánh giá so với NAV chính thức khi công bố; mô hình mới chỉ được triển khai sau khi chạy thử song song và được Admin phê duyệt.",
      ]
    : [
        "NAV used in calculations = the source NAV rounded to 2 decimals with HALF_UP; the raw NAV is always stored and shown for reference.",
        "Units bought from an amount are rounded down to 0.01 so the allocation never exceeds the budget, unless the fund has a verified allocation rule.",
        "VND: each fee/tax line is rounded HALF_UP to the đồng; intermediate values keep full precision.",
        "Fees already reflected in NAV are shown for information only and never deducted twice. Missing verified fee schedules or tax rules make results “incomplete”; they are never assumed to be zero.",
        "Exchange-traded ETFs and closed funds are priced at the market price you enter; NAV is reference only.",
        "Performance metrics use simple returns on verified observations without interpolation; metrics lacking data show “not available”.",
        "NAV forecasts are model estimates evaluated against official NAV once published; new models go live only after shadow runs and Admin approval.",
      ];
  return (
    <article className="prose flex max-w-3xl flex-col gap-4">
      <h1 className="display-lg">{t("nav.methodology")}</h1>
      <ol className="list-decimal space-y-2 pl-6">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ol>
      <p className="text-sm italic text-text-muted">{t("disclaimer.pendingLegal")}</p>
    </article>
  );
}
