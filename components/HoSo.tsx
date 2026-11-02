"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorText, rankTitle } from "@/lib/game";
import { useGame } from "./AppShell";

type ThongKe = {
  by_grade: { grade: number; total: number; correct: number }[];
  chants: number;
  chant_minutes: number;
  huong_log: { delta: number; reason: string; note: string | null; at: string }[];
};

const REASON: Record<string, string> = {
  tiktok: "Quà TikTok",
  doi_cong_duc: "Đổi công đức",
  admin: "Thầy cô tặng",
  thap_huong: "Thắp hương",
};

export default function HoSo() {
  const { state, setState } = useGame();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState({
    name: state.display_name,
    school: state.school ?? "",
    className: state.class_name ?? "",
    tiktok: state.tiktok_username ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tk, setTk] = useState<ThongKe | null>(null);

  useEffect(() => {
    supabase.rpc("thong_ke").then(({ data }) => data && setTk(data as ThongKe));
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { data, error } = await supabase.rpc("cap_nhat_ho_so", {
      p_display_name: form.name,
      p_school: form.school,
      p_class_name: form.className,
      p_tiktok: form.tiktok,
    });
    setSaving(false);
    if (error) {
      setMsg({ ok: false, text: errorText(error) });
      return;
    }
    setState(data.state);
    setForm((f) => ({ ...f, tiktok: data.state.tiktok_username ?? "" }));
    setMsg({
      ok: true,
      text: data.claimed > 0 ? `Đã lưu hồ sơ. Con nhận được ${data.claimed} nén hương được tặng trước đó.` : "Đã lưu hồ sơ.",
    });
  }

  const total = state.total_correct + state.total_wrong;
  const rate = total ? Math.round((state.total_correct / total) * 100) : 0;

  return (
    <main className="page stack">
      <h1>Hồ sơ đệ tử</h1>

      <section className="giay">
        <div className="row" style={{ alignItems: "baseline" }}>
          <div className="cap-so">{state.level}</div>
          <div>
            <strong>{rankTitle(state.level, state.config.max_level)}</strong>
            <div className="muted small">
              {state.cong_duc} công đức, {state.huong} nén hương
            </div>
          </div>
        </div>
        <table className="bang" style={{ marginTop: 12 }}>
          <tbody>
            <tr>
              <th scope="row">Đã trả lời</th>
              <td className="cot-so">{total} câu</td>
            </tr>
            <tr>
              <th scope="row">Tỉ lệ đúng</th>
              <td className="cot-so">{rate}%</td>
            </tr>
            <tr>
              <th scope="row">Chuỗi đúng dài nhất</th>
              <td className="cot-so">{state.best_streak}</td>
            </tr>
            {tk && (
              <tr>
                <th scope="row">Đã ngồi tụng kinh</th>
                <td className="cot-so">
                  {tk.chants} lần, {tk.chant_minutes} phút
                </td>
              </tr>
            )}
            {tk?.by_grade.map((g) => (
              <tr key={g.grade}>
                <th scope="row">Hóa {g.grade}</th>
                <td className="cot-so">
                  đúng {g.correct}/{g.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form className="giay" onSubmit={save}>
        <h2>Thông tin</h2>
        <div className="field">
          <label htmlFor="ten">Tên hiển thị</label>
          <input id="ten" value={form.name} maxLength={40} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <span className="hint">Tên này hiện trên bảng vàng và được đọc to trên buổi live.</span>
        </div>
        <div className="field">
          <label htmlFor="truong">Trường</label>
          <input id="truong" value={form.school} maxLength={80} onChange={(e) => setForm({ ...form, school: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="lop">Lớp</label>
          <input id="lop" value={form.className} maxLength={20} onChange={(e) => setForm({ ...form, className: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="tiktok">Tên TikTok</label>
          <input
            id="tiktok"
            value={form.tiktok}
            maxLength={25}
            placeholder="vd: an.hoahoc"
            autoCapitalize="none"
            onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
          />
          <span className="hint">Tên sau dấu @ trên TikTok. Hoa hồng con tặng trên live sẽ đổi thành hương cho tài khoản này.</span>
        </div>
        {msg && (
          <p className={msg.ok ? "thong-bao thong-bao-tot" : "thong-bao"} role="status">
            {msg.text}
          </p>
        )}
        <button type="submit" className="nut" disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu hồ sơ"}
        </button>
      </form>

      {tk && tk.huong_log.length > 0 && (
        <section className="giay">
          <h2>Sổ hương</h2>
          <table className="bang">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Việc</th>
                <th className="cot-so">Hương</th>
              </tr>
            </thead>
            <tbody>
              {tk.huong_log.map((h, i) => (
                <tr key={i}>
                  <td>{new Date(h.at).toLocaleDateString("vi-VN")}</td>
                  <td>
                    {REASON[h.reason] ?? h.reason}
                    {h.note ? <div className="muted small">{h.note}</div> : null}
                  </td>
                  <td className="cot-so">{h.delta > 0 ? `+${h.delta}` : h.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <form action="/dang-xuat" method="post">
        <button type="submit" className="nut nut-phu">
          Đăng xuất
        </button>
      </form>
    </main>
  );
}
