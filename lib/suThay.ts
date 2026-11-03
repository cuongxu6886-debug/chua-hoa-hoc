import type { Topic } from "./types";

/** Lời của nhân vật ảo trong chùa: không dùng AI, rút từ kinh (kiến thức trọng tâm) của các chuyên đề. */

type Vai = "su" | "tieu" | "phattu" | string;

const MO_DAU: Record<string, string[]> = {
  su: ["A Di Đà Phật.", "Mô Phật, con.", "Thầy nghe đây."],
  tieu: ["Hì hì,", "Chào bạn!", "Tiểu nghe sư phụ dạy là"],
  phattu: ["Chào con,", "Cô nghe bảo là", "Bác nhớ hồi đi học,"],
};

const KHUYEN: Record<string, string[]> = {
  su: [
    "Học Hóa như tụng kinh, mỗi ngày một ít thì nhớ lâu.",
    "Sai một câu chẳng sao, quan trọng là hiểu vì sao sai.",
    "Đọc đề chậm thôi con, bẫy thường nằm ở chữ nhỏ.",
    "Muốn lên gần Ông Tổ thì phải chắc từng định nghĩa.",
  ],
  tieu: [
    "Tiểu hay quên hóa trị lắm, bạn có quên không?",
    "Bạn ơi, trả lời đúng nhiều là được ngồi gần Ông Tổ đó!",
    "Ném que vào ống vui lắm, bạn chơi chưa?",
  ],
  phattu: [
    "Con chăm học thế này thì thi chắc đậu cao.",
    "Nhớ ghi chép công thức vào sổ nhé con.",
    "Học xong nhớ nghỉ ngơi, uống nước cho tỉnh táo.",
  ],
};

const CHAO = /^(xin\s*)?ch[aà]o|hello|hi\b|a di đà|mô phật/i;
const CAM_ON = /c[aả]m\s*[oơ]n|thank/i;

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

function tuKhoa(s: string) {
  return s
    .toLowerCase()
    .normalize("NFC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3);
}

/** Tìm câu kinh khớp với điều con hỏi (theo tên chuyên đề hoặc từ trong câu kinh). */
function timKinh(topics: Topic[], hoi: string): { topic: Topic; line: string } | null {
  const ws = tuKhoa(hoi);
  if (!ws.length) return null;
  let best: { topic: Topic; line: string; score: number } | null = null;
  for (const t of topics) {
    const tn = t.name.toLowerCase();
    for (const line of t.kinh ?? []) {
      const l = line.toLowerCase();
      let score = 0;
      for (const w of ws) {
        if (tn.includes(w)) score += 2;
        if (l.includes(w)) score += 1;
      }
      if (score > (best?.score ?? 0)) best = { topic: t, line, score };
    }
  }
  return best && best.score >= 2 ? best : null;
}

export function loiNhanVatAo(vai: Vai, topics: Topic[], hoi?: string): string {
  const md = pick(MO_DAU[vai] ?? MO_DAU.su);
  if (!hoi) {
    const t = topics.length ? pick(topics) : null;
    const line = t?.kinh?.length ? pick(t.kinh) : pick(KHUYEN[vai] ?? KHUYEN.su);
    return vai === "su" ? `${md} Con muốn hỏi gì? Thầy dặn: ${line}` : `${md} ${line}`;
  }
  if (CHAO.test(hoi)) return `${md} Chúc con học tốt, sớm lên gần Ông Tổ.`;
  if (CAM_ON.test(hoi)) return vai === "su" ? "A Di Đà Phật. Con cứ chăm học là được." : "Không có gì đâu!";
  const k = timKinh(topics, hoi);
  if (k) return `${md} Về ${k.topic.name.toLowerCase()}: ${k.line}`;
  return `${md} ${pick(KHUYEN[vai] ?? KHUYEN.su)}`;
}
