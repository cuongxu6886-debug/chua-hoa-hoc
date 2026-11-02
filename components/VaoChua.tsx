"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Gender = "nam" | "nu";

function loiVao(message: string, status?: number) {
  const m = message.toLowerCase();
  if (m.includes("anonymous sign-ins are disabled") || m.includes("anonymous_provider_disabled"))
    return "Cổng chùa chưa mở chế độ vào bằng tên. Thầy cô cần bật Anonymous sign-ins trong Supabase.";
  if (status === 429 || m.includes("rate limit"))
    return "Nhiều bạn vào cùng lúc quá. Con đợi một phút rồi bấm lại nhé.";
  if (m.includes("invalid login credentials")) return "Sai email hoặc mật khẩu.";
  if (m.includes("email not confirmed")) return "Email chưa được xác nhận.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Mạng đang chập chờn. Con thử lại nhé.";
  return message;
}

/** Vào chùa chỉ bằng tên và giới tính (đăng nhập ẩn danh của Supabase). */
export default function VaoChua({ tren = "giay" }: { tren?: "giay" | "then" }) {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thayCo, setThayCo] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const tiep = params.get("tiep");
  const next = tiep && tiep.startsWith("/") && !tiep.startsWith("//") ? tiep : "/chanh-dien";

  function vao() {
    router.replace(next);
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ten = name.trim().replace(/\s+/g, " ");
    if (ten.length < 2) return setError("Con nhập tên ít nhất 2 chữ cái nhé.");
    if (!gender) return setError("Con chọn Nam hoặc Nữ nhé.");
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: ten, gender } },
    });
    if (error) {
      setBusy(false);
      return setError(loiVao(error.message, error.status));
    }
    vao();
  }

  async function submitThayCo(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      return setError(loiVao(error.message, error.status));
    }
    vao();
  }

  return (
    <div className={`vao-chua vao-chua-${tren}`}>
      {!thayCo ? (
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="ten-de-tu">Tên của con</label>
            <input
              id="ten-de-tu"
              autoComplete="nickname"
              maxLength={40}
              placeholder="vd: Minh Anh 12A1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <fieldset className="gioi-tinh">
            <legend>Con là</legend>
            {(
              [
                ["nam", "Nam", "Thiện nam"],
                ["nu", "Nữ", "Tín nữ"],
              ] as const
            ).map(([v, label, goi]) => (
              <label key={v} className={gender === v ? "is-chon" : undefined}>
                <input type="radio" name="gioi-tinh" value={v} checked={gender === v} onChange={() => setGender(v)} />
                <b>{label}</b>
                <span>{goi}</span>
              </label>
            ))}
          </fieldset>
          {error && (
            <p className="thong-bao" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="nut nut-vang nut-rong" disabled={busy}>
            {busy ? "Đang mở cổng…" : "Vào chùa"}
          </button>
          <p className="vao-chua-ghi">
            Không cần email hay mật khẩu. Chùa nhớ con trên máy này, lần sau mở lại là vào tiếp.
          </p>
          <button type="button" className="vao-chua-link" onClick={() => { setThayCo(true); setError(null); }}>
            Thầy cô đăng nhập bằng email
          </button>
        </form>
      ) : (
        <form onSubmit={submitThayCo}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="mat-khau">Mật khẩu</label>
            <input
              id="mat-khau"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="thong-bao" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="nut nut-vang nut-rong" disabled={busy}>
            {busy ? "Đang mở cổng…" : "Đăng nhập"}
          </button>
          <button type="button" className="vao-chua-link" onClick={() => { setThayCo(false); setError(null); }}>
            Quay lại vào bằng tên
          </button>
        </form>
      )}
    </div>
  );
}
