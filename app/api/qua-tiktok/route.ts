import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Webhook nhận quà TikTok LIVE từ phần mềm livestream (ví dụ một công cụ có chức năng gửi webhook khi có quà).
 * Chấp nhận GET hoặc POST, tham số trong đường link hoặc trong JSON:
 *   key   = TIKTOK_WEBHOOK_SECRET (bắt buộc)
 *   user  = tên TikTok người tặng (cũng nhận: username, uniqueId, nickname)
 *   gift  = tên quà (cũng nhận: giftName, gift_name)
 *   count = số lượng quà (cũng nhận: repeatCount, repeat_count, amount)
 */
async function handle(req: Request) {
  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    const type = req.headers.get("content-type") || "";
    try {
      if (type.includes("application/json")) body = await req.json();
      else if (type.includes("form")) body = Object.fromEntries((await req.formData()).entries());
    } catch {
      body = {};
    }
  }
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = url.searchParams.get(k) ?? body[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };

  const secret = process.env.TIKTOK_WEBHOOK_SECRET;
  if (!secret || pick("key", "secret") !== secret) {
    return NextResponse.json({ ok: false, error: "Sai khóa bí mật." }, { status: 401 });
  }

  const user = pick("user", "username", "uniqueId", "unique_id", "nickname");
  const gift = pick("gift", "giftName", "gift_name").toLowerCase();
  const count = Math.max(1, Math.min(1000, parseInt(pick("count", "repeatCount", "repeat_count", "amount") || "1", 10) || 1));

  if (!user) return NextResponse.json({ ok: false, error: "Thiếu tên TikTok người tặng." }, { status: 400 });

  const allowed = (process.env.TIKTOK_GIFT_NAMES || "rose,hoa hồng")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (gift && !allowed.includes(gift)) {
    return NextResponse.json({ ok: true, skipped: `Quà "${gift}" không đổi ra hương.` });
  }

  const perGift = Math.max(1, parseInt(process.env.HUONG_PER_GIFT || "1", 10) || 1);
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  }

  const { data, error } = await supabase.rpc("cap_huong_tiktok", {
    p_tiktok: user,
    p_so: Math.min(1000, count * perGift),
    p_ghi_chu: `Quà TikTok: ${gift || "rose"} x${count}`,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, result: data });
}

export const GET = handle;
export const POST = handle;
