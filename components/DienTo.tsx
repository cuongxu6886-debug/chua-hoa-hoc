"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LETTERS, errorText, formatClock, rankTitle, toGreeting } from "@/lib/game";
import { chuong, goMo } from "@/lib/sound";
import type { DienToResult } from "@/lib/types";
import { useGame } from "./AppShell";
import BatHuong from "./BatHuong";
import HoiTo from "./HoiTo";
import OngTo from "./OngTo";
import RoomGrid from "./RoomGrid";

const PING_MS = 10_000;
const LINE_MS = 4_500;

export default function DienTo({ aiEnabled }: { aiEnabled: boolean }) {
  const { state, setState } = useGame();
  const supabase = useMemo(() => createClient(), []);
  const [room, setRoom] = useState<DienToResult["room"] | null>(null);
  const [vai, setVai] = useState(0);
  const [bowing, setBowing] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const [line, setLine] = useState(0);
  const [confirmIncense, setConfirmIncense] = useState(false);
  const [busy, setBusy] = useState(false);

  const penalty = state.penalty;
  const seated = !!penalty?.seated;
  const penaltyKey = penalty ? `chua-vai-${state.id}-${penalty.topic?.id ?? "x"}-${penalty.minutes}` : null;
  const vaiXong = vai >= 3 || seated;

  const vaiRef = useRef(vaiXong);
  vaiRef.current = vaiXong;
  const lastPing = useRef<{ at: number; remaining: number; seated: boolean } | null>(null);
  const pinging = useRef(false);

  // Nhớ số lần đã vái nếu học sinh tải lại trang
  useEffect(() => {
    if (!penaltyKey) {
      setVai(0);
      return;
    }
    try {
      setVai(Number(sessionStorage.getItem(penaltyKey) || 0));
    } catch {
      setVai(0);
    }
  }, [penaltyKey]);

  const ping = useCallback(
    async (ngoi: boolean) => {
      if (pinging.current) return;
      pinging.current = true;
      const { data, error } = await supabase.rpc("dien_to", { p_ngoi: ngoi });
      pinging.current = false;
      if (error) {
        setError(errorText(error));
        return;
      }
      const r = data as DienToResult;
      setError(null);
      setRoom(r.room);
      setState(r.state);
      if (r.done) {
        setJustDone(true);
        chuong(0.4);
        try {
          Object.keys(sessionStorage)
            .filter((k) => k.startsWith("chua-vai-"))
            .forEach((k) => sessionStorage.removeItem(k));
        } catch {
          /* bỏ qua */
        }
      }
      const p = r.state.penalty;
      if (p) {
        const rem = p.minutes * 60 - Number(p.elapsed);
        lastPing.current = { at: Date.now(), remaining: rem, seated: p.seated };
        setRemaining(rem);
      } else {
        lastPing.current = null;
        setRemaining(null);
      }
    },
    [supabase, setState]
  );

  // Báo có mặt định kỳ; rời trang (ẩn tab) thì ngừng báo nên đồng hồ dừng
  useEffect(() => {
    void ping(vaiRef.current);
    const id = setInterval(() => {
      if (!document.hidden) void ping(vaiRef.current);
    }, PING_MS);
    const onVis = () => {
      setHidden(document.hidden);
      if (!document.hidden) void ping(vaiRef.current);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ping]);

  // Đồng hồ đếm ngược trên máy, khớp lại với máy chủ mỗi lần báo có mặt
  useEffect(() => {
    const id = setInterval(() => {
      const lp = lastPing.current;
      if (!lp || !lp.seated || document.hidden) return;
      const rem = lp.remaining - (Date.now() - lp.at) / 1000;
      setRemaining(rem);
      if (rem <= 0) void ping(true);
    }, 1000);
    return () => clearInterval(id);
  }, [ping]);

  const lines = useMemo(() => {
    const t = penalty?.topic;
    if (!t) return [];
    return [`Con kính lạy Ông Tổ nghề Hóa, con xin tụng ${t.kinh_title}.`, ...t.kinh, "Con xin ghi nhớ, lần sau không sai nữa."];
  }, [penalty?.topic]);

  // Tụng kinh: mỗi câu một nhịp mõ
  useEffect(() => {
    if (!seated || hidden || lines.length === 0) return;
    const id = setInterval(() => {
      setLine((l) => (l + 1) % lines.length);
      goMo(0.3);
    }, LINE_MS);
    return () => clearInterval(id);
  }, [seated, hidden, lines.length]);

  async function vaiTo() {
    if (!penaltyKey || vai >= 3) return;
    const next = vai + 1;
    setVai(next);
    try {
      sessionStorage.setItem(penaltyKey, String(next));
    } catch {
      /* bỏ qua */
    }
    setBowing(true);
    setTimeout(() => setBowing(false), 900);
    if (next < 3) {
      goMo(0.55);
    } else {
      chuong(0.35);
      vaiRef.current = true;
      await ping(true);
    }
  }

  async function thapHuong() {
    setBusy(true);
    setNotice(null);
    setError(null);
    const { data, error } = await supabase.rpc("thap_huong");
    setBusy(false);
    setConfirmIncense(false);
    if (error) {
      setError(errorText(error));
      return;
    }
    setState(data.state);
    setNotice(`Ông Tổ đã nâng con từ cấp ${data.from_level} lên cấp ${data.to_level}. Quẻ tới sẽ khó hơn.`);
    setBowing(true);
    setTimeout(() => setBowing(false), 900);
    chuong(0.35);
  }

  async function doiHuong() {
    setBusy(true);
    setNotice(null);
    setError(null);
    const { data, error } = await supabase.rpc("doi_huong");
    setBusy(false);
    if (error) {
      setError(errorText(error));
      return;
    }
    setState(data.state);
    setNotice("Con đã đổi được 1 nén hương.");
  }

  const mood = justDone ? "vui" : penalty ? "nghiem" : "hien";
  const total = penalty ? penalty.minutes * 60 : 0;
  const shownRemaining = remaining ?? total;
  const percent = total ? Math.min(100, Math.max(0, ((total - shownRemaining) / total) * 100)) : 0;
  const cfg = state.config;
  const nextLevel = Math.min(cfg.max_level - 1, state.level + cfg.incense_level_boost);

  return (
    <main className="page stack">
      <section className="dien" aria-labelledby="dien-tieu-de">
        <div className="dien-ban-tho">
          <div className="hoanh-phi" id="dien-tieu-de">
            Tổ nghề Hóa học
          </div>
          <OngTo className={`ong-to${bowing ? " dang-vai" : ""}`} mood={mood} />
          <div className="ban-tho-chan">
            <BatHuong sticks={3} />
          </div>
        </div>

        <div className="dien-than">
          {error && (
            <p className="thong-bao" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="thong-bao thong-bao-tot" role="status">
              {notice}
            </p>
          )}

          {justDone && !penalty && (
            <div className="stack" style={{ textAlign: "center" }}>
              <p className="loi-to">
                <strong>Ông Tổ:</strong> Tụng xong rồi. Tổ tha cho con, về xin quẻ mới đi.
              </p>
              <Link href="/chanh-dien" className="nut nut-vang">
                Về chánh điện xin quẻ
              </Link>
            </div>
          )}

          {penalty && !vaiXong && (
            <div className="stack" style={{ textAlign: "center" }}>
              <p className="loi-to">
                <strong>Ông Tổ:</strong> Con trả lời sai rồi. Vái Tổ ba vái, rồi vào ngồi tụng kinh{" "}
                {penalty.minutes} phút cho thuộc bài.
              </p>
              <div className="vai-dots" aria-label={`Đã vái ${vai} trên 3`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`vai-dot${i < vai ? " is-xong" : ""}`} />
                ))}
              </div>
              <button type="button" className="nut nut-vang" onClick={vaiTo}>
                Vái Tổ (lần {vai + 1}/3)
              </button>
            </div>
          )}

          {penalty && vaiXong && !seated && (
            <div className="stack" style={{ textAlign: "center" }}>
              {room && room.my_position ? (
                <p className="loi-to">
                  Điện đã đủ {room.capacity} người. Con đang chờ thứ <strong>{room.my_position}</strong> ngoài sân; có chỗ
                  trống Tổ sẽ gọi con vào. Đừng rời trang nhé.
                </p>
              ) : (
                <p className="loi-to">Đang vào chỗ ngồi…</p>
              )}
            </div>
          )}

          {penalty && seated && (
            <div>
              <div className="row">
                <div>
                  <div className="muted small">Còn phải tụng</div>
                  <div className="dong-ho" aria-live="off">
                    {formatClock(shownRemaining)}
                  </div>
                </div>
                <div className="spacer" />
                <div className="muted small" style={{ textAlign: "right" }}>
                  Phạt {penalty.minutes} phút
                  <br />
                  {state.wrong_streak > 1 ? `Sai ${state.wrong_streak} câu liên tiếp` : "Sai 1 câu"}
                </div>
              </div>
              <div className="tien-do" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
              </div>
              {hidden && <p className="thong-bao">Con rời Điện Tổ thì Tổ không tính giờ.</p>}

              <div className="kinh">
                <h3>{penalty.topic?.kinh_title ?? "Kinh"}</h3>
                <ol>
                  {lines.map((l, i) => (
                    <li key={i} className={i === line ? "is-tung" : undefined}>
                      {l}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {penalty?.question && (
            <details className="cau-vua-sai">
              <summary>Câu con vừa trả lời sai</summary>
              <p style={{ marginTop: 10, whiteSpace: "pre-line" }}>{penalty.question.content}</p>
              <ol type="A" style={{ paddingLeft: 22 }}>
                {penalty.question.options.map((o, i) => (
                  <li key={i} className={LETTERS[i] === penalty.question!.answer ? "dap-an" : undefined}>
                    {o}
                  </li>
                ))}
              </ol>
              {penalty.question.explanation && <p className="small">{penalty.question.explanation}</p>}
            </details>
          )}

          {!penalty && !justDone && (
            <div className="stack">
              <p className="loi-to">
                <strong>Ông Tổ:</strong> {toGreeting(state.level, cfg.max_level)}
              </p>
              <p className="muted small" style={{ margin: 0 }}>
                Con đang ở cấp {state.level}, danh hiệu {rankTitle(state.level, cfg.max_level)}.
              </p>

              <section className="huong-kho" aria-labelledby="huong-tieu-de">
                <div className="so-huong" aria-hidden="true">
                  {state.huong}
                </div>
                <div>
                  <h3 id="huong-tieu-de" style={{ marginBottom: 2 }}>
                    Nén hương của con
                  </h3>
                  <p className="muted small" style={{ margin: 0 }}>
                    Mỗi nén thắp lên, Ông Tổ nâng con lên {cfg.incense_level_boost} cấp: tới nhanh hơn, nhưng câu hỏi
                    khó hơn.
                  </p>
                </div>
              </section>

              {confirmIncense ? (
                <div className="row">
                  <p style={{ margin: 0 }}>
                    Thắp 1 nén để lên cấp {nextLevel}?
                  </p>
                  <button type="button" className="nut nut-vang nut-nho" onClick={thapHuong} disabled={busy}>
                    Thắp hương
                  </button>
                  <button type="button" className="nut nut-phu nut-nho" onClick={() => setConfirmIncense(false)}>
                    Thôi
                  </button>
                </div>
              ) : (
                <div className="row">
                  <button
                    type="button"
                    className="nut nut-vang"
                    onClick={() => setConfirmIncense(true)}
                    disabled={state.huong < 1 || state.has_question || state.level >= cfg.max_level - 1}
                  >
                    Thắp 1 nén hương
                  </button>
                  {cfg.incense_cost_merit > 0 && (
                    <button
                      type="button"
                      className="nut nut-phu"
                      onClick={doiHuong}
                      disabled={busy || state.cong_duc < cfg.incense_cost_merit}
                    >
                      Đổi {cfg.incense_cost_merit} công đức lấy 1 nén
                    </button>
                  )}
                </div>
              )}
              {state.has_question && (
                <p className="muted small" style={{ margin: 0 }}>
                  Con đang có quẻ chưa trả lời. Trả lời xong rồi hãy thắp hương.
                </p>
              )}
              <p className="muted small" style={{ margin: 0 }}>
                Tặng 1 bông hồng trên buổi live TikTok của thầy cô để nhận thêm hương.{" "}
                {state.tiktok_username ? (
                  <>Tên TikTok của con: {state.tiktok_username}.</>
                ) : (
                  <>
                    Nhớ <Link href="/ho-so" style={{ color: "var(--vang-sang)" }}>ghi tên TikTok trong Hồ sơ</Link> để hương
                    về đúng tài khoản.
                  </>
                )}
              </p>
            </div>
          )}

          {room && (
            <RoomGrid
              capacity={room.capacity}
              seated={room.seated}
              waiting={room.waiting}
              title={penalty ? "Các đệ tử đang tụng kinh" : "Đang có ai ngồi phạt"}
            />
          )}

          {aiEnabled && !penalty && <HoiTo />}
        </div>
      </section>
    </main>
  );
}
