import { Suspense } from "react";
import OngTo from "@/components/OngTo";
import VaoChua from "@/components/VaoChua";

export const metadata = { title: "Vào chùa | Chùa Hóa Học" };

export default function Page() {
  return (
    <main className="auth">
      <div className="giay auth-card">
        <OngTo className="auth-to" />
        <h1>Vào chùa</h1>
        <p className="muted">Nhập tên, chọn Nam hoặc Nữ là vào xin quẻ.</p>
        <Suspense>
          <VaoChua />
        </Suspense>
      </div>
    </main>
  );
}
