/**
 * Cờ cá ngựa (luật đơn giản cho sân chùa):
 *  - Gieo 1 hoặc 6 thì được đưa một ngựa ra cửa chuồng. Gieo 6 được gieo thêm lượt nữa.
 *  - Ngựa chạy theo chiều kim đồng hồ 50 ô quanh bàn, rồi vào 5 ô đường về và ô đích (tổng 56 bước).
 *  - Không đi quá ô đích, không đứng chồng lên ngựa nhà mình.
 *  - Đứng đúng ô có ngựa đối thủ (trên đường chung) thì đá ngựa đó về chuồng.
 *  - Ai đưa hết ngựa về đích trước thì thắng.
 * Bàn 15 x 15 ô, (hàng, cột) tính từ góc trên bên trái.
 */

export type ONgua = [number, number];
/** Màu theo chiều kim đồng hồ từ góc trên trái: 0 xanh lá, 1 vàng, 2 xanh dương, 3 đỏ */
export type MauNgua = 0 | 1 | 2 | 3;
export const TEN_MAU = ["xanh lá", "vàng", "xanh dương", "đỏ"] as const;
export const MAU_HEX = ["#3f9a5a", "#e2b12a", "#3a7bc8", "#d2402a"] as const;

/** 52 ô đường chung, theo chiều kim đồng hồ, bắt đầu từ cửa chuồng màu 0 */
export const DUONG: ONgua[] = (() => {
  const d: ONgua[] = [];
  for (let c = 1; c <= 5; c++) d.push([6, c]);
  for (let r = 5; r >= 0; r--) d.push([r, 6]);
  d.push([0, 7]);
  d.push([0, 8]);
  for (let r = 1; r <= 5; r++) d.push([r, 8]);
  for (let c = 9; c <= 14; c++) d.push([6, c]);
  d.push([7, 14]);
  d.push([8, 14]);
  for (let c = 13; c >= 9; c--) d.push([8, c]);
  for (let r = 9; r <= 14; r++) d.push([r, 8]);
  d.push([14, 7]);
  d.push([14, 6]);
  for (let r = 13; r >= 9; r--) d.push([r, 6]);
  for (let c = 5; c >= 0; c--) d.push([8, c]);
  d.push([7, 0]);
  d.push([6, 0]);
  return d;
})();

export const BUOC_DICH = 56;
const CUOI_DUONG = 50; // bước cuối còn trên đường chung

/** Ô trên bàn của một ngựa màu m đã đi được p bước (0 = cửa chuồng) */
export function oCua(m: MauNgua, p: number): ONgua {
  if (p <= CUOI_DUONG) return DUONG[(p + m * 13) % 52];
  const k = p - CUOI_DUONG; // 1..6, 6 là đích
  switch (m) {
    case 0:
      return [7, k];
    case 1:
      return [k, 7];
    case 2:
      return [7, 14 - k];
    default:
      return [14 - k, 7];
  }
}

/** Chỉ số ô đường chung (0..51) của ngựa, -1 nếu đang ở chuồng hoặc trên đường về */
export function chiSoDuong(m: MauNgua, p: number) {
  return p >= 0 && p <= CUOI_DUONG ? (p + m * 13) % 52 : -1;
}

/** Góc chuồng: hàng, cột góc trên trái của khu 6x6 */
export const GOC_CHUONG: ONgua[] = [
  [0, 0],
  [0, 9],
  [9, 9],
  [9, 0],
];

export type Ngua = { mau: MauNgua; so: number; p: number }; // p = -1: trong chuồng
export type BanNgua = { ngua: Ngua[]; nguoi: MauNgua[] };

export function banMoi(nguoi: MauNgua[], soNgua: number): BanNgua {
  const ngua: Ngua[] = [];
  for (const m of nguoi) for (let k = 0; k < soNgua; k++) ngua.push({ mau: m, so: k, p: -1 });
  return { ngua, nguoi };
}

export type NuocNgua = { chiSo: number; tu: number; den: number; da: number[] };

/** Các nước đi được của màu m với số xúc xắc x */
export function nuocNgua(b: BanNgua, m: MauNgua, x: number): NuocNgua[] {
  const ds: NuocNgua[] = [];
  b.ngua.forEach((n, i) => {
    if (n.mau !== m || n.p >= BUOC_DICH) return;
    let den: number;
    if (n.p < 0) {
      if (x !== 1 && x !== 6) return;
      den = 0;
    } else {
      den = n.p + x;
      if (den > BUOC_DICH) return;
    }
    // không chồng lên ngựa nhà
    if (den < BUOC_DICH && b.ngua.some((k, j) => j !== i && k.mau === m && k.p === den)) return;
    const da: number[] = [];
    const cs = chiSoDuong(m, den);
    if (cs >= 0)
      b.ngua.forEach((k, j) => {
        if (k.mau !== m && chiSoDuong(k.mau, k.p) === cs) da.push(j);
      });
    ds.push({ chiSo: i, tu: n.p, den, da });
  });
  return ds;
}

export function diNgua(b: BanNgua, n: NuocNgua): BanNgua {
  const ngua = b.ngua.map((k, j) => (j === n.chiSo ? { ...k, p: n.den } : n.da.includes(j) ? { ...k, p: -1 } : k));
  return { ...b, ngua };
}

export function veDich(b: BanNgua, m: MauNgua) {
  return b.ngua.filter((n) => n.mau === m && n.p >= BUOC_DICH).length;
}

export function thangCuoc(b: BanNgua, m: MauNgua) {
  return b.ngua.filter((n) => n.mau === m).every((n) => n.p >= BUOC_DICH);
}

/** Máy chọn nước: ưu tiên về đích, đá ngựa, ra chuồng, tránh ô nguy hiểm */
export function chonNuoc(b: BanNgua, ds: NuocNgua[], khon = true): NuocNgua | null {
  if (!ds.length) return null;
  if (!khon && Math.random() < 0.45) return ds[Math.floor(Math.random() * ds.length)];
  const m = b.ngua[ds[0].chiSo].mau;
  let tot = ds[0];
  let diemTot = -Infinity;
  for (const n of ds) {
    let d = n.den - Math.max(0, n.tu);
    if (n.den >= BUOC_DICH) d += 100;
    if (n.da.length) d += 60 + b.ngua[n.da[0]].p;
    if (n.tu < 0) d += 40;
    if (n.tu <= CUOI_DUONG && n.den > CUOI_DUONG) d += 35;
    if (khon) {
      const cs = chiSoDuong(m, n.den);
      if (cs >= 0) {
        // có ngựa đối thủ đứng sau trong vòng 6 ô không
        const nguy = b.ngua.some((k) => {
          const c2 = chiSoDuong(k.mau, k.p);
          if (k.mau === m || c2 < 0) return false;
          const kc = (cs - c2 + 52) % 52;
          return kc >= 1 && kc <= 6;
        });
        if (nguy) d -= 25;
      }
      // đang đứng chỗ nguy hiểm thì nên chạy
      const csTu = chiSoDuong(m, n.tu);
      if (csTu >= 0 && b.ngua.some((k) => k.mau !== m && chiSoDuong(k.mau, k.p) >= 0 && ((csTu - chiSoDuong(k.mau, k.p) + 52) % 52) <= 6 && ((csTu - chiSoDuong(k.mau, k.p) + 52) % 52) >= 1)) d += 15;
    }
    if (d > diemTot) {
      diemTot = d;
      tot = n;
    }
  }
  return tot;
}
