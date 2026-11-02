"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LETTERS, QUE_NAMES, TIER_NAMES, errorText, rankTitle } from "@/lib/game";
import { chuong } from "@/lib/sound";
import type { AnswerResult, Letter, PublicQuestion } from "@/lib/types";
import { useGame } from "./AppShell";
import CanhChua, { useChanhDien, type NguoiTrongChua } from "./CanhChua";
import Mo from "./Mo";
import TrangHat from "./TrangHat";

type Phase = "cho" | "lac" | "hoi" | "cham" | "kq";

export default function ChanhDien() {
  const { state, setState, refresh } = useGame();
  const supabase = useMemo(() => createClient(), []);
  const [phase, setPhase] = useState<Phase>("cho");
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [choice, setChoice] = useState<Letter | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strike, setStrike] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const max = state.config.max_level;
  const dong = useChanhDien(true);

  // Cấp của chính mình lấy ngay từ kết quả vừa trả lời, không chờ lần cập nhật sau
  const people = useMemo<NguoiTrongChua[]>(() => {
    const others = (dong?.people ?? []).filter((p) => !p.me);
    if (state.penalty) return others;
    const me: NguoiTrongChua = {
      key: "toi",
      name: state.display_name,
      gender: state.gender,
      level: state.level,
      sam_hoi: Boolean(state.sam_hoi_at),
      me: true,
    };
    return [...others, me];
  }, [dong, state.penalty, state.display_name, state.gender, state.level, state.sam_hoi_at]);

  const viTri = useMemo(() => {
    const truoc = people.filter((p) => !p.me && p.level > state.level).length;
    const tong = people.length;
    if (state.penalty) return "Con đang ở Điện Tổ, chỗ ngồi trong chánh điện tạm để trống.";
    if (tong <= 1) return "Chánh điện đang vắng. Trả lời đúng để tiến lên gần Ông Tổ.";
    return truoc === 0
      ? `Con đang ngồi gần Ông Tổ nhất trong ${tong} đệ tử.`
      : `${tong} đệ tử đang trong chánh điện. Có ${truoc} người ngồi trên con, trả lời đúng để tiến lên.`;
  }, [people, state.level, state.penalty]);

  // Vào trang mà còn quẻ đang dở thì mở lại quẻ đó
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.rpc("trang_thai");
      if (!alive || !data) return;
      setState(data.state);
      if (data.question && !data.state.penalty) {
        setQuestion(data.question);
        setPhase("hoi");
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase, setState]);

  async function xinQue() {
    setError(null);
    setResult(null);
    setChoice(null);
    setPhase("lac");
    const started = Date.now();
    const { data, error } = await supabase.rpc("xin_que");
    const wait = Math.max(0, 800 - (Date.now() - started));
    await new Promise((r) => setTimeout(r, wait));
    if (error) {
      setError(errorText(error));
      setPhase("cho");
      if (error.hint === "penalty") void refresh();
      return;
    }
    setState(data.state);
    setQuestion(data.question);
    setPhase("hoi");
  }

  async function chot() {
    if (!question || !choice) return;
    setPhase("cham");
    setError(null);
    const { data, error } = await supabase.rpc("tra_loi", { p_question_id: question.id, p_choice: choice });
    if (error) {
      setError(errorText(error));
      if (error.hint === "stale") {
        setQuestion(null);
        setPhase("cho");
      } else {
        setPhase("hoi");
      }
      return;
    }
    const r = data as AnswerResult;
    setResult(r);
    setState(r.state);
    setPhase("kq");
    if (r.is_correct) {
      setStrike((s) => s + 1);
      if (r.sam_hoi) chuong(0.45);
    } else {
      chuong(0.3);
    }
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  const moLabel = result?.is_correct
    ? result.merit > 0
      ? `+${result.merit} công đức`
      : "Cấp +1"
    : null;

  return (
    <main className="page stack">
      <section aria-labelledby="cap-tieu-de">
        <div className="chanh-dien-dau">
          <div>
            <h1 id="cap-tieu-de" className="sr-only">
              Chánh điện
            </h1>
            <div className="cap-so">
              {state.level}
              <small> / {max}</small>
            </div>
            <div className="danh-hieu">{rankTitle(state.level, max)}</div>
          </div>
          <div className="muted small" style={{ textAlign: "right" }}>
            Câu hỏi mức <strong>{TIER_NAMES[state.tier]}</strong>
            <br />
            Chuỗi đúng: <strong>{state.correct_streak}</strong> (kỉ lục {state.best_streak})
          </div>
        </div>
        {dong ? <CanhChua people={people} maxLevel={max} /> : <div className="canh-chua" aria-hidden="true" />}
        <p className="canh-ghi">{viTri}</p>
      </section>

      {state.sam_hoi_at && (
        <p className="thong-bao thong-bao-tot">
          Con đã <strong>sám hối thành công</strong>. Tên con đã lên bảng vàng. Con vẫn có thể xin quẻ để giữ phong độ.
        </p>
      )}

      {error && (
        <p className="thong-bao" role="alert">
          {error}
        </p>
      )}

      {state.penalty && phase !== "kq" ? (
        <section className="giay xin-que">
          <h2>Con còn nợ Ông Tổ {state.penalty.minutes} phút tụng kinh</h2>
          <p className="muted">Lên Điện Tổ vái Tổ và tụng xong kinh thì mới được xin quẻ mới.</p>
          <Link href="/dien-to" className="nut">
            Lên Điện Tổ
          </Link>
        </section>
      ) : null}

      {!state.penalty && (phase === "cho" || phase === "lac") && (
        <section className="giay xin-que" aria-live="polite">
          <OngXam shaking={phase === "lac"} />
          <h2>{phase === "lac" ? "Đang lắc ống xăm…" : "Xin một quẻ"}</h2>
          <p className="muted">
            Quẻ là một câu trắc nghiệm Hóa 10, 11 hoặc 12 ở mức {TIER_NAMES[state.tier]}. Trả lời sai sẽ phải lên Điện Tổ tụng
            kinh.
          </p>
          <button type="button" className="nut" onClick={xinQue} disabled={phase === "lac"}>
            Xin quẻ
          </button>
        </section>
      )}

      {question && (phase === "hoi" || phase === "cham" || phase === "kq") && (
        <section className="la-xam" aria-labelledby="cau-hoi">
          <div className="la-xam-dau">
            <span className="dau-son" aria-hidden="true">
              {QUE_NAMES[question.level].replace("Quẻ ", "")}
            </span>
            <div>
              <strong>{QUE_NAMES[question.level]}</strong>
              <div className="muted small">
                Hóa {question.topic?.grade} · {question.topic?.name}
              </div>
            </div>
          </div>
          <div className="la-xam-than">
            <p id="cau-hoi" className="cau-hoi">
              {question.content}
            </p>
            <div className="phuong-an" role="radiogroup" aria-labelledby="cau-hoi">
              {question.options.map((opt, i) => {
                const letter = LETTERS[i];
                let cls = "pa";
                if (phase === "kq" && result) {
                  if (letter === result.correct_choice) cls += " is-dung";
                  else if (letter === choice) cls += " is-sai";
                } else if (choice === letter) cls += " is-chon";
                return (
                  <button
                    key={letter}
                    type="button"
                    role="radio"
                    aria-checked={choice === letter}
                    className={cls}
                    disabled={phase !== "hoi"}
                    onClick={() => setChoice(letter)}
                  >
                    <span className="pa-chu">{letter}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {phase !== "kq" && (
              <div className="row" style={{ marginTop: 16 }}>
                <button type="button" className="nut nut-rong" onClick={chot} disabled={!choice || phase === "cham"}>
                  {phase === "cham" ? "Đang chấm…" : choice ? `Chốt đáp án ${choice}` : "Chọn một đáp án"}
                </button>
              </div>
            )}

            {phase === "kq" && result && (
              <div ref={resultRef} className={`ket-qua ${result.is_correct ? "ket-qua-dung" : "ket-qua-sai"}`} aria-live="polite">
                {result.is_correct ? (
                  <>
                    <div className="ket-qua-mo">
                      <Mo strike={strike} label={moLabel} size={110} />
                      <div>
                        <h3>{result.sam_hoi ? "Sám hối thành công!" : "Đúng rồi"}</h3>
                        <p className="small" style={{ margin: 0 }}>
                          Cấp {result.old_level} → {result.new_level}
                          {result.merit > 0 ? `, +${result.merit} công đức` : ", câu này đã ghi công đức từ trước"}.
                        </p>
                      </div>
                    </div>
                    {result.explanation && <p style={{ marginTop: 12 }}>{result.explanation}</p>}
                    <button type="button" className="nut nut-rong" onClick={xinQue}>
                      Xin quẻ tiếp
                    </button>
                  </>
                ) : (
                  <>
                    <h3>Sai rồi. Đáp án đúng là {result.correct_choice}</h3>
                    {result.explanation && <p>{result.explanation}</p>}
                    <p>
                      Con bị hạ xuống cấp {result.new_level} và phải lên Điện Tổ vái Tổ, tụng kinh{" "}
                      <strong>{result.penalty_minutes} phút</strong>
                      {state.wrong_streak > 1 ? ` (sai ${state.wrong_streak} câu liên tiếp)` : ""}.
                    </p>
                    <Link href="/dien-to" className="nut nut-rong">
                      Lên Điện Tổ vái Tổ
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}
      <section className="giay" aria-label="Các mức quẻ">
        <TrangHat level={state.level} max={max} perTier={state.config.levels_per_tier} />
      </section>
    </main>
  );
}

function OngXam({ shaking }: { shaking: boolean }) {
  return (
    <svg viewBox="0 0 96 140" className={`ong-xam${shaking ? " dang-lac" : ""}`} aria-hidden="true">
      {[18, 28, 38, 48, 58, 68, 76].map((x, i) => (
        <rect key={x} x={x} y={10 + (i % 3) * 6} width="5" height="60" rx="2" fill="#C99A4A" stroke="#7A5420" strokeWidth="1" />
      ))}
      <rect x="44" y="2" width="6" height="40" rx="2" fill="#A3281B" />
      <path d="M12 44 H84 V122 Q84 134 72 134 H24 Q12 134 12 122 Z" fill="#7E5A2C" stroke="#3E2A12" strokeWidth="2" />
      <rect x="12" y="56" width="72" height="12" fill="#A3281B" />
      <rect x="12" y="108" width="72" height="8" fill="#A3281B" />
      <path d="M24 74 V102" stroke="#A67C45" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
