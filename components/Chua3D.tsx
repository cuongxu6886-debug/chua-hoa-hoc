"use client";

import { useEffect, useRef, useState } from "react";
import CanhChua, { type NguoiTrongChua } from "./CanhChua";
import OngTo from "./OngTo";

export type Tro3D = "caro" | "dauho" | "nemcon" | "duaxe";
export type Cham3D =
  | { kind: "npc"; key: string; ten: string; vai: string; nu: boolean; loi?: string }
  | { kind: "san"; x: number; z: number }
  | { kind: "sanchua"; x: number; z: number }
  | { kind: "tro"; tro: Tro3D }
  | { kind: "an" }
  | { kind: "traiduong"; x: number; z: number };
export type Mon3D = { ten: string; loai: "bat" | "coc" | "dia"; mau: number };
export type Viec3D = "vai" | "tung" | "caro" | "dauho" | "nemcon" | "duaxe" | "an" | "dao";
export type Chua3DApi = {
  npcNoi: (key: string, text: string) => void;
  npcGan: (r?: number) => { key: string; ten: string; vai: string; nu: boolean } | null;
  raSan: (xong?: () => void) => void;
  diToi: (x: number, z: number, xong?: () => void) => void;
  choTro: (tro: Tro3D) => { x: number; z: number } | null;
  vaiTo: (xong?: () => void) => void;
  veCho: () => void;
  vaoAn: (xong?: () => void) => void;
  goiMon: (mon: Mon3D[], xong?: () => void) => void;
  anXong: () => void;
  raKhoiAn: (xong?: () => void) => void;
  diTrongAn: (x: number, z: number) => void;
  themKhach: (k: { key: string; ten: string; gioi: "nam" | "nu"; viec: Viec3D }) => Viec3D;
  khachNoi: (key: string, text: string) => boolean;
  khachThapHuong: (key: string) => void;
  khachVe: (key: string) => void;
  soKhach: () => number;
  reo: () => void;
  setTuQuay: (on: boolean) => void;
  khachCongDuc: (key: string, cong: number, tong: number) => void;
  setOnVieng: (fn: ((key: string) => void) | null) => void;
};

type Engine = Chua3DApi & {
  setOnTap: (fn: ((t: Cham3D) => void) | null) => void;
  setOnNoi: (fn: ((text: string, vai: string) => void) | null) => void;
  setPaused: (v: boolean) => void;
  setPeople: (p: NguoiTrongChua[], max: number, names: "me" | "all") => void;
  setLift: (v: number) => void;
  setView: (v: "toan" | "to" | "cao" | "theo") => void;
  dispose: () => void;
};

function coWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

type Diem = "toan" | "to" | "cao" | "theo";
const DIEM: { v: Diem; label: string }[] = [
  { v: "toan", label: "Toàn cảnh" },
  { v: "to", label: "Ông Tổ" },
  { v: "cao", label: "Trên cao" },
  { v: "theo", label: "Theo con" },
];

/** Chánh điện 3D; máy không chạy được 3D thì tự dùng cảnh 2D. */
export default function Chua3D({
  people,
  maxLevel,
  names = "me",
  className,
  nangKhung = 0,
  onTap,
  api,
  tamDung = false,
  onNoi,
}: {
  people: NguoiTrongChua[];
  maxLevel: number;
  names?: "me" | "all";
  className?: string;
  /** Phần chiều cao bị bảng câu hỏi che (0–0,35) khi toàn màn hình */
  nangKhung?: number;
  /** Chạm vào sàn hoặc nhân vật ảo */
  onTap?: (t: Cham3D) => void;
  /** Điều khiển cảnh từ ngoài (cho nhân vật ảo nói, tìm người gần) */
  api?: { current: Chua3DApi | null };
  /** Tạm dừng vẽ (khi mở Sân chơi) để máy chạy nhẹ */
  tamDung?: boolean;
  /** Nhân vật ảo tự nói một câu (để đọc to) */
  onNoi?: (text: string, vai: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const latest = useRef({ people, maxLevel, names });
  latest.current = { people, maxLevel, names };
  const [mode, setMode] = useState<"cho" | "3d" | "2d">("cho");
  const [view, setView] = useState<"toan" | "to" | "cao" | "theo">("toan");

  useEffect(() => {
    let dead = false;
    if (!coWebGL()) {
      setMode("2d");
      return;
    }
    (async () => {
      try {
        const [THREE, { createChua3D }] = await Promise.all([import("three"), import("@/lib/chua3d")]);
        if (dead || !host.current) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const e = createChua3D(THREE, host.current, {
          reduce,
          ongToSvg: toRef.current?.querySelector("svg") ?? null,
          logoUrl: "/logo-toi-yeu-hoa-hoc.jpg",
        });
        engine.current = e;
        const l = latest.current;
        e.setPeople(l.people, l.maxLevel, l.names);
        setMode("3d");
      } catch {
        if (!dead) setMode("2d");
      }
    })();
    return () => {
      dead = true;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.setPeople(people, maxLevel, names);
  }, [people, maxLevel, names, mode]);

  useEffect(() => {
    engine.current?.setLift(nangKhung);
  }, [nangKhung, mode]);

  useEffect(() => {
    engine.current?.setPaused(tamDung);
  }, [tamDung, mode]);

  const tapRef = useRef(onTap);
  tapRef.current = onTap;
  const noiRef = useRef(onNoi);
  noiRef.current = onNoi;
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.setOnTap((t) => tapRef.current?.(t));
    e.setOnNoi((text, vai) => noiRef.current?.(text, vai));
    if (api)
      api.current = {
        npcNoi: e.npcNoi,
        npcGan: e.npcGan,
        raSan: e.raSan,
        diToi: e.diToi,
        choTro: e.choTro,
        vaiTo: e.vaiTo,
        veCho: e.veCho,
        vaoAn: e.vaoAn,
        goiMon: e.goiMon,
        anXong: e.anXong,
        raKhoiAn: e.raKhoiAn,
        diTrongAn: e.diTrongAn,
        themKhach: e.themKhach,
        khachNoi: e.khachNoi,
        khachThapHuong: e.khachThapHuong,
        khachVe: e.khachVe,
        soKhach: e.soKhach,
        reo: e.reo,
        setTuQuay: e.setTuQuay,
        khachCongDuc: e.khachCongDuc,
        setOnVieng: e.setOnVieng,
      };
    return () => {
      if (api) api.current = null;
    };
  }, [mode, api]);

  if (mode === "2d") return <CanhChua people={people} maxLevel={maxLevel} names={names} className={className} />;

  return (
    <div
      ref={host}
      className={`chua3d${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={`Chánh điện 3D có ${people.length} đệ tử. Cấp càng cao càng được ngồi gần Ông Tổ.`}
    >
      <div ref={toRef} className="chua3d-mau" aria-hidden="true">
        <OngTo />
      </div>
      {mode === "cho" && <div className="chua3d-cho">Đang mở cửa chánh điện…</div>}
      {mode === "3d" && (
        <>
          <span className="chua3d-goi">Kéo để xoay, chụm hai ngón để lại gần</span>
          <div className="chua3d-diem" role="group" aria-label="Chọn điểm nhìn">
            {DIEM.filter((d) => d.v !== "theo" || people.some((p) => p.me)).map(({ v, label }) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => {
                  setView(v);
                  engine.current?.setView(v);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
