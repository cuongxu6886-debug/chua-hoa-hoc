import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Sự kiện live TikTok cho màn hình "Chùa live".
 *
 * POST (cầu nối trên máy đang live gửi lên), cần khóa TIKTOK_WEBHOOK_SECRET:
 *   { key, loai: "vao" | "noi" | "qua" | "thich" | "theo" | "ket_thuc", user, ten, text?, qua?, so? }
 * GET (màn hình Chùa live đọc về, chỉ thầy cô quản trị): ?sau=<id sự kiện cuối đã nhận>
 *
 * Sự kiện chỉ giữ trong bộ nhớ của máy chủ (500 cái gần nhất).
 *
 * Công đức của người xem live: vào chùa viếng Tổ +5, bình luận +1 (tối đa 20), theo dõi +5, mỗi quà +10.
 * Nếu học sinh đã ghi tên TikTok trong Hồ sơ, công đức được cộng thẳng vào tài khoản (hàm cong_duc_tiktok).
 */

type Loai = "vao" | "noi" | "qua" | "thich" | "theo" | "ket_thuc";
type SuKien = { id: number; loai: Loai; user: string; ten: string; text?: string; qua?: string; so?: number; cong?: number; tong?: number; at: number };
type Diem = { ten: string; diem: number; binhLuan: number; theo: boolean };
type Kho = { id: number; ds: SuKien[]; daVao: Map<string, number>; luc: number; cd: Map<string, Diem> };

const g = globalThis as unknown as { __chuaLive?: Kho };
const kho: Kho = g.__chuaLive ?? (g.__chuaLive = { id: 0, ds: [], daVao: new Map(), luc: 0, cd: new Map() });
if (!kho.cd) kho.cd = new Map();

const LOAI: Loai[] = ["vao", "noi", "qua", "thich", "theo", "ket_thuc"];

function sach(v: unknown, max: number) {
  return String(v ?? "")
    .replace(/[\u0000-\u001f<>]/g, "")
    .trim()
    .slice(0, max);
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cần gửi JSON." }, { status: 400 });
  }
  const secret = process.env.TIKTOK_WEBHOOK_SECRET;
  const key = sach(body.key ?? new URL(req.url).searchParams.get("key"), 200);
  if (!secret || key !== secret) return NextResponse.json({ ok: false, error: "Sai khóa bí mật." }, { status: 401 });

  const ds = Array.isArray(body.ds) ? (body.ds as Record<string, unknown>[]) : [body];
  const now = Date.now();
  let them = 0;
  const congDb: { user: string; so: number }[] = [];
  for (const e of ds.slice(0, 50)) {
    const loai = sach(e.loai, 12) as Loai;
    if (!LOAI.includes(loai)) continue;
    const user = sach(e.user, 40).replace(/^@/, "");
    if (!user && loai !== "ket_thuc") continue;
    const ten = sach(e.ten, 40) || user;
    // Một người vào lại trong 20 phút thì không tính là vào mới
    if (loai === "vao") {
      const truoc = kho.daVao.get(user);
      if (truoc && now - truoc < 20 * 60_000) continue;
      kho.daVao.set(user, now);
      if (kho.daVao.size > 3000) kho.daVao.clear();
    }
    const so = e.so ? Math.max(1, Math.min(9999, Number(e.so) || 1)) : undefined;
    // Cộng công đức
    let cong = 0;
    let d: Diem | undefined;
    if (user) {
      d = kho.cd.get(user) ?? { ten, diem: 0, binhLuan: 0, theo: false };
      d.ten = ten;
      if (loai === "vao") cong = 5;
      else if (loai === "qua") cong = 10 * (so ?? 1);
      else if (loai === "noi" && d.binhLuan < 20) {
        d.binhLuan++;
        cong = 1;
      } else if (loai === "theo" && !d.theo) {
        d.theo = true;
        cong = 5;
      }
      d.diem += cong;
      kho.cd.set(user, d);
      if (kho.cd.size > 5000) kho.cd.clear();
      if (cong > 0) congDb.push({ user, so: cong });
    }
    kho.ds.push({
      id: ++kho.id,
      loai,
      user,
      ten,
      text: e.text ? sach(e.text, 120) : undefined,
      qua: e.qua ? sach(e.qua, 40) : undefined,
      so,
      cong: cong || undefined,
      tong: d?.diem,
      at: now,
    });
    them++;
  }
  if (kho.ds.length > 500) kho.ds.splice(0, kho.ds.length - 500);
  kho.luc = now;
  // Học sinh đã gắn tên TikTok thì cộng công đức vào tài khoản (bỏ qua nếu chưa cấu hình)
  const sb = congDb.length ? createServiceClient() : null;
  if (sb) {
    const gop = new Map<string, number>();
    for (const c of congDb) gop.set(c.user, (gop.get(c.user) ?? 0) + c.so);
    await Promise.allSettled([...gop].map(([u, n]) => sb.rpc("cong_duc_tiktok", { p_tiktok: u, p_so: n })));
  }
  return NextResponse.json({ ok: true, them, id: kho.id });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Chỉ thầy cô quản trị xem được." }, { status: 403 });

  const sau = Number(new URL(req.url).searchParams.get("sau") ?? "-1");
  // Lần đầu mở màn hình: chỉ lấy mốc, không phát lại sự kiện cũ
  const ds = sau < 0 ? [] : kho.ds.filter((e) => e.id > sau).slice(-80);
  const bang = [...kho.cd.entries()]
    .sort((a, b) => b[1].diem - a[1].diem)
    .slice(0, 6)
    .map(([u, d]) => ({ user: u, ten: d.ten, diem: d.diem }));
  return NextResponse.json({ ok: true, id: kho.id, ds, bang, cauNoi: kho.luc ? Date.now() - kho.luc < 90_000 : false });
}
