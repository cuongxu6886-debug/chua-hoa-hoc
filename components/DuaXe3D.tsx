"use client";

import { useEffect, useRef, useState } from "react";
import { chuong, docTo, goMo, voTay } from "@/lib/sound";
import type { DuaHud, DuaKetQua, DuaSuKien, DoiDua } from "@/lib/duaxe3d";
import { useGame } from "./AppShell";

type Doi = "to" | "tieu" | "ban" | "mot";

const CHON: { v: Doi; ten: string }[] = [
  { v: "to", ten: "Đua với Ông Tổ" },
  { v: "tieu", ten: "Đua với Chú tiểu" },
  { v: "ban", ten: "Hai bạn thay phiên" },
  { v: "mot", ten: "Chạy một mình" },
];

function coWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function giay(t: number) {
  return `${t.toFixed(1).replace(".", ",")} giây`;
}
function docKiLuc() {
  try {
    return Number(localStorage.getItem("chua-ki-luc-dua3d") || 0);
  } catch {
    return 0;
  }
}
function ghiKiLuc(t: number) {
  try {
    const cu = docKiLuc();
    if (!cu || t < cu) localStorage.setItem("chua-ki-luc-dua3d", String(t));
  } catch {
    /* bỏ qua */
  }
}

/** Đua xe 3D quanh chùa, có nút điều khiển mờ trên màn hình. */
export default function DuaXe3D({
  duPhong,
  onThua,
  onThang,
  onChoi,
  bac = 1,
}: {
  duPhong: React.ReactNode;
  onThua: (loi: string) => void;
  onThang: () => void;
  /** Đua xong một chặng (để tính nhiệm vụ) */
  onChoi?: () => void;
  /** Bậc tu hành: bậc cao xe nhanh, nhiều năng lượng, màu xịn hơn */
  bac?: number;
}) {
  const { state } = useGame();
  const [doi, setDoi] = useState<Doi>("to");
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [phien, setPhien] = useState(0);
  const [hud, setHud] = useState<DuaHud | null>(null);
  const [dangChay, setDangChay] = useState(false);
  const [bao, setBao] = useState<{ text: string; id: number } | null>(null);
  const [kq, setKq] = useState<{ tieuDe: string; chiTiet: string; thang: boolean } | null>(null);
  const [luotBan, setLuotBan] = useState<1 | 2>(1);
  const [tBan1, setTBan1] = useState<number | null>(null);
  const [tuChay, setTuChay] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<{ setPhim: (p: Partial<{ trai: boolean; phai: boolean; tang: boolean }>) => void; batDau: () => void; dispose: () => void } | null>(null);
  const latest = useRef({ doi, luotBan, tBan1, onThua, onThang, onChoi });
  latest.current = { doi, luotBan, tBan1, onThua, onThang, onChoi };

  useEffect(() => setWebgl(coWebGL()), []);

  function baoNhanh(text: string) {
    setBao({ text, id: Date.now() });
  }
  useEffect(() => {
    if (!bao) return;
    const id = setTimeout(() => setBao(null), 1600);
    return () => clearTimeout(id);
  }, [bao]);

  function suKien(e: DuaSuKien, so?: number) {
    const d = latest.current.doi;
    if (e === "dem") {
      goMo(0.3);
      docTo(["", "Một", "Hai", "Ba"][so ?? 0] ?? "", 1.1);
    } else if (e === "xuatPhat") {
      chuong(0.3);
      docTo("Xuất phát!", 1.05);
      baoNhanh("Xuất phát!");
    } else if (e === "an") {
      chuong(0.15);
      baoNhanh("+ Năng lượng");
    } else if (e === "sao") {
      chuong(0.25);
      baoNhanh("Sao tốc độ! Phóng nhanh");
    } else if (e === "va") {
      goMo(0.45);
      baoNhanh("Đâm phải chum nước!");
    } else if (e === "phep") {
      const n = ["Tổ dùng phép rút đất đây!", "Xe Tổ chạy bằng xúc tác thần kì!", "Đuổi kịp Tổ đâu có dễ!"][Math.floor(Math.random() * 3)];
      baoNhanh(n);
      docTo(n, 1, "nam");
    } else if (e === "toVe") {
      const n = d === "to" ? "Tổ về đích trước rồi nhé!" : "Chú tiểu về đích rồi!";
      baoNhanh(n);
      docTo(n, 1, d === "to" ? "nam" : undefined);
    } else if (e === "vong") {
      const n = so === 3 ? "Vòng cuối!" : `Vòng ${so === 2 ? "hai" : so}!`;
      baoNhanh(n);
      docTo(n, 1.05);
      voTay(0.2, 0.8);
    } else if (e === "vuot") {
      baoNhanh("Vượt lên rồi!");
      voTay(0.25, 0.8);
    }
  }

  function xong(r: DuaKetQua) {
    const { doi: d, luotBan: lb, tBan1: t1 } = latest.current;
    setDangChay(false);
    latest.current.onChoi?.();
    engine.current?.setPhim({ trai: false, phai: false, tang: false });
    if (d === "mot") {
      const cu = docKiLuc();
      ghiKiLuc(r.thoiGian);
      const moi = !cu || r.thoiGian < cu;
      setKq({
        tieuDe: moi ? "Kỉ lục mới!" : "Về đích!",
        chiTiet: `Ba vòng hết ${giay(r.thoiGian)}, vòng nhanh nhất ${giay(r.vongNhanh)}.${cu && !moi ? ` Kỉ lục: ${giay(cu)}.` : ""}`,
        thang: moi,
      });
      if (moi) voTay(0.4);
      docTo(moi ? "Kỉ lục mới, giỏi lắm!" : "Về đích rồi!", 1);
      return;
    }
    if (d === "ban") {
      if (lb === 1) {
        setTBan1(r.thoiGian);
        setKq({ tieuDe: `Bạn 1 về đích: ${giay(r.thoiGian)}`, chiTiet: "Đưa máy cho Bạn 2 chạy nhé.", thang: true });
        docTo("Tới lượt bạn thứ hai.", 1);
        return;
      }
      const ban1 = t1 ?? Infinity;
      if (r.thoiGian < ban1) {
        setKq({ tieuDe: "Bạn 2 thắng!", chiTiet: `Bạn 2: ${giay(r.thoiGian)}, Bạn 1: ${giay(ban1)}.`, thang: false });
        voTay(0.4);
        setTimeout(() => latest.current.onThua("Bạn 2 chạy nhanh hơn."), 1800);
      } else {
        setKq({ tieuDe: "Bạn 1 thắng!", chiTiet: `Bạn 1: ${giay(ban1)}, Bạn 2: ${giay(r.thoiGian)}.`, thang: true });
        voTay(0.4);
        latest.current.onThang();
      }
      return;
    }
    if (r.thang) {
      setKq({ tieuDe: "Con về nhất!", chiTiet: `Ba vòng hết ${giay(r.thoiGian)}. Chú tiểu chịu thua.`, thang: true });
      docTo("Mô Phật, thí chủ về nhất rồi!", 1);
      voTay(0.45);
      latest.current.onThang();
    } else {
      const ai = d === "to" ? "Ông Tổ" : "Chú tiểu";
      setKq({ tieuDe: `${ai} về nhất`, chiTiet: `Con về nhì, hết ${giay(r.thoiGian)}.`, thang: false });
      setTimeout(() => latest.current.onThua(`${ai} về đích trước con.`), 1800);
    }
  }

  // Dựng sân đua mỗi phiên mới (đổi đối thủ, đua lại, tới lượt bạn 2)
  useEffect(() => {
    if (!webgl || !host.current) return;
    let dead = false;
    (async () => {
      const [THREE, { createDuaXe3D }] = await Promise.all([import("three"), import("@/lib/duaxe3d")]);
      if (dead || !host.current) return;
      const d = latest.current.doi;
      const e = createDuaXe3D(THREE, host.current, {
        doi: (d === "ban" ? "mot" : d) as DoiDua,
        gioi: state.gender === "nu" ? "nu" : "nam",
        bac,
        ten: state.display_name,
        onHud: setHud,
        onXong: xong,
        onSuKien: suKien,
      });
      engine.current = e;
      if (tuChay) {
        setTuChay(false);
        e.batDau();
        setDangChay(true);
      }
    })().catch(() => !dead && setWebgl(false));
    return () => {
      dead = true;
      engine.current?.dispose();
      engine.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webgl, phien]);

  // Bàn phím: mũi tên / A D để rẽ, mũi tên lên / W / phím cách để tăng tốc
  useEffect(() => {
    if (!dangChay) return;
    const map = (k: string) =>
      k === "ArrowLeft" || k === "a" || k === "A"
        ? "trai"
        : k === "ArrowRight" || k === "d" || k === "D"
          ? "phai"
          : k === "ArrowUp" || k === " " || k === "w" || k === "W"
            ? "tang"
            : null;
    const xuong = (e: KeyboardEvent) => {
      const p = map(e.key);
      if (!p) return;
      e.preventDefault();
      engine.current?.setPhim({ [p]: true });
    };
    const len = (e: KeyboardEvent) => {
      const p = map(e.key);
      if (p) engine.current?.setPhim({ [p]: false });
    };
    window.addEventListener("keydown", xuong);
    window.addEventListener("keyup", len);
    return () => {
      window.removeEventListener("keydown", xuong);
      window.removeEventListener("keyup", len);
    };
  }, [dangChay]);

  function chonDoi(v: Doi) {
    setDoi(v);
    setKq(null);
    setDangChay(false);
    setLuotBan(1);
    setTBan1(null);
    setPhien((p) => p + 1);
  }

  function xuatPhat() {
    setKq(null);
    engine.current?.batDau();
    setDangChay(true);
    if (doi === "to") docTo("Đua với Tổ à? Xe Tổ chạy bằng năng lượng hóa học đấy!", 1, "nam");
    else if (doi === "tieu") docTo("Chú tiểu xin đua cùng thí chủ!", 1.05);
  }

  function duaLai(tiep?: "ban2") {
    setKq(null);
    if (tiep === "ban2") setLuotBan(2);
    else {
      setLuotBan(1);
      setTBan1(null);
    }
    setTuChay(true);
    setPhien((p) => p + 1);
  }

  function nut(p: "trai" | "phai" | "tang") {
    const bat = (e: { preventDefault: () => void; pointerId: number; currentTarget: EventTarget }) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      engine.current?.setPhim({ [p]: true });
    };
    const tat = () => engine.current?.setPhim({ [p]: false });
    return { onPointerDown: bat, onPointerUp: tat, onPointerCancel: tat, onLostPointerCapture: tat, onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault() };
  }

  if (webgl === false) return <>{duPhong}</>;

  return (
    <div className="dua3d">
      <div className="row" style={{ marginBottom: 10 }}>
        {CHON.map((c) => (
          <button key={c.v} type="button" className={`chip-chon${doi === c.v ? " is-chon" : ""}`} onClick={() => chonDoi(c.v)}>
            {c.ten}
          </button>
        ))}
      </div>
      <div className="dua3d-khung">
        <div ref={host} className="dua3d-host" />
        {hud && (
          <div className="dua3d-hud" aria-live="off">
            <span>
              Vòng <b>{hud.vong}</b>/{hud.tongVong}
            </span>
            {hud.soXe > 1 && (
              <span>
                Hạng <b>{hud.hang}</b>/{hud.soXe}
              </span>
            )}
            {doi === "ban" && <span>Bạn {luotBan}</span>}
            <span>{hud.thoiGian.toFixed(1).replace(".", ",")} s</span>
            <span>{hud.tocDo} km/h</span>
          </div>
        )}
        {hud && (
          <div className="dua3d-nang" aria-label={`Năng lượng ${hud.nangLuong}`}>
            <span>Năng lượng</span>
            <i style={{ width: `${hud.nangLuong}%` }} />
          </div>
        )}
        {hud?.dem != null && <div className="dua3d-dem">{hud.dem}</div>}
        {bao && (
          <div key={bao.id} className="dua3d-bao">
            {bao.text}
          </div>
        )}
        {dangChay && (
          <>
            <div className="dua3d-lai">
              <button type="button" className="dua3d-nut" aria-label="Rẽ trái" {...nut("trai")}>
                ◀
              </button>
              <button type="button" className="dua3d-nut" aria-label="Rẽ phải" {...nut("phai")}>
                ▶
              </button>
            </div>
            <button
              type="button"
              className={`dua3d-nut dua3d-tang${hud?.tang ? " is-bat" : ""}${hud && hud.nangLuong <= 0 ? " is-het" : ""}`}
              aria-label="Tăng tốc"
              {...nut("tang")}
            >
              Tăng tốc
            </button>
          </>
        )}
        {!dangChay && !kq && (
          <div className="dua3d-mo">
            <p>
              Ba vòng quanh chùa. Giữ nút ◀ ▶ để rẽ, giữ <b>Tăng tốc</b> để dùng năng lượng. Ăn bình xanh để nạp năng lượng,
              ăn sao vàng để phóng nhanh, tránh chum nước.
            </p>
            <button type="button" className="nut nut-vang" onClick={xuatPhat}>
              {doi === "ban" ? `Bạn ${luotBan} xuất phát` : "Xuất phát"}
            </button>
          </div>
        )}
        {kq && (
          <div className={`dua3d-mo${kq.thang ? " is-thang" : ""}`}>
            <h3>{kq.tieuDe}</h3>
            <p>{kq.chiTiet}</p>
            {doi === "ban" && luotBan === 1 && tBan1 !== null ? (
              <button type="button" className="nut nut-vang" onClick={() => duaLai("ban2")}>
                Bạn 2 xuất phát
              </button>
            ) : (
              <button type="button" className="nut nut-vang" onClick={() => duaLai()}>
                Đua lại
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
