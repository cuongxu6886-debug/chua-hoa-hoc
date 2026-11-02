import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SYSTEM = `Bạn là "Ông Tổ nghề Hóa" trong trang web học Hóa "Chùa Hóa Học" dành cho học sinh THPT Việt Nam.
Cách nói: hiền, hóm hỉnh, xưng "Tổ", gọi học sinh là "con". Trả lời bằng tiếng Việt, ngắn gọn (tối đa khoảng 150 chữ), văn bản thường, không dùng markdown.
Nội dung: chỉ Hóa học theo chương trình phổ thông 2018 (lớp 10, 11, 12), dùng tên chất theo IUPAC như sách giáo khoa mới (ví dụ sodium hydroxide, ethanol, acetic acid).
Với bài tập: gợi ý từng bước, hỏi lại để học sinh tự làm tiếp; chỉ đưa lời giải đầy đủ khi học sinh đã thử và xin lại. Nếu học sinh sai kiến thức, chỉ ra chỗ sai một cách nhẹ nhàng.
Câu hỏi ngoài môn Hóa: nhắc khéo con quay về bài Hóa.
An toàn: không hướng dẫn điều chế chất nổ, chất độc, chất cấm hay thí nghiệm nguy hiểm ngoài sách giáo khoa; khi đó nhắc con chỉ làm thí nghiệm có thầy cô hướng dẫn.`;

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-")) {
    return NextResponse.json({ error: "Thầy cô chưa bật tính năng Hỏi Ông Tổ." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Con cần đăng nhập trước." }, { status: 401 });

  let messages: Msg[] = [];
  try {
    const body = await req.json();
    messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m: Msg) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-8)
      .map((m: Msg) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  } catch {
    return NextResponse.json({ error: "Câu hỏi không hợp lệ." }, { status: 400 });
  }
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Con chưa nhập câu hỏi." }, { status: 400 });
  }

  // Trừ lượt hỏi trong ngày (máy chủ kiểm tra giới hạn và việc đang chịu phạt)
  const { data: remaining, error: quotaError } = await supabase.rpc("dung_luot_hoi_to");
  if (quotaError) return NextResponse.json({ error: quotaError.message }, { status: 429 });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: 1024,
        system: SYSTEM,
        messages,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Lỗi Claude API", res.status, data);
      return NextResponse.json({ error: "Ông Tổ đang bận, con thử lại sau ít phút." }, { status: 502 });
    }
    const reply = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ reply: reply || "Tổ chưa nghĩ ra, con hỏi lại cách khác nhé.", remaining });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Không kết nối được tới Ông Tổ. Con thử lại sau." }, { status: 502 });
  }
}
