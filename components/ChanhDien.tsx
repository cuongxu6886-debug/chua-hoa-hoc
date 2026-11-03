"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LETTERS, QUE_NAMES, TIER_NAMES, errorText, rankTitle } from "@/lib/game";
import { chuong, docTo, goMo } from "@/lib/sound";
import type { AnswerResult, Letter, PublicQuestion, Topic } from "@/lib/types";
import { useGame } from "./AppShell";
import { useChanhDien, type NguoiTrongChua } from "./CanhChua";
import Chua3D, { type Cham3D, type Chua3DApi } from "./Chua3D";
import { loiNhanVatAo } from "@/lib/suThay";
import GoDau from "./GoDau";
import SanChoi from "./SanChoi";
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
  const [daoMode, setDaoMode] = useState(false);
  const [sanChoi, setSanChoi] = useState(false);
  const dong = useChanhDien(true, daoMode ? 2500 : 6000);
  const [daoPos, setDaoPos] = useState<{ x: number; z: number } | null>(null);
  const [myNoi, setMyNoi] = useState<{ id: string; text: string } | null>(null);
  const [chat, setChat] = useState("");
  const [chatErr, setChatErr] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [banNoi, setBanNoi] = useState<{ key: string; ten: string; vai: string; at: number } | null>(null);
  const api3d = useRef<Chua3DApi | null>(null);

  async function layTopics() {
    if (topics.length) return topics;
    const { data } = await supabase.from("topics").select("id,name,grade,kinh_title,kinh");
    const t = (data ?? []) as Topic[];
    setTopics(t);
    return t;
  }

  async function nhanVatAoNoi(npc: { key: string; ten: string; vai: string }, hoi?: string) {
    const t = await layTopics();
    const loi = loiNhanVatAo(npc.vai, t, hoi);
    api3d.current?.npcNoi(npc.key, loi);
    docTo(loi, npc.vai === "tieu" ? 1.05 : 0.92);
  }

  function onCham(t: Cham3D) {
    if (t.kind === "npc") {
      setBanNoi({ key: t.key, ten: t.ten, vai: t.vai, at: Date.now() });
      void nhanVatAoNoi(t);
      return;
    }
    if (!daoMode) return;
    setDaoPos({ x: t.x, z: t.z });
    void supabase.rpc("di_dao", { p_x: t.x, p_z: t.z });
  }

  async function guiLoi(e: React.FormEvent) {
    e.preventDefault();
    const text = chat.trim();
    if (!text) return;
    setChatErr(null);
    const { data, error } = await supabase.rpc("noi", { p_text: text });
    if (error) {
      setChatErr(errorText(error));
      return;
    }
    setChat("");
    setMyNoi({ id: `m${data.id}`, text: data.text });
    // Đang trò chuyện với sư thầy (hoặc đứng gần nhân vật ảo nào) thì người đó đáp lại
    const npc = banNoi && Date.now() - banNoi.at < 90_000 ? banNoi : api3d.current?.npcGan(3.5);
    if (npc) {
      setBanNoi({ ...npc, at: Date.now() });
      setTimeout(() => void nhanVatAoNoi(npc, data.text), 1300);
    }
  }

  async function batDao(bat: boolean) {
    setDaoMode(bat);
    setChatErr(null);
    if (!bat) {
      setDaoPos(null);
      setBanNoi(null);
      await supabase.rpc("di_dao", { p_x: null, p_z: null });
    } else {
      void layTopics();
    }
  }

  // Đi dạo lâu thì báo vị trí lại cho người khác vẫn thấy; bị phạt thì thôi đi dạo
  useEffect(() => {
    if (!daoMode || !daoPos) return;
    const id = setInterval(() => void supabase.rpc("di_dao", { p_x: daoPos.x, p_z: daoPos.z }), 60_000);
    return () => clearInterval(id);
  }, [daoMode, daoPos, supabase]);
  useEffect(() => {
    if (state.penalty && daoMode) void batDao(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.penalty]);
  const toanRef = useRef<HTMLDivElement>(null);
  const [toan, setToan] = useState(false);
  const [vung, setVung] = useState<{ top: number; bottom: number } | null>(null);

  // Cảnh phủ kín vùng giữa thanh trên và thanh dưới (đo theo giao diện thật)
  useEffect(() => {
    const doVung = () => {
      const top = document.querySelector(".topbar")?.getBoundingClientRect();
      const tab = document.querySelector(".tabbar")?.getBoundingClientRect();
      let t = top ? Math.max(0, top.bottom) : 0;
      let b = 0;
      if (tab) {
        if (tab.top > window.innerHeight / 2) b = Math.max(0, window.innerHeight - tab.top);
        else t = Math.max(t, tab.bottom);
      }
      setVung((v) => (v && v.top === t && v.bottom === b ? v : { top: t, bottom: b }));
    };
    doVung();
    window.addEventListener("resize", doVung);
    const id = setInterval(doVung, 1500);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      window.removeEventListener("resize", doVung);
      clearInterval(id);
      document.body.style.overflow = old;
    };
  }, []);

  /** Toàn màn hình: dùng chế độ toàn màn hình của trình duyệt nếu có (iPhone không có thì phủ kín trang). */
  async function batToan(bat: boolean) {
    const el = toanRef.current;
    if (bat) {
      setToan(true);
      try {
        if (el && el.requestFullscreen && !document.fullscreenElement) await el.requestFullscreen({ navigationUI: "hide" });
      } catch {
        /* không hỗ trợ: vẫn phủ kín bằng CSS */
      }
    } else {
      setToan(false);
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch {
        /* bỏ qua */
      }
    }
  }

  // Bấm Esc hoặc nút quay lại của trình duyệt thì thoát toàn màn hình
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setToan(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!toan) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setToan(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [toan]);
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
      dao: daoMode ? daoPos : null,
      noi: myNoi,
      me: true,
    };
    return [...others, me];
  }, [dong, daoMode, daoPos, myNoi, state.penalty, state.display_name, state.gender, state.level, state.sam_hoi_at]);

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
    const wait = Math.max(0, 1700 - (Date.now() - started));
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

  // Lắc ống xăm: tiếng thẻ tre va lách cách
  useEffect(() => {
    if (phase !== "lac") return;
    const id = setInterval(() => goMo(0.12 + Math.random() * 0.1), 110);
    return () => clearInterval(id);
  }, [phase]);

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
      <section aria-labelledby="cap-tieu-de" className="sr-only">
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
      </section>

      <div
        ref={toanRef}
        className={`cd-toan ${toan ? "is-toan" : "is-day"}`}
        style={toan || !vung ? undefined : { top: vung.top, bottom: vung.bottom }}
      >
        <div ref={canhRef} className="canh-khung" style={{ scrollMarginTop: 90 }}>
          {phase === "lac" && (
            <div className="lac-que" aria-live="polite">
              <div className="lac-que-ong">
                <OngXam shaking />
                <span className="lac-que-the" aria-hidden="true" />
              </div>
              <p>Đang lắc ống xăm…</p>
            </div>
          )}
          {loiChao && (
            <div className="loi-chao" role="status">
              {loiChao}
            </div>
          )}
          {dong ? <Chua3D people={people} maxLevel={max} nangKhung={0.24} onTap={onCham} api={api3d} tamDung={sanChoi} /> : <div className="chua3d" aria-hidden="true" />}
          <button
            type="button"
            className="nut-toan"
            onClick={() => void batToan(!toan)}
            aria-label={toan ? "Thu nhỏ chánh điện" : "Xem chánh điện toàn màn hình"}
          >
            {toan ? "Thu nhỏ" : "Toàn màn hình"}
          </button>
          <button type="button" className="nut-san-choi" onClick={() => setSanChoi(true)} aria-label="Mở Sân chơi">
            Sân chơi
          </button>
          <div className="toan-cap">
            Cấp <b>{state.level}</b>/{max} · {state.cong_duc} công đức{" "}
            <small>
              · {TIER_NAMES[state.tier]} · chuỗi đúng {state.correct_streak}
            </small>
          </div>
        </div>
        <div className="cd-noi stack">
        <p className="canh-ghi">{viTri}</p>

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

      {daoMode && !state.penalty && (
        <section className="giay dao-bang" aria-label="Đi dạo trong chánh điện">
          <p className="muted small" style={{ margin: 0 }}>
            Chạm vào sàn để đi tới đó. Chạm vào sư thầy, chú tiểu hay phật tử để trò chuyện.
          </p>
          {banNoi && Date.now() - banNoi.at < 90_000 && (
            <p className="small" style={{ margin: "6px 0 0" }}>
              Đang trò chuyện với <b>{banNoi.ten}</b>
            </p>
          )}
          <form className="dao-chat" onSubmit={guiLoi}>
            <input
              className="input"
              value={chat}
              maxLength={80}
              placeholder={banNoi ? `Hỏi ${banNoi.ten}…` : "Nói gì đó với mọi người…"}
              onChange={(e) => setChat(e.target.value)}
              aria-label="Lời muốn nói"
            />
            <button type="submit" className="nut" disabled={!chat.trim()}>
              Nói
            </button>
          </form>
          {chatErr && (
            <p className="thong-bao" role="alert" style={{ marginTop: 8 }}>
              {chatErr}
            </p>
          )}
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="nut nut-vang" onClick={() => void batDao(false)}>
              Về chỗ học
            </button>
            <button type="button" className="nut nut-phu" onClick={() => setSanChoi(true)}>
              Sân chơi
            </button>
          </div>
        </section>
      )}

      {!state.penalty && !daoMode && (phase === "cho" || phase === "lac") && (
        <section className="giay xin-que" aria-live="polite">
          <OngXam shaking={phase === "lac"} />
          <h2>{phase === "lac" ? "Đang lắc ống xăm…" : "Xin một quẻ"}</h2>
          <p className="muted xin-que-ghi">
            Câu trắc nghiệm mức {TIER_NAMES[state.tier]}, 30 giây suy nghĩ. Sai thì lên vái Tổ tụng kinh.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <button type="button" className="nut" onClick={xinQue} disabled={phase === "lac"}>
              Xin quẻ
            </button>
            <button type="button" className="nut nut-phu nut-dao" onClick={() => void batDao(true)} disabled={phase === "lac"}>
              Đi dạo
            </button>
            <button type="button" className="nut nut-phu" onClick={() => setSanChoi(true)} disabled={phase === "lac"}>
              Sân chơi
            </button>
          </div>
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
              <div className="dong-ho-vach" style={{ width: `calc((100% - 132px) * ${Math.min(1, conLai / tong).toFixed(3)})` }} />
              <span>{conLai > 0 ? `Còn ${conLai} giây` : "Hết giờ"}</span>
            </div>
          )}
          <div className="la-xam-than">
            <p id="cau-hoi" className="cau-hoi">
              {question.content}
            </p>
            <div
              className={`phuong-an${question.options.every((o) => o.length <= 26) ? " pa-2cot" : ""}`}
              role="radiogroup"
              aria-labelledby="cau-hoi"
            >
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
                      <Mo strike={strike} label={moLabel} size={84} />
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
        </div>
      </div>

      <section className="giay" aria-label="Các mức quẻ">
        <TrangHat level={state.level} max={max} perTier={state.config.levels_per_tier} />
      </section>
      {sanChoi && <SanChoi onDong={() => setSanChoi(false)} />}
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
