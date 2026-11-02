import QuanTri from "@/components/QuanTri";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Quản trị | Chùa Hóa Học" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <main className="page">
        <div className="giay">
          <h1>Chỉ dành cho thầy cô</h1>
          <p className="muted">Tài khoản này chưa có quyền quản trị. Xem hướng dẫn cấp quyền trong README.</p>
        </div>
      </main>
    );
  }
  return <QuanTri />;
}
