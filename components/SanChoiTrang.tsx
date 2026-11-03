"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGame } from "./AppShell";
import SanChoi from "./SanChoi";

/** Trang Sân chơi riêng: vào thẳng để giải trí, không cần xin quẻ. */
export default function SanChoiTrang() {
  const router = useRouter();
  const { state } = useGame();
  if (state.penalty) {
    return (
      <main className="page">
        <section className="giay xin-que">
          <h1>Sân chơi tạm đóng</h1>
          <p className="muted">
            Con còn nợ Ông Tổ {state.penalty.minutes} phút tụng kinh. Tụng xong rồi ra sân chơi nhé.
          </p>
          <Link href="/chanh-dien" className="nut">
            Lên tụng kinh
          </Link>
        </section>
      </main>
    );
  }
  return (
    <main className="page page-rong">
      <SanChoi trang onDong={() => router.push("/chanh-dien")} />
    </main>
  );
}
