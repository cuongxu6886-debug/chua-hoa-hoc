import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Giọng đọc tiếng Việt tự nhiên cho mọi máy (kể cả máy không cài giọng tiếng Việt).
 *   GET /api/doc?t=<câu cần đọc>&g=nam|nu&r=<tốc độ, 100 = bình thường>
 * Trả về âm thanh MP3.
 *  1. Giọng nơ-ron Microsoft (vi-VN-HoaiMyNeural nữ, vi-VN-NamMinhNeural nam) qua thư viện msedge-tts.
 *  2. Không được thì dùng giọng tiếng Việt của Google Dịch.
 * Câu đã đọc được giữ trong bộ nhớ để lần sau trả ngay.
 */

const cache = new Map<string, Buffer>();
const luot = new Map<string, { n: number; t: number }>();

function sach(t: string) {
  return t
    .replace(/[<>]/g, " ")
    .replace(/&/g, " và ")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

function luuCache(k: string, b: Buffer) {
  cache.set(k, b);
  if (cache.size > 400) cache.delete(cache.keys().next().value as string);
}

async function giongMicrosoft(text: string, gioi: "nam" | "nu", toc: number, tre: boolean): Promise<Buffer> {
  // ép kiểu lỏng: kiểu dữ liệu của thư viện đổi theo phiên bản (tên định dạng âm thanh, tham số giọng)
  const mod: any = await import("msedge-tts");
  const tts: any = new mod.MsEdgeTTS();
  const giong = gioi === "nam" ? "vi-VN-NamMinhNeural" : "vi-VN-HoaiMyNeural";
  await tts.setMetadata(giong, "audio-24khz-48kbitrate-mono-mp3");
  const rate = `${toc >= 100 ? "+" : ""}${toc - 100}%`;
  const pitch = tre ? "+12%" : gioi === "nam" ? "-4%" : "+0%";
  const kq = await tts.toStream(text, { rate, pitch });
  const stream = kq.audioStream;
  const parts: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const hen = setTimeout(() => reject(new Error("quá giờ")), 15000);
    stream.on("data", (c: Buffer) => parts.push(Buffer.from(c)));
    stream.on("end", () => {
      clearTimeout(hen);
      resolve();
    });
    stream.on("close", () => {
      clearTimeout(hen);
      resolve();
    });
    stream.on("error", (e: unknown) => {
      clearTimeout(hen);
      reject(e);
    });
  });
  try {
    tts.close?.();
  } catch {
    /* bỏ qua */
  }
  const b = Buffer.concat(parts);
  if (b.length < 500) throw new Error("không có âm thanh");
  return b;
}

/** Cắt câu dài thành đoạn ≤ 180 kí tự theo dấu câu, khoảng trắng */
function catDoan(text: string) {
  const out: string[] = [];
  let cur = "";
  for (const tu of text.split(/(?<=[,.!?;:])\s+|\s+/)) {
    if ((cur + " " + tu).trim().length > 180) {
      if (cur) out.push(cur);
      cur = tu.slice(0, 180);
    } else cur = (cur + " " + tu).trim();
  }
  if (cur) out.push(cur);
  return out;
}

async function giongGoogle(text: string): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (const doan of catDoan(text)) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(doan)}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.includes("audio")) throw new Error(`Google ${r.status}`);
    parts.push(Buffer.from(await r.arrayBuffer()));
  }
  return Buffer.concat(parts);
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const text = sach(u.searchParams.get("t") || "");
  if (!text) return NextResponse.json({ ok: false, error: "Thiếu câu cần đọc." }, { status: 400 });
  const gioi = u.searchParams.get("g") === "nam" ? "nam" : "nu";
  const toc = Math.max(70, Math.min(140, Number(u.searchParams.get("r")) || 100));
  const tre = gioi === "nam" && toc >= 105; // chú tiểu: giọng trẻ hơn

  // chống gọi dồn: mỗi địa chỉ tối đa 90 câu mới mỗi phút
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  const now = Date.now();
  const l = luot.get(ip);
  const k = `${gioi}|${toc}|${text}`;
  const cu = cache.get(k);
  if (!cu) {
    if (l && now - l.t < 60_000) {
      if (++l.n > 90) return NextResponse.json({ ok: false, error: "Đọc nhiều quá, đợi một chút." }, { status: 429 });
    } else luot.set(ip, { n: 1, t: now });
    if (luot.size > 2000) luot.clear();
  }

  let b = cu;
  if (!b) {
    try {
      b = await giongMicrosoft(text, gioi, toc, tre);
    } catch (e1) {
      try {
        b = await giongGoogle(text);
      } catch (e2) {
        console.error("Không tạo được giọng đọc:", e1, e2);
        return NextResponse.json({ ok: false, error: "Chưa tạo được giọng đọc tiếng Việt." }, { status: 503 });
      }
    }
    luuCache(k, b);
  }
  return new NextResponse(new Uint8Array(b), {
    headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=604800", "content-length": String(b.length) },
  });
}
