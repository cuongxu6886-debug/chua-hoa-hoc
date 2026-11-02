"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorText } from "@/lib/game";
import { chuong } from "@/lib/sound";
import type { RoomSeat } from "@/lib/types";
import { useChanhDien } from "./CanhChua";
import Chua3D from "./Chua3D";
import { IconNhac, useNhacNen } from "./NhacNen";
import RoomGrid from "./RoomGrid";

type Loai = "vao_chua" | "tang_qua" | "thap_huong" | "ngoi_phat" | "sam_hoi";
type SuKien = { id: number; loai: Loai; noi_dung: string; at: string };
type Live = {
  last_id: number;
  events: SuKien[];
  online: number;
  room: { capacity: number; seated: RoomSeat[]; waiting: number };
  top: { name: string; class_name: string | null; level: number; cong_duc: number; sam_hoi: boolean }[];
};

const LOAI: Record<Loai, string> = {
  vao_chua: "Có người vào chùa",
  tang_qua: "Có người tặng quà",
  thap_huong: "Có người thắp hương",
  ngoi_phat: "Có người lên ngồi phạt",
  sam_hoi: "Có người sám hối thành công",
};

const POLL_MS = 3000;

/** Đọc tên TikTok cho rõ: "an.hoahoc" → "an hoahoc" */
function speakable(text: string) {
  return text.replace(/@/g, "").replace(/([\p{L}\d])[._]([\p{L}\d])/gu, "$1 $2");
}

export default function ManHinhLive() {
  const supabase = useMemo(() => createClient(), []);
  const [live, setLive] = useState<Live | null>(null);
  const [feed, setFeed] = useState<SuKien[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [rate, setRate] = useState(0.95);
  const [types, setTypes] = useState<Record<Loai, boolean>>({
    vao_chua: true,
    tang_qua: true,
    thap_huong: true,
    ngoi_phat: true,
    sam_hoi: true,
  });
  const [current, setCurrent] = useState<SuKien | null>(null);
  const [showControls, setShowControls] = useState(true);
  const nhac = useNhacNen(0.2);
  const dong = useChanhDien(false);
  const duck = nhac.duck;

  const lastId = useRef<number | null>(null);
  const queue = useRef<SuKien[]>([]);
  const speaking = useRef(false);
  const settings = useRef({ started, voiceName, rate, types });
  settings.current = { started, voiceName, rate, types };

  // Danh sách giọng tiếng Việt có trong máy
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const vi = all.filter((v) => v.lang.toLowerCase().startsWith("vi"));
      setVoices(vi);
      setVoiceName((cur) => {
        if (cur) return cur;
        const best =
          vi.find((v) => /HoaiMy|NamMinh|Natural|Online/i.test(v.name)) ?? vi.find((v) => /Google/i.test(v.name)) ?? vi[0];
        return best?.name ?? "";
      });
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const speakNext = useCallback(() => {
    if (speaking.current) return;
    const ev = queue.current.shift();
    if (!ev) {
      setCurrent(null);
      duck(false);
      return;
    }
    speaking.current = true;
    setCurrent(ev);
    duck(true);
    if (ev.loai === "tang_qua" || ev.loai === "sam_hoi") chuong(0.3);

    const done = () => {
      speaking.current = false;
      setTimeout(speakNext, 500);
    };
    if (!("speechSynthesis" in window)) {
      setTimeout(done, 3500);
      return;
    }
    const u = new SpeechSynthesisUtterance(speakable(ev.noi_dung));
    u.lang = "vi-VN";
    u.rate = settings.current.rate;
    const v = window.speechSynthesis.getVoices().find((x) => x.name === settings.current.voiceName);
    if (v) u.voice = v;
    u.onend = done;
    u.onerror = done;
    setTimeout(() => window.speechSynthesis.speak(u), ev.loai === "tang_qua" || ev.loai === "sam_hoi" ? 900 : 0);
  }, [duck]);

  const enqueue = useCallback(
    (events: SuKien[]) => {
      const s = settings.current;
      if (!s.started) return;
      let picked = events.filter((e) => s.types[e.loai]);
      // Nhiều người vào chùa cùng lúc thì gộp lại cho khỏi đọc dồn dập
      const joins = picked.filter((e) => e.loai === "vao_chua");
      if (joins.length > 4) {
        picked = picked.filter((e) => e.loai !== "vao_chua");
        picked.unshift({
          ...joins[joins.length - 1],
          noi_dung: `Có thêm ${joins.length} đệ tử vừa vào chùa. Chào mừng các con.`,
        });
      }
      queue.current.push(...picked);
      if (queue.current.length > 12) queue.current = queue.current.slice(-12);
      speakNext();
    },
    [speakNext]
  );

  const inflight = useRef(false);
  const poll = useCallback(async () => {
    // Không gửi chồng yêu cầu khi mạng chậm, để không đọc một thông báo hai lần
    if (inflight.current) return;
    inflight.current = true;
    try {
      const { data, error } = await supabase.rpc("man_hinh_live", { p_sau: lastId.current ?? 0 });
      if (error) {
        setError(errorText(error));
        return;
      }
      setError(null);
      const d = data as Live;
      setLive(d);
      if (lastId.current === null) {
        // Lần đầu: hiện lịch sử gần đây, không đọc lại
        setFeed([...d.events].reverse().slice(0, 12));
      } else {
        const since = lastId.current;
        const fresh = d.events.filter((e) => e.id > since);
        if (fresh.length) {
          setFeed((f) => [...[...fresh].reverse(), ...f.filter((x) => x.id <= since)].slice(0, 12));
          enqueue(fresh);
        }
      }
      lastId.current = Math.max(lastId.current ?? 0, d.last_id);
    } finally {
      inflight.current = false;
    }
  }, [supabase, enqueue]);

  useEffect(() => {
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  function start() {
    setStarted(true);
    settings.current.started = true;
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance("Chùa Hóa Học đã mở cửa. Chào mừng các con.");
      u.lang = "vi-VN";
      u.rate = rate;
      const v = window.speechSynthesis.getVoices().find((x) => x.name === voiceName);
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    }
  }

  return (
    <main className="live">
      {showControls && (
        <div className="live-controls">
          {!started ? (
            <button type="button" className="nut nut-vang" onClick={start}>
              Bắt đầu đọc thông báo
            </button>
          ) : (
            <span className="nhan nhan-la">Đang đọc thông báo</span>
          )}
          <label className="small">
            Giọng{" "}
            <select className="input" value={voiceName} onChange={(e) => setVoiceName(e.target.value)} style={{ width: "auto", minHeight: 36, padding: "4px 8px" }}>
              {voices.length === 0 && <option value="">Máy chưa có giọng tiếng Việt</option>}
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="small">
            Tốc độ{" "}
            <input type="range" min={0.7} max={1.2} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          </label>
          {(Object.keys(LOAI) as Loai[]).map((k) => (
            <label key={k} className="small" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
              <input type="checkbox" checked={types[k]} onChange={(e) => setTypes({ ...types, [k]: e.target.checked })} />
              {LOAI[k]}
            </label>
          ))}
          <button type="button" className="chip" style={{ border: 0, cursor: "pointer", color: "inherit" }} onClick={nhac.toggle} aria-label={nhac.on ? "Tắt nhạc nền" : "Bật nhạc nền"}>
            <IconNhac on={nhac.on} /> Nhạc nền
          </button>
          <button type="button" className="chip" style={{ border: 0, cursor: "pointer", color: "inherit" }} onClick={() => setShowControls(false)}>
            Ẩn bảng điều khiển
          </button>
        </div>
      )}
      {!showControls && (
        <button type="button" className="live-show" onClick={() => setShowControls(true)} aria-label="Hiện bảng điều khiển">
          ⚙
        </button>
      )}

      {error && <p className="thong-bao">{error}</p>}

      <div className="live-grid">
        <section className="live-ban-tho">
          <div className="hoanh-phi">Chùa Hóa Học</div>
          {dong ? (
            <Chua3D className="live-canh" people={dong.people} maxLevel={dong.max_level} names="all" />
          ) : (
            <div className="chua3d live-canh" aria-hidden="true" />
          )}
          <div className={`live-loa${current ? " is-on" : ""}`} aria-live="polite">
            {current ? current.noi_dung : "Ông Tổ đang đợi đệ tử…"}
          </div>
        </section>

        <section className="live-ben">
          <div className="live-so">
            <div>
              <b>{live?.online ?? 0}</b>
              <span>đệ tử đang trong chùa</span>
            </div>
            <div>
              <b>
                {live?.room.seated.length ?? 0}/{live?.room.capacity ?? 100}
              </b>
              <span>đang ngồi tụng kinh</span>
            </div>
            <div>
              <b>{live?.room.waiting ?? 0}</b>
              <span>chờ ngoài sân</span>
            </div>
          </div>

          <div className="live-hop">
            <h2>Vừa xảy ra</h2>
            <ol className="live-feed">
              {feed.length === 0 && <li className="muted">Chưa có ai. Mời các con vào chùa.</li>}
              {feed.map((e) => (
                <li key={e.id} className={`loai-${e.loai}`}>
                  <time>{new Date(e.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time>
                  {e.noi_dung}
                </li>
              ))}
            </ol>
          </div>

          <div className="live-hop">
            <h2>Bảng vàng</h2>
            <ol className="live-top">
              {(live?.top ?? []).map((t, i) => (
                <li key={i}>
                  <span className="hang">{i + 1}</span>
                  <span>
                    {t.name}
                    {t.class_name ? <span className="muted"> {t.class_name}</span> : null}
                  </span>
                  <span>
                    Cấp <b>{t.level}</b>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {live && (
        <div className="live-phong">
          <RoomGrid capacity={live.room.capacity} seated={live.room.seated} waiting={live.room.waiting} title="Điện Tổ" />
        </div>
      )}
    </main>
  );
}
