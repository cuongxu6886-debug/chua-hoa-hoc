export const LETTERS = ["A", "B", "C", "D"] as const;

export const TIER_NAMES: Record<number, string> = {
  1: "Nhận biết",
  2: "Thông hiểu",
  3: "Vận dụng",
  4: "Vận dụng cao",
};

/** Tên quẻ theo mức khó của câu hỏi */
export const QUE_NAMES: Record<number, string> = {
  1: "Quẻ Hạ",
  2: "Quẻ Trung",
  3: "Quẻ Thượng",
  4: "Quẻ Thượng thượng",
};

export function rankTitle(level: number, maxLevel = 100): string {
  if (level >= maxLevel) return "Sám hối viên mãn";
  const r = level / maxLevel;
  if (r >= 0.75) return "Chân truyền";
  if (r >= 0.5) return "Cao đồ";
  if (r >= 0.25) return "Môn sinh";
  if (r >= 0.1) return "Đệ tử nhập môn";
  return "Khách thập phương";
}

/** Lời Ông Tổ chào, tùy cấp */
export function toGreeting(level: number, maxLevel = 100): string {
  if (level >= maxLevel) return "Con đã sám hối viên mãn. Tổ mừng cho con, nhớ dắt các bạn cùng lên nhé.";
  const r = level / maxLevel;
  if (r >= 0.75) return "Cửa cuối đã gần. Đọc đề chậm thôi, bẫy nằm ở chữ nhỏ.";
  if (r >= 0.5) return "Lên được tới đây là có nghề. Giờ phải luyện tính toán cho chắc tay.";
  if (r >= 0.25) return "Nền đã vững rồi. Từ đây câu hỏi bắt đầu đòi hiểu, không chỉ nhớ.";
  return "Con mới vào chùa. Học chắc từng định nghĩa, Tổ sẽ nâng dần cho con.";
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export type RpcError = { message: string; hint?: string | null } | null;

export function errorText(error: RpcError, fallback = "Có lỗi, con thử lại nhé."): string {
  if (!error) return fallback;
  if (error.message?.includes("Failed to fetch")) return "Mất kết nối mạng. Kiểm tra mạng rồi thử lại.";
  return error.message || fallback;
}
