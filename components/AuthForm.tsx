"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LOI: Record<string, string> = {
  "Invalid login credentials": "Sai email hoặc mật khẩu.",
  "Email not confirmed": "Email chưa được xác nhận. Mở hộp thư và bấm vào link xác nhận trước.",
  "User already registered": "Email này đã có tài khoản. Con đăng nhập nhé.",
};

export default function AuthForm({ mode }: { mode: "dang-nhap" | "dang-ky" }) {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [f, setF] = useState({ email: "", password: "", name: "", school: "", className: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const next = params.get("tiep") || "/chanh-dien";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    if (mode === "dang-nhap") {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
      setBusy(false);
      if (error) return setError(LOI[error.message] ?? error.message);
      router.replace(next.startsWith("/") ? next : "/chanh-dien");
      router.refresh();
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: {
        data: { display_name: f.name.trim(), school: f.school.trim(), class_name: f.className.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (error) return setError(LOI[error.message] ?? error.message);
    if (data.session) {
      router.replace("/chanh-dien");
      router.refresh();
    } else {
      setInfo("Đã tạo tài khoản. Mở email để bấm link xác nhận, rồi quay lại đăng nhập.");
    }
  }

  return (
    <main className="auth">
      <form className="giay auth-card" onSubmit={submit}>
        <h1>{mode === "dang-nhap" ? "Vào chùa" : "Nhập môn"}</h1>
        <p className="muted">
          {mode === "dang-nhap" ? "Đăng nhập để xin quẻ tiếp." : "Tạo tài khoản đệ tử để bắt đầu xin quẻ."}
        </p>
        {mode === "dang-ky" && (
          <>
            <div className="field">
              <label htmlFor="name">Tên hiển thị</label>
              <input id="name" required maxLength={40} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              <span className="hint">Hiện trên bảng vàng và được đọc to trên buổi live.</span>
            </div>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div className="field" style={{ flex: 2 }}>
                <label htmlFor="school">Trường</label>
                <input id="school" maxLength={80} value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="class">Lớp</label>
                <input id="class" maxLength={20} value={f.className} onChange={(e) => setF({ ...f, className: e.target.value })} />
              </div>
            </div>
          </>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "dang-nhap" ? "current-password" : "new-password"}
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
          />
          {mode === "dang-ky" && <span className="hint">Ít nhất 6 kí tự.</span>}
        </div>
        {error && (
          <p className="thong-bao" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="thong-bao thong-bao-tot" role="status">
            {info}
          </p>
        )}
        <button type="submit" className="nut nut-rong" disabled={busy}>
          {busy ? "Đang mở cổng…" : mode === "dang-nhap" ? "Vào chùa" : "Nhập môn"}
        </button>
        <p className="small" style={{ marginTop: 14, marginBottom: 0 }}>
          {mode === "dang-nhap" ? (
            <>
              Chưa có tài khoản? <Link href="/dang-ky">Nhập môn</Link>
            </>
          ) : (
            <>
              Đã có tài khoản? <Link href="/dang-nhap">Vào chùa</Link>
            </>
          )}
        </p>
      </form>
    </main>
  );
}
