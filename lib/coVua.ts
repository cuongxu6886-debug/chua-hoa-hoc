/**
 * Cờ vua: luật đầy đủ (nhập thành, bắt tốt qua đường, phong cấp), kiểm tra chiếu, chiếu hết, hết nước,
 * và máy đánh cờ (tìm kiếm alpha-beta có giới hạn thời gian).
 * Ô 0 là a8 (góc trên bên trái, phía quân đen), ô 63 là h1. Quân trắng đi lên (chỉ số giảm).
 */

export type Mau = "w" | "b";
export type Loai = "p" | "n" | "b" | "r" | "q" | "k";
export type Quan = { id: number; mau: Mau; loai: Loai };
export type The = {
  o: (Quan | null)[];
  luot: Mau;
  /** Quyền nhập thành: K = cánh vua, Q = cánh hậu */
  nhap: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  /** Ô có thể bắt tốt qua đường (ô tốt vừa nhảy qua), -1 nếu không có */
  qua: number;
  /** Số nước đã đi (mỗi bên một lần tính là 1) */
  ply: number;
};
export type NuocDi = {
  tu: number;
  den: number;
  /** Phong cấp thành quân này */
  phong?: Loai;
  /** Bắt tốt qua đường: ô của quân tốt bị bắt */
  anQua?: number;
  /** Nhập thành: xe đi từ ô này sang ô kia */
  xe?: [number, number];
};

export const GIA: Record<Loai, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
export const KI_HIEU: Record<Loai, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
export const TEN_QUAN: Record<Loai, string> = { k: "Vua", q: "Hậu", r: "Xe", b: "Tượng", n: "Mã", p: "Tốt" };

const hang = (i: number) => i >> 3;
const cot = (i: number) => i & 7;
const khac = (m: Mau): Mau => (m === "w" ? "b" : "w");

export function banDau(): The {
  const o: (Quan | null)[] = Array(64).fill(null);
  const sau: Loai[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  let id = 1;
  for (let c = 0; c < 8; c++) {
    o[c] = { id: id++, mau: "b", loai: sau[c] };
    o[8 + c] = { id: id++, mau: "b", loai: "p" };
    o[48 + c] = { id: id++, mau: "w", loai: "p" };
    o[56 + c] = { id: id++, mau: "w", loai: sau[c] };
  }
  return { o, luot: "w", nhap: { wK: true, wQ: true, bK: true, bQ: true }, qua: -1, ply: 0 };
}

const MA: [number, number][] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];
const VUA: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];
const CHEO: [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
const THANG: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** Ô sq có bị quân màu `boi` tấn công không */
export function biTanCong(t: The, sq: number, boi: Mau): boolean {
  const r = hang(sq);
  const c = cot(sq);
  const o = t.o;
  // tốt
  const dr = boi === "w" ? 1 : -1; // tốt trắng ở hàng dưới (r+1) tấn công lên
  for (const dc of [-1, 1]) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const q = o[rr * 8 + cc];
      if (q && q.mau === boi && q.loai === "p") return true;
    }
  }
  for (const [a, b] of MA) {
    const rr = r + a;
    const cc = c + b;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const q = o[rr * 8 + cc];
      if (q && q.mau === boi && q.loai === "n") return true;
    }
  }
  for (const [a, b] of VUA) {
    const rr = r + a;
    const cc = c + b;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const q = o[rr * 8 + cc];
      if (q && q.mau === boi && q.loai === "k") return true;
    }
  }
  for (const [a, b] of CHEO) {
    let rr = r + a;
    let cc = c + b;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const q = o[rr * 8 + cc];
      if (q) {
        if (q.mau === boi && (q.loai === "b" || q.loai === "q")) return true;
        break;
      }
      rr += a;
      cc += b;
    }
  }
  for (const [a, b] of THANG) {
    let rr = r + a;
    let cc = c + b;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const q = o[rr * 8 + cc];
      if (q) {
        if (q.mau === boi && (q.loai === "r" || q.loai === "q")) return true;
        break;
      }
      rr += a;
      cc += b;
    }
  }
  return false;
}

export function oVua(t: The, mau: Mau): number {
  for (let i = 0; i < 64; i++) {
    const q = t.o[i];
    if (q && q.mau === mau && q.loai === "k") return i;
  }
  return -1;
}

export function biChieu(t: The, mau: Mau): boolean {
  const k = oVua(t, mau);
  return k >= 0 && biTanCong(t, k, khac(mau));
}

/** Nước đi giả (chưa xét vua bị chiếu). Không bao giờ ăn vua. */
function nuocGia(t: The, chiAn = false): NuocDi[] {
  const ds: NuocDi[] = [];
  const m = t.luot;
  const o = t.o;
  const them = (tu: number, den: number) => {
    const q = o[den];
    if (q && (q.mau === m || q.loai === "k")) return false;
    if (chiAn && !q) return true;
    ds.push({ tu, den });
    return true;
  };
  for (let i = 0; i < 64; i++) {
    const p = o[i];
    if (!p || p.mau !== m) continue;
    const r = hang(i);
    const c = cot(i);
    switch (p.loai) {
      case "p": {
        const d = m === "w" ? -1 : 1;
        const cuoi = m === "w" ? 0 : 7;
        const r1 = r + d;
        if (r1 < 0 || r1 > 7) break;
        const day = (tu: number, den: number, extra: Partial<NuocDi> = {}) => {
          if (hang(den) === cuoi) for (const ph of ["q", "n", "r", "b"] as Loai[]) ds.push({ tu, den, phong: ph, ...extra });
          else ds.push({ tu, den, ...extra });
        };
        if (!chiAn && !o[r1 * 8 + c]) {
          day(i, r1 * 8 + c);
          const batDau = m === "w" ? 6 : 1;
          const r2 = r + 2 * d;
          if (r === batDau && !o[r2 * 8 + c]) ds.push({ tu: i, den: r2 * 8 + c });
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          const den = r1 * 8 + cc;
          const q = o[den];
          if (q && q.mau !== m && q.loai !== "k") day(i, den);
          else if (den === t.qua) ds.push({ tu: i, den, anQua: r * 8 + cc });
        }
        break;
      }
      case "n":
        for (const [a, b] of MA) {
          const rr = r + a;
          const cc = c + b;
          if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) them(i, rr * 8 + cc);
        }
        break;
      case "k": {
        for (const [a, b] of VUA) {
          const rr = r + a;
          const cc = c + b;
          if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) them(i, rr * 8 + cc);
        }
        if (chiAn) break;
        const goc = m === "w" ? 60 : 4;
        if (i === goc && !biTanCong(t, i, khac(m))) {
          const kQ = m === "w" ? t.nhap.wK : t.nhap.bK;
          const qQ = m === "w" ? t.nhap.wQ : t.nhap.bQ;
          const xeK = o[goc + 3];
          const xeQ = o[goc - 4];
          if (kQ && xeK && xeK.loai === "r" && xeK.mau === m && !o[goc + 1] && !o[goc + 2] && !biTanCong(t, goc + 1, khac(m)) && !biTanCong(t, goc + 2, khac(m)))
            ds.push({ tu: i, den: goc + 2, xe: [goc + 3, goc + 1] });
          if (
            qQ &&
            xeQ &&
            xeQ.loai === "r" &&
            xeQ.mau === m &&
            !o[goc - 1] &&
            !o[goc - 2] &&
            !o[goc - 3] &&
            !biTanCong(t, goc - 1, khac(m)) &&
            !biTanCong(t, goc - 2, khac(m))
          )
            ds.push({ tu: i, den: goc - 2, xe: [goc - 4, goc - 1] });
        }
        break;
      }
      default: {
        const huong = p.loai === "b" ? CHEO : p.loai === "r" ? THANG : [...CHEO, ...THANG];
        for (const [a, b] of huong) {
          let rr = r + a;
          let cc = c + b;
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            const den = rr * 8 + cc;
            const q = o[den];
            if (q) {
              if (q.mau !== m && q.loai !== "k") ds.push({ tu: i, den });
              break;
            }
            if (!chiAn) ds.push({ tu: i, den });
            rr += a;
            cc += b;
          }
        }
      }
    }
  }
  return ds;
}

/** Đi một nước (trả về thế cờ mới, không sửa thế cũ). */
export function diNuoc(t: The, n: NuocDi): The {
  const o = t.o.slice();
  const p = o[n.tu]!;
  const nhap = { ...t.nhap };
  o[n.den] = n.phong ? { id: p.id, mau: p.mau, loai: n.phong } : p;
  o[n.tu] = null;
  if (n.anQua !== undefined) o[n.anQua] = null;
  if (n.xe) {
    o[n.xe[1]] = o[n.xe[0]];
    o[n.xe[0]] = null;
  }
  if (p.loai === "k") {
    if (p.mau === "w") nhap.wK = nhap.wQ = false;
    else nhap.bK = nhap.bQ = false;
  }
  for (const sq of [n.tu, n.den]) {
    if (sq === 63) nhap.wK = false;
    if (sq === 56) nhap.wQ = false;
    if (sq === 7) nhap.bK = false;
    if (sq === 0) nhap.bQ = false;
  }
  const qua = p.loai === "p" && Math.abs(n.den - n.tu) === 16 ? (n.den + n.tu) / 2 : -1;
  return { o, luot: khac(t.luot), nhap, qua, ply: t.ply + 1 };
}

/** Các nước hợp lệ của bên đang tới lượt. */
export function nuocHopLe(t: The, chiAn = false): NuocDi[] {
  return nuocGia(t, chiAn).filter((n) => !biChieu(diNuoc(t, n), t.luot));
}

export type TrangThai = "dang" | "chieu" | "chieuHet" | "hetNuoc" | "thieuQuan";

export function trangThai(t: The): TrangThai {
  const coNuoc = nuocHopLe(t).length > 0;
  const chieu = biChieu(t, t.luot);
  if (!coNuoc) return chieu ? "chieuHet" : "hetNuoc";
  if (thieuQuan(t)) return "thieuQuan";
  return chieu ? "chieu" : "dang";
}

/** Không bên nào đủ quân để chiếu hết (vua trơ, hoặc vua với một mã/tượng). */
function thieuQuan(t: The): boolean {
  let nho = 0;
  for (const q of t.o) {
    if (!q || q.loai === "k") continue;
    if (q.loai === "n" || q.loai === "b") nho++;
    else return false;
  }
  return nho <= 1;
}

/* ---------------- Máy đánh cờ ---------------- */

// Bảng điểm vị trí (nhìn từ phía quân trắng, ô 0 = a8)
const PST: Partial<Record<Loai, number[]>> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5,
    -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20,
    20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10,
    0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0,
    -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40,
    -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

/** Điểm thế cờ nhìn từ bên đang tới lượt. */
export function danhGia(t: The): number {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const q = t.o[i];
    if (!q) continue;
    const bang = PST[q.loai];
    const v = GIA[q.loai] + (bang ? bang[q.mau === "w" ? i : (7 - hang(i)) * 8 + cot(i)] : 0);
    s += q.mau === "w" ? v : -v;
  }
  return t.luot === "w" ? s : -s;
}

function xepNuoc(t: The, ds: NuocDi[]) {
  const diem = (n: NuocDi) => {
    const an = t.o[n.den];
    return (an ? GIA[an.loai] * 10 - GIA[t.o[n.tu]!.loai] : 0) + (n.phong === "q" ? 800 : 0) + (n.anQua !== undefined ? 900 : 0);
  };
  return ds.sort((a, b) => diem(b) - diem(a));
}

const MAT = 100000;

/**
 * Máy chọn nước: tìm sâu dần tới `sau` nước trong `ms` mili giây.
 * `nhieu` > 0 thêm ngẫu nhiên vào điểm (để chú tiểu đánh "non" hơn).
 */
export function mayChon(t: The, sau = 3, ms = 450, nhieu = 0): NuocDi | null {
  const goc = xepNuoc(t, nuocHopLe(t));
  if (!goc.length) return null;
  const het = performance.now() + ms;
  let tot: NuocDi = goc[0];
  let dung = false;

  function tinh(th: The): number {
    const v = danhGia(th);
    return nhieu ? v + (Math.random() - 0.5) * nhieu : v;
  }

  function quiet(th: The, a: number, b: number, sauQ: number): number {
    const dung0 = tinh(th);
    if (dung0 >= b) return dung0;
    if (dung0 > a) a = dung0;
    if (sauQ <= 0) return a;
    for (const n of xepNuoc(th, nuocHopLe(th, true))) {
      const v = -quiet(diNuoc(th, n), -b, -a, sauQ - 1);
      if (v >= b) return v;
      if (v > a) a = v;
    }
    return a;
  }

  function ab(th: The, d: number, a: number, b: number, ply: number): number {
    if ((ply & 3) === 0 && performance.now() > het) {
      dung = true;
      return 0;
    }
    const ds = nuocHopLe(th);
    if (!ds.length) return biChieu(th, th.luot) ? -MAT + ply : 0;
    if (d <= 0) return quiet(th, a, b, 2);
    for (const n of xepNuoc(th, ds)) {
      const v = -ab(diNuoc(th, n), d - 1, -b, -a, ply + 1);
      if (dung) return 0;
      if (v >= b) return v;
      if (v > a) a = v;
    }
    return a;
  }

  for (let d = 1; d <= sau; d++) {
    let a = -Infinity;
    let best: NuocDi | null = null;
    // nước tốt nhất lần trước xét trước
    const ds = [tot, ...goc.filter((n) => n !== tot)];
    for (const n of ds) {
      const v = -ab(diNuoc(t, n), d - 1, -Infinity, -a, 1);
      if (dung) break;
      if (v > a) {
        a = v;
        best = n;
      }
    }
    if (dung) break;
    if (best) tot = best;
    if (a >= MAT - 50) break; // đã thấy chiếu hết
  }
  return tot;
}

/** Tên ô kiểu a1..h8 */
export function tenO(i: number) {
  return "abcdefgh"[cot(i)] + (8 - hang(i));
}
