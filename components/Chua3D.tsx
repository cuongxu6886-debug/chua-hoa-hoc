"use client";

import { useEffect, useRef, useState } from "react";
import CanhChua, { type NguoiTrongChua } from "./CanhChua";
import OngTo from "./OngTo";

type Engine = {
  setPeople: (p: NguoiTrongChua[], max: number, names: "me" | "all") => void;
  setLift: (v: number) => void;
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

/** Chánh điện 3D; máy không chạy được 3D thì tự dùng cảnh 2D. */
export default function Chua3D({
  people,
  maxLevel,
  names = "me",
  className,
  nangKhung = 0,
}: {
  people: NguoiTrongChua[];
  maxLevel: number;
  names?: "me" | "all";
  className?: string;
  /** Phần chiều cao bị bảng câu hỏi che (0–0,35) khi toàn màn hình */
  nangKhung?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const latest = useRef({ people, maxLevel, names });
  latest.current = { people, maxLevel, names };
  const [mode, setMode] = useState<"cho" | "3d" | "2d">("cho");

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
      {mode === "3d" && <span className="chua3d-goi">Kéo để xoay, cuộn để lại gần</span>}
    </div>
  );
}
