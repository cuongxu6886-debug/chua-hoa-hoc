"use client";

/* Phần dùng chung cho các trò ở sân chơi: luật sân chùa, lời Ông Tổ và chú tiểu, khán giả, vòng lặp vẽ. */
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { docTo, voTay } from "@/lib/sound";
import OngTo from "./OngTo";

export type Tro = "caro" | "dauho" | "nemcon" | "duaxe" | "covua" | "keoco" | "cangua";
/** Đối thủ: Ông Tổ (luôn thắng), Chú tiểu (thắng được), bạn chung máy, hoặc chơi một mình. */
export type Doi = "to" | "tieu" | "ban" | "mot";
export const TEN_DOI: Record<Doi, string> = { to: "Ông Tổ", tieu: "Chú tiểu", ban: "Bạn 2", mot: "" };

export function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}
export function docKiLuc(k: string) {
  try {
    return Number(localStorage.getItem("chua-ki-luc-" + k) || 0);
  } catch {
    return 0;
  }
}
export function ghiKiLuc(k: string, v: number) {
  try {
    if (v > docKiLuc(k)) localStorage.setItem("chua-ki-luc-" + k, String(v));
  } catch {
    /* bỏ qua */
  }
}

/* Lời Ông Tổ trêu đệ tử */
export const TO_NOI = {
  batDau: ["Con muốn thách Tổ à? Hay lắm, vào đây.", "Tổ chơi trò này từ thời giả kim thuật rồi.", "Thắng được Tổ thì Tổ cho lên cấp 100!"],
  toDi: ["Nước này Tổ tính từ hôm qua.", "Phản ứng này tỏa nhiệt đấy con.", "Bình tĩnh, chậm mà chắc."],
  phep: ["Hừm! Tổ phất tay, quân này giờ là của Tổ.", "Chất xúc tác của Tổ đổi chiều phản ứng rồi.", "Gần thắng thì Tổ biến hóa, đó là cân bằng hóa học!"],
  toThang: ["Tổ thắng! Về học thêm rồi thách Tổ tiếp nhé.", "Ha ha, Tổ vẫn là Tổ. Con chơi rất khá đấy.", "Thua Tổ là chuyện thường, thua bài kiểm tra mới đáng lo."],
  queVang: ["Hòa à? Tổ có que vàng đây!", "Tổ ném thêm que vàng, chịu chưa con?"],
};
/* Lời chú tiểu */
export const TIEU_NOI = {
  batDau: ["Chú tiểu xin thỉnh giáo thí chủ một ván!", "Thí chủ nhẹ tay nhé, chú tiểu mới tập thôi.", "Mô Phật, mình chơi vui thôi nha."],
  thang: ["Mô Phật, chú tiểu thắng rồi!", "Hì hì, may quá chú tiểu thắng.", "Chú tiểu thắng! Thí chủ chơi lại không?"],
  thua: ["Thí chủ giỏi quá, chú tiểu chịu thua.", "Mô Phật, thí chủ thắng rồi!", "Chú tiểu phải tập thêm thôi."],
};

/** Luật sân chùa: thua thì vào vái Tổ ba vái rồi ra chơi tiếp. */
export const LuatSan = createContext<{ thua: (loi: string) => void; thang: () => void; choi: (tro: Tro) => void }>({
  thua: () => {},
  thang: () => {},
  choi: () => {},
});
export function noiDoi(doi: Doi, text: string) {
  if (doi === "to") docTo(text, 0.95, "nam");
  else if (doi === "tieu") docTo(text, 1.05, "nam");
}

/* =========================== Dùng chung =========================== */

export function ToNoi({ text, ai = "to" }: { text: string | null; ai?: Doi }) {
  if (!text || (ai !== "to" && ai !== "tieu")) return null;
  return (
    <div className="to-noi" aria-live="polite">
      {ai === "to" ? <OngTo className="to-noi-hinh" mood="vui" /> : <ChuTieu />}
      <p>{text}</p>
    </div>
  );
}

export function ChuTieu() {
  return (
    <svg viewBox="0 0 64 64" className="to-noi-hinh" aria-hidden="true">
      <path d="M12 64c2-14 10-20 20-20s18 6 20 20z" fill="#d98a2b" />
      <path d="M26 46l6 8 6-8" fill="none" stroke="#a8641c" strokeWidth="2.5" />
      <circle cx="32" cy="28" r="16" fill="#f0c39a" />
      <circle cx="32" cy="12.5" r="3" fill="#2b1d16" />
      <circle cx="26" cy="28" r="1.8" fill="#24160f" />
      <circle cx="38" cy="28" r="1.8" fill="#24160f" />
      <path d="M27 35q5 4 10 0" fill="none" stroke="#b0442e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="33" r="2.4" fill="#f2a7b8" opacity=".7" />
      <circle cx="42" cy="33" r="2.4" fill="#f2a7b8" opacity=".7" />
    </svg>
  );
}

export function PhaoGiay({ chay }: { chay: boolean }) {
  if (!chay) return null;
  return (
    <div className="phao-giay" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.08}s`, background: ["#e2b957", "#d2402a", "#5dae84", "#f3ead6"][i % 4] }} />
      ))}
    </div>
  );
}

export const NHAN_DOI: [Doi, string][] = [
  ["to", "Thi với Ông Tổ"],
  ["tieu", "Thi với Chú tiểu"],
  ["ban", "Hai bạn chung máy"],
  ["mot", "Chơi một mình"],
];
export function ChonDoi({ doi, setDoi, co }: { doi: Doi; setDoi: (v: Doi) => void; co?: Doi[] }) {
  return (
    <div className="row" style={{ marginBottom: 10 }}>
      {NHAN_DOI.filter(([v]) => !co || co.includes(v)).map(([v, ten]) => (
        <button key={v} type="button" className={`chip-chon${doi === v ? " is-chon" : ""}`} onClick={() => setDoi(v)}>
          {ten}
        </button>
      ))}
    </div>
  );
}

export function useVongLap(cb: (dt: number) => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const f = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!document.hidden) ref.current(dt);
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, []);
}

export function useCanvas(w: number, h: number) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * dpr;
    c.height = h * dpr;
    c.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [w, h]);
  return ref;
}

/** Nền sân chùa lúc chiều: trời hoàng hôn, mái cong, cột son, đèn lồng, sân gạch. */
export const nenCache = new Map<string, HTMLCanvasElement>();
export function nenSanChua(g: CanvasRenderingContext2D, w: number, h: number, dat: number, t: number) {
  const key = `${w}x${h}x${dat}`;
  let c = nenCache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = w * 2;
    c.height = h * 2;
    const x = c.getContext("2d")!;
    x.scale(2, 2);
    const sky = x.createLinearGradient(0, 0, 0, dat);
    sky.addColorStop(0, "#2b1a3a");
    sky.addColorStop(0.55, "#b4533a");
    sky.addColorStop(1, "#f0b56a");
    x.fillStyle = sky;
    x.fillRect(0, 0, w, dat);
    // mặt trời lặn
    x.fillStyle = "rgba(255,220,150,0.85)";
    x.beginPath();
    x.arc(w * 0.78, dat - 26, 22, 0, Math.PI * 2);
    x.fill();
    // mái chùa cong
    x.fillStyle = "#2a120d";
    x.beginPath();
    x.moveTo(-10, 46);
    x.quadraticCurveTo(w * 0.12, 30, w * 0.18, 12);
    x.lineTo(w * 0.82, 12);
    x.quadraticCurveTo(w * 0.88, 30, w + 10, 46);
    x.lineTo(w + 10, 58);
    x.lineTo(-10, 58);
    x.fill();
    x.fillStyle = "#c79a3e";
    x.fillRect(0, 56, w, 3);
    // cột son
    x.fillStyle = "#8e2416";
    x.fillRect(8, 58, 12, dat - 58);
    x.fillRect(w - 20, 58, 12, dat - 58);
    // sân gạch
    const san = x.createLinearGradient(0, dat, 0, h);
    san.addColorStop(0, "#9a8670");
    san.addColorStop(1, "#6e5d4c");
    x.fillStyle = san;
    x.fillRect(0, dat, w, h - dat);
    x.strokeStyle = "rgba(40,25,15,0.25)";
    x.lineWidth = 1;
    for (let yy = dat + 10; yy < h; yy += 14) {
      x.beginPath();
      x.moveTo(0, yy);
      x.lineTo(w, yy);
      x.stroke();
    }
    for (let xx = -h; xx < w + h; xx += 28) {
      x.beginPath();
      x.moveTo(xx, dat);
      x.lineTo(xx + (h - dat) * 0.6, h);
      x.stroke();
    }
    nenCache.set(key, c);
  }
  g.drawImage(c, 0, 0, w, h);
  // đèn lồng đung đưa
  for (const [lx, i] of [
    [w * 0.3, 0],
    [w * 0.7, 1],
  ] as const) {
    const sw = Math.sin(t * 1.4 + i) * 3;
    g.strokeStyle = "#2a1a12";
    g.beginPath();
    g.moveTo(lx, 58);
    g.lineTo(lx + sw, 70);
    g.stroke();
    g.fillStyle = "#d2402a";
    g.beginPath();
    g.ellipse(lx + sw, 80, 9, 11, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,200,120,0.35)";
    g.beginPath();
    g.ellipse(lx + sw, 80, 16, 18, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#c79a3e";
    g.fillRect(lx + sw - 5, 68, 10, 3);
  }
}

/** Người ném: đệ tử (áo xám) hoặc Ông Tổ (áo xanh, râu bạc). */
export function veNguoi(g: CanvasRenderingContext2D, x: number, y: number, to: boolean, tay: number) {
  g.fillStyle = to ? "#1f5a45" : "#b8b1a3";
  g.beginPath();
  g.moveTo(x - 13, y + 34);
  g.lineTo(x - 9, y + 10);
  g.lineTo(x + 9, y + 10);
  g.lineTo(x + 13, y + 34);
  g.fill();
  g.strokeStyle = to ? "#1f5a45" : "#b8b1a3";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x + 6, y + 14);
  g.lineTo(x + 6 + Math.cos(tay) * 14, y + 14 - Math.sin(tay) * 14);
  g.stroke();
  g.fillStyle = "#e8b48a";
  g.beginPath();
  g.arc(x, y, 9, 0, Math.PI * 2);
  g.fill();
  if (to) {
    g.fillStyle = "#24160f";
    g.fillRect(x - 10, y - 10, 20, 6);
    g.fillStyle = "#f3efe6";
    g.beginPath();
    g.moveTo(x - 6, y + 4);
    g.lineTo(x + 6, y + 4);
    g.lineTo(x, y + 20);
    g.fill();
  }
}

export function veLuc(g: CanvasRenderingContext2D, luc: number) {
  g.fillStyle = "rgba(0,0,0,0.4)";
  g.fillRect(12, 12, 120, 10);
  g.fillStyle = luc > 0.75 ? "#d2402a" : luc > 0.4 ? "#e2b957" : "#5dae84";
  g.fillRect(12, 12, 120 * luc, 10);
  g.strokeStyle = "#e2b957";
  g.lineWidth = 1;
  g.strokeRect(12, 12, 120, 10);
  g.fillStyle = "#f3ead6";
  g.font = "600 10px 'Be Vietnam Pro', system-ui";
  g.fillText("LỰC", 138, 21);
}

/* Khán giả quanh sân: đứng ở mép sân, reo hò khi có người ghi điểm */
export const AO_KHAN_GIA = ["#b8b1a3", "#7f98ab", "#c9772a", "#7a5a3e", "#d98a2b", "#8a9fae", "#b0442e"];
export const LOI_REO = ["Hay quá!", "Tuyệt!", "Giỏi!", "Hoan hô!", "Đỉnh!"];
export const LOI_CO_VU = ["Cố lên!", "Ném đi!", "Bình tĩnh!", "Cố lên con!"];
export type CoVu = { t: number; loi: string[]; nhay: boolean };

export function moiCoVu(): CoVu {
  return { t: 0, loi: [], nhay: false };
}
export function reo(cv: CoVu, manh = true) {
  cv.t = manh ? 1.8 : 1.1;
  cv.nhay = manh;
  cv.loi = [pick(manh ? LOI_REO : LOI_CO_VU), pick(manh ? LOI_REO : LOI_CO_VU)];
  if (manh) voTay(0.3, 1.3);
}
/** Gọi mỗi khung hình: thỉnh thoảng khán giả tự hô cổ vũ. */
export function capNhatCoVu(cv: CoVu, dt: number) {
  if (cv.t > 0) cv.t -= dt;
  else if (Math.random() < dt * 0.12) reo(cv, false);
}

export function veKhanGia(g: CanvasRenderingContext2D, w: number, y0: number, t: number, cv: CoVu, tranh: [number, number][] = []) {
  const so = Math.floor(w / 26);
  for (let i = 0; i < so; i++) {
    const x = 26 + i * ((w - 52) / (so - 1));
    if (tranh.some(([a, b]) => x > a && x < b)) continue;
    const ao = AO_KHAN_GIA[(i * 3) % AO_KHAN_GIA.length];
    const nu = i % 3 === 1;
    const nhay = cv.t > 0 ? (cv.nhay ? Math.abs(Math.sin(t * 11 + i * 1.7)) * 7 : Math.abs(Math.sin(t * 6 + i)) * 2) : Math.sin(t * 1.5 + i) * 0.6;
    const y = y0 - nhay;
    g.fillStyle = ao;
    g.beginPath();
    g.moveTo(x - 7, y + 14);
    g.lineTo(x - 5, y + 2);
    g.lineTo(x + 5, y + 2);
    g.lineTo(x + 7, y + 14);
    g.fill();
    if (cv.t > 0) {
      // giơ tay reo
      g.strokeStyle = ao;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(x - 4, y + 4);
      g.lineTo(x - 8, y - 6 - (i % 2) * 2);
      g.moveTo(x + 4, y + 4);
      g.lineTo(x + 8, y - 6 - ((i + 1) % 2) * 2);
      g.stroke();
    }
    g.fillStyle = nu ? "#2b1d16" : "#e8b48a";
    g.beginPath();
    g.arc(x, y - 2, 5, 0, Math.PI * 2);
    g.fill();
    if (nu) {
      g.beginPath();
      g.arc(x, y - 7, 2.5, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (cv.t > 0 && cv.loi.length) {
    g.font = "700 11px 'Be Vietnam Pro', system-ui";
    cv.loi.forEach((loi, k) => {
      const x = k === 0 ? w * 0.22 : w * 0.66;
      const y = y0 - 26 - (k % 2) * 6;
      const tw = g.measureText(loi).width + 12;
      g.fillStyle = "rgba(255,248,232,0.95)";
      g.beginPath();
      g.roundRect(x - tw / 2, y - 10, tw, 18, 8);
      g.fill();
      g.fillStyle = "#24160f";
      g.textAlign = "center";
      g.fillText(loi, x, y + 3);
      g.textAlign = "start";
    });
  }
}

/** Khán giả cho trò cờ caro (không dùng canvas). */
export function KhanGiaDom({ cv }: { cv: { reo: number; loi: string; nhay: boolean } }) {
  return (
    <div className={`khan-gia${cv.reo ? (cv.nhay ? " is-reo" : " is-ho") : ""}`} aria-hidden="true">
      {Array.from({ length: 11 }, (_, i) => (
        <span key={i} className={`kg kg-${i % 4}`} style={{ animationDelay: `${(i % 5) * 0.07}s` }} />
      ))}
      {cv.reo > 0 && <b className="kg-loi">{cv.loi}</b>}
    </div>
  );
}

export function useCoVuDom() {
  const [cv, setCv] = useState({ reo: 0, loi: "", nhay: false });
  const reoDom = useCallback((manh: boolean) => {
    setCv({ reo: Date.now(), loi: pick(manh ? LOI_REO : LOI_CO_VU), nhay: manh });
    if (manh) voTay(0.3, 1.3);
  }, []);
  useEffect(() => {
    if (!cv.reo) return;
    const id = setTimeout(() => setCv((c) => ({ ...c, reo: 0 })), 1800);
    return () => clearTimeout(id);
  }, [cv.reo]);
  useEffect(() => {
    const id = setInterval(() => Math.random() < 0.35 && reoDom(false), 7000);
    return () => clearInterval(id);
  }, [reoDom]);
  return { cv, reoDom };
}

