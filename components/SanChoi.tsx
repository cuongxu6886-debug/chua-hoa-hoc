"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorText } from "@/lib/game";
import { chuong, goMo } from "@/lib/sound";

type Tro = "caro" | "dauho" | "nemcon" | "duaxe";

const TRO: { v: Tro; ten: string }[] = [
  { v: "caro", ten: "Cờ caro" },
  { v: "dauho", ten: "Ném que vào ống" },
  { v: "nemcon", ten: "Ném còn" },
  { v: "duaxe", ten: "Đua xe" },
];

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

/** Sân chơi lúc nghỉ học: cờ caro, ném que vào ống (đầu hồ), ném còn, đua xe. */
export default function SanChoi({ onDong }: { onDong: () => void }) {
  const [tro, setTro] = useState<Tro>("caro");
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onDong();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onDong]);
  return (
    <div className="san-choi" role="dialog" aria-modal="true" aria-label="Sân chơi">
      <div className="san-choi-khung">
        <div className="san-choi-dau">
          <h2>Sân chơi</h2>
          <button type="button" className="nut nut-nho nut-vang" onClick={onDong}>
            Về chánh điện
          </button>
        </div>
        <div className="san-choi-tab" role="tablist">
          {TRO.map((t) => (
            <button key={t.v} type="button" role="tab" aria-selected={tro === t.v} onClick={() => setTro(t.v)}>
              {t.ten}
            </button>
          ))}
        </div>
        <div className="san-choi-than">
          {tro === "caro" && <Caro />}
          {tro === "dauho" && <DauHo />}
          {tro === "nemcon" && <NemCon />}
          {tro === "duaxe" && <DuaXe />}
        </div>
      </div>
    </div>
  );
}

/* =========================== Cờ caro =========================== */

const N = 15;

function thang(o: (0 | 1 | 2)[], last: number): boolean {
  if (last < 0) return false;
  const who = o[last];
  const r = Math.floor(last / N);
  const c = last % N;
  for (const [dr, dc] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]) {
    let dem = 1;
    for (const s of [1, -1]) {
      let rr = r + s * dr;
      let cc = c + s * dc;
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && o[rr * N + cc] === who) {
        dem++;
        rr += s * dr;
        cc += s * dc;
      }
    }
    if (dem >= 5) return true;
  }
  return false;
}

/** Máy chơi caro: chấm điểm từng ô theo thế công và thế thủ. */
function mayDi(o: (0 | 1 | 2)[], may: 1 | 2): number {
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
      // chỉ xét ô gần quân đã có
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
    const sc = diem(i, may) * 1.1 + diem(i, nguoi) + Math.random();
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  }
  return best < 0 ? Math.floor((N * N) / 2) : best;
}

type BanOnline = { id: number; x: string | null; o: string | null; nuoc: number[]; thang: "x" | "o" | "hoa" | null; toi: "x" | "o" | null };

function Caro() {
  const [kieu, setKieu] = useState<"may" | "ban">("may");
  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <button type="button" className={`chip-chon${kieu === "may" ? " is-chon" : ""}`} onClick={() => setKieu("may")}>
          Chơi với máy
        </button>
        <button type="button" className={`chip-chon${kieu === "ban" ? " is-chon" : ""}`} onClick={() => setKieu("ban")}>
          Chơi với bạn trong chùa
        </button>
      </div>
      {kieu === "may" ? <CaroMay /> : <CaroBan />}
    </div>
  );
}

function BanCo({
  o,
  last,
  onDi,
  khoa,
}: {
  o: (0 | 1 | 2)[];
  last: number;
  onDi: (i: number) => void;
  khoa: boolean;
}) {
  return (
    <div className="ban-co" role="grid" aria-label="Bàn cờ caro 15 x 15">
      {o.map((v, i) => (
        <button
          key={i}
          type="button"
          className={`o-co${v === 1 ? " is-x" : v === 2 ? " is-o" : ""}${i === last ? " is-moi" : ""}`}
          disabled={khoa || v !== 0}
          onClick={() => onDi(i)}
          aria-label={`Hàng ${Math.floor(i / N) + 1}, cột ${(i % N) + 1}${v === 1 ? ", X" : v === 2 ? ", O" : ""}`}
        >
          {v === 1 ? "X" : v === 2 ? "O" : ""}
        </button>
      ))}
    </div>
  );
}

function CaroMay() {
  const [o, setO] = useState<(0 | 1 | 2)[]>(() => Array(N * N).fill(0));
  const [last, setLast] = useState(-1);
  const [ketqua, setKetqua] = useState<string | null>(null);
  const [nghi, setNghi] = useState(false);

  function moi() {
    setO(Array(N * N).fill(0));
    setLast(-1);
    setKetqua(null);
  }

  function di(i: number) {
    if (ketqua || nghi || o[i] !== 0) return;
    const b = [...o];
    b[i] = 1;
    goMo(0.25);
    setO(b);
    setLast(i);
    if (thang(b, i)) {
      setKetqua("Con thắng rồi! Giỏi lắm.");
      chuong(0.35);
      return;
    }
    setNghi(true);
    setTimeout(() => {
      const m = mayDi(b, 2);
      const b2 = [...b];
      b2[m] = 2;
      setO(b2);
      setLast(m);
      setNghi(false);
      if (thang(b2, m)) setKetqua("Máy thắng. Chơi lại nhé!");
      else if (b2.every((x) => x !== 0)) setKetqua("Hòa.");
    }, 350);
  }

  return (
    <div>
      <p className="small muted" style={{ margin: "0 0 8px" }}>
        Con đi X (đỏ), máy đi O. Ai xếp đủ 5 quân liền hàng ngang, dọc hoặc chéo trước thì thắng.
      </p>
      <BanCo o={o} last={last} onDi={di} khoa={Boolean(ketqua) || nghi} />
      <div className="row" style={{ marginTop: 10 }}>
        {ketqua ? <strong className="ket-tro">{ketqua}</strong> : <span className="small muted">{nghi ? "Máy đang nghĩ…" : "Tới lượt con."}</span>}
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
          Mở một bàn để bạn khác vào chơi, hoặc vào bàn đang chờ.
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

  const o: (0 | 1 | 2)[] = Array(N * N).fill(0);
  ban.nuoc.forEach((cell, i) => (o[cell] = i % 2 === 0 ? 1 : 2));
  const luot = ban.nuoc.length % 2 === 0 ? "x" : "o";
  const toiLuot = !ban.thang && ban.o && ban.toi === luot;
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
    <div>
      <p className="small" style={{ margin: "0 0 8px" }}>
        <b className="mau-x">X: {ban.x}</b> · <b className="mau-o">O: {ban.o ?? "…"}</b>
        {ban.toi && <span className="muted"> · con là {ban.toi.toUpperCase()}</span>}
      </p>
      <BanCo
        o={o}
        last={ban.nuoc.length ? ban.nuoc[ban.nuoc.length - 1] : -1}
        khoa={!toiLuot}
        onDi={(i) => {
          goMo(0.25);
          void goi("co_di", { p_id: ban.id, p_o: i });
        }}
      />
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

function useVongLap(cb: (dt: number) => void, chay: boolean) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!chay) return;
    let raf = 0;
    let last = performance.now();
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ref.current(dt);
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [chay]);
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

function nen(g: CanvasRenderingContext2D, w: number, h: number) {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, "#3a1712");
  gr.addColorStop(0.62, "#5a2318");
  gr.addColorStop(0.62, "#5c3a26");
  gr.addColorStop(1, "#3a2419");
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
}

/* =========================== Ném que vào ống (đầu hồ) =========================== */

const DW = 360;
const DH = 240;

function DauHo() {
  const cv = useCanvas(DW, DH);
  const [luot, setLuot] = useState(10);
  const [diem, setDiem] = useState(0);
  const [tb, setTb] = useState("Bấm Ném đúng lúc thanh lực vừa đủ để que rơi vào miệng bình.");
  const st = useRef({
    t: 0,
    luc: 0,
    bay: false,
    x: 40,
    y: 190,
    vx: 0,
    vy: 0,
    rot: 0,
    binh: 250,
    gio: 0,
    trung: [] as number[],
  });

  const datBinh = () => {
    st.current.binh = 200 + Math.random() * 120;
    st.current.gio = Math.round((Math.random() - 0.5) * 60);
  };
  useEffect(datBinh, []);

  useVongLap((dt) => {
    const s = st.current;
    s.t += dt;
    if (!s.bay) s.luc = (Math.sin(s.t * 2.6) + 1) / 2;
    else {
      s.vy += 520 * dt;
      s.vx += s.gio * dt;
      const py = s.y;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += dt * 8;
      const miengY = 168;
      if (py < miengY && s.y >= miengY) {
        if (Math.abs(s.x - s.binh) < 11) {
          s.bay = false;
          s.trung.push(s.binh);
          setDiem((d) => d + 1);
          setTb("Trúng! Que lọt vào bình.");
          chuong(0.25);
          ketThuc();
          return;
        }
      }
      if (s.y > 214 || s.x > DW + 20) {
        s.bay = false;
        setTb(s.x < s.binh ? "Hơi yếu tay rồi, ném mạnh hơn chút." : "Mạnh quá, que bay qua bình.");
        ketThuc();
      }
    }
    ve();
  }, true);

  function ketThuc() {
    setLuot((l) => {
      const con = l - 1;
      if (con <= 0) {
        setDiem((d) => {
          ghiKiLuc("dauho", d);
          setTb(`Hết que! Con ném trúng ${d}/10. Kỉ lục: ${Math.max(d, docKiLuc("dauho"))}.`);
          return d;
        });
      }
      return con;
    });
    datBinh();
  }

  function nem() {
    const s = st.current;
    if (s.bay || luot <= 0) return;
    const v = 250 + s.luc * 260;
    const a = (52 * Math.PI) / 180;
    Object.assign(s, { bay: true, x: 40, y: 190, vx: v * Math.cos(a), vy: -v * Math.sin(a), rot: -0.9 });
    goMo(0.2);
  }

  function choiLai() {
    setLuot(10);
    setDiem(0);
    st.current.trung = [];
    setTb("Bấm Ném đúng lúc thanh lực vừa đủ để que rơi vào miệng bình.");
  }

  function ve() {
    const g = cv.current?.getContext("2d");
    if (!g) return;
    const s = st.current;
    nen(g, DW, DH);
    // người ném
    g.fillStyle = "#e8b48a";
    g.beginPath();
    g.arc(30, 168, 10, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#b8b1a3";
    g.fillRect(20, 178, 20, 32);
    // bình (hồ)
    g.fillStyle = "#c79a3e";
    g.beginPath();
    g.moveTo(s.binh - 11, 168);
    g.lineTo(s.binh + 11, 168);
    g.quadraticCurveTo(s.binh + 30, 190, s.binh + 18, 214);
    g.lineTo(s.binh - 18, 214);
    g.quadraticCurveTo(s.binh - 30, 190, s.binh - 11, 168);
    g.fill();
    g.fillStyle = "#6e4f14";
    g.fillRect(s.binh - 12, 165, 24, 5);
    // que đã trúng cắm trong bình
    g.strokeStyle = "#b0442e";
    g.lineWidth = 3;
    s.trung.forEach((_, i) => {
      g.beginPath();
      g.moveTo(s.binh - 4 + (i % 5) * 2, 168);
      g.lineTo(s.binh - 8 + (i % 5) * 4, 140);
      g.stroke();
    });
    // que đang bay
    if (s.bay) {
      g.save();
      g.translate(s.x, s.y);
      g.rotate(s.rot);
      g.fillStyle = "#d9ae4e";
      g.fillRect(-16, -2, 32, 4);
      g.fillStyle = "#b0442e";
      g.fillRect(10, -2, 6, 4);
      g.restore();
    }
    // gió
    g.fillStyle = "#e2b957";
    g.font = "600 12px 'Be Vietnam Pro', system-ui";
    g.fillText(s.gio === 0 ? "Lặng gió" : `Gió ${s.gio > 0 ? "→" : "←"} ${Math.abs(s.gio)}`, DW - 90, 18);
    // thanh lực
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(12, 12, 120, 10);
    g.fillStyle = s.luc > 0.75 ? "#d2402a" : s.luc > 0.4 ? "#e2b957" : "#5dae84";
    g.fillRect(12, 12, 120 * s.luc, 10);
    g.strokeStyle = "#e2b957";
    g.strokeRect(12, 12, 120, 10);
  }

  return (
    <div className="tro-canvas">
      <canvas ref={cv} style={{ width: "100%", maxWidth: DW, aspectRatio: `${DW} / ${DH}` }} onPointerDown={nem} />
      <div className="row" style={{ marginTop: 8 }}>
        <strong className="ket-tro">
          Trúng {diem} · còn {luot} que
        </strong>
        {luot > 0 ? (
          <button type="button" className="nut" onClick={nem}>
            Ném
          </button>
        ) : (
          <button type="button" className="nut" onClick={choiLai}>
            Chơi lại
          </button>
        )}
      </div>
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        {tb}
      </p>
    </div>
  );
}

/* =========================== Ném còn =========================== */

function NemCon() {
  const cv = useCanvas(DW, 300);
  const [luot, setLuot] = useState(10);
  const [diem, setDiem] = useState(0);
  const [tb, setTb] = useState("Quả còn phải bay lọt qua vòng tròn trên đỉnh cột. Bấm Ném khi thanh lực vừa đủ.");
  const st = useRef({ t: 0, luc: 0, bay: false, x: 0, y: 0, vx: 0, vy: 0, ben: -1, vongY: 50, qua: false, duoi: [] as { x: number; y: number }[] });

  useEffect(() => {
    st.current.vongY = 40 + Math.random() * 40;
  }, []);

  useVongLap((dt) => {
    const s = st.current;
    s.t += dt;
    if (!s.bay) s.luc = (Math.sin(s.t * 2.2) + 1) / 2;
    else {
      const py = s.y;
      s.vy += 480 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.duoi.push({ x: s.x, y: s.y });
      if (s.duoi.length > 14) s.duoi.shift();
      // đi qua mặt phẳng vòng (từ dưới lên hoặc trên xuống)
      if ((py - s.vongY) * (s.y - s.vongY) <= 0 && Math.abs(s.x - DW / 2) < 13) {
        s.qua = true;
      }
      if (s.y > 300) {
        s.bay = false;
        if (s.qua) {
          setDiem((d) => d + 1);
          setTb("Lọt vòng! Cả sân reo hò.");
          chuong(0.3);
        } else setTb("Trượt rồi, thử lại nào.");
        setLuot((l) => {
          const con = l - 1;
          if (con <= 0)
            setDiem((d) => {
              ghiKiLuc("nemcon", d);
              setTb(`Hết lượt! Con ném lọt ${d}/10. Kỉ lục: ${Math.max(d, docKiLuc("nemcon"))}.`);
              return d;
            });
          return con;
        });
        s.vongY = 40 + Math.random() * 50;
        s.ben = -s.ben;
      }
    }
    ve();
  }, true);

  function nem() {
    const s = st.current;
    if (s.bay || luot <= 0) return;
    const x0 = s.ben < 0 ? 40 : DW - 40;
    const v = 330 + s.luc * 210;
    Object.assign(s, { bay: true, qua: false, x: x0, y: 260, vx: ((DW / 2 - x0) / 0.95) * 0.95, vy: -v, duoi: [] });
    goMo(0.2);
  }

  function ve() {
    const g = cv.current?.getContext("2d");
    if (!g) return;
    const s = st.current;
    nen(g, DW, 300);
    // cột còn
    g.fillStyle = "#3a2a20";
    g.fillRect(DW / 2 - 4, s.vongY + 12, 8, 300 - s.vongY);
    // vòng còn
    g.strokeStyle = "#e2b957";
    g.lineWidth = 4;
    g.beginPath();
    g.ellipse(DW / 2, s.vongY, 14, 14, 0, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#c0392b";
    g.fillRect(DW / 2 - 1, s.vongY + 14, 2, 8);
    // người ném
    const x0 = s.ben < 0 ? 40 : DW - 40;
    g.fillStyle = "#e8b48a";
    g.beginPath();
    g.arc(x0, 252, 10, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#7f98ab";
    g.fillRect(x0 - 10, 262, 20, 30);
    // quả còn và dải đuôi
    if (s.bay) {
      g.strokeStyle = "rgba(226,185,87,0.6)";
      g.lineWidth = 3;
      g.beginPath();
      s.duoi.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.stroke();
      g.fillStyle = "#d2402a";
      g.beginPath();
      g.arc(s.x, s.y, 7, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(12, 12, 120, 10);
    g.fillStyle = s.luc > 0.75 ? "#d2402a" : s.luc > 0.4 ? "#e2b957" : "#5dae84";
    g.fillRect(12, 12, 120 * s.luc, 10);
    g.strokeStyle = "#e2b957";
    g.lineWidth = 1;
    g.strokeRect(12, 12, 120, 10);
  }

  return (
    <div className="tro-canvas">
      <canvas ref={cv} style={{ width: "100%", maxWidth: DW, aspectRatio: `${DW} / 300` }} onPointerDown={nem} />
      <div className="row" style={{ marginTop: 8 }}>
        <strong className="ket-tro">
          Lọt vòng {diem} · còn {luot} lượt
        </strong>
        {luot > 0 ? (
          <button type="button" className="nut" onClick={nem}>
            Ném
          </button>
        ) : (
          <button
            type="button"
            className="nut"
            onClick={() => {
              setLuot(10);
              setDiem(0);
            }}
          >
            Chơi lại
          </button>
        )}
      </div>
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        {tb}
      </p>
    </div>
  );
}

/* =========================== Đua xe =========================== */

const RW = 300;
const RH = 420;

function DuaXe() {
  const cv = useCanvas(RW, RH);
  const [chay, setChay] = useState(false);
  const [diem, setDiem] = useState(0);
  const [tb, setTb] = useState("Tránh xe khác, nhặt nén hương để được cộng điểm. Chạm trái/phải hoặc phím mũi tên để đổi làn.");
  const st = useRef({ lan: 1, x: 1, toc: 220, quang: 0, vat: [] as { lan: number; y: number; loai: "xe" | "huong" }[], hen: 0, vach: 0, diem: 0 });

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
    st.current = { lan: 1, x: 1, toc: 220, quang: 0, vat: [], hen: 0.8, vach: 0, diem: 0 };
    setDiem(0);
    setChay(true);
    setTb("Chạy!");
  }

  useVongLap((dt) => {
    const s = st.current;
    if (chay) {
      s.toc += dt * 9;
      s.quang += s.toc * dt;
      s.vach = (s.vach + s.toc * dt) % 40;
      s.x += (s.lan - s.x) * Math.min(1, dt * 12);
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
          } else {
            setChay(false);
            const d = Math.floor(s.quang / 10) + s.diem;
            setDiem(d);
            ghiKiLuc("duaxe", d);
            setTb(`Đâm xe rồi! Được ${d} điểm. Kỉ lục: ${Math.max(d, docKiLuc("duaxe"))}.`);
            chuong(0.25);
            break;
          }
        }
      }
      s.vat = s.vat.filter((v) => v.y < RH + 80);
      setDiem(Math.floor(s.quang / 10) + s.diem);
    }
    ve();
  }, true);

  function ve() {
    const g = cv.current?.getContext("2d");
    if (!g) return;
    const s = st.current;
    g.fillStyle = "#2f6b4f";
    g.fillRect(0, 0, RW, RH);
    g.fillStyle = "#3b3b3b";
    g.fillRect(30, 0, RW - 60, RH);
    g.fillStyle = "#e2b957";
    for (let y = -40 + s.vach; y < RH; y += 40) {
      g.fillRect(30 + (RW - 60) / 3 - 2, y, 4, 22);
      g.fillRect(30 + ((RW - 60) * 2) / 3 - 2, y, 4, 22);
    }
    const lanX = (l: number) => 30 + ((RW - 60) / 3) * (l + 0.5);
    for (const v of s.vat) {
      const x = lanX(v.lan);
      if (v.loai === "xe") {
        g.fillStyle = "#5f7889";
        g.fillRect(x - 18, v.y - 30, 36, 60);
        g.fillStyle = "#c3d0bb";
        g.fillRect(x - 13, v.y - 18, 26, 14);
      } else {
        g.fillStyle = "#b0442e";
        g.fillRect(x - 2, v.y - 18, 4, 30);
        g.fillStyle = "#ff9a3c";
        g.beginPath();
        g.arc(x, v.y - 20, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
    const cx = 30 + ((RW - 60) / 3) * (s.x + 0.5);
    const cy = RH - 80;
    g.fillStyle = "#a3281b";
    g.fillRect(cx - 18, cy - 30, 36, 60);
    g.fillStyle = "#f3dcd6";
    g.fillRect(cx - 13, cy - 22, 26, 14);
    g.fillStyle = "#e2b957";
    g.fillRect(cx - 18, cy + 22, 8, 6);
    g.fillRect(cx + 10, cy + 22, 8, 6);
  }

  return (
    <div className="tro-canvas">
      <canvas
        ref={cv}
        style={{ width: "100%", maxWidth: 260, aspectRatio: `${RW} / ${RH}`, touchAction: "none" }}
        onPointerDown={(e) => {
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
