"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { chuong, docTo, goMo, voTay } from "@/lib/sound";
import { useChanhDien } from "./CanhChua";
import Chua3D, { type Chua3DApi, type Viec3D } from "./Chua3D";
import { IconNhac, useNhacNen } from "./NhacNen";

type Loai = "vao" | "noi" | "qua" | "thich" | "theo" | "ket_thuc";
type SuKien = { id: number; loai: Loai; user: string; ten: string; text?: string; qua?: string; so?: number; cong?: number; tong?: number; at: number };
type Dong = { id: string; chu: string; loai: Loai };

/** Thứ tự giao việc: người sau làm việc khác người trước */
const VIEC: Viec3D[] = ["caro", "an", "vai", "dauho", "tung", "nemcon", "duaxe", "dao"];
const VIEC_CHU: Record<Viec3D, string> = {
  caro: "ra sân chơi cờ caro",
  an: "sang trai đường ăn cơm",
  vai: "lên chánh điện vái Ông Tổ",
  dauho: "ra sân ném que vào ống",
  tung: "vào chánh điện ngồi tụng kinh",
  nemcon: "ra sân ném còn",
  duaxe: "ra xem đua xe",
  dao: "đi dạo quanh sân chùa",
};
const O_LAI_PHUT = 8; // khách ở lại bao lâu thì ra về (TikTok không báo lúc người xem rời live)

const TEN_AO = ["minh.anh.12a1", "hoahoc.kute", "bao.ngoc_2k8", "tuan.phan", "lan.chi.hoa", "khoi.nguyen", "my.tram", "duc.anh_k10", "thu.ha", "quang.huy", "ngoc.han", "gia.bao"];
const LOI_AO = ["Chào cả chùa!", "Ông Tổ ơi cho con điểm 10 Hóa", "Cơm xào Hiđro ngon không ạ?", "Ai chơi cờ caro với mình không", "Mô Phật", "Sắp thi rồi, xin vía Ông Tổ"];

function speakable(text: string) {
  return text.replace(/@/g, "").replace(/([\p{L}\d])[._]([\p{L}\d])/gu, "$1 $2");
}
function hashGioi(s: string): "nam" | "nu" {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h & 1 ? "nu" : "nam";
}

/** Màn hình Chùa live: mỗi người xem live TikTok là một nhân vật vào chùa làm một việc khác nhau. */
export default function LiveKhach() {
  const dong = useChanhDien(false);
  const api = useRef<Chua3DApi | null>(null);
  const nhac = useNhacNen(0.16);
  const [batDau, setBatDau] = useState(false);
  const [bang, setBang] = useState(true);
  const [docChao, setDocChao] = useState(true);
  const [docBinhLuan, setDocBinhLuan] = useState(true);
  const [tuQuay, setTuQuay] = useState(true);
  const [cauNoi, setCauNoi] = useState<boolean | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [feed, setFeed] = useState<Dong[]>([]);
  const [chao, setChao] = useState<{ chu: string; id: number } | null>(null);
  const [soKhach, setSoKhach] = useState(0);
  const lastId = useRef<number>(-1);
  const viecIdx = useRef(0);
  const vaoLuc = useRef(new Map<string, number>());
  const timLuc = useRef(0);
  const cfg = useRef({ docChao, docBinhLuan, batDau });
  cfg.current = { docChao, docBinhLuan, batDau };
  const dangDoc = useRef(0);
  const tong = useRef(new Map<string, { ten: string; diem: number; binhLuan: number }>());
  const viecCua = useRef(new Map<string, Viec3D>());
  const [bangCd, setBangCd] = useState<{ user: string; ten: string; diem: number }[]>([]);

  /** Đọc to; mức 0 = luôn đọc (quà), 1 = đọc tên người mới vào, 2 = lời phụ (bỏ khi đang dồn) */
  const noi = useCallback((text: string, muc: 0 | 1 | 2 = 2, gioi?: "nam" | "nu") => {
    if (!cfg.current.batDau) return;
    const toiDa = muc === 0 ? 99 : muc === 1 ? 5 : 2;
    if (dangDoc.current >= toiDa) return;
    const u = docTo(speakable(text), 1, gioi);
    if (!u) return;
    dangDoc.current++;
    const xong = () => (dangDoc.current = Math.max(0, dangDoc.current - 1));
    u.onend = xong;
    u.onerror = xong;
  }, []);

  /** Ghi công đức (máy chủ gửi kèm tổng; khi thử trên máy thì tự cộng) */
  const congDuc = useCallback((e: SuKien) => {
    const cu = tong.current.get(e.user) ?? { ten: e.ten, diem: 0, binhLuan: 0 };
    let cong = e.cong ?? 0;
    if (e.tong === undefined && e.id === 0) {
      // sự kiện thử trên máy
      if (e.loai === "vao") cong = 5;
      else if (e.loai === "qua") cong = 10 * (e.so ?? 1);
      else if (e.loai === "noi" && cu.binhLuan < 20) cong = 1;
    }
    if (e.loai === "noi") cu.binhLuan++;
    cu.ten = e.ten;
    cu.diem = e.tong ?? cu.diem + cong;
    tong.current.set(e.user, cu);
    setBangCd(
      [...tong.current.entries()]
        .sort((a, b) => b[1].diem - a[1].diem)
        .slice(0, 5)
        .map(([user, d]) => ({ user, ten: d.ten, diem: d.diem }))
    );
    return { cong, tong: cu.diem };
  }, []);

  const ghi = useCallback((chu: string, loai: Loai) => {
    setFeed((f) => [{ id: `${Date.now()}-${Math.random()}`, chu, loai }, ...f].slice(0, 7));
  }, []);

  const vaoChua = useCallback(
    (user: string, ten: string, im = false) => {
      const a = api.current;
      if (!a) return null;
      if (vaoLuc.current.has(user)) return null;
      const viec = a.themKhach({ key: user, ten, gioi: hashGioi(user), viec: VIEC[viecIdx.current++ % VIEC.length] });
      viecCua.current.set(user, viec);
      vaoLuc.current.set(user, Date.now());
      if (!im) {
        setChao({ chu: `Xin chào ${ten}! Mời ${ten} lên chánh điện viếng Ông Tổ xin điểm cao.`, id: Date.now() });
        ghi(`${ten} vào chùa, lên viếng Ông Tổ`, "vao");
        if (cfg.current.docChao) noi(`Xin chào ${ten}, đã đến Chùa Hóa Học! Mời ${ten} lên chánh điện viếng Ông Tổ, xin điểm Hóa thật cao.`, 1);
        goMo(0.25);
      }
      return viec;
    },
    [ghi, noi]
  );

  const xuLy = useCallback(
    (e: SuKien) => {
      const a = api.current;
      if (!a) return;
      const cd = e.user ? congDuc(e) : { cong: 0, tong: 0 };
      if (e.loai === "vao") vaoChua(e.user, e.ten);
      else if (e.loai === "noi" && e.text) {
        if (!vaoLuc.current.has(e.user)) vaoChua(e.user, e.ten, true);
        else vaoLuc.current.set(e.user, Date.now());
        const text = e.text;
        setTimeout(() => {
          api.current?.khachNoi(e.user, text);
          api.current?.khachCongDuc(e.user, 0, cd.tong);
        }, 300);
        ghi(`${e.ten}: ${text}`, "noi");
        if (cfg.current.docBinhLuan) noi(`${e.ten} nói: ${text}`);
      } else if (e.loai === "qua") {
        if (!vaoLuc.current.has(e.user)) vaoChua(e.user, e.ten, true);
        vaoLuc.current.set(e.user, Date.now());
        setTimeout(() => {
          api.current?.khachThapHuong(e.user);
          api.current?.khachCongDuc(e.user, cd.cong, cd.tong);
        }, 300);
        const qua = e.qua || "quà";
        const so = e.so && e.so > 1 ? `${e.so} ` : "";
        setChao({ chu: `Cảm ơn ${e.ten} đã tặng ${so}${qua}! Cộng ${cd.cong} công đức, mời lên thắp hương dâng Ông Tổ.`, id: Date.now() });
        ghi(`${e.ten} tặng ${so}${qua}, +${cd.cong} công đức`, "qua");
        chuong(0.35);
        voTay(0.35);
        noi(`Cảm ơn ${e.ten} đã tặng ${so}${qua}! Cộng ${cd.cong} công đức. Mời ${e.ten} lên chánh điện thắp hương dâng Ông Tổ.`, 0);
      } else if (e.loai === "thich") {
        const now = Date.now();
        if (now - timLuc.current > 6000) {
          timLuc.current = now;
          a.reo();
          ghi(`${e.ten} thả tim, cả chùa reo hò`, "thich");
        }
      } else if (e.loai === "theo") {
        ghi(`${e.ten} đã theo dõi chùa${cd.cong ? `, +${cd.cong} công đức` : ""}`, "theo");
        noi(`Cảm ơn ${e.ten} đã theo dõi Chùa Hóa Học!`);
        if (cd.cong) api.current?.khachCongDuc(e.user, cd.cong, cd.tong);
        a.reo();
      }
    },
    [ghi, noi, vaoChua, congDuc]
  );

  // Viếng Tổ xong: cộng công đức, báo việc tiếp theo
  const viengXong = useCallback(
    (user: string) => {
      const d = tong.current.get(user);
      const ten = d?.ten ?? user;
      api.current?.khachCongDuc(user, 5, d?.diem ?? 5);
      const viec = viecCua.current.get(user);
      ghi(`${ten} viếng Tổ xong, +5 công đức${viec ? `, giờ ${VIEC_CHU[viec]}` : ""}`, "vao");
      noi(`Ông Tổ đã nghe lời ${ten}. Cộng năm công đức!`, 2);
    },
    [ghi, noi]
  );
  const viengRef = useRef(viengXong);
  viengRef.current = viengXong;

  // Đọc sự kiện từ máy chủ
  useEffect(() => {
    let dead = false;
    let busy = false;
    const keo = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const r = await fetch(`/api/live-tiktok?sau=${lastId.current}`, { cache: "no-store" });
        const d = await r.json();
        if (dead) return;
        if (!d.ok) {
          setLoi(d.error ?? "Không đọc được sự kiện live.");
          return;
        }
        setLoi(null);
        setCauNoi(Boolean(d.cauNoi));
        const ds = (d.ds ?? []) as SuKien[];
        lastId.current = d.id;
        ds.forEach((e, i) => setTimeout(() => xuLy(e), i * 350));
      } catch {
        if (!dead) setLoi("Mất kết nối tới máy chủ, đang thử lại…");
      } finally {
        busy = false;
      }
    };
    void keo();
    const id = setInterval(keo, 1500);
    return () => {
      dead = true;
      clearInterval(id);
    };
  }, [xuLy]);

  // Khách ở lâu thì ra về; cập nhật số khách
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      for (const [user, t] of vaoLuc.current) {
        if (now - t > O_LAI_PHUT * 60_000) {
          api.current?.khachVe(user);
          vaoLuc.current.delete(user);
        }
      }
      setSoKhach(api.current?.soKhach() ?? 0);
      api.current?.setOnVieng((u) => viengRef.current(u));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.current?.setTuQuay(tuQuay && batDau);
  }, [tuQuay, batDau]);

  useEffect(() => {
    if (!chao) return;
    const id = setTimeout(() => setChao(null), 4200);
    return () => clearTimeout(id);
  }, [chao]);

  function thuKhach() {
    const ten = TEN_AO[Math.floor(Math.random() * TEN_AO.length)] + Math.floor(Math.random() * 90);
    xuLy({ id: 0, loai: "vao", user: ten, ten, at: Date.now() });
  }
  function thuNoi() {
    const ds = [...vaoLuc.current.keys()];
    const user = ds[Math.floor(Math.random() * ds.length)];
    if (!user) return thuKhach();
    xuLy({ id: 0, loai: "noi", user, ten: user, text: LOI_AO[Math.floor(Math.random() * LOI_AO.length)], at: Date.now() });
  }
  function thuQua() {
    const ds = [...vaoLuc.current.keys()];
    const user = ds[Math.floor(Math.random() * ds.length)] ?? "khach.tang.qua";
    xuLy({ id: 0, loai: "qua", user, ten: user, qua: "hoa hồng", so: 1, at: Date.now() });
  }

  return (
    <main className="lk">
      {dong ? (
        <Chua3D className="lk-canh" people={dong.people} maxLevel={dong.max_level} names="all" api={api} />
      ) : (
        <div className="lk-canh chua3d" aria-hidden="true" />
      )}

      <header className="lk-dau">
        <div>
          <h1>Chùa Hóa Học</h1>
          <p>Vào live là vào chùa</p>
        </div>
        <span className="lk-so">
          Trong chùa: <b>{soKhach}</b> khách
        </span>
      </header>

      {bangCd.length > 0 && (
        <ol className="lk-bxh" aria-label="Bảng công đức live">
          <li className="lk-bxh-dau">Bảng công đức live</li>
          {bangCd.map((d, i) => (
            <li key={d.user}>
              <span>{i + 1}.</span> {d.ten} <b>{d.diem}</b>
            </li>
          ))}
        </ol>
      )}

      {chao && (
        <div key={chao.id} className="lk-chao" role="status">
          {chao.chu}
        </div>
      )}

      <ol className="lk-feed" aria-label="Hoạt động mới">
        {feed.map((d) => (
          <li key={d.id} className={`lk-${d.loai}`}>
            {d.chu}
          </li>
        ))}
      </ol>

      <p className="lk-goi">Vào live là viếng Tổ +5 công đức · Bình luận +1 · Tặng hoa hồng +10 và thắp hương</p>

      {bang ? (
        <section className="lk-bang" aria-label="Bảng điều khiển">
          <div className="lk-bang-dau">
            <b>Bảng điều khiển</b>
            <button type="button" className="nut nut-nho nut-phu" onClick={() => setBang(false)}>
              Ẩn bảng để quay live
            </button>
          </div>
          <p className="small" style={{ margin: "4px 0 8px" }}>
            Cầu nối TikTok:{" "}
            {cauNoi === null ? "đang kiểm tra…" : cauNoi ? <b className="lk-xanh">đang nhận sự kiện</b> : <b className="lk-do">chưa có tín hiệu</b>}
            {loi ? <span className="lk-do"> · {loi}</span> : null}
          </p>
          {!batDau ? (
            <button
              type="button"
              className="nut nut-vang nut-rong"
              onClick={() => {
                setBatDau(true);
                docTo("Chùa Hóa Học đã mở cửa. Mời các bạn vào live!", 1);
              }}
            >
              Bắt đầu (bật tiếng đọc và máy quay tự đi)
            </button>
          ) : (
            <div className="lk-chon">
              <label>
                <input type="checkbox" checked={docChao} onChange={(e) => setDocChao(e.target.checked)} /> Đọc lời chào người mới vào
              </label>
              <label>
                <input type="checkbox" checked={docBinhLuan} onChange={(e) => setDocBinhLuan(e.target.checked)} /> Đọc bình luận
              </label>
              <label>
                <input type="checkbox" checked={tuQuay} onChange={(e) => setTuQuay(e.target.checked)} /> Máy quay tự đi vòng quanh chùa
              </label>
              <button type="button" className="chip" style={{ border: 0, cursor: "pointer", color: "inherit" }} onClick={nhac.toggle}>
                <IconNhac on={nhac.on} /> Nhạc nền
              </button>
            </div>
          )}
          <div className="row" style={{ marginTop: 8, gap: 6 }}>
            <button type="button" className="nut nut-nho" onClick={thuKhach}>
              Thử: khách vào
            </button>
            <button type="button" className="nut nut-nho" onClick={thuNoi}>
              Thử: bình luận
            </button>
            <button type="button" className="nut nut-nho" onClick={thuQua}>
              Thử: tặng quà
            </button>
          </div>
          <p className="small muted" style={{ margin: "8px 0 0" }}>
            Ẩn bảng rồi chụp cửa sổ này vào TikTok LIVE Studio hoặc OBS. Bấm phím H để hiện lại bảng.{" "}
            <Link href="/man-hinh-live">Màn hình live cũ</Link>
          </p>
        </section>
      ) : (
        <button type="button" className="lk-hien" aria-label="Hiện bảng điều khiển" onClick={() => setBang(true)} />
      )}
      <PhimH onH={() => setBang((b) => !b)} />
    </main>
  );
}

function PhimH({ onH }: { onH: () => void }) {
  const ref = useRef(onH);
  ref.current = onH;
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === "h" || e.key === "H") && !(e.target instanceof HTMLInputElement)) ref.current();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return null;
}
