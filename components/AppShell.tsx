"use client";

import CaiApp from "./CaiApp";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isMuted, setMuted } from "@/lib/sound";
import type { GameState } from "@/lib/types";
import { IconAmThanh, IconBang, IconChoi, IconChua, IconCongDuc, IconHuong, IconNguoi, IconSo } from "./Icons";
import { IconNhac, useNhacNen } from "./NhacNen";

type GameCtx = {
  state: GameState;
  setState: (s: GameState) => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<GameCtx | null>(null);

export function useGame() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGame phải nằm trong AppShell");
  return c;
}

export default function AppShell({ initial, children }: { initial: GameState; children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(initial);
  const supabase = useMemo(() => createClient(), []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc("trang_thai");
    if (data?.state) setState(data.state as GameState);
  }, [supabase]);

  return (
    <Ctx.Provider value={{ state, setState, refresh }}>
      <TopBar state={state} />
      <TabBar state={state} />
      {children}
    </Ctx.Provider>
  );
}

function TopBar({ state }: { state: GameState }) {
  const [muted, setMutedState] = useState(false);
  useEffect(() => setMutedState(isMuted()), []);
  const nhac = useNhacNen();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/chanh-dien" className="brand">
          Chùa Hóa Học
        </Link>
        <div className="chips">
          <span className="chip" title="Cấp hiện tại">
            Cấp <b>{state.level}</b>
          </span>
          <span className="chip" title="Công đức">
            <IconCongDuc />
            <b>{state.cong_duc}</b>
            <span className="sr-only">công đức</span>
          </span>
          <span className="chip" title="Nén hương">
            <IconHuong />
            <b>{state.huong}</b>
            <span className="sr-only">nén hương</span>
          </span>
          <CaiApp />
          {state.role === "admin" && (
            <Link href="/quan-tri" className="chip" style={{ color: "inherit", textDecoration: "none" }}>
              Quản trị
            </Link>
          )}
          <button
            type="button"
            className="chip"
            style={{ border: 0, cursor: "pointer", color: "inherit" }}
            onClick={nhac.toggle}
            aria-label={nhac.on ? "Tắt nhạc nền" : "Bật nhạc nền"}
            aria-pressed={nhac.on}
          >
            <IconNhac on={nhac.on} />
          </button>
          <button
            type="button"
            className="chip"
            style={{ border: 0, cursor: "pointer", color: "inherit" }}
            onClick={() => {
              setMuted(!muted);
              setMutedState(!muted);
            }}
            aria-label={muted ? "Bật tiếng mõ, chuông" : "Tắt tiếng mõ, chuông"}
            aria-pressed={!muted}
          >
            <IconAmThanh on={!muted} />
          </button>
        </div>
      </div>
    </header>
  );
}

const TABS = [
  { href: "/chanh-dien", label: "Chánh điện", Icon: IconChua },
  { href: "/dien-to", label: "Điện Tổ", Icon: IconHuong },
  { href: "/san-choi", label: "Sân chơi", Icon: IconChoi },
  { href: "/bang-vang", label: "Bảng vàng", Icon: IconBang },
  { href: "/so-sam-hoi", label: "Sổ sám hối", Icon: IconSo },
  { href: "/ho-so", label: "Hồ sơ", Icon: IconNguoi },
];

function TabBar({ state }: { state: GameState }) {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Điều hướng chính">
      {TABS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="tab" aria-current={path === href ? "page" : undefined}>
          <Icon />
          <span>{label}</span>
          {href === "/dien-to" && state.penalty && (
            <span className="tab-badge" aria-label={`Còn nợ ${state.penalty.minutes} phút tụng kinh`}>
              {state.penalty.minutes}′
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
