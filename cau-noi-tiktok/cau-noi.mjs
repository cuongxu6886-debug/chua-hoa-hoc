/**
 * Cầu nối TikTok LIVE → Chùa Hóa Học.
 * Chạy trên máy đang phát live:  node cau-noi.mjs
 * Đọc cấu hình trong cau-hinh.json (chép từ cau-hinh.mau.json rồi sửa).
 *
 * Gửi lên web:
 *   người vào live  → nhân vật vào chùa viếng Ông Tổ (+5 công đức)
 *   bình luận       → bong bóng lời nói trên đầu nhân vật (+1 công đức)
 *   quà             → nhân vật lên thắp hương (+10 công đức mỗi quà); hoa hồng còn đổi ra hương
 *   thả tim         → cả chùa reo hò
 *   theo dõi        → cảm ơn (+5 công đức)
 *
 * Dùng thư viện không chính thức tiktok-live-connector (TikTok không có cổng chính thức cho việc này).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as tlc from "tiktok-live-connector";

// Tên sự kiện của thư viện (bản 2.x); thiếu thì dùng tên chuỗi tương ứng
const TikTokLiveConnection = tlc.TikTokLiveConnection ?? tlc.WebcastPushConnection;
const WebcastEvent = tlc.WebcastEvent ?? { MEMBER: "member", CHAT: "chat", GIFT: "gift", LIKE: "like", FOLLOW: "follow", STREAM_END: "streamEnd" };
const ControlEvent = tlc.ControlEvent ?? { DISCONNECTED: "disconnected" };

const thuMuc = path.dirname(fileURLToPath(import.meta.url));
const fileCauHinh = path.join(thuMuc, "cau-hinh.json");
if (!fs.existsSync(fileCauHinh)) {
  console.log("Chưa có file cau-hinh.json. Hãy chép cau-hinh.mau.json thành cau-hinh.json rồi điền tên TikTok, địa chỉ web và khóa bí mật.");
  process.exit(1);
}
const ch = JSON.parse(fs.readFileSync(fileCauHinh, "utf8"));
const TIKTOK = String(ch.tiktok || process.argv[2] || "").replace(/^@/, "").trim();
const WEB = String(ch.web || "").replace(/\/+$/, "");
const KHOA = String(ch.khoa || "");
const QUA_HUONG = (ch.quaDoiHuong || ["rose", "hoa hồng"]).map((s) => String(s).toLowerCase());
if (!TIKTOK || !WEB || !KHOA || KHOA.startsWith("dan_khoa")) {
  console.log("cau-hinh.json còn thiếu: tiktok, web hoặc khoa. Mở file ra điền đủ rồi chạy lại.");
  process.exit(1);
}

const gio = () => new Date().toLocaleTimeString("vi-VN");
const ghi = (...a) => console.log(`[${gio()}]`, ...a);

/* ---------- Gửi lên web theo lô, mỗi giây một lần ---------- */
let hang = [];
async function gui(ds) {
  try {
    const r = await fetch(`${WEB}/api/live-tiktok`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: KHOA, ds }),
    });
    if (r.status === 401) ghi("Web báo SAI KHÓA BÍ MẬT. Kiểm tra lại 'khoa' trong cau-hinh.json và TIKTOK_WEBHOOK_SECRET trên Render.");
    else if (!r.ok) ghi("Web trả lỗi", r.status);
  } catch (e) {
    ghi("Không gửi được lên web (web đang ngủ hoặc mất mạng), sẽ thử lại:", e.message);
    hang = ds.concat(hang).slice(0, 300);
  }
}
setInterval(() => {
  if (!hang.length) return;
  const ds = hang.splice(0, 50);
  void gui(ds);
}, 1000);
// nhịp tim để màn hình biết cầu nối còn chạy
setInterval(() => void gui([{ loai: "nhip" }]), 30_000);

function day(e) {
  hang.push(e);
}
const ten = (u) => u?.nickname || u?.uniqueId || "";
// bản 1.x để thông tin người ngay trong sự kiện, bản 2.x để trong d.user
const nguoi = (d) => d.user ?? d;

/* Hoa hồng: đổi ra hương qua webhook cũ */
async function doiHuong(user, gift, count) {
  if (!QUA_HUONG.includes(String(gift).toLowerCase())) return;
  try {
    await fetch(`${WEB}/api/qua-tiktok`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: KHOA, user, gift, count }),
    });
  } catch {
    /* bỏ qua */
  }
}

/* Gom tim: mỗi người tối đa một lần báo trong 10 giây */
const timLuc = new Map();

/* ---------- Kết nối TikTok ---------- */
const tuyChon = {};
if (ch.khoaEuler) tuyChon.signApiKey = ch.khoaEuler;
const ketNoi = new TikTokLiveConnection(TIKTOK, tuyChon);

ketNoi.on(WebcastEvent.MEMBER, (d) => {
  const u = nguoi(d)?.uniqueId;
  if (!u) return;
  ghi(`Vào live: ${ten(nguoi(d))} (@${u})`);
  day({ loai: "vao", user: u, ten: ten(nguoi(d)) });
});
ketNoi.on(WebcastEvent.CHAT, (d) => {
  const u = nguoi(d)?.uniqueId;
  if (!u || !d.comment) return;
  ghi(`Bình luận: ${ten(nguoi(d))}: ${d.comment}`);
  day({ loai: "noi", user: u, ten: ten(nguoi(d)), text: d.comment });
});
ketNoi.on(WebcastEvent.GIFT, (d) => {
  const u = nguoi(d)?.uniqueId;
  if (!u) return;
  // quà tặng liên tiếp: chỉ tính khi chuỗi kết thúc
  if ((d.giftDetails?.giftType ?? d.giftType) === 1 && !d.repeatEnd) return;
  const qua = d.giftDetails?.giftName || d.giftName || "quà";
  const so = d.repeatCount || 1;
  ghi(`Quà: ${ten(nguoi(d))} tặng ${so} x ${qua}`);
  day({ loai: "qua", user: u, ten: ten(nguoi(d)), qua, so });
  void doiHuong(u, qua, so);
});
ketNoi.on(WebcastEvent.LIKE, (d) => {
  const u = nguoi(d)?.uniqueId;
  if (!u) return;
  const now = Date.now();
  if (now - (timLuc.get(u) || 0) < 10_000) return;
  timLuc.set(u, now);
  day({ loai: "thich", user: u, ten: ten(nguoi(d)), so: d.likeCount || 1 });
});
ketNoi.on(WebcastEvent.FOLLOW, (d) => {
  const u = nguoi(d)?.uniqueId;
  if (!u) return;
  ghi(`Theo dõi: ${ten(nguoi(d))}`);
  day({ loai: "theo", user: u, ten: ten(nguoi(d)) });
});
ketNoi.on(WebcastEvent.STREAM_END, () => {
  ghi("Phiên live đã kết thúc.");
  day({ loai: "ket_thuc", user: "" });
});
ketNoi.on(ControlEvent.DISCONNECTED, () => {
  ghi("Mất kết nối với TikTok. Thử nối lại sau 20 giây…");
  setTimeout(batDau, 20_000);
});

let dangNoi = false;
async function batDau() {
  if (dangNoi) return;
  dangNoi = true;
  try {
    const st = await ketNoi.connect();
    ghi(`Đã nối vào phiên live của @${TIKTOK} (phòng ${st.roomId}). Mở màn hình Chùa live trên web để xem.`);
  } catch (e) {
    const msg = String(e?.message || e);
    if (/offline|not.*live|UserOffline/i.test(msg)) ghi(`@${TIKTOK} chưa phát live. Đợi 30 giây rồi thử lại…`);
    else ghi("Chưa nối được với TikTok:", msg, "· Thử lại sau 30 giây…");
    setTimeout(batDau, 30_000);
  } finally {
    dangNoi = false;
  }
}

ghi(`Cầu nối Chùa Hóa Học: theo dõi @${TIKTOK}, gửi lên ${WEB}`);
void gui([{ loai: "nhip" }]);
void batDau();
