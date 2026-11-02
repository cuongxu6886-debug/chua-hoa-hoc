"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import BatHuong from "./BatHuong";
import OngTo from "./OngTo";

export type NguoiTrongChua = {
  key: string;
  name: string;
  gender: "nam" | "nu" | null;
  level: number;
  sam_hoi: boolean;
  phat?: boolean;
  me: boolean;
};

type Actor = NguoiTrongChua & {
  lane: number;
  d: number; // 0 = cửa chánh điện, 1 = sát bàn thờ Ông Tổ
  dur: number;
  walking: boolean;
  leaving: boolean;
  token: number;
};

/* ---------------- Phối cảnh: nhìn từ cửa chánh điện lên bàn thờ ---------------- */
const HORIZON = 14; // % chiều cao
const K = 78;
const Z_NEAR = 1;
const Z_FAR = 1.9;
const HALF_W = 46; // % chiều rộng ở hàng gần nhất
const BASE_W = 10.5; // % chiều rộng nhân vật ở hàng gần nhất

function project(lane: number, d: number) {
  const z = Z_NEAR + (Z_FAR - Z_NEAR) * d;
  return { x: 50 + (lane * HALF_W) / z, y: HORIZON + K / z, s: 1 / z };
}

function hash(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/** Bồ đoàn chia hai dãy, chừa lối đi ở giữa. */
const LANES = [-0.92, -0.72, -0.52, -0.32, 0.32, 0.52, 0.72, 0.92];

function seatOf(key: string, level: number, maxLevel: number) {
  const h = hash(key);
  const lane = LANES[Math.floor(h * LANES.length) % LANES.length] + (hash(key + "x") - 0.5) * 0.08;
  const d = Math.min(1, Math.max(0, (level - 1) / Math.max(1, maxLevel - 1))) * 0.96 + (hash(key + "y") - 0.5) * 0.02;
  return { lane, d };
}

function walkTime(a: { lane: number; d: number }, b: { lane: number; d: number }) {
  const p = project(a.lane, a.d);
  const q = project(b.lane, b.d);
  const dist = Math.hypot(p.x - q.x, (p.y - q.y) * 1.4);
  return Math.min(3.8, Math.max(0.9, dist * 0.07));
}

const DOOR = { lane: 0, d: -0.2 };

/* ---------------- Nhân vật nhìn từ phía sau ---------------- */
export function NhanVat({ gender, glow = false, u = false }: { gender: "nam" | "nu" | null; glow?: boolean; u?: boolean }) {
  const nu = gender === "nu";
  const ao = nu ? "#7F98AB" : "#B8B1A3";
  const aoToi = nu ? "#5F7889" : "#958D7E";
  return (
    <svg viewBox="0 0 100 124" className="nv-hinh" aria-hidden="true">
      {glow && <circle cx="50" cy="56" r="48" fill="url(#nv-hao-quang)" />}
      <defs>
        <radialGradient id="nv-hao-quang">
          <stop offset="0" stopColor="#F3D27A" stopOpacity="0.75" />
          <stop offset="1" stopColor="#F3D27A" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* bồ đoàn */}
      <g className="nv-dem">
        <ellipse cx="50" cy="112" rx="46" ry="11" fill="#1E1714" />
        <ellipse cx="50" cy="108" rx="44" ry="10" fill="#3B302B" />
      </g>
      {/* chân khi đi */}
      <g className="nv-chan">
        <ellipse className="nv-chan-trai" cx="38" cy="114" rx="8" ry="5" fill="#2A211C" />
        <ellipse className="nv-chan-phai" cx="62" cy="114" rx="8" ry="5" fill="#2A211C" />
      </g>
      <g className="nv-nguoi">
        {/* thân áo */}
        <path d="M14 108 C12 82 24 62 50 60 C76 62 88 82 86 108 Z" fill={ao} />
        <path d="M14 108 C13 96 16 86 22 78 L28 108 Z" fill={aoToi} opacity="0.6" />
        {nu ? (
          <path d="M40 62 L50 76 L60 62" fill="none" stroke="#E9E4D8" strokeWidth="4" strokeLinejoin="round" />
        ) : (
          <path d="M28 66 C40 64 56 70 74 104 L60 108 C50 88 38 76 22 74 Z" fill="#E0B13C" />
        )}
        {/* đầu */}
        {nu ? (
          <>
            <circle cx="50" cy="38" r="27" fill="#2B1D16" />
            <circle cx="50" cy="14" r="11" fill="#2B1D16" />
            <path d="M42 22 Q50 18 58 22" stroke="#B0442E" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M30 24 Q50 12 70 24" stroke="#4A352A" strokeWidth="2" fill="none" opacity="0.7" />
          </>
        ) : (
          <>
            <circle cx="23.5" cy="42" r="5" fill="#D99E72" />
            <circle cx="76.5" cy="42" r="5" fill="#D99E72" />
            <circle cx="50" cy="38" r="27" fill="#E8B48A" />
            <path d="M30 26 Q44 14 62 18" stroke="#F6D2B1" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />
          </>
        )}
        {u && (
          <g className="nv-u">
            <ellipse cx="58" cy="11" rx="9" ry="7" fill="#F2A08A" stroke="#C9644E" strokeWidth="1.5" />
            <ellipse cx="55" cy="8.5" rx="3" ry="2" fill="#FFE1D6" />
          </g>
        )}
      </g>
    </svg>
  );
}

/* ---------------- Cảnh chánh điện ---------------- */
export default function CanhChua({
  people,
  maxLevel,
  names = "me",
  className,
}: {
  people: NguoiTrongChua[];
  maxLevel: number;
  names?: "me" | "all";
  className?: string;
}) {
  const [actors, setActors] = useState<Record<string, Actor>>({});
  const first = useRef(true);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const reduce = useRef(false);
  const actorsRef = useRef(actors);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  function later(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }

  /** Cho nhân vật đi tới chỗ mới, đến nơi thì ngồi xuống (hoặc rời chùa). */
  function walk(key: string, to: { lane: number; d: number }, opts: { leave?: boolean; then?: () => void } = {}) {
    const a = actorsRef.current[key];
    if (!a) return;
    const dur = reduce.current ? 0.01 : walkTime(a, to);
    const token = a.token + 1;
    const moved = { ...a, ...to, dur, walking: true, leaving: Boolean(opts.leave), token };
    actorsRef.current = { ...actorsRef.current, [key]: moved };
    setActors((all) => (all[key] ? { ...all, [key]: { ...all[key], ...to, dur, walking: true, leaving: Boolean(opts.leave), token } } : all));
    later(() => {
      const c = actorsRef.current[key];
      if (!c || c.token !== token) return;
      if (opts.leave) {
        const rest = { ...actorsRef.current };
        delete rest[key];
        actorsRef.current = rest;
        setActors((all) => {
          const r = { ...all };
          delete r[key];
          return r;
        });
        return;
      }
      actorsRef.current = { ...actorsRef.current, [key]: { ...c, walking: false } };
      setActors((all) => (all[key] && all[key].token === token ? { ...all, [key]: { ...all[key], walking: false } } : all));
      opts.then?.();
    }, dur * 1000 + 60);
  }

  // Đồng bộ danh sách người với nhân vật trên sân
  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    const cur = actorsRef.current;
    const seen = new Set(people.map((p) => p.key));
    const next = { ...cur };
    const moves: { key: string; to: { lane: number; d: number } }[] = [];
    const leaves: string[] = [];

    for (const p of people) {
      const seat = seatOf(p.key, p.level, maxLevel);
      const a = next[p.key];
      if (!a) {
        if (isFirst || reduce.current) {
          next[p.key] = { ...p, ...seat, dur: 0, walking: false, leaving: false, token: 0 };
        } else {
          next[p.key] = { ...p, ...DOOR, dur: 0, walking: true, leaving: false, token: 0 };
          moves.push({ key: p.key, to: seat });
        }
      } else {
        if (a.level !== p.level || a.leaving) moves.push({ key: p.key, to: seat });
        next[p.key] = { ...a, ...p };
      }
    }
    for (const k of Object.keys(next)) {
      if (!seen.has(k) && !next[k].leaving) leaves.push(k);
    }
    actorsRef.current = next;
    setActors(next);

    // Đợi trình duyệt vẽ vị trí cũ (hoặc ở cửa) rồi mới cho đi
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        moves.forEach((m) => walk(m.key, m.to));
        leaves.forEach((k) => walk(k, DOOR, { leave: true }));
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, maxLevel]);

  // Thỉnh thoảng có người đứng dậy đi kinh hành vài bước rồi về chỗ
  useEffect(() => {
    const id = setInterval(() => {
      if (reduce.current || document.hidden || Math.random() < 0.35) return;
      const idle = Object.values(actorsRef.current).filter((a) => !a.walking && !a.me && !a.leaving);
      if (!idle.length) return;
      const a = idle[Math.floor(Math.random() * idle.length)];
      const home = seatOf(a.key, a.level, maxLevel);
      const side = a.lane > 0 ? -1 : 1;
      const away = {
        lane: a.lane + side * (0.12 + Math.random() * 0.14),
        d: Math.min(1, Math.max(0, home.d + (Math.random() - 0.5) * 0.12)),
      };
      walk(a.key, away, {
        then: () =>
          later(() => {
            const now = actorsRef.current[a.key];
            if (now && !now.walking) walk(a.key, seatOf(a.key, now.level, maxLevel));
          }, 1400),
      });
    }, 3200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxLevel]);

  const list = useMemo(() => {
    return Object.values(actors)
      .map((a) => ({ a, ...project(a.lane, a.d) }))
      .sort((p, q) => p.y - q.y);
  }, [actors]);

  const rows = useMemo(() => {
    const out: { x: number; y: number; s: number }[] = [];
    for (let r = 0; r < 10; r++) {
      const d = (r / 9) * 0.96;
      for (const lane of LANES) out.push(project(lane, d));
    }
    return out;
  }, []);

  return (
    <div className={`canh-chua${className ? ` ${className}` : ""}`} role="img" aria-label={`Chánh điện có ${people.length} đệ tử. Cấp càng cao càng được ngồi gần Ông Tổ.`}>
      <svg className="canh-nen" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="canh-tuong" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A1712" />
            <stop offset="1" stopColor="#5A2318" />
          </linearGradient>
          <linearGradient id="canh-san" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A2419" />
            <stop offset="1" stopColor="#5C3A26" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#canh-san)" />
        <rect x="0" y="0" width="100" height={HORIZON + K / Z_FAR - 2} fill="url(#canh-tuong)" />
        {/* ván sàn hội tụ về bàn thờ */}
        {Array.from({ length: 15 }, (_, i) => {
          const lane = -1.4 + (i * 2.8) / 14;
          const a = project(lane, 1.05);
          const b = project(lane, -0.35);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#24150E" strokeWidth="0.25" opacity="0.7" />;
        })}
        {/* lối đi giữa */}
        <polygon
          points={`${project(-0.18, 1.02).x},${project(0, 1.02).y} ${project(0.18, 1.02).x},${project(0, 1.02).y} ${project(0.18, -0.4).x},${project(0, -0.4).y} ${project(-0.18, -0.4).x},${project(0, -0.4).y}`}
          fill="#7E2A1C"
          opacity="0.55"
        />
        {/* bồ đoàn trống */}
        {rows.map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y} rx={4.2 * p.s} ry={1.3 * p.s} fill="#231A16" opacity="0.65" />
        ))}
        {/* cột gỗ hai bên */}
        <rect x="0" y="0" width="3.5" height="100" fill="#2A120D" />
        <rect x="96.5" y="0" width="3.5" height="100" fill="#2A120D" />
      </svg>

      <div className="canh-ban-tho" aria-hidden="true" style={{ bottom: `${100 - (HORIZON + K / Z_FAR) + 1}%` }}>
        <OngTo className="canh-to" />
        <div className="canh-ban">
          <BatHuong sticks={3} />
        </div>
      </div>

      {list.map(({ a, x, y, s }) => (
        <div
          key={a.key}
          className={`nv${a.walking ? " is-di" : ""}${a.me ? " is-toi" : ""}`}
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${BASE_W * s}%`,
            zIndex: Math.round(y * 10),
            transitionDuration: `${a.dur}s`,
          }}
        >
          {(names === "all" || a.me || (a.walking && !a.leaving && s > 0.6)) && (
            <span className="nv-ten" style={{ fontSize: `${Math.max(9, 13 * s)}px` }}>
              {a.me ? `${a.name} (con)` : a.name}
            </span>
          )}
          <NhanVat gender={a.gender} glow={a.sam_hoi} />
        </div>
      ))}
    </div>
  );
}

/** Lấy danh sách người đang trong chánh điện, cập nhật 6 giây một lần khi trang đang mở. */
export function useChanhDien(ping: boolean) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<{ max_level: number; people: NguoiTrongChua[] } | null>(null);

  useEffect(() => {
    let alive = true;
    let busy = false;
    const load = async () => {
      if (busy || document.hidden) return;
      busy = true;
      const { data } = await supabase.rpc("chanh_dien_dong", { p_ping: ping });
      busy = false;
      if (alive && data) setData(data as { max_level: number; people: NguoiTrongChua[] });
    };
    void load();
    const id = setInterval(load, 6000);
    const onShow = () => !document.hidden && void load();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [supabase, ping]);

  return data;
}
