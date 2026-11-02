import { redirect } from "next/navigation";
import { Suspense } from "react";
import OngTo from "@/components/OngTo";
import VaoChua from "@/components/VaoChua";
import { createClient } from "@/lib/supabase/server";

export default async function CongChua() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/chanh-dien");

  return (
    <main>
      <section className="cong">
        <div className="cong-hero">
          <div>
            <h1>Chùa Hóa Học</h1>
            <p>
              Mỗi quẻ là một câu trắc nghiệm Hóa 10, 11, 12. Trả lời đúng thì gõ mõ tích công đức. Trả lời sai thì lên
              Điện Tổ vái Ông Tổ nghề Hóa và ngồi tụng kinh.
            </p>
            <Suspense>
              <VaoChua tren="then" />
            </Suspense>
          </div>
          <OngTo className="cong-to" />
        </div>
      </section>
      <section className="cong-buoc" aria-label="Cách chơi">
        <ol>
          <li>
            <div>
              <h3>Xin quẻ</h3>
              <p className="muted">Bắt đầu ở cấp 1 với câu nhận biết. Mỗi câu đúng lên một cấp, câu hỏi khó dần.</p>
            </div>
          </li>
          <li>
            <div>
              <h3>Sai thì tụng kinh</h3>
              <p className="muted">Vái Tổ ba vái rồi tụng kiến thức trọng tâm. Sai liên tiếp càng nhiều, ngồi càng lâu.</p>
            </div>
          </li>
          <li>
            <div>
              <h3>Lên cấp 100</h3>
              <p className="muted">Chạm cấp 100 là sám hối thành công, tên được khắc trên bảng vàng.</p>
            </div>
          </li>
        </ol>
      </section>
    </main>
  );
}
