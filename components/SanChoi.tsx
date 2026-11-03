"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorText } from "@/lib/game";
import { chuong, docTo, goMo, voTay } from "@/lib/sound";
import OngTo from "./OngTo";
import DuaXe3D from "./DuaXe3D";
import { useNhiemVu } from "./NhiemVu";

export type Tro = "caro" | "dauho" | "nemcon" | "duaxe";
/** Đối thủ: Ông Tổ (luôn thắng), Chú tiểu (thắng được), bạn chung máy, hoặc chơi một mình. */
type Doi = "to" | "tieu" | "ban" | "mot";
const TEN_DOI: Record<Doi, string> = { to: "Ông Tổ", tieu: "Chú tiểu", ban: "Bạn 2", mot: "" };

const TRO: { v: Tro; ten: string }[] = [
  { v: "caro", ten: "Cờ caro" },
  { v: "dauho", ten: "Ném que vào ống" },
  { v: "nemcon", ten: "Ném còn" },
  { v: "duaxe", ten: "Đua xe" },
];

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}
function docKiLuc(k: string) {
  try {
    return Number(localStorage.getItem("chua-ki-luc-" + k) || 0);
  } catch {
    return 0;
  }
}
function ghiKiLuc(k: string, v: number) {
  try {
    if (v > docKiLuc(k)) localStorage.setItem("chua-ki-luc-" + k, String(v));
  } catch {
    /* bỏ qua */
  }
}

/* Lời Ông Tổ trêu đệ tử */
const TO_NOI = {
  batDau: ["Con muốn thách Tổ à? Hay lắm, vào đây.", "Tổ chơi trò này từ thời giả kim thuật rồi.", "Thắng được Tổ thì Tổ cho lên cấp 100!"],
  toDi: ["Nước này Tổ tính từ hôm qua.", "Phản ứng này tỏa nhiệt đấy con.", "Bình tĩnh, chậm mà chắc."],
  phep: ["Hừm! Tổ phất tay, quân này giờ là của Tổ.", "Chất xúc tác của Tổ đổi chiều phản ứng rồi.", "Gần thắng thì Tổ biến hóa, đó là cân bằng hóa học!"],
  toThang: ["Tổ thắng! Về học thêm rồi thách Tổ tiếp nhé.", "Ha ha, Tổ vẫn là Tổ. Con chơi rất khá đấy.", "Thua Tổ là chuyện thường, thua bài kiểm tra mới đáng lo."],
  queVang: ["Hòa à? Tổ có que vàng đây!", "Tổ ném thêm que vàng, chịu chưa con?"],
};
/* Lời chú tiểu */
const TIEU_NOI = {
  batDau: ["Chú tiểu xin thỉnh giáo thí chủ một ván!", "Thí chủ nhẹ tay nhé, chú tiểu mới tập thôi.", "Mô Phật, mình chơi vui thôi nha."],
  thang: ["Mô Phật, chú tiểu thắng rồi!", "Hì hì, may quá chú tiểu thắng.", "Chú tiểu thắng! Thí chủ chơi lại không?"],
  thua: ["Thí chủ giỏi quá, chú tiểu chịu thua.", "Mô Phật, thí chủ thắng rồi!", "Chú tiểu phải tập thêm thôi."],
};

/** Luật sân chùa: thua thì vào vái Tổ ba vái rồi ra chơi tiếp. */
const LuatSan = createContext<{ thua: (loi: string) => void; thang: () => void; choi: (tro: Tro) => void }>({
  thua: () => {},
  thang: () => {},
  choi: () => {},
});
function noiDoi(doi: Doi, text: string) {
  if (doi === "to") docTo(text, 0.95, "nam");
  else if (doi === "tieu") docTo(text, 1.05, "nam");
}

/** Sân chơi lúc nghỉ học: cờ caro, ném que vào ống (đầu hồ), ném còn, đua xe. */
export default function SanChoi({
  onDong,
  trang = false,
  troDau = "caro",
  onThua,
  nhanDong = "Về chánh điện",
}: {
  onDong: () => void;
  trang?: boolean;
  troDau?: Tro;
  /** Thua một ván: nơi gọi đưa nhân vật vào vái Tổ (không có thì vái ngay trên màn hình). */
  onThua?: () => void;
  nhanDong?: string;
}) {
  const [tro, setTro] = useState<Tro>(troDau);
  const [phat, setPhat] = useState<string | null>(null);
  const [vai, setVai] = useState(0);
  const onThuaRef = useRef(onThua);
  onThuaRef.current = onThua;
  const nv = useNhiemVu();
  const baoRef = useRef(nv.bao);
  baoRef.current = nv.bao;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !phat && onDong();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onDong, phat]);

  const luat = useMemo(
    () => ({
      thua: (loi: string) => {
        setPhat(loi);
        setVai(0);
        docTo("Thua rồi! Theo luật sân chùa, con vào vái Tổ ba vái rồi ra chơi tiếp nhé.", 1);
      },
      thang: () => {
        voTay(0.4, 1.6);
        baoRef.current("thang");
      },
      choi: (tro: Tro) => baoRef.current(`choi_${tro}` as "choi_caro"),
    }),
    []
  );

  function diVai() {
    if (onThuaRef.current) {
      setPhat(null);
      onThuaRef.current();
      return;
    }
    // Không có cảnh 3D: vái ngay trước Ông Tổ trên màn hình
    let n = 0;
    const id = setInterval(() => {
      n++;
      setVai(n);
      goMo(0.35);
      if (n >= 3) {
        clearInterval(id);
        setTimeout(() => {
          setPhat(null);
          setVai(0);
          docTo("Vái Tổ xong rồi, con chơi tiếp nhé.", 1);
        }, 900);
      }
    }, 900);
  }

  return (
    <LuatSan.Provider value={luat}>
      <div
        className={`san-choi${trang ? " san-choi-trang" : ""}`}
        role={trang ? undefined : "dialog"}
        aria-modal={trang ? undefined : true}
        aria-label="Sân chơi"
      >
        <div className="san-choi-khung">
          <div className="san-choi-dau">
            {trang ? <h1>Sân chơi</h1> : <h2>Sân chơi</h2>}
            <button type="button" className="nut nut-nho nut-vang" onClick={onDong}>
              {nhanDong}
            </button>
          </div>
          <div className="san-choi-tab" role="tablist">
            {TRO.map((t) => (
              <button key={t.v} type="button" role="tab" aria-selected={tro === t.v} onClick={() => setTro(t.v)}>
                {t.ten}
              </button>
            ))}
          </div>
          <p className="luat-san small">Luật sân chùa: thua ván nào thì vào vái Tổ ba vái rồi ra chơi tiếp.</p>
          <div className="san-choi-than">
            {tro === "caro" && <Caro />}
            {tro === "dauho" && <DauHo />}
            {tro === "nemcon" && <NemCon />}
            {tro === "duaxe" && <DuaXe3D duPhong={<DuaXe />} onThua={luat.thua} onThang={luat.thang} onChoi={() => luat.choi("duaxe")} bac={nv.bac.so} />}
          </div>
        </div>
        {phat && (
          <div className="phat-vai" role="alertdialog" aria-label="Thua rồi">
            <div className="phat-vai-khung">
              <OngTo className={`phat-vai-to${vai ? " is-vai" : ""}`} mood="vui" />
              <h3>Thua rồi!</h3>
              <p>{phat} Theo luật sân chùa, con vào vái Tổ ba vái rồi ra chơi tiếp.</p>
              {vai > 0 ? (
                <p className="phat-vai-dem">Vái {vai}…</p>
              ) : (
                <button type="button" className="nut nut-vang" onClick={diVai}>
                  Vào vái Tổ
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </LuatSan.Provider>
  );
}

/* =========================== Dùng chung =========================== */

function ToNoi({ text, ai = "to" }: { text: string | null; ai?: Doi }) {
  if (!text || (ai !== "to" && ai !== "tieu")) return null;
  return (
    <div className="to-noi" aria-live="polite">
      {ai === "to" ? <OngTo className="to-noi-hinh" mood="vui" /> : <ChuTieu />}
      <p>{text}</p>
    </div>
  );
}

function ChuTieu() {
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

function PhaoGiay({ chay }: { chay: boolean }) {
  if (!chay) return null;
  return (
    <div className="phao-giay" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.08}s`, background: ["#e2b957", "#d2402a", "#5dae84", "#f3ead6"][i % 4] }} />
      ))}
    </div>
  );
}

const NHAN_DOI: [Doi, string][] = [
  ["to", "Thi với Ông Tổ"],
  ["tieu", "Thi với Chú tiểu"],
  ["ban", "Hai bạn chung máy"],
  ["mot", "Chơi một mình"],
];
function ChonDoi({ doi, setDoi, co }: { doi: Doi; setDoi: (v: Doi) => void; co?: Doi[] }) {
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

/* =========================== Cờ caro =========================== */

const N = 15;
type O = (0 | 1 | 2)[];

/** Trả về các ô tạo thành 5 quân liền (nếu có) qua nước vừa đi. */
export function duongThang(o: O, last: number): number[] | null {
  if (last < 0 || o[last] === 0) return null;
  const who = o[last];
  const r = Math.floor(last / N);
  const c = last % N;
  for (const [dr, dc] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]) {
    const cells = [last];
    for (const s of [1, -1]) {
      let rr = r + s * dr;
      let cc = c + s * dc;
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && o[rr * N + cc] === who) {
        cells.push(rr * N + cc);
        rr += s * dr;
        cc += s * dc;
      }
    }
    if (cells.length >= 5) return cells;
  }
  return null;
}

/** Máy chơi caro: chấm điểm từng ô theo thế công và thế thủ. */
export function mayDi(o: O, may: 1 | 2, manh = 1): number {
  const nguoi = may === 1 ? 2 : 1;
  const diem = (cell: number, who: 1 | 2) => {
    const r = Math.floor(cell / N);
    const c = cell % N;
    let tong = 0;
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ]) {
      let dem = 1;
      let mo = 0;
      for (const s of [1, -1]) {
        let rr = r + s * dr;
        let cc = c + s * dc;
        while (rr >= 0 && rr < N && cc >= 0 && cc < N && o[rr * N + cc] === who) {
          dem++;
          rr += s * dr;
          cc += s * dc;
        }
        if (rr >= 0 && rr < N && cc >= 0 && cc < N && o[rr * N + cc] === 0) mo++;
      }
      if (dem >= 5) tong += 1e7;
      else if (dem === 4) tong += mo === 2 ? 2e5 : mo === 1 ? 2e4 : 0;
      else if (dem === 3) tong += mo === 2 ? 6e3 : mo === 1 ? 500 : 0;
      else if (dem === 2) tong += mo === 2 ? 300 : mo === 1 ? 40 : 0;
      else tong += mo * 4;
    }
    return tong;
  };
  let best = -1;
  let bestScore = -1;
  const co = o.some((x) => x !== 0);
  for (let i = 0; i < N * N; i++) {
    if (o[i] !== 0) continue;
    if (co) {
      const r = Math.floor(i / N);
      const c = i % N;
      let gan = false;
      for (let dr = -2; dr <= 2 && !gan; dr++)
        for (let dc = -2; dc <= 2 && !gan; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < N && cc >= 0 && cc < N && o[rr * N + cc] !== 0) gan = true;
        }
      if (!gan) continue;
    }
    const sc = diem(i, may) * (1.05 + manh * 0.15) + diem(i, nguoi) + Math.random() * (manh > 1 ? 0.1 : 2);
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  }
  return best < 0 ? Math.floor((N * N) / 2) : best;
}

type BanOnline = { id: number; x: string | null; o: string | null; nuoc: number[]; thang: "x" | "o" | "hoa" | null; toi: "x" | "o" | null };

function Caro() {
  const [kieu, setKieu] = useState<"to" | "tieu" | "ban" | "ban2">("to");
  const ds: [typeof kieu, string][] = [
    ["to", "Thách đấu Ông Tổ"],
    ["tieu", "Chơi với Chú tiểu"],
    ["ban", "Chơi với bạn (trực tuyến)"],
    ["ban2", "Hai bạn chung máy"],
  ];
  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        {ds.map(([v, ten]) => (
          <button key={v} type="button" className={`chip-chon${kieu === v ? " is-chon" : ""}`} onClick={() => setKieu(v)}>
            {ten}
          </button>
        ))}
      </div>
      {kieu === "ban" ? <CaroBan /> : <CaroMay key={kieu} doi={kieu} />}
    </div>
  );
}

/** Chú tiểu đánh cờ còn non: hay đi nước ngẫu nhiên gần quân cũ. */
function tieuDi(o: O): number {
  if (Math.random() < 0.38) {
    const gan: number[] = [];
    for (let i = 0; i < N * N; i++) {
      if (o[i] !== 0) continue;
      const r = Math.floor(i / N);
      const c = i % N;
      let ok = false;
      for (let dr = -1; dr <= 1 && !ok; dr++)
        for (let dc = -1; dc <= 1 && !ok; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < N && cc >= 0 && cc < N && o[rr * N + cc] !== 0) ok = true;
        }
      if (ok) gan.push(i);
    }
    if (gan.length) return pick(gan);
  }
  return mayDi(o, 2, 0);
}

function BanCo({
  o,
  last,
  onDi,
  khoa,
  thang,
  phep,
  ten2,
}: {
  o: O;
  last: number;
  onDi: (i: number) => void;
  khoa: boolean;
  thang?: number[] | null;
  phep?: number;
  ten2?: string;
}) {
  return (
    <div className="ban-co" role="grid" aria-label="Bàn cờ caro 15 x 15">
      {o.map((v, i) => (
        <button
          key={i}
          type="button"
          className={`o-co${i === last ? " is-moi" : ""}${thang?.includes(i) ? " is-thang" : ""}${phep === i ? " is-phep" : ""}`}
          disabled={khoa || v !== 0}
          onClick={() => onDi(i)}
          aria-label={`Hàng ${Math.floor(i / N) + 1}, cột ${(i % N) + 1}${v === 1 ? ", quân con" : v === 2 ? `, quân ${ten2 ?? "O"}` : ""}`}
        >
          {v !== 0 && <span className={`quan ${v === 1 ? "quan-son" : "quan-ngoc"}`}>{v === 1 ? "X" : "O"}</span>}
        </button>
      ))}
    </div>
  );
}

function CaroMay({ doi }: { doi: "to" | "tieu" | "ban2" }) {
  const luat = useContext(LuatSan);
  const voiTo = doi === "to";
  const hai = doi === "ban2";
  const [o, setO] = useState<O>(() => Array(N * N).fill(0));
  const [last, setLast] = useState(-1);
  const [ketqua, setKetqua] = useState<string | null>(null);
  const [thang, setThang] = useState<number[] | null>(null);
  const [phep, setPhep] = useState(-1);
  const [nghi, setNghi] = useState(false);
  const [luot, setLuot] = useState<1 | 2>(1);
  const loiDau = () => (voiTo ? pick(TO_NOI.batDau) : doi === "tieu" ? pick(TIEU_NOI.batDau) : null);
  const [toNoi, setToNoi] = useState<string | null>(loiDau);
  const [tiSo, setTiSo] = useState({ con: 0, doi: 0 });
  const soNuocTo = useRef(0);
  const ten = voiTo ? "Ông Tổ" : doi === "tieu" ? "Chú tiểu" : "Bạn 2";
  const { cv, reoDom } = useCoVuDom();

  function moi() {
    setO(Array(N * N).fill(0));
    setLast(-1);
    setKetqua(null);
    setThang(null);
    setPhep(-1);
    setLuot(1);
    soNuocTo.current = 0;
    setToNoi(loiDau());
  }

  function ketThuc(b: O, cell: number, ai: 1 | 2) {
    const line = duongThang(b, cell);
    if (!line) return false;
    luat.choi("caro");
    setThang(line);
    reoDom(true);
    if (ai === 1) {
      setKetqua(hai ? "Bạn 1 (quân đỏ) thắng!" : "Con thắng rồi! Giỏi lắm.");
      setTiSo((t) => ({ ...t, con: t.con + 1 }));
      chuong(0.35);
      luat.thang();
      if (doi === "tieu") {
        const n = pick(TIEU_NOI.thua);
        setToNoi(n);
        noiDoi("tieu", n);
      }
    } else {
      setKetqua(`${ten} thắng.`);
      setTiSo((t) => ({ ...t, doi: t.doi + 1 }));
      const n = voiTo ? pick(TO_NOI.toThang) : doi === "tieu" ? pick(TIEU_NOI.thang) : null;
      if (n) {
        setToNoi(n);
        noiDoi(doi === "ban2" ? "ban" : doi, n);
      }
      setTimeout(() => luat.thua(`${ten} thắng ván cờ.`), 1800);
    }
    return true;
  }

  function di(i: number) {
    if (ketqua || nghi || o[i] !== 0) return;
    const b = [...o];
    if (hai) {
      // Hai bạn thay nhau đi trên cùng một máy
      b[i] = luot;
      goMo(0.25);
      setO(b);
      setLast(i);
      if (ketThuc(b, i, luot)) return;
      if (b.every((x) => x !== 0)) setKetqua("Hòa.");
      setLuot(luot === 1 ? 2 : 1);
      return;
    }
    b[i] = 1;
    goMo(0.25);
    setLast(i);
    setPhep(-1);
    if (duongThang(b, i)) {
      if (voiTo) {
        // Ông Tổ hóa phép: quân sắp thắng của con biến thành quân của Tổ
        b[i] = 2;
        setO([...b]);
        setPhep(i);
        reoDom(true);
        const n = pick(TO_NOI.phep);
        setToNoi(n);
        noiDoi("to", n);
        chuong(0.2);
        if (ketThuc(b, i, 2)) return;
        setNghi(true);
        setTimeout(() => toDi(b), 900);
        return;
      }
      setO(b);
      ketThuc(b, i, 1);
      return;
    }
    setO(b);
    setNghi(true);
    setTimeout(() => toDi(b), voiTo ? 500 : 450);
  }

  function toDi(b0: O) {
    const b = [...b0];
    const lan = voiTo && soNuocTo.current > 30 ? 2 : 1; // ván dài quá thì Tổ đi hai nước một lượt
    let m = -1;
    for (let k = 0; k < lan; k++) {
      m = voiTo ? mayDi(b, 2, 2) : tieuDi(b);
      b[m] = 2;
      soNuocTo.current++;
      if (duongThang(b, m)) break;
    }
    setO(b);
    setLast(m);
    setNghi(false);
    if (ketThuc(b, m, 2)) return;
    if (b.every((x) => x !== 0)) setKetqua("Hòa.");
    else if (voiTo && Math.random() < 0.22) setToNoi(pick(TO_NOI.toDi));
  }

  const nhacLuot = hai
    ? `Tới lượt ${luot === 1 ? "Bạn 1 (quân đỏ)" : "Bạn 2 (quân ngọc)"}.`
    : nghi
      ? `${ten} đang nghĩ…`
      : "Tới lượt con (quân đỏ). Xếp 5 quân liền để thắng.";

  return (
    <div className="caro-khung">
      <ToNoi text={toNoi} ai={doi === "ban2" ? "ban" : doi} />
      <div className="ti-so">
        <span className="mau-x">{hai ? "Bạn 1" : "Con"} {tiSo.con}</span>
        <span>–</span>
        <span className="mau-o">
          {tiSo.doi} {ten}
        </span>
      </div>
      <KhanGiaDom cv={cv} />
      <BanCo o={o} last={last} onDi={di} khoa={Boolean(ketqua) || nghi} thang={thang} phep={phep} ten2={ten} />
      <PhaoGiay chay={Boolean(ketqua && thang && (hai || o[thang[0]] === 1))} />
      <div className="row" style={{ marginTop: 10 }}>
        {ketqua ? <strong className="ket-tro">{ketqua}</strong> : <span className="small muted">{nhacLuot}</span>}
        <button type="button" className="nut nut-nho" onClick={moi}>
          Ván mới
        </button>
      </div>
    </div>
  );
}

function CaroBan() {
  const supabase = useMemo(() => createClient(), []);
  const [ds, setDs] = useState<{ id: number; x: string }[]>([]);
  const [ban, setBan] = useState<BanOnline | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const busy = useRef(false);
  const luat = useContext(LuatSan);
  const daBao = useRef<number | null>(null);
  useEffect(() => {
    if (!ban || !ban.thang || daBao.current === ban.id) return;
    daBao.current = ban.id;
    luat.choi("caro");
    if (ban.thang !== "hoa" && ban.toi && ban.thang !== ban.toi) setTimeout(() => luat.thua("Bạn thắng ván cờ."), 1800);
    else if (ban.thang === ban.toi) luat.thang();
  }, [ban, luat]);

  const tai = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (ban) {
        const { data } = await supabase.rpc("co_xem", { p_id: ban.id });
        if (data) setBan(data as BanOnline);
      } else {
        const { data } = await supabase.rpc("co_danh_sach");
        if (data) {
          setDs(data.cho ?? []);
          if (data.cua_toi) setBan(data.cua_toi as BanOnline);
        }
      }
    } finally {
      busy.current = false;
    }
  }, [supabase, ban]);

  useEffect(() => {
    void tai();
    const id = setInterval(() => !document.hidden && void tai(), 1500);
    return () => clearInterval(id);
  }, [tai]);

  async function goi(fn: string, args?: Record<string, unknown>) {
    setLoi(null);
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      setLoi(errorText(error));
      return;
    }
    setBan((data as BanOnline) ?? null);
  }

  if (!ban) {
    return (
      <div>
        <p className="small muted" style={{ margin: "0 0 8px" }}>
          Mở một bàn để bạn khác trong chùa vào chơi, hoặc vào bàn đang chờ.
        </p>
        <button type="button" className="nut" onClick={() => void goi("co_mo")}>
          Mở bàn mới
        </button>
        <h3 style={{ marginTop: 14 }}>Bàn đang chờ</h3>
        {ds.length === 0 ? (
          <p className="small muted">Chưa có bàn nào. Con mở bàn trước nhé.</p>
        ) : (
          <ul className="ds-ban">
            {ds.map((b) => (
              <li key={b.id}>
                <span>{b.x} đang chờ</span>
                <button type="button" className="nut nut-nho" onClick={() => void goi("co_vao", { p_id: b.id })}>
                  Vào chơi
                </button>
              </li>
            ))}
          </ul>
        )}
        {loi && <p className="thong-bao">{loi}</p>}
      </div>
    );
  }

  const o: O = Array(N * N).fill(0);
  ban.nuoc.forEach((cell, i) => (o[cell] = i % 2 === 0 ? 1 : 2));
  const luot = ban.nuoc.length % 2 === 0 ? "x" : "o";
  const toiLuot = !ban.thang && ban.o && ban.toi === luot;
  const last = ban.nuoc.length ? ban.nuoc[ban.nuoc.length - 1] : -1;
  const trangThai = ban.thang
    ? ban.thang === "hoa"
      ? "Hòa."
      : ban.thang === ban.toi
        ? "Con thắng rồi!"
        : "Bạn thắng. Chơi ván khác nhé!"
    : !ban.o
      ? "Đang chờ bạn vào bàn…"
      : toiLuot
        ? "Tới lượt con."
        : "Đợi bạn đi…";

  return (
    <div className="caro-khung">
      <p className="small" style={{ margin: "0 0 8px" }}>
        <b className="mau-x">Đỏ: {ban.x}</b> · <b className="mau-o">Ngọc: {ban.o ?? "…"}</b>
        {ban.toi && <span className="muted"> · con cầm quân {ban.toi === "x" ? "đỏ" : "ngọc"}</span>}
      </p>
      <BanCo
        o={o}
        last={last}
        khoa={!toiLuot}
        thang={ban.thang && ban.thang !== "hoa" ? duongThang(o, last) : null}
        onDi={(i) => {
          goMo(0.25);
          void goi("co_di", { p_id: ban.id, p_o: i });
        }}
      />
      <PhaoGiay chay={Boolean(ban.thang && ban.thang === ban.toi)} />
      <div className="row" style={{ marginTop: 10 }}>
        <strong className="ket-tro">{trangThai}</strong>
        {ban.thang ? (
          <button type="button" className="nut nut-nho" onClick={() => setBan(null)}>
            Về danh sách bàn
          </button>
        ) : (
          <button type="button" className="nut nut-nho nut-phu" onClick={() => void goi("co_bo", { p_id: ban.id })}>
            {ban.o ? "Chịu thua" : "Đóng bàn"}
          </button>
        )}
      </div>
      {loi && <p className="thong-bao">{loi}</p>}
    </div>
  );
}

/* =========================== Canvas dùng chung =========================== */

function useVongLap(cb: (dt: number) => void) {
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

function useCanvas(w: number, h: number) {
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
const nenCache = new Map<string, HTMLCanvasElement>();
function nenSanChua(g: CanvasRenderingContext2D, w: number, h: number, dat: number, t: number) {
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
function veNguoi(g: CanvasRenderingContext2D, x: number, y: number, to: boolean, tay: number) {
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

function veLuc(g: CanvasRenderingContext2D, luc: number) {
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
const AO_KHAN_GIA = ["#b8b1a3", "#7f98ab", "#c9772a", "#7a5a3e", "#d98a2b", "#8a9fae", "#b0442e"];
const LOI_REO = ["Hay quá!", "Tuyệt!", "Giỏi!", "Hoan hô!", "Đỉnh!"];
const LOI_CO_VU = ["Cố lên!", "Ném đi!", "Bình tĩnh!", "Cố lên con!"];
type CoVu = { t: number; loi: string[]; nhay: boolean };

function moiCoVu(): CoVu {
  return { t: 0, loi: [], nhay: false };
}
function reo(cv: CoVu, manh = true) {
  cv.t = manh ? 1.8 : 1.1;
  cv.nhay = manh;
  cv.loi = [pick(manh ? LOI_REO : LOI_CO_VU), pick(manh ? LOI_REO : LOI_CO_VU)];
  if (manh) voTay(0.3, 1.3);
}
/** Gọi mỗi khung hình: thỉnh thoảng khán giả tự hô cổ vũ. */
function capNhatCoVu(cv: CoVu, dt: number) {
  if (cv.t > 0) cv.t -= dt;
  else if (Math.random() < dt * 0.12) reo(cv, false);
}

function veKhanGia(g: CanvasRenderingContext2D, w: number, y0: number, t: number, cv: CoVu, tranh: [number, number][] = []) {
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
function KhanGiaDom({ cv }: { cv: { reo: number; loi: string; nhay: boolean } }) {
  return (
    <div className={`khan-gia${cv.reo ? (cv.nhay ? " is-reo" : " is-ho") : ""}`} aria-hidden="true">
      {Array.from({ length: 11 }, (_, i) => (
        <span key={i} className={`kg kg-${i % 4}`} style={{ animationDelay: `${(i % 5) * 0.07}s` }} />
      ))}
      {cv.reo > 0 && <b className="kg-loi">{cv.loi}</b>}
    </div>
  );
}

function useCoVuDom() {
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

/* =========================== Ném que vào ống (đầu hồ) =========================== */

const DW = 360;
const DH = 250;
const MIENG = 176;
const DAT = 150;

/** Mô phỏng một lần ném: trúng, ngắn hay xa. */
function thuNem(luc: number, binh: number, gio: number): "trung" | "ngan" | "xa" {
  const v = 250 + luc * 260;
  const a = (52 * Math.PI) / 180;
  let x = 40;
  let y = 198;
  let vx = v * Math.cos(a);
  let vy = -v * Math.sin(a);
  for (let i = 0; i < 400; i++) {
    const dt = 1 / 120;
    const py = y;
    vy += 520 * dt;
    vx += gio * dt;
    x += vx * dt;
    y += vy * dt;
    if (py < MIENG && y >= MIENG) {
      if (Math.abs(x - binh) < 11) return "trung";
      return x < binh ? "ngan" : "xa";
    }
  }
  return "xa";
}

function lucDeTrung(binh: number, gio: number) {
  const ok: number[] = [];
  for (let l = 0; l <= 1; l += 0.004) if (thuNem(l, binh, gio) === "trung") ok.push(l);
  return ok.length ? ok[Math.floor(ok.length / 2)] : 0.5;
}

function DauHo() {
  const { bac: bacTu } = useNhiemVu();
  const tayVung = 1 - 0.07 * (bacTu.so - 1); // bậc cao: thanh lực chạy chậm, dễ canh hơn
  const luat = useContext(LuatSan);
  const cv = useCanvas(DW, DH);
  const [doi, setDoiRaw] = useState<Doi>("to");
  const tenDoi = TEN_DOI[doi];
  const [luot, setLuot] = useState(10);
  const [diem, setDiem] = useState({ con: 0, to: 0 });
  const [tb, setTb] = useState("Bấm Ném đúng lúc thanh lực vừa đủ để que rơi vào miệng bình.");
  const [toNoi, setToNoi] = useState<string | null>(null);
  const [xong, setXong] = useState(false);
  const st = useRef({
    t: 0,
    luc: 0,
    bay: false,
    ai: "con" as "con" | "to",
    x: 40,
    y: 198,
    vx: 0,
    vy: 0,
    rot: 0,
    binh: 250,
    gio: 0,
    trung: 0,
    vang: false,
    chac: false,
    cho: 0,
    choBan: false,
    diem: { con: 0, to: 0 },
    luot: 10,
    cv: moiCoVu(),
  });

  const datBinh = () => {
    st.current.binh = 210 + Math.random() * 110;
    st.current.gio = Math.round((Math.random() - 0.5) * 60);
  };
  useEffect(datBinh, []);

  function setDoi(v: Doi) {
    setDoiRaw(v);
    choiLai(v);
  }

  function choiLai(d = doi) {
    st.current.diem = { con: 0, to: 0 };
    st.current.luot = 10;
    st.current.trung = 0;
    st.current.bay = false;
    st.current.cho = 0;
    st.current.choBan = false;
    setLuot(10);
    setDiem({ con: 0, to: 0 });
    setXong(false);
    setTb("Bấm Ném đúng lúc thanh lực vừa đủ để que rơi vào miệng bình.");
    setToNoi(d === "to" ? "Ném que vào ống là trò của Tổ đấy. Con ném trước đi!" : d === "tieu" ? pick(TIEU_NOI.batDau) : null);
    datBinh();
  }
  useEffect(() => {
    setToNoi("Ném que vào ống là trò của Tổ đấy. Con ném trước đi!");
  }, []);

  function nemVoi(luc: number, ai: "con" | "to", vang = false, chac = false) {
    const s = st.current;
    const v = 250 + luc * 260;
    const a = (52 * Math.PI) / 180;
    Object.assign(s, { bay: true, ai, vang, chac, x: 40, y: 198, vx: v * Math.cos(a), vy: -v * Math.sin(a), rot: -0.9 });
    goMo(0.2);
  }

  function xongLuot(trung: boolean) {
    const s = st.current;
    if (s.ai === "con") {
      if (trung) s.diem.con++;
      setDiem({ ...s.diem });
      setTb(trung ? "Trúng! Que lọt vào bình." : "Trượt rồi, canh lực lại nhé.");
      if (doi === "ban") {
        s.choBan = true;
        s.ai = "to";
        setTb("Lượt Bạn 2: bấm Ném khi thanh lực vừa đủ.");
        return;
      }
      if (doi !== "mot") {
        // Lượt đối thủ (Ông Tổ luôn bám sát, không để con dẫn)
        s.ai = "to";
        s.cho = 0.6;
        return;
      }
      s.luot--;
      setLuot(s.luot);
      if (s.luot <= 0) ketThuc();
      else datBinh();
    } else {
      if (trung) s.diem.to += s.vang ? 1 : 1;
      setDiem({ ...s.diem });
      if (s.vang) {
        ketThuc();
        return;
      }
      s.luot--;
      setLuot(s.luot);
      if (s.luot <= 0) {
        if (doi === "to" && s.diem.to <= s.diem.con) {
          // Hòa thì Tổ ném thêm que vàng
          const n = pick(TO_NOI.queVang);
          setToNoi(n);
          docTo(n, 0.95);
          setTimeout(() => nemVoi(lucDeTrung(s.binh, s.gio), "to", true, true), 1100);
          return;
        }
        ketThuc();
      } else {
        datBinh();
        s.ai = "con";
        if (doi === "ban") setTb("Lượt Bạn 1.");
      }
    }
  }

  function ketThuc() {
    const s = st.current;
    setXong(true);
    luat.choi("dauho");
    if (doi !== "mot") {
      const { con, to } = s.diem;
      const ban1 = doi === "ban" ? "Bạn 1" : "Con";
      if (con > to) {
        setTb(`${ban1} thắng ${con}–${to}!`);
        chuong(0.35);
        reo(s.cv, true);
        luat.thang();
        if (doi === "tieu") {
          const n = pick(TIEU_NOI.thua);
          setToNoi(n);
          noiDoi("tieu", n);
        }
      } else if (con === to) {
        setTb(`Hòa ${con}–${to}.`);
      } else {
        const n = doi === "to" ? pick(TO_NOI.toThang) : doi === "tieu" ? pick(TIEU_NOI.thang) : null;
        if (n) {
          setToNoi(n);
          noiDoi(doi, n);
        }
        setTb(`${tenDoi} thắng ${to}–${con}.`);
        setTimeout(() => luat.thua(`${tenDoi} ném trúng nhiều hơn.`), 1800);
      }
    } else {
      ghiKiLuc("dauho", s.diem.con);
      setTb(`Hết que! Con ném trúng ${s.diem.con}/10. Kỉ lục: ${Math.max(s.diem.con, docKiLuc("dauho"))}.`);
      if (s.diem.con >= 7) chuong(0.35);
    }
  }

  useVongLap((dt) => {
    const s = st.current;
    s.t += dt;
    if (s.cho > 0) {
      s.cho -= dt;
      if (s.cho <= 0) {
        const can = lucDeTrung(s.binh, s.gio);
        const trung = doi === "to" ? s.diem.to <= s.diem.con || Math.random() < 0.5 : Math.random() < 0.45;
        nemVoi(trung ? can : Math.min(1, Math.max(0, can + (Math.random() < 0.5 ? -0.14 : 0.14))), "to", false, trung);
      }
    }
    if (!s.bay) s.luc = (Math.sin(s.t * 2.6 * tayVung) + 1) / 2;
    else {
      s.vy += 520 * dt;
      s.vx += s.gio * dt;
      const py = s.y;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += dt * 8;
      // Ông Tổ đã định ném trúng thì que luôn vào bình
      if (py < MIENG && s.y >= MIENG && (Math.abs(s.x - s.binh) < 11 || s.chac)) {
        s.x = s.chac ? s.binh : s.x;
        s.bay = false;
        s.trung++;
        chuong(0.22);
        reo(s.cv);
        xongLuot(true);
      } else if (s.y > DH - 30 || s.x > DW + 20) {
        s.bay = false;
        xongLuot(false);
      }
    }
    ve();
  });

  function nem() {
    const s = st.current;
    if (s.bay || s.cho > 0 || xong || s.luot <= 0) return;
    if (s.choBan) {
      s.choBan = false;
      nemVoi(s.luc, "to");
      return;
    }
    nemVoi(s.luc, "con");
  }

  function ve() {
    const g = cv.current?.getContext("2d");
    if (!g) return;
    const s = st.current;
    nenSanChua(g, DW, DH, DAT, s.t);
    capNhatCoVu(s.cv, 1 / 60);
    veKhanGia(g, DW, DAT + 6, s.t, s.cv);
    const toNem = s.ai === "to" && (s.bay || s.cho > 0);
    veNguoi(g, 30, 176, toNem && doi === "to", s.bay ? 1.2 : 0.4);
    // bình đồng (hồ)
    const bx = s.binh;
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.beginPath();
    g.ellipse(bx, DH - 26, 24, 5, 0, 0, Math.PI * 2);
    g.fill();
    const gr = g.createLinearGradient(bx - 24, 0, bx + 24, 0);
    gr.addColorStop(0, "#8a6a2a");
    gr.addColorStop(0.5, "#f0cb6e");
    gr.addColorStop(1, "#8a6a2a");
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(bx - 10, MIENG);
    g.lineTo(bx + 10, MIENG);
    g.quadraticCurveTo(bx + 32, MIENG + 26, bx + 18, DH - 28);
    g.lineTo(bx - 18, DH - 28);
    g.quadraticCurveTo(bx - 32, MIENG + 26, bx - 10, MIENG);
    g.fill();
    g.fillStyle = "#6e4f14";
    g.fillRect(bx - 12, MIENG - 3, 24, 5);
    g.strokeStyle = "#b0442e";
    g.lineWidth = 3;
    for (let i = 0; i < Math.min(8, s.trung); i++) {
      g.beginPath();
      g.moveTo(bx - 5 + (i % 4) * 3, MIENG);
      g.lineTo(bx - 10 + (i % 4) * 6, MIENG - 26);
      g.stroke();
    }
    if (s.bay) {
      g.save();
      g.translate(s.x, s.y);
      g.rotate(s.rot);
      g.fillStyle = s.vang ? "#ffe066" : "#d9ae4e";
      g.fillRect(-16, -2, 32, 4);
      g.fillStyle = "#b0442e";
      g.fillRect(10, -2, 6, 4);
      g.restore();
    }
    g.fillStyle = "#ffe9c2";
    g.font = "700 12px 'Be Vietnam Pro', system-ui";
    g.fillText(s.gio === 0 ? "Lặng gió" : `Gió ${s.gio > 0 ? "→" : "←"} ${Math.abs(s.gio)}`, DW - 86, 22);
    veLuc(g, s.luc);
    if (s.ai === "to" && (s.cho > 0 || s.choBan)) {
      g.fillStyle = "#ffe9c2";
      g.font = "700 14px 'Be Vietnam Pro', system-ui";
      g.fillText(`Lượt ${tenDoi}…`, 12, 42);
    }
  }

  const conThang = xong && (doi === "mot" ? diem.con >= 7 : diem.con > diem.to);
  return (
    <div className="tro-canvas">
      <ChonDoi doi={doi} setDoi={setDoi} />
      <ToNoi text={toNoi} ai={doi} />
      <canvas ref={cv} style={{ width: "100%", maxWidth: DW, aspectRatio: `${DW} / ${DH}` }} onPointerDown={nem} />
      <div className="row" style={{ marginTop: 8 }}>
        <strong className="ket-tro">
          {doi !== "mot" ? `${doi === "ban" ? "Bạn 1" : "Con"} ${diem.con} – ${diem.to} ${tenDoi}` : `Trúng ${diem.con}`} · còn {luot} que
        </strong>
        {!xong ? (
          <button type="button" className="nut" onClick={nem}>
            Ném
          </button>
        ) : (
          <button type="button" className="nut" onClick={() => choiLai()}>
            Chơi lại
          </button>
        )}
      </div>
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        {tb}
      </p>
      <PhaoGiay chay={conThang} />
    </div>
  );
}

/* =========================== Ném còn =========================== */

const CH = 300;

function NemCon() {
  const { bac: bacTu } = useNhiemVu();
  const tayVung = 1 - 0.07 * (bacTu.so - 1); // bậc cao: thanh lực chạy chậm, dễ canh hơn
  const luat = useContext(LuatSan);
  const cv = useCanvas(DW, CH);
  const [doi, setDoiRaw] = useState<Doi>("to");
  const tenDoi = TEN_DOI[doi];
  const [luot, setLuot] = useState(10);
  const [diem, setDiem] = useState({ con: 0, to: 0 });
  const [tb, setTb] = useState("Quả còn phải bay lọt qua vòng tròn trên đỉnh cột. Bấm Ném khi thanh lực vừa đủ.");
  const [toNoi, setToNoi] = useState<string | null>("Ném còn là trò hội làng. Tổ ném còn giỏi nhất vùng!");
  const [xong, setXong] = useState(false);
  const st = useRef({
    t: 0,
    luc: 0,
    bay: false,
    ai: "con" as "con" | "to",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    vongY: 70,
    qua: false,
    duoi: [] as { x: number; y: number }[],
    cho: 0,
    choBan: false,
    vang: false,
    chac: false,
    diem: { con: 0, to: 0 },
    luot: 10,
    sao: [] as { x: number; y: number; t: number }[],
    cv: moiCoVu(),
  });

  const datVong = () => {
    st.current.vongY = 62 + Math.random() * 40;
  };

  function setDoi(v: Doi) {
    setDoiRaw(v);
    const s = st.current;
    Object.assign(s, { diem: { con: 0, to: 0 }, luot: 10, bay: false, cho: 0, choBan: false, ai: "con" });
    setLuot(10);
    setDiem({ con: 0, to: 0 });
    setXong(false);
    setToNoi(v === "to" ? "Ném còn là trò hội làng. Tổ ném còn giỏi nhất vùng!" : v === "tieu" ? pick(TIEU_NOI.batDau) : null);
    setTb("Quả còn phải bay lọt qua vòng tròn trên đỉnh cột. Bấm Ném khi thanh lực vừa đủ.");
    datVong();
  }

  /** Lực cần để lọt vòng (giải theo đường bay). */
  function lucCan(): number {
    const s = st.current;
    // y(1s) = 260 - v + 240 = vongY  =>  v = 500 - vongY
    const v = 500 - s.vongY;
    return Math.min(1, Math.max(0, (v - 330) / 210));
  }

  function nemVoi(luc: number, ai: "con" | "to", vang = false, chac = false) {
    const s = st.current;
    const x0 = ai === "con" ? 46 : DW - 46;
    const v = 330 + luc * 210;
    Object.assign(s, { bay: true, ai, vang, chac, qua: false, x: x0, y: 260, vx: DW / 2 - x0, vy: -v, duoi: [] });
    goMo(0.2);
  }

  function ketThuc() {
    const s = st.current;
    setXong(true);
    luat.choi("nemcon");
    if (doi !== "mot") {
      const { con, to } = s.diem;
      const ban1 = doi === "ban" ? "Bạn 1" : "Con";
      if (con > to) {
        setTb(`${ban1} thắng ${con}–${to}!`);
        chuong(0.35);
        reo(s.cv, true);
        luat.thang();
        if (doi === "tieu") {
          const n = pick(TIEU_NOI.thua);
          setToNoi(n);
          noiDoi("tieu", n);
        }
      } else if (con === to) {
        setTb(`Hòa ${con}–${to}.`);
      } else {
        const n = doi === "to" ? pick(TO_NOI.toThang) : doi === "tieu" ? pick(TIEU_NOI.thang) : null;
        if (n) {
          setToNoi(n);
          noiDoi(doi, n);
        }
        setTb(`${tenDoi} thắng ${to}–${con}.`);
        setTimeout(() => luat.thua(`${tenDoi} ném lọt vòng nhiều hơn.`), 1800);
      }
    } else {
      ghiKiLuc("nemcon", s.diem.con);
      setTb(`Hết lượt! Con ném lọt ${s.diem.con}/10. Kỉ lục: ${Math.max(s.diem.con, docKiLuc("nemcon"))}.`);
    }
  }

  function xongNem() {
    const s = st.current;
    const lot = s.qua;
    if (lot) {
      chuong(0.25);
      reo(s.cv);
      for (let i = 0; i < 10; i++) s.sao.push({ x: DW / 2, y: s.vongY, t: 0.8 + Math.random() * 0.4 });
    }
    if (s.ai === "con") {
      if (lot) s.diem.con++;
      setDiem({ ...s.diem });
      setTb(lot ? "Lọt vòng! Cả sân reo hò." : "Trượt rồi, thử lại nào.");
      if (doi === "ban") {
        s.choBan = true;
        s.ai = "to";
        setTb("Lượt Bạn 2: bấm Ném khi thanh lực vừa đủ.");
        return;
      }
      if (doi !== "mot") {
        s.ai = "to";
        s.cho = 0.6;
        return;
      }
      s.luot--;
      setLuot(s.luot);
      if (s.luot <= 0) ketThuc();
      else datVong();
    } else {
      if (lot) s.diem.to++;
      setDiem({ ...s.diem });
      if (s.vang) return ketThuc();
      s.luot--;
      setLuot(s.luot);
      if (s.luot <= 0) {
        if (doi === "to" && s.diem.to <= s.diem.con) {
          const n = "Hòa à? Tổ ném thêm quả còn vàng!";
          setToNoi(n);
          docTo(n, 0.95);
          setTimeout(() => nemVoi(lucCan(), "to", true, true), 1100);
          return;
        }
        ketThuc();
      } else {
        datVong();
        s.ai = "con";
        if (doi === "ban") setTb("Lượt Bạn 1.");
      }
    }
  }

  useVongLap((dt) => {
    const s = st.current;
    s.t += dt;
    if (s.cho > 0) {
      s.cho -= dt;
      if (s.cho <= 0) {
        const can = lucCan();
        const lot = doi === "to" ? s.diem.to <= s.diem.con || Math.random() < 0.45 : Math.random() < 0.42;
        nemVoi(lot ? can : Math.min(1, Math.max(0, can + (Math.random() < 0.5 ? -0.2 : 0.2))), "to", false, lot);
      }
    }
    if (!s.bay) s.luc = (Math.sin(s.t * 2.2 * tayVung) + 1) / 2;
    else {
      const py = s.y;
      const px = s.x;
      s.vy += 480 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // Ông Tổ đã định ném lọt thì quả còn luôn qua vòng khi bay ngang cột
      if (s.chac && !s.qua && (px - DW / 2) * (s.x - DW / 2) <= 0) {
        s.qua = true;
        s.y = s.vongY;
        s.vy = Math.max(60, s.vy);
      }
      s.duoi.push({ x: s.x, y: s.y });
      if (s.duoi.length > 16) s.duoi.shift();
      if ((py - s.vongY) * (s.y - s.vongY) <= 0 && Math.abs(s.x - DW / 2) < 13) s.qua = true;
      if (s.y > CH) {
        s.bay = false;
        xongNem();
      }
    }
    s.sao = s.sao.filter((p) => (p.t -= dt) > 0);
    ve();
  });

  function nem() {
    const s = st.current;
    if (s.bay || s.cho > 0 || xong || s.luot <= 0) return;
    if (s.choBan) {
      s.choBan = false;
      nemVoi(s.luc, "to");
      return;
    }
    nemVoi(s.luc, "con");
  }

  function ve() {
    const g = cv.current?.getContext("2d");
    if (!g) return;
    const s = st.current;
    nenSanChua(g, DW, CH, 190, s.t);
    capNhatCoVu(s.cv, 1 / 60);
    veKhanGia(g, DW, 196, s.t, s.cv, [[DW / 2 - 14, DW / 2 + 14]]);
    // cột còn tre, vòng giấy đỏ
    g.fillStyle = "#6e8a3a";
    g.fillRect(DW / 2 - 3, s.vongY + 14, 6, CH - s.vongY);
    g.fillStyle = "#4f6a28";
    for (let y = s.vongY + 30; y < CH; y += 26) g.fillRect(DW / 2 - 4, y, 8, 2);
    g.strokeStyle = "#d2402a";
    g.lineWidth = 5;
    g.beginPath();
    g.arc(DW / 2, s.vongY, 14, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "#e2b957";
    g.lineWidth = 2;
    g.stroke();
    veNguoi(g, 46, 240, false, 1.1);
    if (doi !== "mot") veNguoi(g, DW - 46, 240, doi === "to", 1.1);
    if (s.bay) {
      g.strokeStyle = s.ai === "to" ? "rgba(93,174,132,0.8)" : "rgba(226,185,87,0.8)";
      g.lineWidth = 3;
      g.beginPath();
      s.duoi.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.stroke();
      g.fillStyle = s.vang ? "#ffe066" : s.ai === "to" ? "#3f8a66" : "#d2402a";
      g.beginPath();
      g.arc(s.x, s.y, 7, 0, Math.PI * 2);
      g.fill();
    }
    for (const p of s.sao) {
      const k = 1 - p.t;
      g.fillStyle = `rgba(255,226,120,${p.t})`;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + k;
        g.fillRect(p.x + Math.cos(a) * 30 * k, p.y + Math.sin(a) * 30 * k, 3, 3);
      }
    }
    veLuc(g, s.luc);
    if (s.ai === "to" && (s.cho > 0 || s.choBan)) {
      g.fillStyle = "#ffe9c2";
      g.font = "700 14px 'Be Vietnam Pro', system-ui";
      g.fillText(`Lượt ${tenDoi}…`, 12, 42);
    }
  }

  return (
    <div className="tro-canvas">
      <ChonDoi doi={doi} setDoi={setDoi} />
      <ToNoi text={toNoi} ai={doi} />
      <canvas ref={cv} style={{ width: "100%", maxWidth: DW, aspectRatio: `${DW} / ${CH}` }} onPointerDown={nem} />
      <div className="row" style={{ marginTop: 8 }}>
        <strong className="ket-tro">
          {doi !== "mot" ? `${doi === "ban" ? "Bạn 1" : "Con"} ${diem.con} – ${diem.to} ${tenDoi}` : `Lọt vòng ${diem.con}`} · còn {luot} lượt
        </strong>
        {!xong ? (
          <button type="button" className="nut" onClick={nem}>
            Ném
          </button>
        ) : (
          <button type="button" className="nut" onClick={() => setDoi(doi)}>
            Chơi lại
          </button>
        )}
      </div>
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        {tb}
      </p>
      <PhaoGiay chay={xong && (doi === "mot" ? diem.con >= 7 : diem.con > diem.to)} />
    </div>
  );
}

/* =========================== Đua xe =========================== */

const RW = 300;
const RH = 420;

function DuaXe() {
  const luat = useContext(LuatSan);
  const cv = useCanvas(RW, RH);
  const [doi, setDoi] = useState<"mot" | "to">("to");
  const [chay, setChay] = useState(false);
  const [diem, setDiem] = useState(0);
  const [toNoi, setToNoi] = useState<string | null>("Đua với Tổ à? Xe Tổ chạy bằng năng lượng hạt nhân đấy!");
  const [tb, setTb] = useState("Tránh xe khác, nhặt nén hương để được cộng điểm. Chạm trái/phải hoặc phím mũi tên để đổi làn.");
  const st = useRef({
    lan: 1,
    x: 1,
    toc: 220,
    quang: 0,
    vat: [] as { lan: number; y: number; loai: "xe" | "huong" }[],
    hen: 0,
    vach: 0,
    diem: 0,
    to: 0,
    toLan: 0,
    t: 0,
    cay: 0,
    cv: moiCoVu(),
  });

  const doiLan = useCallback((d: number) => {
    st.current.lan = Math.max(0, Math.min(2, st.current.lan + d));
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") doiLan(-1);
      if (e.key === "ArrowRight") doiLan(1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [doiLan]);

  function batDau() {
    st.current = { lan: 1, x: 1, toc: 220, quang: 0, vat: [], hen: 0.8, vach: 0, diem: 0, to: 60, toLan: 0, t: 0, cay: 0, cv: moiCoVu() };
    reo(st.current.cv, true);
    setDiem(0);
    setChay(true);
    setTb("Chạy!");
    if (doi === "to") setToNoi("Xuất phát! Tổ đi trước nhé.");
  }

  useVongLap((dt) => {
    const s = st.current;
    s.t += dt;
    if (chay) {
      s.toc += dt * 9;
      s.quang += s.toc * dt;
      s.vach = (s.vach + s.toc * dt) % 40;
      s.cay = (s.cay + s.toc * dt) % 120;
      s.x += (s.lan - s.x) * Math.min(1, dt * 12);
      // Xe Ông Tổ luôn dẫn trước 40–110 m, con nhanh lên thì Tổ cũng nhanh lên
      const muon = s.quang + 70 + Math.sin(s.t * 0.7) * 30;
      s.to += (Math.max(muon, s.to + s.toc * dt * 0.6) - s.to) * Math.min(1, dt * 2);
      if (Math.random() < dt * 0.4) s.toLan = Math.floor(Math.random() * 3);
      s.hen -= dt;
      if (s.hen <= 0) {
        s.vat.push({ lan: Math.floor(Math.random() * 3), y: -60, loai: Math.random() < 0.25 ? "huong" : "xe" });
        s.hen = Math.max(0.35, 1.1 - s.toc / 900);
      }
      for (const v of s.vat) v.y += s.toc * dt;
      const carY = RH - 80;
      for (const v of s.vat) {
        if (Math.abs(v.lan - s.x) < 0.5 && v.y > carY - 50 && v.y < carY + 50) {
          if (v.loai === "huong") {
            s.diem += 50;
            v.y = RH + 100;
            goMo(0.2);
            reo(s.cv, Math.random() < 0.4);
          } else {
            setChay(false);
            const d = Math.floor(s.quang / 10) + s.diem;
            setDiem(d);
            ghiKiLuc("duaxe", d);
            chuong(0.25);
            if (doi === "to") {
              const n = pick(TO_NOI.toThang);
              setToNoi(n);
              docTo(n, 0.95);
              setTb(`Ông Tổ về nhất, hơn con ${Math.round((s.to - s.quang) / 10)} m. Con được ${d} điểm.`);
              setTimeout(() => luat.thua("Ông Tổ về đích trước con."), 1800);
            } else setTb(`Đâm xe rồi! Được ${d} điểm. Kỉ lục: ${Math.max(d, docKiLuc("duaxe"))}.`);
            break;
          }
        }
      }
      s.vat = s.vat.filter((v) => v.y < RH + 80);
      setDiem(Math.floor(s.quang / 10) + s.diem);
    }
    ve();
  });

  function veXe(g: CanvasRenderingContext2D, x: number, y: number, than: string, kinh: string, to = false) {
    g.fillStyle = "rgba(0,0,0,0.3)";
    g.fillRect(x - 17, y - 26, 38, 60);
    g.fillStyle = than;
    g.beginPath();
    g.roundRect(x - 18, y - 30, 36, 60, 8);
    g.fill();
    g.fillStyle = kinh;
    g.fillRect(x - 13, y - 20, 26, 13);
    g.fillRect(x - 13, y + 10, 26, 8);
    g.fillStyle = "#1a1a1a";
    g.fillRect(x - 21, y - 22, 4, 12);
    g.fillRect(x + 17, y - 22, 4, 12);
    g.fillRect(x - 21, y + 12, 4, 12);
    g.fillRect(x + 17, y + 12, 4, 12);
    if (to) {
      g.fillStyle = "#24160f";
      g.beginPath();
      g.arc(x, y - 2, 7, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#f3efe6";
      g.beginPath();
      g.moveTo(x - 4, y + 2);
      g.lineTo(x + 4, y + 2);
      g.lineTo(x, y + 10);
      g.fill();
    }
  }

  function ve() {
    const g = cv.current?.getContext("2d");
    if (!g) return;
    const s = st.current;
    g.fillStyle = "#3f7a3a";
    g.fillRect(0, 0, RW, RH);
    // cây và khán giả hai bên đường
    if (chay) capNhatCoVu(s.cv, 1 / 60);
    for (let y = -120 + s.cay; y < RH + 40; y += 120) {
      for (const x of [14, RW - 14]) {
        g.fillStyle = "#2a5a2a";
        g.beginPath();
        g.arc(x, y, 13, 0, Math.PI * 2);
        g.fill();
        for (let k = 0; k < 2; k++) {
          const py = y + 48 + k * 26;
          const i = Math.floor(py / 7) + (x > RW / 2 ? 3 : 0) + k;
          const nhay = s.cv.t > 0 ? Math.abs(Math.sin(s.t * 11 + i)) * 4 : 0;
          const ao = AO_KHAN_GIA[Math.abs(i) % AO_KHAN_GIA.length];
          g.fillStyle = ao;
          g.fillRect(x - 5, py - nhay, 10, 11);
          if (s.cv.t > 0) {
            g.strokeStyle = ao;
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(x - 4, py - nhay + 2);
            g.lineTo(x - 7, py - nhay - 7);
            g.moveTo(x + 4, py - nhay + 2);
            g.lineTo(x + 7, py - nhay - 7);
            g.stroke();
          }
          g.fillStyle = "#e8b48a";
          g.beginPath();
          g.arc(x, py - nhay - 4, 4, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    g.fillStyle = "#3b3b3b";
    g.fillRect(30, 0, RW - 60, RH);
    g.fillStyle = "#c79a3e";
    g.fillRect(30, 0, 3, RH);
    g.fillRect(RW - 33, 0, 3, RH);
    g.fillStyle = "#e2b957";
    for (let y = -40 + s.vach; y < RH; y += 40) {
      g.fillRect(30 + (RW - 60) / 3 - 2, y, 4, 22);
      g.fillRect(30 + ((RW - 60) * 2) / 3 - 2, y, 4, 22);
    }
    const lanX = (l: number) => 30 + ((RW - 60) / 3) * (l + 0.5);
    for (const v of s.vat) {
      const x = lanX(v.lan);
      if (v.loai === "xe") veXe(g, x, v.y, "#5f7889", "#c3d0bb");
      else {
        g.fillStyle = "#b0442e";
        g.fillRect(x - 2, v.y - 18, 4, 30);
        g.fillStyle = "#ff9a3c";
        g.beginPath();
        g.arc(x, v.y - 20, 5 + Math.sin(s.t * 10) * 1.5, 0, Math.PI * 2);
        g.fill();
      }
    }
    const carY = RH - 80;
    if (doi === "to") {
      // xe vàng của Ông Tổ phía trước
      const truoc = (s.to - s.quang) * 1.6;
      const y = carY - truoc;
      if (y > -40) veXe(g, lanX(s.toLan), y, "#e2b957", "#24160f", true);
      g.fillStyle = "rgba(36,22,15,0.7)";
      g.fillRect(36, 8, RW - 72, 24);
      g.fillStyle = "#ffe9c2";
      g.font = "700 12px 'Be Vietnam Pro', system-ui";
      g.textAlign = "center";
      g.fillText(chay || s.quang > 0 ? `Ông Tổ dẫn trước ${Math.max(1, Math.round((s.to - s.quang) / 10))} m` : "Ông Tổ đợi ở vạch xuất phát", RW / 2, 24);
      g.textAlign = "start";
    }
    veXe(g, 30 + ((RW - 60) / 3) * (s.x + 0.5), carY, "#a3281b", "#f3dcd6");
    if (s.cv.t > 0 && s.cv.loi.length) {
      g.font = "700 12px 'Be Vietnam Pro', system-ui";
      const loi = s.cv.loi[0];
      const tw = g.measureText(loi).width + 14;
      const y = doi === "to" ? 48 : 20;
      g.fillStyle = "rgba(255,248,232,0.95)";
      g.beginPath();
      g.roundRect(RW / 2 - tw / 2, y - 12, tw, 20, 9);
      g.fill();
      g.fillStyle = "#24160f";
      g.textAlign = "center";
      g.fillText(loi, RW / 2, y + 3);
      g.textAlign = "start";
    }
  }

  return (
    <div className="tro-canvas">
      <ChonDoi
        doi={doi}
        co={["to", "mot"]}
        setDoi={(v) => {
          setDoi(v === "to" ? "to" : "mot");
          setChay(false);
          setToNoi(v === "to" ? "Đua với Tổ à? Xe Tổ chạy bằng năng lượng hạt nhân đấy!" : null);
        }}
      />
      {doi === "to" && <ToNoi text={toNoi} />}
      <canvas
        ref={cv}
        style={{ width: "100%", maxWidth: 260, aspectRatio: `${RW} / ${RH}`, touchAction: "none" }}
        onPointerDown={(e) => {
          if (!chay) return;
          const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
          doiLan(e.clientX - r.left < r.width / 2 ? -1 : 1);
        }}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <strong className="ket-tro">{diem} điểm</strong>
        {chay ? (
          <>
            <button type="button" className="nut nut-nho" onClick={() => doiLan(-1)} aria-label="Sang trái">
              ←
            </button>
            <button type="button" className="nut nut-nho" onClick={() => doiLan(1)} aria-label="Sang phải">
              →
            </button>
          </>
        ) : (
          <button type="button" className="nut" onClick={batDau}>
            {diem ? "Chạy lại" : "Bắt đầu"}
          </button>
        )}
      </div>
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        {tb}
      </p>
    </div>
  );
}
