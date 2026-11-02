// Tạo supabase/seed.sql từ data/topics.json và data/questions.json
// Chạy: node scripts/build-seed.mjs
//
// Câu hỏi trong questions.json viết theo một trong hai dạng:
//   { "correct": "...", "wrong": ["...", "...", "..."] }  → phương án được xáo trộn cố định
//   { "options": ["A", "B", "C", "D"], "answer": "C" }      → giữ nguyên thứ tự
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const topics = JSON.parse(readFileSync(join(root, "data/topics.json"), "utf8"));
const questions = JSON.parse(readFileSync(join(root, "data/questions.json"), "utf8"));

const LETTERS = ["A", "B", "C", "D"];
const sql = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const sqlArray = (arr) => `array[${arr.map(sql).join(", ")}]::text[]`;

// Bộ sinh số giả ngẫu nhiên có hạt giống, để mỗi lần chạy cho cùng một kết quả
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeQuestion(q, index) {
  if (Array.isArray(q.options)) {
    if (q.options.length !== 4) throw new Error(`Câu ${index + 1}: cần đúng 4 phương án`);
    const answer = String(q.answer || "").toUpperCase();
    if (!LETTERS.includes(answer)) throw new Error(`Câu ${index + 1}: đáp án phải là A, B, C hoặc D`);
    return { ...q, options: q.options, answer };
  }
  if (!q.correct || !Array.isArray(q.wrong) || q.wrong.length !== 3) {
    throw new Error(`Câu ${index + 1}: cần "correct" và 3 phương án "wrong"`);
  }
  const rand = rng(index * 7919 + 17);
  const opts = [q.correct, ...q.wrong];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { ...q, options: opts, answer: LETTERS[opts.indexOf(q.correct)] };
}

const topicIds = new Set(topics.map((t) => t.id));
const lines = [];
lines.push("-- Tự động tạo bởi scripts/build-seed.mjs. Chạy sau schema.sql.");
lines.push("-- Chạy lại nhiều lần không bị trùng câu hỏi.");
lines.push("");
lines.push("insert into public.topics (id, grade, name, kinh_title, kinh, sort_order) values");
lines.push(
  topics
    .map((t, i) => `  (${sql(t.id)}, ${t.grade}, ${sql(t.name)}, ${sql(t.kinh_title)}, ${sqlArray(t.kinh)}, ${i + 1})`)
    .join(",\n") +
    "\non conflict (id) do update set grade = excluded.grade, name = excluded.name,\n" +
    "  kinh_title = excluded.kinh_title, kinh = excluded.kinh, sort_order = excluded.sort_order;"
);
lines.push("");

const counts = {};
const rows = questions.map((raw, i) => {
  const q = normalizeQuestion(raw, i);
  if (!topicIds.has(q.topic)) throw new Error(`Câu ${i + 1}: chuyên đề ${q.topic} không tồn tại`);
  if (![1, 2, 3, 4].includes(q.level)) throw new Error(`Câu ${i + 1}: mức độ phải từ 1 đến 4`);
  const grade = topics.find((t) => t.id === q.topic).grade;
  const key = `${grade}-${q.level}`;
  counts[key] = (counts[key] || 0) + 1;
  const sourceKey = `seed-${String(i + 1).padStart(3, "0")}`;
  return `  (${sql(q.topic)}, ${q.level}, ${sql(q.content)}, ${sqlArray(q.options)}, ${sql(q.answer)}, ${sql(q.explanation)}, ${sql(sourceKey)})`;
});

lines.push("insert into public.questions (topic_id, level, content, options, answer, explanation, source_key) values");
lines.push(rows.join(",\n") + "\non conflict (source_key) do nothing;");
lines.push("");

writeFileSync(join(root, "supabase/seed.sql"), lines.join("\n"));

const answerCount = {};
questions.forEach((raw, i) => {
  const a = normalizeQuestion(raw, i).answer;
  answerCount[a] = (answerCount[a] || 0) + 1;
});
console.log(`Đã tạo supabase/seed.sql: ${topics.length} chuyên đề, ${questions.length} câu hỏi.`);
console.log("Số câu theo lớp-mức:", counts);
console.log("Phân bố đáp án:", answerCount);
