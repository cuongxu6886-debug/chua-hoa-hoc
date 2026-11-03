/** Lời Ông Tổ ban phúc khi đệ tử lên vái xin điểm cao: lời chúc gọi tên và câu thơ lục bát khuyên chăm học. */

export const THO_CHAM_HOC: [string, string][] = [
  ["Muốn cho điểm Hóa mười tròn", "Chăm ôn công thức, bút mòn chẳng lo."],
  ["Phương trình cân đủ mới xong", "Ngày ngày ôn kĩ, trong lòng chẳng quên."],
  ["Chăm ôn như thắp ngọn đèn", "Siêng năng mỗi tối sẽ quen điểm mười."],
  ["Hóa ơi chẳng khó đâu con", "Siêng làm bài tập, điểm son sẽ về."],
  ["Tổ ơi phù hộ cho con", "Ngày ngày chăm học, sách còn trên tay."],
  ["Điểm mười chẳng tự mà sang", "Phải ôn từng chất, từng trang mỗi ngày."],
  ["Đèn khuya trang vở thơm mùi", "Hôm nay chăm chỉ, ngày vui điểm mười."],
  ["Có công mài sắt có ngày", "Nên kim sáng loáng, Hóa hay nhớ đời."],
];

const LOI_CHUC = [
  (ten: string) => `Tổ chúc ${ten} học giỏi, thi Hóa đạt điểm mười!`,
  (ten: string) => `Tổ phù hộ ${ten} nhớ hết công thức, kì thi này đạt mười điểm Hóa!`,
  (ten: string) => `Tổ ban phúc cho ${ten}: làm bài cẩn thận, cân bằng phương trình không sai, điểm Hóa tròn mười!`,
  (ten: string) => `${ten} ơi, Tổ chúc con thi Hóa điểm mười, bảng vàng có tên!`,
];

export function loiTo(ten: string): { chuc: string; tho: [string, string] } {
  const chuc = LOI_CHUC[Math.floor(Math.random() * LOI_CHUC.length)](ten);
  const tho = THO_CHAM_HOC[Math.floor(Math.random() * THO_CHAM_HOC.length)];
  return { chuc, tho };
}
