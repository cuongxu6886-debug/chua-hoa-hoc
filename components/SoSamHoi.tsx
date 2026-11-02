"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LETTERS, TIER_NAMES, errorText } from "@/lib/game";

type Muc = {
  id: number;
  created_at: string;
  choice: string;
  answer: string;
  content: string;
  options: string[];
  explanation: string | null;
  level: number;
  topic_name: string;
  grade: number;
  redeemed: boolean;
};

export default function SoSamHoi() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Muc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | null>(null);

  useEffect(() => {
    supabase.rpc("so_sam_hoi").then(({ data, error }) => {
      if (error) setError(errorText(error));
      else setItems(data as Muc[]);
    });
  }, [supabase]);

  const shown = (items ?? []).filter((m) => grade === null || m.grade === grade);

  return (
    <main className="page stack">
      <div>
        <h1>Sổ sám hối</h1>
        <p className="muted">
          Những câu con từng trả lời sai, mới nhất ở trên. Câu nào sau đó con làm đúng sẽ được đánh dấu đã chuộc lỗi.
        </p>
      </div>
      <div className="tabs" role="group" aria-label="Lọc theo lớp">
        {[null, 10, 11, 12].map((g) => (
          <button key={String(g)} type="button" aria-pressed={grade === g} onClick={() => setGrade(g)}>
            {g === null ? "Tất cả" : `Hóa ${g}`}
          </button>
        ))}
      </div>
      {error && <p className="thong-bao">{error}</p>}
      {items === null && !error && <p className="muted">Đang mở sổ…</p>}
      {items && shown.length === 0 && (
        <div className="giay">
          <p>Sổ còn trắng. Con chưa trả lời sai câu nào{grade ? ` của Hóa ${grade}` : ""}.</p>
          <Link href="/chanh-dien" className="nut">
            Xin quẻ
          </Link>
        </div>
      )}
      {shown.map((m) => (
        <article key={m.id} className={`giay so-muc${m.redeemed ? " da-chuoc" : ""}`}>
          <div className="row small muted" style={{ marginBottom: 6 }}>
            <span>
              Hóa {m.grade}, {m.topic_name}
            </span>
            <span className="nhan">{TIER_NAMES[m.level]}</span>
            {m.redeemed && <span className="nhan nhan-la">Đã chuộc lỗi</span>}
            <span className="spacer" />
            <time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString("vi-VN")}</time>
          </div>
          <p style={{ whiteSpace: "pre-line", fontWeight: 500 }}>{m.content}</p>
          <ul className="pa-list">
            {m.options.map((o, i) => {
              const l = LETTERS[i];
              const cls = l === m.answer ? "dung" : l === m.choice ? "sai" : undefined;
              return (
                <li key={l} className={cls}>
                  {l}. {o}
                  {l === m.choice && l !== m.answer ? " (con chọn)" : ""}
                </li>
              );
            })}
          </ul>
          {m.explanation && <p className="small" style={{ margin: 0 }}>{m.explanation}</p>}
        </article>
      ))}
    </main>
  );
}
