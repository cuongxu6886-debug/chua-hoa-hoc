"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { chuong, docTo, isMuted } from "@/lib/sound";
import type { CheDo } from "@/lib/phong3d";
import { useGame } from "./AppShell";
import { useNhiemVu } from "./NhiemVu";

type Engine = {
  setCheDo: (c: CheDo) => void;
  setDoTo: (v: number) => void;
  setGiuHet: (v: boolean) => void;
  noi: (text: string) => void;
  dam: () => void;
  setVideo: (v: HTMLVideoElement | null) => void;
  racHoa: () => void;
  layTho: () => number;
  dispose: () => void;
};

const VIEC: { v: CheDo; ten: string; mo: string }[] = [
  { v: "gao", ten: "Gào thật to", mo: "Giữ nút mà gào, hoặc bật micro gào thật" },
  { v: "het", ten: "Hét lên", mo: "Khum tay hét cho hả" },
  { v: "noi", ten: "Nói hết nỗi niềm", mo: "Gõ hoặc nói, chữ bay ra cửa sổ rồi tan" },
  { v: "dam", ten: "Đấm gối", mo: "Đấm cho đã tay" },
  { v: "samhoi", ten: "Ngồi sám hối", mo: "Thở chậm, nói lời xin lỗi, tha thứ" },
  { v: "xem", ten: "Xem video tĩnh tâm", mo: "Ngồi xem cho lòng lắng lại" },
];

const DAP_LAI = [
  "Mình nghe rồi. Cảm ơn con đã nói ra.",
  "Nói ra được là nhẹ đi một nửa rồi đó.",
  "Không sao đâu, ai cũng có lúc mệt mỏi như vậy.",
  "Con đã cố gắng nhiều rồi. Nghỉ một chút cũng được.",
  "Buông xuống đi con, chuyện gì rồi cũng qua.",
];
const LOI_SAM_HOI = [
  "Con xin lỗi vì đã lười học",
  "Con xin lỗi bố mẹ vì đã làm bố mẹ buồn",
  "Con xin lỗi vì đã nóng giận với bạn",
  "Con tha thứ cho chính mình",
  "Con hứa sẽ chăm chỉ hơn",
];

function coWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Tiếng "bụp" khi đấm gối, tạo bằng Web Audio */
function useAmThanh() {
  const ac = useRef<AudioContext | null>(null);
  const lay = () => {
    if (!ac.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ac.current = new AC();
    }
    if (ac.current.state === "suspended") void ac.current.resume();
    return ac.current;
  };
  const bup = () => {
    const c = lay();
    if (!c || isMuted()) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(140, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(45, c.currentTime + 0.15);
    g.gain.setValueAtTime(0.6, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.22);
  };
  useEffect(
    () => () => {
      void ac.current?.close();
    },
    []
  );
  return { bup, lay };
}

/** Phòng xả stress: chỉ có mình con, gào, hét, nói, đấm gối, sám hối, xem video tĩnh tâm. */
export default function PhongXaStress() {
  const { state } = useGame();
  const nv = useNhiemVu();
  const host = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const eng = useRef<Engine | null>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [cheDo, setCheDoRaw] = useState<CheDo>("binh");
  const [niem, setNiem] = useState(100); // nỗi niềm còn lại (%)
  const [giu, setGiu] = useState(false);
  const [mic, setMic] = useState<"tat" | "bat" | "loi">("tat");
  const [muc, setMuc] = useState(0);
  const [chu, setChu] = useState("");
  const [ngheGiong, setNgheGiong] = useState(false);
  const [tho, setTho] = useState("");
  const [xemTo, setXemTo] = useState(false);
  const [loiNhe, setLoiNhe] = useState<string | null>(null);
  const am = useAmThanh();
  const micRef = useRef<{ stream: MediaStream; an: AnalyserNode; raf: number } | null>(null);
  const nhanGiong = useRef<{ stop: () => void } | null>(null);
  const daNhe = useRef(false);
  const gioi = state.gender === "nu" ? "nu" : "nam";

  // Dựng phòng 3D
  useEffect(() => setWebgl(coWebGL()), []);
  useEffect(() => {
    if (!webgl || !host.current) return;
    let dead = false;
    (async () => {
      const [THREE, { createPhong3D }] = await Promise.all([import("three"), import("@/lib/phong3d")]);
      if (dead || !host.current) return;
      eng.current = createPhong3D(THREE, host.current, { gioi, ten: state.display_name }) as Engine;
    })().catch(() => !dead && setWebgl(false));
    return () => {
      dead = true;
      eng.current?.dispose();
      eng.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webgl]);

  const giam = useCallback((n: number) => {
    setNiem((x) => Math.max(0, x - n));
  }, []);

  // Hết nỗi niềm: nhẹ lòng
  useEffect(() => {
    if (niem > 0 || daNhe.current) return;
    daNhe.current = true;
    nv.bao("xa_stress");
    eng.current?.setCheDo("nhe");
    setCheDoRaw("nhe");
    chuong(0.35);
    const loi = `${state.display_name} giỏi lắm. Nhẹ lòng rồi phải không? Mọi chuyện rồi sẽ ổn thôi.`;
    setLoiNhe(loi);
    docTo(loi, 0.9);
  }, [niem, state.display_name]);

  function chonCheDo(c: CheDo) {
    am.lay();
    // gào, hét: cuộn lên đầu trang để thấy trọn nhân vật, nút giữ nằm ngay trên cảnh
    if ((c === "gao" || c === "het") && window.scrollY > 4) window.scrollTo({ top: 0, behavior: "smooth" });
    setLoiNhe(null);
    setCheDoRaw(c);
    eng.current?.setCheDo(c);
    const v = videoRef.current;
    if (c === "xem" && v) {
      eng.current?.setVideo(v);
      v.currentTime = v.ended ? 0 : v.currentTime;
      v.muted = false;
      void v.play().catch(() => undefined);
    } else if (v && !v.paused) {
      v.pause();
      eng.current?.setVideo(null);
    }
    if (c !== "gao" && c !== "het") tatMic();
    if (c === "samhoi") docTo("Ngồi thẳng lưng, nhắm mắt lại. Hít vào thật sâu, rồi thở ra thật chậm.", 0.85);
    if (c === "noi") docTo("Con cứ nói hết ra đi, ở đây chỉ có mình con thôi.", 0.9);
    if (c === "gao") docTo("Gào thật to đi con, cho hết bực bội.", 0.95);
    if (c === "het") docTo("Hét lên nào!", 1);
  }

  /* ---------- Gào, hét: giữ nút hoặc micro ---------- */
  useEffect(() => {
    if (!giu) return;
    const id = setInterval(() => giam(cheDo === "gao" ? 0.45 : 0.4), 100);
    return () => clearInterval(id);
  }, [giu, cheDo, giam]);

  function giuHet(on: boolean) {
    setGiu(on);
    eng.current?.setGiuHet(on);
  }
  /** Bấm giữ nút hét/gào: thả tay ở đâu cũng dừng */
  function batDauGiu(e: React.PointerEvent) {
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* bỏ qua */
    }
    giuHet(true);
    const tha = () => {
      giuHet(false);
      window.removeEventListener("pointerup", tha);
      window.removeEventListener("pointercancel", tha);
      window.removeEventListener("blur", tha);
    };
    window.addEventListener("pointerup", tha);
    window.addEventListener("pointercancel", tha);
    window.addEventListener("blur", tha);
  }

  async function batMic() {
    if (micRef.current) return tatMic();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      const c = am.lay();
      if (!c) throw new Error("no audio");
      const src = c.createMediaStreamSource(stream);
      const an = c.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);
      let tich = 0;
      const doc = () => {
        an.getFloatTimeDomainData(buf);
        let s = 0;
        for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        const v = Math.min(1, Math.sqrt(s / buf.length) * 5);
        eng.current?.setDoTo(v);
        setMuc(v);
        if (v > 0.15) {
          tich += v;
          if (tich > 6) {
            giam(1);
            tich = 0;
          }
        }
        if (micRef.current) micRef.current.raf = requestAnimationFrame(doc);
      };
      micRef.current = { stream, an, raf: requestAnimationFrame(doc) };
      setMic("bat");
    } catch {
      setMic("loi");
    }
  }
  function tatMic() {
    const m = micRef.current;
    if (!m) return;
    cancelAnimationFrame(m.raf);
    m.stream.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    eng.current?.setDoTo(0);
    setMuc(0);
    setMic("tat");
  }
  useEffect(() => () => tatMic(), []);

  /* ---------- Nói hết nỗi niềm ---------- */
  function thaVaoGio() {
    const text = chu.trim();
    if (!text) return;
    eng.current?.noi(text);
    setChu("");
    giam(Math.min(25, 8 + text.length / 8));
    setTimeout(() => docTo(DAP_LAI[Math.floor(Math.random() * DAP_LAI.length)], 0.9), 2600);
  }
  function noiBangGiong() {
    if (nhanGiong.current) {
      nhanGiong.current.stop();
      nhanGiong.current = null;
      setNgheGiong(false);
      return;
    }
    const W = window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR) {
      alert("Trình duyệt này chưa nhận được giọng nói. Con gõ chữ nhé.");
      return;
    }
    const r = new SR();
    r.lang = "vi-VN";
    r.interimResults = true;
    r.continuous = true;
    let goc = chu ? chu + " " : "";
    r.onresult = (e: any) => {
      let tam = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const x = e.results[i];
        if (x.isFinal) goc += x[0].transcript + " ";
        else tam += x[0].transcript;
      }
      setChu((goc + tam).slice(0, 400));
    };
    r.onend = () => {
      nhanGiong.current = null;
      setNgheGiong(false);
    };
    r.onerror = () => {
      nhanGiong.current = null;
      setNgheGiong(false);
    };
    r.start();
    nhanGiong.current = r;
    setNgheGiong(true);
  }

  /* ---------- Đấm gối ---------- */
  function damGoi() {
    eng.current?.dam();
    am.bup();
    giam(2);
  }
  useEffect(() => {
    if (cheDo !== "dam") return;
    const k = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        damGoi();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheDo]);

  /* ---------- Sám hối: thở theo nhịp ---------- */
  useEffect(() => {
    if (cheDo !== "samhoi") return;
    let truoc = "";
    const id = setInterval(() => {
      const p = eng.current?.layTho() ?? 0;
      const pha = p < 0.4 ? "Hít vào thật sâu…" : "Thở ra thật chậm…";
      setTho(pha);
      if (pha !== truoc) {
        truoc = pha;
        if (p < 0.4) chuong(0.12);
        giam(1.5);
      }
    }, 250);
    return () => clearInterval(id);
  }, [cheDo, giam]);
  function noiSamHoi(loi: string) {
    nv.bao("sam_hoi");
    eng.current?.noi(loi);
    docTo(loi, 0.85, gioi);
    giam(8);
  }

  /* ---------- Xem video ---------- */
  useEffect(() => {
    if (cheDo !== "xem") return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (v && !v.paused) giam(0.6);
    }, 1000);
    return () => clearInterval(id);
  }, [cheDo, giam]);

  function batDauLai() {
    daNhe.current = false;
    setNiem(100);
    setLoiNhe(null);
    chonCheDo("binh");
  }


  const mauNiem = niem > 60 ? "#d2402a" : niem > 25 ? "#e8a33a" : "#5dae84";

  return (
    <main className="xs">
      <div className="xs-canh">
        {webgl === false ? (
          <div className="xs-khong3d">Máy này chưa chạy được cảnh 3D. Con vẫn có thể xem video tĩnh tâm bên dưới.</div>
        ) : (
          <div ref={host} className="xs-host" />
        )}
        <div className="xs-dau">
          <div>
            <h1>Phòng xả stress</h1>
            <p>Chỉ có mình con ở đây. Không ai nghe, không ai đọc, không lưu lại. Kéo để xoay phòng.</p>
          </div>
          <Link href="/chanh-dien?tu=xa-stress" className="nut nut-nho nut-vang">
            Ra sân chơi
          </Link>
        </div>
        <div className="xs-niem" aria-label={`Nỗi niềm còn ${Math.round(niem)} phần trăm`}>
          <span>Nỗi niềm</span>
          <i style={{ width: `${niem}%`, background: mauNiem }} />
          <b>{Math.round(niem)}%</b>
        </div>
        {(cheDo === "gao" || cheDo === "het") && (
          <button
            type="button"
            className={`xs-het-noi${giu ? " is-giu" : ""}`}
            onPointerDown={batDauGiu}
            onContextMenu={(e) => e.preventDefault()}
          >
            {cheDo === "gao" ? "Giữ để GÀO" : "Giữ để HÉT"}
          </button>
        )}
        {cheDo === "samhoi" && tho && <div className="xs-tho">{tho}</div>}
        {loiNhe && <div className="xs-nhe">{loiNhe}</div>}
      </div>

      <section className="xs-bang">
        <div className="xs-viec" role="group" aria-label="Chọn cách xả stress">
          {VIEC.map((v) => (
            <button key={v.v} type="button" className={`xs-o${cheDo === v.v ? " is-chon" : ""}`} onClick={() => chonCheDo(v.v)}>
              <b>{v.ten}</b>
              <small>{v.mo}</small>
            </button>
          ))}
        </div>

        {(cheDo === "gao" || cheDo === "het") && (
          <div className="xs-chi">
            <button
              type="button"
              className={`xs-het${giu ? " is-giu" : ""}`}
              onPointerDown={batDauGiu}
              onContextMenu={(e) => e.preventDefault()}
            >
              {cheDo === "gao" ? "Giữ để GÀO" : "Giữ để HÉT"}
            </button>
            <div className="xs-mic">
              <button type="button" className="nut nut-phu nut-nho" onClick={() => void batMic()}>
                {mic === "bat" ? "Tắt micro" : "Bật micro để hét thật"}
              </button>
              {mic === "bat" && (
                <span className="xs-muc" aria-label="Độ to">
                  <i style={{ width: `${Math.round(muc * 100)}%` }} />
                </span>
              )}
              <small>
                {mic === "loi"
                  ? "Chưa mở được micro. Con cho phép micro trong trình duyệt rồi bấm lại nhé."
                  : "Micro chỉ dùng để đo độ to ngay trên máy, không ghi âm, không gửi đi đâu."}
              </small>
            </div>
          </div>
        )}

        {cheDo === "noi" && (
          <div className="xs-chi">
            <textarea
              className="input"
              rows={3}
              maxLength={400}
              value={chu}
              onChange={(e) => setChu(e.target.value)}
              placeholder="Có chuyện gì làm con buồn, con mệt, con bực… cứ viết hết ra đây."
            />
            <div className="row" style={{ marginTop: 8, flexWrap: "nowrap" }}>
              <button type="button" className="nut nut-vang" style={{ flex: 1 }} disabled={!chu.trim()} onClick={thaVaoGio}>
                Thả vào gió
              </button>
              <button type="button" className="nut nut-phu" onClick={noiBangGiong}>
                {ngheGiong ? "Dừng nghe" : "Nói bằng giọng"}
              </button>
            </div>
            <small className="xs-ghi">Chữ bay ra cửa sổ rồi tan đi, không lưu lại ở đâu cả.</small>
          </div>
        )}

        {cheDo === "dam" && (
          <div className="xs-chi">
            <button type="button" className="xs-het" onClick={damGoi}>
              Đấm!
            </button>
            <small className="xs-ghi">Bấm liên tục, hoặc nhấn phím cách trên máy tính.</small>
          </div>
        )}

        {cheDo === "samhoi" && (
          <div className="xs-chi">
            <p style={{ margin: "0 0 8px" }}>Chọn một lời muốn nói với Ông Tổ, với người thân, hoặc với chính mình:</p>
            <div className="xs-loi">
              {LOI_SAM_HOI.map((l) => (
                <button key={l} type="button" className="chip-chon" onClick={() => noiSamHoi(l)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {cheDo === "xem" && (
          <div className="xs-chi">
            <p style={{ margin: "0 0 8px" }}>Video đang chiếu trên tivi trong phòng.</p>
            <button type="button" className="nut nut-phu" onClick={() => setXemTo(true)}>
              Xem to cả màn hình
            </button>
          </div>
        )}

        {cheDo === "nhe" && (
          <div className="xs-chi">
            <button type="button" className="nut nut-vang" onClick={batDauLai}>
              Ở lại thêm chút nữa
            </button>
          </div>
        )}

      </section>

      <div className={`xs-video${xemTo ? " is-to" : ""}`}>
        <video
          ref={videoRef}
          src="/xa-stress/tam-tinh.mp4"
          poster="/xa-stress/tam-tinh.jpg"
          playsInline
          preload="metadata"
          controls={xemTo}
          onEnded={() => {
            nv.bao("xem_video");
            giam(15);
            chuong(0.25);
          }}
        />
        {xemTo && (
          <button type="button" className="nut nut-vang xs-dong" onClick={() => setXemTo(false)}>
            Thu nhỏ
          </button>
        )}
      </div>
    </main>
  );
}
