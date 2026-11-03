"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { chuong, goMo } from "@/lib/sound";
import { GIA, KI_HIEU, TEN_QUAN, banDau, biChieu, biTanCong, diNuoc, mayChon, nuocHopLe, oVua, trangThai, type NuocDi, type Quan, type The } from "@/lib/coVua";
import { useNhiemVu } from "./NhiemVu";
import { KhanGiaDom, LuatSan, PhaoGiay, TIEU_NOI, TO_NOI, ToNoi, noiDoi, pick, useCoVuDom } from "./sanChung";

type DoiCo = "to" | "tieu" | "ban";
const TEN: Record<DoiCo, string> = { to: "Ông Tổ", tieu: "Chú tiểu", ban: "Bạn 2" };
const DS_DOI: [DoiCo, string][] = [
  ["to", "Thách đấu Ông Tổ"],
  ["tieu", "Chơi với Chú tiểu"],
  ["ban", "Hai bạn chung máy"],
];
/** Cờ hòa khi ván quá dài */
const PLY_TOI_DA = 160;

const TO_CO = {
  batDau: ["Cờ vua là trò của vua, mà Tổ là vua môn Hóa!", "Con cầm quân trắng đi trước. Tổ nhường con đấy.", "Bàn cờ 64 ô, như 64 nguyên tố đầu tiên vậy."],
  chieu: ["Chiếu! Vua con đang nóng như phản ứng tỏa nhiệt.", "Chiếu tướng! Con tính đi đâu?", "Chiếu! Bình tĩnh mà gỡ nhé."],
  an: ["Tổ ăn quân này nhé, phản ứng thế đấy.", "Quân này Tổ thu hồi để tái chế.", "Cảm ơn con đã mời Tổ ăn quân."],
};

export default function CoVua() {
  const [doi, setDoi] = useState<DoiCo>("to");
  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        {DS_DOI.map(([v, ten]) => (
          <button key={v} type="button" className={`chip-chon${doi === v ? " is-chon" : ""}`} onClick={() => setDoi(v)}>
            {ten}
          </button>
        ))}
      </div>
      <BanCoVua key={doi} doi={doi} />
    </div>
  );
}

function BanCoVua({ doi }: { doi: DoiCo }) {
  const luat = useContext(LuatSan);
  const { bac } = useNhiemVu();
  const voiTo = doi === "to";
  const hai = doi === "ban";
  const ten = TEN[doi];
  const loiDau = () => (voiTo ? pick(TO_CO.batDau) : doi === "tieu" ? pick(TIEU_NOI.batDau) : null);
  const [the, setThe] = useState<The>(banDau);
  const [chon, setChon] = useState(-1);
  const [cuoi, setCuoi] = useState<{ tu: number; den: number } | null>(null);
  const [nghi, setNghi] = useState(false);
  const [ketqua, setKetqua] = useState<string | null>(null);
  const [conThang, setConThang] = useState(false);
  const [phep, setPhep] = useState(-1);
  const [toNoi, setToNoi] = useState<string | null>(loiDau);
  const [an, setAn] = useState<{ w: Quan[]; b: Quan[] }>({ w: [], b: [] });
  const [tiSo, setTiSo] = useState({ con: 0, doi: 0 });
  const [goiY, setGoiY] = useState(false);
  const { cv, reoDom } = useCoVuDom();
  const hen = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => hen.current.forEach(clearTimeout), []);
  const sau = (ms: number, f: () => void) => hen.current.push(setTimeout(f, ms));

  const hopLe = useMemo(() => (ketqua ? [] : nuocHopLe(the)), [the, ketqua]);
  const dich = useMemo(() => (chon >= 0 ? hopLe.filter((n) => n.tu === chon) : []), [hopLe, chon]);
  const vuaChieu = !ketqua && biChieu(the, the.luot) ? oVua(the, the.luot) : -1;

  function moi() {
    hen.current.forEach(clearTimeout);
    hen.current = [];
    setThe(banDau());
    setChon(-1);
    setCuoi(null);
    setNghi(false);
    setKetqua(null);
    setConThang(false);
    setPhep(-1);
    setAn({ w: [], b: [] });
    setToNoi(loiDau());
  }

  /** Đi một nước: ghi quân bị ăn, đổi lượt */
  function apDung(t: The, n: NuocDi): The {
    const bi = n.anQua !== undefined ? t.o[n.anQua] : t.o[n.den];
    if (bi) setAn((a) => ({ ...a, [t.luot]: [...a[t.luot], bi] }));
    const moiThe = diNuoc(t, n);
    goMo(bi ? 0.32 : 0.22);
    setThe(moiThe);
    setCuoi({ tu: n.tu, den: n.den });
    setChon(-1);
    return moiThe;
  }

  /** Xét kết thúc ván. Trả về true nếu ván đã xong. */
  function xet(t: The): boolean {
    const tt = trangThai(t);
    if (tt === "chieu") chuong(0.12);
    if (tt === "dang" || tt === "chieu") {
      if (t.ply >= PLY_TOI_DA) {
        setKetqua("Ván dài quá, hai bên hòa.");
        luat.choi("covua");
        return true;
      }
      return false;
    }
    luat.choi("covua");
    if (tt !== "chieuHet") {
      setKetqua(tt === "hetNuoc" ? "Hết nước đi: hòa cờ." : "Không đủ quân chiếu hết: hòa cờ.");
      return true;
    }
    // bên vừa đi (khác t.luot) thắng
    const trangThang = t.luot === "b";
    reoDom(true);
    if (trangThang) {
      setKetqua(hai ? "Chiếu hết! Bạn 1 (quân trắng) thắng." : "Chiếu hết! Con thắng rồi, giỏi quá!");
      setConThang(true);
      setTiSo((s) => ({ ...s, con: s.con + 1 }));
      chuong(0.35);
      luat.thang();
      if (doi === "tieu") {
        const l = pick(TIEU_NOI.thua);
        setToNoi(l);
        noiDoi("tieu", l);
      }
    } else {
      setKetqua(`Chiếu hết! ${hai ? "Bạn 2 (quân đen)" : ten} thắng.`);
      setTiSo((s) => ({ ...s, doi: s.doi + 1 }));
      if (!hai) {
        const l = voiTo ? pick(TO_NOI.toThang) : pick(TIEU_NOI.thang);
        setToNoi(l);
        noiDoi(doi, l);
        sau(2000, () => luat.thua(`${ten} chiếu hết vua của con.`));
      }
    }
    return true;
  }

  /** Ông Tổ hóa phép khi con sắp thắng: một quân trắng đang chiếu (không phải vua) đổi màu thành quân đen. */
  function hoaPhep(t: The, n: NuocDi): The | null {
    const vuaDen = oVua(t, "b");
    let chonO = -1;
    let gia = -1;
    for (let i = 0; i < 64; i++) {
      const q = t.o[i];
      if (!q || q.mau !== "w" || q.loai === "k") continue;
      // quân đang tấn công vua đen?
      const thu: The = { ...t, o: t.o.map((x, k) => (k === i ? x : x && x.mau === "w" ? null : x)) };
      thu.o[oVua(t, "w")] = t.o[oVua(t, "w")];
      const dangChieu = biTanCong(thu, vuaDen, "w");
      const v = (dangChieu ? 2000 : 0) + (i === n.den ? 500 : 0) + GIA[q.loai];
      if (v > gia) {
        gia = v;
        chonO = i;
      }
    }
    if (chonO < 0) return null;
    const o = t.o.slice();
    o[chonO] = { ...o[chonO]!, mau: "b" };
    setPhep(chonO);
    sau(1600, () => setPhep(-1));
    return { ...t, o };
  }

  function bam(i: number) {
    if (ketqua || nghi) return;
    const q = the.o[i];
    const nuoc = dich.find((n) => n.den === i && (!n.phong || n.phong === "q"));
    if (nuoc) {
      let t = apDung(the, nuoc);
      if (hai) {
        xet(t);
        return;
      }
      const tt = trangThai(t);
      if (voiTo && (tt === "chieuHet" || tt === "hetNuoc")) {
        // Tổ không chịu thua, cũng không chịu hòa
        const p = hoaPhep(t, nuoc);
        if (p && nuocHopLe(p).length) {
          t = p;
          setThe(p);
          reoDom(true);
          const l = pick(TO_NOI.phep);
          setToNoi(l);
          noiDoi("to", l);
          chuong(0.2);
        }
      }
      if (xet(t)) return;
      setNghi(true);
      sau(voiTo ? 420 : 360, () => mayDi(t));
      return;
    }
    if (q && q.mau === the.luot && (hai || q.mau === "w")) {
      setChon(i === chon ? -1 : i);
      goMo(0.08);
    } else setChon(-1);
  }

  function mayDi(t: The) {
    // chú tiểu: nghĩ nông, hay đi lung tung; bậc càng cao chú càng non hơn một chút
    const ds = nuocHopLe(t);
    let n: NuocDi | null;
    if (voiTo) n = mayChon(t, 4, 650);
    else if (Math.random() < 0.3 + 0.03 * (bac.so - 1)) n = ds[Math.floor(Math.random() * ds.length)] ?? null;
    else n = mayChon(t, 1, 120, 140);
    setNghi(false);
    if (!n) return;
    const bi = t.o[n.den];
    const moiThe = apDung(t, n.phong ? { ...n, phong: "q" } : n);
    if (xet(moiThe)) return;
    if (voiTo) {
      if (biChieu(moiThe, "w") && Math.random() < 0.6) setToNoi(pick(TO_CO.chieu));
      else if (bi && Math.random() < 0.4) setToNoi(pick(TO_CO.an));
      else if (Math.random() < 0.12) setToNoi(pick(TO_NOI.toDi));
    }
  }

  const nhac = ketqua
    ? null
    : hai
      ? `Tới lượt ${the.luot === "w" ? "Bạn 1 (quân trắng)" : "Bạn 2 (quân đen)"}.`
      : nghi
        ? `${ten} đang nghĩ…`
        : vuaChieu >= 0
          ? "Vua con đang bị chiếu! Gỡ chiếu đi."
          : "Tới lượt con (quân trắng). Chạm một quân rồi chạm ô muốn đi.";

  // Danh sách quân để vẽ (theo id, để quân trượt mượt khi đi)
  const quan: { q: Quan; i: number }[] = [];
  the.o.forEach((q, i) => q && quan.push({ q, i }));
  quan.sort((a, b) => a.q.id - b.q.id);

  return (
    <div className="cv-khung">
      <ToNoi text={toNoi} ai={hai ? "ban" : doi} />
      <div className="ti-so">
        <span className="mau-x">
          {hai ? "Bạn 1" : "Con"} {tiSo.con}
        </span>
        <span>–</span>
        <span className="mau-o">
          {tiSo.doi} {ten}
        </span>
      </div>
      <KhanGiaDom cv={cv} />
      <div className="cv-an" aria-label="Quân đã ăn">
        <span>{an.b.map((q) => KI_HIEU[q.loai] + "︎").join("")}</span>
      </div>
      <div className="cv-ban" role="grid" aria-label="Bàn cờ vua">
        {Array.from({ length: 64 }, (_, i) => {
          const den = dich.find((n) => n.den === i);
          const q = the.o[i];
          const cls = [
            "cv-o",
            ((i >> 3) + (i & 7)) % 2 ? "is-toi" : "is-sang",
            i === chon ? "is-chon" : "",
            cuoi && (i === cuoi.tu || i === cuoi.den) ? "is-cuoi" : "",
            den ? (q ? "is-an" : "is-di") : "",
            i === vuaChieu ? "is-chieu" : "",
            i === phep ? "is-phep" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={i}
              type="button"
              className={cls}
              onClick={() => bam(i)}
              aria-label={`${"abcdefgh"[i & 7]}${8 - (i >> 3)}${q ? `, ${TEN_QUAN[q.loai]} ${q.mau === "w" ? "trắng" : "đen"}` : ""}`}
            />
          );
        })}
        <div className="cv-quan-lop" aria-hidden="true">
          {quan.map(({ q, i }) => (
            <span
              key={q.id}
              className={`cv-quan ${q.mau === "w" ? "is-trang" : "is-den"}${i === phep ? " is-phep" : ""}`}
              style={{ transform: `translate(${(i & 7) * 100}%, ${(i >> 3) * 100}%)` }}
            >
              {KI_HIEU[q.loai]}
              {"︎"}
            </span>
          ))}
        </div>
      </div>
      <div className="cv-an" aria-label="Quân đã mất">
        <span>{an.w.map((q) => KI_HIEU[q.loai] + "︎").join("")}</span>
      </div>
      <PhaoGiay chay={conThang} />
      <div className="row" style={{ marginTop: 10 }}>
        {ketqua ? <strong className="ket-tro">{ketqua}</strong> : <span className="small muted">{nhac}</span>}
        <button type="button" className="nut nut-nho" onClick={moi}>
          Ván mới
        </button>
        <button type="button" className="nut nut-nho nut-phu" onClick={() => setGoiY((v) => !v)}>
          {goiY ? "Ẩn cách đi" : "Cách đi quân"}
        </button>
      </div>
      {goiY && (
        <ul className="small cv-goi-y">
          <li>Tốt đi thẳng 1 ô (lần đầu được 2 ô), ăn chéo. Tới hàng cuối thành Hậu.</li>
          <li>Mã đi hình chữ L, nhảy qua được quân khác.</li>
          <li>Tượng đi chéo, Xe đi thẳng, Hậu đi cả chéo lẫn thẳng, Vua đi 1 ô.</li>
          <li>Chiếu hết vua đối thủ là thắng. Ô có chấm là nơi quân đang chọn đi được.</li>
        </ul>
      )}
    </div>
  );
}
