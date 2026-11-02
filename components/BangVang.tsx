"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorText } from "@/lib/game";

type Row = {
  hang: number;
  display_name: string;
  school: string | null;
  class_name: string | null;
  level: number;
  diem: number;
  sam_hoi_at: string | null;
  is_me: boolean;
};

const KY = [
  { id: "tong", label: "Cấp cao nhất" },
  { id: "tuan", label: "Công đức tuần này" },
  { id: "sam_hoi", label: "Sám hối thành công" },
] as const;

export default function BangVang() {
  const supabase = useMemo(() => createClient(), []);
  const [ky, setKy] = useState<(typeof KY)[number]["id"]>("tong");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    supabase.rpc("bang_vang", { p_ky: ky }).then(({ data, error }) => {
      if (!alive) return;
      if (error) setError(errorText(error));
      else {
        setError(null);
        setRows(data as Row[]);
      }
    });
    return () => {
      alive = false;
    };
  }, [ky, supabase]);

  return (
    <main className="page stack">
      <h1>Bảng vàng</h1>
      <div className="tabs" role="group" aria-label="Chọn bảng">
        {KY.map((k) => (
          <button key={k.id} type="button" aria-pressed={ky === k.id} onClick={() => setKy(k.id)}>
            {k.label}
          </button>
        ))}
      </div>
      {error && <p className="thong-bao">{error}</p>}
      {rows === null && !error && <p className="muted">Đang mở bảng vàng…</p>}
      {rows && rows.length === 0 && (
        <p className="giay muted">
          {ky === "sam_hoi"
            ? "Chưa ai sám hối thành công. Lên tới cấp 100 là tên con được khắc ở đây."
            : ky === "tuan"
              ? "Tuần này chưa ai tích công đức. Xin quẻ đầu tiên để mở hàng."
              : "Chưa có đệ tử nào."}
        </p>
      )}
      {rows && rows.length > 0 && (
        <div className="bang-vang">
          <ol>
            {rows.map((r, i) => (
              <li key={i} className={r.is_me ? "is-me" : undefined}>
                <span className="hang">{r.hang}</span>
                <span>
                  <span className="ten">
                    {r.display_name}
                    {r.is_me ? " (con)" : ""}
                  </span>
                  <br />
                  <span className="lop">
                    {[r.class_name && `Lớp ${r.class_name}`, r.school].filter(Boolean).join(", ") || "Chưa ghi lớp"}
                  </span>
                </span>
                <span className="diem">
                  {ky === "tuan" ? (
                    <>
                      <b>{r.diem}</b> công đức
                    </>
                  ) : ky === "sam_hoi" ? (
                    <>{r.sam_hoi_at ? new Date(r.sam_hoi_at).toLocaleDateString("vi-VN") : ""}</>
                  ) : (
                    <>
                      Cấp <b>{r.level}</b>
                      <br />
                      <span className="lop">{r.diem} công đức</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </main>
  );
}
