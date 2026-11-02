"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorText, formatClock } from "@/lib/game";
import { chuong, goMo } from "@/lib/sound";
import type { GameState } from "@/lib/types";
import { useGame } from "./AppShell";

const PING_MS = 10_000;
const LINE_MS = 4_500;

type Buoc = "len" | "vai" | "tung";

/**
 * Tụng kinh ngay trong chánh điện: nhân vật đi lên trước Ông Tổ, vái ba vái,
 * ngồi tụng đủ thời gian (máy chủ giữ giờ) rồi quay về chỗ.
 */
export default function TungKinhTaiCho({ onXong }: { onXong: () => void }) {
  const { state, setState } = useGame();
  const supabase = useMemo(() => createClient(), []);
  const penalty = state.penalty;
  const [buoc, setBuoc] = useState<Buoc>(penalty?.seated ? "tung" : "len");
  const [vai, setVai] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [line, setLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const lastPing = useRef<{ at: number; remaining: number; seated: boolean } | null>(null);
  const pinging = useRef(false);
  const xong = useRef(onXong);
  xong.current = onXong;
  const buocRef = useRef(buoc);
  buocRef.current = buoc;

  // Đi lên (khoảng 3 giây), vái ba vái (mỗi vái một tiếng mõ), rồi ngồi tụng
  useEffect(() => {
    if (buoc === "len") {
      const id = setTimeout(() => setBuoc("vai"), 3200);
      return () => clearTimeout(id);
    }
    if (buoc === "vai") {
      if (vai >= 3) {
        const id = setTimeout(() => setBuoc("tung"), 500);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => {
        goMo(0.6);
        setVai((v) => v + 1);
      }, 1000);
      return () => clearTimeout(id);
    }
  }, [buoc, vai]);

  const ping = useCallback(async () => {
    if (pinging.current) return;
    pinging.current = true;
    const { data, error } = await supabase.rpc("dien_to", { p_ngoi: buocRef.current === "tung" });
    pinging.current = false;
    if (error) {
      setError(errorText(error));
      return;
    }
    setError(null);
    const r = data as { done: boolean; state: GameState; room: { my_position: number | null } };
    setWaiting(r.room?.my_position ?? null);
    if (r.done || !r.state.penalty) {
      chuong(0.4);
      lastPing.current = null;
      setState(r.state);
      xong.current();
      return;
    }
    setState(r.state);
    const p = r.state.penalty;
    const rem = p.minutes * 60 - Number(p.elapsed);
    lastPing.current = { at: Date.now(), remaining: rem, seated: p.seated };
    setRemaining(rem);
  }, [supabase, setState]);

  useEffect(() => {
    void ping();
    const id = setInterval(() => !document.hidden && void ping(), PING_MS);
    const onVis = () => !document.hidden && void ping();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ping]);

  // Vừa ngồi xuống thì báo máy chủ ngay để bắt đầu tính giờ
  useEffect(() => {
    if (buoc === "tung") void ping();
  }, [buoc, ping]);

  // Đếm ngược trên máy, khớp lại mỗi lần báo có mặt
  useEffect(() => {
    const id = setInterval(() => {
      const lp = lastPing.current;
      if (!lp || !lp.seated || document.hidden) return;
      const rem = lp.remaining - (Date.now() - lp.at) / 1000;
      setRemaining(rem);
      if (rem <= 0) void ping();
    }, 1000);
    return () => clearInterval(id);
  }, [ping]);

  const lines = useMemo(() => {
    const t = penalty?.topic;
    if (!t) return ["Con kính lạy Ông Tổ nghề Hóa, con xin chú tâm học hành."];
    return [`Con kính lạy Ông Tổ nghề Hóa, con xin tụng ${t.kinh_title}.`, ...t.kinh, "Con xin ghi nhớ, lần sau không sai nữa."];
  }, [penalty?.topic]);

  useEffect(() => {
    if (buoc !== "tung") return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setLine((l) => (l + 1) % lines.length);
      goMo(0.3);
    }, LINE_MS);
    return () => clearInterval(id);
  }, [buoc, lines.length]);

  if (!penalty) return null;
  const total = penalty.minutes * 60;
  const shown = Math.max(0, remaining ?? total - Number(penalty.elapsed));

  return (
    <section className="giay tung-tai-cho" aria-live="polite">
      {buoc === "len" && (
        <>
          <h2>Con đi lên trước Ông Tổ…</h2>
          <p className="muted">Trả lời sai thì phải lên vái Tổ và tụng kinh {penalty.minutes} phút.</p>
        </>
      )}
      {buoc === "vai" && (
        <>
          <h2>Vái Tổ ba vái</h2>
          <div className="vai-cham" aria-label={`Đã vái ${vai} trên 3`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < vai ? "is-roi" : undefined} />
            ))}
          </div>
        </>
      )}
      {buoc === "tung" && (
        <>
          <div className="tung-dong-ho">{formatClock(shown)}</div>
          {waiting ? (
            <p className="muted">
              Trước Ông Tổ đã kín chỗ. Con đang chờ thứ <strong>{waiting}</strong>, có chỗ là bắt đầu tính giờ.
            </p>
          ) : (
            <>
              {penalty.topic && <div className="muted small">{penalty.topic.kinh_title}</div>}
              <p className="tung-cau">{lines[line % lines.length]}</p>
            </>
          )}
          <p className="muted small">Giữ trang này mở, rời đi thì đồng hồ dừng. Tụng xong con tự về chỗ và xin quẻ tiếp.</p>
        </>
      )}
      {error && (
        <p className="thong-bao" role="alert">
          {error}
        </p>
      )}
      <Link href="/dien-to" className="small">
        Mở Điện Tổ để hỏi Ông Tổ
      </Link>
    </section>
  );
}
