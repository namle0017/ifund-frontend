import { RequireAuth } from "@/components/require-auth";

export default function InvestorLayout({ children }: LayoutProps<"/[lang]/app">) {
  return <RequireAuth>{children}</RequireAuth>;
}
