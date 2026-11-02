import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { GameState } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ChuaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");

  const { data, error } = await supabase.rpc("trang_thai");
  if (error || !data?.state) {
    return (
      <main className="auth">
        <div className="giay auth-card">
          <h1>Chưa mở được cổng chùa</h1>
          <p>{error?.message ?? "Không đọc được hồ sơ đệ tử."}</p>
          <p className="muted small">
            Nếu thầy cô vừa cài đặt, kiểm tra đã chạy đủ hai file schema.sql và seed.sql trong Supabase chưa.
          </p>
          <form action="/dang-xuat" method="post">
            <button className="nut" type="submit">
              Đăng xuất
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <AppShell initial={data.state as GameState}>{children}</AppShell>;
}
