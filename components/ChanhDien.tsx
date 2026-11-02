"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LETTERS, QUE_NAMES, TIER_NAMES, errorText, rankTitle } from "@/lib/game";
import { chuong, docTo, goMo } from "@/lib/sound";
import type { AnswerResult, Letter, PublicQuestion } from "@/lib/types";
import { useGame } from "./AppShell";
import { useChanhDien, type NguoiTrongChua } from "./CanhChua";
import Chua3D from "./Chua3D";
import GoDau from "./GoDau";
import TungKinhTaiCho from "./TungKinhTaiCho";
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
  const canhRef = useRef<HTMLDivElement>(null);
  const queRef = useRef<HTMLElement>(null);
  const [dem, setDem] = useState<number | null>(null);
  const [han, setHan] = useState<number | null>(null); // thời điểm hết giờ trả lời (ms)
  const [conLai, setConLai] = useState<number | null>(null);
  const [tong, setTong] = useState(30);
  const choiceRef = useRef<Letter | null>(null);
  choiceRef.current = choice;

  const max = state.config.max_level;
  const dong = useChanhDien(true);
  const [loiChao, setLoiChao] = useState<string | null>(null);
  const daThay = useRef<Set<string> | null>(null);

  // Có người mới vào chánh điện: đọc to lời chào và hiện trên cảnh
  useEffect(() => {
    if (!dong) return;
    const others = dong.people.filter((p) => !p.me);
    if (daThay.current === null) {
      daThay.current = new Set(others.map((p) => p.key));
      // Chính mình vừa vào chùa: chào một lần trong phiên
      try {
        if (!sessionStorage.getItem("chua-da-chao")) {
          sessionStorage.setItem("chua-da-chao", "1");
          const ten = state.display_name;
          setLoiChao(`Xin chào ${ten}, đã đến Chùa Hóa Học`);
          docTo(`Xin chào ${ten}, đã đến Chùa Hóa Học`);
        }
      } catch {
        /* bỏ qua */
      }
      return;
    }
    const moi = others.filter((p) => !daThay.current!.has(p.key));
    moi.forEach((p) => daThay.current!.add(p.key));
    if (!moi.length) return;
    const ten =
      moi.length === 1
        ? moi[0].name
        : moi.length <= 3
          ? `${moi.slice(0, -1).map((p) => p.name).join(", ")} và ${moi[moi.length - 1].name}`
          : `${moi.length} bạn mới`;
    const cau = `Xin chào ${ten}, đã đến Chùa Hóa Học`;
    setLoiChao(cau);
    docTo(cau);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dong]);

  useEffect(() => {
    if (!loiChao) return;
    const id = setTimeout(() => setLoiChao(null), 5000);
    return () => clearTimeout(id);
  }, [loiChao]);

  // Cấp của chính mình lấy ngay từ kết quả vừa trả lời, không chờ lần cập nhật sau
  const people = useMemo<NguoiTrongChua[]>(() => {
    const others = (dong?.people ?? []).filter((p) => !p.me);
    const me: NguoiTrongChua = {
      key: "toi",
      name: state.display_name,
      gender: state.gender,
      level: state.level,
      sam_hoi: Boolean(state.sam_hoi_at),
      phat: Boolean(state.penalty),
      me: true,
    };
    return [...others, me];
  }, [dong, state.penalty, state.display_name, state.gender, state.level, state.sam_hoi_at]);

  const viTri = useMemo(() => {
    const truoc = people.filter((p) => !p.me && p.level > state.level).length;
    const tong = people.length;
    if (state.penalty) return "Con đang quỳ trước Ông Tổ tụng kinh. Tụng xong sẽ về chỗ ngồi cũ.";
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
        setHan(typeof data.con_lai === "number" ? Date.now() + data.con_lai * 1000 : null);
    if (typeof data.con_lai === "number") setTong((t) => Math.max(t, data.con_lai));
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
    setHan(typeof data.con_lai === "number" ? Date.now() + data.con_lai * 1000 : null);
    if (typeof data.con_lai === "number") setTong((t) => Math.max(t, data.con_lai));
    setPhase("hoi");
  }

  async function chot(hetGio = false) {
    const pick = choiceRef.current;
    if (!question || (!pick && !hetGio)) return;
    setPhase("cham");
    setError(null);
    setHan(null);
    const { data, error } = await supabase.rpc("tra_loi", { p_question_id: question.id, p_choice: hetGio && !pick ? "HET_GIO" : pick });
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
    if (!r.is_correct) setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  // Tự động: đúng thì nhìn nhân vật đi lên rồi ra quẻ mới; sai thì tự lên Điện Tổ
  useEffect(() => {
    if (phase !== "kq" || !result || result.sam_hoi) {
      setDem(null);
      return;
    }
    if (result.is_correct) {
      canhRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (result.is_correct) setDem(4);
  }, [phase, result]);

  useEffect(() => {
    if (dem === null) return;
    if (dem <= 0) {
      setDem(null);
      if (result?.is_correct) {
        void xinQue().then(() => setTimeout(() => queRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80));
      }
      return;
    }
    const id = setTimeout(() => setDem((d) => (d === null ? null : d - 1)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dem]);

  // Đồng hồ 30 giây: hết giờ thì tự chốt (chưa chọn thì tính là sai)
  useEffect(() => {
    if (han === null || phase !== "hoi") {
      setConLai(null);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((han - Date.now()) / 1000));
      setConLai(left);
      if (left <= 0) {
        setHan(null);
        void chot(true);
      } else if (left <= 5) {
        goMo(0.25);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [han, phase]);

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
        <div ref={canhRef} className="canh-khung" style={{ scrollMarginTop: 90 }}>
          {loiChao && (
            <div className="loi-chao" role="status">
              {loiChao}
            </div>
          )}
          {dong ? <Chua3D people={people} maxLevel={max} /> : <div className="chua3d" aria-hidden="true" />}
        </div>
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
        <TungKinhTaiCho
          onXong={() => {
            // Tụng xong: nhân vật đi về chỗ, rồi tự ra quẻ mới
            setTimeout(() => {
              void xinQue().then(() =>
                setTimeout(() => queRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80)
              );
            }, 3500);
          }}
        />
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
        <section className="la-xam" aria-labelledby="cau-hoi" ref={queRef} style={{ scrollMarginTop: 90 }}>
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
          {conLai !== null && (phase === "hoi" || phase === "cham") && (
            <div className={`dong-ho${conLai <= 10 ? " is-gap" : ""}`} role="timer" aria-live={conLai <= 5 ? "assertive" : "off"}>
              <div className="dong-ho-vach" style={{ width: `${Math.min(100, (conLai / tong) * 100)}%` }} />
              <span>{conLai > 0 ? `Còn ${conLai} giây` : "Hết giờ"}</span>
            </div>
          )}
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
                <button type="button" className="nut nut-rong" onClick={() => void chot()} disabled={!choice || phase === "cham"}>
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
                    <button type="button" className="nut nut-rong" onClick={() => { setDem(null); void xinQue(); }}>
                      {dem !== null ? `Quẻ tiếp theo sau ${dem} giây` : "Xin quẻ tiếp"}
                    </button>
                  </>
                ) : (
                  <>
                    <h3>
                      {result.het_gio ? "Hết giờ." : "Sai rồi."} Đáp án đúng là {result.correct_choice}
                    </h3>
                    {result.explanation && <p>{result.explanation}</p>}
                    <p>
                      Con bị hạ xuống cấp {result.new_level} và phải lên trước Ông Tổ vái ba vái, tụng kinh{" "}
                      <strong>{result.penalty_minutes} phút</strong>
                      {state.wrong_streak > 1 ? ` (sai ${state.wrong_streak} câu liên tiếp)` : ""}.
                    </p>
                    {phase === "kq" && (
                      <GoDau
                        gender={state.gender}
                        dapAn={result.correct_choice}
                        hetGio={Boolean(result.het_gio)}
                        giaiThich={result.explanation}
                        phut={result.penalty_minutes}
                        onDone={() => {
                          setResult(null);
                          setQuestion(null);
                          setPhase("cho");
                          canhRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      />
                    )}
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
