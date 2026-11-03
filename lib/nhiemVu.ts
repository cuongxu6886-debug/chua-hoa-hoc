/** Nhiệm vụ và bậc tu hành: làm nhiệm vụ được điểm tu, đủ điểm thì lên bậc, lên bậc thì mở món ngon và trò chơi xịn hơn. */

export type SuKien =
  | "dung" // trả lời đúng một quẻ
  | "vai_xin" // lên vái Tổ xin điểm cao
  | "an_com" // ăn xong một bữa ở trai đường
  | "tro_chuyen" // trò chuyện với sư thầy, chú tiểu, phật tử
  | "choi_caro"
  | "choi_dauho"
  | "choi_nemcon"
  | "choi_duaxe"
  | "choi_covua"
  | "choi_keoco"
  | "choi_cangua"
  | "thap_huong" // thắp hương dâng Ông Tổ
  | "thang" // thắng chú tiểu hoặc bạn
  | "xa_stress" // xả hết nỗi niềm ở phòng xả stress
  | "sam_hoi" // nói một lời sám hối
  | "xem_video"; // xem hết video tĩnh tâm

export type NhiemVu = { id: string; bac: number; ten: string; su: SuKien; can: number; diem: number };

/** Mỗi nhiệm vụ tính theo tổng số lần đã làm từ trước tới giờ. */
export const NHIEM_VU: NhiemVu[] = [
  { id: "vai1", bac: 1, ten: "Lên vái Tổ xin điểm 10", su: "vai_xin", can: 1, diem: 15 },
  { id: "dung3", bac: 1, ten: "Trả lời đúng 3 quẻ", su: "dung", can: 3, diem: 20 },
  { id: "an1", bac: 1, ten: "Sang trai đường dùng một bữa", su: "an_com", can: 1, diem: 10 },
  { id: "caro1", bac: 1, ten: "Chơi một ván cờ caro", su: "choi_caro", can: 1, diem: 10 },
  { id: "huong1", bac: 1, ten: "Thắp một nén hương dâng Ông Tổ", su: "thap_huong", can: 1, diem: 10 },
  { id: "noi2", bac: 2, ten: "Trò chuyện với sư thầy, chú tiểu 2 lần", su: "tro_chuyen", can: 2, diem: 15 },
  { id: "con1", bac: 2, ten: "Chơi một lượt ném còn", su: "choi_nemcon", can: 1, diem: 10 },
  { id: "dung8", bac: 2, ten: "Trả lời đúng tổng cộng 8 quẻ", su: "dung", can: 8, diem: 25 },
  { id: "xe1", bac: 2, ten: "Đua một chặng xe quanh chùa", su: "choi_duaxe", can: 1, diem: 10 },
  { id: "keo1", bac: 2, ten: "Kéo co một trận ở sân chùa", su: "choi_keoco", can: 1, diem: 10 },
  { id: "thang1", bac: 3, ten: "Thắng chú tiểu (hoặc bạn) một trò bất kì", su: "thang", can: 1, diem: 25 },
  { id: "xa1", bac: 3, ten: "Vào phòng xả stress, xả hết nỗi niềm", su: "xa_stress", can: 1, diem: 20 },
  { id: "dung15", bac: 3, ten: "Trả lời đúng tổng cộng 15 quẻ", su: "dung", can: 15, diem: 30 },
  { id: "que1", bac: 3, ten: "Chơi một lượt ném que vào ống", su: "choi_dauho", can: 1, diem: 10 },
  { id: "ngua1", bac: 3, ten: "Chơi một ván cờ cá ngựa", su: "choi_cangua", can: 1, diem: 15 },
  { id: "covua1", bac: 3, ten: "Chơi một ván cờ vua", su: "choi_covua", can: 1, diem: 15 },
  { id: "sh3", bac: 4, ten: "Nói 3 lời sám hối trong phòng xả stress", su: "sam_hoi", can: 3, diem: 20 },
  { id: "video1", bac: 4, ten: "Xem hết video tĩnh tâm", su: "xem_video", can: 1, diem: 15 },
  { id: "an3", bac: 4, ten: "Dùng tổng cộng 3 bữa ở trai đường", su: "an_com", can: 3, diem: 20 },
  { id: "dung25", bac: 4, ten: "Trả lời đúng tổng cộng 25 quẻ", su: "dung", can: 25, diem: 40 },
  { id: "thang5", bac: 5, ten: "Thắng tổng cộng 5 trò", su: "thang", can: 5, diem: 40 },
  { id: "vai5", bac: 5, ten: "Vái Tổ xin điểm 10 tổng cộng 5 lần", su: "vai_xin", can: 5, diem: 20 },
  { id: "huong7", bac: 5, ten: "Thắp hương dâng Tổ tổng cộng 7 lần", su: "thap_huong", can: 7, diem: 25 },
  { id: "dung40", bac: 5, ten: "Trả lời đúng tổng cộng 40 quẻ", su: "dung", can: 40, diem: 60 },
];

export type Bac = { so: number; ten: string; tu: number; mo: string[] };

/** Điểm tu cần để đạt mỗi bậc, và những gì được mở khi lên bậc đó */
export const BAC: Bac[] = [
  { so: 1, ten: "Tân đệ tử", tu: 0, mo: ["Món cơ bản ở trai đường", "Xe đua xanh"] },
  { so: 2, ten: "Đệ tử chăm", tu: 45, mo: ["Phở chay NaCl 0,9%, nước chanh, xôi gấc", "Xe đua đỏ chạy nhanh hơn", "Tay ném vững hơn", "Đội kéo co khỏe hơn"] },
  { so: 3, ten: "Đệ tử giỏi", tu: 105, mo: ["Bún riêu xanh lam, mì xào tinh bột, sữa đậu nành", "Xe đua bạc, nhiều năng lượng hơn"] },
  { so: 4, ten: "Cao đồ", tu: 195, mo: ["Đậu sốt cà chua, canh rong biển, nước dừa, kem sinh hàn", "Xe đua tím tăng tốc mạnh"] },
  { so: 5, ten: "Đại đệ tử", tu: 290, mo: ["Lẩu nấm vàng Au 24K", "Xe đua vàng"] },
  { so: 6, ten: "Truyền nhân Ông Tổ", tu: 410, mo: ["Mâm cỗ Truyền nhân Ông Tổ", "Xe đua cầu vồng nhanh nhất"] },
];

export type TienDo = { diem: number; dem: Partial<Record<SuKien, number>>; xong: string[] };

export function bacCua(diem: number): Bac {
  let b = BAC[0];
  for (const x of BAC) if (diem >= x.tu) b = x;
  return b;
}

/** Nhiệm vụ đang làm: các nhiệm vụ chưa xong, thuộc bậc hiện tại trở xuống, lấy 4 cái đầu */
export function dangLam(td: TienDo): NhiemVu[] {
  const bac = bacCua(td.diem).so;
  return NHIEM_VU.filter((n) => n.bac <= bac && !td.xong.includes(n.id)).slice(0, 4);
}

/** Ghi một sự kiện: trả về tiến độ mới, các nhiệm vụ vừa xong, bậc mới nếu vừa lên bậc */
export function ghiSuKien(td: TienDo, su: SuKien, so = 1): { td: TienDo; xongMoi: NhiemVu[]; lenBac: Bac | null } {
  const bacCu = bacCua(td.diem).so;
  const dem = { ...td.dem, [su]: (td.dem[su] ?? 0) + so };
  let diem = td.diem;
  const xong = [...td.xong];
  const xongMoi: NhiemVu[] = [];
  // lặp vì lên bậc có thể mở thêm nhiệm vụ đã đủ điều kiện sẵn
  for (let vong = 0; vong < 6; vong++) {
    const bac = bacCua(diem).so;
    let co = false;
    for (const n of NHIEM_VU) {
      if (n.bac > bac || xong.includes(n.id)) continue;
      if ((dem[n.su] ?? 0) >= n.can) {
        xong.push(n.id);
        xongMoi.push(n);
        diem += n.diem;
        co = true;
      }
    }
    if (!co) break;
  }
  const bacMoi = bacCua(diem);
  return { td: { diem, dem, xong }, xongMoi, lenBac: bacMoi.so > bacCu ? bacMoi : null };
}
